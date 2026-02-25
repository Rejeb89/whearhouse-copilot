import { useState } from 'react';
import { X } from 'lucide-react';
import client from '../api/client';

interface Employee {
  id: number;
  rank: string;
  name: string;
  surname: string;
  number: string;
  phone?: string;
}

interface EmployeeModalProps {
  entityId: number;
  employee?: Employee | null;
  onClose: () => void;
  onSave: () => void;
}

export default function EmployeeModal({ entityId, employee, onClose, onSave }: EmployeeModalProps) {
  const [formData, setFormData] = useState({
    rank: employee?.rank || '',
    name: employee?.name || '',
    surname: employee?.surname || '',
    number: employee?.number || '',
    phone: employee?.phone || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInput>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (employee) {
        // Update existing employee
        await client.put(`/employees/${entityId}/${employee.id}`, formData);
      } else {
        // Create new employee
        await client.post(`/employees/${entityId}`, formData);
      }
      onSave();
    } catch (err) {
      setError((err as any).response?.data?.error || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" dir="rtl">
      <div className="bg-card rounded-xl border border-border shadow-lg max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-border">
          <h2 className="text-xl font-bold text-foreground">
            {employee ? 'تعديل الموظف' : 'إضافة موظف'}
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              الرتبة *
            </label>
            <input
              type="text"
              name="rank"
              value={formData.rank}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-input bg-background rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent"
              placeholder="مثال: ملازم"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              الاسم *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-input bg-background rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent"
              placeholder="الاسم الأول"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              اللقب *
            </label>
            <input
              type="text"
              name="surname"
              value={formData.surname}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-input bg-background rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent"
              placeholder="الاسم الأخير"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              الرقم *
            </label>
            <input
              type="text"
              name="number"
              value={formData.number}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-input bg-background rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent"
              placeholder="رقم الموظف"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              الهاتف
            </label>
            <input
              type="text"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-input bg-background rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent"
              placeholder="رقم الهاتف (اختياري)"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? 'جاري الحفظ...' : 'حفظ'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-border text-foreground rounded-lg hover:bg-muted/50"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
