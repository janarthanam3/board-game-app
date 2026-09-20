import { type Href, Redirect } from "expo-router";
import type { ReactElement } from "react";
import { useEffect, useRef } from "react";

import { useSessionStore } from "../stores/session";
import type { GuardResult } from "./guards";

/**
 * Turns a GuardResult into what a screen should render: the screen itself, a <Redirect> to leave,
 * or nothing while the session is still being restored (the native splash is still up then).
 *
 * A screen keeps rendering for a moment after its redirect starts, and by then the stores it
 * read may have changed (the pending href is cleared, the pathname is transient). So the first
 * redirect decided for a mount is the one that counts: it is latched and never recomputed.
 */
export function Guarded({ result, children }: { result: GuardResult; children: ReactElement }) {
  const setPendingHref = useSessionStore((state) => state.setPendingHref);
  const latched = useRef<Extract<GuardResult, { redirect: string }> | null>(null);

  if (!result.allow && "redirect" in result && latched.current === null) {
    latched.current = result;
  }
  const decision = latched.current;

  // Side effects belong in an effect, not in render: remember or clear the pending deep link.
  useEffect(() => {
    if (!decision) {
      return;
    }
    if (decision.pendingHref) {
      setPendingHref(decision.pendingHref);
    } else if (decision.clearPendingHref) {
      setPendingHref(null);
    }
  }, [decision, setPendingHref]);

  if (decision) {
    return <Redirect href={decision.redirect as Href} />;
  }
  if (!result.allow) {
    return null; // wait
  }
  return children;
}
