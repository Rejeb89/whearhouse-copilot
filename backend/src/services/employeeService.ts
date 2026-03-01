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

  async getEmployeesByEntity(entityId: number) {
    return prisma.employee.findMany({
      where: { entityId },
      orderBy: { createdAt: 'desc' },
    });
  },

  async getEmployeeById(id: number) {
    return prisma.employee.findUnique({
      where: { id },
    });
  },

  async updateEmployee(id: number, data: any) {
    return prisma.employee.update({
      where: { id },
      data,
    });
  },

  async deleteEmployee(id: number) {
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
