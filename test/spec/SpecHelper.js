function matchProps (actual, objectProps, arrayProps, fnProps) {
  var missingObjectProps = objectProps.filter(function (prop) { return typeof actual[prop] !== 'object' })
  var missingArrayProps = arrayProps.filter(function (prop) { return !Array.isArray(actual[prop]) })
  var missingFnProps = fnProps.filter(function (prop) { return typeof actual[prop] !== 'function' })

  return {
    pass: !missingObjectProps.length && !missingArrayProps.length && !missingFnProps.length,
    message: 'Expected ' + actual + ' to have ' +
      [
        (missingObjectProps.length ? 'properties ' + JSON.stringify(missingObjectProps) + ' of type "Object"' : '') +
        (missingArrayProps.length ? 'properties ' + JSON.stringify(missingArrayProps) + ' of type "Array"' : '') +
        (missingFnProps.length ? 'properties ' + JSON.stringify(missingFnProps) + ' of type "Function"' : '')
      ].filter(function (str) { return !!str.length }).join(', ')
  }
}

function stringify (value) {
  return typeof value === 'number'
    ? String (value)
    : JSON.stringify(value)
}

var defaults = {
  booleans: true,
  arrays: [1, 2, 3],
  objects: { a: 1, b: 2, c: 3 },
  functions: function () {},
  strings: 'string',
  numbers: 5,
  null: null
}

function serializeOption (host, pairing, direction) {
  if (direction === void 0) direction = 'both'

  Object.keys(pairing).forEach(function (serialized) {
    var unserialized = pairing[serialized]

    if (direction === 'serialize' || direction === 'both') {
      it ('should serialize ' + stringify(unserialized) + ' to ' + stringify(serialized), function (done) {
        var elementApi = host.elementApi
        var element = window.testBtn

        setTimeout(function () {
          elementApi.options.myOption = unserialized
        }, 0)

        elementApi.on('change', function (evt) {
          if (evt.initial) return
          expect(element.getAttribute('data-my-option')).toEqual(serialized)
          done()
        })
        elementApi.once('error', function (err) {
          done.fail('Could not set `myOption` to ' + stringify(value))
        })
      })
    }

    if (direction === 'unserialize' || direction === 'both') {
      it ('should unserialize ' + stringify(serialized) + ' to ' + stringify(unserialized), function (done) {
        var elementApi = host.elementApi
        var element = window.testBtn

        setTimeout(function () {
          element.setAttribute('data-my-option', serialized)
        }, 0)

        elementApi.on('change', function (evt) {
          if (evt.initial) return
          expect(elementApi.options.myOption).toEqual(unserialized)
          done()
        })
        elementApi.once('error', function (err) {
          done.fail('Could not set `myOption` to ' + stringify(value))
        })
      })
    }
  })
}

function acceptOptions (host, options) {
  options.forEach(function (what) {
    var value = defaults[what] || what

    it ('should accept ' + what, function (done) {
      var elementApi = host.elementApi

      setTimeout(function () {
        elementApi.options.myOption = value
      }, 0)

      expectNothing()

      elementApi.on('change', function (evt) {
        if (evt.initial) return
        done()
      })
      elementApi.once('error', function (err) {
        done.fail('Could not set `myOption` to ' + stringify(value))
      })
    })
  })
}

function dontAcceptOptions (host, options) {
  options.forEach(function (what) {
    var value = typeof defaults[what] === 'undefined'
      ? what
      : defaults[what]

    it ('should not accept ' + (typeof defaults[what] === 'undefined'
      ? stringify(what)
      : what
    ), function (done) {
      var elementApi = host.elementApi

      setTimeout(function () {
        elementApi.options.myOption = value
      }, 0)

      expectNothing()

      elementApi.on('change', function (event) {
        if (event.initial) return
        done.fail('Value ' + stringify(value) + ' was falsely accepted')
      })
      elementApi.once('error', done)
    })
  })
}

function expectNothing () {
  expect(true).toBeTruthy()
}

beforeEach(function () {
  jasmine.addMatchers({
    toBeFunction: function () {
      return {
        compare: function (actual) {
          return {
            pass: typeof actual === 'function'
          }
        }
      }
    },
    toBeApi: function () {
      return {
        compare: function (actual) {
          return matchProps(actual, [], ['elements'],  ['for', 'on', 'once', 'off', 'destroy'])
        }
      }
    },
    toBeElementApi: function () {
      return {
        compare: function (actual) {
          return matchProps(actual, ['options'], [], ['on', 'once', 'off', 'destroy'])
        }
      }
    }
  })
})
