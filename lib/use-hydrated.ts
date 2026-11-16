"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * False on the server and during the first render, true once the page's JavaScript is
 * running. Forms use it to keep the submit button off until their handlers are attached,
 * so a fast tap on a slow phone cannot fall back to a plain browser submit, which would put
 * the typed values (a password) in the address bar.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
