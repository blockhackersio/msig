export type Signal<T> = [get: Accessor<T>, set: Setter<T>];
export type Accessor<T> = () => T;
export type Setter<T> = (v: T | Updater<T>) => T;
export type Updater<T> = (prev?: T) => T;
export type Effect = () => void;
export type Target<T> = { value: T };
export type EffectMap = Map<Target<any>, Set<Effect>>;
export type ResourceReturn<T> = [
  {
    (): T | undefined;
    state: "unresolved" | "pending" | "ready" | "errored";
    loading: boolean;
    error: any;
    latest: T | undefined;
  },
  {
    mutate: (v: T | undefined) => T | undefined;
    refetch: () => Promise<T | None>;
  },
];
export type ResourceSignal<T> = ResourceReturn<T>[0];

export type Optional<T> = T | None;
export type None = undefined;
export const None = undefined;

function isUpdater<T>(v: T | Updater<T>): v is Updater<T> {
  return typeof v === "function";
}

const effects: EffectMap = new Map();
let currentEffect: Optional<Effect> = None;

function track<T>(target: Target<T>) {
  if (currentEffect) {
    const listeners = effects.get(target) ?? new Set<Effect>();
    listeners.add(currentEffect);
    if (!effects.has(target)) effects.set(target, listeners);
  }
}

function trigger<T>(target: Target<T>) {
  const listeners = effects.get(target);
  if (listeners) {
    for (const listener of listeners) {
      listener();
    }
  }
}

export function createSignal<T>(initialValue: T): Signal<T> {
  const target: Target<T> = { value: initialValue };

  const get: Accessor<T> = () => {
    track(target);
    return target.value;
  };

  const set: Setter<T> = (v) => {
    const updater = isUpdater(v) ? v : () => v;
    target.value = updater(target.value);
    trigger(target);
    return target.value;
  };

  return [get, set];
}

export function createEffect<T>(fn: () => T): void;
export function createEffect<T>(fn: (v: T) => T, value: T): void;
export function createEffect<T>(fn: (v?: T) => T, value?: T): void {
  currentEffect = () => {
    value = fn(value);
  };
  currentEffect();
  currentEffect = None;
}

export function createMemo<T>(fn: () => T): Accessor<T>;
export function createMemo<T>(fn: (v: T) => T, value: T): Accessor<T>;
export function createMemo<T>(fn: (v?: T) => T, value?: T): Accessor<T> {
  const [out, setOut] = createSignal<Optional<T>>(value);
  createEffect((v) => {
    const o = fn(v);
    setOut(o);
    return o;
  }, value);
  return out as Accessor<T>;
}

type Fetcher<T, U> = (v?: U) => Promise<T>;

export function createResource<T, U>(fetcher: Fetcher<T, U>): ResourceReturn<T>;
export function createResource<T, U>(
  source: Accessor<U>,
  fetcher: Fetcher<T, U>,
): ResourceReturn<T>;
export function createResource<T, U>(
  arg1: Fetcher<T, U> | Accessor<U>,
  arg2?: Fetcher<T, U>,
): ResourceReturn<T> {
  // Parse arguments
  const [source, fetcher] =
    arguments.length === 1
      ? [None, arg1 as Fetcher<T, U>]
      : [arg1 as Accessor<U>, arg2 as Fetcher<T, U>];
  // console.log(source, fetcher);
  const [out, setOut] = createSignal<Optional<T>>(None);
  const signal = out as ResourceSignal<T>;
  signal.state = "unresolved";

  async function refetch(v?: U) {
    const prom = fetcher(v);
    signal.state = "pending";
    signal.loading = true;
    try {
      const res = await prom;
      setOut(res);
      signal.latest = res;
      signal.state = "ready";
      return res;
    } catch (err) {
      signal.state = "errored";
    } finally {
      signal.loading = false;
    }
  }

  function mutate(v: T | undefined): T | undefined {
    setOut(v);
    signal.latest = v;
    return v;
  }

  nextTick(() => {
    createEffect(() => {
      if (source) {
        refetch(source());
      } else refetch();
    });
  });

  return [out as ResourceSignal<T>, { refetch, mutate }];
}

export function nextTick(fn?: () => void) {
  return new Promise<void>((res) =>
    setTimeout(() => {
      fn && fn();
      return res();
    }, 0),
  );
}
