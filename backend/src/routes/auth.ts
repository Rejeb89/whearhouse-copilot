import { Router } from 'express'
import { authGuard } from '../middleware/authGuard'
import * as authController from '../controllers/authController'

const router = Router()

router.post('/register', authController.registerUser)
router.post('/login', authController.loginUser)
router.get('/me', authGuard, authController.getMe)

export default router
