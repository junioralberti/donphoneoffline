
import { doc, getDoc, setDoc, runTransaction, type DocumentReference } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const COUNTERS_COLLECTION = 'systemSettings';
const SALE_COUNTER_DOC = 'salesCounter';
const STARTING_SALE_NUMBER = 149; // The first sale will be 150

interface Counter {
    lastSaleNumber: number;
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
