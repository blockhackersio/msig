# msig

The tiny expressive universal signals library you wish you had but only discovered now.

This is a port of the Solid.js Signals API you can use anywhere.

## Usage

You can use the library in a similar (not exactly the same) way to the Solid.js API.

```ts
import { createSignal, createMemo } from "@msig/core";

const [a, setA] = createSignal(3);
const [b, setB] = createSignal(4);

const total = createMemo(() => a() * b());

createEffect(() => {
  console.log(total());
}); // logs -> "12"

setA(4); // logs -> "16"
setB(2); // logs -> "8"
```

Once you have created your reactive system you can expose the output signals using the adaptor for your platform of choice. Here is an example for React:

```tsx
import React from "react";
import { createSignal } from "@msig/core";
import { useSignal } from "@msig/react";

// Note the following is in "global" scope
const [count, setCount] = createSignal(0);

function increment() {
  setCount((c) => c + 1);
}

function decrement() {
  setCount((c) => c - 1);
}

export function Counter() {
  const countSig = useSignal(count);
  return (
    <div>
      <div>{countSig}</div>
      <button onChange={increment}>+</button>
      <button onChange={decrement}>-</button>
    </div>
  );
}
```

## Features

The following solid.js reactive primitives have been implemented

- [x] `createSignal`
- [x] `createEffect`
- [x] `createMemo`
- [x] `createResource`

## Adaptors

Adaptors have been created for:

- [ ] React ([@msig/react](https://www.npmjs.com/package/@msig/react))
- [ ] Solid ([@msig/solid](https://www.npmjs.com/package/@msig/solid))
- [ ] Vue ([@msig/vue](https://www.npmjs.com/package/@msig/vue))
- [ ] Angular ([@msig/angular](https://www.npmjs.com/package/@msig/angular))
