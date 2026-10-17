export type PeerId = string;

/** One Bluetooth "I can hear this friend's phone" reading. */
export type Sighting = {
  peerId: PeerId;
  rssi: number; // signal strength in dBm; closer = less negative (-50 is near, -90 is far)
  at: number; // timestamp in ms
};

export type SessionPhase = "idle" | "forming" | "active" | "cooldown";

export type ProximityState = {
  phase: SessionPhase;
  phaseSince: number; // when the current phase began
  now: number; // latest time the machine has seen
  lastSeen: Record<PeerId, number>; // last time each friend was heard
};

export type ProximityConfig = {
  rssiThreshold: number; // ignore sightings weaker than this
  goneAfterMs: number; // a friend counts as gone after this long unheard
  quorum: number; // how many friends must be near to count as "together"
  formAfterMs: number; // being together this long starts a session
  cooldownMs: number; // a session survives this long after everyone leaves
};

export type ProximityEvent =
  | { type: "sighting"; sighting: Sighting }
  | { type: "tick"; now: number };
