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

var Map$1 = Map;

/*
 * Mitt
 * A nicely compact event emitter, adjusted for our needs
 * @see https://www.npmjs.com/package/mitt
 */
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
    on: function on (type, handler) {
      (all[type] || (all[type] = [])).push(handler);
    },

    /**
     * Register an event handler for the given type for one execution.
     *
     * @param  {String} type  Type of event to listen for, or `"*"` for all events
     * @param  {Function} handler Function to call in response to given event
     * @memberOf mitt
     */
    once: function once$1 (type, handler) {
      (once[type] || (once[type] = [])).push(handler);
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
    emit: function emit (type, evt) {
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
    clear: function clear () {
      all = {};
      once = {};
    },

    get _listeners () {
      return all
    }
  }
}

/* global Element */

/**
 * Checks if a value is undefined
 *
 * @param {Any} value
 * @return {Boolean}
 */
function isUndef (value) {
  return typeof value === 'undefined'
}

/*
 * Strings
 */

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

/*
 * Arrays
 */

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
  if (array.find) { return array.find(callback) }
  for (var i = 0; i < array.length; i++) {
    if (callback(array[i], i, array)) { return array[i] }
  }
  return undefined
}

/**
 * Use this instead of Array.from() for compatibility
 *
 * @param {Object} obj
 */
function toArray (obj) {
  if (Array.from) { return Array.from(obj) }
  if (Array.isArray(obj)) { return obj.slice(0) }

  // If Array.from is not defined, we can safely assume that we use
  // our own Map implementation and therefore the following is fine.
  var items = [];
  for (var i = 0; i < obj.length; i++) { items.push(obj[i]); }

  return items
}

/**
 * Objects
 */

/**
 * Checks if value is a plain object
 * @param  {Any}  obj
 * @return {Boolean}
 */
function isPlainObject (value) {
  return typeof value === 'object' && value !== null && value.prototype == null
}

/**
 * Use this instead of Object.entries() for compatibility
 *
 * @param {Object} obj
 */
function entries (obj) {
  return Object.keys(obj).map(function (key) { return [ key, obj[key] ]; })
}

/**
 * Use this instead of Object.assign() for compatibility
 *
 * @param {Object} ...obj
 */
function extend () {
  var objects = [], len = arguments.length;
  while ( len-- ) objects[ len ] = arguments[ len ];

  if (Object.assign) { return Object.assign.apply(Object, objects) }
  if (objects.length === 0) { throw new TypeError('Cannot convert undefined or null to object') }
  if (objects.length === 1) { return objects[0] }

  for (var key in objects[1]) {
    objects[0][key] = objects[1][key];
  }

  return extend.apply(void 0, [ objects[0] ].concat( objects.slice(2) ))
}

/*
 * DOM
 */

/**
 * Checks if an element matches a given selector
 *
 * @param {Element} el
 * @param {String} selector
 */
function matches (el, selector) {
  var proto = Element.prototype;
  var fn = proto.matches || proto.webkitMatchesSelector || proto.mozMatchesSelector || proto.msMatchesSelector || function (selector) {
    return [].indexOf.call(document.querySelectorAll(selector), this) !== -1
  };
  return fn.call(el, selector)
}

// A Map of predefined types, in descending specificity order
var presetTypes = new Map$1([
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
    serialize: function (number) { return String(number); },
    unserialize: function (value) { return +value; }
  }],
  [ Array, {
    validate: function (value) { return Array.isArray(value); },
    serialize: function (value) { return JSON.stringify(value); },
    unserialize: function (value) { return JSON.parse(value); }
  }],
  [ Object, {
    validate: function (value) { return typeof value === 'object' && value !== null && !Array.isArray(value); },
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

/* global Element, requestAnimationFrame, MutationObserver, NodeList, HTMLCollection */

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
    ? (value.length && value.every(isValidSingleTypeConstraint) && value.some(function (constraint) { return constraint !== null; }))
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
    constraints = [ constraints ];
  }

  var specificityArray = toArray(presetTypes.keys());

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
  return function (value, serialized) { return find(constraints, function (constraint) {
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
    // Fail no missing type constraint
    if (!isValidTypeConstraint(optionDef.type)) {
      throw Error('Definition must have a valid type constraint')
    }

    var detectTypeConstraint = createMultiConstraintDetector(optionDef.type);

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
  if (!isPlainObject(obj)) { throw new Error('Options definition must be a plain object') }

  for (var i = 0, list = entries(obj); i < list.length; i += 1) {
    var ref = list[i];
    var optionName = ref[0];
    var optionDef = ref[1];

    try {
      validateOptionDefinition(optionDef);

      // Make simple types nullable
      if (isValidTypeConstraint(optionDef)) {
        if (Array.isArray(optionDef)) {
          if (!has(optionDef, null)) { optionDef.push(null); }
        } else if (optionDef !== null) {
          obj[optionName] = [ optionDef, null ];
        }
      }
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
function validateOptionValue (value, optionDef, isSerialized) {
  if ( isSerialized === void 0 ) isSerialized = false;

  var typeConstraints = getTypeConstraints(optionDef);

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

  var oppositeValue;

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

    if (!typeConstraint.validate(oppositeValue)) {
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
function publishChange (emitter, option, value, oldValue, initial) {
  if ( initial === void 0 ) initial = false;

  emitter.emit('change', { option: option, value: value, oldValue: oldValue, initial: initial });
  emitter.emit(("change:" + option), { value: value, oldValue: oldValue, initial: initial });
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
  var bufferedInitials = {};

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
    } else if (optionDef && optionDef.required) {
      requestAnimationFrame(function () {
        emitter.emit('error', {
          type: 'missing-required',
          message: ("Missing required option \"" + optionName + "\""),
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
    bufferedInitials[optionName] = setTimeout(function () {
      publishChange(emitter, optionName, values[optionName], null, true);
      delete bufferedInitials[optionName];
    }, 0);
  };

  for (var i = 0, list = entries(optionsDef); i < list.length; i += 1) loop();

  return { values: values, bufferedInitials: bufferedInitials }
}

/**
 * Creates a list of data attribtes to watch for a certain option's definitions
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
 * @param {Element} element
 * @param {Object} optionsDef
 * @param {Object} values
 * @param {Object} emitter
 * @return {Object}
 */
function createOptionsInterface (element, optionsDef, values, emitter) {
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
              value: value
            },
            message: ("Error setting option \"" + optionName + "\": " + (err.message))
          });
        }
      }
    });
  };

  for (var i = 0, list = entries(optionsDef); i < list.length; i += 1) loop();
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
  var observer = new MutationObserver(function (records) {
    for (var i = 0, list = records; i < list.length; i += 1) {
      var record = list[i];

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
  return function (optionAttr, oldSerializedValue) {
    var optionName = camel(optionAttr);
    var def = optionsDef[optionName];

    var newSerializedValue = element.dataset[optionName];
    if (newSerializedValue === oldSerializedValue) { return }

    try {
      var newUnserializedValue = validateOptionValue(newSerializedValue, def, true);
      var oldUnserializedValue = validateOptionValue(oldSerializedValue, def, true);

      values[optionName] = newUnserializedValue;

      publishChange(emitter, optionName, newUnserializedValue, oldUnserializedValue);
    } catch (err) {
      emitter.emit('error', {
        type: 'invalid-value-html',
        details: {
          option: optionName,
          value: newSerializedValue
        },
        message: ("Error setting option \"" + optionName + "\" via HTML: " + (err.message))
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
  var elements = null;
  if (typeof constraint === 'string') {
    elements = constraint;
  } else if (constraint instanceof Element) {
    elements = [ constraint ];
  } else {
    if (constraint instanceof NodeList || constraint instanceof HTMLCollection) {
      constraint = toArray(constraint);
    }

    if (Array.isArray(constraint)) {
      if (constraint.every(function (node) { return node instanceof Element; })) {
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
  var localEmitter = mitt();

  // Delegate events to parent emitter
  localEmitter.on('*', function (type, evt) {
    parentEmitter.emit(type, extend({ element: element, elementApi: elementApi }, evt));
  });

  // Set initial values
  var ref = getInitialValues(element, optionsDef, localEmitter);
  var values = ref.values;
  var bufferedInitials = ref.bufferedInitials;

  // Make sure to clear out buffered initials
  var loop = function ( option ) {
    localEmitter.once(("change:" + option), function () {
      clearTimeout(bufferedInitials[option]);
      delete bufferedInitials[option];
    });
  };

  for (var option in bufferedInitials) loop( option );

  // Set up the MutationObserver
  var attributeObserver = createAttributeObserver(element, optionsDef, values, localEmitter);

  // Set up the `options` interface
  var optionsInterface = createOptionsInterface(element, optionsDef, values, localEmitter);

  var elementApi = {
    options: optionsInterface,

    /**
     * Adds an event listener
     *
     * @param {String} evt
     * @param {Function} listener
     */
    on: function on (evt, listener) {
      localEmitter.on(evt, listener);
      return this
    },

    /**
     * Adds a one-time event listener
     *
     * @param {String} evt
     * @param {Function} listener
     */
    once: function once (evt, listener) {
      localEmitter.once(evt, listener);
      return this
    },

    /**
     * Removes an event listener
     *
     * @param {String} evt
     * @param {Function} listener
     */
    off: function off (evt, listener) {
      localEmitter.off(evt, listener);
      return this
    },

    /**
     * Destroy the attribute observer
     */
    destroy: function destroy () {
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

  return function (constraint) {
    var elements = validateElementConstraint(constraint);
    var observableSelector = typeof elements === 'string' && elements;
    if (observableSelector) { elements = toArray(document.querySelectorAll(elements)); }

    // Set up a list of element APIs
    var elementApis = new Map$1();

    // Set up the event emitter
    var emitter = mitt();

    // Register a MutationObserver
    var elementObserver;
    if (observableSelector) {
      elementObserver = new MutationObserver(function (mutations) {
        for (var i = 0, list = mutations; i < list.length; i += 1) {
          var mutation = list[i];

          if (mutation.type === 'childList') {
            var newNodes = toArray(mutation.addedNodes)
              .filter(function (node) { return node instanceof Element &&
                matches(node, observableSelector) &&
                !elementApis.has(node); }
              );

            for (var i$1 = 0, list$1 = newNodes; i$1 < list$1.length; i$1 += 1) {
              var element = list$1[i$1];

              var elementApi = createElementBasedApi(element, optionsDef, emitter);
              elementApis.set(element, elementApi);
              emitter.emit('newElement', { element: element, elementApi: elementApi });
            }

            for (var i$2 = 0, list$2 = toArray(mutation.removedNodes); i$2 < list$2.length; i$2 += 1) {
              var removedNode = list$2[i$2];

              if (!(removedNode instanceof Element)) { continue }
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

    var loop = function () {
      var element = list[i];

      var elementApi = createElementBasedApi(element, optionsDef, emitter);
      elementApis.set(element, elementApi);
      setTimeout(function () {
        emitter.emit('newElement', { element: element, elementApi: elementApi });
      }, 0);
    };

    for (var i = 0, list = elements; i < list.length; i += 1) loop();

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
      for: function for$1 (constraint) {
        var element;
        if (constraint instanceof Element) {
          element = constraint;
        } else if (typeof constraint === 'string') {
          element = document.querySelector(element);
        } else {
          throw new Error('Constraint must either be an Element or a selector string')
        }
        if (!element) { throw new Error('No element found for the given selector') }
        if (!elementApis.has(element)) { throw new Error('The given element does not have your API attached') }

        return elementApis.get(element)
      },

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
       * Adds a one-time event listener
       *
       * @param {String} evt
       * @param {Function} listener
       */
      once: function once (evt, listener) {
        emitter.once(evt, listener);
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
       * Destroys the API, in particular disconnecting the MutationObservers
       */
      destroy: function destroy () {
        if (elementObserver) { elementObserver.disconnect(); }
        emitter.clear();
        for (var i = 0, list = toArray(elementApis.values()); i < list.length; i += 1) {
          var elementApi = list[i];

          elementApi.destroy();
        }
      }
    }
  }
}

/**
 * Define Enum constraint
 */
htmlApi.Enum = function () {
  var values = [], len = arguments.length;
  while ( len-- ) values[ len ] = arguments[ len ];

  return ({
  validate: function (value) { return typeof value === 'string' && has(values, value); },
  serialize: function (value) { return value; },
  unserialize: function (value) { return value; }
});
};

/**
 * Generate a number constraint
 *
 * @param {Number} min
 * @param {Number} max
 * @param {Boolean} float
 */
var numGen = function (min, max, float) {
  if ( min === void 0 ) min = -Infinity;
  if ( max === void 0 ) max = Infinity;
  if ( float === void 0 ) float = true;

  return ({
  validate: function (value) {
    if (typeof value !== 'number' || !isFinite(value)) { return false }
    if (!float) {
      if (Number.isInteger) {
        if (!Number.isInteger(value)) { return false }
      } else {
        if (Math.floor(value) !== value) { return false }
      }
    }
    return value >= min && value <= max
  },
  serialize: function (value) { return String(value); },
  unserialize: function (value) { return +value; }
});
};

/**
 * Define Integer constraint
 */
htmlApi.Integer = extend(numGen(-Infinity, Infinity, false), {
  min: function (min) { return extend(numGen(min, Infinity, false), {
    max: function (max) { return numGen(min, max, false); }
  }); },
  max: function (max) { return numGen(-Infinity, max, false); }
});

/**
 * Define Float constraint
 */
htmlApi.Float = extend(numGen(-Infinity, Infinity), {
  min: function (min) { return extend(numGen(min, Infinity), {
    max: function (max) { return numGen(min, max); }
  }); },
  max: function (max) { return numGen(-Infinity, max); }
});

module.exports = htmlApi;
