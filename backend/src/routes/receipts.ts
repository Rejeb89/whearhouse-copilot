import { Router } from 'express'
import { authGuard } from '../middleware/authGuard'
import { roleGuard } from '../middleware/roleGuard'
import * as receiptController from '../controllers/receiptController'

const router = Router()
router.use(authGuard)

router.get('/', receiptController.list)
router.get('/distribution/:distId', receiptController.byDistribution)
router.get('/:id', receiptController.getById)
router.patch('/:id/approve', roleGuard(['ADMIN', 'STORE_KEEPER']), receiptController.approve)
router.patch('/:id/cancel', roleGuard(['ADMIN', 'STORE_KEEPER']), receiptController.cancel)
router.patch('/:id/signed-attachment', receiptController.uploadSignedAttachment)

export default router
