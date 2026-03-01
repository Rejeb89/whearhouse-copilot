import { Router } from 'express'
import { authGuard } from '../middleware/authGuard'
import { roleGuard } from '../middleware/roleGuard'
import * as itemController from '../controllers/itemController'

const router = Router()
router.use(authGuard)

router.get('/inventory', itemController.inventory)
router.get('/', itemController.list)
router.post('/', roleGuard(['ADMIN', 'SECTION_CHIEF']), itemController.create)
router.put('/:id', roleGuard(['ADMIN', 'SECTION_CHIEF']), itemController.update)
router.delete('/:id', roleGuard(['ADMIN', 'SECTION_CHIEF']), itemController.remove)
router.get('/:id/admin-numbers', itemController.adminNumbers)
router.get('/:id/history', itemController.history)

export default router
