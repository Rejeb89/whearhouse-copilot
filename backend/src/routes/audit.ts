import { Router } from 'express'
import { authGuard } from '../middleware/authGuard'
import { roleGuard } from '../middleware/roleGuard'
import * as auditController from '../controllers/auditController'

const router = Router()
router.use(authGuard, roleGuard(['ADMIN', 'SECTION_CHIEF', 'REGION_CHIEF', 'BATTALION_COMMANDER', 'DISTRICT_MANAGER']))

router.get('/', auditController.list)

export default router
