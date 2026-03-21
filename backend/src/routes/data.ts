import { Router } from 'express'
import { authGuard } from '../middleware/authGuard'
import { roleGuard } from '../middleware/roleGuard'
import * as dataController from '../controllers/dataController'

const router = Router()
router.use(authGuard)

router.get('/stats',      roleGuard(['ADMIN', 'SECTION_CHIEF', 'REGION_CHIEF', 'BATTALION_COMMANDER', 'DISTRICT_MANAGER']), dataController.stats)
router.get('/export',     roleGuard(['ADMIN', 'SECTION_CHIEF']), dataController.exportData)
router.post('/import',    roleGuard(['ADMIN', 'SECTION_CHIEF']), dataController.importData)
router.post('/clear-data',roleGuard(['ADMIN', 'SECTION_CHIEF']), dataController.clearData)

export default router
