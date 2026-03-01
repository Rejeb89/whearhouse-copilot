import { Router } from 'express'
import { authGuard } from '../middleware/authGuard'
import { roleGuard } from '../middleware/roleGuard'
import * as entityController from '../controllers/entityController'

const router = Router()

router.get('/', authGuard, entityController.list)
router.get('/:id', authGuard, entityController.getById)
router.get('/:id/distributions-count', authGuard, entityController.distributionsCount)
router.post('/', authGuard, roleGuard(['ADMIN', 'STORE_KEEPER']), entityController.create)
router.put('/:id', authGuard, roleGuard(['ADMIN', 'STORE_KEEPER']), entityController.update)
router.delete('/:id', authGuard, roleGuard(['ADMIN']), entityController.remove)

export default router
