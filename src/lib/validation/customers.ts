import { z } from 'zod';

export const customerCreateSchema = z.object({
  full_name: z.string().min(1, 'Full name is required').max(100, 'Full name too long'),
  email: z.string().email('Invalid email format').optional().or(z.literal('')),
  phone: z.string().max(20, 'Phone number too long').optional().or(z.literal('')),
  service_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format').optional().or(z.literal('')),
  tags: z.array(z.string().max(50)).default([]),
  notes: z.string().max(1000, 'Notes too long').optional().or(z.literal('')),
  status: z.enum(['active', 'archived']).default('active'),
});

export const customerUpdateSchema = customerCreateSchema.partial();

export const csvRowSchema = z.object({
  full_name: z.string().min(1, 'Full name is required'),
  email: z.string().email('Invalid email format').optional().or(z.literal('')),
  phone: z.string().max(20, 'Phone number too long').optional().or(z.literal('')),
  service_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format').optional().or(z.literal('')),
  tags: z.string().optional().or(z.literal('')),
  notes: z.string().max(1000, 'Notes too long').optional().or(z.literal('')),
  status: z.enum(['active', 'archived']).optional().or(z.literal('')),
});

export const customerQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  tag: z.string().optional(),
  sort: z.string().optional(),
  status: z.enum(['active', 'archived', 'all']).default('all'),
});

export type CustomerCreateInput = z.infer<typeof customerCreateSchema>;
export type CustomerUpdateInput = z.infer<typeof customerUpdateSchema>;
export type CsvRowInput = z.infer<typeof csvRowSchema>;
export type CustomerQueryInput = z.infer<typeof customerQuerySchema>;
