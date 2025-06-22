import { collection, doc, setDoc, getDocs, updateDoc, query, where, limit, getDoc } from 'firebase/firestore';
import { db } from './firebase';

export interface AppUser {
  uid: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export const addUserToFirestore = async (user: AppUser) => {
  try {
    await setDoc(doc(db, 'users', user.uid), user);
  } catch (e) {
    console.error('Error adding user to Firestore: ', e);
    throw new Error('Failed to add user to Firestore');
  }
};

export const getUsers = async (): Promise<AppUser[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, 'users'));
    return querySnapshot.docs.map((doc) => doc.data() as AppUser);
  } catch (e) {
    console.error('Error getting users: ', e);
    throw new Error('Failed to fetch users');
  }
};

export const getUserByUsername = async (username: string): Promise<AppUser | null> => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('name', '==', username), limit(1));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return null;
    }

    return querySnapshot.docs[0].data() as AppUser;
  } catch (e) {
    console.error('Error getting user by username: ', e);
    throw new Error('Failed to fetch user by username');
  }
};

export const getUser = async (uid: string): Promise<AppUser | null> => {
  try {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data() as AppUser;
    } else {
      return null;
    }
  } catch (e) {
    console.error('Error getting user: ', e);
    throw new Error('Failed to fetch user');
  }
};

export const updateUserAvatar = async (uid: string, avatarUrl: string) => {
  try {
    await updateDoc(doc(db, 'users', uid), { avatarUrl });
  } catch (e) {
    console.error('Error updating user avatar: ', e);
    throw new Error('Failed to update user avatar');
  }
}; 