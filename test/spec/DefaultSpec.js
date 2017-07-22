/**
 * Tests the `default` property of an option definition
 */

describe('An option using `default`', function () {
  var api, elementApi
  beforeEach(function () {
    window.testArea.innerHTML =
      '<button id="testBtn" class="test-btn">Button</button>'
    api = htmlApi({
      myOption: {
        type: String,
        default: 'default-value'
      }
    })(window.testBtn)
    elementApi = api.for(window.testBtn)
  })

  it('should not accept a `default` definition violating the type constraint', function () {
    expect(function () {
      htmlApi({
        myOption: {
          type: String,
          default: 5
        }
      })
    })
    .toThrow()
  })

  it('should initially contain the default value if not set explicitely', function () {
    expect(elementApi.options.myOption).toBe('default-value')
  })

  it('should initially not contain the default value if attribute is set explicitely', function () {
    api.destroy()
    window.testBtn.dataset.myOption = 'explicit-value'

    api = htmlApi({
      myOption: {
        type: String,
        default: 'default-value'
      }
    })(window.testBtn)
    elementApi = api.for(window.testBtn)

    expect(elementApi.options.myOption).toBe('explicit-value')
  })

  it('should initially not have a `data-my-option` attribute', function () {
    expect(window.testBtn.hasAttribute('data-my-option')).toBeFalsy()
  })

  it('should return to the default value after removing the `data-my-option` attribute', function () {
    api.destroy()
    window.testBtn.dataset.myOption = 'explicit-value'

    api = htmlApi({
      myOption: {
        type: String,
        default: 'default-value'
      }
    })(window.testBtn)
    elementApi = api.for(window.testBtn)

    expectNothing()

    elementApi.once('change', function (evt) {
      expect(elementApi.options.myOption).toBe('default-value')
      done()
    })
    elementApi.once('error', function (err) {
      done.fail('Could not remove the `data-my-option` attribute')
    })

    setTimeout(function () {
      delete window.testBtn.dataset.myOption
    }, 0)
  })

  it('should return to the default value after setting `options.myOption` to `undefined`', function () {
    api.destroy()
    window.testBtn.dataset.myOption = 'explicit-value'

    api = htmlApi({
      myOption: {
        type: String,
        default: 'default-value'
      }
    })(window.testBtn)
    elementApi = api.for(window.testBtn)

    expectNothing()

    elementApi.once('change', function (evt) {
      expect(elementApi.options.myOption).toBe('default-value')
      done()
    })
    elementApi.once('error', function (err) {
      done.fail('Could not set `option.myOption` to `undefined`')
    })

    setTimeout(function () {
      elementApi.options.myOption = undefined
    }, 0)
  })

  afterEach(function () {
    api.destroy()
  })
})
