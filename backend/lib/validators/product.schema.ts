import { z } from 'zod';

export const CreateProductSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase with hyphens only')
    .min(2)
    .max(100),
  description: z.string().max(2000),
  category_id: z.string().min(1),
  product_type: z.enum(['REGULAR', 'PERISHABLE']),
  price_per_kg: z.number().int().positive(), // Naira
  min_kg: z.number().min(0.1).max(100),
  max_kg: z.number().min(0.1).max(1000).nullable(),
  kg_increment: z.number().min(0.1).max(10),
  stock_kg: z.number().min(0),
  low_stock_threshold: z.number().min(0).default(10),
  image_urls: z.array(z.string().url()).min(1),
  is_featured: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
});

export const UpdateProductSchema = CreateProductSchema.partial().omit({
  slug: true,
});

export type CreateProductInput = z.infer<typeof CreateProductSchema>;
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;
