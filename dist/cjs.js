var htmlApi = (function () {
'use strict';

/* global Element, requestAnimationFrame, MutationObserver, NodeList, HTMLCollection */

// Mitt
// A nicely compact event emitter
// @see https://www.npmjs.com/package/mitt
function mitt (all, once) {
  all = all || Object.create(null);
  once = once || Object.create(null);

  return {
    /**
     * Register an event handler for the given type.
     *
     * @param  {String} type  Type of event to listen for, or `"*"` for all events
     * @param  {Function} handler Function to call in response to given event
     * @memberOf mitt
     */
    on (type, handler, skip = 0) {
      if (skip === 0) {
        (all[type] || (all[type] = [])).push(handler);
      } else {
        var self = this;
        this.once(type, function () {
          self.on(type, handler);
        }, skip - 1);
      }
    },

    /**
     * Register an event handler for the given type for one execution.
     *
     * @param  {String} type  Type of event to listen for, or `"*"` for all events
     * @param  {Function} handler Function to call in response to given event
     * @memberOf mitt
     */
    once (type, handler, skip = 0) {
      if (skip === 0) {
        (once[type] || (once[type] = [])).push(handler);
      } else {
        var self = this;(once[type] || (once[type] = [])).push(function () {
          self.once(type, handler, skip - 1);
        });
      }
    },

    /**
     * Remove an event handler for the given type.
     *
     * @param  {String} type  Type of event to unregister `handler` from, or `"*"`
     * @param  {Function} handler Handler function to remove
     * @memberOf mitt
     */
    off (type, handler) {
      if (all[type]) {
        all[type].splice(all[type].indexOf(handler) >>> 0, 1);
      }
      if (once[type]) {
        once[type].splice(once[type].indexOf(handler) >>> 0, 1);
      }
    },

    /**
     * Invoke all handlers for the given type.
     * If present, `"*"` handlers are invoked after type-matched handlers.
     *
     * @param {String} type  The event type to invoke
     * @param {Any} [evt]  Any value (object is recommended and powerful), passed to each handler
     * @memberof mitt
     */
    emit (type, evt) {
      (all[type] || []).map(function (handler) { handler(evt); })
      ;(all['*'] || []).map(function (handler) { handler(type, evt); })
      ;(once[type] || []).map(function (handler) { handler(evt); })
      ;(once['*'] || []).map(function (handler) { handler(type, evt); });
    },

    /**
     * Clear the emitter by removing all handlers
     *
     * @memberof mitt
     */
    clear () {
      all = {};
      once = {};
    },

    get _listeners () {
      return all
    }
  }
}

/**
 * Use this instead of Object.entries() for compatibility
 *
 * @param {Object} obj
 */
function entries (obj) {
  return Object.keys(obj).map(key => [ key, obj[key] ])
}

/**
 * Use this instead of Array.prototype.includes() for compatibility
 *
 * @param {Array} arr
 * @param {Any} value
 */
function has (array, value) {
  return array.includes
    ? array.includes(value)
    : array.indexOf(value) !== -1
}

/**
 * Use this instead of Array.prototype.find() for compatibility
 *
 * @param {Array} arr
 * @param {Function} callback
 */
function find (array, callback) {
  if (array.find) return array.find(callback)
  for (let i = 0; i < array.length; i++) {
    if (callback(array[i], i, array)) return array[i]
  }
  return undefined
}

/**
 * Use this instead of Array.from() for compatibility
 *
 * @param {Object} obj
 */
function toArray (obj) {
  if (Array.from) return Array.from(obj)
  if (Array.isArray(obj)) return obj.slice(0)

  // If Array.from is not defined, we can safely assume that we use
  // our own Map implementation and therefore the following is fine.
  const items = [];
  for (let i = 0; i < obj.length; i++) items.push(obj[i]);

  return items
}

/**
 * Use this instead of Object.assign() for compatibility
 *
 * @param {Object} ...obj
 */
function extend (...objects) {
  if (Object.assign) return Object.assign(...objects)
  if (objects.length === 0) throw new TypeError('Cannot convert undefined or null to object')
  if (objects.length === 1) return objects[0]

  for (let key in objects[1]) {
    objects[0][key] = objects[1][key];
  }

  return extend(objects[0], ...objects.slice(2))
}

// A Map of predefined types, in descending specificity order
const presetTypes = new Map([
  [ null, {
    validate: value => value == null,
    serialize: value => 'null',
    unserialize: value => JSON.parse(value)
  }],
  [ Boolean, {
    validate: value => typeof value === 'boolean',
    serialize: value => value ? '' : undefined,
    unserialize: value => {
      if (typeof value === 'undefined' || value === 'false') {
        return false
      }
      if (value === '' || value === 'true') {
        return true
      }

      throw new Error('Invalidly serialized Boolean')
    }
  }],
  [ Number, {
    validate: value => typeof value === 'number' && !isNaN(value),
    serialize: number => String(number),
    unserialize: value => +value
  }],
  [ Array, {
    validate: value => Array.isArray(value),
    serialize: value => JSON.stringify(value),
    unserialize: value => JSON.parse(value)
  }],
  [ Object, {
    validate: value => typeof value === 'object' && value !== null && !Array.isArray(value),
    serialize: value => JSON.stringify(value),
    unserialize: value => JSON.parse(value)
  }],
  [ Function, {
    validate: value => typeof value === 'function',
    serialize: value => String(value),
    unserialize: value => /* eslint-disable no-eval */ eval(`(${value})`)
  }],
  [ String, {
    validate: value => typeof value === 'string',
    serialize: value => value,
    unserialize: value => value
  }]
]);

/**
 * Checks if value is a plain object
 * @param  {Any}  obj
 * @return {Boolean}
 */
function isPlainObject (value) {
  return typeof value === 'object' && value !== null && value.prototype == null
}

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
 * Creates a function from a set of type constraints
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
    constraints = [ constraints ];
  }

  const specificityArray = toArray(presetTypes.keys());

  constraints = constraints
    .slice(0)
    // Sort constraints to match the defined specificity order
    .sort((a, b) => {
      const indexA = specificityArray.indexOf(a);
      const indexB = specificityArray.indexOf(b);

      if (indexA === indexB) return 0
      if (indexA === -1) return -1
      if (indexB === -1) return 1

      if (indexA < indexB) return -1

      return 1
    })
    // Fetch the constraint object itself
    .map(constraint =>
      presetTypes.has(constraint) ? presetTypes.get(constraint) : constraint
    );

  // Generate the function
  return (value, serialized) => find(constraints, constraint => {
    try {
      let unserializedValue = value;
      if (serialized) {
        unserializedValue = constraint.unserialize(value);
      }

      return constraint.validate(unserializedValue)
    } catch (err) {
      return false
    }
  })
}

/**
 * Checks if a value is undefined
 *
 * @param {Any} value
 * @return {Boolean}
 */
function isUndef (value) {
  return typeof value === 'undefined'
}

/**
 * Checks if an element matches a given selector
 *
 * @param {Element} el
 * @param {String} selector
 */
function matches (el, selector) {
  const proto = Element.prototype;
  const fn = proto.matches || proto.webkitMatchesSelector || proto.mozMatchesSelector || proto.msMatchesSelector || function (selector) {
    return [].indexOf.call(document.querySelectorAll(selector), this) !== -1
  };
  return fn.call(el, selector)
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

    const detectTypeConstraint = createMultiConstraintDetector(optionDef.type);

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
        optionDef.type.push(null);
      } else {
        optionDef.type = [ optionDef.type, null ];
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
      validateOptionDefinition(optionDef);

      // Make simple types nullable
      if (isValidTypeConstraint(optionDef)) {
        if (Array.isArray(optionDef)) {
          if (!has(optionDef, null)) optionDef.push(null);
        } else if (optionDef !== null) {
          obj[optionName] = [ optionDef, null ];
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
  const typeConstraints = getTypeConstraints(optionDef);

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

  let oppositeValue;

  const detectTypeConstraint = createMultiConstraintDetector(typeConstraints);

  // Serialized value
  if (isSerialized) {
    // Detect correct constraint off of array
    const typeConstraint = detectTypeConstraint(value, true);

    try {
      oppositeValue = typeConstraint.unserialize(value);
    } catch (e) {
      throw new Error(`Invalid serialized option value "${value}"`)
    }

    if (!typeConstraint.validate(oppositeValue)) {
      throw new Error(`Invalid serialized option value "${value}"`)
    }

  // Typed value
  } else {
    // Detect correct constraint off of array
    const typeConstraint = detectTypeConstraint(value, false);

    if (isUndef(typeConstraint) || !typeConstraint.validate(value)) {
      throw new Error(`Invalid option value "${value}"`)
    } else {
      oppositeValue = typeConstraint.serialize(value);
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
  emitter.emit('change', { option, value, oldValue, initial });
  emitter.emit(`change:${option}`, { value, oldValue, initial });
}

/**
 * Gets the initial values of an HTML API, considering data-* attributes and default values
 *
 * @param {Element} element
 * @param {Object} optionsDef
 * @param {Object} emitter
 */
function getInitialValues (element, optionsDef, emitter) {
  const values = Object.create(null);
  const bufferedInitials = {};

  for (const [optionName, optionDef] of entries(optionsDef)) {
    const datasetValue = element.dataset[optionName];

    // Set in HTML
    if (datasetValue != null) {
      try {
        values[optionName] = validateOptionValue(datasetValue, optionDef, true);
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
        });
      });

    // Use default value
    } else if (optionDef && typeof optionDef.default !== 'undefined') {
      values[optionName] = optionDef.default;

    // Use null
    } else {
      values[optionName] = null;
    }

    // Saving timeout IDs prevents initial change from accidentally
    bufferedInitials[optionName] = setTimeout(() => {
      publishChange(emitter, optionName, values[optionName], null, true);
      delete bufferedInitials[optionName];
    }, 0);
  }

  return { values, bufferedInitials }
}

/**
 * Turns a camelCase string into a kebab-case string
 *
 * @param {String} camel
 * @return {String}
 */
function kebab (camel) {
  return camel.replace(/([A-Z])/g, (matches, char) => '-' + char.toLowerCase())
}

/**
 * Turns a kebab-case string into a camelCase string
 *
 * @param {String} kebab
 * @return {String}
 */
function camel (kebab) {
  return kebab.replace(/-([a-z])/g, (matches, char) => char.toUpperCase())
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
  const options = Object.create(null);
  for (const [optionName, optionDef] of entries(optionsDef)) {
    Object.defineProperty(options, optionName, {
      get: () => values[optionName],
      set (value) {
        try {
          const serializedValue = validateOptionValue(value, optionDef, false);

          if (typeof serializedValue === 'string') {
            element.dataset[optionName] = serializedValue;
            values[optionName] = value;
          } else {
            delete element.dataset[optionName];
            delete values[optionName];
          }
        } catch (err) {
          emitter.emit('error', {
            type: 'invalid-value-js',
            details: {
              option: optionName,
              value
            },
            message: `Error setting option "${optionName}": ${err.message}`
          });
        }
      }
    });
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
        callback(record.attributeName.slice(5), record.oldValue);
      }
    }
  });

  observer.observe(element, {
    attributes: true,
    attributeOldValue: true,
    attributeFilter: attributes
  });

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
    const optionName = camel(optionAttr);
    const def = optionsDef[optionName];

    const newSerializedValue = element.dataset[optionName];
    if (newSerializedValue === oldSerializedValue) return

    try {
      const newUnserializedValue = validateOptionValue(newSerializedValue, def, true);
      const oldUnserializedValue = validateOptionValue(oldSerializedValue, def, true);

      values[optionName] = newUnserializedValue;

      publishChange(emitter, optionName, newUnserializedValue, oldUnserializedValue);
    } catch (err) {
      emitter.emit('error', {
        type: 'invalid-value-html',
        details: {
          option: optionName,
          value: newSerializedValue
        },
        message: `Error setting option "${optionName}" via HTML: ${err.message}`
      });
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
  let elements = null;
  if (typeof constraint === 'string') {
    elements = constraint;
  } else if (constraint instanceof Element) {
    elements = [ constraint ];
  } else {
    if (constraint instanceof NodeList || constraint instanceof HTMLCollection) {
      constraint = toArray(constraint);
    }

    if (Array.isArray(constraint)) {
      if (constraint.every(node => node instanceof Element)) {
        elements = constraint;
      } else {
        elements = null;
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
  const localEmitter = mitt();

  // Delegate events to parent emitter
  localEmitter.on('*', (type, evt) => {
    parentEmitter.emit(type, extend({ element, elementApi }, evt));
  });

  // Set initial values
  const { values, bufferedInitials } = getInitialValues(element, optionsDef, localEmitter);

  // Make sure to clear out buffered initials
  for (const option in bufferedInitials) {
    localEmitter.once(`change:${option}`, () => {
      clearTimeout(bufferedInitials[option]);
      delete bufferedInitials[option];
    });
  }

  // Set up the MutationObserver
  const attributeObserver = createAttributeObserver(element, optionsDef, values, localEmitter);

  // Set up the `options` interface
  const optionsInterface = createOptionsInterface(element, optionsDef, values, localEmitter);

  const elementApi = {
    options: optionsInterface,

    /**
     * Adds an event listener
     *
     * @param {String} evt
     * @param {Function} listener
     */
    on (evt, listener, skip) {
      localEmitter.on(evt, listener, skip);
      return this
    },

    /**
     * Adds a one-time event listener
     *
     * @param {String} evt
     * @param {Function} listener
     */
    once (evt, listener, skip) {
      localEmitter.once(evt, listener, skip);
      return this
    },

    /**
     * Removes an event listener
     *
     * @param {String} evt
     * @param {Function} listener
     */
    off (evt, listener) {
      localEmitter.off(evt, listener);
      return this
    },

    /**
     * Destroy the attribute observer
     */
    destroy () {
      attributeObserver.disconnect();
      localEmitter.clear();
    }
  };

  return elementApi
}

/**
 * Create an HTML API from a DOM Element and an option defintion
 *
 * @param {Object} optionsDef
 * @return {Object}
 */
function htmlApi (optionsDef) {
  validateOptionsDefinition(optionsDef);

  return constraint => {
    let elements = validateElementConstraint(constraint);
    const observableSelector = typeof elements === 'string' && elements;
    if (observableSelector) elements = toArray(document.querySelectorAll(elements));

    // Set up a list of element APIs
    const elementApis = new Map();

    // Set up the event emitter
    const emitter = mitt();

    // Register a MutationObserver
    let elementObserver;
    if (observableSelector) {
      elementObserver = new MutationObserver(mutations => {
        for (const mutation of mutations) {
          if (mutation.type === 'childList') {
            const newNodes = toArray(mutation.addedNodes)
              .filter(node =>
                node instanceof Element &&
                matches(node, observableSelector) &&
                !elementApis.has(node)
              );

            for (const element of newNodes) {
              const elementApi = createElementBasedApi(element, optionsDef, emitter);
              elementApis.set(element, elementApi);
              emitter.emit('newElement', { element, elementApi });
            }

            for (const removedNode of toArray(mutation.removedNodes)) {
              if (!(removedNode instanceof Element)) continue
              if (elementApis.has(removedNode)) {
                elementApis.get(removedNode).destroy();
                elementApis.delete(removedNode);
              }
            }
          }
        }
      });

      elementObserver.observe(document.documentElement, {
        childList: true,
        subtree: true
      });
    }

    for (const element of elements) {
      const elementApi = createElementBasedApi(element, optionsDef, emitter);
      elementApis.set(element, elementApi);
      setTimeout(function () {
        emitter.emit('newElement', { element, elementApi });
      }, 0);
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
        let element;
        if (constraint instanceof Element) {
          element = constraint;
        } else if (typeof constraint === 'string') {
          element = document.querySelector(element);
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
      on (evt, listener, skip) {
        emitter.on(evt, listener, skip);
        return this
      },

      /**
       * Adds a one-time event listener
       *
       * @param {String} evt
       * @param {Function} listener
       */
      once (evt, listener, skip) {
        emitter.once(evt, listener, skip);
        return this
      },

      /**
       * Removes an event listener
       *
       * @param {String} evt
       * @param {Function} listener
       */
      off (evt, listener) {
        emitter.off(evt, listener);
        return this
      },

      /**
       * Destroys the API, in particular disconnecting the MutationObservers
       */
      destroy () {
        if (elementObserver) elementObserver.disconnect();
        emitter.clear();
        for (const elementApi of toArray(elementApis.values())) {
          elementApi.destroy();
        }
      }
    }
  }
}

htmlApi.Enum = (...values) => ({
  validate: value => typeof value === 'string' && has(values, value),
  serialize: value => value,
  unserialize: value => value
});

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
});

htmlApi.Integer = extend(numGen(-Infinity, Infinity, false), {
  min: min => extend(numGen(min, Infinity, false), {
    max: max => numGen(min, max, false)
  }),
  max: max => numGen(-Infinity, max, false)
});

htmlApi.Float = extend(numGen(-Infinity, Infinity), {
  min: min => extend(numGen(min, Infinity), {
    max: max => numGen(min, max)
  }),
  max: max => numGen(-Infinity, max)
});

return htmlApi;

}());
