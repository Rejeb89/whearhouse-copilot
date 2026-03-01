import { Router } from 'express'
import { authGuard } from '../middleware/authGuard'
import { roleGuard } from '../middleware/roleGuard'
import * as dataController from '../controllers/dataController'

const router = Router()
router.use(authGuard, roleGuard(['ADMIN', 'SECTION_CHIEF']))

router.get('/export', dataController.exportData)
router.post('/import', dataController.importData)
router.post('/clear-data', dataController.clearData)
router.get('/stats', dataController.stats)

export default router
