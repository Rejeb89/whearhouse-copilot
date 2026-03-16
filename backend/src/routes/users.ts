import { Router } from 'express'
import { authGuard } from '../middleware/authGuard'
import { roleGuard } from '../middleware/roleGuard'
import * as userController from '../controllers/userController'

const router = Router()
const readRoles   = ['ADMIN', 'SECTION_CHIEF', 'REGION_CHIEF', 'DISTRICT_MANAGER']
const writeRoles  = ['ADMIN', 'SECTION_CHIEF']
const deleteRoles = ['ADMIN']

router.use(authGuard)

router.get('/',      roleGuard(readRoles),  userController.list)
router.get('/meta',  roleGuard(readRoles),  userController.getMeta)
router.post('/',     roleGuard(writeRoles), userController.create)
router.get('/:id',   roleGuard(readRoles),  userController.getById)
router.put('/:id',   roleGuard(writeRoles), userController.update)
router.delete('/:id',roleGuard(deleteRoles), userController.remove)

export default router
