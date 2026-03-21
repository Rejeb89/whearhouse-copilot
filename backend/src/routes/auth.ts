import { Router } from 'express'
import { authGuard } from '../middleware/authGuard'
import { roleGuard } from '../middleware/roleGuard'
import * as authController from '../controllers/authController'

const router = Router()

router.post('/register', authGuard, roleGuard(['ADMIN']), authController.registerUser)
router.post('/login', authController.loginUser)
router.get('/me', authGuard, authController.getMe)

export default router
