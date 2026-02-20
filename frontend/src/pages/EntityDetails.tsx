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
        <p className="text-gray-600 text-sm">{(entityError as any).message}</p>
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
    <div className="min-h-screen bg-slate-50 px-6 py-8" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to="/entities" className="text-blue-600 hover:text-blue-700">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{entity.name}</h1>
            <p className="text-gray-600 mt-1">{typeLabel}</p>
          </div>
        </div>

        {/* Entity Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center gap-2 mb-2">
              <Phone className="w-5 h-5 text-blue-600" />
              <span className="text-gray-600">الهاتف</span>
            </div>
            <p className="text-lg font-semibold">{entity.phone || 'لم يتم إدخال'}</p>
          </div>

          {entity.unitHead && (
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-5 h-5 text-blue-600" />
                <span className="text-gray-600">رئيس الوحدة</span>
              </div>
              <p className="text-lg font-semibold">{entity.unitHead}</p>
            </div>
          )}

          {entity.unitHeadPhone && (
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center gap-2 mb-2">
                <Phone className="w-5 h-5 text-blue-600" />
                <span className="text-gray-600">هاتف رئيس الوحدة</span>
              </div>
              <p className="text-lg font-semibold">{entity.unitHeadPhone}</p>
            </div>
          )}
        </div>

        {/* Distributed Items Section */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Building2 className="w-6 h-6 text-blue-600" />
              التجهيزات المسلمة
            </h2>
          </div>

          {/* Search */}
          <div className="p-6 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="ابحث في التجهيزات..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Distributions List */}
          <div className="p-6">
            {filteredDistributions.length === 0 ? (
              <p className="text-gray-500 text-center py-8">لا توجد تجهيزات مسلمة</p>
            ) : (
              <div className="space-y-4">
                {filteredDistributions.map((dist) => (
                  <div key={dist.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-semibold text-gray-900">المرجع: {dist.reference}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(dist.createdAt).toLocaleString('en-GB')}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {dist.items.map((distItem) => (
                        <div key={distItem.id} className="flex justify-between text-sm bg-gray-50 p-2 rounded">
                          <span>{distItem.item.name} ({distItem.item.sku})</span>
                          <span className="font-semibold">الكمية: {distItem.quantity}</span>
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
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <User className="w-6 h-6 text-blue-600" />
              موظفو الجهة
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setEditingEmployee(null);
                  setShowEmployeeModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                إضافة موظف
              </button>
              <button
                onClick={() => setShowExcelModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Upload className="w-4 h-4" />
                استيراد من Excel
              </button>
            </div>
          </div>

          {/* Employees Table */}
          <div className="p-6">
            {employees.length === 0 ? (
              <p className="text-gray-500 text-center py-8">لا يوجد موظفون مسجلون</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">الرتبة</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">الاسم</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">اللقب</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">الرقم</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">الهاتف</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((emp) => (
                      <tr key={emp.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3">{emp.rank}</td>
                        <td className="px-4 py-3">{emp.name}</td>
                        <td className="px-4 py-3">{emp.surname}</td>
                        <td className="px-4 py-3">{emp.number}</td>
                        <td className="px-4 py-3">{emp.phone || '-'}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setEditingEmployee(emp);
                                setShowEmployeeModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteEmployee(emp.id)}
                              className="text-red-600 hover:text-red-700"
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
