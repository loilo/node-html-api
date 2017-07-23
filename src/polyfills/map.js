/**
 * A very primitive Map polyfill which does *not* override the global Map
 * Is concatenated with the package's source code
 */
let Map

if (!window.Map || !window.Map.prototype.entries) {
  /* eslint-disable no-extend-native */
  Map = function (entries) {
    if (entries instanceof Map) {
      entries = entries.entries()
    } else if (!Array.isArray(entries)) {
      entries = []
    }

    this._keys = entries.map(function (entry) { return entry[0] })
    this._values = entries.map(function (entry) { return entry[1] })
  }

  Map.prototype.keys = function () {
    return this._keys.slice(0)
  }

  Map.prototype.values = function () {
    return this._values.slice(0)
  }

  Map.prototype.entries = function () {
    var self = this
    return this._keys.map(function (key, index) {
      return [ key, self._values[index] ]
    })
  }

  Map.prototype.has = function (key) {
    return this._keys.indexOf(key) !== -1
  }

  Map.prototype.get = function (key) {
    var index = this._keys.indexOf(key)
    if (index === -1) {
      return undefined
    } else {
      return this._values[index]
    }
  }

  Map.prototype.set = function (key, value) {
    var index = this._keys.indexOf(key)
    if (index === -1) {
      this._keys.push(key)
      this._values.push(value)
    } else {
      this._values[index] = value
    }
    return this
  }

  Map.prototype.delete = function (key) {
    var index = this._keys.indexOf(key)
    if (index === -1) {
      return false
    } else {
      this._keys.splice(index, 1)
      this._values.splice(index, 1)
      return true
    }
  }

  Map.prototype.clear = function () {
    this._keys = []
    this._values = []
  }

  Map.prototype.forEach = function (callback) {
    return this.entries().forEach(callback)
  }

  Map.prototype.size = function () {
    return this._keys.length
  }
} else {
  Map = window.Map
}

export default Map
