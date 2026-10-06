import { z } from 'zod';

export const CreateOrderSchema = z.object({
  delivery_date: z.string().min(1),
  delivery_type: z.enum(['SINGLE', 'SPLIT']),
  delivery_notes: z.string().max(500).nullable().optional(),
  address: z.object({
    full_address: z.string().min(1),
    city: z.string().optional(),
    lga: z.string().optional(),
    instructions: z.string().nullable().optional(),
  }),
  items: z
    .array(
      z.object({
        product_id: z.string().min(1),
        kg_quantity: z.number().positive(),
      })
    )
    .min(1)
    .max(50),
});

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;
