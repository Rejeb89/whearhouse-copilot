import { Router } from 'express'
import { authGuard } from '../middleware/authGuard'
import * as fuelController from '../controllers/fuelController'

const router = Router()
router.use(authGuard)

// Prices
router.get('/prices', fuelController.listPrices)
router.post('/prices', fuelController.upsertPrice)

// Records (vehicles with monthly data)
router.get('/records', fuelController.listRecords)
router.post('/records', fuelController.upsertRecord)
router.delete('/records/:id', fuelController.deleteRecord)

// Yearly stats
router.get('/yearly-stats', fuelController.yearlyStats)

export default router
