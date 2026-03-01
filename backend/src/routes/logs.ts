import { Router } from 'express'
import { authGuard } from '../middleware/authGuard'
import { roleGuard } from '../middleware/roleGuard'
import * as logController from '../controllers/logController'

const router = Router()
router.use(authGuard, roleGuard(['ADMIN']))

router.get('/', logController.list)
router.get('/stats', logController.stats)
router.get('/monthly-report', logController.monthlyReport)
router.get('/meta', logController.meta)

export default router
