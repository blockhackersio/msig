export type Signal<T> = [get: Accessor<T>, set: Setter<T>];
export type Accessor<T> = () => T;
export type Setter<T> = (v: T | Updater<T>) => T;
export type Updater<T> = (prev?: T) => T;
export type Effect = () => void;
export type Target<T> = { value: T };
export type EffectMap = Map<Target<any>, Set<Effect>>;
export type ScopedEffectMap = Map<unknown, EffectMap>;
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

const SCOPE_GLOBAL = "_SCOPE_GLOBAL_";

function isUpdater<T>(v: T | Updater<T>): v is Updater<T> {
  return typeof v === "function";
}

class EffectStore {
  private targetToEffects = new Map<Target<any>, Set<Effect>>();
  private scopeToEffects = new Map<unknown, Set<Effect>>();
  add<T>(target: Target<T>, effect: Effect, scope: unknown) {
    if (!this.targetToEffects.has(target)) {
      this.targetToEffects.set(target, new Set());
    }

    this.targetToEffects.get(target)!.add(effect);
    if (!this.scopeToEffects.has(scope)) {
      this.scopeToEffects.set(scope, new Set());
    }
    this.scopeToEffects.get(scope)!.add(effect);
  }
  get<T>(target: Target<T>): Set<Effect> | None {
    return this.targetToEffects.get(target);
  }
  deleteAllEffectsByScope(scope: unknown): void {
    const effects = this.scopeToEffects.get(scope);

    if (effects) {
      for (const effect of effects) {
        for (const [
          target,
          setOfEffectsInTarget,
        ] of this.targetToEffects.entries()) {
          if (setOfEffectsInTarget.has(effect)) {
            setOfEffectsInTarget.delete(effect);

            if (setOfEffectsInTarget.size === 0) {
              this.targetToEffects.delete(target);
            }
          }
        }
      }

      this.scopeToEffects.delete(scope);
    }
  }
}

class EffectManager {
  private currentEffect: Optional<Effect> = None;
  private scope: unknown = SCOPE_GLOBAL;
  private store: EffectStore = new EffectStore();
  private allowTracking: boolean = true;

  registerEffect(effect: Effect) {
    this.currentEffect = effect;
    effect();
    this.currentEffect = None;
  }

  setScope(scope: unknown) {
    const oldScope = this.scope;
    this.scope = scope;
    return oldScope;
  }

  dispose(scope: unknown) {
    this.store.deleteAllEffectsByScope(scope);
  }

  disableTracking() {
    this.allowTracking = false;
  }

  enableTracking() {
    this.allowTracking = true;
  }

  track<T>(target: Target<T>) {
    if (this.currentEffect && this.allowTracking) {
      this.store.add(target, this.currentEffect, this.scope);
    }
  }

  trigger<T>(target: Target<T>) {
    const listeners = this.store.get(target);
    if (listeners) {
      for (const listener of listeners) {
        listener();
      }
    }
  }

  static _instance: EffectManager;
  static get() {
    if (!EffectManager._instance) {
      EffectManager._instance = new EffectManager();
    }
    return EffectManager._instance;
  }
}

function getEffectManager() {
  return EffectManager.get();
}

export function createRoot<T>(fn: (dispose: () => void) => T): T {
  const scope = {};
  const effectsManager = getEffectManager();
  const oldScope = effectsManager.setScope(scope);
  function dispose() {
    effectsManager.dispose(scope);
  }
  const out = fn(dispose);
  effectsManager.setScope(oldScope);
  return out;
}

export function createSignal<T>(initialValue: T): Signal<T> {
  const target: Target<T> = { value: initialValue };

  const get: Accessor<T> = () => {
    getEffectManager().track(target);
    return target.value;
  };

  const set: Setter<T> = (v) => {
    const updater = isUpdater(v) ? v : () => v;
    const newValue = updater(target.value);
    if (newValue === target.value) return target.value;
    target.value = newValue;
    getEffectManager().trigger(target);
    return target.value;
  };

  return [get, set];
}

export function createEffect<T>(fn: () => T): void;
export function createEffect<T>(fn: (v: T) => T, value: T): void;
export function createEffect<T>(fn: (v?: T) => T, value?: T): void {
  getEffectManager().registerEffect(() => {
    value = fn(value);
  });
}

export function createMemo<T>(fn: () => T): Accessor<T>;
export function createMemo<T>(fn: (v?: T) => T): Accessor<T>;
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

export function untrack<T>(fn: () => T): T {
  getEffectManager().disableTracking();
  const o = fn();
  getEffectManager().enableTracking();
  return o;
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
