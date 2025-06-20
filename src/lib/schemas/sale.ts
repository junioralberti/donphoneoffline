
import { z } from 'zod';

export const SaleStatusSchema = z.enum(["Concluída", "Cancelada"]).default("Concluída");
export type SaleStatus = z.infer<typeof SaleStatusSchema>;

export type PaymentMethod = "Dinheiro" | "Cartão de Crédito" | "Cartão de Débito" | "PIX";

export const CartItemInputSchema = z.object({
  name: z.string(),
  quantity: z.number().min(1),
  price: z.number(),
});
export type CartItemInput = z.infer<typeof CartItemInputSchema>;


export const SaleInputSchema = z.object({
  saleNumber: z.number(),
  clientName: z.string().nullable(),
  items: z.array(CartItemInputSchema),
  paymentMethod: z.string().nullable().transform(val => val as PaymentMethod | null),
  totalAmount: z.number(),
  status: SaleStatusSchema.optional(),
  cancellationReason: z.string().optional().nullable(),
  cancelledAt: z.any().optional().nullable(),
});
export type SaleInput = z.infer<typeof SaleInputSchema>;


export const SaleSchema = SaleInputSchema.extend({
  id: z.string(), // Firestore ID
  createdAt: z.any(),
});
export type Sale = z.infer<typeof SaleSchema>;
