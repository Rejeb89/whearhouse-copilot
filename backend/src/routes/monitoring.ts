import { Router } from 'express'
import { authGuard } from '../middleware/authGuard'
import { monitoringRoleGuard, unitAccessGuard } from '../middleware/monitoringGuard'
import * as monitoringController from '../controllers/monitoringController'

const router = Router()
router.use(authGuard, monitoringRoleGuard)

router.get('/units', monitoringController.listUnits)
router.get('/units/:unit/overview',   unitAccessGuard, monitoringController.unitOverview)
router.get('/units/:unit/items/:itemId', unitAccessGuard, monitoringController.unitItemDetail)
router.get('/units/:unit/items',      unitAccessGuard, monitoringController.unitItems)
router.get('/units/:unit/vehicles',   unitAccessGuard, monitoringController.unitVehicles)
router.get('/units/:unit/receptions', unitAccessGuard, monitoringController.unitReceptions)
router.get('/units/:unit/distributions', unitAccessGuard, monitoringController.unitDistributions)
router.get('/units/:unit/entities',   unitAccessGuard, monitoringController.unitEntities)
router.get('/units/:unit/budgets',    unitAccessGuard, monitoringController.unitBudgets)
router.get('/units/:unit/logs/stats',     unitAccessGuard, monitoringController.unitLogStats)
router.get('/units/:unit/logs/monthly',   unitAccessGuard, monitoringController.unitLogMonthly)
router.get('/units/:unit/logs/inventory', unitAccessGuard, monitoringController.unitLogInventory)
router.get('/units/:unit/logs',       unitAccessGuard, monitoringController.unitLogs)
router.get('/units/:unit/users',      unitAccessGuard, monitoringController.unitUsers)
router.get('/units/:unit/receipts',   unitAccessGuard, monitoringController.unitReceipts)

export default router
