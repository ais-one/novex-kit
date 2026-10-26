## JS Concepts

### Closures

```js
const first = () => {
  const greet = 'Hi';
  const second = () => {
    const name = 'Aa';
    alert(greet);
  };
  return second;
};
const func = first();
func(); // alert popup Hi
```

### Currying

```js
const curriedMultiply = a => b => a * b;
curriedMultiply(3)(4);
```

### Compose

```js
const compose = (f, g) => a => f(g(a));
const inc = num => num + 1;
const x2 = num => num * 2;
compose(inc, x2)(5); // return value should be (5 * 2) + 1 = 11
```

### Truthy, falsy & typeof

- Typeof

```js
typeof null === 'object';
typeof [] === 'object';
typeof {} === 'object';
typeof '' === 'string';
typeof function () {} === 'function';
typeof 1 === 'number';
typeof true === 'boolean';
typeof undefined === 'undefined';
```

- Falsy

```
null, false, 0, undefined, ''
```

- Truthy

```
true, 1, 'a', [], {}, () => {}),
```

### ES2020

```js
// BigInt
1n + 2n // typeof "bigint"

// nullish coalensce ?? (if null or undefined)
aa?.bb.?cc ?? 'is empty string'

const authorName = book?.author?.firstName ?? 'Unknown'
if undefined, then 'Unkonwn'


// optional chaining ?.
aa?.bb?.cc -> undefined

// Promise.allSettled

// globalThis
```

https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/entries
https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/fromEntries


### call / apply / bind...

#### Function.prototype.call()

The method Call invokes the function and allows you to pass in arguments one by one using commas.

```js
let customer1 = { name: 'Leo', email: 'leo@gmail.com' };
let customer2 = { name: 'Nat', email: 'nat@hotmail.com' };

function greeting(text) {
  console.log(`${text} ${this.name}`);
}

greeting.call(customer1, 'Hello'); // Hello Leo
greeting.call(customer2, 'Hello'); // Hello Nat
```

#### Function.prototype.apply()

The method Apply invokes the function and allows you to pass in arguments as an array.

```js
let customer1 = { name: 'Leo', email: 'leo@gmail.com' };
let customer2 = { name: 'Nat', email: 'nat@hotmail.com' };
function greeting(text, text2) {
  console.log(`${text} ${this.name}, ${text2}`);
}
greeting.apply(customer1, ['Hello', 'How are you?']); // output Hello Leo, How are you?
greeting.apply(customer2, ['Hello', 'How are you?']); // output Hello Natm How are you?
```

#### Function.prototype.bind()

The Bind method returns a new function, allowing you to pass in a this array and any number of arguments. Use it when you want that function to later be called with a certain context like events.

```js
let customer1 = { name: 'Leo', email: 'leo@gmail.com' };
let customer2 = { name: 'Nat', email: 'nat@hotmail.com' };
function greeting(text) {
  console.log(`${text} ${this.name}`);
}
let helloLeo = greeting.bind(customer1);
let helloNat = greeting.bind(customer2);
helloLeo('Hello'); // Hello Leo
helloNat('Hello'); // Hello Nat
```


Call and Apply are interchangeable. You can decide whether it’s easier to send in an array or a comma separated list of arguments.

Bind is different. It always returns a new function. We can use Bind to curry functions like in the example. We can take a simple hello function and turn it into a helloJon or helloKelly. You can use it for events where we don’t know when they’ll be fired but know what context is.

### Classes / Prototypes

TODO

## Scope

https://levelup.gitconnected.com/how-does-hoisting-work-in-javascript-es6-b0e06727e071


### Global Scope

```js
let global = 'I see global.';
function scopeFunction() {
  console.log(global);
}

scopeFunction(); // outputs 'I see global.'
```

### Local Scope

```js
function myFunction() {
  var localFunction = 'I see local';
  console.log(localFunction);
}

myFunction(); // outputs 'I see functional scope'
console.log(localFunction); // Outputs an error 'localFunction is not defined'
```


### Hoisting

```js
var a = 'hi';
function myFunction() {
  console.log(a); // undefined - var/let/const a from below is hoisted up here...
  var a = 'hello';
  console.log(a); // 'hello'
}
myFunction();
```

```js
var a = 'hi';
function myFunction() {
  var a; // the a in the local scope is hoisted here and a is 'undefined
  console.log(a); // outputs 'undefined
  a = 'hello';
  console.log(a); // outputs 'hello'
}
myFunction();
console.log(a); // outputs 'hi'

var a = 'hi';
function myFunction() {
  var a;
  console.log('output 1', a);
  a = 'hello';
  console.log('output 2', a);
}
myFunction();
console.log('output 3', a);
```

Javascript will hoist var, const, and let variable declarations to the top of its scope. While this is true, const and let will not behave the same as var. var will hoist a declaration and initialize the variable as undefined if the definition is not provided. However, const and let will hoist the variable declaration and not initialize the variable if the definition is not provided

```js
function myFunction() {
  a;
  console.log(a);
  let a = 'hello'; // if var instead of let, we will reach here
}
myFunction();
```

```js
function myFunction() {
  let a; // a's declaration is hoisted here, but remains uninitialized
  a; // Will get a ReferenceError: Cannot access 'a' before initialization
  console.log(a);
  a = 'hello'; // everything above this line of code is referenced as temporal dead zone
}
myFunction();
```

# Classes vs Factories

Reference:
- https://medium.com/javascript-in-plain-english/factories-are-still-better-than-classes-in-javascript-47f15071904e


## Class

```js
class Car {
  constructor(maxSpeed){
    this.maxSpeed = maxSpeed;
  }
  drive1 = () => {
    console.log(`driving ${this.maxSpeed} mph!`)
  }
  drive2 () {
    console.log(`driving ${this.maxSpeed} mph!`)
  }
}

const car = new Car(120)

$('button').click(car.drive2) // driving undefined mph!
$('button').click(car.drive2.bind(car) // driving 120 mph!
$('button').click(_ => car.drive2()) // driving 120 mph!

$('button').click(car.drive1) // driving 120 mph!
```

## Factory

```js
const Car = ms => {
  const maxSpeed = ms;

  return {
    drive: () => console.log(`driving ${maxSpeed} mph!`), // Creates a copy of each method in EVERY SINGLE instence -> Memory use!
  };
};
```

```js
function greeterFactory(greeting = 'Hello') {
  return {
    greet: () => console.log(`${greeting}!`),
  };
}
export default greeterFactory;
```

# Asynchronous

callbacks

promises (use to batch, parallel async operations)
- Promise.all
- Promise.any
- Promise.allSettled

generators
async/await

- Number.isNaN vs isNaN
- destructuring
  - const { data: newData } = await axios.get(...) // set a new name also
    - function calculate({operands = [1, 2], type = 'addition'} = {}) {

## ES2016

- Array.prototype.includes()
- exponentiation operator \*\*

## ES2017

- String padding
  - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/padStart
  - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/padEnd
- Object.values()
  - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/values
- Object.entries()
  - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/entries
- getOwnPropertyDescriptors()
  - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/getOwnPropertyDescriptors
  - In what way is this useful?
    - ES6 gave us Object.assign(), which copies all enumerable own properties from one or more objects, and return a new object.
    - However there is a problem with that, because it does not correctly copies properties with non-default attributes.
    - If an object for example has just a setter, it’s not correctly copied to a new object, using Object.assign().
- Trailing commas
- Async functions (async / await)
- Shared Memory and Atomics
  - https://github.com/tc39/ecmascript_sharedmem/blob/master/TUTORIAL.md

## ES2018

- String.raw
  - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/raw
- s dotAll flag for regular expressions
  - /^.$/s.test('\n') true
- RegExp named capture groups
  - A capture group can be given a name using the (?<name>...) syntax, for any identifier name.
  - The regular expression for a date then can be written as /(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})/u. Each name should be unique.
  - const regExp = /(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})/u
  - const res = regExp.exec('2020-11-12')
- Rest & Spread operators
  - const { a, b, ...zz } = { a: 1, b: 2, c: 3. d: 4 } // rest
  - const zz = { a, b, ...zz} // spread
- Regexp Lookbehind Assertions
  - Positive lookbehind assertions are denoted as (?<=...) and they ensure that the pattern contained within precedes the pattern following the assertion.
  - Negative lookbehind assertions are denoted as (?<!...) and, on the other hand, make sure that the pattern within doesn't precede the pattern following the assertion.
- Regexp Unicode Property Escapes
- Promise.prototype.finally
  - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/finally
- Asynchronous Iteration
  - for await (const item of promises) { console.log(item) }

## ES2019 (to check)

- Array.flat() Array.flatMap()
  - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/flat
  - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/flatMap
- Object.fromEntries
  - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/fromEntries
- String.trimStart(), String.trimEnd()
- Symbol.Description
- Optional Catch BInding
  - try {} catch {}
- JSON ⊂ ECMAScript
  - The unescaped line separator U+2028 and paragraph separator U+2029 characters were not accepted in the pre-ES10 era.
- Well-Formed JSON.stringify()
  - JSON.stringify() may return characters between U+D800 and U+DFFF as values for which there are no equivalent UTF-8 characters. However, JSON format requires UTF-8 encoding. The proposed solution is to represent unpaired surrogate code points as JSON escape sequences rather than returning them as single UTF-16 code units.
- Stable Array.prototype.sort()
- Function.toString()

## ES2020

- BigInt
  - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt
- Dynamic Import
  - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import#dynamic_imports
- Nullish Coalescing (only undefined and null considered as falsy) ??
- Optional Chaining ?.
- Promise.allSettled
- String matchAll
  - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/matchAll
- globalThis
- Module namespace exports
  - export * as utils from './utils.mjs' === import * as utils from './utils.mjs'; export { utils }
- Well defined for-in order
  - for (let x in y), is now ordered
- import.meta
  - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import.meta
- private class variables
  - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Private_class_fields
## ES2021

- Logical Assignment Operators (&&= ||= ??=)
  - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators
- Numeric Separators (1_000)
  - https://github.com/tc39/proposal-numeric-separator
- Promise.any & AggregateError
  - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/any
  - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/AggregateError
- String.prototype.replaceAll
  - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replaceAll
- WeakRefs & FinalizationRegistry Objects
  - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakRef
  - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/FinalizationRegistry


## StackOverflow Recipes

https://stackoverflow.com/questions/784539/how-do-i-replace-all-line-breaks-in-a-string-with-br-elements
- str = str.replace(/(?:\r\n|\r|\n)/g, '<br>');

https://stackoverflow.com/questions/7225407/convert-camelcasetext-to-sentence-case-text
const result = 'helloThereMister'.replace(/([A-Z])/g, " $1");
const finalResult = result.charAt(0).toUpperCase() + result.slice(1);

https://stackoverflow.com/questions/23089016/math-random-applied-as-a-percentage
Math.floor(Math.random() * 100) + 1 // 1 - 100
Math.floor(Math.random() * 101) // 0 - 100

- merge objects
  const object3 = {...object1, ...object2 } // If both objects have a property with the same name, then the second object property overwrites the first.
  Object.assign(tgt, ...srcs) // shallow copy of properties, if property collision src overwrite tgt
  lodash.cloneDeep, lodash.merge


https://javascript.plainenglish.io/5-html-tricks-nobody-is-talking-about-a0480104fe19
- lazy loading
````html
<img src="image.png" loading="lazy" alt="…" width="200" height="200">```
````

- picture tag
```html
<picture>
  <source media="(min-width:768px)" srcset="med_flag.jpg">
  <source media="(min-width:495px)" srcset="small_flower.jpg">
  <img src="high_flag.jpg" alt="Flags" style="width:auto;">
</picture>
```

- base url
```html
<head><base href="https://www.twitter.com/" target="_blank"></head>
```

- redirect after x seconds
```html
<meta http-equiv="refresh" content="4; URL='https://google.com' />
```


https://medium.com/@rivoltafilippo/javascript-merge-arrays-without-duplicates-3fbd8f4881be
```js
const result = [...new Set([...firstArr, ...secondArr])];
```
