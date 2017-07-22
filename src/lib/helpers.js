/* global Element */

/**
 * Checks if a value is undefined
 *
 * @param {Any} value
 * @return {Boolean}
 */
export function isUndef (value) {
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
export function kebab (camel) {
  return camel.replace(/([A-Z])/g, (matches, char) => '-' + char.toLowerCase())
}

/**
 * Turns a kebab-case string into a camelCase string
 *
 * @param {String} kebab
 * @return {String}
 */
export function camel (kebab) {
  return kebab.replace(/-([a-z])/g, (matches, char) => char.toUpperCase())
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
export function has (array, value) {
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
export function find (array, callback) {
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
export function toArray (obj) {
  if (Array.from) return Array.from(obj)
  if (Array.isArray(obj)) return obj.slice(0)

  // If Array.from is not defined, we can safely assume that we use
  // our own Map implementation and therefore the following is fine.
  const items = []
  for (let i = 0; i < obj.length; i++) items.push(obj[i])

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
export function isPlainObject (value) {
  return typeof value === 'object' && value !== null && value.prototype == null
}

/**
 * Use this instead of Object.entries() for compatibility
 *
 * @param {Object} obj
 */
export function entries (obj) {
  return Object.keys(obj).map(key => [ key, obj[key] ])
}

/**
 * Use this instead of Object.assign() for compatibility
 *
 * @param {Object} ...obj
 */
export function extend (...objects) {
  if (Object.assign) return Object.assign(...objects)
  if (objects.length === 0) throw new TypeError('Cannot convert undefined or null to object')
  if (objects.length === 1) return objects[0]

  for (let key in objects[1]) {
    objects[0][key] = objects[1][key]
  }

  return extend(objects[0], ...objects.slice(2))
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
export function matches (el, selector) {
  const proto = Element.prototype
  const fn = proto.matches || proto.webkitMatchesSelector || proto.mozMatchesSelector || proto.msMatchesSelector || function (selector) {
    return [].indexOf.call(document.querySelectorAll(selector), this) !== -1
  }
  return fn.call(el, selector)
}
