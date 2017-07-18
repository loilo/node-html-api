# HTML API

This package helps you creating a nice and clean [dataset](https://developer.mozilla.org/docs/Web/API/HTMLElement/dataset)-based options API.

It preserves the convenience of a JavaScript-based options interface while removing the hurdle of adding server-generated configuration `<script>` blocks to your markup.

This package features

* a hybrid API interface, allowing to change options programmatically as well as by changing `data-*` attributes
* automatic syncing between those configuration locations via a [MutationObserver](https://developer.mozilla.org/de/docs/Web/API/MutationObserver)
* an event emitter, notifying about option changes
* decent presets and extensibility for type checking and casting

## Installation

Install it from npm:

```bash
npm install --save html-api
```

## Include in Node.js

To make this package part of your build chain, you can `require` it in Node:

```javascript
const htmlApi = require('html-api/dist/cjs')
```

If you need this to work in Node.js v4 or below, try this instead:

```javascript
var htmlApi = require('html-api/dist/cjs.es5')
```

Note however that the package won't work when run directly in Node since it does rely on browser features like the DOM and the `MutationObserver` (for which at the time of writing no Node polyfill is available).

## Include in the browser

You can use this package in your browser with one of the following snippets:

* The most common version. Compiled to ES5, runs in all major browsers down to IE 11:

  ```html
  <script src="node_modules/dist/browser.min.js"></script>
  ```

* Not transpiled to ES5, runs in browsers that support ES2015:

  ```html
  <script src="node_modules/dist/browser.es2015.min.js"></script>
  ```

* If you're really living on the bleeding edge and use ES modules directly in the browser, you can `import` the package as well:

  ```javascript
  import htmlApi from "./node_modules/dist/browser.module.min.js"
  ```

  As opposed to the snippets above, this will not create a global `htmlApi` function.

## Usage

Once you have somehow obtained the `htmlApi` function, you can use it to define an HTML API.

> For the following examples, let's assume the markup of our page has a `<button data-label="I'm a button"></button>` we have assigned to the `btn` variable.

The simplest possible example

```javascript
// This defines an HTML API with only a `label` option which must be a string (or `null` if not set)
const api = htmlApi(btn, {
  label: String
})

// Sets the button's inner text to the `label` option which is read from the `data-label` attribute
btn.textContent = api.options.label

// Attaches a listener to the `label` option
api.onChange.label = value => {
  btn.textContent = value
}
```

* If now in any way the `btn`'s `data-label` attribute is changed to `"I'm a magic button"`, the change listener will trigger and the button label will update accordingly.

* This also goes the other way around: The option may be set via `api.options.label = "I'm a magic button"`. This will trigger the listener change as well and adjust the `data-label` attribute.

To get a grasp of how to do better type restrictions, conversions and much more, see the [Advanced Typing](#advanced-typing) section.

### React to changes

As in the first example, you can assign listeners to the `api.onChange[optionName]` property:

```javascript
api.onChange.myOption = (value, oldValue) => {
  ...
}
```

As a side note: The above is just syntactic sugar for the more generic event system:

```javascript
api.on('change', (event) => {
  // available properties: event.option, event.value, event.oldValue
})
```

### Error handling

The `api` object also emits `error` events which will be triggered when an option is set to a value not matching its type constraints:

```javascript
api.on('error', err => {
  // Handle the error or just do:
  console.error(err)
})
```

### Advanced Typing

> **Note:** Type definitions below are written in TypeScript, however they should be pretty understandable for any JavaScript developer.

To get the bigger picture of what's possible with the `htmlApi` function, here's its signature:

```typescript
htmlApi(el: Element, opts: TypeConstraint|OptionsDefinition): Api
```

where

* `Element` is `window.Element`, which is a DOM-builtin constructor

* `TypeConstraint` is either
  * the `Boolean` constructor, allowing boolean values or
  * the `Number` constructor, allowing numeric values or
  * the `String` constructor, allowing strings or
  * the `Array` constructor, allowing arrays or
  * the `Object` constructor, allowing plain objects or
  * the `Function` constructor allowing functions or
  * `null` making it nullable or
  * a type `Definition`, a plain object of the following structure:

    ```typescript
    interface Definition<Type> {
      // Checks if a value belongs to the defined type
      validate (value: any): value is Type

      // Converts a value of the defined Type into a string
      serialize (value: Type): string

      // The inverse of `serialize`: Converts a string back to the defined Type
      // If the string does not belong to the Type, this method should throw an Error
      unserialize (serializedValue: string): Type
    }
    ```
    This means you can easily define and provide your own custom types!

    or
  * a union type, being a non-empty array of any of the above

* `OptionsDefinition` is a plain object matching the following interface:

  ```typescript
  interface OptionsDefinition {
    // A type constraint as defined above
    type?: TypeConstraint,

    // If the data-* attribute belonging to this option must be set
    // If not set or set to `false`, the `default` option is required
    required?: boolean,

    // A default value, applying when the according data-* attribute is not set
    // If set, the option must not be `required`
    // Mandatory if option is not `required` and the `type` is not an array including `null`
    default?: any
  }
  ```

Some hints about using the above:

* If the `opts` argument is a `TypeConstraint` (without any additional details), it will always be nullable.
* Be careful when using Union types, especially with `String`.

  If you define an option like the following:

  ```javascript
  myOption: {
    type: [Number, String],
    required: true
  }
  ```

  then any numeric value, being a string or not (like in `api.options.myOption = "5"`) will be evaluated as a number since there's no way for the API to recognize what type there was before serialization.

  This should mostly be a non-issue, but is definitely to be told.
