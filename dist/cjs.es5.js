var htmlApi = (function () {
'use strict';

/**
 * A very primitive Map polyfill which does *not* override the global Map
 * Is concatenated with the package's source code
 */
var Map;

if (!window.Map || !window.Map.prototype.entries) {
  /* eslint-disable no-extend-native */
  Map = function (entries) {
    if (entries instanceof Map) {
      entries = entries.entries();
    } else if (!Array.isArray(entries)) {
      entries = [];
    }

    this._keys = entries.map(function (entry) { return entry[0] });
    this._values = entries.map(function (entry) { return entry[1] });
  };

  Map.prototype.keys = function () {
    return this._keys.slice(0)
  };

  Map.prototype.values = function () {
    return this._values.slice(0)
  };

  Map.prototype.entries = function () {
    var self = this;
    return this._keys.map(function (key, index) {
      return [ key, self._values[index] ]
    })
  };

  Map.prototype.has = function (key) {
    return this._keys.indexOf(key) !== -1
  };

  Map.prototype.get = function (key) {
    var index = this._keys.indexOf(key);
    if (index === -1) {
      return undefined
    } else {
      return this._values[index]
    }
  };

  Map.prototype.set = function (key, value) {
    var index = this._keys.indexOf(key);
    if (index === -1) {
      this._keys.push(key);
      this._values.push(value);
    } else {
      this._values[index] = value;
    }
    return this
  };

  Map.prototype.delete = function (key) {
    var index = this._keys.indexOf(key);
    if (index === -1) {
      return false
    } else {
      this._keys.splice(index, 1);
      this._values.splice(index, 1);
      return true
    }
  };

  Map.prototype.clear = function () {
    this._keys = [];
    this._values = [];
  };

  Map.prototype.forEach = function (callback) {
    return this.entries().forEach(callback)
  };

  Map.prototype.size = function () {
    return this._keys.length
  };
} else {
  Map = window.Map;
}

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

// A Map of predefined types, in descending specificity order
var presetTypes = new Map([
  [ null, {
    validate: function (value) { return value == null; },
    serialize: function (value) { return 'null'; },
    unserialize: function (value) { return JSON.parse(value); }
  }],
  [ Boolean, {
    validate: function (value) { return typeof value === 'boolean'; },
    serialize: function (value) { return value ? '' : undefined; },
    unserialize: function (value) {
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
    validate: function (value) { return typeof value === 'number' && !isNaN(value); },
    serialize: function (value) { return JSON.stringify(value); },
    unserialize: function (value) { return +value; }
  }],
  [ Array, {
    validate: function (value) { return Array.isArray(value); },
    serialize: function (value) { return JSON.stringify(value); },
    unserialize: function (value) { return JSON.parse(value); }
  }],
  [ Object, {
    validate: function (value) { return typeof value === 'object' && !Array.isArray(value); },
    serialize: function (value) { return JSON.stringify(value); },
    unserialize: function (value) { return JSON.parse(value); }
  }],
  [ Function, {
    validate: function (value) { return typeof value === 'function'; },
    serialize: function (value) { return String(value); },
    unserialize: function (value) { return eval(("(" + value + ")")); }
  }],
  [ String, {
    validate: function (value) { return typeof value === 'string'; },
    serialize: function (value) { return value; },
    unserialize: function (value) { return value; }
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
  return Array.from(presetTypes.keys()).includes(value) || isCustomTypeConstraint(value)
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

  var specificityArray = Array.from(presetTypes.keys());

  constraints = constraints
    .slice(0)
    // Sort constraints to match the defined specificity order
    .sort(function (a, b) {
      var indexA = specificityArray.indexOf(a);
      var indexB = specificityArray.indexOf(b);

      if (indexA === indexB) { return 0 }
      if (indexA === -1) { return -1 }
      if (indexB === -1) { return 1 }

      if (indexA < indexB) { return -1 }

      return 1
    })
    // Fetch the constraint object itself
    .map(function (constraint) { return presetTypes.has(constraint) ? presetTypes.get(constraint) : constraint; }
    );

  // Generate the function
  return function (value, serialized) { return constraints
    .find(function (constraint) {
      try {
        var unserializedValue = value;
        if (serialized) {
          unserializedValue = constraint.unserialize(value);
        }

        return constraint.validate(unserializedValue)
      } catch (err) {
        return false
      }
    }); }
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
  if (isValidTypeConstraint(optionDef)) { return true }

  // Definition is an object
  if (isPlainObject(optionDef)) {
    var detectTypeConstraint = createMultiConstraintDetector(optionDef.type);

    // Required and default not allowed at the same time
    if (optionDef.required && !isUndef(optionDef.default)) {
      throw new Error('Option can either be required or have a default value, not both')
    }

    // Not required, no default and not null
    if (
      !optionDef.required &&
      isUndef(optionDef.default) &&
      !(optionDef.type === null || (Array.isArray(optionDef.type) && optionDef.type.includes(null)))
    ) {
      throw new Error('An option must either be required, have a default value or include a `null` type')
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
  if (!isPlainObject(obj)) { throw new Error('Options definition must be a plain object') }

  for (var i = 0, list = Object.entries(obj); i < list.length; i += 1) {
    var ref = list[i];
    var optionName = ref[0];
    var optionDef = ref[1];

    try {
      validateOptionDefinition(optionDef);
    } catch (err) {
      throw new Error(("Option definition for option \"" + optionName + "\" failed: " + (err.message)))
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
  } else if (isValidTypeConstraint(optionDef.type)) {
    if (Array.isArray(optionDef.type)) {
      return optionDef.type
    } else if (isCustomTypeConstraint(optionDef.type)) {
      return [ optionDef.type ]
    } else {
      return [ presetTypes.get(optionDef.type) ]
    }
  } else {
    return undefined
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
function validateOptionValue (value, optionDef, isSerialized) {
  if ( isSerialized === void 0 ) isSerialized = false;

  var typeConstraints = getTypeConstraints(optionDef);
  var hasTypeConstraints = typeof typeConstraints !== 'undefined';

  var oppositeValue;

  // Type is constrained
  if (hasTypeConstraints) {
    var detectTypeConstraint = createMultiConstraintDetector(typeConstraints);

    // Serialized value
    if (isSerialized) {
      // Detect correct constraint off of array
      var typeConstraint = detectTypeConstraint(value, true);

      try {
        oppositeValue = typeConstraint.unserialize(value);
      } catch (e) {
        throw new Error(("Invalid serialized option value \"" + value + "\""))
      }

      if (isUndef(typeConstraint) || !typeConstraint.validate(oppositeValue)) {
        throw new Error(("Invalid serialized option value \"" + value + "\""))
      }

    // Typed value
    } else {
      // Detect correct constraint off of array
      var typeConstraint$1 = detectTypeConstraint(value, false);

      if (isUndef(typeConstraint$1) || !typeConstraint$1.validate(value)) {
        throw new Error(("Invalid option value \"" + value + "\""))
      } else {
        oppositeValue = typeConstraint$1.serialize(value);
      }
    }

  // Type is unconstrained
  } else {
    oppositeValue = value;
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
  var values = Object.create(null);

  var loop = function () {
    var ref = list[i];
    var optionName = ref[0];
    var optionDef = ref[1];

    var datasetValue = element.dataset[optionName];

    // Set in HTML
    if (datasetValue != null) {
      try {
        values[optionName] = validateOptionValue(datasetValue, optionDef, true);
      } catch (err) {
        throw new Error(("Error setting initial option \"" + optionName + "\": " + (err.message)))
      }

    // Fail on required
    } else if (optionDef.required) {
      window.requestAnimationFrame(function () {
        emitter.emit('error', new Error(("Missing required option \"" + optionName + "\"")));
      });

    // Use default value
    } else if (typeof optionDef.default !== 'undefined') {
      values[optionName] = optionDef.default;

    // Use undefined
    } else {
      values[optionName] = null;
    }
  };

  for (var i = 0, list = Object.entries(optionsDef); i < list.length; i += 1) loop();

  return values
}

/**
 * Turns a camelCase string into a kebab-case string
 *
 * @param {String} camel
 * @return {String}
 */
function kebab (camel) {
  return camel.replace(/([A-Z])/g, function (matches, char) { return '-' + char.toLowerCase(); })
}

/**
 * Turns a kebab-case string into a camelCase string
 *
 * @param {String} kebab
 * @return {String}
 */
function camel (kebab) {
  return kebab.replace(/-([a-z])/g, function (matches, char) { return char.toUpperCase(); })
}

/**
 * Creates a list of data attribetus to watch for a certain options definitions
 *
 * @param {Object} optionsDef
 * @return {string[]}
 */
function createOptionsAttrList (optionsDef) {
  return Object.keys(optionsDef).map(function (name) { return ("data-" + (kebab(name))); })
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
  var options = Object.create(null);
  var loop = function () {
    var ref = list[i];
    var optionName = ref[0];
    var optionDef = ref[1];

    Object.defineProperty(options, optionName, {
      get: function () { return values[optionName]; },
      set: function set (value) {
        try {
          var serializedValue = validateOptionValue(value, optionDef, false);

          if (typeof serializedValue === 'string') {
            element.dataset[optionName] = value;
          } else {
            delete element.dataset[optionName];
          }
        } catch (err) {
          emitter.emit('error', new Error(("Error setting option \"" + optionName + "\": " + (err.message))));
        }
      }
    });
  };

  for (var i = 0, list = Object.entries(optionsDef); i < list.length; i += 1) loop();
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
  var observer = new window.MutationObserver(function (records) {
    for (var i = 0, list = records; i < list.length; i += 1) {
      var record = list[i];

      if (record.type === 'attributes' && attributes.includes(record.attributeName)) {
        callback(record.attributeName.slice(5), record.oldValue);
      }
    }
  });

  observer.observe(element, { attributes: true });

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
  return function (optionAttr, oldSerializedValue) {
    var option = camel(optionAttr);
    var def = optionsDef[option];

    var newSerializedValue = element.dataset[option];
    if (newSerializedValue === oldSerializedValue) { return }

    try {
      var newUnserializedValue = validateOptionValue(newSerializedValue, def, true);

      var oldUnserializedValue = values[option];
      values[option] = newUnserializedValue;

      emitter.emit('change', {
        option: option,
        oldValue: oldUnserializedValue,
        value: newUnserializedValue
      });
    } catch (err) {
      emitter.emit('error', new Error(("Error setting option \"" + option + "\" via HTML: " + (err.message))));
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
  var emitter = mitt();

  // Set initial values
  var values = getInitialValues(element, optionsDef, emitter);

  // Set up the MutationObserver
  var observer = createElementObserver(element, optionsDef, values, emitter);

  // The user-facing onChange interface
  var onChange = Object.create(null);
  emitter.on('change', function (ref) {
    var option = ref.option;
    var value = ref.value;
    var oldValue = ref.oldValue;

    if (typeof onChange[option] === 'function') { onChange[option](value, oldValue); }
  });

  return {
    options: createOptionsDefInterface(optionsDef, element, values, emitter),

    onChange: onChange,

    /**
     * Adds an event listener
     *
     * @param {String} evt
     * @param {Function} listener
     */
    on: function on (evt, listener) {
      emitter.on(evt, listener);
      return this
    },

    /**
     * Removes an event listener
     *
     * @param {String} evt
     * @param {Function} listener
     */
    off: function off (evt, listener) {
      emitter.off(evt, listener);
      return this
    },

    /**
     * Merges a new options definition in
     *
     * @param {Object} newOptionsDef
     */
    merge: function merge (newOptionsDef) {
      // Validate new options definition
      validateOptionsDefinition(newOptionsDef);

      // Amend original options definition
      Object.assign(optionsDef, newOptionsDef);

      // Amend original values, re-evaluating existing, overridden ones
      var newInitialValues = getInitialValues(element, newOptionsDef, emitter);
      Object.assign(values, newInitialValues);

      // Override options interface
      this.options = createOptionsDefInterface(optionsDef, element, values, emitter);

      // Restart MutationObserver
      observer.disconnect();
      observer = createElementObserver(element, optionsDef, values, emitter);
    },

    /**
     * Destroys the API, in particular disconnecting the MutationObserver
     */
    destroy: function destroy () {
      observer.disconnect();
    }
  }
}

return htmlApi;

}());
