import { Router } from 'express'
import { authGuard } from '../middleware/authGuard'
import * as vehicleController from '../controllers/vehicleController'

const router = Router()
router.use(authGuard)

router.get('/', vehicleController.list)
router.get('/:id', vehicleController.getById)
router.post('/', vehicleController.create)
router.patch('/:id', vehicleController.update)
router.delete('/:id', vehicleController.remove)

export default router
