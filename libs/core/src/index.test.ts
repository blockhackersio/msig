import { expect, test, vi } from "vitest";

import {
  createMemo,
  createEffect,
  createResource,
  createSignal,
  createRoot,
  nextTick,
  Accessor,
  Setter,
  None,
} from ".";

test("createSignal with initial value", () => {
  const [get] = createSignal(0);
  expect(get()).toBe(0);
});

test("createSignal and change with set", () => {
  const [get, set] = createSignal(0);
  set(3.1415);
  expect(get()).toBe(3.1415);
});

test("createSignal and change with updater", () => {
  const [get, set] = createSignal(0);
  set((v = 0) => v + 1);
  expect(get()).toBe(1);
  set((v = 0) => v + 1);
  expect(get()).toBe(2);
});

test("createSignal with effect", () => {
  const [get, set] = createSignal(0);
  let external = get();
  createEffect(() => {
    external = get();
  });
  set(1);
  expect(external).toBe(1);
  set(2);
  expect(external).toBe(2);
});

test("createSignal with root", () => {
  let external = 0;
  let setCount: Setter<number> = () => 0;
  let count: Accessor<number> = () => 0;
  const dispose = createRoot((dispose) => {
    [count, setCount] = createSignal<number>(0);

    createEffect(() => {
      external = count();
    });

    return dispose;
  });
  const increment = (c = 0) => c + 1;
  setCount(increment);
  expect(external).toBe(1);
  dispose();
  setCount(increment);
  expect(external).toBe(1);
});

test("Signal does not rerun effect when value does not change", () => {
  const [get, set] = createSignal(0);
  const fn = vi.fn(() => {
    get();
  });
  createEffect(fn);
  set(1);
  expect(fn).toHaveBeenCalledTimes(2);
  set(1);
  expect(fn).toHaveBeenCalledTimes(2);
});

test("Signal accessed multiple times within effect", () => {
  const [get, set] = createSignal(0);
  const fn = vi.fn(() => {
    get();
    get();
  });
  createEffect(fn);
  expect(fn).toHaveBeenCalledTimes(1);
  set(1);
  expect(fn).toHaveBeenCalledTimes(2);
  set(2);
  expect(fn).toHaveBeenCalledTimes(3);
});

test("createEffect can be passed an accumulator", () => {
  const [get, set] = createSignal(0);

  let externalSum = 0;

  createEffect((acc) => {
    const total = acc + get();
    externalSum = total;
    return total;
  }, 0);

  set(1);
  expect(externalSum).toBe(1);
  set(2);
  expect(externalSum).toBe(3);
});

test("createMemo", () => {
  const [a, setA] = createSignal(10);
  const [b, setB] = createSignal(10);

  const product = createMemo(() => a() * b());

  expect(product()).toBe(100);
  setA(5);
  expect(product()).toBe(50);
  setB(5);
  expect(product()).toBe(25);
});

test("createResource happy", async () => {
  const { promise, resolve } = createDeferred();

  const [value, { mutate }] = createResource(promise);
  expect(value.state).toBe("unresolved");
  await nextTick();
  expect(value.loading).toBe(true);
  expect(value.state).toBe("pending");
  resolve("Foo");
  await nextTick();
  expect(value.state).toBe("ready");
  expect(value()).toBe("Foo");
  expect(value.latest).toBe("Foo");
  expect(value.error).toBe(None);
  expect(value.loading).toBe(false);
  expect(promise).toHaveBeenCalledOnce();
  mutate("Bar");
  expect(value()).toBe("Bar");
  expect(value.latest).toBe("Bar");
  expect(promise).toHaveBeenCalledOnce();
});

test("createResource error", async () => {
  const { promise, reject } = createDeferred();
  const [value] = createResource(promise);
  expect(value.state).toBe("unresolved");
  await nextTick();
  expect(value.loading).toBe(true);
  expect(value.state).toBe("pending");
  reject("Whoops!");
  await nextTick();
  expect(value.state).toBe("errored");
  expect(value()).toBe(None);
  expect(value.latest).toBe(None);
  expect(value.loading).toBe(false);
});

test("createResource with signal", async () => {
  const { promise, resolve, reset } = createDeferred();
  const [signal, setSignal] = createSignal(1);
  const [value] = createResource(signal, promise);
  await nextTick();
  resolve("item1");
  await nextTick();
  expect(value()).toBe("item1");
  expect(promise).toHaveBeenLastCalledWith(1);
  reset();
  setSignal(2);
  expect(promise).toHaveBeenLastCalledWith(2);
  resolve("item2");
  await nextTick();
  expect(value()).toBe("item2");
});

test("deferred", async () => {
  const { resolve, promise } = createDeferred();

  const p = promise();

  resolve("Hello World");

  const value = await p;

  expect(value).toBe("Hello World");
});

test("deferred fails", async () => {
  const { reject, promise } = createDeferred();
  const p = promise();
  reject("Whoops!");
  let error = "";
  try {
    await p;
  } catch (err) {
    error = `${err}`;
  }
  expect(error).toBe("Whoops!");
});

function createDeferred<T>() {
  let _resolve: (value: T) => void = () => {};
  let _reject: (reason: string) => void = () => {};
  let _promise: () => Promise<T>;
  function resolve(v: T) {
    _resolve(v);
  }

  function reject(v: string) {
    return _reject(v);
  }

  const promise = vi.fn((_v?: T) => {
    return _promise();
  });

  function reset() {
    _promise = () =>
      new Promise<T>((r, f) => {
        _resolve = r;
        _reject = f;
      });
  }
  reset();
  return { resolve, reject, promise, reset };
}
