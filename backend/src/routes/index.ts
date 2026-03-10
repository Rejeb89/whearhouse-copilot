import { Router } from 'express'
import authRoutes from './auth'
import usersRoutes from './users'
import itemsRoutes from './items'
import receptionsRoutes from './receptions'
import distributionsRoutes from './distributions'
import logsRoutes from './logs'
import entitiesRoutes from './entities'
import employeesRoutes from './employees'
import auditRoutes from './audit'
import dataRoutes from './data'
import searchRoutes from './search'
import budgetsRoutes from './budgets'
import receiptsRoutes from './receipts'
import vehiclesRoutes from './vehicles'
import monitoringRoutes from './monitoring'
import projectsRoutes from './projects'

const router = Router()

router.use('/auth', authRoutes)
router.use('/users', usersRoutes)
router.use('/items', itemsRoutes)
router.use('/receptions', receptionsRoutes)
router.use('/distributions', distributionsRoutes)
router.use('/logs', logsRoutes)
router.use('/entities', entitiesRoutes)
router.use('/employees', employeesRoutes)
router.use('/audit', auditRoutes)
router.use('/data', dataRoutes)
router.use('/search', searchRoutes)
router.use('/budgets', budgetsRoutes)
router.use('/receipts', receiptsRoutes)
router.use('/vehicles', vehiclesRoutes)
router.use('/monitoring', monitoringRoutes)
router.use('/projects', projectsRoutes)

export default router
