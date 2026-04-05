import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { authGuard } from '../middleware/authGuard'
import { roleGuard } from '../middleware/roleGuard'
import * as authController from '../controllers/authController'

const router = Router()

// ✅ Rate limiting: Prevent brute force attacks (5 attempts per 15 minutes)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 5,                      // limit each IP to 5 requests per windowMs
  message: 'محاولات دخول كثيرة جداً، حاول مرة أخرى بعد 15 دقيقة',
  standardHeaders: true,       // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false,        // Disable the `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting for health checks and admin IPs if needed
    return req.path === '/health'
  },
})

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 3,                     // limit each IP to 3 registration attempts per hour
  message: 'محاولات تسجيل كثيرة جداً، حاول مرة أخرى لاحقاً',
})

router.post('/register', registerLimiter, authGuard, roleGuard(['ADMIN']), authController.registerUser)
router.post('/login', loginLimiter, authController.loginUser)
router.get('/me', authGuard, authController.getMe)

export default router
