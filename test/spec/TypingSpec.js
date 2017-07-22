/**
 * Tests application and (de)serialization of type constraints
 */

var magicCustomType = {
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
}

var allTypes = [magicCustomType, null, Boolean, Number, Array, Object, Function, String]

describe('Using type constraint', function () {
  var api, elementApi
  beforeEach(function () {
    window.testArea.innerHTML =
      '<button id="testBtn" class="test-btn">Button</button>'
  })

  afterEach(function () {
    api.destroy()
  })

  describe('Boolean', function () {
    var host = {}
    beforeEach(function () {
      api = htmlApi({
        myOption: Boolean
      })(window.testBtn)

      elementApi = api.for(window.testBtn)
      host.elementApi = elementApi
    })

    it('should initially be `null`', function () {
      expect(elementApi.options.myOption).toBeNull()
    })

    acceptOptions(host, ['booleans'])
    dontAcceptOptions(host, ['numbers', 'arrays', 'objects', 'functions', 'strings'])
    serializeOption(host, {
      '': true
    })
  })

  describe('Number', function () {
    var host = {}
    beforeEach(function () {
      api = htmlApi({
        myOption: Number
      })(window.testBtn)

      elementApi = api.for(window.testBtn)
      host.elementApi = elementApi
    })

    it('should initially be `null`', function () {
      expect(elementApi.options.myOption).toBeNull()
    })

    acceptOptions(host, ['numbers'])
    dontAcceptOptions(host, ['booleans', 'arrays', 'objects', 'functions', 'strings', NaN])
    serializeOption(host, {
      '5': 5,
      '-Infinity': -Infinity,
    })
  })

  describe('Array', function () {
    var host = {}
    beforeEach(function () {
      api = htmlApi({
        myOption: Array
      })(window.testBtn)

      elementApi = api.for(window.testBtn)
      host.elementApi = elementApi
    })

    it('should initially be `null`', function () {
      expect(elementApi.options.myOption).toBeNull()
    })

    acceptOptions(host, ['arrays'])
    dontAcceptOptions(host, ['booleans', 'numbers', 'objects', 'functions', 'strings'])
    serializeOption(host, {
      '[1,2,3]': [1, 2, 3]
    })
  })

  describe('Object', function () {
    var host = {}
    beforeEach(function () {
      api = htmlApi({
        myOption: Object
      })(window.testBtn)

      elementApi = api.for(window.testBtn)
      host.elementApi = elementApi
    })

    it('should initially be `null`', function () {
      expect(elementApi.options.myOption).toBeNull()
    })

    acceptOptions(host, ['objects'])
    dontAcceptOptions(host, ['booleans', 'numbers', 'arrays', 'functions', 'strings'])
    serializeOption(host, {
      '{"a":1}': { 'a': 1 }
    })
  })

  describe('Function', function () {
    var host = {}
    beforeEach(function () {
      api = htmlApi({
        myOption: Function
      })(window.testBtn)

      elementApi = api.for(window.testBtn)
      host.elementApi = elementApi
    })

    it('should initially be `null`', function () {
      expect(elementApi.options.myOption).toBeNull()
    })

    acceptOptions(host, ['functions'])
    dontAcceptOptions(host, ['booleans', 'numbers', 'arrays', 'objects', 'strings'])

    it('should have an unserialized function work correctly', function () {
      setTimeout(function () {
        window.testBtn.dataset.myOption = 'function (x) { return x * x }'
      }, 0)

      expectNothing()

      elementApi.on('change', function (evt) {
        if (evt.initial) return
        expect(elementApi.options.myOption(3)).toBe(9)
        done()
      })
      elementApi.once('error', function (err) {
        done.fail('Could not set `myOption` to ' + stringify(value))
      })
    })
  })

  describe('String', function () {
    var host = {}
    beforeEach(function () {
      api = htmlApi({
        myOption: String
      })(window.testBtn)

      elementApi = api.for(window.testBtn)
      host.elementApi = elementApi
    })

    it('should initially be `null`', function () {
      expect(elementApi.options.myOption).toBeNull()
    })

    acceptOptions(host, ['strings'])
    dontAcceptOptions(host, ['booleans', 'numbers', 'arrays', 'objects', 'functions'])
    serializeOption(host, {
      'identity': 'identity'
    })
  })

  describe('Enum("one", "two", "three")', function () {
    var host = {}
    beforeEach(function () {
      api = htmlApi({
        myOption: htmlApi.Enum('one', 'two', 'three')
      })(window.testBtn)

      elementApi = api.for(window.testBtn)
      host.elementApi = elementApi
    })

    it('should initially be `null`', function () {
      expect(elementApi.options.myOption).toBeNull()
    })

    acceptOptions(host, [ 'one', 'two', 'three' ])
    dontAcceptOptions(host, [ 'four', true, 5, [] ])
    serializeOption(host, {
      'one': 'one'
    })
  })

  describe('Integer', function () {
    var host = {}
    beforeEach(function () {
      api = htmlApi({
        myOption: htmlApi.Integer
      })(window.testBtn)

      elementApi = api.for(window.testBtn)
      host.elementApi = elementApi
    })

    it('should initially be `null`', function () {
      expect(elementApi.options.myOption).toBeNull()
    })

    acceptOptions(host, [ 42, -1, 0 ])
    dontAcceptOptions(host, [ 1.337, Infinity, NaN, false, '5', {} ])
    serializeOption(host, {
      '0': 0,
      '-10': -10
    })
  })

  describe('Integer.min(5)', function () {
    var host = {}
    beforeEach(function () {
      api = htmlApi({
        myOption: htmlApi.Integer.min(5)
      })(window.testBtn)

      elementApi = api.for(window.testBtn)
      host.elementApi = elementApi
    })

    acceptOptions(host, [ 5, 1337 ])
    dontAcceptOptions(host, [ 4, 0 ])
  })

  describe('Integer.max(5)', function () {
    var host = {}
    beforeEach(function () {
      api = htmlApi({
        myOption: htmlApi.Integer.max(5)
      })(window.testBtn)

      elementApi = api.for(window.testBtn)
      host.elementApi = elementApi
    })

    acceptOptions(host, [ 5, -10 ])
    dontAcceptOptions(host, [ 6, 20 ])
  })

  describe('Integer.min(5).max(10)', function () {
    var host = {}
    beforeEach(function () {
      api = htmlApi({
        myOption: htmlApi.Integer.min(5).max(10)
      })(window.testBtn)

      elementApi = api.for(window.testBtn)
      host.elementApi = elementApi
    })

    acceptOptions(host, [ 5, 8 ])
    dontAcceptOptions(host, [ 0, 1337 ])
  })

  describe('Float', function () {
    var host = {}
    beforeEach(function () {
      api = htmlApi({
        myOption: htmlApi.Float
      })(window.testBtn)

      elementApi = api.for(window.testBtn)
      host.elementApi = elementApi
    })

    it('should initially be `null`', function () {
      expect(elementApi.options.myOption).toBeNull()
    })

    acceptOptions(host, [ 1, Math.PI ])
    dontAcceptOptions(host, [ Infinity, NaN, false, '5', {} ])
    serializeOption(host, {
      '5.5': 5.5,
      '1': 1
    })
  })

  describe('Custom', function () {
    var host = {}
    beforeEach(function () {
      api = htmlApi({
        myOption: magicCustomType
      })(window.testBtn)

      elementApi = api.for(window.testBtn)
      host.elementApi = elementApi
    })

    it('should initially be `null`', function () {
      expect(elementApi.options.myOption).toBeNull()
    })

    acceptOptions(host, [ 321 ])
    dontAcceptOptions(host, [ 0, false, '5', {} ])
    serializeOption(host, {
      'magic-keyword': 321
    })
  })

  describe('Union', function () {
    describe('[Array, Object]', function () {
      var host = {}
      beforeEach(function () {
        api = htmlApi({
          myOption: [Array, Object]
        })(window.testBtn)

        elementApi = api.for(window.testBtn)
        host.elementApi = elementApi
      })

      it('should initially be `null`', function () {
        expect(elementApi.options.myOption).toBeNull()
      })

      acceptOptions(host, ['arrays', 'objects'])
      dontAcceptOptions(host, ['booleans', 'numbers', 'functions', 'strings'])
    })

    describe('[String, Number]', function () {
      var host = {}
      beforeEach(function () {
        api = htmlApi({
          myOption: [String, Number]
        })(window.testBtn)

        elementApi = api.for(window.testBtn)
        host.elementApi = elementApi
      })

      it('should initially be `null`', function () {
        expect(elementApi.options.myOption).toBeNull()
      })

      serializeOption(host, {
        'string': 'string',
      })
      serializeOption(host, {
        '5.5': "5.5",
        '10': 10
      }, 'serialize')
      serializeOption(host, {
        '5.5': 5.5,
      }, 'unserialize')
    })

    describe('Specificity', function () {
      var specificityPairing = {
        null: ['null', null],
        booleans: ['false', false],
        arrays: ['[1,2,3]', [1, 2, 3]],
        objects: ['{"a":1,"b":2,"c":3}', { a: 1, b: 2, c: 3 }],
        strings: ['string', 'string'],
        numbers: ['5', 5]
      }

      beforeEach(function () {
        api = htmlApi({
          myOption: allTypes
        })(window.testBtn)

        elementApi = api.for(window.testBtn)
      })

      Object.keys(specificityPairing).forEach(function (what) {
        var serialized = specificityPairing[what][0]
        var unserialized = specificityPairing[what][1]

        it('should be preserved for ' + what, function (done) {
          setTimeout(function () {
            window.testBtn.dataset.myOption = serialized
          }, 0)

          expectNothing()

          elementApi.on('change', function (evt) {
            if (evt.initial) return
            expect(elementApi.options.myOption).toEqual(unserialized)
            done()
          })
          elementApi.once('error', function (err) {
            done.fail('Could not set `data-my-option` to ' + stringify(serialized))
          })
        })
      })

      it('should be preserved for functions', function (done) {
        var serialized = 'function (x) { return x * x }'

        setTimeout(function () {
          window.testBtn.dataset.myOption = serialized
        }, 0)

        expectNothing()

        elementApi.on('change', function (evt) {
          if (evt.initial) return
          expect(elementApi.options.myOption).toBeFunction()
          expect(elementApi.options.myOption(3)).toBe(9)
          done()
        })
        elementApi.once('error', function (err) {
          done.fail('Could not set `data-my-option` to ' + stringify(serialized))
        })
      })
    })
  })
})
