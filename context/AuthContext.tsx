'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  updateProfile
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { addUserToFirestore, getUserByUsername, getUser } from '@/lib/users';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const login = async (identifier: string, password: string) => {
    try {
      let email = identifier;
      // Check if the identifier is a username (doesn't contain '@')
      if (!identifier.includes('@')) {
        const user = await getUserByUsername(identifier);
        if (user && user.email) {
          email = user.email;
        } else {
          throw new Error('User not found. Please check your username or email.');
        }
      }
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/home');
    } catch (error: any) {
      toast.error(error.message || 'Failed to log in');
      throw error;
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: name });
      
      await addUserToFirestore({
        uid: userCredential.user.uid,
        name,
        email,
      });

      setCurrentUser(userCredential.user);
      router.push('/home');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create account');
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      router.push('/login');
    } catch (error: any) {
      toast.error(error.message || 'Failed to log out');
      throw error;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
      setCurrentUser(user);

      // Self-healing: Ensure user exists in Firestore on auth change
      if (user) {
        const firestoreUser = await getUser(user.uid);
        if (!firestoreUser) {
          console.log('User document not found in Firestore, creating one...');
          await addUserToFirestore({
            uid: user.uid,
            name: user.displayName || 'Unnamed User',
            email: user.email || '',
          });
        }
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value: AuthContextType = {
    currentUser,
    loading,
    login,
    register,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
