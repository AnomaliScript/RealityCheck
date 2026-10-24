import { useEffect, useRef } from "react";
import { AppState } from "react-native";

import type { Hangout } from "@/features/hangouts/useHangout";
import { useSettings } from "@/features/settings/settings";
import type { SessionPhase } from "@/proximity/types";
import {
  cancelChallengeReminder,
  scheduleChallengeReminder,
} from "@/services/notifications";
import { issueChallenge } from "./challenges";

/**
 * Issues a challenge whenever the group has gone a full interval without one,
 * and schedules a local notification for that moment so locked phones buzz.
 *
 * Every member's phone runs this; the transaction in issueChallenge lets only
 * one challenge through. If friends pick different intervals, the shortest wins.
 *
 * "Together" means 2+ people have joined the hangout, or simulated proximity
 * says friends are in range. Once real Bluetooth lands, require phase === 'active'.
 */
export function useChallengeTimer(
  hangout: Hangout | null,
  phase: SessionPhase,
) {
  const { challengeIntervalMin } = useSettings();
  const intervalMs = challengeIntervalMin * 60 * 1000;

  const hangoutId = hangout?.id ?? null;
  const together =
    !!hangout && (hangout.members.length >= 2 || phase === "active");
  const lastIssued = hangout?.challenge?.issuedAt ?? 0;

  // Remember when the group became "together", so the first challenge waits
  // a full interval instead of firing the moment someone joins.
  const togetherSince = useRef<number | null>(null);
  useEffect(() => {
    if (together) {
      togetherSince.current = togetherSince.current ?? Date.now();
    } else {
      togetherSince.current = null;
    }
  }, [together]);

  useEffect(() => {
    if (!hangoutId || !together) {
      cancelChallengeReminder();
      return;
    }

    const dueAt = () =>
      Math.max(lastIssued, togetherSince.current ?? Date.now()) + intervalMs;

    const check = () => {
      if (Date.now() >= dueAt()) {
        issueChallenge(hangoutId).catch((e) =>
          console.warn("challenge timer", e),
        );
      }
    };

    // Buzz this phone at the due moment, even if it's locked or the app is closed.
    scheduleChallengeReminder(dueAt());

    // Catch up immediately, e.g. when the app was opened from the notification.
    check();
    const t = setInterval(check, 5000);
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") check();
    });

    return () => {
      clearInterval(t);
      sub.remove();
    };
  }, [hangoutId, together, lastIssued, intervalMs]);
}
