import { Router } from 'express'
import * as projectController from '../controllers/projectController'
import { authGuard } from '../middleware/authGuard'

const router = Router()

router.use(authGuard)

router.get('/',           projectController.list)
router.get('/stats',      projectController.stats)
router.get('/:id',        projectController.getById)
router.post('/',          projectController.create)
router.patch('/:id',      projectController.update)
router.delete('/:id',     projectController.remove)

export default router
