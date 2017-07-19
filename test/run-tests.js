document.addEventListener('DOMContentLoaded', function () {
  var testArea = document.getElementById('test-area')

  function setUpButton () {
    testArea.innerHTML = '';
    var element = document.createElement('button')
    element.textContent = 'Button'
    testArea.appendChild(element)
    return element
  }

  var list = document.querySelector('#tests')

  var tests = []
  var invokingIndex = 0

  function addTest (id, description, callback) {
    tests.push([ id, description, callback ])
    var row = document.createElement('tr')
    row.innerHTML =
      '<td>' + id + '</td>' +
      '<td>' + description
        .replace(/`(.+?)`/g, '<code>$1</code>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>') +
      '</td>' +
      '<td id="state-' + id + '">-</td>'
    list.appendChild(row)
  }

  function timeout (callback, api, time) {
    if (typeof time !== 'number') time = 1000

    return setTimeout(function () {
      if (api) api.destroy()

      callback(false, 'Timeout after ' + time + 'ms')
    }, time)
  }

  function invokeTest (index) {
    var test = tests[index]
    var id = test[0]
    var description = test[1]
    var callback = test[2]
    var stateCell = document.getElementById('state-' + id)

    stateCell.textContent = 'RUNNING'

    try {
      callback(function (success, details) {
        if (success) {
          stateCell.textContent = 'OK'
          stateCell.parentNode.classList.add('success')
        } else {
          stateCell.textContent = 'ERR'
          stateCell.parentNode.classList.add('error')
          if (details) {
            if (Array.isArray(details)) {
              console.error.apply(this, details)
            } else {
              console.error(details)
            }
          }
        }

        if (index < tests.length - 1) {
          invokeTest(index + 1)
        } else {
          console.log('Done.')
        }
      })
    } catch (err) {
      stateCell.textContent = 'ERR'
      stateCell.parentNode.classList.add('error')
      console.error('Uncaught error in test:', err)
    }
  }





  addTest('configuration-require-and-default', 'Configuration should fail with `required` and `default` set', function (done) {
    try {
      var api = htmlApi(element, {
        label: {
          type: String,
          required: true,
          'default': 'value'
        }
      })

      done(false)
      api.destroy()
    } catch (err) {
      done(true)
    }
  })

  addTest('configuration-no-require-nor-default', 'Configuration should fail with none of `required` or `default` set', function (done) {
    var element = document.createElement('button')
    try {
      var api = htmlApi(element, {
        label: {
          type: String
        }
      })

      done(false)
      api.destroy()
    } catch (err) {
      done(true)
    }
  })

  addTest('configuration-no-require-nor-default-nullable', 'Configuration should pass with type constraint `null` and none of `required` or `default` set', function (done) {
    var element = document.createElement('button')
    try {
      var api = htmlApi(element, {
        label: {
          type: [String, null]
        }
      })

      done(true)
      api.destroy()
    } catch (err) {
      done(false, err)
    }
  })

  addTest('configuration-require-false-no-default', 'Configuration should fail with no `default` and `required` set to `false`', function (done) {
    var element = document.createElement('button')
    try {
      var api = htmlApi(element, {
        label: {
          type: String,
          required: false
        }
      })

      done(false)
      api.destroy()
    } catch (err) {
      done(true)
    }
  })

  addTest('configuration-no-type', 'Configuration should fail if no valid type constraint is set', function (done) {
    var element = document.createElement('button')
    try {
      var api = htmlApi(element, {
        label: {
          type: 'foo'
        }
      })

      done(false)
      api.destroy()
    } catch (err) {
      done(true)
    }
  })




  addTest('basic-attribute-change', 'Element should react to `element.setAttribute("data-my-option")`', function (done) {
    var element = setUpButton()
    var api = htmlApi(element, {
      myOption: String
    })

    var newLabel = 'Magic button'
    api.onChange.myOption = function (value) {
      element.textContent = value
    }
    element.setAttribute('data-my-option', newLabel)

    setTimeout(function () {
      done(element.textContent === newLabel)
      api.destroy()
    }, 200)
  })

  addTest('dataset-change', 'Element should react to setting `element.dataset.myOption`', function (done) {
    var element = setUpButton()
    var api = htmlApi(element, {
      myOption: String
    })

    var newLabel = 'Magic button'
    api.onChange.myOption = function (value) {
      element.textContent = value
    }
    element.dataset.myOption = newLabel

    setTimeout(function () {
      done(element.textContent === newLabel)
      api.destroy()
    }, 200)
  })

  addTest('js-api-change', 'Element should react to setting `api.options.myOption`', function (done) {
    var element = setUpButton()
    var api = htmlApi(element, {
      myOption: String
    })

    var newLabel = 'Magic button'
    api.onChange.myOption = function (value) {
      element.textContent = value
    }
    api.options.myOption = newLabel

    setTimeout(function () {
      api.destroy()
      done(element.textContent === newLabel)
    }, 200)
  })

  addTest('type-check-string-with-numeric', 'Setting a numeric value for type constraint `String` via `api.options.myOption` should fail', function (done) {
    var element = setUpButton()
    var api = htmlApi(element, {
      myOption: String
    })

    var id = timeout(done, api)

    api.on('error', function (err) {
      done(true)
      clearTimeout(id)
      api.destroy()
    })
    api.on('change', function () {
      done(false)
      clearTimeout(id)
      api.destroy()
    })

    api.options.myOption = 5
  })

  addTest('type-check-string-with-null', 'Setting `null` for type constraint `String` via `api.options.myOption` should fail', function (done) {
    var element = setUpButton()
    var api = htmlApi(element, {
      myOption: {
        type: String,
        default: 'value'
      }
    })

    var id = timeout(done, api)

    api.on('error', function (err) {
      done(true)
      clearTimeout(id)
      api.destroy()
    })
    api.on('change', function () {
      done(false)
      clearTimeout(id)
      api.destroy()
    })

    api.options.myOption = null
  })

  addTest('type-check-simple-def-with-null', 'Setting `null` for *simple* option definition (`String`) via `api.options.myOption` should *not* fail', function (done) {
    var element = setUpButton()
    element.dataset.myOption = 'foo'

    var api = htmlApi(element, {
      myOption: String
    })

    var id = timeout(done, api)

    api.on('error', function (err) {
      done(false, err)
      api.destroy()
      clearTimeout(id)
    })
    api.on('change', function () {
      done(true)
      api.destroy()
      clearTimeout(id)
    })

    delete element.dataset.myOption
  })

  addTest('type-check-string-with-remove-attribute', 'Removing the `data-my-option` attribute for `required` type constraint `String` should fail', function (done) {
    var element = setUpButton()
    element.dataset.myOption = 'foo'

    var api = htmlApi(element, {
      myOption: {
        type: String,
        required: true
      }
    })

    var id = timeout(done, api)

    api.on('error', function (err) {
      done(true)
      api.destroy()
      clearTimeout(id)
    })
    api.on('change', function () {
      done(false)
      api.destroy()
      clearTimeout(id)
    })

    element.removeAttribute('data-my-option')
  })

  addTest('type-check-nullable-string-with-remove-attribute', 'Removing the `data-my-option` attribute for `required` type constraint `[ String, null ]` should not fail', function (done) {
    var element = setUpButton()
    element.dataset.myOption = 'foo'

    var api = htmlApi(element, {
      myOption: {
        type: [String, null],
        required: true
      }
    })

    var id = timeout(done, api)

    api.on('error', function (err) {
      done(false, err)
      api.destroy()
      clearTimeout(id)
    })
    api.on('change', function () {
      done(true)
      api.destroy()
      clearTimeout(id)
    })

    element.removeAttribute('data-my-option')
  })

  addTest('type-check-simple-def-with-remove-attribute', 'Removing the `data-my-option` attribute for *simple* option definition (`String`) should *not* fail', function (done) {
    var element = setUpButton()
    element.dataset.myOption = 'foo'

    var api = htmlApi(element, {
      myOption: String
    })

    var id = timeout(done, api)

    api.on('error', function (err) {
      done(false, err)
      api.destroy()
      clearTimeout(id)
    })
    api.on('change', function () {
      done(true)
      api.destroy()
      clearTimeout(id)
    })

    element.removeAttribute('data-my-option')
  })


  addTest('type-check-array-serialization', 'Test the `Array` type constraint serialization', function (done) {
    var element = setUpButton()

    var api = htmlApi(element, {
      myOption: Array
    })

    var value = [ 'a', 'b', 'c' ]
    var expectedSerialization = '["a","b","c"]'

    api.options.myOption = value

    setTimeout(function () {
      done(element.dataset.myOption === expectedSerialization, 'Expected array to serialize as ' + expectedSerialization + ', it did serialize as ' + element.dataset.myOption)
      api.destroy()
    }, 200)
  })


  addTest('type-check-object-serialization', 'Test the `Object` type constraint serialization', function (done) {
    var element = setUpButton()

    var api = htmlApi(element, {
      myOption: Object
    })

    var value = { a: 1, b: { c: 3 } }
    var expectedSerialization = '{"a":1,"b":{"c":3}}'

    api.options.myOption = value

    setTimeout(function () {
      done(element.dataset.myOption === expectedSerialization, 'Expected object to serialize as ' + expectedSerialization + ', it did serialize as ' + element.dataset.myOption)
      api.destroy()
    }, 200)
  })

  addTest('type-check-function-unserialization', 'Test the `Function` type constraint unserialization', function (done) {
    var element = setUpButton()

    var api = htmlApi(element, {
      myOption: Function
    })

    element.setAttribute('data-my-option', 'function (x) { return x * x; }')

    setTimeout(function () {
      if (typeof api.options.myOption === 'function') {
        var squareOf3 = api.options.myOption(3)
        done(squareOf3 === 9, 'Expected unserialized function to square 3 to 9, instead it returned ' + squareOf3)
      } else {
        done(false, 'Function did not unserialize as function')
      }
      api.destroy()
    }, 200)
  })



  var allTypesAllowed = [{
    validate: function (value) {
      return value === 321
    },
    serialize: function (strValue) {
      return 'magic-keyword'
    },
    unserialize: function (strValue) {
      if (strValue === 'magic-keyword') {
        return 321
      } else {
        throw new Error('Cannot unserialize "' + strValue + '"')
      }
    }
  }, null, Boolean, Number, Array, Object, Function, String]

  addTest('type-check-specificity-order-custom', 'Test if unserialization respects defined specificity order for a custom type', function (done) {
    var element = setUpButton()

    var api = htmlApi(element, {
      myOption: allTypesAllowed
    })

    var value = 'magic-keyword'
    var unserializedValue = 321
    element.dataset.myOption = value

    setTimeout(function () {
      done(api.options.myOption === unserializedValue, ['Expected ', unserializedValue, ', got ', api.options.myOption])
      api.destroy()
    }, 200)
  })

  addTest('type-check-specificity-order-null', 'Test if unserialization respects defined specificity order for `null` type', function (done) {
    var element = setUpButton()

    var api = htmlApi(element, {
      myOption: allTypesAllowed
    })

    var value = 'null'
    var unserializedValue = null
    element.dataset.myOption = value

    setTimeout(function () {
      done(api.options.myOption === unserializedValue, ['Expected ', unserializedValue, ', got ', api.options.myOption])
      api.destroy()
    }, 200)
  })

  addTest('type-check-specificity-order-boolean', 'Test if unserialization respects defined specificity order for `Boolean` type', function (done) {
    var element = setUpButton()

    var api = htmlApi(element, {
      myOption: allTypesAllowed
    })

    var value = 'false'
    var unserializedValue = false
    element.dataset.myOption = value

    setTimeout(function () {
      done(api.options.myOption === unserializedValue, ['Expected ', unserializedValue, ', got ', api.options.myOption])
      api.destroy()
    }, 200)
  })

  addTest('type-check-specificity-order-number', 'Test if unserialization respects defined specificity order for `Number` type', function (done) {
    var element = setUpButton()

    var api = htmlApi(element, {
      myOption: allTypesAllowed
    })

    var value = '10'
    var unserializedValue = 10
    element.dataset.myOption = value

    setTimeout(function () {
      done(api.options.myOption === unserializedValue, ['Expected ', unserializedValue, ', got ', api.options.myOption])
      api.destroy()
    }, 200)
  })

  addTest('type-check-specificity-order-array', 'Test if unserialization respects defined specificity order for `Array` type', function (done) {
    var element = setUpButton()

    var api = htmlApi(element, {
      myOption: allTypesAllowed
    })

    var value = '[1,2,3]'
    var unserializedValue = [1, 2, 3]
    element.dataset.myOption = value

    setTimeout(function () {
      if (!Array.isArray(api.options.myOption)) {
        done(false, ['Expected array, got', api.options.myOption])
      } else {
        done(JSON.stringify(api.options.myOption) === JSON.stringify(unserializedValue), ['Expected ', unserializedValue, ', got ', api.options.myOption])
      }
      api.destroy()
    }, 200)
  })

  addTest('type-check-specificity-order-object', 'Test if unserialization respects defined specificity order for `Object` type', function (done) {
    var element = setUpButton()

    var api = htmlApi(element, {
      myOption: allTypesAllowed
    })

    var value = '{"a":true}'
    var unserializedValue = { a: true }
    element.dataset.myOption = value

    setTimeout(function () {
      if (typeof api.options.myOption !== 'object') {
        done(false, ['Expected object, got', api.options.myOption])
      } else {
        done(JSON.stringify(api.options.myOption) === JSON.stringify(unserializedValue), ['Expected ', unserializedValue, ', got ', api.options.myOption])
      }
      api.destroy()
    }, 200)
  })

  addTest('type-check-specificity-order-function', 'Test if unserialization respects defined specificity order for `Function` type', function (done) {
    var element = setUpButton()

    var api = htmlApi(element, {
      myOption: allTypesAllowed
    })

    var value = 'function (x) { return x * x }'
    var actualSquareOf3 = 9
    element.dataset.myOption = value

    setTimeout(function () {
      if (typeof api.options.myOption !== 'function') {
        done(false, ['Expected function, got', api.options.myOption])
      } else {
        var squareOf3 = api.options.myOption(3)
        done(squareOf3 === actualSquareOf3, ['Expected function result (square of 3) to be ', actualSquareOf3, ', got ', squareOf3])
      }
      api.destroy()
    }, 200)
  })

  addTest('type-check-specificity-order-string', 'Test if unserialization respects defined specificity order for `String` type', function (done) {
    var element = setUpButton()

    var api = htmlApi(element, {
      myOption: allTypesAllowed
    })

    var value = 'none of the above'
    var unserializedValue = value
    element.dataset.myOption = value

    setTimeout(function () {
      done(api.options.myOption === unserializedValue, ['Expected ', unserializedValue, ', got ', api.options.myOption])
      api.destroy()
    }, 200)
  })

  invokeTest (0)
})
