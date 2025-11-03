
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
  Timestamp,
  type DocumentData,
  type QueryDocumentSnapshot,
  where, // Keep for status filtering
  getCountFromServer
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { generateNextOsNumber } from './counterService';
import { z } from 'zod';

export const ServiceOrderStatusSchema = z.enum(["Aberta", "Em andamento", "Aguardando peça", "Concluída", "Entregue", "Cancelada"]);
export type ServiceOrderStatus = z.infer<typeof ServiceOrderStatusSchema>;

export const DeviceTypeSchema = z.enum(["Celular", "Notebook", "Tablet", "Placa", "Outro"]);
export type DeviceType = z.infer<typeof DeviceTypeSchema>;

export const SoldProductItemInputSchema = z.object({
  name: z.string(),
  quantity: z.number().min(1),
  unitPrice: z.number(),
  totalPrice: z.number(),
});
export type SoldProductItemInput = z.infer<typeof SoldProductItemInputSchema>;


export const ServiceOrderInputSchema = z.object({
  deliveryForecastDate: z.string().nullable(),
  status: ServiceOrderStatusSchema,
  responsibleTechnicianName: z.string().nullable(),
  clientName: z.string().min(1, "Nome do cliente é obrigatório"),
  clientCpfCnpj: z.string().nullable(),
  clientPhone: z.string().nullable(),
  clientEmail: z.string().email().nullable().or(z.literal('')),
  deviceType: DeviceTypeSchema.nullable(),
  deviceBrandModel: z.string().min(1, "Marca/Modelo é obrigatório"),
  deviceImeiSerial: z.string().nullable(),
  deviceColor: z.string().nullable(),
  deviceAccessories: z.string().nullable(),
  problemReportedByClient: z.string().min(1, "O relato do problema é obrigatório"),
  technicalDiagnosis: z.string().nullable(),
  internalObservations: z.string().nullable(),
  servicesPerformedDescription: z.string().nullable(),
  partsUsedDescription: z.string().nullable(),
  serviceManualValue: z.number().nonnegative(),
  additionalSoldProducts: z.array(SoldProductItemInputSchema),
  grandTotalValue: z.number().nonnegative(),
});

export type ServiceOrderInput = z.infer<typeof ServiceOrderInputSchema>;

export interface ServiceOrder extends ServiceOrderInput {
  id: string; // Firestore ID
  osNumber: number;
  openingDate: Date | Timestamp;
  updatedAt?: Date | Timestamp;
}

const SERVICE_ORDERS_COLLECTION = 'serviceOrders';

const serviceOrderFromDoc = (docSnap: QueryDocumentSnapshot<DocumentData>): ServiceOrder => {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    osNumber: data.osNumber || 0,
    deliveryForecastDate: data.deliveryForecastDate || null,
    status: data.status || "Aberta",
    responsibleTechnicianName: data.responsibleTechnicianName || null,
    clientName: data.clientName || '',
    clientCpfCnpj: data.clientCpfCnpj || null,
    clientPhone: data.clientPhone || null,
    clientEmail: data.clientEmail || null,
    deviceType: data.deviceType || null,
    deviceBrandModel: data.deviceBrandModel || '',
    deviceImeiSerial: data.deviceImeiSerial || null,
    deviceColor: data.deviceColor || null,
    deviceAccessories: data.deviceAccessories || null,
    problemReportedByClient: data.problemReportedByClient || '',
    technicalDiagnosis: data.technicalDiagnosis || null,
    internalObservations: data.internalObservations || null,
    servicesPerformedDescription: data.servicesPerformedDescription || null,
    partsUsedDescription: data.partsUsedDescription || null,
    serviceManualValue: data.serviceManualValue || 0,
    additionalSoldProducts: data.additionalSoldProducts || [],
    grandTotalValue: data.grandTotalValue || 0,
    openingDate: (data.openingDate instanceof Timestamp) ? data.openingDate.toDate() : (data.openingDate || new Date()),
    updatedAt: (data.updatedAt instanceof Timestamp) ? data.updatedAt.toDate() : data.updatedAt,
  };
};

export const addServiceOrder = async (orderData: ServiceOrderInput): Promise<number> => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Usuário não autenticado.");

  const osNumber = await generateNextOsNumber();
  const docRef = await addDoc(collection(db, SERVICE_ORDERS_COLLECTION), {
    ...orderData,
    osNumber: osNumber,
    openingDate: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return osNumber; 
};

export const getServiceOrders = async (): Promise<ServiceOrder[]> => {
  const currentUser = auth.currentUser;
  if (!currentUser) return [];

  const q = query(
    collection(db, SERVICE_ORDERS_COLLECTION),
    orderBy('osNumber', 'desc')
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(serviceOrderFromDoc);
};

export const updateServiceOrder = async (id: string, orderData: Partial<Omit<ServiceOrder, 'id' | 'osNumber' | 'openingDate'>>): Promise<void> => {
  const orderRef = doc(db, SERVICE_ORDERS_COLLECTION, id);
  await updateDoc(orderRef, {
    ...orderData,
    updatedAt: serverTimestamp(),
  });
};

export const deleteServiceOrder = async (id: string): Promise<string> => {
  const orderRef = doc(db, SERVICE_ORDERS_COLLECTION, id);
  await deleteDoc(orderRef);
  return id; 
};

export const getServiceOrdersByDateRangeAndStatus = async (
  startDate?: Date, 
  endDate?: Date, 
  status?: ServiceOrderStatus | "Todos"
): Promise<ServiceOrder[]> => {
  const currentUser = auth.currentUser;
  if (!currentUser) return [];

  let conditions: any[] = [];
  if (startDate) {
    conditions.push(where('openingDate', '>=', Timestamp.fromDate(startDate)));
  }
  if (endDate) {
    const endOfDay = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999);
    conditions.push(where('openingDate', '<=', Timestamp.fromDate(endOfDay)));
  }
  if (status && status !== "Todos") {
    conditions.push(where('status', '==', status));
  }

  const q = query(
    collection(db, SERVICE_ORDERS_COLLECTION),
    ...conditions,
    orderBy('openingDate', 'desc')
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(serviceOrderFromDoc);
};

export const getCountOfOpenServiceOrders = async (): Promise<number> => {
  const currentUser = auth.currentUser;
  if (!currentUser) return 0;

  const openStatuses: ServiceOrderStatus[] = ["Aberta", "Em andamento", "Aguardando peça"];
  const q = query(
    collection(db, SERVICE_ORDERS_COLLECTION),
    where('status', 'in', openStatuses)
  );
  const snapshot = await getCountFromServer(q);
  return snapshot.data().count;
};

export const getTotalCompletedServiceOrdersRevenue = async (): Promise<number> => {
  const currentUser = auth.currentUser;
  if (!currentUser) return 0;

  const q = query(
    collection(db, SERVICE_ORDERS_COLLECTION),
    where('status', 'in', ['Concluída', 'Entregue'])
  );
  const querySnapshot = await getDocs(q);
  let totalRevenue = 0;
  querySnapshot.forEach((docSnap) => {
    totalRevenue += (docSnap.data().grandTotalValue as number) || 0;
  });
  return totalRevenue;
};

    