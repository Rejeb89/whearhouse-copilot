/**
 * Translates raw Prisma error codes into user-friendly Arabic messages.
 * Prevents exposing internal Prisma error details to the client.
 */
export const humanizePrismaError = (err: any): string => {
  // P2002 — Unique constraint violation
  if (err?.code === 'P2002') {
    const fields: string[] = err?.meta?.target ?? []
    if (fields.includes('adminNumber')) return 'الرقم الإداري مستخدم مسبقاً، يرجى اختيار رقم آخر'
    if (fields.includes('sku'))         return 'رمز المادة (SKU) مستخدم مسبقاً'
    if (fields.includes('email'))       return 'البريد الإلكتروني مستخدم مسبقاً'
    if (fields.includes('reference'))   return 'رقم المرجع مستخدم مسبقاً'
    if (fields.includes('serialNumber'))return 'الرقم التسلسلي مستخدم مسبقاً'
    return 'هذه القيمة مستخدمة مسبقاً، يرجى إدخال قيمة أخرى'
  }
  // P2003 — Foreign key constraint violation
  if (err?.code === 'P2003') return 'المرجع المحدد غير موجود'
  // P2025 — Record not found (update/delete on non-existent record)
  if (err?.code === 'P2025') return 'السجل غير موجود'
  // Any other error: return the original message
  return err?.message ?? 'حدث خطأ غير متوقع'
}
