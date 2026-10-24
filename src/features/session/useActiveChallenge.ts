import { useSyncExternalStore } from "react";

import {
  useHangout,
  type HangoutChallenge,
} from "@/features/hangouts/useHangout";

// A challenge stops prompting after this long, even if ignored.
export const CHALLENGE_WINDOW_MS = 15 * 60 * 1000;

/* Challenges you've answered or skipped this session. Kept in memory: a
tiny store that any component can update and every hook re-reads. */
const handled = new Set<string>();
const listeners = new Set<() => void>();
let version = 0;

export function markChallengeHandled(id: string) {
  handled.add(id);
  version++;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getVersion() {
  return version;
}

export type ActiveChallenge = HangoutChallenge & { hangoutId: string };

export function useActiveChallenge(): ActiveChallenge | null {
  const { hangout } = useHangout();
  useSyncExternalStore(subscribe, getVersion, getVersion);

  const c = hangout?.challenge;
  if (!hangout || !c) return null;
  if (handled.has(c.id)) return null;
  if (Date.now() - c.issuedAt > CHALLENGE_WINDOW_MS) return null;

  return { ...c, hangoutId: hangout.id };
}
