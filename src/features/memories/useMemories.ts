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

export type Memory = {
  id: string;
  hangoutId: string;
  prompt: string;
  kind: ChallengeKind;
  authorUid: string;
  authorName: string;
  text: string | null;
  photo: string | null; // base64 JPEG
  createdAt: number;
};

export function useMemories() {
  const { user } = useAuth();
  const uid = user?.uid;
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setMemories([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "memories"),
      where("audience", "array-contains", uid),
    );

    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs
          .map((d) => {
            const data = d.data({ serverTimestamps: "estimate" });
            return {
              id: d.id,
              hangoutId: data.hangoutId as string,
              prompt: data.prompt as string,
              kind: data.kind as ChallengeKind,
              authorUid: data.authorUid as string,
              authorName: data.authorName as string,
              text: (data.text as string | null) ?? null,
              photo: (data.photo as string | null) ?? null,
              createdAt:
                (data.createdAt as Timestamp | null)?.toMillis() ?? Date.now(),
            };
          })
          // Sorted here instead of in the query, so no Firestore index is needed.
          .sort((a, b) => b.createdAt - a.createdAt);

        setMemories(list);
        setLoading(false);
      },
      (err) => {
        console.warn("memories listener failed", err);
        setLoading(false);
      },
    );
  }, [uid]);

  return { memories, loading };
}
