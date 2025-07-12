
"use client";

import type React from 'react';
import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { onAuthStateChanged, signOut, type User as FirebaseUserType } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getUserById } from '@/services/userService';
import { Loader2 } from 'lucide-react';
import type { User } from '@/lib/schemas/user';

interface AuthContextType {
  isAuthenticated: boolean;
  firebaseUser: FirebaseUserType | null;
  firestoreUser: User | null; // Changed from user to firestoreUser
  login: (firestoreData: User, authData: FirebaseUserType) => void;
  logout: () => void;
  userRole: User['role'] | null; // Use User['role'] for type safety
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUserType | null>(null);
  const [firestoreUser, setFirestoreUser] = useState<User | null>(null); // State for Firestore user data
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      if (user) {
        const userDataFromFirestore = await getUserById(user.uid);
        if (userDataFromFirestore) {
          setFirebaseUser(user);
          setFirestoreUser(userDataFromFirestore);
        } else {
          console.error("User in Auth but no data in Firestore. Logging out.");
          await signOut(auth); // Will trigger this callback again with user = null
          setFirebaseUser(null);
          setFirestoreUser(null);
        }
      } else {
        setFirebaseUser(null);
        setFirestoreUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const isAuthenticated = !!firebaseUser && !!firestoreUser;
  const userRole = firestoreUser?.role || null;

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated && pathname !== '/') {
        router.push('/');
      } else if (isAuthenticated && pathname === '/') {
        router.push('/dashboard');
      }
    }
  }, [isAuthenticated, loading, pathname, router]);

  const login = (firestoreData: User, authData: FirebaseUserType) => {
    setFirestoreUser(firestoreData);
    setFirebaseUser(authData);
  };

  const logout = async () => {
    await signOut(auth);
    setFirebaseUser(null);
    setFirestoreUser(null);
    router.push('/');
  };
  
  if (loading) {
     return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /> <p className="ml-2">Carregando autenticação...</p></div>;
  }
  
  if (!isAuthenticated && pathname !== '/') {
    return null; 
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, firebaseUser, firestoreUser, login, logout, userRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
