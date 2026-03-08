import { Request, Response } from 'express'
import * as monitoringService from '../services/monitoringService'
import * as logQueryService from '../services/logQueryService'
import { getInventorySummary } from '../services/itemService'
import prisma from '../config/database'

export const listUnits = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user
    let data = await monitoringService.listSecurityUnits()

    if (user.role === 'REGION_CHIEF') {
      // Only their own unit
      data = data.filter((u: any) => u.securityUnit === user.securityUnit)
    } else if (user.role === 'DISTRICT_MANAGER') {
      // Only units that have at least one user with the same region
      const unitsInRegion = await prisma.user.findMany({
        where: { region: user.region, securityUnit: { not: null } },
        select: { securityUnit: true },
        distinct: ['securityUnit'],
      })
      const allowed = new Set(unitsInRegion.map((u: any) => u.securityUnit))
      data = data.filter((u: any) => allowed.has(u.securityUnit))
    }

    res.json({ data })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

export const unitOverview = async (req: Request, res: Response) => {
  try {
    const unit = decodeURIComponent(req.params.unit)
    const data = await monitoringService.getUnitOverview(unit)
    res.json({ data })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

export const unitItems = async (req: Request, res: Response) => {
  try {
    const unit = decodeURIComponent(req.params.unit)
    const data = await monitoringService.getUnitItems(unit)
    res.json({ data })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

export const unitVehicles = async (req: Request, res: Response) => {
  try {
    const unit = decodeURIComponent(req.params.unit)
    const data = await monitoringService.getUnitVehicles(unit)
    res.json({ data })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

export const unitReceptions = async (req: Request, res: Response) => {
  try {
    const unit = decodeURIComponent(req.params.unit)
    const data = await monitoringService.getUnitReceptions(unit)
    res.json({ data })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

export const unitDistributions = async (req: Request, res: Response) => {
  try {
    const unit = decodeURIComponent(req.params.unit)
    const data = await monitoringService.getUnitDistributions(unit)
    res.json({ data })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

export const unitEntities = async (req: Request, res: Response) => {
  try {
    const unit = decodeURIComponent(req.params.unit)
    const data = await monitoringService.getUnitEntities(unit)
    res.json({ data })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

export const unitBudgets = async (req: Request, res: Response) => {
  try {
    const unit = decodeURIComponent(req.params.unit)
    const data = await monitoringService.getUnitBudgets(unit)
    res.json({ data })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

export const unitLogs = async (req: Request, res: Response) => {
  try {
    const unit = decodeURIComponent(req.params.unit)
    const data = await logQueryService.queryLogs(req.query as any, unit)
    res.json(data)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

export const unitItemDetail = async (req: Request, res: Response) => {
  try {
    const unit   = decodeURIComponent(req.params.unit)
    const itemId = parseInt(req.params.itemId, 10)
    const data   = await monitoringService.getUnitItemDetail(unit, itemId)
    if (!data) return res.status(404).json({ error: 'Item not found' })
    res.json({ data })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

export const unitLogStats = async (req: Request, res: Response) => {
  try {
    const unit = decodeURIComponent(req.params.unit)
    const year = Number(req.query.year) || new Date().getFullYear()
    const data = await logQueryService.getLogStats(year, unit)
    res.json({ data })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

export const unitLogMonthly = async (req: Request, res: Response) => {
  try {
    const unit = decodeURIComponent(req.params.unit)
    const year  = Number(req.query.year)  || new Date().getFullYear()
    const month = Number(req.query.month) || new Date().getMonth() + 1
    const data = await logQueryService.getMonthlyReport(year, month, unit)
    res.json({ data })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

export const unitLogInventory = async (req: Request, res: Response) => {
  try {
    const unit = decodeURIComponent(req.params.unit)
    const data = await getInventorySummary(unit)
    res.json({ data })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

export const unitUsers = async (req: Request, res: Response) => {
  try {
    const unit = decodeURIComponent(req.params.unit)
    const data = await monitoringService.getUnitUsers(unit)
    res.json({ data })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

export const unitReceipts = async (req: Request, res: Response) => {
  try {
    const unit = decodeURIComponent(req.params.unit)
    const data = await monitoringService.getUnitReceipts(unit)
    res.json({ data })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}
