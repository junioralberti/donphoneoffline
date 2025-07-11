
'use server';

import { 
  getDocs, 
  collection, 
  writeBatch, 
  doc,
  deleteDoc,
  setDoc,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

const COLLECTIONS_TO_BACKUP = [
  'clients', 
  'products', 
  'providers', 
  'sales', 
  'serviceOrders', 
  'expenses',
  'systemSettings',
  'users'
];

// Helper function to serialize data, converting Timestamps to a specific string format
const serializeData = (data: any): any => {
  if (data === null || data === undefined) {
    return data;
  }
  if (data instanceof Timestamp) {
    return { __datatype__: 'timestamp', value: data.toDate().toISOString() };
  }
  if (Array.isArray(data)) {
    return data.map(serializeData);
  }
  if (typeof data === 'object') {
    const serializedObject: { [key: string]: any } = {};
    for (const key in data) {
      serializedObject[key] = serializeData(data[key]);
    }
    return serializedObject;
  }
  return data;
};

// Helper function to deserialize data, converting strings back to Timestamps
const deserializeData = (data: any): any => {
  if (data === null || data === undefined) {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map(deserializeData);
  }
  if (typeof data === 'object' && data !== null && data.__datatype__ === 'timestamp') {
    return Timestamp.fromDate(new Date(data.value));
  }
  if (typeof data === 'object' && data !== null) {
    // Remove o campo userId obsoleto durante a desserialização para garantir a compatibilidade
    // com as regras de segurança e schemas atuais.
    if ('userId' in data) {
      delete data.userId;
    }
    
    const deserializedObject: { [key: string]: any } = {};
    for (const key in data) {
      deserializedObject[key] = deserializeData(data[key]);
    }
    return deserializedObject;
  }
  return data;
};

export async function exportDatabase(): Promise<Record<string, any>> {
  const backupData: Record<string, any> = {};

  for (const collectionName of COLLECTIONS_TO_BACKUP) {
    try {
      const collectionRef = collection(db, collectionName);
      const snapshot = await getDocs(collectionRef);
      const docs: Record<string, any> = {};
      snapshot.forEach(doc => {
        docs[doc.id] = serializeData(doc.data());
      });
      backupData[collectionName] = docs;
      console.log(`Successfully backed up ${snapshot.size} documents from ${collectionName}`);
    } catch (error) {
      console.error(`Error backing up collection ${collectionName}:`, error);
      throw new Error(`Falha ao fazer backup da coleção ${collectionName}.`);
    }
  }

  return backupData;
}


export async function importDatabase(data: Record<string, any>): Promise<void> {
  // Validate that the data looks like a backup file
  const collectionsInData = Object.keys(data);
  if (collectionsInData.length === 0 || !COLLECTIONS_TO_BACKUP.some(c => collectionsInData.includes(c))) {
      throw new Error("O arquivo de backup parece estar vazio ou em um formato inválido.");
  }

  console.log("Starting database import. This will delete existing data.");

  // 1. Delete all documents in existing collections
  for (const collectionName of COLLECTIONS_TO_BACKUP) {
    try {
      const collectionRef = collection(db, collectionName);
      const snapshot = await getDocs(collectionRef);
      if (snapshot.empty) continue;

      const deleteBatch = writeBatch(db);
      snapshot.docs.forEach(doc => {
        deleteBatch.delete(doc.ref);
      });
      await deleteBatch.commit();
      console.log(`Successfully deleted ${snapshot.size} documents from ${collectionName}.`);
    } catch (error) {
      console.error(`Error deleting collection ${collectionName}:`, error);
      throw new Error(`Falha ao limpar a coleção ${collectionName} antes de importar.`);
    }
  }

  // 2. Import new data
  for (const collectionName of collectionsInData) {
    if (!COLLECTIONS_TO_BACKUP.includes(collectionName)) {
        console.warn(`Skipping unknown collection "${collectionName}" from backup file.`);
        continue;
    }
    const collectionData = data[collectionName];
    if (typeof collectionData !== 'object' || collectionData === null) continue;

    try {
      const writeBatch = writeBatch(db);
      let count = 0;
      for (const docId in collectionData) {
        const docData = collectionData[docId];
        const docRef = doc(db, collectionName, docId);
        // Deserialize Timestamps before writing
        const deserializedDocData = deserializeData(docData);
        writeBatch.set(docRef, deserializedDocData);
        count++;
      }
      await writeBatch.commit();
      console.log(`Successfully imported ${count} documents into ${collectionName}.`);
    } catch (error) {
       console.error(`Error importing collection ${collectionName}:`, error);
       throw new Error(`Falha ao importar dados para a coleção ${collectionName}.`);
    }
  }
  console.log("Database import completed successfully.");
}
