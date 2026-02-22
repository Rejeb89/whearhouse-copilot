import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import client from '../api/client';
import {
  ArrowLeft, Phone, User, Plus, Search, Trash2, Edit2, Upload,
  Download, FileText, Filter, X, ChevronDown, Package, CalendarRange,
  ShoppingCart, Paperclip, Building2
} from 'lucide-react';
import EmployeeModal from '../components/EmployeeModal';
import ExcelImportModal from '../components/ExcelImportModal';
import { Receipt, ReceiptPrintTemplate, downloadPDF } from '../components/ReceiptPrintTemplate';

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

export default function EntityDetails() {
  const { id } = useParams<{ id: string }>();
  const [searchTerm, setSearchTerm] = useState('');
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Distribution filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [itemFilter, setItemFilter] = useState('');
  const [receiptFilter, setReceiptFilter] = useState<'all' | 'has_receipt' | 'no_receipt'>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Receipt download
  const [downloadingReceiptId, setDownloadingReceiptId] = useState<number | null>(null);
  const [downloadReceiptData, setDownloadReceiptData] = useState<Receipt | null>(null);

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

  // Collect unique item names for filter dropdown
  const allItemNames = useMemo(() => {
    const names = new Set<string>();
    distributions.forEach(d => d.items.forEach(i => names.add(i.item.name)));
    return Array.from(names).sort();
  }, [distributions]);

  // Multi-filter distributions
  const filteredDistributions = useMemo(() => {
    return distributions.filter(dist => {
      const text = searchTerm.trim().toLowerCase();
      if (text && !(
        dist.reference.toLowerCase().includes(text) ||
        (dist.receipt?.serialNumber || '').toLowerCase().includes(text) ||
        dist.items.some(i => i.item.name.toLowerCase().includes(text)) ||
        (dist.assignedTo ? `${dist.assignedTo.rank} ${dist.assignedTo.name} ${dist.assignedTo.surname}`.toLowerCase().includes(text) : false) ||
        (dist.deliveredByName || '').toLowerCase().includes(text)
      )) return false;

      if (itemFilter && !dist.items.some(i => i.item.name === itemFilter)) return false;

      if (dateFrom) {
        const d = new Date(dist.createdAt); const f = new Date(dateFrom);
        if (d < f) return false;
      }
      if (dateTo) {
        const d = new Date(dist.createdAt); const t = new Date(dateTo);
        t.setHours(23, 59, 59, 999);
        if (d > t) return false;
      }

      if (receiptFilter === 'has_receipt' && !dist.receipt) return false;
      if (receiptFilter === 'no_receipt' && dist.receipt) return false;

      return true;
    });
  }, [distributions, searchTerm, dateFrom, dateTo, itemFilter, receiptFilter]);

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

  const clearFilters = () => { setSearchTerm(''); setDateFrom(''); setDateTo(''); setItemFilter(''); setReceiptFilter('all'); };

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
                {(dateFrom || dateTo || itemFilter || receiptFilter !== 'all') && (
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
                placeholder="ابحث برقم الوصل، اسم التجهيز، المستلم..."
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
                  <label className="block text-xs text-muted-foreground mb-1">وصل التسليم</label>
                  <div className="relative">
                    <select value={receiptFilter} onChange={e => setReceiptFilter(e.target.value as any)} className="w-full border border-input bg-background p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring appearance-none pr-2">
                      <option value="all">الكل</option>
                      <option value="has_receipt">يوجد وصل</option>
                      <option value="no_receipt">لا يوجد وصل</option>
                    </select>
                    <ChevronDown className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
                {(dateFrom || dateTo || itemFilter || receiptFilter !== 'all') && (
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
            {downloadReceiptData && <ReceiptPrintTemplate receipt={downloadReceiptData} />}
          </div>
        </div>

        {/* Employees Section — only for الوحدات المتنفعة */}
        {entity.category === 'الوحدات المتنفعة' && (
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
    </div>
  );
}
