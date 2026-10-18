import {
    collection,
    doc,
    getDoc,
    onSnapshot,
    query,
    where,
} from "firebase/firestore";
import { useEffect, useState } from "react";

import { useAuth } from "@/features/auth/AuthContext";
import { db } from "@/services/firebase";

export type Friend = { id: string; name: string };

export function useFriends() {
  const { user } = useAuth();
  const uid = user?.uid;
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setFriends([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const q = query(
      collection(db, "friendships"),
      where("members", "array-contains", uid),
    );

    const unsubscribe = onSnapshot(
      q,
      async (snap) => {
        const ids = snap.docs
          .map((d) => (d.data().members as string[]).find((m) => m !== uid))
          .filter((id): id is string => !!id);

        const loaded = await Promise.all(
          ids.map(async (id) => {
            const profile = await getDoc(doc(db, "users", id));
            const name = profile.data()?.displayName as string | undefined;
            return { id, name: name ?? "Friend" };
          }),
        );

        if (cancelled) return;
        setFriends(loaded.sort((a, b) => a.name.localeCompare(b.name)));
        setLoading(false);
      },
      (err) => {
        console.warn("friends listener failed", err);
        if (!cancelled) setLoading(false);
      },
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [uid]);

  return { friends, loading };
}
