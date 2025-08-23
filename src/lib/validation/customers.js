import { z } from 'zod';

// Customer creation schema
export const customerCreateSchema = z.object({
  full_name: z.string().min(1, 'Full name is required').max(100, 'Full name must be less than 100 characters'),
  email: z.string().email('Invalid email format').optional().or(z.literal('')),
  phone: z.string().max(20, 'Phone number must be less than 20 characters').optional().or(z.literal('')),
  service_date: z.string().optional().or(z.literal('')),
  tags: z.array(z.string()).default([]),
  notes: z.string().max(500, 'Notes must be less than 500 characters').optional().or(z.literal('')),
  status: z.enum(['active', 'inactive', 'archived']).default('active'),
});

// Customer update schema
export const customerUpdateSchema = z.object({
  full_name: z.string().min(1, 'Full name is required').max(100, 'Full name must be less than 100 characters').optional(),
  email: z.string().email('Invalid email format').optional().or(z.literal('')),
  phone: z.string().max(20, 'Phone number must be less than 20 characters').optional().or(z.literal('')),
  service_date: z.string().optional().or(z.literal('')),
  tags: z.array(z.string()).default([]).optional(),
  notes: z.string().max(500, 'Notes must be less than 500 characters').optional().or(z.literal('')),
  status: z.enum(['active', 'inactive', 'archived']).optional(),
});

// CSV row schema
export const csvRowSchema = z.object({
  full_name: z.string().min(1, 'Full name is required'),
  email: z.string().email('Invalid email format').optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  service_date: z.string().optional().or(z.literal('')),
  tags: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
  status: z.string().optional().or(z.literal('')),
});

// Customer query parameters schema
export const customerQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  tag: z.string().optional(),
  sort: z.string().optional(),
  status: z.string().optional(),
});
