import { z } from 'zod'

export const createUserSchema = z.object({
  email: z.string().email('بريد إلكتروني غير صالح'),
  password: z.string().min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
  name: z.string().min(1, 'الاسم مطلوب').optional(),
  role: z.enum(['ADMIN', 'SECTION_CHIEF', 'USER']).optional(),
  personalNumber: z.string().optional(),
  securityUnit: z.string().optional(),
  region: z.string().optional(),
  title: z.string().optional(),
})

export const updateUserSchema = z.object({
  email: z.string().email('بريد إلكتروني غير صالح').optional(),
  password: z.string().min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل').optional().or(z.literal('')),
  name: z.string().min(1, 'الاسم مطلوب').optional(),
  role: z.enum(['ADMIN', 'SECTION_CHIEF', 'USER']).optional(),
  personalNumber: z.string().optional(),
  securityUnit: z.string().optional(),
  region: z.string().optional(),
  title: z.string().optional(),
})

export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
