/**
 * Tests basic getting & setting of option values via options or dataset
 */

describe('Using the API interface with config `{ myOption: String }` applied to <button>Label</button>', function () {
  var api, elementApi
  beforeEach(function () {
    window.testArea.innerHTML =
      '<button id="testBtn" class="test-btn">Button</button>'

    api = htmlApi({
      myOption: String
    })(window.testBtn)

    elementApi = api.for(window.testBtn)
  })

  afterEach(function () {
    api.destroy()
  })


  it('should initially have value `null`', function () {
    expect(api.for(window.testBtn).options.myOption).toBeNull()
  })

  it('should initially not have a `data-my-option` attribute', function () {
    expect(window.testBtn.hasAttribute('data-my-option')).toBeFalsy()
  })

  it('should initially trigger `change` with appropriate payload on the API', function (done) {
    api.on('change', function (event) {
      expect(event.element).toBe(window.testBtn)
      expect(event.option).toBe('myOption')
      expect(event.value).toBe(null)
      expect(event.oldValue).toBe(null)
      expect(event.initial).toBeTruthy()
      done()
    })
  })

  it('should not trigger initial `change` if attributes were changed instantly', function (done) {
    api.on('change', function (event) {
      expect(event.initial).toBeFalsy()
      if (event.initial) {
        done()
      }
    })

    var timeoutDone = setTimeout(function () {
      done()
    }, 10)

    window.testBtn.dataset.myOption = 'foo'
  })


  describe('adding the `data-my-option` attribute with value "foo"', function () {
    beforeEach(function () {
      setTimeout(function () {
        window.testBtn.dataset.myOption = 'foo'
      }, 0)
    })

    it('should trigger `change` with appropriate payload on the API', function (done) {
      api.on('change', function (event) {
        if (event.initial) return
        expect(event.element).toBe(window.testBtn)
        expect(event.option).toBe('myOption')
        expect(event.value).toBe('foo')
        expect(event.oldValue).toBe(null)
        done()
      })
    })

    it('should trigger `change` with appropriate payload on the element-based API', function (done) {
      api.on('change', function (event) {
        if (event.initial) return
        expect(event.option).toBe('myOption')
        expect(event.value).toBe('foo')
        expect(event.oldValue).toBe(null)
        done()
      })
    })

    it('should set `elementApi.options.myOption` to `foo`', function (done) {
      api.on('change', function (event) {
        if (event.initial) return
        expect(elementApi.options.myOption).toBe('foo')
        done()
      })
    })
  })

  describe('removing the `data-my-option` attribute', function () {
    beforeEach(function () {
      window.testBtn.dataset.myOption = 'foo'

      setTimeout(function () {
        delete window.testBtn.dataset.myOption
      }, 0)
    })

    it('should trigger `change` with appropriate payload on the API', function (done) {
      api.on('change', function (event) {
        if (event.initial) return
        expect(event.element).toBe(window.testBtn)
        expect(event.option).toBe('myOption')
        expect(event.value).toBe(null)
        expect(event.oldValue).toBe('foo')
        done()
      }, 1)
    })

    it('should trigger `change` with appropriate payload on the element-based API', function (done) {
      api.on('change', function (event) {
        if (event.initial) return
        expect(event.option).toBe('myOption')
        expect(event.value).toBe(null)
        expect(event.oldValue).toBe('foo')
        done()
      }, 1)
    })

    it('should set `elementApi.options.myOption` to `null`', function (done) {
      api.on('change', function (event) {
        if (event.initial) return
        expect(elementApi.options.myOption).toBeNull()
        done()
      }, 1)
    })
  })

  describe('setting the `elementApi.options.myOption` property to "foo"', function () {
    beforeEach(function () {
      setTimeout(function () {
        elementApi.options.myOption = 'foo'
      }, 0)
    })

    it('should trigger `change` with appropriate payload on the API', function (done) {
      api.on('change', function (event) {
        if (event.initial) return
        expect(event.element).toBe(window.testBtn)
        expect(event.option).toBe('myOption')
        expect(event.value).toBe('foo')
        expect(event.oldValue).toBe(null)
        done()
      })
    })

    it('should trigger `change` with appropriate payload on the element-based API', function (done) {
      api.on('change', function (event) {
        if (event.initial) return
        expect(event.option).toBe('myOption')
        expect(event.value).toBe('foo')
        expect(event.oldValue).toBe(null)
        done()
      })
    })

    it('should set `elementApi.options.myOption` to `foo`', function (done) {
      api.on('change', function (event) {
        if (event.initial) return
        expect(elementApi.options.myOption).toBe('foo')
        done()
      })
    })
  })
})
