
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

// Tipo para dados que realmente serão salvos no Firestore (sem senhas).
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
    createdAt: (data.createdAt as Timestamp)?.toDate(),
    updatedAt: (data.updatedAt as Timestamp)?.toDate(),
  };
};

export const addUser = async (userData: CreateUserFormData): Promise<string> => {
  if (!userData.email || !userData.password) {
    throw new Error('E-mail e senha são obrigatórios para criar um usuário no Firebase Auth.');
  }

  // 1. Criar usuário no Firebase Authentication
  const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
  const uid = userCredential.user.uid;

  // 2. Preparar dados para salvar no Firestore (sem senha)
  const storableData: StorableUserData & { createdAt: any; updatedAt: any } = {
    name: userData.name,
    email: userData.email,
    role: userData.role || 'user',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  // 3. Salvar dados do usuário no Firestore usando o UID do Auth como ID do documento
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
  await updateDoc(userRef, {
    ...userData,
    updatedAt: serverTimestamp(),
  });
};

export const deleteUser = async (id: string): Promise<void> => {
  const userRef = doc(db, USERS_COLLECTION, id);
  // Nota: Excluir um usuário aqui APENAS remove o registro do Firestore.
  // A exclusão do Firebase Authentication deve ser tratada separadamente se necessário.
  // Para este sistema, a conta Auth permanece, mas o usuário não terá 'role' e não poderá logar com sucesso na lógica atual.
  await deleteDoc(userRef);
};
