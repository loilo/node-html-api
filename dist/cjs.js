var htmlApi = (function () {
'use strict';

// Mitt
// A nicely compact event emitter
// @see https://www.npmjs.com/package/mitt
function mitt (all) {
  all = all || Object.create(null);

  return {
    /**
     * Register an event handler for the given type.
     *
     * @param  {String} type  Type of event to listen for, or `"*"` for all events
     * @param  {Function} handler Function to call in response to given event
     * @memberOf mitt
     */
    on: function on (type, handler) {
      (all[type] || (all[type] = [])).push(handler);
    },

    /**
     * Remove an event handler for the given type.
     *
     * @param  {String} type  Type of event to unregister `handler` from, or `"*"`
     * @param  {Function} handler Handler function to remove
     * @memberOf mitt
     */
    off: function off (type, handler) {
      if (all[type]) {
        all[type].splice(all[type].indexOf(handler) >>> 0, 1);
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
    emit: function emit (type, evt) {
      (all[type] || []).map(function (handler) { handler(evt); });
      (all['*'] || []).map(function (handler) { handler(type, evt); });
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
function arrayFrom (obj) {
  if (Array.from) return Array.from(obj)
  if (Array.isArray(obj)) return obj.slice(0)

  // If Array.from is not defined, we can safely assume that we use
  // our own Map implementation and therefore the following is fine.
  const items = [];
  for (let i = 0; i < obj.length; i++) items.push(obj[i]);

  return items
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
    validate: value => typeof value === 'object' && !Array.isArray(value),
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
  return typeof value === 'object' && value.prototype == null
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
  return has(arrayFrom(presetTypes.keys()), value) || isCustomTypeConstraint(value)
}

/**
 * Checks if a value is a valid type constraint
 *
 * @param {Any} value
 * @return {Boolean}
 */
function isValidTypeConstraint (value) {
  return Array.isArray(value)
    ? (value.length && value.every(isValidSingleTypeConstraint))
    : isValidSingleTypeConstraint(value)
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

  const specificityArray = arrayFrom(presetTypes.keys());

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
 * @param {Any} value
 * @return {Boolean}
 */
function isUndef (value) {
  return typeof value === 'undefined'
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
 * Gets the initial values of an HTML API, considering data-* attributes and default values
 *
 * @param {Element} element
 * @param {Object} optionsDef
 * @param {Object} emitter
 */
function getInitialValues (element, optionsDef, emitter) {
  const values = Object.create(null);

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
    } else if (optionDef.required) {
      window.requestAnimationFrame(() => {
        emitter.emit('error', new Error(`Missing required option "${optionName}"`));
      });

    // Use default value
    } else if (typeof optionDef.default !== 'undefined') {
      values[optionName] = optionDef.default;

    // Use undefined
    } else {
      values[optionName] = null;
    }
  }

  return values
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
 * Creates a list of data attribetus to watch for a certain options definitions
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
 * @param {Object} optionsDef
 * @param {Element} element
 * @param {Object} values
 * @param {Object} emitter
 * @return {Object}
 */
function createOptionsDefInterface (optionsDef, element, values, emitter) {
  const options = Object.create(null);
  for (const [optionName, optionDef] of entries(optionsDef)) {
    Object.defineProperty(options, optionName, {
      get: () => values[optionName],
      set (value) {
        try {
          const serializedValue = validateOptionValue(value, optionDef, false);

          if (typeof serializedValue === 'string') {
            element.dataset[optionName] = serializedValue;
          } else {
            delete element.dataset[optionName];
          }
        } catch (err) {
          emitter.emit('error', new Error(`Error setting option "${optionName}": ${err.message}`));
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
function observeElement (element, attributes, callback) {
  // create an observer instance
  const observer = new window.MutationObserver(records => {
    for (const record of records) {
      if (record.type === 'attributes') {
        callback(record.attributeName.slice(5), record.oldValue);
      }
    }
  });

  observer.observe(element, {
    attributes: true,
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
    const option = camel(optionAttr);
    const def = optionsDef[option];

    const newSerializedValue = element.dataset[option];
    if (newSerializedValue === oldSerializedValue) return

    try {
      const newUnserializedValue = validateOptionValue(newSerializedValue, def, true);

      const oldUnserializedValue = values[option];
      values[option] = newUnserializedValue;

      emitter.emit('change', {
        option,
        oldValue: oldUnserializedValue,
        value: newUnserializedValue
      });
    } catch (err) {
      emitter.emit('error', new Error(`Error setting option "${option}" via HTML: ${err.message}`));
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
function createElementObserver (element, optionsDef, values, emitter) {
  return observeElement(
    element,
    createOptionsAttrList(optionsDef),
    createMutationHandler(element, optionsDef, values, emitter)
  )
}

/**
 * Create an HTML API from a DOM Element and an option defintion
 *
 * @param {Element} element
 * @param {Object} optionsDef
 * @return {Object}
 */
function htmlApi (element, optionsDef) {
  if (!(element instanceof window.Element)) {
    throw new Error('No valid Element given')
  }

  validateOptionsDefinition(optionsDef);

  // Set up the event emitter
  const emitter = mitt();

  // Set initial values
  const values = getInitialValues(element, optionsDef, emitter);

  // Set up the MutationObserver
  let observer = createElementObserver(element, optionsDef, values, emitter);

  // The user-facing onChange interface
  const onChange = Object.create(null);
  emitter.on('change', ({ option, value, oldValue }) => {
    if (typeof onChange[option] === 'function') onChange[option](value, oldValue);
  });

  return {
    options: createOptionsDefInterface(optionsDef, element, values, emitter),

    onChange,

    /**
     * Adds an event listener
     *
     * @param {String} evt
     * @param {Function} listener
     */
    on (evt, listener) {
      emitter.on(evt, listener);
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
     * Merges in a new options definition
     *
     * @param {Object} newOptionsDef
     */
    merge (newOptionsDef) {
      // Validate new options definition
      validateOptionsDefinition(newOptionsDef);

      // Amend original options definition
      Object.assign(optionsDef, newOptionsDef);

      // Amend original values, re-evaluating existing, overridden ones
      const newInitialValues = getInitialValues(element, newOptionsDef, emitter);
      Object.assign(values, newInitialValues);

      // Override options interface
      this.options = createOptionsDefInterface(optionsDef, element, values, emitter);

      // Restart MutationObserver
      observer.disconnect();
      observer = createElementObserver(element, optionsDef, values, emitter);

      return this
    },

    /**
     * Destroys the API, in particular disconnecting the MutationObserver
     */
    destroy () {
      observer.disconnect();
    }
  }
}

htmlApi.Enum = (...values) => ({
  validate: value => typeof value === 'string' && has(values, value),
  serialize: value => value,
  unserialize: value => value
});

const numGen = (min = -Infinity, max = Infinity, float = true) => ({
  validate: value => (
      float ||
      Number.isInteger
        ? Number.isInteger(value)
        : (typeof value === 'number' && isFinite(value) && Math.floor(value) === value)
    ) &&
    value >= min && value <= max,
  serialize: value => String(value),
  unserialize: value => +value
});

htmlApi.Integer = Object.assign(numGen(-Infinity, Infinity, false), {
  min: min => Object.assign(numGen(min, Infinity, false), {
    max: max => numGen(min, max, false)
  }),
  max: max => numGen(-Infinity, max, false)
});

htmlApi.Float = Object.assign(numGen(-Infinity, Infinity), {
  min: min => Object.assign(numGen(min, Infinity), {
    max: max => numGen(min, max)
  }),
  max: max => numGen(-Infinity, max)
});

return htmlApi;

}());
