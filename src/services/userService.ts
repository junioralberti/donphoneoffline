
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
  Timestamp,
  type DocumentData,
  type QueryDocumentSnapshot,
  type DocumentSnapshot,
} from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import type { User, UserRole, CreateUserFormData } from '@/lib/schemas/user';

const USERS_COLLECTION = 'users';

// Type for data that will actually be stored in Firestore (without passwords).
type StorableUserData = Omit<User, 'id' | 'password' | 'confirmPassword' | 'createdAt' | 'updatedAt'>;

const userFromDoc = (docSnap: QueryDocumentSnapshot<DocumentData> | DocumentSnapshot<DocumentData>): User => {
  const data = docSnap.data();
  if (!data) {
    throw new Error("Document data is empty.");
  }
  return {
    id: docSnap.id,
    name: data.name || '',
    email: data.email || '',
    role: data.role || 'user',
    createdAt: (data.createdAt instanceof Timestamp) ? data.createdAt.toDate() : (data.createdAt ? String(data.createdAt) : new Date()),
    updatedAt: (data.updatedAt instanceof Timestamp) ? data.updatedAt.toDate() : (data.updatedAt ? String(data.updatedAt) : new Date()),
  };
};

export const addUser = async (userData: CreateUserFormData): Promise<string> => {
  const email = userData.email?.toLowerCase().trim();
  const password = userData.password;

  if (!email || !password) {
    throw new Error('E-mail e senha são obrigatórios para criar um usuário no Firebase Auth.');
  }

  // 1. Create user in Firebase Authentication
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const uid = userCredential.user.uid;

  // 2. Prepare data to save in Firestore (without password)
  const storableData: StorableUserData & { createdAt: any; updatedAt: any } = {
    name: userData.name,
    email: email, // Use the sanitized email
    role: userData.role || 'user',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  // 3. Save user data in Firestore using the Auth UID as the document ID
  const userDocRef = doc(db, USERS_COLLECTION, uid);
  await setDoc(userDocRef, storableData);

  return uid;
};

export const getUsers = async (): Promise<User[]> => {
  const q = query(collection(db, USERS_COLLECTION), orderBy('name', 'asc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(userFromDoc);
};

export const getUserById = async (userId: string): Promise<User | null> => {
  if (!userId) return null;
  const userDocRef = doc(db, USERS_COLLECTION, userId);
  const docSnap = await getDoc(userDocRef);
  if (docSnap.exists()) {
    return userFromDoc(docSnap);
  }
  return null;
};

export const updateUser = async (id: string, userData: Partial<StorableUserData>): Promise<void> => {
  const userRef = doc(db, USERS_COLLECTION, id);
  // Sanitize email just in case it's part of the update, although it's disabled in the form.
  const dataToUpdate = { ...userData };
  if (dataToUpdate.email) {
    dataToUpdate.email = dataToUpdate.email.toLowerCase().trim();
  }

  await updateDoc(userRef, {
    ...dataToUpdate,
    updatedAt: serverTimestamp(),
  });
};


export const deleteUser = async (id: string): Promise<void> => {
  const userRef = doc(db, USERS_COLLECTION, id);
  // Note: Deleting a user here ONLY removes the Firestore record.
  // The Firebase Authentication deletion must be handled separately if needed.
  // For this system, the Auth account remains, but the user will have no 'role' and will not be able to log in successfully with the current logic.
  await deleteDoc(userRef);
};
