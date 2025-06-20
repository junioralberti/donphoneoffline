
import { doc, getDoc, setDoc, runTransaction, type DocumentReference } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const COUNTERS_COLLECTION = 'systemSettings';
const SALE_COUNTER_DOC = 'salesCounter';
const OS_COUNTER_DOC = 'serviceOrdersCounter';
const STARTING_SALE_NUMBER = 149; // The first sale will be 150
const STARTING_OS_NUMBER = 200; // The first OS will be 201

interface Counter {
    lastSaleNumber: number;
}

interface OsCounter {
    lastOsNumber: number;
}

export const generateNextSaleNumber = async (): Promise<number> => {
    const counterRef = doc(db, COUNTERS_COLLECTION, SALE_COUNTER_DOC) as DocumentReference<Counter>;

    try {
        const nextSaleNumber = await runTransaction(db, async (transaction) => {
            const counterDoc = await transaction.get(counterRef);

            if (!counterDoc.exists()) {
                // Initialize the counter if it doesn't exist
                const newSaleNumber = STARTING_SALE_NUMBER + 1;
                transaction.set(counterRef, { lastSaleNumber: newSaleNumber });
                return newSaleNumber;
            }

            const currentNumber = counterDoc.data().lastSaleNumber;
            const newSaleNumber = currentNumber + 1;
            transaction.update(counterRef, { lastSaleNumber: newSaleNumber });
            return newSaleNumber;
        });
        return nextSaleNumber;
    } catch (error) {
        console.error("Error generating sale number in transaction: ", error);
        throw new Error("Não foi possível gerar o número da venda. Tente novamente.");
    }
};


export const generateNextOsNumber = async (): Promise<number> => {
    const counterRef = doc(db, COUNTERS_COLLECTION, OS_COUNTER_DOC) as DocumentReference<OsCounter>;

    try {
        const nextOsNumber = await runTransaction(db, async (transaction) => {
            const counterDoc = await transaction.get(counterRef);

            if (!counterDoc.exists()) {
                const newOsNumber = STARTING_OS_NUMBER + 1;
                transaction.set(counterRef, { lastOsNumber: newOsNumber });
                return newOsNumber;
            }

            const currentNumber = counterDoc.data().lastOsNumber;
            const newOsNumber = currentNumber + 1;
            transaction.update(counterRef, { lastOsNumber: newOsNumber });
            return newOsNumber;
        });
        return nextOsNumber;
    } catch (error) {
        console.error("Error generating service order number in transaction: ", error);
        throw new Error("Não foi possível gerar o número da OS. Tente novamente.");
    }
};
