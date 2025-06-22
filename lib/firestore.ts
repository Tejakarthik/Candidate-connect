import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
  deleteDoc,
  limit,
  startAfter,
  getDoc,
  QueryDocumentSnapshot,
  DocumentData,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import { AppUser } from './users';

export interface Candidate {
  id: string;
  name: string;
  email: string;
  phone?: string;
  location?: string;
  experience?: string;
  role?: string;
  status: 'active' | 'interviewed' | 'pending' | 'hired' | 'rejected';
  assignedUsers: string[];
  createdBy: string;
  createdAt?: any;
}

export type NewCandidate = Omit<Candidate, 'id'>;

export interface HistoryEvent {
  id: string;
  timestamp: any; // Firestore serverTimestamp
  authorId: string;
  authorName: string;
  action: string; // e.g., 'Created', 'Status Updated', 'Note Edited', 'User Added'
  details: string; // e.g., 'Status changed from pending to active'
}

export type NewHistoryEvent = Omit<HistoryEvent, 'id' | 'timestamp'>;

export interface Note {
  id: string;
  text: string;
  authorId: string;
  authorName: string;
  createdAt: any; // Firestore serverTimestamp
  mentions?: string[]; // Array of user UIDs
}

export type NewNote = Omit<Note, 'id' | 'createdAt'>;

export interface Notification {
  id: string;
  candidateId: string;
  candidateName: string;
  noteId: string;
  messagePreview: string;
  isRead: boolean;
  createdAt: any; // Firestore serverTimestamp
}

export type NewNotification = Omit<Notification, 'id' | 'createdAt'>;

export const addCandidate = async (candidateData: NewCandidate) => {
  try {
    const docRef = await addDoc(collection(db, 'candidates'), candidateData);
    return docRef.id;
  } catch (e) {
    console.error('Error adding document: ', e);
    throw new Error('Failed to add candidate');
  }
};

export const getCandidates = async (userId: string): Promise<Candidate[]> => {
  try {
    const candidatesRef = collection(db, 'candidates');
    const q = query(candidatesRef, where('assignedUsers', 'array-contains', userId));
    const querySnapshot = await getDocs(q);
    const candidates = querySnapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        } as Candidate)
    );
    return candidates;
  } catch (e) {
    console.error('Error getting documents: ', e);
    throw new Error('Failed to fetch candidates');
  }
};

export const updateCandidateStatus = async (
  id: string,
  status: 'active' | 'interviewed' | 'pending' | 'hired' | 'rejected'
) => {
  try {
    const candidateRef = doc(db, 'candidates', id);
    await updateDoc(candidateRef, { status });
  } catch (e) {
    console.error('Error updating document: ', e);
    throw new Error('Failed to update candidate status');
  }
};

export const addNote = async (candidateId: string, note: NewNote) => {
  try {
    const notesCollectionRef = collection(db, 'candidates', candidateId, 'notes');
    const docRef = await addDoc(notesCollectionRef, {
      ...note,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (e) {
    console.error('Error adding note: ', e);
    throw new Error('Failed to add note');
  }
};

export const getNotes = (candidateId: string, callback: (notes: Note[]) => void) => {
  const notesCollectionRef = collection(db, 'candidates', candidateId, 'notes');
  const q = query(notesCollectionRef, orderBy('createdAt', 'asc'));

  return onSnapshot(q, (querySnapshot) => {
    const notes = querySnapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        } as Note)
    );
    callback(notes);
  });
};

export const createNotification = async (userId: string, notification: NewNotification) => {
  try {
    const notificationsCollectionRef = collection(db, 'users', userId, 'notifications');
    await addDoc(notificationsCollectionRef, {
      ...notification,
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    console.error('Error creating notification: ', e);
    throw new Error('Failed to create notification');
  }
};

export const getNotifications = (userId: string, callback: (notifications: Notification[]) => void) => {
  const notificationsCollectionRef = collection(db, 'users', userId, 'notifications');
  const q = query(notificationsCollectionRef, orderBy('createdAt', 'desc'));

  return onSnapshot(q, (querySnapshot) => {
    const notifications = querySnapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        } as Notification)
    );
    callback(notifications);
  });
};

export const markNotificationAsRead = async (userId: string, notificationId: string) => {
  try {
    const notificationRef = doc(db, 'users', userId, 'notifications', notificationId);
    await updateDoc(notificationRef, { isRead: true });
  } catch (e) {
    console.error('Error updating notification: ', e);
    throw new Error('Failed to mark notification as read');
  }
};

export const deleteCandidate = async (candidateId: string) => {
  try {
    const candidateRef = doc(db, 'candidates', candidateId);
    await deleteDoc(candidateRef);
  } catch (e) {
    console.error('Error deleting document: ', e);
    throw new Error('Failed to delete candidate');
  }
};

export const getNotesPaginated = async (
  candidateId: string,
  pageSize: number,
  lastDoc?: QueryDocumentSnapshot<DocumentData>
): Promise<{ notes: Note[]; lastDoc: QueryDocumentSnapshot<DocumentData> | null }> => {
  const notesCollectionRef = collection(db, 'candidates', candidateId, 'notes');
  let q = query(notesCollectionRef, orderBy('createdAt', 'desc'), limit(pageSize));
  if (lastDoc) {
    q = query(notesCollectionRef, orderBy('createdAt', 'desc'), startAfter(lastDoc), limit(pageSize));
  }
  const querySnapshot = await getDocs(q);
  const notes = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Note));
  const last = querySnapshot.docs.length > 0 ? querySnapshot.docs[querySnapshot.docs.length - 1] : null;
  return { notes, lastDoc: last };
};

export const updateNote = async (candidateId: string, noteId: string, newText: string) => {
  try {
    const noteRef = doc(db, 'candidates', candidateId, 'notes', noteId);
    await updateDoc(noteRef, { text: newText });
  } catch (e) {
    console.error('Error updating note: ', e);
    throw new Error('Failed to update note');
  }
};

export const deleteNote = async (candidateId: string, noteId: string) => {
  try {
    const noteRef = doc(db, 'candidates', candidateId, 'notes', noteId);
    await deleteDoc(noteRef);
  } catch (e) {
    console.error('Error deleting note: ', e);
    throw new Error('Failed to delete note');
  }
};

export const getHistoryEvents = (candidateId: string, callback: (events: HistoryEvent[]) => void) => {
  const historyCollectionRef = collection(db, 'candidates', candidateId, 'history');
  const q = query(historyCollectionRef, orderBy('timestamp', 'desc'));

  return onSnapshot(q, (querySnapshot) => {
    const events = querySnapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        } as HistoryEvent)
    );
    callback(events);
  });
};

export const addHistoryEvent = async (candidateId: string, event: NewHistoryEvent) => {
  try {
    const historyCollectionRef = collection(db, 'candidates', candidateId, 'history');
    await addDoc(historyCollectionRef, {
      ...event,
      timestamp: serverTimestamp(),
    });
  } catch (e) {
    console.error('Error logging history event: ', e);
    // We probably don't want to throw an error here and stop the parent operation
    // Just log it for now.
  }
}; 