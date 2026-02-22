import { Router } from 'express'
import * as entityService from '../services/entityService'
import { authGuard } from '../middleware/authGuard'
import { roleGuard } from '../middleware/roleGuard'

const router = Router()

// Get all entities
router.get('/', authGuard, async (req, res) => {
  try {
    const type = req.query.type as 'SUPPLIER' | 'BENEFICIARY' | undefined
    const entities = await entityService.getEntities(type)
    res.json({ data: entities })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Get entity by ID
router.get('/:id', authGuard, async (req, res) => {
  try {
    const entity = await entityService.getEntityById(parseInt(req.params.id))
    if (!entity) return res.status(404).json({ error: 'Entity not found' })
    res.json({ data: entity })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Get distribution count for entity
router.get('/:id/distributions-count', authGuard, async (req, res) => {
  try {
    const count = await entityService.getDistributionsCount(parseInt(req.params.id))
    res.json({ data: { distributionCount: count } })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Create entity
router.post('/', authGuard, roleGuard(['ADMIN', 'STORE_KEEPER']), async (req, res) => {
  try {
    const { name, type, category, subCategory, phone, unitHead, unitHeadPhone } = req.body

    if (!name || !type) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const entity = await entityService.createEntity({
      name,
      type,
      category,
      subCategory,
      phone: phone || '',
      unitHead,
      unitHeadPhone,
    })

    res.status(201).json({ data: entity })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Update entity
router.put('/:id', authGuard, roleGuard(['ADMIN', 'STORE_KEEPER']), async (req, res) => {
  try {
    const { name, category, subCategory, phone, unitHead, unitHeadPhone, type: bodyType } = req.body

    const entity = await entityService.updateEntity(parseInt(req.params.id), {
      name,
      type: bodyType,
      category,
      subCategory,
      phone,
      unitHead,
      unitHeadPhone,
    })

    res.json({ data: entity })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Delete entity
router.delete('/:id', authGuard, roleGuard(['ADMIN']), async (req, res) => {
  try {
    await entityService.deleteEntity(parseInt(req.params.id))
    res.json({ message: 'Entity deleted successfully' })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

export default router
