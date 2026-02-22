import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import client from '../api/client';
import { ArrowLeft, Phone, User, Building2, Plus, Search, Trash2, Edit2, Upload } from 'lucide-react';
import EmployeeModal from '../components/EmployeeModal';
import ExcelImportModal from '../components/ExcelImportModal';

interface Entity {
  id: number;
  name: string;
  type: 'SUPPLIER' | 'BENEFICIARY';
  phone: string;
  unitHead?: string;
  unitHeadPhone?: string;
}

interface Distribution {
  id: number;
  reference: string;
  createdAt: string;
  items: Array<{
    id: number;
    item: {
      id: number;
      name: string;
      sku: string;
    };
    quantity: number;
  }>;
}

interface Employee {
  id: number;
  rank: string;
  name: string;
  surname: string;
  number: string;
  phone?: string;
}

export default function EntityDetails() {
  const { id } = useParams<{ id: string }>();
  const [searchTerm, setSearchTerm] = useState('');
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Fetch entity details
  const { data: entity, isLoading: entityLoading, error: entityError } = useQuery({
    queryKey: [`entity-${id}`],
    queryFn: async () => {
      if (!id) throw new Error('No ID provided');
      const res = await client.get(`/entities/${id}`);
      return res.data.data as Entity;
    },
    enabled: !!id,
    retry: 1,
  });

  // Fetch distributions for this entity
  const { data: distributions = [] } = useQuery({
    queryKey: [`distributions-${id}`],
    queryFn: async () => {
      if (!id) return [];
      const res = await client.get(`/distributions/entity/${id}`);
      return res.data.data as Distribution[];
    },
    enabled: !!id,
  });

  // Fetch employees for this entity
  const { data: employees = [], refetch: refetchEmployees } = useQuery({
    queryKey: [`employees-${id}`],
    queryFn: async () => {
      if (!id) return [];
      const res = await client.get(`/employees/${id}`);
      return res.data.data as Employee[];
    },
    enabled: !!id,
  });

  // Filter distributed items by search
  const filteredDistributions = distributions.filter(dist =>
    dist.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dist.items.some(item => item.item.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Delete employee
  const handleDeleteEmployee = async (employeeId: number) => {
    if (!window.confirm('هل تريد حذف هذا الموظف؟')) return;
    try {
      await client.delete(`/employees/${id}/${employeeId}`);
      refetchEmployees();
    } catch (error) {
      console.error('Error deleting employee:', error);
    }
  };

  // Handle employee form submission
  const handleEmployeeSave = () => {
    setEditingEmployee(null);
    setShowEmployeeModal(false);
    refetchEmployees();
  };

  if (entityLoading) {
    return <div className="text-center py-10">جاري التحميل...</div>;
  }

  if (entityError) {
    return (
      <div className="text-center py-10">
        <p className="text-red-600 mb-2">حدث خطأ في تحميل الجهة</p>
        <p className="text-muted-foreground text-sm">{(entityError as any).message}</p>
        <Link to="/entities" className="text-blue-600 hover:underline mt-4 inline-block">
          العودة للجهات
        </Link>
      </div>
    );
  }

  if (!entity) {
    return (
      <div className="text-center py-10">
        <p className="text-red-600 mb-2">لم يتم العثور على الجهة</p>
        <Link to="/entities" className="text-blue-600 hover:underline mt-4 inline-block">
          العودة للجهات
        </Link>
      </div>
    );
  }

  const typeLabel = entity.type === 'BENEFICIARY' ? 'جهة منتفعة' : 'مورد';

  return (
    <div className="min-h-screen bg-background px-6 py-8" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to="/entities" className="text-primary hover:text-primary/80">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{entity.name}</h1>
            <p className="text-muted-foreground mt-1">{typeLabel}</p>
          </div>
        </div>

        {/* Entity Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Phone className="w-5 h-5 text-primary" />
              <span className="text-muted-foreground">الهاتف</span>
            </div>
            <p className="text-lg font-semibold text-foreground">{entity.phone || 'لم يتم إدخال'}</p>
          </div>

          {entity.unitHead && (
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-5 h-5 text-primary" />
                <span className="text-muted-foreground">رئيس الوحدة</span>
              </div>
              <p className="text-lg font-semibold text-foreground">{entity.unitHead}</p>
            </div>
          )}

          {entity.unitHeadPhone && (
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Phone className="w-5 h-5 text-primary" />
                <span className="text-muted-foreground">هاتف رئيس الوحدة</span>
              </div>
              <p className="text-lg font-semibold text-foreground">{entity.unitHeadPhone}</p>
            </div>
          )}
        </div>

        {/* Distributed Items Section */}
        <div className="rounded-xl border border-border bg-card mb-8">
          <div className="p-6 border-b border-border">
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Building2 className="w-6 h-6 text-primary" />
              التجهيزات المسلمة
            </h2>
          </div>

          {/* Search */}
          <div className="p-6 border-b border-border">
            <div className="relative">
              <Search className="absolute right-3 top-3 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="ابحث في التجهيزات..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pr-10 pl-4 py-2 border border-input bg-background rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent text-sm"
              />
            </div>
          </div>

          {/* Distributions List */}
          <div className="p-6">
            {filteredDistributions.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">لا توجد تجهيزات مسلمة</p>
            ) : (
              <div className="space-y-4">
                {filteredDistributions.map((dist) => (
                  <div key={dist.id} className="border border-border rounded-lg p-4 hover:bg-muted/50 transition">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-semibold text-foreground">المرجع: {dist.reference}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(dist.createdAt).toLocaleString('en-GB')}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {dist.items.map((distItem) => (
                        <div key={distItem.id} className="flex justify-between text-sm bg-muted/50 p-2 rounded-md">
                          <span className="text-foreground">{distItem.item.name} ({distItem.item.sku})</span>
                          <span className="font-semibold text-foreground">الكمية: {distItem.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Employees Section */}
        <div className="rounded-xl border border-border bg-card">
          <div className="p-6 border-b border-border flex justify-between items-center">
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <User className="w-6 h-6 text-primary" />
              موظفو الجهة
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setEditingEmployee(null);
                  setShowEmployeeModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 text-sm font-medium transition"
              >
                <Plus className="w-4 h-4" />
                إضافة موظف
              </button>
              <button
                onClick={() => setShowExcelModal(true)}
                className="flex items-center gap-2 px-4 py-2 border border-border bg-background rounded-lg hover:bg-muted text-sm font-medium transition"
              >
                <Upload className="w-4 h-4" />
                استيراد من Excel
              </button>
            </div>
          </div>

          {/* Employees Table */}
          <div className="p-6">
            {employees.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">لا يوجد موظفون مسجلون</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="px-4 py-3 text-right font-semibold text-muted-foreground">الرتبة</th>
                      <th className="px-4 py-3 text-right font-semibold text-muted-foreground">الاسم</th>
                      <th className="px-4 py-3 text-right font-semibold text-muted-foreground">اللقب</th>
                      <th className="px-4 py-3 text-right font-semibold text-muted-foreground">الرقم</th>
                      <th className="px-4 py-3 text-right font-semibold text-muted-foreground">الهاتف</th>
                      <th className="px-4 py-3 text-right font-semibold text-muted-foreground">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((emp) => (
                      <tr key={emp.id} className="border-b border-border hover:bg-muted/50 transition">
                        <td className="px-4 py-3 text-foreground">{emp.rank}</td>
                        <td className="px-4 py-3 text-foreground">{emp.name}</td>
                        <td className="px-4 py-3 text-foreground">{emp.surname}</td>
                        <td className="px-4 py-3 text-foreground">{emp.number}</td>
                        <td className="px-4 py-3 text-muted-foreground">{emp.phone || '-'}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setEditingEmployee(emp);
                                setShowEmployeeModal(true);
                              }}
                              className="text-primary hover:text-primary/80"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteEmployee(emp.id)}
                              className="text-destructive hover:text-destructive/80"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showEmployeeModal && (
        <EmployeeModal
          entityId={parseInt(id!)}
          employee={editingEmployee}
          onClose={() => {
            setShowEmployeeModal(false);
            setEditingEmployee(null);
          }}
          onSave={handleEmployeeSave}
        />
      )}

      {showExcelModal && (
        <ExcelImportModal
          entityId={parseInt(id!)}
          onClose={() => setShowExcelModal(false)}
          onImport={handleEmployeeSave}
        />
      )}
    </div>
  );
}
