import { useEffect, useReducer, useState } from "react";

import { DEV_CONFIG } from "./config";
import { fakeEngine } from "./fakeEngine";
import { startGpsEngine, type GpsStatus } from "./gpsEngine";
import {
  initialState,
  isSessionLive,
  presentPeers,
  reduce,
} from "./stateMachine";
import type { ProximityEvent, ProximityState } from "./types";

// Swap to DEFAULT_CONFIG for real-world timings.
const config = DEV_CONFIG;

function reducer(state: ProximityState, event: ProximityEvent) {
  return reduce(state, event, config);
}

export function useProximity(hangoutId: string | null, uid: string | null) {
  const [state, dispatch] = useReducer(reducer, Date.now(), initialState);
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>("off");

  // Simulated sightings (dev-mode taps) plus the once-a-second clock tick.
  useEffect(() => {
    fakeEngine.start((sighting) => dispatch({ type: "sighting", sighting }));
    const tick = setInterval(
      () => dispatch({ type: "tick", now: Date.now() }),
      1000,
    );
    return () => {
      clearInterval(tick);
      fakeEngine.stop();
    };
  }, []);

  // Real proximity from location, only while you're in a hangout.
  useEffect(() => {
    if (!hangoutId || !uid) {
      setGpsStatus("off");
      return;
    }
    return startGpsEngine({
      hangoutId,
      uid,
      onSighting: (sighting) => dispatch({ type: "sighting", sighting }),
      onStatus: setGpsStatus,
    });
  }, [hangoutId, uid]);

  const cooldownLeftMs =
    state.phase === "cooldown"
      ? Math.max(0, state.phaseSince + config.cooldownMs - state.now)
      : 0;

  return {
    phase: state.phase,
    present: presentPeers(state, config),
    live: isSessionLive(state),
    cooldownLeftMs,
    gpsStatus,
  };
}
