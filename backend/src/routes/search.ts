import { Router } from 'express'
import { authGuard } from '../middleware/authGuard'
import prisma from '../prisma'

const router = Router()

// GET /api/search?q=query
router.get('/', authGuard, async (req, res) => {
  const q = (req.query.q as string || '').trim().toLowerCase()
  
  if (!q || q.length < 2) {
    return res.json({ data: { items: [], receptions: [], distributions: [], entities: [], employees: [], users: [] } })
  }

  try {
    const [items, receptions, distributions, entities, employees, users] = await Promise.all([
      // Search Items
      prisma.item.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { sku: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
            { category: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: { id: true, name: true, sku: true, quantity: true },
        take: 10,
      }),
      
      // Search Receptions
      prisma.reception.findMany({
        where: {
          OR: [
            { reference: { contains: q, mode: 'insensitive' } },
            { referenceNumber: { contains: q, mode: 'insensitive' } },
            { notes: { contains: q, mode: 'insensitive' } },
            { supplier: { name: { contains: q, mode: 'insensitive' } } },
            { user: { email: { contains: q, mode: 'insensitive' } } },
            { user: { name: { contains: q, mode: 'insensitive' } } },
          ],
        },
        include: {
          supplier: { select: { name: true } },
          user: { select: { email: true, name: true } },
          _count: { select: { items: true } },
        },
        take: 10,
      }),
      
      // Search Distributions
      prisma.distribution.findMany({
        where: {
          OR: [
            { reference: { contains: q, mode: 'insensitive' } },
            { notes: { contains: q, mode: 'insensitive' } },
            { beneficiary: { name: { contains: q, mode: 'insensitive' } } },
            { assignedTo: { name: { contains: q, mode: 'insensitive' } } },
            { assignedTo: { surname: { contains: q, mode: 'insensitive' } } },
            { user: { email: { contains: q, mode: 'insensitive' } } },
            { user: { name: { contains: q, mode: 'insensitive' } } },
          ],
        },
        include: {
          beneficiary: { select: { name: true } },
          assignedTo: { select: { name: true, surname: true, rank: true } },
          user: { select: { email: true, name: true } },
          _count: { select: { items: true } },
        },
        take: 10,
      }),
      
      // Search Entities
      prisma.entity.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { phone: { contains: q, mode: 'insensitive' } },
            { unitHead: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: { id: true, name: true, type: true, phone: true },
        take: 10,
      }),
      
      // Search Employees
      prisma.employee.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { surname: { contains: q, mode: 'insensitive' } },
            { number: { contains: q, mode: 'insensitive' } },
            { phone: { contains: q, mode: 'insensitive' } },
            { rank: { contains: q, mode: 'insensitive' } },
            { entity: { name: { contains: q, mode: 'insensitive' } } },
          ],
        },
        include: { entity: { select: { name: true } } },
        take: 10,
      }),
      
      // Search Users
      prisma.user.findMany({
        where: {
          OR: [
            { email: { contains: q, mode: 'insensitive' } },
            { name: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: { id: true, email: true, name: true, role: true },
        take: 10,
      }),
    ])

    res.json({
      data: {
        items: items.map((i: any) => ({ ...i, type: 'item' })),
        receptions: receptions.map((r: any) => ({ ...r, type: 'reception' })),
        distributions: distributions.map((d: any) => ({ ...d, type: 'distribution' })),
        entities: entities.map((e: any) => ({ ...e, type: 'entity' })),
        employees: employees.map((e: any) => ({ ...e, type: 'employee' })),
        users: users.map((u: any) => ({ ...u, type: 'user' })),
      }
    })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

export default router
