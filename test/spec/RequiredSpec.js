/**
 * Tests the `required` property of an option definition
 */

describe('Using `required: true`', function () {
  describe('with type constraint `String`', function () {
    var apiCreator
    beforeEach(function () {
      window.testArea.innerHTML =
        '<button id="testBtn" class="test-btn" data-my-option>Button</button>'
      apiCreator = htmlApi({
        myOption: {
          type: String,
          required: true
        }
      })
    })

    it('should have no value and emit an `error` for an initially missing `data-my-option` attribute', function (done) {
      delete window.testBtn.dataset.myOption
      var api = apiCreator(window.testBtn)

      expect(api.for(window.testBtn).options.myOption).toBeUndefined()

      api.once('error', function () {
        expectNothing()
        api.destroy()
        clearTimeout(id)
        done()
      })

      var id = setTimeout(function () {
        api.destroy()
        done.fail()
      }, 50)
    })

    it('should not allow removing an existing `data-my-option` attribute', function (done) {
      var api = apiCreator(window.testBtn)

      setTimeout(function () {
        delete window.testBtn.dataset.myOption
      }, 0)

      api.on('change', function (event) {
        if (event.initial) return
        expectNothing()
        api.destroy()
        done.fail('Attribute removal of `data-my-option` was falsely accepted')
      })
      api.once('error', function (err) {
        expect(err.type).toBe('invalid-value-html')
        api.destroy()
        done()
      })
    })

    it('should not allow setting `options.myOption` to `null`', function (done) {
      var api = apiCreator(window.testBtn)

      setTimeout(function () {
        api.for(window.testBtn).options.myOption = null
      }, 0)

      api.on('change', function (event) {
        if (event.initial) return
        expectNothing()
        api.destroy()
        done.fail('Setting to `null` was falsely accepted')
      })
      api.once('error', function (err) {
        expect(err.type).toBe('invalid-value-js')
        api.destroy()
        done()
      })
    })
  })

  describe('with type constraint `[String, null]`', function () {
    var apiCreator
    beforeEach(function () {
      window.testArea.innerHTML =
        '<button id="testBtn" class="test-btn" data-my-option>Button</button>'
      apiCreator = htmlApi({
        myOption: {
          type: [String, null],
          required: true
        }
      })
    })

    it('should have no value and emit an `error` for an initially missing `data-my-option` attribute', function (done) {
      delete window.testBtn.dataset.myOption
      var api = apiCreator(window.testBtn)

      expect(api.for(window.testBtn).options.myOption).toBeUndefined()

      api.once('error', function () {
        expectNothing()
        api.destroy()
        clearTimeout(id)
        done()
      })

      var id = setTimeout(function () {
        api.destroy()
        done.fail()
      }, 50)
    })

    it('should not allow removing an existing `data-my-option` attribute', function (done) {
      var api = apiCreator(window.testBtn)

      setTimeout(function () {
        delete window.testBtn.dataset.myOption
      }, 0)

      api.on('change', function (event) {
        if (event.initial) return
        expectNothing()
        api.destroy()
        done.fail('Attribute removal of `data-my-option` was falsely accepted')
      })

      api.once('error', function (err) {
        expect(err.type).toBe('invalid-value-html')
        api.destroy()
        done()
      })
    })

    it('should allow setting `options.myOption` to `null`', function (done) {
      var api = apiCreator(window.testBtn)

      setTimeout(function () {
        api.for(window.testBtn).options.myOption = null
      }, 0)

      expectNothing()

      api.on('change', function (event) {
        if (event.initial) return
        api.destroy()
        done()
      })

      api.once('error', function (err) {
        api.destroy()
        done.fail('Setting to `null` failed')
      })
    })
  })
})
