import type {
    PeerId,
    ProximityConfig,
    ProximityEvent,
    ProximityState,
    SessionPhase,
} from "./types";

export function initialState(now: number): ProximityState {
  return { phase: "idle", phaseSince: now, now, lastSeen: {} };
}

/**
 * Friends heard recently enough to count as present.
 *
 * This is the hysteresis: a friend appears on a single sighting, but only
 * disappears after `goneAfterMs` of silence. A phone in a pocket missing a
 * few scans doesn't make them "leave".
 */
export function presentPeers(
  state: ProximityState,
  config: ProximityConfig,
): PeerId[] {
  return Object.keys(state.lastSeen).filter(
    (id) => state.now - state.lastSeen[id] <= config.goneAfterMs,
  );
}

/** Cooldown still counts as a live session; that's the point of it. */
export function isSessionLive(state: ProximityState): boolean {
  return state.phase === "active" || state.phase === "cooldown";
}

export function reduce(
  state: ProximityState,
  event: ProximityEvent,
  config: ProximityConfig,
): ProximityState {
  if (event.type === "sighting") {
    const { peerId, rssi, at } = event.sighting;
    if (rssi < config.rssiThreshold) return state; // too weak, ignore

    const lastSeen = {
      ...state.lastSeen,
      [peerId]: Math.max(at, state.lastSeen[peerId] ?? 0),
    };
    return advance(
      { ...state, lastSeen, now: Math.max(at, state.now) },
      config,
    );
  }

  return advance({ ...state, now: event.now }, config);
}

/**
 *   idle ──together──▶ forming ──held long enough──▶ active
 *    ▲                    │                            │
 *    └──── left early ────┘                      everyone left
 *    ▲                                                 ▼
 *    └────────── cooldown expired ─────────────── cooldown
 *                                   someone back ──▶ active
 */
function advance(
  state: ProximityState,
  config: ProximityConfig,
): ProximityState {
  const together = presentPeers(state, config).length >= config.quorum;
  const elapsed = state.now - state.phaseSince;
  const enter = (phase: SessionPhase): ProximityState => ({
    ...state,
    phase,
    phaseSince: state.now,
  });

  switch (state.phase) {
    case "idle":
      return together ? enter("forming") : state;

    case "forming":
      if (!together) return enter("idle");
      return elapsed >= config.formAfterMs ? enter("active") : state;

    case "active":
      return together ? state : enter("cooldown");

    case "cooldown":
      if (together) return enter("active");
      return elapsed >= config.cooldownMs ? enter("idle") : state;
  }
}
