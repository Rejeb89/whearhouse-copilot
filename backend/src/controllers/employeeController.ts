import { Request, Response } from 'express'
import { employeeService } from '../services/employeeService'
import prisma from '../config/database'

const UNRESTRICTED_ROLES = ['ADMIN', 'REGION_CHIEF', 'BATTALION_COMMANDER', 'DISTRICT_MANAGER']
const getSU = (req: Request) => {
  const u = (req as any).user
  return UNRESTRICTED_ROLES.includes(u?.role) ? undefined : (u?.securityUnit ?? undefined)
}

export const listAll = async (req: Request, res: Response) => {
  try {
    const su = getSU(req)
    const employees = await prisma.employee.findMany({
      where: su ? { entity: { securityUnit: su } } : undefined,
      include: { entity: { select: { id: true, name: true } } },
      orderBy: [{ rank: 'asc' }, { name: 'asc' }],
    })
    res.json({ success: true, data: employees })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as any).message })
  }
}

export const listByEntity = async (req: Request, res: Response) => {
  try {
    const employees = await employeeService.getEmployeesByEntity(parseInt(req.params.entityId), getSU(req))
    res.json({ success: true, data: employees })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as any).message })
  }
}

export const getById = async (req: Request, res: Response) => {
  try {
    const employee = await employeeService.getEmployeeById(parseInt(req.params.id), getSU(req))
    if (!employee) return res.status(404).json({ success: false, error: 'Employee not found' })
    res.json({ success: true, data: employee })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as any).message })
  }
}

export const create = async (req: Request, res: Response) => {
  try {
    const { entityId } = req.params
    const { rank, name, surname, number, phone } = req.body

    if (!rank || !name || !surname || !number) {
      return res.status(400).json({ success: false, error: 'Missing required fields: rank, name, surname, number' })
    }

    const employee = await employeeService.createEmployee(
      parseInt(entityId), String(rank), String(name), String(surname), String(number),
      phone ? String(phone) : undefined,
    )
    res.status(201).json({ success: true, data: employee })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as any).message })
  }
}

export const bulkCreate = async (req: Request, res: Response) => {
  try {
    const { entityId } = req.params
    const { employees } = req.body

    if (!Array.isArray(employees) || employees.length === 0) {
      return res.status(400).json({ success: false, error: 'Invalid employees data' })
    }

    const validatedEmployees = employees
      .map((emp: any) => ({
        rank: String(emp.rank || '').trim(),
        name: String(emp.name || '').trim(),
        surname: String(emp.surname || '').trim(),
        number: String(emp.number || '').trim(),
        phone: emp.phone ? String(emp.phone).trim() : undefined,
      }))
      .filter((emp: any) => emp.rank && emp.name && emp.surname && emp.number)

    if (validatedEmployees.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid employees found' })
    }

    const created = await employeeService.bulkCreateEmployees(parseInt(entityId), validatedEmployees)
    res.status(201).json({ success: true, data: created })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as any).message })
  }
}

export const update = async (req: Request, res: Response) => {
  try {
    const { rank, name, surname, number, phone } = req.body
    const employee = await employeeService.updateEmployee(parseInt(req.params.id), {
      rank, name, surname, number, phone,
    }, getSU(req))
    res.json({ success: true, data: employee })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as any).message })
  }
}

export const remove = async (req: Request, res: Response) => {
  try {
    const employee = await employeeService.deleteEmployee(parseInt(req.params.id), getSU(req))
    res.json({ success: true, data: employee })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as any).message })
  }
}
