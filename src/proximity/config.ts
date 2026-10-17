import type { ProximityConfig } from "./types";

/** Real-world timings. */
export const DEFAULT_CONFIG: ProximityConfig = {
  rssiThreshold: -80,
  goneAfterMs: 60000, // 1 min unheard before a friend counts as gone
  quorum: 1,
  formAfterMs: 120000, // 2 min together before a session starts
  cooldownMs: 600000, // 10 min grace after everyone leaves
};

/** Fast timings so you can watch the whole lifecycle in seconds. */
export const DEV_CONFIG: ProximityConfig = {
  ...DEFAULT_CONFIG,
  goneAfterMs: 6000,
  formAfterMs: 5000,
  cooldownMs: 10000,
};
