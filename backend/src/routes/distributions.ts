import { Router } from 'express'
import { authGuard } from '../middleware/authGuard'
import { roleGuard } from '../middleware/roleGuard'
import * as distributionController from '../controllers/distributionController'

const router = Router()
router.use(authGuard)

router.post('/', roleGuard(['ADMIN', 'STORE_KEEPER', 'USER']), distributionController.create)
router.get('/', distributionController.list)
router.get('/recent', distributionController.recent)
router.get('/item/:id', distributionController.byItem)
router.get('/entity/:id', distributionController.byEntity)

export default router
