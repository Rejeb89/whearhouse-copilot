import prisma from '../config/database'

export const employeeService = {
  async createEmployee(entityId: number, rank: string, name: string, surname: string, number: string, phone?: string) {
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

  async updateEmployee(id: number, data: any, securityUnit?: string | null) {
    if (securityUnit) {
      const existing = await prisma.employee.findFirst({ where: { id, entity: { securityUnit } } })
      if (!existing) throw new Error('الموظف غير موجود أو لا يمكنك تعديله')
    }
    return prisma.employee.update({
      where: { id },
      data,
    });
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
    return Promise.all(
      employees.map(emp =>
        this.createEmployee(entityId, emp.rank, emp.name, emp.surname, emp.number, emp.phone)
      )
    );
  },
};
