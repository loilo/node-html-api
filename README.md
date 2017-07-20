# HTML API

> This package is still under very early development, and thus the API is subject to change.
> Be careful if you use it.

This package helps you creating a nice and clean [dataset](https://developer.mozilla.org/docs/Web/API/HTMLElement/dataset)-based options [HTML API](https://www.smashingmagazine.com/2017/02/designing-html-apis/).

It preserves the convenience of a JavaScript-based options interface while removing the hurdle of adding server-generated configuration `<script>` blocks to your markup.

This package features

* a hybrid API interface, allowing to change option values programmatically as well as by changing `data-*` attributes
* automatic syncing between those endpoints via a [MutationObserver](https://developer.mozilla.org/de/docs/Web/API/MutationObserver)
* an event emitter, notifying about option changes
* decent presets and extensibility for type checking and casting
* support for all modern browsers down to IE 11
* reasonable size: it's just 2.7 KB minified & gzipped

---

<details>
<summary><strong>Table of Contents</strong></summary>

* [Motivation](#motivation)
* [Installation](#installation)
  * [Include in Node.js](#include-in-nodejs)
  * [Include in the browser](#include-in-the-browser)
* [Usage](#usage)
  * [Type constraints](#type-constraints)
    * [Basic constraints](#basic-constraints)
    * [Union constraints](#union-constraints)
    * [Custom constraints](#custom-constraints)
  * [Provide default values](#provide-default-values)
  * [Require option attributes](#require-option-attribtues)
  * [React to option value changes](#react-to-option-value-changes)
  * [Error handling](#error-handling)
* [Formal Signature](#formal-signature)
</details>

---

## Motivation

The goal of this package is to provide an easy interface for HTML-configurable component-like entities.

Imagine an accordion widget.

```html
<section class="accordion">
...
</section>
```

You would typically have an additional inline script block defining the options of the widget. This is however inconvenient to write on the server side, obstrusive to read and hard or even impossible to modify on the client side.

With this package, you can use this little snippet

```javascript
const api = htmlApi(document.querySelector('.accordion'), {
  swipeTime: {
    type: Number,
    default: 0.8
  },
  multiple: Boolean
})
```

to make your accordion widget configurable like so:

```html
<section class="accordion" data-swipe-time="0.5" data-multiple>
...
</section>
```

These options are now easily accessible and adjustable as well in the HTML (see above) as in the JavaScript via

```javascript
api.options.swipeTime // 0.5
api.options.multiple // true
```

Consequently, this also allows you to configure your widget *exclusively* in HTML, without any knowledge of the inner JavaScript structure.


## Installation

Install it from npm:

```bash
npm install --save html-api
```


### Include in Node.js

To make this package part of your build chain, you can `require` it in Node:

```javascript
const htmlApi = require('html-api/dist/cjs')
```

If you need this to work in Node.js v4 or below, try this instead:

```javascript
var htmlApi = require('html-api/dist/cjs.es5')
```

Note however that the package won't work when run directly in Node since it does rely on browser features like the DOM and the `MutationObserver` (for which at the time of writing no Node polyfill is available).


### Include in the browser

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

The simplest possible example could be considered this:

```javascript
// This defines an HTML API with only a `label` option which must
// be a string (or `null` if not set)
const api = htmlApi(btn, {
  label: String
})

// Sets the button's inner text to the `label` option which is read
// from the `data-label` attribute
btn.textContent = api.options.label

// Attaches a listener to the `label` option
api.onChange.label = value => {
  btn.textContent = value
}
```

Your API now has two endpoints: The `data-label` attribute on the button, and the `label` property on the `api.options` object. If you want to read or write an option of your API, you should use the `api.options` object. It does all the type casting for you. (See the next section: [Basic constraints](#basic-constraints))

Both endpoints are now watched. That means...

* ...if now in any way the button's `data-label` attribute is changed to `"I'm a magic button"`, the change listener will trigger and the button label will update accordingly.
* ... the `label` option is changed via `api.options.label = "I'm a magic button"`, the change listener will be triggered as well and the `data-label` attribute will be adjusted.

### Type constraints

#### Basic constraints

One of the core features of this package is type casting—serializing options of various types to strings (i.e. `data-*` attributes) and evaluating them back to their respective type. The example above introduced the simplest of types: `String`. However, there are many more.

You could define an option called `myOption` with the following types:

* **`null`**

  > Enforces a value set through `api.options.myOption` to be...

  `null`

  > Unserializes the `data-my-option` attribute by...

  returning `null` if it's `"null"` and throwing an error otherwise.

  Note that *all* type constraints will be considered nullable if neither the definition marks the option as [required](#require-option-attributes) nor it provides a [default value](#provide-default-values).

* **`Boolean`**

  > Enforces a value set through `api.options.myOption` to be...

  of type `boolean`

  > Unserializes the `data-my-option` attribute by...

  evaluating it as follows:

  * `"true"` and `""` (which is equivalent to just adding the attribute at all, as in `<input data-my-option>`) will evaluate to `true`
  * `"false"` and the absence of the attribute will evaluate to `false`


* **`Number`**

  > Enforces a value set through `api.options.myOption` to be...

  of type `number`, including `Infinity` but not `NaN`

  > Unserializes the `data-my-option` attribute by...

  calling `+value`, which will cast a numeric string to an actual number.


* **`Array`**

  > Enforces a value set through `api.options.myOption` to be...

  an array

  > Unserializes the `data-my-option` attribute by...

  parsing it as JSON


* **`Object`**

  > Enforces a value set through `api.options.myOption` to be...

  a plain object

  > Unserializes the `data-my-option` attribute by...

  parsing it as JSON


* **`Function`**

  > Enforces a value set through `api.options.myOption` to be...

  a function

  > Unserializes the `data-my-option` attribute by...

  `eval()`ing it.

  The serialization is done via the function's `.toString()` method (which is not [yet](http://tc39.github.io/Function-prototype-toString-revision/) standardized but still works in all tested browsers so far).

  Be aware that because `eval` changes pretty much the whole environment of your function, you should only use functions that do not rely on anything but their respective arguments.


* **`htmlApi.Enum(string1, string2, string3, ...)`**

  > Enforces a value set through `api.options.myOption` to be...

  a string, and as such, one of the provided parameters


* **`htmlApi.Integer`**

  > Enforces a value set through `api.options.myOption` to be...

  an integer

  The range can be additionally constrained by using

  * `htmlApi.Integer.min(lowerBound)`
  * `htmlApi.Integer.max(upperBound)` or
  * `htmlApi.Integer.min(lowerBound).max(upperBound)`


* **`htmlApi.Float`**

  > Enforces a value set through `api.options.myOption` to be...

  a finite number

  The range can be additionally constrained by using

  * `htmlApi.Float.min(lowerBound)`
  * `htmlApi.Float.max(upperBound)` or
  * `htmlApi.Float.min(lowerBound).max(upperBound)`


#### Union constraints

You can pass an array of type constraints to make values matching *any* of them valid.

If you, for example, would like to have an option for your component that defines the `framerate` at which animations will be performed, you could do it like this:

```javascript
const {Integer, Enum} = htmlApi

htmlApi(element, {
  framerate: [ Integer.min(1), Enum('max') ]
})
```

This would allow the `data-framerate` to either take any integer value from `1` upwards or `max`.

---

However, be careful when using union type constraints, especially if `String` is one of them.

If you define an option like the following:

```javascript
myOption: [Number, String]
```

you should be aware that the number `5` and the string `"5"` do serialize to the same value (which is `"5"`).

Consequently, if you set your option's value to a numeric string (like in `api.options.myOption = "5"`), it will still be unserialized as the number `5`.

Generally, serialized options are evaluated from the most narrow to the widest type constraint. For example, `Number` is more narrow than `String` because all serialized numbers can be deserialized as strings, but not all serialized strings be deserialized as numbers. This means that the attempt to unserialize a stringified option value check applicable type constraints in the following order:

1. [Custom type constraints](#custom-constraints)
2. `null`
3. `Boolean`
4. `Number`
5. `Array`
6. `Object`
7. `Function`
8. `String`

Of course, of this list, only those constraints that are given in an option's definition will be considered.


#### Custom constraints

You can define your own type constraints. They are just plain objects with a `validate`, a `serialize` and an `unserialize` method.

Since object interfaces in TypeScript are pretty concise and should be readable for most JS developers, here's the interface structure of such a constraint:

```javascript
interface Constraint<Type> {
  // Checks if a value belongs to the defined type
  validate (value: any): value is Type

  // Converts a value of the defined Type into a string
  serialize (value: Type): string

  // The inverse of `serialize`: Converts a string back to the
  // defined Type. If the string does not belong to the Type
  // this method should throw an Error.
  unserialize (serializedValue: string): Type
}
```

And since many people (me included) do learn things better by example, this is the structure of the `Number` constraint:

```javascript
{
  validate: value => typeof value === 'number' && !isNaN(value),
  serialize: number => String(number),
  unserialize: numericStr => +numericStr
}
```


### Provide default values

If no appropriate `data-*` attribute for an option is set, its value will default to `null`.

However, an option definition may also provide a default value that will be used instead:

```javascript
const {Enum} = htmlApi

htmlApi(btn, {
  direction: {
    type: Enum('forwards', 'backwards', 'auto'),
    default: 'auto'
  }
})
```

Now whenever reading `api.options.direction` without the `data-direction` attribute set, `"auto"` will be returned.

> **Note:** Providing a default value for an option is mutually exclusive with [marking it as `required`](#require-option-attributes).


### Require option attributes

If an option should neither have a defined default value nor default to `null` (which could be a potential type constraint violation), you may flag it as `required`:

```javascript
const {Enum} = htmlApi

htmlApi(btn, {
  direction: {
    type: Enum('forwards', 'backwards'),
    required: true
  }
})
```

This will [throw an error](#error-handling) whenever the `data-direction` attribute is not set to a valid value.

> **Note:** Marking an option as `required` is mutually exclusive with [providing a default value](#provide-default-values).


### React to option value changes

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

## Formal Signature

To get a complete picture of what's possible with the `htmlApi` function, here's its signature:

```javascript
htmlApi(el: Element, opts: OptionsDefinition|TypeConstraint): Api
```

where

* `Element` is `window.Element`, DOM-builtin constructor constructor function

* `OptionsDefinition` is a plain object matching the following interface:

  ```javascript
  interface OptionsDefinition {
    // A type constraint as defined above
    // This *must* be set, otherwise the package will not know how
    // to serialize and unserialize option values.
    type: TypeConstraint,

    // If the data-* attribute belonging to this option must be set
    // If not set or set to `false`, the `default` option is required
    required?: boolean,

    // A default value, applying when the according data-* attribute
    // is not set. If set, the option must not be `required`.
    // It's mandatory if option is not `required` and the `type` is
    // not an array including `null`.
    default?: any
  }
  ```

* `TypeConstraint` is either
  * one of the following constraint shorthands:
    * the `Boolean` constructor, allowing boolean values or
    * the `Number` constructor, allowing numeric values or
    * the `String` constructor, allowing strings or
    * the `Array` constructor, allowing arrays or
    * the `Object` constructor, allowing plain objects or
    * the `Function` constructor, allowing functions or
    * `null` for actively making the option nullable or

  * one of the following built-in constraints:
    * `htmlApi.Enum(string1, string2, string3, ...)` for one-of-the-defined strings
    * `htmlApi.Integer` for an integer number whose range might be further constrained via
      * `htmlApi.Integer.min(lowerBound)`
      * `htmlApi.Integer.max(upperBound)` or
      * `htmlApi.Integer.min(lowerBound).max(upperBound)`
    * `htmlApi.Float` for a finite number whose range might be further constrained via
      * `htmlApi.Float.min(lowerBound)`
      * `htmlApi.Float.max(upperBound)` or
      * `htmlApi.Float.min(lowerBound).max(upperBound)`

  * a custom type `Constraint`, which is a plain object of the following structure:

    ```javascript
    interface Constraint<Type> {
      // Checks if a value is of the defined type
      validate (value: any): value is Type

      // Converts a value of the defined Type into a string
      serialize (value: Type): string

      // The inverse of `serialize`: Converts a string back to the
      // defined Type. If the string can not be successfully converted
      // to the Type, this method should throw an Error.
      unserialize (serializedValue: string): Type
    }
    ```
    This means you can easily define and provide your own custom types!

    or

  * a union type, being a non-empty array of any of the above

* `Api` is a plain object of the following structure:

  ```javascript
  interface Api {
    // An object with all defined options as properties
    options: { [s: string]: any },

    // Add a listener to the `change` or `error` event
    on ("change", listener: (event: ChangeEvent) => any): this
    on ("error", listener: (err: Error) => any): this

    // Remove mentioned listeners
    off ("change", listener: (event: ChangeEvent) => any): this
    off ("error", listener: (err: Error) => any): this

    // Merges in a new options definition
    merge (newOptionsDef: OptionsDefinition): this

    // Destroys the API, in particular disconnecting the MutationObserver
    destroy (): void
  }
  ```

  The `ChangeEvent` is a plain object matching this interface:

  ```javascript
  interface ChangeEvent {
    // The name of the changed option
    option: string,

    // The new value of the option
    value: any,

    // The option's previous value
    oldValue: any
  }
  ```
