"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  getBackendProfile,
  subscribeBackendSession,
  type BackendProfile,
} from "@/lib/backend-user";
import { restoreBackendSession } from "@/lib/authenticated-fetch";

type AuthContextValue = {
  user: User | null;
  backendUser: BackendProfile | null;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  backendUser: null,
  isLoading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [backendUser, setBackendUser] = useState<BackendProfile | null>(() => getBackendProfile());
  const [isFirebaseLoading, setIsFirebaseLoading] = useState(true);
  const [isBackendLoading, setIsBackendLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setIsFirebaseLoading(false);
    });
  }, []);

  useEffect(() => subscribeBackendSession(setBackendUser), []);

  useEffect(() => {
    let cancelled = false;
    restoreBackendSession()
      .catch((error) => console.warn("กู้คืนเซสชันไม่สำเร็จ", error))
      .finally(() => {
        if (!cancelled) setIsBackendLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handleExpiredSession = () => {
      setUser(null);
      void signOut(auth);
    };
    window.addEventListener("backend-auth-expired", handleExpiredSession);
    return () => window.removeEventListener("backend-auth-expired", handleExpiredSession);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, backendUser, isLoading: isFirebaseLoading || isBackendLoading }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

