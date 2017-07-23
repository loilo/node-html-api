/* global Element, requestAnimationFrame, MutationObserver, NodeList, HTMLCollection */

import mitt from './lib/mitt'
import {
  isUndef,
  kebab, camel,
  has, find, toArray,
  isPlainObject, entries, extend,
  matches
} from './lib/helpers'
import presetTypes from './lib/preset-types'

/**
 * Checks if a value is a custom type constraint
 *
 * @param {Any} value
 * @return {Boolean}
 */
function isCustomTypeConstraint (value) {
  return isPlainObject(value) &&
    typeof value.validate === 'function' &&
    typeof value.serialize === 'function' &&
    typeof value.unserialize === 'function'
}

/**
 * Checks if a value is a single valid type constraint
 *
 * @param {Any} value
 * @return {Boolean}
 */
function isValidSingleTypeConstraint (value) {
  return has(toArray(presetTypes.keys()), value) || isCustomTypeConstraint(value)
}

/**
 * Checks if a value is a valid type constraint
 *
 * @param {Any} value
 * @return {Boolean}
 */
function isValidTypeConstraint (value) {
  return Array.isArray(value)
    ? (value.length && value.every(isValidSingleTypeConstraint) && value.some(constraint => constraint !== null))
    : isValidSingleTypeConstraint(value) && value !== null
}

/**
 * Creates a function from an array of type constraints
 * which takes a value and a `serialized` flag and returns
 * the first appropriate type constraint.
 * It respects the specificity order of type constraints.
 *
 * @param {Object[]} constraints
 * @return {Object}
 */
function createMultiConstraintDetector (constraints) {
  // Make it an array if it isn't
  if (!Array.isArray(constraints)) {
    constraints = [ constraints ]
  }

  const specificityArray = toArray(presetTypes.keys())

  constraints = constraints
    .slice(0)
    // Sort constraints to match the defined specificity order
    .sort((a, b) => {
      const indexA = specificityArray.indexOf(a)
      const indexB = specificityArray.indexOf(b)

      if (indexA === indexB) return 0
      if (indexA === -1) return -1
      if (indexB === -1) return 1

      if (indexA < indexB) return -1

      return 1
    })
    // Fetch the constraint object itself
    .map(constraint =>
      presetTypes.has(constraint) ? presetTypes.get(constraint) : constraint
    )

  // Generate the function
  return (value, serialized) => find(constraints, constraint => {
    try {
      let unserializedValue = value
      if (serialized) {
        unserializedValue = constraint.unserialize(value)
      }

      return constraint.validate(unserializedValue)
    } catch (err) {
      return false
    }
  })
}

/**
 * Validates an option definition, throws if invalid
 *
 * @throws {Error} If the option definition is not valid
 * @param {Any} optionDef
 */
function validateOptionDefinition (optionDef) {
  // Definition is just a type constraint
  if (isValidTypeConstraint(optionDef)) return true

  // Definition is an object
  if (isPlainObject(optionDef)) {
    // Fail no missing type constraint
    if (!isValidTypeConstraint(optionDef.type)) {
      throw Error('Definition must have a valid type constraint')
    }

    const detectTypeConstraint = createMultiConstraintDetector(optionDef.type)

    // Required and default not allowed at the same time
    if (optionDef.required && !isUndef(optionDef.default)) {
      throw new Error('Option can either be required or have a default value, not both')
    }

    // Not required, no default and not null -> make it nullable
    if (
      !optionDef.required &&
      isUndef(optionDef.default) &&
      !(optionDef.type === null || (Array.isArray(optionDef.type) && has(optionDef.type, null)))
    ) {
      if (Array.isArray(optionDef.type)) {
        optionDef.type.push(null)
      } else {
        optionDef.type = [ optionDef.type, null ]
      }
    }

    // Default value is not valid
    if (!isUndef(optionDef.default) && !detectTypeConstraint(optionDef.default)) {
      throw new Error('Default value is invalid')
    }

  // Definition is invalid
  } else {
    throw new Error('Definition must be a type constraint or an object.')
  }
}

/**
 * Validates an object of option definitions, throws if invalid
 *
 * @throws {Error} If any of the option definitions is not valid
 * @param {Object} optionDef
 */
function validateOptionsDefinition (obj) {
  if (!isPlainObject(obj)) throw new Error('Options definition must be a plain object')

  for (const [optionName, optionDef] of entries(obj)) {
    try {
      validateOptionDefinition(optionDef)

      // Make simple types nullable
      if (isValidTypeConstraint(optionDef)) {
        if (Array.isArray(optionDef)) {
          if (!has(optionDef, null)) optionDef.push(null)
        } else if (optionDef !== null) {
          obj[optionName] = [ optionDef, null ]
        }
      }
    } catch (err) {
      throw new Error(`Option definition for option "${optionName}" failed: ${err.message}`)
    }
  }
}

/**
 * Gets the type constraint object from an option definition
 *
 * @param {Any} optionDef
 * @return {Object|undefined}
 */
function getTypeConstraints (optionDef) {
  if (isValidTypeConstraint(optionDef)) {
    if (Array.isArray(optionDef)) {
      return optionDef
    } else if (isCustomTypeConstraint(optionDef)) {
      return [ optionDef ]
    } else {
      return [ presetTypes.get(optionDef) ]
    }
  } else {
    if (Array.isArray(optionDef.type)) {
      return optionDef.type
    } else if (isCustomTypeConstraint(optionDef.type)) {
      return [ optionDef.type ]
    } else {
      return [ presetTypes.get(optionDef.type) ]
    }
  }
}

/**
 * Validates a value for a given option definition, returning its unserialized version if serialized and the other way around
 *
 * @param {Any} value
 * @param {Any} optionDef
 * @param {Boolean} isSerialized
 * @throws {Error} If the value does not fullfill the `optionDef` constraints
 * @return {Any}
 */
function validateOptionValue (value, optionDef, isSerialized = false) {
  const typeConstraints = getTypeConstraints(optionDef)

  // If required, don't allow undefined
  if (optionDef.required === true && typeof value === 'undefined') {
    throw new Error('Invalid option removal')
  }

  // If nullable type, allow undefined and null values
  if (value == null && has(typeConstraints, null)) {
    return isSerialized
      ? null
      : 'null'
  }

  let oppositeValue

  const detectTypeConstraint = createMultiConstraintDetector(typeConstraints)

  // Serialized value
  if (isSerialized) {
    // Detect correct constraint off of array
    const typeConstraint = detectTypeConstraint(value, true)

    try {
      oppositeValue = typeConstraint.unserialize(value)
    } catch (e) {
      throw new Error(`Invalid serialized option value "${value}"`)
    }

    if (!typeConstraint.validate(oppositeValue)) {
      throw new Error(`Invalid serialized option value "${value}"`)
    }

  // Typed value
  } else {
    // Detect correct constraint off of array
    const typeConstraint = detectTypeConstraint(value, false)

    if (isUndef(typeConstraint) || !typeConstraint.validate(value)) {
      throw new Error(`Invalid option value "${value}"`)
    } else {
      oppositeValue = typeConstraint.serialize(value)
    }
  }

  return oppositeValue
}

/**
 * Publishes a change over an event emitter
 *
 * @param {Object} emitter
 * @param {String} option
 * @param {Any} value
 * @param {Any} oldValue
 * @param {Boolean} initial
 */
function publishChange (emitter, option, value, oldValue, initial = false) {
  emitter.emit('change', { option, value, oldValue, initial })
  emitter.emit(`change:${option}`, { value, oldValue, initial })
}

/**
 * Gets the initial values of an HTML API, considering data-* attributes and default values
 *
 * @param {Element} element
 * @param {Object} optionsDef
 * @param {Object} emitter
 */
function getInitialValues (element, optionsDef, emitter) {
  const values = Object.create(null)
  const bufferedInitials = {}

  for (const [optionName, optionDef] of entries(optionsDef)) {
    const datasetValue = element.dataset[optionName]

    // Set in HTML
    if (datasetValue != null) {
      try {
        values[optionName] = validateOptionValue(datasetValue, optionDef, true)
      } catch (err) {
        throw new Error(`Error setting initial option "${optionName}": ${err.message}`)
      }

    // Fail on required
    } else if (optionDef && optionDef.required) {
      requestAnimationFrame(() => {
        emitter.emit('error', {
          type: 'missing-required',
          message: `Missing required option "${optionName}"`,
          details: optionName
        })
      })

    // Use default value
    } else if (optionDef && typeof optionDef.default !== 'undefined') {
      values[optionName] = optionDef.default

    // Use null
    } else {
      values[optionName] = null
    }

    // Saving timeout IDs prevents initial change from accidentally
    bufferedInitials[optionName] = setTimeout(() => {
      publishChange(emitter, optionName, values[optionName], null, true)
      delete bufferedInitials[optionName]
    }, 0)
  }

  return { values, bufferedInitials }
}

/**
 * Creates a list of data attribtes to watch for a certain option's definitions
 *
 * @param {Object} optionsDef
 * @return {string[]}
 */
function createOptionsAttrList (optionsDef) {
  return Object.keys(optionsDef).map(name => `data-${kebab(name)}`)
}

/**
 * Defines an interface for getting/setting options programmatically
 *
 * @param {Element} element
 * @param {Object} optionsDef
 * @param {Object} values
 * @param {Object} emitter
 * @return {Object}
 */
function createOptionsInterface (element, optionsDef, values, emitter) {
  const options = Object.create(null)
  for (const [optionName, optionDef] of entries(optionsDef)) {
    Object.defineProperty(options, optionName, {
      get: () => values[optionName],
      set (value) {
        try {
          const serializedValue = validateOptionValue(value, optionDef, false)

          if (typeof serializedValue === 'string') {
            element.dataset[optionName] = serializedValue
            values[optionName] = value
          } else {
            delete element.dataset[optionName]
            delete values[optionName]
          }
        } catch (err) {
          emitter.emit('error', {
            type: 'invalid-value-js',
            details: {
              option: optionName,
              value
            },
            message: `Error setting option "${optionName}": ${err.message}`
          })
        }
      }
    })
  }
  return options
}

/**
 * Observes a DOM Element for changes to the provided attributes
 *
 * @param {Element} element
 * @param {String[]} attributes
 * @param {Function} callback
 * @return {MutationObserver}
 */
function observeAttributes (element, attributes, callback) {
  // create an observer instance
  const observer = new MutationObserver(records => {
    for (const record of records) {
      if (record.type === 'attributes') {
        callback(record.attributeName.slice(5), record.oldValue)
      }
    }
  })

  observer.observe(element, {
    attributes: true,
    attributeOldValue: true,
    attributeFilter: attributes
  })

  return observer
}

/**
 * Creates a MutationObserver callback for an API
 *
 * @param {Element} element
 * @param {Object} optionsDef
 * @param {Object} values
 * @param {Object} emitter
 */
function createMutationHandler (element, optionsDef, values, emitter) {
  return (optionAttr, oldSerializedValue) => {
    const optionName = camel(optionAttr)
    const def = optionsDef[optionName]

    const newSerializedValue = element.dataset[optionName]
    if (newSerializedValue === oldSerializedValue) return

    try {
      const newUnserializedValue = validateOptionValue(newSerializedValue, def, true)
      const oldUnserializedValue = validateOptionValue(oldSerializedValue, def, true)

      values[optionName] = newUnserializedValue

      publishChange(emitter, optionName, newUnserializedValue, oldUnserializedValue)
    } catch (err) {
      emitter.emit('error', {
        type: 'invalid-value-html',
        details: {
          option: optionName,
          value: newSerializedValue
        },
        message: `Error setting option "${optionName}" via HTML: ${err.message}`
      })
    }
  }
}

/**
 * Creates a MutationObserver for a given API setup
 *
 * @param {Element} element
 * @param {Object} optionsDef
 * @param {Object} values
 * @param {Object} emitter
 */
function createAttributeObserver (element, optionsDef, values, emitter) {
  return observeAttributes(
    element,
    createOptionsAttrList(optionsDef),
    createMutationHandler(element, optionsDef, values, emitter)
  )
}

/**
 * Validate an element constraint
 *
 * @param {String|Element|Element[]|NodeList|HTMLCollection} constraint
 */
function validateElementConstraint (constraint) {
  let elements = null
  if (typeof constraint === 'string') {
    elements = constraint
  } else if (constraint instanceof Element) {
    elements = [ constraint ]
  } else {
    if (constraint instanceof NodeList || constraint instanceof HTMLCollection) {
      constraint = toArray(constraint)
    }

    if (Array.isArray(constraint)) {
      if (constraint.every(node => node instanceof Element)) {
        elements = constraint
      } else {
        elements = null
      }
    }
  }

  if (elements) {
    return elements
  } else {
    throw new Error('Provided elements must either be a selector string, an Element, an array of Elements or a NodeList containing exclusively Element nodes')
  }
}

/**
 * Set up an element-based API
 *
 * @param {Element} element
 * @param {Object} optionsDef
 * @param {Object} parentEmitter
 */
function createElementBasedApi (element, optionsDef, parentEmitter) {
  // Element-based event emitter
  const localEmitter = mitt()

  // Delegate events to parent emitter
  localEmitter.on('*', (type, evt) => {
    parentEmitter.emit(type, extend({ element, elementApi }, evt))
  })

  // Set initial values
  const { values, bufferedInitials } = getInitialValues(element, optionsDef, localEmitter)

  // Make sure to clear out buffered initials
  for (const option in bufferedInitials) {
    localEmitter.once(`change:${option}`, () => {
      clearTimeout(bufferedInitials[option])
      delete bufferedInitials[option]
    })
  }

  // Set up the MutationObserver
  const attributeObserver = createAttributeObserver(element, optionsDef, values, localEmitter)

  // Set up the `options` interface
  const optionsInterface = createOptionsInterface(element, optionsDef, values, localEmitter)

  const elementApi = {
    options: optionsInterface,

    /**
     * Adds an event listener
     *
     * @param {String} evt
     * @param {Function} listener
     */
    on (evt, listener) {
      localEmitter.on(evt, listener)
      return this
    },

    /**
     * Adds a one-time event listener
     *
     * @param {String} evt
     * @param {Function} listener
     */
    once (evt, listener) {
      localEmitter.once(evt, listener)
      return this
    },

    /**
     * Removes an event listener
     *
     * @param {String} evt
     * @param {Function} listener
     */
    off (evt, listener) {
      localEmitter.off(evt, listener)
      return this
    },

    /**
     * Destroy the attribute observer
     */
    destroy () {
      attributeObserver.disconnect()
      localEmitter.clear()
    }
  }

  return elementApi
}

/**
 * Create an HTML API from a DOM Element and an option defintion
 *
 * @param {Object} optionsDef
 * @return {Object}
 */
export default function htmlApi (optionsDef) {
  validateOptionsDefinition(optionsDef)

  return constraint => {
    let elements = validateElementConstraint(constraint)
    const observableSelector = typeof elements === 'string' && elements
    if (observableSelector) elements = toArray(document.querySelectorAll(elements))

    // Set up a list of element APIs
    const elementApis = new Map()

    // Set up the event emitter
    const emitter = mitt()

    // Register a MutationObserver
    let elementObserver
    if (observableSelector) {
      elementObserver = new MutationObserver(mutations => {
        for (const mutation of mutations) {
          if (mutation.type === 'childList') {
            const newNodes = toArray(mutation.addedNodes)
              .filter(node =>
                node instanceof Element &&
                matches(node, observableSelector) &&
                !elementApis.has(node)
              )

            for (const element of newNodes) {
              const elementApi = createElementBasedApi(element, optionsDef, emitter)
              elementApis.set(element, elementApi)
              emitter.emit('newElement', { element, elementApi })
            }

            for (const removedNode of toArray(mutation.removedNodes)) {
              if (!(removedNode instanceof Element)) continue
              if (elementApis.has(removedNode)) {
                elementApis.get(removedNode).destroy()
                elementApis.delete(removedNode)
              }
            }
          }
        }
      })

      elementObserver.observe(document.documentElement, {
        childList: true,
        subtree: true
      })
    }

    for (const element of elements) {
      const elementApi = createElementBasedApi(element, optionsDef, emitter)
      elementApis.set(element, elementApi)
      setTimeout(function () {
        emitter.emit('newElement', { element, elementApi })
      }, 0)
    }

    return {
      /**
       * Gets all elements the API has been assigned to
       */
      get elements () {
        return toArray(elementApis.keys())
      },

      /**
       * Gets an element-based API
       *
       * @param {Element|String} constraint
       */
      for (constraint) {
        let element
        if (constraint instanceof Element) {
          element = constraint
        } else if (typeof constraint === 'string') {
          element = document.querySelector(element)
        } else {
          throw new Error('Constraint must either be an Element or a selector string')
        }
        if (!element) throw new Error('No element found for the given selector')
        if (!elementApis.has(element)) throw new Error('The given element does not have your API attached')

        return elementApis.get(element)
      },

      /**
       * Adds an event listener
       *
       * @param {String} evt
       * @param {Function} listener
       */
      on (evt, listener) {
        emitter.on(evt, listener)
        return this
      },

      /**
       * Adds a one-time event listener
       *
       * @param {String} evt
       * @param {Function} listener
       */
      once (evt, listener) {
        emitter.once(evt, listener)
        return this
      },

      /**
       * Removes an event listener
       *
       * @param {String} evt
       * @param {Function} listener
       */
      off (evt, listener) {
        emitter.off(evt, listener)
        return this
      },

      /**
       * Destroys the API, in particular disconnecting the MutationObservers
       */
      destroy () {
        if (elementObserver) elementObserver.disconnect()
        emitter.clear()
        for (const elementApi of toArray(elementApis.values())) {
          elementApi.destroy()
        }
      }
    }
  }
}

/**
 * Define Enum constraint
 */
htmlApi.Enum = (...values) => ({
  validate: value => typeof value === 'string' && has(values, value),
  serialize: value => value,
  unserialize: value => value
})

/**
 * Generate a number constraint
 *
 * @param {Number} min
 * @param {Number} max
 * @param {Boolean} float
 */
const numGen = (min = -Infinity, max = Infinity, float = true) => ({
  validate: value => {
    if (typeof value !== 'number' || !isFinite(value)) return false
    if (!float) {
      if (Number.isInteger) {
        if (!Number.isInteger(value)) return false
      } else {
        if (Math.floor(value) !== value) return false
      }
    }
    return value >= min && value <= max
  },
  serialize: value => String(value),
  unserialize: value => +value
})

/**
 * Define Integer constraint
 */
htmlApi.Integer = extend(numGen(-Infinity, Infinity, false), {
  min: min => extend(numGen(min, Infinity, false), {
    max: max => numGen(min, max, false)
  }),
  max: max => numGen(-Infinity, max, false)
})

/**
 * Define Float constraint
 */
htmlApi.Float = extend(numGen(-Infinity, Infinity), {
  min: min => extend(numGen(min, Infinity), {
    max: max => numGen(min, max)
  }),
  max: max => numGen(-Infinity, max)
})
