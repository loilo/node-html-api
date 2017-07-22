/*
 * Mitt
 * A nicely compact event emitter, adjusted for our needs
 * @see https://www.npmjs.com/package/mitt
 */
export default function mitt (all, once) {
  all = all || Object.create(null)
  once = once || Object.create(null)

  return {
    /**
     * Register an event handler for the given type.
     *
     * @param  {String} type  Type of event to listen for, or `"*"` for all events
     * @param  {Function} handler Function to call in response to given event
     * @memberOf mitt
     */
    on (type, handler, skip = 0) {
      if (skip === 0) {
        (all[type] || (all[type] = [])).push(handler)
      } else {
        var self = this
        this.once(type, function () {
          self.on(type, handler)
        }, skip - 1)
      }
    },

    /**
     * Register an event handler for the given type for one execution.
     *
     * @param  {String} type  Type of event to listen for, or `"*"` for all events
     * @param  {Function} handler Function to call in response to given event
     * @memberOf mitt
     */
    once (type, handler, skip = 0) {
      if (skip === 0) {
        (once[type] || (once[type] = [])).push(handler)
      } else {
        var self = this
        ;(once[type] || (once[type] = [])).push(function () {
          self.once(type, handler, skip - 1)
        })
      }
    },

    /**
     * Remove an event handler for the given type.
     *
     * @param  {String} type  Type of event to unregister `handler` from, or `"*"`
     * @param  {Function} handler Handler function to remove
     * @memberOf mitt
     */
    off (type, handler) {
      if (all[type]) {
        all[type].splice(all[type].indexOf(handler) >>> 0, 1)
      }
      if (once[type]) {
        once[type].splice(once[type].indexOf(handler) >>> 0, 1)
      }
    },

    /**
     * Invoke all handlers for the given type.
     * If present, `"*"` handlers are invoked after type-matched handlers.
     *
     * @param {String} type  The event type to invoke
     * @param {Any} [evt]  Any value (object is recommended and powerful), passed to each handler
     * @memberof mitt
     */
    emit (type, evt) {
      ;(all[type] || []).map(function (handler) { handler(evt) })
      ;(all['*'] || []).map(function (handler) { handler(type, evt) })
      ;(once[type] || []).map(function (handler) { handler(evt) })
      ;(once['*'] || []).map(function (handler) { handler(type, evt) })
    },

    /**
     * Clear the emitter by removing all handlers
     *
     * @memberof mitt
     */
    clear () {
      all = {}
      once = {}
    },

    get _listeners () {
      return all
    }
  }
}
