import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * STUB. Replace with Firebase Auth once services/firebase.ts exists.
 *
 * When you do, use initializeAuth — NOT getAuth, which doesn't persist on
 * React Native and signs users out on every cold start:
 *
 *   import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
 *   import AsyncStorage from '@react-native-async-storage/async-storage';
 *   const auth = initializeAuth(app, {
 *     persistence: getReactNativePersistence(AsyncStorage),
 *   });
 *
 * The shape below matches what onAuthStateChanged gives you, so the swap
 * stays local to this file.
 */

export type User = {
  uid: string;
  displayName: string | null;
};

type AuthValue = {
  user: User | null;
  isLoading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Stands in for onAuthStateChanged resolving on launch.
  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 250);
    return () => clearTimeout(t);
  }, []);

  const signIn = useCallback(async () => {
    setUser({ uid: "dev-user", displayName: "You" });
  }, []);

  const signOut = useCallback(async () => {
    setUser(null);
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
