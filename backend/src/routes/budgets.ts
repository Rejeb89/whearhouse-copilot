import { Router } from 'express'
import { authGuard } from '../middleware/authGuard'
import { roleGuard } from '../middleware/roleGuard'
import * as budgetController from '../controllers/budgetController'

const router = Router()
router.use(authGuard)

router.get('/', budgetController.list)
router.post('/', roleGuard(['ADMIN', 'SECTION_CHIEF']), budgetController.create)
router.put('/:id', roleGuard(['ADMIN', 'SECTION_CHIEF']), budgetController.update)
router.delete('/:id', roleGuard(['ADMIN', 'SECTION_CHIEF']), budgetController.remove)

router.get('/expenses/by-supplier/:name', budgetController.expensesBySupplier)
router.get('/supply-requests/by-supplier/:name', budgetController.supplyRequestsBySupplier)

router.get('/:id/expenses', budgetController.listExpenses)
router.post('/:id/expenses', roleGuard(['ADMIN', 'SECTION_CHIEF']), budgetController.createExpense)
router.delete('/expenses/:id', roleGuard(['ADMIN', 'SECTION_CHIEF']), budgetController.deleteExpense)

router.get('/:id/supply-requests', budgetController.listSupplyRequests)
router.post('/:id/supply-requests', budgetController.createSupplyRequest)
router.delete('/supply-requests/:id', roleGuard(['ADMIN']), budgetController.deleteSupplyRequest)

export default router
