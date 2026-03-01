import { Router } from 'express'
import { authGuard } from '../middleware/authGuard'
import { roleGuard } from '../middleware/roleGuard'
import * as receptionController from '../controllers/receptionController'

const router = Router()
router.use(authGuard)

router.post('/', roleGuard(['ADMIN', 'STORE_KEEPER']), receptionController.create)
router.get('/', receptionController.list)
router.get('/reference-types', receptionController.referenceTypes)
router.get('/by-item/:itemId', receptionController.byItem)
router.get('/recent', receptionController.recent)
router.get('/by-supplier/:supplierId', receptionController.bySupplier)

export default router
