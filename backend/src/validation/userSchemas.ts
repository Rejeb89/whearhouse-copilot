import { z } from 'zod'

export const createUserSchema = z.object({
  email: z.string().email('بريد إلكتروني غير صالح'),
  password: z.string()
    .min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل')
    .regex(/[A-Z]/, 'كلمة المرور يجب أن تحتوي على حرف كبير')
    .regex(/[a-z]/, 'كلمة المرور يجب أن تحتوي على حرف صغير')
    .regex(/[0-9]/, 'كلمة المرور يجب أن تحتوي على رقم')
    .regex(/[!@#$%^&*]/, 'كلمة المرور يجب أن تحتوي على رمز خاص (!@#$%^&*)'),  
  name: z.string().min(1, 'الاسم مطلوب').optional(),
  role: z.enum(['ADMIN', 'SECTION_CHIEF', 'USER', 'REGION_CHIEF', 'BATTALION_COMMANDER', 'DISTRICT_MANAGER']).optional(),
  personalNumber: z.string().optional(),
  securityUnit: z.string().optional(),
  region: z.string().optional(),
  regionChief: z.string().optional(),
  title: z.string().optional(),
}).refine(
  (data) => data.role === 'ADMIN' || data.region, 
  { message: 'الإقليم مطلوب للمستخدمين غير الإداريين', path: ['region'] }
)

export const updateUserSchema = z.object({
  email: z.string().email('بريد إلكتروني غير صالح').optional(),
  password: z.string()
    .min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل')
    .regex(/[A-Z]/, 'كلمة المرور يجب أن تحتوي على حرف كبير')
    .regex(/[a-z]/, 'كلمة المرور يجب أن تحتوي على حرف صغير')
    .regex(/[0-9]/, 'كلمة المرور يجب أن تحتوي على رقم')
    .regex(/[!@#$%^&*]/, 'كلمة المرور يجب أن تحتوي على رمز خاص (!@#$%^&*)')
    .optional()
    .or(z.literal('')),  
  name: z.string().min(1, 'الاسم مطلوب').optional(),
  role: z.enum(['ADMIN', 'SECTION_CHIEF', 'USER', 'REGION_CHIEF', 'BATTALION_COMMANDER', 'DISTRICT_MANAGER']).optional(),
  personalNumber: z.string().optional(),
  securityUnit: z.string().optional(),
  region: z.string().optional(),
  regionChief: z.string().optional(),
  title: z.string().optional(),
})

export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
