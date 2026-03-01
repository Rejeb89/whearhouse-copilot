import { Router } from 'express'
import { authGuard } from '../middleware/authGuard'
import { roleGuard } from '../middleware/roleGuard'
import * as userController from '../controllers/userController'

const router = Router()
router.use(authGuard, roleGuard(['ADMIN']))

router.get('/', userController.list)
router.post('/', userController.create)
router.get('/:id', userController.getById)
router.put('/:id', userController.update)
router.delete('/:id', userController.remove)

export default router
