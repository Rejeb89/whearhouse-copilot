import { useState, useMemo, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AuthContext } from '../context/AuthContext';
import * as XLSX from 'xlsx';
import client from '../services/client';
import {
  ArrowRight, Phone, User, Plus, Search, Trash2, Edit2, Upload,
  Download, FileText, Filter, X, ChevronDown, Package, CalendarRange,
  ShoppingCart, Paperclip, Building2, Inbox, Pencil, Car, Fuel,
  HardHat, Hammer, BookOpen, CheckCircle2, AlertTriangle, BadgePercent,
  CalendarDays, DollarSign
} from 'lucide-react';
import EmployeeModal from '../components/modals/EmployeeModal';
import ExcelImportModal from '../components/modals/ExcelImportModal';
import EntityModal from '../components/modals/EntityModal';
import { Receipt, ReceiptPrintTemplate, downloadPDF } from '../components/receipts/ReceiptPrintTemplate';

interface Entity {
  id: number;
  name: string;
  type: 'SUPPLIER' | 'BENEFICIARY';
  category?: string;
  subCategory?: string;
  phone: string;
  unitHead?: string;
  unitHeadPhone?: string;
}

interface Distribution {
  id: number;
  reference: string;
  createdAt: string;
  deliveredByName?: string;
  notes?: string;
  user?: { id: number; email: string; name?: string };
  assignedTo?: { id: number; rank: string; name: string; surname: string };
  receipt?: { id: number; serialNumber: string; status: string; issuedAt: string } | null;
  items: Array<{
    id: number;
    quantity: number;
    serialNumber?: string;
    condition?: string;
    item: { id: number; name: string; sku: string; category?: string };
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

interface Vehicle {
  id: number;
  adminNumber: string;
  type: string;
  fuelType: string;
  entityId: number;
  notes?: string;
}

interface Project {
  id: number;
  name: string;
  type: 'CONSTRUCTION' | 'DEVELOPMENT' | 'PROTECTION';
  status: 'STUDY' | 'WORK' | 'COMPLETED' | 'SUSPENDED';
  entityId: number;
  progress: number;
  budget: number;
  budgetYear: number;
  extraBudget?: number;
  extraBudgetYear?: number;
  startDate?: string;
  expectedEndDate?: string;
  notes?: string;
}

const PROJ_TYPE_LABELS: Record<string, string> = {
  CONSTRUCTION: 'بناء',
  DEVELOPMENT: 'تهيئة',
  PROTECTION: 'حماية وتسييج',
};
const PROJ_STATUS_LABELS: Record<string, string> = {
  STUDY: 'طور الدراسات',
  WORK: 'طور الأشغال',
  COMPLETED: 'مكتمل',
  SUSPENDED: 'موقوف',
};
const PROJ_STATUS_BADGE: Record<string, string> = {
  STUDY: 'bg-blue-100 text-blue-700 border border-blue-200',
  WORK: 'bg-green-100 text-green-700 border border-green-200',
  COMPLETED: 'bg-slate-100 text-slate-600 border border-slate-200',
  SUSPENDED: 'bg-red-100 text-red-600 border border-red-200',
};
const PROJ_TYPE_BAR: Record<string, string> = {
  CONSTRUCTION: 'bg-orange-500',
  DEVELOPMENT: 'bg-violet-500',
  PROTECTION: 'bg-teal-500',
};
const projProgressColor = (p: number) => {
  if (p >= 100) return 'bg-emerald-500';
  if (p >= 60) return 'bg-blue-500';
  if (p >= 30) return 'bg-amber-400';
  return 'bg-red-400';
};

const MONITORING_ONLY_ROLES = ['REGION_CHIEF', 'DISTRICT_MANAGER'];

export default function EntityDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user: entityUser } = useContext(AuthContext);
  const isReadOnly = MONITORING_ONLY_ROLES.includes(entityUser?.role ?? '');
  const backPath = isReadOnly ? '/monitoring' : '/entities';
  const [searchTerm, setSearchTerm] = useState('');
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [showEntityModal, setShowEntityModal] = useState(false);

  // Distribution filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [itemFilter, setItemFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Receipt download
  const [downloadingReceiptId, setDownloadingReceiptId] = useState<number | null>(null);
  const [downloadReceiptData, setDownloadReceiptData] = useState<Receipt | null>(null);

  // Reception (received items) filters
  const [recepSearch, setRecepSearch] = useState('');
  const [recepDateFrom, setRecepDateFrom] = useState('');
  const [recepDateTo, setRecepDateTo] = useState('');
  const [recepItemFilter, setRecepItemFilter] = useState('');
  const [recepRefTypeFilter, setRecepRefTypeFilter] = useState('');
  const [recepCategoryFilter, setRecepCategoryFilter] = useState('');
  const [showRecepFilters, setShowRecepFilters] = useState(false);

  // Fetch entity details
  const { data: entity, isLoading: entityLoading, error: entityError, refetch: refetchEntity } = useQuery({
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

  // Fetch budget expenses for supplier entity
  const isSupplier = entity?.subCategory === 'مزود';
  const { data: supplierExpenses = [] } = useQuery({
    queryKey: [`supplier-expenses-${id}`, entity?.name],
    queryFn: async () => {
      const res = await client.get(`/budgets/expenses/by-supplier/${encodeURIComponent(entity!.name)}`);
      return res.data.data as any[];
    },
    enabled: !!entity && isSupplier,
  });
  const { data: supplierSupplyRequests = [] } = useQuery({
    queryKey: [`supplier-supply-requests-${id}`, entity?.name],
    queryFn: async () => {
      const res = await client.get(`/budgets/supply-requests/by-supplier/${encodeURIComponent(entity!.name)}`);
      return res.data.data as any[];
    },
    enabled: !!entity && isSupplier,
  });

  // Fetch projects for this entity
  const { data: entityProjects = [] } = useQuery<Project[]>({
    queryKey: [`projects-entity-${id}`],
    queryFn: async () => {
      const res = await client.get(`/projects?entityId=${id}`);
      return res.data.data as Project[];
    },
    enabled: !!id,
  });

  // Fetch vehicles for this entity
  const { data: entityVehicles = [] } = useQuery<Vehicle[]>({
    queryKey: [`vehicles-entity-${id}`],
    queryFn: async () => {
      const res = await client.get('/vehicles');
      return (res.data.data as Vehicle[]).filter(v => String(v.entityId) === String(id));
    },
    enabled: !!id,
  });

  // Collect unique item names and categories for filter dropdowns
  const allItemNames = useMemo(() => {
    const names = new Set<string>();
    distributions.forEach(d => d.items.forEach(i => names.add(i.item.name)));
    return Array.from(names).sort();
  }, [distributions]);

  const allDistribCategories = useMemo(() => {
    const cats = new Set<string>();
    distributions.forEach(d => d.items.forEach(i => { if ((i.item as any).category) cats.add((i.item as any).category); }));
    return Array.from(cats).sort();
  }, [distributions]);

  // Fetch receptions by supplier (items received FROM this entity)
  const { data: receptions = [] } = useQuery({
    queryKey: [`receptions-supplier-${id}`],
    queryFn: async () => {
      if (!id) return [];
      const res = await client.get(`/receptions/by-supplier/${id}`);
      return res.data.data as any[];
    },
    enabled: !!id,
  });

  const allRecepItemNames = useMemo(() => {
    const names = new Set<string>();
    receptions.forEach((r: any) => r.items?.forEach((ri: any) => { if (ri?.item?.name) names.add(ri.item.name); }));
    return Array.from(names).sort();
  }, [receptions]);

  const allRecepCategories = useMemo(() => {
    const cats = new Set<string>();
    receptions.forEach((r: any) => r.items?.forEach((ri: any) => { if (ri?.item?.category) cats.add(ri.item.category); }));
    return Array.from(cats).sort();
  }, [receptions]);

  const allRecepRefTypes = useMemo(() => {
    const types = new Set<string>();
    receptions.forEach((r: any) => { if (r.referenceType) types.add(r.referenceType); });
    return Array.from(types).sort();
  }, [receptions]);

  const filteredReceptions = useMemo(() => {
    return receptions.filter((r: any) => {
      if (recepRefTypeFilter && r.referenceType !== recepRefTypeFilter) return false;
      if (recepCategoryFilter && !r.items?.some((ri: any) => ri?.item?.category === recepCategoryFilter)) return false;
      if (recepItemFilter && !r.items?.some((ri: any) => ri?.item?.name === recepItemFilter)) return false;
      if (recepDateFrom && new Date(r.createdAt) < new Date(recepDateFrom)) return false;
      if (recepDateTo) {
        const t = new Date(recepDateTo); t.setHours(23, 59, 59, 999);
        if (new Date(r.createdAt) > t) return false;
      }
      if (recepSearch.trim()) {
        const q = recepSearch.trim().toLowerCase();
        return (
          (r.referenceNumber || '').toLowerCase().includes(q) ||
          (r.referenceType || '').toLowerCase().includes(q) ||
          (r.notes || '').toLowerCase().includes(q) ||
          (r.collector ? `${r.collector.rank} ${r.collector.name} ${r.collector.surname} ${r.collector.number}`.toLowerCase().includes(q) : false) ||
          r.items?.some((ri: any) =>
            (ri?.item?.name || '').toLowerCase().includes(q) ||
            (ri?.item?.sku || '').toLowerCase().includes(q) ||
            (ri?.item?.category || '').toLowerCase().includes(q) ||
            (ri?.item?.description || '').toLowerCase().includes(q) ||
            (ri?.adminNumber || '').toLowerCase().includes(q)
          )
        );
      }
      return true;
    });
  }, [receptions, recepSearch, recepDateFrom, recepDateTo, recepItemFilter, recepRefTypeFilter, recepCategoryFilter]);

  const handleExportReceptionsXLSX = () => {
    const rows: any[] = [];
    filteredReceptions.forEach((r: any, idx: number) => {
      (r.items || []).forEach((ri: any) => {
        rows.push({
          '#': idx + 1,
          'اسم التجهيز': ri?.item?.name || '—',
          'الكمية': ri?.quantity || 0,
          'الرقم الإداري': ri?.adminNumber || '—',
          'المرجع': r.referenceType || '—',
          'رقم المرجع': r.referenceNumber || '—',
          'تاريخ المرجع': r.referenceDate ? new Date(r.referenceDate).toLocaleDateString('ar-TN') : '—',
          'تاريخ الاستلام': new Date(r.createdAt).toLocaleDateString('ar-TN'),
          'المتسلم': r.collector ? `${r.collector.rank} ${r.collector.name} ${r.collector.surname}` : '—',
          'ملاحظات': r.notes || '—',
        });
      });
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const colW = [4, 30, 8, 16, 16, 14, 16, 16, 22, 20].map(w => ({ wch: w }));
    ws['!cols'] = colW;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'التجهيزات المستلمة');
    XLSX.writeFile(wb, `تجهيزات-مستلمة-${entity?.name || id}.xlsx`);
  };

  const handleExportReceptionsPDF = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    let y = 18;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(`Receptions: ${entity?.name || ''}`, pageW / 2, y, { align: 'center' });
    y += 8;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(new Date().toLocaleDateString('ar-TN'), pageW - 10, y, { align: 'right' });
    y += 6;
    const headers = ['#', 'اسم التجهيز', 'الكمية', 'الرقم الإداري', 'المرجع', 'رقم المرجع', 'تاريخ الاستلام', 'المتسلم'];
    const colWidths = [8, 55, 14, 24, 28, 24, 26, 40];
    const drawRow = (cells: string[], rowY: number, isHeader: boolean) => {
      let x = 10;
      cells.forEach((cell, ci) => {
        if (isHeader) { doc.setFillColor(30, 58, 95); doc.setTextColor(255, 255, 255); doc.rect(x, rowY, colWidths[ci], 7, 'F'); }
        else { doc.setTextColor(30, 30, 60); }
        doc.setFontSize(isHeader ? 7.5 : 7);
        doc.setFont('helvetica', isHeader ? 'bold' : 'normal');
        doc.text(cell, x + colWidths[ci] - 2, rowY + 5, { align: 'right', maxWidth: colWidths[ci] - 3 });
        doc.setDrawColor(200, 210, 220);
        doc.rect(x, rowY, colWidths[ci], 7);
        x += colWidths[ci];
      });
    };
    drawRow(headers, y, true);
    y += 7;
    let rowNum = 0;
    filteredReceptions.forEach((r: any) => {
      (r.items || []).forEach((ri: any) => {
        rowNum++;
        if (y > 185) { doc.addPage(); y = 15; drawRow(headers, y, true); y += 7; }
        if (rowNum % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(10, y, colWidths.reduce((a, b) => a + b, 0), 7, 'F'); }
        const cells = [
          String(rowNum),
          ri?.item?.name || '—',
          String(ri?.quantity || 0),
          ri?.adminNumber || '—',
          r.referenceType || '—',
          r.referenceNumber || '—',
          new Date(r.createdAt).toLocaleDateString('ar-TN'),
          r.collector ? `${r.collector.rank} ${r.collector.name} ${r.collector.surname}` : '—',
        ];
        drawRow(cells, y, false);
        y += 7;
      });
    });
    doc.save(`تجهيزات-مستلمة-${entity?.name || id}.pdf`);
  };

  // Multi-filter distributions
  const filteredDistributions = useMemo(() => {
    return distributions.filter(dist => {
      const text = searchTerm.trim().toLowerCase();
      if (text && !(
        dist.reference.toLowerCase().includes(text) ||
        (dist.receipt?.serialNumber || '').toLowerCase().includes(text) ||
        (dist.referenceNumber || '').toLowerCase().includes(text) ||
        (dist.referenceType || '').toLowerCase().includes(text) ||
        (dist.notes || '').toLowerCase().includes(text) ||
        (dist.deliveredByName || '').toLowerCase().includes(text) ||
        (dist.assignedTo ? `${dist.assignedTo.rank} ${dist.assignedTo.name} ${dist.assignedTo.surname} ${dist.assignedTo.number}`.toLowerCase().includes(text) : false) ||
        dist.items.some(i =>
          i.item.name.toLowerCase().includes(text) ||
          ((i.item as any).sku || '').toLowerCase().includes(text) ||
          ((i.item as any).category || '').toLowerCase().includes(text) ||
          ((i.item as any).description || '').toLowerCase().includes(text) ||
          ((i as any).adminNumber || '').toLowerCase().includes(text)
        )
      )) return false;

      if (itemFilter && !dist.items.some(i => i.item.name === itemFilter)) return false;
      if (categoryFilter && !dist.items.some(i => (i.item as any).category === categoryFilter)) return false;

      if (dateFrom) {
        const d = new Date(dist.createdAt); const f = new Date(dateFrom);
        if (d < f) return false;
      }
      if (dateTo) {
        const d = new Date(dist.createdAt); const t = new Date(dateTo);
        t.setHours(23, 59, 59, 999);
        if (d > t) return false;
      }

      return true;
    });
  }, [distributions, searchTerm, dateFrom, dateTo, itemFilter, categoryFilter]);

  // Download receipt PDF
  const handleDownloadReceipt = async (distributionId: number) => {
    setDownloadingReceiptId(distributionId);
    try {
      const res = await client.get(`/receipts/distribution/${distributionId}`);
      const receipt: Receipt = res.data.data;
      setDownloadReceiptData(receipt);
      await new Promise(r => setTimeout(r, 400));
      const sn = receipt.serialNumber || `dist-${distributionId}`;
      await downloadPDF('entity-receipt-print-area', `${sn}.pdf`);
    } catch {
      alert('تعذر تحميل وصل التسليم');
    } finally {
      setDownloadingReceiptId(null);
    }
  };

  // Export filtered distributions to Excel
  const handleExportCSV = () => {
    const rows = filteredDistributions.map(d => ({
      'رقم الوصل': d.receipt?.serialNumber || '—',
      'المرجع': d.reference,
      'التجهيزات': d.items.map(i => i.item.name).join(' | '),
      'الكمية الإجمالية': d.items.reduce((s, i) => s + i.quantity, 0),
      'المكلف بالاستلام': d.assignedTo ? `${d.assignedTo.rank} ${d.assignedTo.name} ${d.assignedTo.surname}` : (d.deliveredByName || '—'),
      'تاريخ التسليم': new Date(d.createdAt).toLocaleDateString('en-GB'),
      'حالة الوصل': d.receipt ? (d.receipt.status === 'APPROVED' ? 'معتمد' : d.receipt.status === 'CANCELLED' ? 'ملغى' : 'مسودة') : 'لا يوجد وصل',
    }));
    
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'التجهيزات المسلمة');
    XLSX.writeFile(wb, `تجهيزات-${entity?.name || id}.xlsx`);
  };

  const clearFilters = () => { setSearchTerm(''); setDateFrom(''); setDateTo(''); setItemFilter(''); setCategoryFilter(''); };

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

  const handleEntitySuccess = () => {
    refetchEntity();
    qc.invalidateQueries(['entities']);
    setShowEntityModal(false);
  };

  const handleDeleteEntity = async () => {
    if (!entity) return;
    if (!confirm(`هل تريد حذف الجهة «${entity.name}» نهائياً؟`)) return;
    try {
      await client.delete(`/entities/${id}`);
      navigate('/entities');
    } catch (err: any) {
      alert(err?.response?.data?.error || 'خطأ في حذف الجهة');
    }
  };

  if (entityLoading) {
    return <div className="text-center py-10">جاري التحميل...</div>;
  }

  if (entityError) {
    return (
      <div className="text-center py-10">
        <p className="text-red-600 mb-2">حدث خطأ في تحميل الجهة</p>
        <p className="text-muted-foreground text-sm">{(entityError as any).message}</p>
        <Link to={backPath} className="text-blue-600 hover:underline mt-4 inline-block">
          {isReadOnly ? 'العودة للمراقبة' : 'العودة للجهات'}
        </Link>
      </div>
    );
  }

  if (!entity) {
    return (
      <div className="text-center py-10">
        <p className="text-red-600 mb-2">لم يتم العثور على الجهة</p>
        <Link to={backPath} className="text-blue-600 hover:underline mt-4 inline-block">
          {isReadOnly ? 'العودة للمراقبة' : 'العودة للجهات'}
        </Link>
      </div>
    );
  }

  const typeLabel = entity.type === 'BENEFICIARY' ? 'جهة منتفعة' : 'مورد';

  return (
    <div className="min-h-screen bg-background px-6 py-8" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(backPath)} className="text-primary hover:text-primary/80">
              <ArrowRight className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">{entity.name}</h1>
              <p className="text-muted-foreground mt-1">{typeLabel}</p>
            </div>
          </div>
          {/* Edit / Delete buttons — top left */}
          {!isReadOnly && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEntityModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium border border-border bg-card rounded-lg hover:bg-muted transition-colors"
            >
              <Pencil className="w-4 h-4" />تعديل
            </button>
            <button
              onClick={handleDeleteEntity}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium border border-destructive/40 text-destructive bg-card rounded-lg hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="w-4 h-4" />حذف
            </button>
          </div>
          )}
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

          {!isSupplier && entityVehicles.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Car className="w-5 h-5 text-primary" />
                <span className="text-muted-foreground">الوسائل الإدارية</span>
              </div>
              <p className="text-lg font-semibold text-foreground">{entityVehicles.length} وسيلة</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {entityVehicles.slice(0, 3).map(v => (
                  <span key={v.id} className="text-xs bg-primary/10 text-primary rounded px-1.5 py-0.5 font-mono">{v.adminNumber}</span>
                ))}
                {entityVehicles.length > 3 && (
                  <span className="text-xs text-muted-foreground">+{entityVehicles.length - 3}</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Vehicles card — show only for beneficiary entities */}
        {!isSupplier && entityVehicles.length > 0 && (
          <div className="rounded-xl border border-border bg-card mb-8 overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Car className="w-4 h-4 text-primary" />
                الوسائل الإدارية
                <span className="text-xs font-normal text-muted-foreground bg-muted rounded-full px-2 py-0.5">{entityVehicles.length} وسيلة</span>
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="px-4 py-2.5 text-right font-semibold text-muted-foreground text-xs">#</th>
                    <th className="px-4 py-2.5 text-right font-semibold text-muted-foreground text-xs">الرقم الإداري</th>
                    <th className="px-4 py-2.5 text-right font-semibold text-muted-foreground text-xs">نوع الوسيلة</th>
                    <th className="px-4 py-2.5 text-right font-semibold text-muted-foreground text-xs">نوع الوقود</th>
                    <th className="px-4 py-2.5 text-right font-semibold text-muted-foreground text-xs">ملاحظات</th>
                  </tr>
                </thead>
                <tbody>
                  {entityVehicles.map((v, i) => {
                    const fuelColor: Record<string, string> = {
                      'بنزين رفيع': 'bg-blue-100 text-blue-700',
                      'غزوال':      'bg-amber-100 text-amber-700',
                    };
                    return (
                      <tr key={v.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition">
                        <td className="px-4 py-2.5 text-muted-foreground text-xs">{i + 1}</td>
                        <td className="px-4 py-2.5 font-mono font-semibold text-foreground">{v.adminNumber}</td>
                        <td className="px-4 py-2.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-medium">
                            <Car className="w-3 h-3" />{v.type}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${fuelColor[v.fuelType] || 'bg-muted text-muted-foreground'}`}>
                            <Fuel className="w-3 h-3" />{v.fuelType}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground text-xs">{v.notes || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2.5 bg-muted/20 border-t border-dashed border-border text-xs text-muted-foreground flex flex-wrap gap-4">
              {['50','غزوال عادي','غزوال بيك أب','P4','حافلة','شاحنة','سيارة إدارية'].map(t => {
                const cnt = entityVehicles.filter(v => v.type === t).length;
                return cnt > 0 ? <span key={t}>{t}: <strong className="text-foreground">{cnt}</strong></span> : null;
              })}
              {/* unknown types */}
              {entityVehicles.filter(v => !['50','غزوال عادي','غزوال بيك أب','P4','حافلة','شاحنة','سيارة إدارية'].includes(v.type)).map(v => (
                <span key={v.id}>{v.type}: <strong className="text-foreground">1</strong></span>
              ))}
            </div>
          </div>
        )}

        {/* Projects section */}
        {entityProjects.length > 0 && (
          <div className="rounded-xl border border-border bg-card mb-8 overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <HardHat className="w-4 h-4 text-primary" />
                المشاريع الجارية
                <span className="text-xs font-normal text-muted-foreground bg-muted rounded-full px-2 py-0.5">{entityProjects.length} مشروع</span>
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
              {entityProjects.map((p) => (
                <div key={p.id} className="rounded-xl border border-border bg-background overflow-hidden">
                  <div className={`h-1 w-full ${PROJ_TYPE_BAR[p.type]}`} />
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${PROJ_STATUS_BADGE[p.status]} mb-1`}>
                          {p.status === 'STUDY' && <BookOpen className="w-3 h-3" />}
                          {p.status === 'WORK' && <Hammer className="w-3 h-3" />}
                          {p.status === 'COMPLETED' && <CheckCircle2 className="w-3 h-3" />}
                          {p.status === 'SUSPENDED' && <AlertTriangle className="w-3 h-3" />}
                          {PROJ_STATUS_LABELS[p.status]}
                        </span>
                        <p className="font-bold text-foreground text-sm">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{PROJ_TYPE_LABELS[p.type]}</p>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground">نسبة الإنجاز</span>
                        <span className="font-bold text-foreground">{p.progress}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div className={`h-2 rounded-full transition-all ${projProgressColor(p.progress)}`} style={{ width: `${p.progress}%` }} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg bg-muted/50 px-3 py-2">
                        <div className="text-muted-foreground flex items-center gap-1 mb-0.5"><DollarSign className="w-3 h-3" />الاعتماد</div>
                        <div className="font-bold text-foreground">{p.budget.toLocaleString('ar-TN')} <span className="font-normal text-muted-foreground">د.ت</span></div>
                        <div className="text-muted-foreground">{p.budgetYear}</div>
                      </div>
                      {p.extraBudget != null && p.extraBudget > 0 ? (
                        <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2">
                          <div className="text-amber-700 flex items-center gap-1 mb-0.5"><BadgePercent className="w-3 h-3" />إضافي</div>
                          <div className="font-bold text-amber-800">{p.extraBudget.toLocaleString('ar-TN')} <span className="font-normal">د.ت</span></div>
                          {p.extraBudgetYear && <div className="text-amber-600">{p.extraBudgetYear}</div>}
                        </div>
                      ) : (
                        <div className="rounded-lg bg-muted/50 px-3 py-2">
                          <div className="text-muted-foreground flex items-center gap-1 mb-0.5"><CalendarDays className="w-3 h-3" />بداية</div>
                          <div className="font-bold text-foreground">{p.startDate ? new Date(p.startDate).toLocaleDateString('ar-TN') : '—'}</div>
                        </div>
                      )}
                    </div>
                    {p.notes && (
                      <p className="text-xs text-muted-foreground border-t border-dashed border-border pt-2 line-clamp-2">{p.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Supplier sections: budget invoices + supply requests */}
        {isSupplier && (
          <>
            {/* Budget Invoices */}
            <div className="rounded-xl border border-border bg-card mb-8">
              <div className="p-5 border-b border-border flex items-center justify-between gap-3">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  الفواتير المرتبطة بالاعتمادات المالية
                  <span className="text-sm font-normal text-muted-foreground bg-muted rounded-full px-2 py-0.5">{supplierExpenses.length}</span>
                </h2>
              </div>
              {supplierExpenses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <FileText className="w-8 h-8 mb-2 opacity-20" />
                  <p className="text-sm">لا توجد فواتير مسجلة</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b border-border">
                      <tr>
                        <th className="px-4 py-3 text-right font-semibold text-muted-foreground">التاريخ</th>
                        <th className="px-4 py-3 text-right font-semibold text-muted-foreground">الاعتماد المالي</th>
                        <th className="px-4 py-3 text-right font-semibold text-muted-foreground">رقم الفاتورة</th>
                        <th className="px-4 py-3 text-right font-semibold text-muted-foreground">المبلغ</th>
                        <th className="px-4 py-3 text-right font-semibold text-muted-foreground">الملاحظات</th>
                        <th className="px-4 py-3 text-center font-semibold text-muted-foreground">المرفقات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {supplierExpenses.map((exp: any) => (
                        <tr key={exp.id} className="border-b border-border hover:bg-muted/30 transition">
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{exp.date}</td>
                          <td className="px-4 py-3 text-foreground">{exp.budget?.name || '—'}</td>
                          <td className="px-4 py-3 font-mono text-xs text-foreground">{exp.invoiceNumber || '—'}</td>
                          <td className="px-4 py-3 font-semibold text-foreground">{exp.amount?.toLocaleString()} د.ت</td>
                          <td className="px-4 py-3 text-muted-foreground text-xs max-w-[160px] truncate">{exp.notes || '—'}</td>
                          <td className="px-4 py-3">
                            {exp.attachments?.length > 0 ? (
                              <div className="flex flex-wrap gap-1 justify-center">
                                {exp.attachments.map((att: any, i: number) => (
                                  <button key={i} onClick={() => { const a = document.createElement('a'); a.href = att.data; a.download = att.name; document.body.appendChild(a); a.click(); document.body.removeChild(a); }}
                                    title={att.name}
                                    className="flex items-center gap-1 px-2 py-1 text-xs bg-primary/10 text-primary rounded hover:bg-primary/20 transition">
                                    <Download className="w-3 h-3" />{att.name.length > 15 ? att.name.slice(0, 15) + '…' : att.name}
                                  </button>
                                ))}
                              </div>
                            ) : <span className="text-xs text-muted-foreground text-center block">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Supply Requests */}
            <div className="rounded-xl border border-border bg-card mb-8">
              <div className="p-5 border-b border-border">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-primary" />
                  طلبات التزود
                  <span className="text-sm font-normal text-muted-foreground bg-muted rounded-full px-2 py-0.5">{supplierSupplyRequests.length}</span>
                </h2>
              </div>
              {supplierSupplyRequests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <ShoppingCart className="w-8 h-8 mb-2 opacity-20" />
                  <p className="text-sm">لا توجد طلبات مسجلة</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {supplierSupplyRequests.map((req: any) => (
                    <div key={req.id} className="p-4 hover:bg-muted/20 transition">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-foreground">{req.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                            <Building2 className="w-3 h-3"/>{req.budget?.name || '—'}
                          </p>
                          {req.notes && <p className="text-xs text-muted-foreground mt-1">{req.notes}</p>}
                          <p className="text-[11px] text-muted-foreground/70 mt-1">{req.createdBy} · {new Date(req.createdAt).toLocaleDateString('ar-DZ')}</p>
                        </div>
                        {req.attachments?.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {req.attachments.map((att: any, i: number) => (
                              <button key={i} onClick={() => { const a = document.createElement('a'); a.href = att.data; a.download = att.name; document.body.appendChild(a); a.click(); document.body.removeChild(a); }}
                                title={att.name}
                                className="flex items-center gap-1 px-2 py-1 text-xs bg-emerald-50 text-emerald-700 rounded hover:bg-emerald-100 border border-emerald-200 transition">
                                <Paperclip className="w-3 h-3" />{att.name.length > 15 ? att.name.slice(0, 15) + '…' : att.name}
                                <Download className="w-2.5 h-2.5 opacity-60" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Distributed Items Section — only for الوحدات المتنفعة */}
        {entity.category === 'الوحدات المتنفعة' && (
        <div className="rounded-xl border border-border bg-card mb-8">
          <div className="p-5 border-b border-border flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              التجهيزات المسلمة
              <span className="text-sm font-normal text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                {filteredDistributions.length} / {distributions.length}
              </span>
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-lg transition ${showFilters ? 'bg-primary/10 border-primary/30 text-primary' : 'border-border bg-background hover:bg-muted'}`}
              >
                <Filter className="w-4 h-4" />
                فلاتر
                {(dateFrom || dateTo || itemFilter || categoryFilter) && (
                  <span className="bg-primary text-primary-foreground rounded-full w-4 h-4 text-xs flex items-center justify-center">!</span>
                )}
              </button>
              <button
                onClick={handleExportCSV}
                disabled={filteredDistributions.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border bg-background rounded-lg hover:bg-muted transition disabled:opacity-40"
              >
                <Download className="w-4 h-4" />
                تصدير Excel
              </button>
            </div>
          </div>

          {/* Search + Filters */}
          <div className="px-5 pt-4 pb-3 border-b border-border space-y-3">
            <div className="relative">
              <Search className="absolute right-3 top-2.5 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="ابحث بالاسم، الرمز، الصنف، الوصف، الرقم الإداري، المرجع، المستلم، الملاحظات..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pr-9 pl-4 py-2 border border-input bg-background rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute left-3 top-2.5 text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1 flex items-center gap-1"><CalendarRange className="w-3 h-3" /> من تاريخ</label>
                  <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full border border-input bg-background p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1 flex items-center gap-1"><CalendarRange className="w-3 h-3" /> إلى تاريخ</label>
                  <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full border border-input bg-background p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">اسم التجهيز</label>
                  <div className="relative">
                    <select value={itemFilter} onChange={e => setItemFilter(e.target.value)} className="w-full border border-input bg-background p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring appearance-none pr-2">
                      <option value="">جميع التجهيزات</option>
                      {allItemNames.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                    <ChevronDown className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">صنف التجهيز</label>
                  <div className="relative">
                    <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="w-full border border-input bg-background p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring appearance-none pr-2">
                      <option value="">جميع الأصناف</option>
                      {allDistribCategories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <ChevronDown className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
                {(dateFrom || dateTo || itemFilter || categoryFilter) && (
                  <button onClick={clearFilters} className="col-span-full text-xs text-destructive flex items-center gap-1 hover:underline w-fit">
                    <X className="w-3 h-3" /> مسح كل الفلاتر
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {filteredDistributions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Package className="w-10 h-10 mb-2 opacity-20" />
                <p className="text-sm">لا توجد تجهيزات مطابقة</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-right font-semibold text-muted-foreground">رقم الوصل</th>
                    <th className="px-4 py-3 text-right font-semibold text-muted-foreground">التجهيزات المسلمة</th>
                    <th className="px-4 py-3 text-right font-semibold text-muted-foreground">الكمية</th>
                    <th className="px-4 py-3 text-right font-semibold text-muted-foreground">المكلف بالاستلام</th>
                    <th className="px-4 py-3 text-right font-semibold text-muted-foreground">تاريخ التسليم</th>
                    <th className="px-4 py-3 text-right font-semibold text-muted-foreground">حالة الوصل</th>
                    <th className="px-4 py-3 text-center font-semibold text-muted-foreground">تحميل</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDistributions.map(dist => {
                    const totalQty = dist.items.reduce((s, i) => s + i.quantity, 0);
                    const assignee = dist.assignedTo
                      ? `${dist.assignedTo.rank} ${dist.assignedTo.name} ${dist.assignedTo.surname}`
                      : (dist.deliveredByName || '—');
                    const statusMap: Record<string, { label: string; cls: string }> = {
                      APPROVED: { label: 'معتمد', cls: 'bg-green-100 text-green-700' },
                      CANCELLED: { label: 'ملغى', cls: 'bg-red-100 text-red-700' },
                      DRAFT: { label: 'مسودة', cls: 'bg-yellow-100 text-yellow-700' },
                    };
                    const receiptStatus = dist.receipt ? (statusMap[dist.receipt.status] || { label: dist.receipt.status, cls: 'bg-muted text-muted-foreground' }) : null;

                    return (
                      <tr key={dist.id} className="border-b border-border hover:bg-muted/30 transition">
                        <td className="px-4 py-3">
                          {dist.receipt ? (
                            <span className="font-mono text-xs font-semibold text-primary">{dist.receipt.serialNumber}</span>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-0.5">
                            {dist.items.map(i => (
                              <div key={i.id} className="text-foreground">
                                {i.item.name}
                                <span className="text-xs text-muted-foreground mr-1">({i.item.sku})</span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-semibold text-foreground">{totalQty}</td>
                        <td className="px-4 py-3 text-foreground">{assignee}</td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {new Date(dist.createdAt).toLocaleDateString('en-GB')}
                        </td>
                        <td className="px-4 py-3">
                          {receiptStatus ? (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${receiptStatus.cls}`}>{receiptStatus.label}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">لا يوجد</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {dist.receipt ? (
                            <button
                              onClick={() => handleDownloadReceipt(dist.id)}
                              disabled={downloadingReceiptId === dist.id}
                              title="تحميل وصل التسليم PDF"
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-primary/10 text-primary rounded-md hover:bg-primary/20 transition disabled:opacity-50"
                            >
                              {downloadingReceiptId === dist.id ? (
                                <span className="animate-spin w-3 h-3 border border-primary border-t-transparent rounded-full inline-block" />
                              ) : (
                                <FileText className="w-3.5 h-3.5" />
                              )}
                              PDF
                            </button>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Summary bar */}
          {filteredDistributions.length > 0 && (
            <div className="px-5 py-3 border-t border-dashed border-border bg-muted/20 flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span>عمليات الخرج: <strong className="text-foreground">{filteredDistributions.length}</strong></span>
              <span>إجمالي التجهيزات المسلمة: <strong className="text-foreground">{filteredDistributions.reduce((s, d) => s + d.items.reduce((ss, i) => ss + i.quantity, 0), 0)}</strong></span>
              <span>وصولات PDF: <strong className="text-foreground">{filteredDistributions.filter(d => d.receipt).length}</strong></span>
            </div>
          )}
        </div>
        )}

        {/* Hidden receipt print area */}
        <div style={{ position: 'fixed', left: '-9999px', top: 0 }} aria-hidden>
          <div id="entity-receipt-print-area">
            {downloadReceiptData && <ReceiptPrintTemplate receipt={downloadReceiptData} currentUser={{ region: entityUser?.region, securityUnit: entityUser?.securityUnit, personalNumber: entityUser?.personalNumber, name: entityUser?.name, title: entityUser?.title }} />}
          </div>
        </div>

        {/* Received Items Section — التجهيزات المستلمة من هذه الجهة */}
        {receptions.length > 0 && (
        <div className="rounded-xl border border-border bg-card mb-8">
          <div className="p-5 border-b border-border flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Inbox className="w-5 h-5 text-primary" />
              التجهيزات المستلمة
              <span className="text-sm font-normal text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                {filteredReceptions.reduce((s: number, r: any) => s + (r.items?.reduce((ss: number, ri: any) => ss + (ri?.quantity || 0), 0) || 0), 0)} وحدة
              </span>
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowRecepFilters(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-lg transition ${showRecepFilters ? 'bg-primary/10 border-primary/30 text-primary' : 'border-border bg-background hover:bg-muted'}`}
              >
                <Filter className="w-4 h-4" />
                فلاتر
                {(recepDateFrom || recepDateTo || recepItemFilter || recepRefTypeFilter || recepCategoryFilter) && (
                  <span className="bg-primary text-primary-foreground rounded-full w-4 h-4 text-xs flex items-center justify-center">!</span>
                )}
              </button>
              <button
                onClick={handleExportReceptionsXLSX}
                disabled={filteredReceptions.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border bg-background rounded-lg hover:bg-muted transition disabled:opacity-40"
              >
                <Download className="w-4 h-4" />
                Excel
              </button>
              <button
                onClick={handleExportReceptionsPDF}
                disabled={filteredReceptions.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border bg-background rounded-lg hover:bg-muted transition disabled:opacity-40"
              >
                <FileText className="w-4 h-4" />
                PDF
              </button>
            </div>
          </div>

          {/* Search + Filters */}
          <div className="px-5 pt-4 pb-3 border-b border-border space-y-3">
            <div className="relative">
              <Search className="absolute right-3 top-2.5 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="ابحث بالاسم، الرمز، الصنف، الوصف، الرقم الإداري، المرجع، المتسلم، الملاحظات..."
                value={recepSearch}
                onChange={e => setRecepSearch(e.target.value)}
                className="w-full pr-9 pl-4 py-2 border border-input bg-background rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {recepSearch && (
                <button onClick={() => setRecepSearch('')} className="absolute left-3 top-2.5 text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {showRecepFilters && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1 flex items-center gap-1"><CalendarRange className="w-3 h-3" /> من تاريخ</label>
                  <input type="date" value={recepDateFrom} onChange={e => setRecepDateFrom(e.target.value)} className="w-full border border-input bg-background p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1 flex items-center gap-1"><CalendarRange className="w-3 h-3" /> إلى تاريخ</label>
                  <input type="date" value={recepDateTo} onChange={e => setRecepDateTo(e.target.value)} className="w-full border border-input bg-background p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">نوع المرجع</label>
                  <div className="relative">
                    <select value={recepRefTypeFilter} onChange={e => setRecepRefTypeFilter(e.target.value)} className="w-full border border-input bg-background p-2 rounded-lg text-sm focus:outline-none appearance-none">
                      <option value="">جميع الأنواع</option>
                      {allRecepRefTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <ChevronDown className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">صنف التجهيز</label>
                  <div className="relative">
                    <select value={recepCategoryFilter} onChange={e => setRecepCategoryFilter(e.target.value)} className="w-full border border-input bg-background p-2 rounded-lg text-sm focus:outline-none appearance-none">
                      <option value="">جميع الأصناف</option>
                      {allRecepCategories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <ChevronDown className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">التجهيز</label>
                  <div className="relative">
                    <select value={recepItemFilter} onChange={e => setRecepItemFilter(e.target.value)} className="w-full border border-input bg-background p-2 rounded-lg text-sm focus:outline-none appearance-none">
                      <option value="">جميع التجهيزات</option>
                      {allRecepItemNames.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                    <ChevronDown className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
                {(recepDateFrom || recepDateTo || recepItemFilter || recepRefTypeFilter || recepCategoryFilter) && (
                  <button onClick={() => { setRecepDateFrom(''); setRecepDateTo(''); setRecepItemFilter(''); setRecepRefTypeFilter(''); setRecepCategoryFilter(''); }} className="col-span-full text-xs text-destructive flex items-center gap-1 hover:underline w-fit">
                    <X className="w-3 h-3" /> مسح كل الفلاتر
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {filteredReceptions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Inbox className="w-10 h-10 mb-2 opacity-20" />
                <p className="text-sm">لا توجد تجهيزات مطابقة</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-right font-semibold text-muted-foreground">#</th>
                    <th className="px-4 py-3 text-right font-semibold text-muted-foreground">اسم التجهيز</th>
                    <th className="px-4 py-3 text-right font-semibold text-muted-foreground">الكمية</th>
                    <th className="px-4 py-3 text-right font-semibold text-muted-foreground">الرقم الإداري</th>
                    <th className="px-4 py-3 text-right font-semibold text-muted-foreground">المرجع</th>
                    <th className="px-4 py-3 text-right font-semibold text-muted-foreground">رقم المرجع</th>
                    <th className="px-4 py-3 text-right font-semibold text-muted-foreground">تاريخ المرجع</th>
                    <th className="px-4 py-3 text-right font-semibold text-muted-foreground">تاريخ الاستلام</th>
                    <th className="px-4 py-3 text-right font-semibold text-muted-foreground">المتسلم</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    let rowIdx = 0;
                    return filteredReceptions.map((r: any) =>
                      (r.items || []).filter((ri: any) => ri && ri.item).map((ri: any) => {
                        rowIdx++;
                        return (
                          <tr key={`${r.id}-${ri.id}`} className="border-b border-border hover:bg-muted/30 transition">
                            <td className="px-4 py-2.5 text-muted-foreground text-xs">{rowIdx}</td>
                            <td className="px-4 py-2.5 font-semibold text-foreground">{ri.item.name}</td>
                            <td className="px-4 py-2.5 text-center font-bold text-primary">{ri.quantity}</td>
                            <td className="px-4 py-2.5 text-muted-foreground font-mono text-xs">{ri.adminNumber || '—'}</td>
                            <td className="px-4 py-2.5 text-foreground">{r.referenceType || '—'}</td>
                            <td className="px-4 py-2.5 text-muted-foreground font-mono text-xs">{r.referenceNumber || '—'}</td>
                            <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap text-xs">
                              {r.referenceDate ? new Date(r.referenceDate).toLocaleDateString('ar-TN') : '—'}
                            </td>
                            <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap text-xs">
                              {new Date(r.createdAt).toLocaleDateString('ar-TN')}
                            </td>
                            <td className="px-4 py-2.5 text-foreground text-xs">
                              {r.collector ? `${r.collector.rank} ${r.collector.name} ${r.collector.surname}` : '—'}
                            </td>
                          </tr>
                        );
                      })
                    );
                  })()}
                </tbody>
              </table>
            )}
          </div>

          {/* Summary */}
          {filteredReceptions.length > 0 && (
            <div className="px-5 py-3 border-t border-dashed border-border bg-muted/20 flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span>عمليات الدخل: <strong className="text-foreground">{filteredReceptions.length}</strong></span>
              <span>إجمالي الكميات المستلمة: <strong className="text-foreground">
                {filteredReceptions.reduce((s: number, r: any) => s + (r.items || []).reduce((ss: number, ri: any) => ss + (ri?.quantity || 0), 0), 0)}
              </strong></span>
              <span>أنواع التجهيزات: <strong className="text-foreground">
                {new Set(filteredReceptions.flatMap((r: any) => (r.items || []).map((ri: any) => ri?.item?.name)).filter(Boolean)).size}
              </strong></span>
            </div>
          )}
        </div>
        )}

        {/* Employees Section — only for الوحدات المتنفعة */}
        {entity.category === 'الوحدات المتنفعة' && (
        <div className="rounded-xl border border-border bg-card">
          <div className="p-6 border-b border-border flex justify-between items-center">
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <User className="w-6 h-6 text-primary" />
              موظفو الجهة
            </h2>
            {!isReadOnly && (
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
            )}
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
                      {!isReadOnly && <th className="px-4 py-3 text-right font-semibold text-muted-foreground">الإجراءات</th>}
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
                        {!isReadOnly && (
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
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        )}
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

      {showEntityModal && entity && (
        <EntityModal
          isOpen={showEntityModal}
          onClose={() => setShowEntityModal(false)}
          onSuccess={handleEntitySuccess}
          entity={entity}
        />
      )}
    </div>
  );
}
