import { Router } from 'express'
import { authGuard } from '../middleware/authGuard'
import * as searchController from '../controllers/searchController'

const router = Router()

router.get('/', authGuard, searchController.search)

export default router
