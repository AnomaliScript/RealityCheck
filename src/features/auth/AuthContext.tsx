import {
  signOut as firebaseSignOut,
  onAuthStateChanged,
  signInAnonymously,
  updateProfile,
} from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { auth, db } from "@/services/firebase";

export type User = {
  uid: string;
  displayName: string;
};

type AuthValue = {
  user: User | null;
  isLoading: boolean;
  signIn: (displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (fbUser) => {
      // No name yet means sign-up didn't finish, so treat it as signed out.
      setUser(
        fbUser && fbUser.displayName
          ? { uid: fbUser.uid, displayName: fbUser.displayName }
          : null,
      );
      setIsLoading(false);
    });
  }, []);

  const signIn = useCallback(async (displayName: string) => {
    const name = displayName.trim().slice(0, 30);

    // Reuse an account from a half-finished sign-up instead of making a new one.
    const fbUser = auth.currentUser ?? (await signInAnonymously(auth)).user;

    await setDoc(
      doc(db, "users", fbUser.uid),
      { displayName: name, createdAt: serverTimestamp() },
      { merge: true },
    );
    await updateProfile(fbUser, { displayName: name });

    setUser({ uid: fbUser.uid, displayName: name });
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, signIn, signOut }),
    [user, isLoading, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
