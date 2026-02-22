import express from 'express'
import { authGuard } from '../middleware/authGuard'
import { roleGuard } from '../middleware/roleGuard'
import * as itemService from '../services/itemService'

const router = express.Router()

router.use(authGuard)

router.get('/', async (req, res) => {
  const items = await itemService.listItems()
  res.json({ data: items })
})

router.post('/', roleGuard(['ADMIN','STORE_KEEPER']), async (req, res) => {
  try {
    const item = await itemService.createItem(req.body)
    res.json({ data: item })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

router.put('/:id', roleGuard(['ADMIN','STORE_KEEPER']), async (req, res) => {
  const updated = await itemService.updateItem(Number(req.params.id), req.body)
  res.json({ data: updated })
})

router.delete('/:id', roleGuard(['ADMIN','STORE_KEEPER']), async (req, res) => {
  try {
    await itemService.deleteItem(Number(req.params.id))
    res.json({ data: true })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

router.get('/:id/history', async (req, res) => {
  try {
    const history = await itemService.getItemHistory(Number(req.params.id))
    res.json({ data: history })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export default router
