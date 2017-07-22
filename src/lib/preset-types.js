// A Map of predefined types, in descending specificity order
export default new Map([
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
])
