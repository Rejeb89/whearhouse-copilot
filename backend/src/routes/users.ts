import express from 'express'
import * as userService from '../services/userService'
import { authGuard } from '../middleware/authGuard'
import { roleGuard } from '../middleware/roleGuard'

const router = express.Router()

router.use(authGuard, roleGuard(['ADMIN']))

router.get('/', async (req, res) => {
  const users = await userService.listUsers()
  res.json({ data: users })
})

router.post('/', async (req, res) => {
  try {
    const user = await userService.createUser(req.body)
    res.json({ data: user })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

router.get('/:id', async (req, res) => {
  const user = await userService.getUser(Number(req.params.id))
  res.json({ data: user })
})

router.put('/:id', async (req, res) => {
  const updated = await userService.updateUser(Number(req.params.id), req.body)
  res.json({ data: updated })
})

router.delete('/:id', async (req, res) => {
  await userService.deleteUser(Number(req.params.id))
  res.json({ data: true })
})

export default router
