
import {
  collection,
  addDoc,
  serverTimestamp,
  Timestamp,
  type DocumentData,
  type QueryDocumentSnapshot,
  getDocs,
  query,
  orderBy,
  where, // Keep for status/date filtering
  doc,
  updateDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Sale, SaleInput } from '@/lib/schemas/sale';
import { generateNextSaleNumber } from './counterService';

// Re-exporting types from schema file for external use
export type { PaymentMethod, CartItemInput, SaleInput, Sale, SaleStatus } from '@/lib/schemas/sale';

const SALES_COLLECTION = 'sales';

const saleFromDoc = (docSnap: QueryDocumentSnapshot<DocumentData>): Sale => {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    saleNumber: data.saleNumber || 0,
    clientName: data.clientName || null,
    items: data.items || [],
    paymentMethod: data.paymentMethod || null,
    totalAmount: data.totalAmount || 0,
    createdAt: (data.createdAt instanceof Timestamp) ? data.createdAt.toDate() : (data.createdAt || new Date()),
    status: data.status || "Concluída",
    cancellationReason: data.cancellationReason || null,
    cancelledAt: data.cancelledAt instanceof Timestamp ? data.cancelledAt.toDate() : (data.cancelledAt || null),
  };
};

export const addSale = async (saleData: Omit<SaleInput, 'saleNumber'>): Promise<{saleId: string, saleNumber: number}> => {
  // const user = auth.currentUser;
  // if (!user) throw new Error("Usuário não autenticado.");

  const saleNumber = await generateNextSaleNumber();

  const docRef = await addDoc(collection(db, SALES_COLLECTION), {
    ...saleData,
    saleNumber: saleNumber,
    status: "Concluída",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(), // Add updatedAt for consistency
  });
  return { saleId: docRef.id, saleNumber }; 
};

export const getSales = async (): Promise<Sale[]> => {
  // const user = auth.currentUser;
  // if (!user) return [];

  const q = query(
    collection(db, SALES_COLLECTION),
    orderBy('saleNumber', 'desc')
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(saleFromDoc);
};

export const cancelSale = async (saleId: string, reason: string): Promise<void> => {
  const saleRef = doc(db, SALES_COLLECTION, saleId);
  await updateDoc(saleRef, {
    status: "Cancelada",
    cancellationReason: reason,
    cancelledAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  // TODO: Implementar lógica para reverter o estoque dos produtos vendidos.
};


export const getSalesByDateRange = async (startDate: Date, endDate: Date): Promise<Sale[]> => {
  // const user = auth.currentUser;
  // if (!user) return [];

  const startTimestamp = Timestamp.fromDate(startDate);
  const endTimestamp = Timestamp.fromDate(new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999));

  const q = query(
    collection(db, SALES_COLLECTION),
    where('createdAt', '>=', startTimestamp),
    where('createdAt', '<=', endTimestamp),
    orderBy('createdAt', 'desc')
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(saleFromDoc);
};

export const getTotalSalesRevenue = async (): Promise<number> => {
  // const user = auth.currentUser;
  // if (!user) return 0;

  const q = query(
    collection(db, SALES_COLLECTION),
    where('status', '==', 'Concluída')
  );
  const querySnapshot = await getDocs(q);
  let totalRevenue = 0;
  querySnapshot.forEach((docSnap) => {
    totalRevenue += (docSnap.data().totalAmount as number) || 0;
  });
  return totalRevenue;
};
