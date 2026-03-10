import { Request, Response } from 'express'
import * as projectService from '../services/projectService'

const UNRESTRICTED_ROLES = ['ADMIN', 'REGION_CHIEF', 'DISTRICT_MANAGER']
const getSU = (req: Request) => {
  const u = (req as any).user
  return UNRESTRICTED_ROLES.includes(u?.role) ? undefined : (u?.securityUnit ?? undefined)
}

export const list = async (req: Request, res: Response) => {
  try {
    const entityId = req.query.entityId ? Number(req.query.entityId) : undefined
    const projects = await projectService.listProjects(getSU(req), entityId)
    res.json({ data: projects })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

export const getById = async (req: Request, res: Response) => {
  try {
    const project = await projectService.getProjectById(Number(req.params.id), getSU(req))
    if (!project) return res.status(404).json({ error: 'المشروع غير موجود' })
    res.json({ data: project })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

export const create = async (req: Request, res: Response) => {
  try {
    const su = (req as any).user?.securityUnit
    const project = await projectService.createProject(req.body, su)
    res.status(201).json({ data: project })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
}

export const update = async (req: Request, res: Response) => {
  try {
    const project = await projectService.updateProject(Number(req.params.id), req.body, getSU(req))
    res.json({ data: project })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
}

export const remove = async (req: Request, res: Response) => {
  try {
    await projectService.deleteProject(Number(req.params.id), getSU(req))
    res.json({ ok: true })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
}

export const stats = async (req: Request, res: Response) => {
  try {
    const data = await projectService.getProjectStats(getSU(req))
    res.json({ data })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}
