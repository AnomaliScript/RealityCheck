import { useEffect, useReducer } from "react";

import { DEV_CONFIG } from "./config";
import { fakeEngine } from "./fakeEngine";
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

export function useProximity() {
  const [state, dispatch] = useReducer(reducer, Date.now(), initialState);

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

  const cooldownLeftMs =
    state.phase === "cooldown"
      ? Math.max(0, state.phaseSince + config.cooldownMs - state.now)
      : 0;

  return {
    phase: state.phase,
    present: presentPeers(state, config),
    live: isSessionLive(state),
    cooldownLeftMs,
  };
}
