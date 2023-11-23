import { useSyncExternalStoreWithSelector } from "use-sync-external-store/shim/with-selector";
import { Accessor, createEffect, createRoot } from "@msig/core";
export type NoInfer<T> = [T][T extends any ? 0 : never];

export function useSignal<T, U>(
  signal: Accessor<T>,
  selector: (state: NoInfer<T>) => U = (d) => d as any,
) {
  function subscribe(fn: () => void) {
    const dispose = createRoot(() => {
      createEffect(() => {
        signal();
        fn();
      });
    });
    return dispose;
  }
  const slice = useSyncExternalStoreWithSelector(
    subscribe,
    signal,
    signal,
    selector,
    shallow,
  );

  return slice;
}

export function shallow<T>(objA: T, objB: T) {
  if (Object.is(objA, objB)) {
    return true;
  }

  if (
    typeof objA !== "object" ||
    objA === null ||
    typeof objB !== "object" ||
    objB === null
  ) {
    return false;
  }

  const keysA = Object.keys(objA);
  if (keysA.length !== Object.keys(objB).length) {
    return false;
  }

  for (let i = 0; i < keysA.length; i++) {
    if (
      !Object.prototype.hasOwnProperty.call(objB, keysA[i] as string) ||
      !Object.is(objA[keysA[i] as keyof T], objB[keysA[i] as keyof T])
    ) {
      return false;
    }
  }
  return true;
}
