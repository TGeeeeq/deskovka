import { useSyncExternalStore } from "react";

/** Media query přes useSyncExternalStore (stejná úmluva jako web NMR):
 *  server/hydratace vidí `false`, takže dotaz piš tak, aby false byla bezpečná odpověď. */
export function useMediaQuery(q: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(q);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(q).matches,
    () => false,
  );
}

export const useReducedMotion = () => !useMediaQuery("(prefers-reduced-motion: no-preference)");
