import { z } from 'zod'

export const createUserSchema = z.object({
  email: z.string()
    .email('⚠️ الرجاء إدخال بريد إلكتروني صحيح')
    .transform(e => e.trim().toLowerCase()),
  password: z.string()
    .min(8, '🔐 كلمة المرور يجب أن تكون 8 أحرف على الأقل')
    .regex(/[A-Z]/, '🔤 أضف حرفاً كبيراً (A-Z)')
    .regex(/[a-z]/, '🔡 أضف حرفاً صغيراً (a-z)')
    .regex(/[0-9]/, '🔢 أضف رقماً واحداً')
    .regex(/[!@#$%^&*]/, '✨ أضف رمزاً خاصاً (!@#$%^&*)'),
  name: z.string()
    .min(1, '👤 الرجاء إدخال اسمك')
    .transform(n => n.trim())
    .optional(),
  role: z.enum(['ADMIN', 'SECTION_CHIEF', 'USER', 'REGION_CHIEF', 'BATTALION_COMMANDER', 'DISTRICT_MANAGER']).optional(),
  personalNumber: z.string()
    .transform(n => n.trim())
    .optional(),
  securityUnit: z.string()
    .transform(s => s.trim())
    .optional(),
  region: z.string()
    .transform(r => r.trim())
    .optional(),
  regionChief: z.string()
    .transform(r => r.trim())
    .optional(),
  title: z.string()
    .transform(t => t.trim())
    .optional(),
}).refine(
  (data) => data.role === 'ADMIN' || data.region, 
  { message: '📍 الرجاء تحديد الإقليم', path: ['region'] }
)

export const updateUserSchema = z.object({
  email: z.string()
    .email('⚠️ الرجاء إدخال بريد إلكتروني صحيح')
    .transform(e => e.trim().toLowerCase())
    .optional(),
  password: z.string()
    .min(8, '🔐 كلمة المرور يجب أن تكون 8 أحرف على الأقل')
    .regex(/[A-Z]/, '🔤 أضف حرفاً كبيراً (A-Z)')
    .regex(/[a-z]/, '🔡 أضف حرفاً صغيراً (a-z)')
    .regex(/[0-9]/, '🔢 أضف رقماً واحداً')
    .regex(/[!@#$%^&*]/, '✨ أضف رمزاً خاصاً (!@#$%^&*)')
    .optional()
    .or(z.literal('')),  
  name: z.string()
    .min(1, 'الاسم مطلوب')
    .transform(n => n.trim())
    .optional(),
  role: z.enum(['ADMIN', 'SECTION_CHIEF', 'USER', 'REGION_CHIEF', 'BATTALION_COMMANDER', 'DISTRICT_MANAGER']).optional(),
  personalNumber: z.string()
    .transform(n => n.trim())
    .optional(),
  securityUnit: z.string()
    .transform(s => s.trim())
    .optional(),
  region: z.string()
    .transform(r => r.trim())
    .optional(),
  regionChief: z.string()
    .transform(r => r.trim())
    .optional(),
  title: z.string()
    .transform(t => t.trim())
    .optional(),
})

export const loginSchema = z.object({
  email: z.string()
    .email('⚠️ الرجاء إدخال بريد إلكتروني صحيح')
    .transform(e => e.trim().toLowerCase()),
  password: z.string()
    .min(1, '🔐 الرجاء إدخال كلمة المرور')
    .transform(p => p.trim()),
})

export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
export type LoginInput = z.infer<typeof loginSchema>
