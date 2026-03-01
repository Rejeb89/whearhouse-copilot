import { Router } from 'express'
import { authGuard } from '../middleware/authGuard'
import { roleGuard } from '../middleware/roleGuard'
import * as employeeController from '../controllers/employeeController'

const router = Router()

router.get('/', authGuard, employeeController.listAll)
router.get('/:entityId', authGuard, employeeController.listByEntity)
router.get('/:entityId/:id', authGuard, employeeController.getById)
router.post('/:entityId', authGuard, roleGuard(['ADMIN', 'SECTION_CHIEF']), employeeController.create)
router.post('/:entityId/bulk', authGuard, roleGuard(['ADMIN', 'SECTION_CHIEF']), employeeController.bulkCreate)
router.put('/:entityId/:id', authGuard, roleGuard(['ADMIN', 'SECTION_CHIEF']), employeeController.update)
router.delete('/:entityId/:id', authGuard, roleGuard(['ADMIN', 'SECTION_CHIEF']), employeeController.remove)

export default router
