import { Router, Request, Response } from 'express';
import { authGuard } from '../middleware/authGuard';
import { roleGuard } from '../middleware/roleGuard';
import { employeeService } from '../services/employeeService';

const router = Router();

// Get all employees for a specific entity
router.get('/:entityId', authGuard, async (req: Request, res: Response) => {
  try {
    const { entityId } = req.params;
    const employees = await employeeService.getEmployeesByEntity(parseInt(entityId));
    res.json({ success: true, data: employees });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as any).message });
  }
});

// Get single employee
router.get('/:entityId/:id', authGuard, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const employee = await employeeService.getEmployeeById(parseInt(id));
    if (!employee) {
      return res.status(404).json({ success: false, error: 'Employee not found' });
    }
    res.json({ success: true, data: employee });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as any).message });
  }
});

// Create employee
router.post('/:entityId', authGuard, roleGuard(['ADMIN', 'STORE_KEEPER']), async (req: Request, res: Response) => {
  try {
    const { entityId } = req.params;
    const { rank, name, surname, number, phone } = req.body;

    if (!rank || !name || !surname || !number) {
      return res.status(400).json({ success: false, error: 'Missing required fields: rank, name, surname, number' });
    }

    const employee = await employeeService.createEmployee(
      parseInt(entityId),
      String(rank),
      String(name),
      String(surname),
      String(number),
      phone ? String(phone) : undefined
    );
    res.status(201).json({ success: true, data: employee });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as any).message });
  }
});

// Bulk create employees (for Excel import)
router.post('/:entityId/bulk', authGuard, roleGuard(['ADMIN', 'STORE_KEEPER']), async (req: Request, res: Response) => {
  try {
    const { entityId } = req.params;
    const { employees } = req.body;

    if (!Array.isArray(employees) || employees.length === 0) {
      return res.status(400).json({ success: false, error: 'Invalid employees data' });
    }

    // Ensure all fields are strings
    const validatedEmployees = employees.map((emp: any) => ({
      rank: String(emp.rank || '').trim(),
      name: String(emp.name || '').trim(),
      surname: String(emp.surname || '').trim(),
      number: String(emp.number || '').trim(),
      phone: emp.phone ? String(emp.phone).trim() : undefined,
    })).filter((emp: any) => emp.rank && emp.name && emp.surname && emp.number);

    if (validatedEmployees.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid employees found' });
    }

    const createdEmployees = await employeeService.bulkCreateEmployees(parseInt(entityId), validatedEmployees);
    res.status(201).json({ success: true, data: createdEmployees });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as any).message });
  }
});

// Update employee
router.put('/:entityId/:id', authGuard, roleGuard(['ADMIN', 'STORE_KEEPER']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { rank, name, surname, number, phone } = req.body;

    const employee = await employeeService.updateEmployee(parseInt(id), {
      rank,
      name,
      surname,
      number,
      phone,
    });

    res.json({ success: true, data: employee });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as any).message });
  }
});

// Delete employee
router.delete('/:entityId/:id', authGuard, roleGuard(['ADMIN']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const employee = await employeeService.deleteEmployee(parseInt(id));
    res.json({ success: true, data: employee });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as any).message });
  }
});

export default router;
