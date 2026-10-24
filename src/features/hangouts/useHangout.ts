import {
  collection,
  onSnapshot,
  query,
  where,
  type Timestamp,
} from "firebase/firestore";
import { useEffect, useState } from "react";

import { useAuth } from "@/features/auth/AuthContext";
import type { ChallengeKind } from "@/features/challenges/pool";
import { db } from "@/services/firebase";

export type Member = { id: string; name: string };

export type HangoutChallenge = {
  id: string;
  defId: string;
  kind: ChallengeKind;
  prompt: string;
  issuedAt: number;
};

export type Hangout = {
  id: string;
  code: string;
  hostUid: string;
  endsAt: number;
  members: Member[]; // everyone, including you
  challenge: HangoutChallenge | null;
};

/** Your current active hangout, or null if you're not in one. */
export function useHangout() {
  const { user } = useAuth();
  const uid = user?.uid;
  const [hangout, setHangout] = useState<Hangout | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setHangout(null);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "hangouts"),
      where("members", "array-contains", uid),
    );

    return onSnapshot(
      q,
      (snap) => {
        const now = Date.now();

        const live = snap.docs
          // 'estimate' fills in server timestamps that haven't round-tripped yet,
          // so a just-issued challenge has a time instead of null.
          .map((d) => ({
            id: d.id,
            data: d.data({ serverTimestamps: "estimate" }),
          }))
          .filter(
            ({ data }) =>
              data.status === "active" &&
              (data.endsAt as Timestamp).toMillis() > now,
          )
          .sort(
            (a, b) =>
              (b.data.endsAt as Timestamp).toMillis() -
              (a.data.endsAt as Timestamp).toMillis(),
          );

        const top = live[0];
        if (!top) {
          setHangout(null);
        } else {
          const names = (top.data.memberNames ?? {}) as Record<string, string>;
          const c = top.data.challenge;
          setHangout({
            id: top.id,
            code: top.data.code as string,
            hostUid: top.data.hostUid as string,
            endsAt: (top.data.endsAt as Timestamp).toMillis(),
            members: (top.data.members as string[]).map((id) => ({
              id,
              name: names[id] ?? "Friend",
            })),
            challenge: c
              ? {
                  id: c.id as string,
                  defId: c.defId as string,
                  kind: c.kind as ChallengeKind,
                  prompt: c.prompt as string,
                  issuedAt: (c.issuedAt as Timestamp | null)?.toMillis() ?? now,
                }
              : null,
          });
        }
        setLoading(false);
      },
      (err) => {
        console.warn("hangout listener failed", err);
        setLoading(false);
      },
    );
  }, [uid]);

  return { hangout, loading };
}
