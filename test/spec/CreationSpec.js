/**
 * Tests the creation of an API from a plain configuration object
 */

describe('Creating an API', function () {
  describe('from a configuration object', function () {
    it('should fail if type constraint is just `null` or `[null]`', function () {
      expect(function() {
        htmlApi({
          label: [null]
        })
      })
      .toThrow()

      expect(function() {
        htmlApi({
          label: null
        })
      })
      .toThrow()

      expect(function() {
        htmlApi({
          label: { type: [null] }
        })
      })
      .toThrow()
    })

    it('should fail if both `required` and `default` are set', function () {
      expect(function() {
        htmlApi({
          label: {
            type: String,
            required: true,
            default: 'value'
          }
        })
      })
      .toThrow()
    })

    it('should fail if an invalid type constraint is set', function () {
      // Single type
      expect(function() {
        htmlApi({
          label: {
            type: 'foo'
          }
        })
      })
      .toThrow()

      // Union type
      expect(function() {
        htmlApi({
          label: {
            type: [String, 'foo']
          }
        })
      })
      .toThrow()
    })

    it('should pass with union type constraint containing `null` and none of `required` or `default` set', function () {
      expect(function() {
        htmlApi({
          label: {
            type: [String, null]
          }
        })
      })
      .toBeFunction()
    })
  })

  describe('assigning elements directly', function () {
    var allButtons, api
    beforeAll(function () {
      window.testArea.innerHTML =
        '<button id="initialBtn1" class="test-btn">Initial 1</button> ' +
        '<button id="initialBtn2" class="test-btn">Initial 2</button> ' +
        '<button id="initialBtn3" class="test-btn">Initial 3</button>'

      allButtons = [ window.initialBtn1, window.initialBtn2, window.initialBtn3 ]

      api = htmlApi({})
    })

    it('should accept single elements', function () {
      expect(api(window.initialBtn1).elements).toEqual([ window.initialBtn1 ])
    })

    it('should accept arrays of elements', function () {
      expect(api(allButtons).elements).toEqual(allButtons)
    })

    it('should fail for arrays containing not only Elements', function () {
      expect(function () {
        api([
          window.initialBtn1,
          null,
          window.initialBtn3
        ])
      })
      .toThrow()
    })

    it('should accept NodeLists of elements', function () {
      expect(api(document.querySelectorAll('.test-btn')).elements).toEqual(allButtons)
    })

    it('should accept HTMLCollections of elements', function () {
      expect(api(window.testArea.children).elements).toEqual(allButtons)
    })

    it('should fail for NodeLists containing not only Elements', function () {
      expect(function () {
        api(window.testArea.childNodes)
      })
      .toThrow()
    })

    it('should fail if anything else is passed', function () {
      expect(function () { api(null) }).toThrow()
      expect(function () { api(5) }).toThrow()
      expect(function () { api(true) }).toThrow()
      expect(function () { api(function () {}) }).toThrow()
    })
  })

  describe('assigning elements via selectors', function () {
    var initialButtons, api
    beforeEach(function () {
      window.testArea.innerHTML = '<button id="initialBtn" class="test-btn">Initial 1</button>'

      initialButtons = [ window.initialBtn ]

      api = htmlApi({})('.test-btn')
    })

    afterEach(function () {
      api.destroy()
    })

    it('should instantly find existing elements', function () {
      expect(api.elements).toEqual(initialButtons)
    })

    it('should provide an element-level API', function () {
      expect(api.for(initialButtons[0])).toBeElementApi()
    })

    it('should find added elements', function (done) {
      var addedBtn = document.createElement('button')
      addedBtn.className = 'test-btn'
      addedBtn.id = 'addedBtn'
      window.testArea.appendChild(addedBtn)

      setTimeout(function () {
        expect(api.elements).toEqual(initialButtons.concat(window.addedBtn))

        done()
      }, 0)
    })

    it('should trigger the `newElement` event for each initially existing element', function (done) {
      api.on('newElement', function(event) {
        expect(initialButtons).toContain(event.element)
        expect(event.elementApi).toEqual(api.for(event.element))
        done()
      })
    })

    it('should trigger the `newElement` event with correct payload when adding elements', function (done) {
      var addedBtn = document.createElement('button')
      addedBtn.className = 'test-btn'
      addedBtn.id = 'addedBtn'
      window.testArea.appendChild(addedBtn)

      api.on('newElement', function(event) {
        expect(event.element).toEqual(addedBtn)
        expect(event.elementApi).toEqual(api.for(addedBtn))
        done()
      })
    })

    it('should not contain removed elements', function (done) {
      window.testArea.innerHTML = ''

      setTimeout(function () {
        expect(api.elements).toEqual([])

        done()
      }, 0)
    })

    it('should find removed and then re-added elements', function (done) {
      var btn = window.initialBtn
      window.testArea.innerHTML = ''

      setTimeout(function () {
        // Let the MutationObserver remove sink in
        window.testArea.appendChild(btn)

        setTimeout(function () {
          expect(api.elements).toEqual(initialButtons)

          done()
        }, 0)
      }, 0)
    })
  })
})
