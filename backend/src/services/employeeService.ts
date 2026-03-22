import prisma from '../config/database'

export const employeeService = {
  async createEmployee(entityId: number, rank: string, name: string, surname: string, number: string, phone?: string) {
    // Check for duplicate personal number
    const existing = await prisma.employee.findUnique({ where: { number } })
    if (existing) throw new Error('الرقم الشخصي مستخدم بالفعل لموظف آخر')
    return prisma.employee.create({
      data: {
        entityId,
        rank,
        name,
        surname,
        number,
        phone: phone || '',
      },
    });
  },

  async getEmployeesByEntity(entityId: number, securityUnit?: string | null) {
    const where: any = { entityId }
    if (securityUnit) where.entity = { securityUnit }
    return prisma.employee.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  },

  async getEmployeeById(id: number, securityUnit?: string | null) {
    const where: any = { id }
    if (securityUnit) where.entity = { securityUnit }
    return prisma.employee.findFirst({ where });
  },

  async updateEmployee(id: number, data: { rank?: string; name?: string; surname?: string; number?: string; phone?: string }, securityUnit?: string | null) {
    const existing = await prisma.employee.findFirst({ where: securityUnit ? { id, entity: { securityUnit } } : { id } })
    if (!existing) throw new Error('الموظف غير موجود أو لا يمكنك تعديله')
    // Check for duplicate number if changing it
    if (data.number && data.number !== existing.number) {
      const dup = await prisma.employee.findUnique({ where: { number: data.number } })
      if (dup) throw new Error('الرقم الشخصي مستخدم بالفعل لموظف آخر')
    }
    const safeData: any = {}
    if (data.rank !== undefined) safeData.rank = data.rank
    if (data.name !== undefined) safeData.name = data.name
    if (data.surname !== undefined) safeData.surname = data.surname
    if (data.number !== undefined) safeData.number = data.number
    if (data.phone !== undefined) safeData.phone = data.phone
    return prisma.employee.update({ where: { id }, data: safeData });
  },

  async deleteEmployee(id: number, securityUnit?: string | null) {
    if (securityUnit) {
      const existing = await prisma.employee.findFirst({ where: { id, entity: { securityUnit } } })
      if (!existing) throw new Error('الموظف غير موجود أو لا يمكنك حذفه')
    }
    return prisma.employee.delete({
      where: { id },
    });
  },

  async bulkCreateEmployees(entityId: number, employees: Array<{ rank: string; name: string; surname: string; number: string; phone?: string }>) {
    // Check for duplicates in batch and in DB
    const numbers = employees.map(e => e.number)
    const duplicatesInBatch = numbers.filter((n, i) => numbers.indexOf(n) !== i)
    if (duplicatesInBatch.length > 0) {
      throw new Error(`أرقام شخصية مكررة في الدفعة: ${[...new Set(duplicatesInBatch)].join(', ')}`)
    }
    const existingEmployees = await prisma.employee.findMany({ where: { number: { in: numbers } }, select: { number: true } })
    if (existingEmployees.length > 0) {
      throw new Error(`أرقام شخصية مستخدمة بالفعل: ${existingEmployees.map(e => e.number).join(', ')}`)
    }
    return prisma.$transaction(
      employees.map(emp =>
        prisma.employee.create({
          data: { entityId, rank: emp.rank, name: emp.name, surname: emp.surname, number: emp.number, phone: emp.phone || '' },
        })
      )
    );
  },
};
