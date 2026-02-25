import React, { useContext, useEffect, useMemo, useRef, useState } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, PieChart, Pie, Legend,
} from 'recharts'
import {
  AlertTriangle, Archive, Bell, ChevronDown, ChevronRight, ChevronLeft, Clock,
  Download, Edit2, FileText, Info, Paperclip, Plus, Search,
  TrendingDown, TrendingUp, X, DollarSign, Building2, BarChart2,
  ShoppingCart, Image as ImageIcon, Eye,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AuthContext } from '../context/AuthContext'
import client from '../api/client'
import html2pdf from 'html2pdf.js'
import * as XLSX from 'xlsx'

/* Types */
type BudgetStatus = 'active' | 'expired' | 'closed'
interface Budget {
  id: number; name: string; department: string; amount: number
  startDate: string; endDate: string; status: BudgetStatus
  notes: string; createdBy: string; createdAt: string; updatedAt: string; spent: number
}
interface Expense {
  id: number; budgetId: number; date: string; supplier: string
  invoiceNumber: string | null; amount: number; notes: string | null
  attachments: { name: string; data: string }[]; addedBy: string | null; addedAt: string
}
interface AuditEntry {
  id: number; action: string; entity: string; entityId: number
  user: string; date: string; details: string
}
interface SupplyRequest {
  id: number; budgetId: number; title: string; supplier: string | null; notes: string | null
  attachments: { name: string; data: string; type: string }[]
  createdBy: string | null; createdAt: string
}

/* Helpers */
const LS_AUDIT = 'fin_audit'
function loadLS<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback } catch { return fallback }
}
function saveLS(key: string, value: unknown) { try { localStorage.setItem(key, JSON.stringify(value)) } catch { /**/ } }

const DEPARTMENTS = ['الإدارة العامة', 'قسم التقنية', 'الموارد البشرية', 'المالية', 'اللوجستيك', 'قسم التجهيز', 'الأمن والحراسة']
const STATUS_MAP: Record<BudgetStatus, { label: string; color: string; bg: string }> = {
  active:  { label: 'نشط',   color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  expired: { label: 'منتهي', color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200' },
  closed:  { label: 'مغلق',  color: 'text-muted-foreground',   bg: 'bg-muted border-border' },
}
const fmt = (n: number) => n.toLocaleString('ar-DZ', { minimumFractionDigits: 0 })
const pct = (spent: number, total: number) => total > 0 ? Math.min(Math.round((spent / total) * 100), 100) : 0

/* API */
const fetchBudgets = () => client.get('/budgets').then(r => r.data.data as Budget[])
const fetchExpenses = (id: number) => client.get(`/budgets/${id}/expenses`).then(r => r.data.data as Expense[])

/* Component */
export default function Budgets() {
  const { user } = useContext(AuthContext)
  const role = user?.role ?? 'USER'
  const queryClient = useQueryClient()

  const { data: budgets = [], isLoading: budgetsLoading } = useQuery(['budgets'], fetchBudgets, { refetchInterval: 30000 })
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null)
  const expensesQuery = useQuery(['budget-expenses', selectedBudget?.id], () => fetchExpenses(selectedBudget!.id), { enabled: !!selectedBudget })
  const budgetExpenses: Expense[] = expensesQuery.data ?? []

  const [audit, setAudit] = useState<AuditEntry[]>(() => loadLS<AuditEntry[]>(LS_AUDIT, []))
  const addAudit = (action: string, entity: string, entityId: number, details: string) => {
    const entry: AuditEntry = { id: Date.now(), action, entity, entityId, user: user?.name ?? user?.email ?? 'مستخدم', date: new Date().toISOString(), details }
    const next = [entry, ...audit].slice(0, 200)
    setAudit(next); saveLS(LS_AUDIT, next)
  }

  const [view, setView] = useState<'dashboard' | 'list' | 'audit' | 'supply'>('dashboard')
  const [search, setSearch] = useState('')
  const [filterDept, setFilterDept] = useState('')
  const [filterStatus, setFilterStatus] = useState<'' | BudgetStatus>('')

  const [showBudgetModal, setShowBudgetModal] = useState(false)
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null)
  const [budgetForm, setBudgetForm] = useState<Omit<Budget, 'id' | 'createdBy' | 'createdAt' | 'updatedAt' | 'spent'>>({
    name: '', department: DEPARTMENTS[0], amount: 0, startDate: '', endDate: '', status: 'active', notes: '',
  })

  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [expenseForm, setExpenseForm] = useState({ date: '', supplier: '', invoiceNumber: '', amount: 0, notes: '' })
  const [expenseAttachments, setExpenseAttachments] = useState<{ name: string; data: string }[]>([])
  const expenseFileRef = useRef<HTMLInputElement>(null)
  const supplierBoxRef = useRef<HTMLDivElement>(null)
  const supplySupplierBoxRef = useRef<HTMLDivElement>(null)

  /* Supply Requests */
  const [showSupplyModal, setShowSupplyModal] = useState(false)
  const [supplyBudget, setSupplyBudget] = useState<Budget | null>(null)
  const [supplyForm, setSupplyForm] = useState({ title: '', notes: '', supplier: '' })
  const [supplySupplierSearch, setSupplySupplierSearch] = useState('')
  const [showSupplySupplierDropdown, setShowSupplySupplierDropdown] = useState(false)
  const [supplyAttachments, setSupplyAttachments] = useState<{ name: string; data: string; type: string }[]>([])
  const supplyFileRef = useRef<HTMLInputElement>(null)
  const [previewFile, setPreviewFile] = useState<{ name: string; data: string; type: string } | null>(null)
  const [selectedAudit, setSelectedAudit] = useState<AuditEntry | null>(null)
  const [supplyError, setSupplyError] = useState<string | null>(null)

  const supplyQuery = useQuery(
    ['supply-requests', supplyBudget?.id],
    () => client.get(`/budgets/${supplyBudget!.id}/supply-requests`).then(r => r.data.data as SupplyRequest[]),
    { enabled: !!supplyBudget, refetchOnWindowFocus: true }
  )
  const supplyRequests: SupplyRequest[] = supplyQuery.data ?? []

  const addSupplyRequest = useMutation(
    ({ budgetId, data }: { budgetId: number; data: any }) =>
      client.post(`/budgets/${budgetId}/supply-requests`, data).then(r => r.data.data),
    { onSuccess: (_data, variables) => { queryClient.invalidateQueries(['supply-requests', variables.budgetId]) } }
  )
  const deleteSupplyRequest = useMutation(
    ({ id, budgetId }: { id: number; budgetId: number }) => client.delete(`/budgets/supply-requests/${id}`).then(r => r.data.data),
    { onSuccess: (_data, variables) => { queryClient.invalidateQueries(['supply-requests', variables.budgetId]) } }
  )

  const handleSupplyFiles = (files: FileList | null) => {
    if (!files) return
    Array.from(files).forEach(file => {
      const allowed = file.type === 'application/pdf' || file.type.startsWith('image/')
        || file.name.toLowerCase().endsWith('.pdf')
      if (!allowed) return
      const reader = new FileReader()
      reader.onload = ev => setSupplyAttachments(prev => [...prev, { name: file.name, data: ev.target?.result as string, type: file.type }])
      reader.readAsDataURL(file)
    })
  }
  const resetSupplyModal = () => {
    setSupplyForm({ title: '', notes: '', supplier: '' })
    setSupplySupplierSearch('')
    setSupplyAttachments([])
    setSupplyError(null)
  }
  const saveSupplyRequest = async () => {
    if (!supplyBudget || !supplyForm.title.trim()) return
    setSupplyError(null)
    try {
      // Auto-register supplier if new
      if (supplySupplierSearch.trim() && !exactSupplySupplierMatch) {
        try {
          await client.post('/entities', {
            name: supplySupplierSearch.trim(),
            type: 'BENEFICIARY',
            category: 'جهات مختلفة',
            phone: 'غير محدد',
          })
          queryClient.invalidateQueries(['entities-misc'])
        } catch { /* proceed regardless */ }
      }
      await addSupplyRequest.mutateAsync({ budgetId: supplyBudget.id, data: { ...supplyForm, attachments: supplyAttachments } })
      resetSupplyModal()
      supplyQuery.refetch()
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? err?.message ?? 'حدث خطأ غير متوقع'
      setSupplyError(msg)
    }
  }
  const downloadFile = (att: { name: string; data: string }) => {
    const a = document.createElement('a'); a.href = att.data; a.download = att.name
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
  }

  /* Supplier combobox */
  const [supplierSearch, setSupplierSearch] = useState('')
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false)
  const { data: entitiesAll = [] } = useQuery(['entities-misc'], () =>
    client.get('/entities').then(r => (r.data.data as any[]).filter(e => e.category === 'جهات مختلفة')),
    { staleTime: 60000 }
  )
  const filteredSuppliers = entitiesAll.filter((e: any) =>
    supplierSearch.trim() === '' || e.name.toLowerCase().includes(supplierSearch.toLowerCase())
  )
  const exactSupplierMatch = entitiesAll.some((e: any) => e.name.toLowerCase() === supplierSearch.trim().toLowerCase())
  const filteredSupplySuppliers = entitiesAll.filter((e: any) =>
    supplySupplierSearch.trim() === '' || e.name.toLowerCase().includes(supplySupplierSearch.toLowerCase())
  )
  const exactSupplySupplierMatch = entitiesAll.some((e: any) => e.name.toLowerCase() === supplySupplierSearch.trim().toLowerCase())

  useEffect(() => {
    const handler = (ev: MouseEvent) => {
      if (supplierBoxRef.current && !supplierBoxRef.current.contains(ev.target as Node))
        setShowSupplierDropdown(false)
      if (supplySupplierBoxRef.current && !supplySupplierBoxRef.current.contains(ev.target as Node))
        setShowSupplySupplierDropdown(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleExpenseFiles = (files: FileList | null) => {
    if (!files) return
    Array.from(files).forEach(file => {
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) return
      const reader = new FileReader()
      reader.onload = (ev) => setExpenseAttachments(prev => [...prev, { name: file.name, data: ev.target?.result as string }])
      reader.readAsDataURL(file)
    })
  }
  const resetExpenseModal = () => {
    setShowExpenseModal(false)
    setExpenseForm({ date: '', supplier: '', invoiceNumber: '', amount: 0, notes: '' })
    setExpenseAttachments([])
    setSupplierSearch('')
    setShowSupplierDropdown(false)
  }

  const spentByBudget = useMemo(() => {
    const map: Record<number, number> = {}
    budgets.forEach(b => { map[b.id] = b.spent ?? 0 })
    return map
  }, [budgets])

  const filteredBudgets = useMemo(() => budgets.filter(b => {
    const q = search.toLowerCase()
    return (!q || b.name.toLowerCase().includes(q) || b.department.toLowerCase().includes(q)) &&
      (!filterDept || b.department === filterDept) &&
      (!filterStatus || b.status === filterStatus)
  }), [budgets, search, filterDept, filterStatus])

  const alerts = useMemo(() => budgets.filter(b => {
    if (b.status !== 'active') return false
    const p = pct(spentByBudget[b.id] ?? 0, b.amount)
    const daysLeft = Math.ceil((new Date(b.endDate).getTime() - Date.now()) / 86400000)
    return p >= 80 || daysLeft <= 30
  }), [budgets, spentByBudget])

  const totalBudget    = budgets.filter(b => b.status === 'active').reduce((s, b) => s + b.amount, 0)
  const totalSpent     = budgets.filter(b => b.status === 'active').reduce((s, b) => s + (spentByBudget[b.id] ?? 0), 0)
  const totalRemaining = totalBudget - totalSpent

  /* Mutations */
  const createBudget = useMutation((data: typeof budgetForm) => client.post('/budgets', data).then(r => r.data.data),
    { onSuccess: (b) => { queryClient.invalidateQueries(['budgets']); addAudit('إضافة', 'اعتماد', b.id, `إضافة: ${b.name}`) } })
  const updateBudget = useMutation(({ id, data }: { id: number; data: any }) => client.put(`/budgets/${id}`, data).then(r => r.data.data),
    { onSuccess: (b) => { queryClient.invalidateQueries(['budgets']); addAudit('تعديل', 'اعتماد', b.id, `تعديل: ${b.name}`) } })
  const addExpense = useMutation(({ budgetId, data }: { budgetId: number; data: any }) => client.post(`/budgets/${budgetId}/expenses`, data).then(r => r.data.data), {
    onSuccess: (e) => { queryClient.invalidateQueries(['budgets']); queryClient.invalidateQueries(['budget-expenses', e.budgetId]); addAudit('إضافة صرف', 'مصروف', e.id, `صرف ${fmt(e.amount)}`) }
  })
  const removeExpense = useMutation(({ id }: { id: number; budgetId: number }) => client.delete(`/budgets/expenses/${id}`).then(r => r.data.data), {
    onSuccess: (_, v) => { queryClient.invalidateQueries(['budgets']); queryClient.invalidateQueries(['budget-expenses', v.budgetId]); addAudit('حذف صرف', 'مصروف', v.id, `حذف مصروف`) }
  })

  const openAddBudget = () => { setEditingBudget(null); setBudgetForm({ name: '', department: DEPARTMENTS[0], amount: 0, startDate: '', endDate: '', status: 'active', notes: '' }); setShowBudgetModal(true) }
  const openEditBudget = (b: Budget) => { setEditingBudget(b); setBudgetForm({ name: b.name, department: b.department, amount: b.amount, startDate: b.startDate, endDate: b.endDate, status: b.status, notes: b.notes }); setShowBudgetModal(true) }
  const saveBudget = async () => {
    if (!budgetForm.name || !budgetForm.amount || !budgetForm.startDate || !budgetForm.endDate) return
    if (editingBudget) await updateBudget.mutateAsync({ id: editingBudget.id, data: budgetForm })
    else await createBudget.mutateAsync(budgetForm)
    setShowBudgetModal(false)
  }
  const archiveBudget = (b: Budget) => updateBudget.mutate({ id: b.id, data: { status: 'closed' } })
  const saveExpense = async () => {
    if (!selectedBudget || !expenseForm.date || !expenseForm.amount || !expenseForm.supplier) return
    // Auto-register supplier in "جهات مختلفة" if not already present
    const alreadyExists = entitiesAll.some((e: any) => e.name.toLowerCase() === expenseForm.supplier.trim().toLowerCase())
    if (!alreadyExists && expenseForm.supplier.trim()) {
      try {
        await client.post('/entities', {
          name: expenseForm.supplier.trim(),
          type: 'BENEFICIARY',
          category: 'جهات مختلفة',
          phone: 'غير محدد',
        })
        queryClient.invalidateQueries(['entities-misc'])
      } catch { /* ignore – the expense save proceeds regardless */ }
    }
    await addExpense.mutateAsync({ budgetId: selectedBudget.id, data: { ...expenseForm, attachments: expenseAttachments } })
    resetExpenseModal()
  }
  const deleteExpense = (e: Expense) => removeExpense.mutate({ id: e.id, budgetId: e.budgetId })

  const exportPDF = () => {
    const element = document.createElement('div')
    element.style.padding = '20px'
    element.style.fontFamily = 'Cairo, Arial, sans-serif'
    element.style.direction = 'rtl'
    
    const headerHTML = `
      <h1 style="text-align: center; font-size: 28px; margin-bottom: 5px; font-weight: bold;">تقرير الاعتمادات المالية</h1>
      <p style="text-align: center; font-size: 12px; color: #666; margin-bottom: 20px;">التاريخ: ${new Date().toLocaleDateString('ar-TN')}</p>
    `
    
    const tableHTML = `
      <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
        <thead>
          <tr style="background-color: #2563eb; color: white;">
            <th style="padding: 12px; text-align: right; border: 1px solid #ddd; font-weight: bold;">اسم الاعتماد</th>
            <th style="padding: 12px; text-align: right; border: 1px solid #ddd; font-weight: bold;">القسم</th>
            <th style="padding: 12px; text-align: right; border: 1px solid #ddd; font-weight: bold;">المبلغ</th>
            <th style="padding: 12px; text-align: right; border: 1px solid #ddd; font-weight: bold;">المصروف</th>
            <th style="padding: 12px; text-align: right; border: 1px solid #ddd; font-weight: bold;">المتبقي</th>
            <th style="padding: 12px; text-align: right; border: 1px solid #ddd; font-weight: bold;">النسبة</th>
            <th style="padding: 12px; text-align: right; border: 1px solid #ddd; font-weight: bold;">الحالة</th>
            <th style="padding: 12px; text-align: right; border: 1px solid #ddd; font-weight: bold;">البداية</th>
            <th style="padding: 12px; text-align: right; border: 1px solid #ddd; font-weight: bold;">النهاية</th>
          </tr>
        </thead>
        <tbody>
          ${filteredBudgets.map(b => {
            const s = spentByBudget[b.id] ?? 0
            const remaining = b.amount - s
            const percentage = pct(s, b.amount)
            return `
              <tr style="border: 1px solid #ddd;">
                <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">${b.name}</td>
                <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">${b.department}</td>
                <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">${fmt(b.amount)}</td>
                <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">${fmt(s)}</td>
                <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">${fmt(remaining)}</td>
                <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">${percentage}%</td>
                <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">${STATUS_MAP[b.status].label}</td>
                <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">${b.startDate}</td>
                <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">${b.endDate}</td>
              </tr>
            `
          }).join('')}
        </tbody>
      </table>
    `
    
    element.innerHTML = headerHTML + tableHTML
    
    const opt = {
      margin: 10,
      filename: 'budgets.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { orientation: 'landscape', unit: 'mm', format: 'a4' },
    }
    
    html2pdf().set(opt).from(element).save()
  }
  const exportExcel = () => {
    const rows = filteredBudgets.map(b => { const s=spentByBudget[b.id]??0; return {الاسم:b.name,القسم:b.department,المبلغ:b.amount,المصاريف:s,المتبقي:b.amount-s,النسبة:pct(s,b.amount)+'%',الحالة:STATUS_MAP[b.status].label,البداية:b.startDate,النهاية:b.endDate} })
    const ws=XLSX.utils.json_to_sheet(rows); const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'الاعتمادات'); XLSX.writeFile(wb,'budgets.xlsx')
  }

  if (budgetsLoading) return (
    <div dir="rtl" className="flex items-center justify-center py-24 text-muted-foreground">
      <div className="text-center"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" /><p className="text-sm">جارٍ تحميل الاعتمادات...</p></div>
    </div>
  )

  return (
    <div dir="rtl" className="space-y-5 text-foreground">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">إدارة وتتبع الاعتمادات المالية والمصاريف</p>
          <h1 className="text-2xl font-bold text-foreground">الاعتمادات المالية</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {alerts.length > 0 && (
            <div className="relative">
              <button className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-600 hover:bg-amber-100 transition"><Bell className="w-4 h-4" /></button>
              <span className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">{alerts.length}</span>
            </div>
          )}
          <button onClick={exportPDF} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-muted-foreground hover:bg-muted/50 text-sm transition"><FileText className="w-4 h-4" /> PDF</button>
          <button onClick={exportExcel} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-muted-foreground hover:bg-muted/50 text-sm transition"><Download className="w-4 h-4" /> Excel</button>
          {role === 'ADMIN' && <button onClick={openAddBudget} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium transition"><Plus className="w-4 h-4" /> اعتماد جديد</button>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {([['dashboard','لوحة التحكم',BarChart2],['list','قائمة الاعتمادات',FileText],['supply','طلبات التزود',ShoppingCart],['audit','سجل العمليات',Clock]] as const).map(([v,label,Icon])=>(
          <button key={v} onClick={()=>{setView(v as any);setSelectedBudget(null);if(v==='supply'){setSupplyBudget(null);resetSupplyModal();setPreviewFile(null)}}} className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition -mb-px ${view===v?'border-primary text-primary':'border-transparent text-muted-foreground hover:text-foreground'}`}><Icon className="w-4 h-4"/>{label}</button>
        ))}
      </div>

      {/* Alerts strip */}
      {alerts.length > 0 && view !== 'audit' && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-1.5">
          <p className="text-xs font-semibold text-amber-700 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4"/> تنبيهات الاعتمادات</p>
          {alerts.map(b=>{
            const s=spentByBudget[b.id]??0; const p=pct(s,b.amount); const d=Math.ceil((new Date(b.endDate).getTime()-Date.now())/86400000)
            return <div key={b.id} className="flex items-center gap-2 text-xs text-amber-800"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"/>
              {p>=100?` تجاوز السقف: ${b.name} (${p}% مستهلك)`:p>=80?` اعتماد "${b.name}" وصل ${p}% من الاستهلاك`:` اعتماد "${b.name}" ينتهي خلال ${d} يوم`}
            </div>
          })}
        </div>
      )}

      {/* Dashboard */}
      {view === 'dashboard' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {label:'إجمالي الاعتمادات النشطة',value:fmt(totalBudget)+' د',icon:DollarSign,color:'text-blue-600',bg:'bg-blue-50',border:'border-blue-100'},
              {label:'إجمالي المصاريف',value:fmt(totalSpent)+' د',icon:TrendingDown,color:'text-red-600',bg:'bg-red-50',border:'border-red-100'},
              {label:'المبلغ المتبقي',value:fmt(totalRemaining)+' د',icon:TrendingUp,color:'text-emerald-600',bg:'bg-emerald-50',border:'border-emerald-100'},
              {label:'عدد الاعتمادات',value:budgets.filter(b=>b.status==='active').length+' اعتماد',icon:Building2,color:'text-purple-600',bg:'bg-purple-50',border:'border-purple-100'},
            ].map((c,i)=>(
              <div key={i} className={`rounded-xl border ${c.border} ${c.bg} p-4 flex items-center gap-4`}>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${c.bg}`}><c.icon className={`w-5 h-5 ${c.color}`}/></div>
                <div><p className="text-xs text-muted-foreground">{c.label}</p><p className={`text-lg font-bold ${c.color}`}>{c.value}</p></div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border bg-card shadow-sm p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">نسبة استهلاك الاعتمادات النشطة</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={budgets.filter(b=>b.status==='active').map(b=>({name:b.name.length>20?b.name.slice(0,20)+'...':b.name,spent:spentByBudget[b.id]??0,remaining:Math.max(b.amount-(spentByBudget[b.id]??0),0)}))} barSize={20}>
                  <XAxis dataKey="name" tick={{fontSize:10}}/><YAxis tick={{fontSize:10}}/><Tooltip formatter={(v:number)=>fmt(v)+' د'}/><Legend/>
                  <Bar dataKey="spent" name="مصروف" fill="#ef4444" radius={[4,4,0,0]}/><Bar dataKey="remaining" name="متبقي" fill="#2563eb" radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="rounded-xl border border-border bg-card shadow-sm p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">توزيع الإجمالي المالي</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={[{name:'مصروف',value:totalSpent},{name:'متبقي',value:Math.max(totalRemaining,0)}]} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`}>
                    {[0,1].map(i=><Cell key={i} fill={['#ef4444','#2563eb'][i]}/>)}
                  </Pie>
                  <Tooltip formatter={(v:number)=>fmt(v)+' د'}/><Legend/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card shadow-sm p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500"/> الاعتمادات القريبة من النفاد أو الانتهاء</h3>
            {alerts.length===0?<p className="text-sm text-muted-foreground text-center py-6">لا توجد اعتمادات تحتاج إلى انتباه</p>:(
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-right">
                  <thead><tr className="border-b border-border text-xs text-muted-foreground"><th className="pb-2 pr-2">الاعتماد</th><th className="pb-2">القسم</th><th className="pb-2">المبلغ</th><th className="pb-2">المصروف</th><th className="pb-2">نسبة الاستهلاك</th><th className="pb-2">تاريخ الانتهاء</th></tr></thead>
                  <tbody>{alerts.map(b=>{const s=spentByBudget[b.id]??0;const p=pct(s,b.amount);return(
                    <tr key={b.id} className="border-b border-border hover:bg-muted/50">
                      <td className="py-2 pr-2 font-medium">{b.name}</td><td className="py-2 text-muted-foreground">{b.department}</td>
                      <td className="py-2">{fmt(b.amount)}</td><td className="py-2 text-red-600">{fmt(s)}</td>
                      <td className="py-2"><div className="flex items-center gap-2"><div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden"><div className={`h-full rounded-full ${p>=100?'bg-red-500':p>=80?'bg-amber-500':'bg-primary'}`} style={{width:p+'%'}}/></div><span className={`text-xs font-semibold ${p>=100?'text-red-600':p>=80?'text-amber-600':'text-primary'}`}>{p}%</span></div></td>
                      <td className="py-2 text-muted-foreground">{b.endDate}</td>
                    </tr>
                  )})}</tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* List */}
      {view === 'list' && !selectedBudget && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card shadow-sm p-4">
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-48"><Search className="absolute right-3 top-2.5 w-4 h-4 text-muted-foreground"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="بحث..." className="w-full border border-input bg-background rounded-lg py-2 pr-9 pl-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"/></div>
              <select value={filterDept} onChange={e=>setFilterDept(e.target.value)} className="border border-input bg-background rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"><option value="">كل الأقسام</option>{DEPARTMENTS.map(d=><option key={d} value={d}>{d}</option>)}</select>
              <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value as ''|BudgetStatus)} className="border border-input bg-background rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"><option value="">كل الحالات</option><option value="active">نشط</option><option value="expired">منتهي</option><option value="closed">مغلق</option></select>
              {(search||filterDept||filterStatus)&&<button onClick={()=>{setSearch('');setFilterDept('');setFilterStatus('')}} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"><X className="w-3 h-3"/> مسح الفلاتر</button>}
            </div>
          </div>
          {filteredBudgets.length===0?(
            <div className="text-center py-16 text-muted-foreground"><DollarSign className="w-12 h-12 mx-auto mb-3 opacity-30"/><p>لا توجد اعتمادات تطابق البحث</p></div>
          ):(
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredBudgets.map(b=>{
                const s=spentByBudget[b.id]??0;const rem=b.amount-s;const p=pct(s,b.amount);const st=STATUS_MAP[b.status];const bc=p>=100?'bg-red-500':p>=80?'bg-amber-500':'bg-blue-500'
                return(
                  <div key={b.id} className="rounded-xl border border-border bg-card shadow-sm p-5 hover:shadow-md transition">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex-1 min-w-0"><h3 className="font-semibold text-foreground truncate">{b.name}</h3><p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1"><Building2 className="w-3 h-3"/>{b.department}</p></div>
                      <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full border font-medium ${st.bg} ${st.color}`}>{st.label}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                      {[['المعتمد',fmt(b.amount),'text-primary'],['المصروف',fmt(s),'text-red-600'],['المتبقي',fmt(rem),rem>=0?'text-emerald-700':'text-red-600']].map(([l,v,c])=>(<div key={l} className="bg-muted/50 rounded-lg p-2"><p className="text-[10px] text-muted-foreground">{l}</p><p className={`text-sm font-bold ${c}`}>{v}</p></div>))}
                    </div>
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1"><span>نسبة الاستهلاك</span><span className="font-semibold">{p}%</span></div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all ${bc}`} style={{width:Math.min(p,100)+'%'}}/></div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-3"><span>{b.startDate}  {b.endDate}</span></div>
                    <div className="flex gap-2">
                      <button onClick={()=>setSelectedBudget(b)} className="flex-1 text-xs py-1.5 rounded-lg border border-border text-primary hover:bg-primary/10 transition flex items-center justify-center gap-1"><ChevronRight className="w-3.5 h-3.5"/> التفاصيل</button>

                      {role==='ADMIN'&&<><button onClick={()=>openEditBudget(b)} className="px-2.5 py-1.5 rounded-lg border border-border text-muted-foreground hover:bg-muted/50 transition"><Edit2 className="w-3.5 h-3.5"/></button>{b.status!=='closed'&&<button onClick={()=>archiveBudget(b)} className="px-2.5 py-1.5 rounded-lg border border-border text-muted-foreground hover:bg-amber-50 hover:border-amber-200 hover:text-amber-600 transition"><Archive className="w-3.5 h-3.5"/></button>}</>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Detail */}
      {view==='list'&&selectedBudget&&(()=>{
        const b=selectedBudget;const s=spentByBudget[b.id]??0;const rem=b.amount-s;const p=pct(s,b.amount);const st=STATUS_MAP[b.status];const bc=p>=100?'bg-red-500':p>=80?'bg-amber-500':'bg-blue-500'
        return(
          <div className="space-y-4">
            <button onClick={()=>setSelectedBudget(null)} className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1.5 transition"><ChevronDown className="w-4 h-4 rotate-90"/> العودة إلى القائمة</button>
            <div className="rounded-xl border border-border bg-card shadow-sm p-5">
              <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                <div><h2 className="text-xl font-bold text-foreground">{b.name}</h2><p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5"><Building2 className="w-4 h-4"/>{b.department}</p></div>
                <div className="flex items-center gap-2"><span className={`text-xs px-3 py-1 rounded-full border font-medium ${st.bg} ${st.color}`}>{st.label}</span>{role==='ADMIN'&&<button onClick={()=>openEditBudget(b)} className="px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:bg-muted/50 text-sm flex items-center gap-1.5 transition"><Edit2 className="w-3.5 h-3.5"/> تعديل</button>}</div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {[['المبلغ المعتمد',fmt(b.amount)+' د','text-primary'],['إجمالي المصاريف',fmt(s)+' د','text-red-600'],['المبلغ المتبقي',fmt(rem)+' د',rem>=0?'text-emerald-700':'text-red-600'],['نسبة الاستهلاك',p+'%',p>=80?'text-red-600':'text-primary']].map(([l,v,c])=>(<div key={l} className="bg-muted/50 rounded-lg p-3"><p className="text-xs text-muted-foreground">{l}</p><p className={`text-lg font-bold ${c}`}>{v}</p></div>))}
              </div>
              <div className="mb-3"><div className="flex justify-between text-xs text-muted-foreground mb-1.5"><span>تقدم الاستهلاك</span><span>{p}%</span></div><div className="h-3 bg-muted rounded-full overflow-hidden"><div className={`h-full rounded-full ${bc}`} style={{width:Math.min(p,100)+'%'}}/></div></div>
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-2 border-t border-border"><span> البداية: {b.startDate}</span><span> النهاية: {b.endDate}</span>{b.notes&&<span> {b.notes}</span>}</div>
            </div>
            <div className="rounded-xl border border-border bg-card shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">المصاريف المرتبطة ({budgetExpenses.length})</h3>
                {role==='ADMIN'&&b.status==='active'&&<button onClick={()=>{setExpenseAttachments([]);setExpenseForm({date:'',supplier:'',invoiceNumber:'',amount:0,notes:''});setSupplierSearch('');setShowSupplierDropdown(false);setShowExpenseModal(true)}} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium transition"><Plus className="w-3.5 h-3.5"/> إضافة صرف</button>}
              </div>
              {expensesQuery.isLoading?<div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"/></div>:budgetExpenses.length===0?(
                <div className="text-center py-10 text-muted-foreground"><FileText className="w-10 h-10 mx-auto mb-2 opacity-30"/><p className="text-sm">لا توجد مصاريف مسجلة</p></div>
              ):(
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-right">
                    <thead><tr className="border-b border-border text-xs text-muted-foreground"><th className="pb-2 pr-2">التاريخ</th><th className="pb-2">المورد</th><th className="pb-2">رقم الفاتورة</th><th className="pb-2">المبلغ</th><th className="pb-2">ملاحظات</th><th className="pb-2">المرفقات</th><th className="pb-2">أضيف بواسطة</th>{role==='ADMIN'&&<th className="pb-2">إجراء</th>}</tr></thead>
                    <tbody>{budgetExpenses.map(e=>(
                      <tr key={e.id} className="border-b border-border hover:bg-muted/50">
                        <td className="py-2 pr-2 text-muted-foreground">{e.date}</td><td className="py-2 font-medium">{e.supplier}</td>
                        <td className="py-2 text-xs text-muted-foreground font-mono">{e.invoiceNumber||''}</td>
                        <td className="py-2 font-semibold text-red-600">{fmt(e.amount)} د.ت</td>
                        <td className="py-2 text-muted-foreground text-xs">{e.notes||''}</td>
                        <td className="py-2">{e.attachments.length===0?<span className="text-muted-foreground/30 text-xs">—</span>:<div className="flex flex-wrap gap-1">{e.attachments.map((att,i)=>{
                          const download=()=>{
                            const a=document.createElement('a')
                            a.href=att.data
                            a.download=att.name
                            document.body.appendChild(a)
                            a.click()
                            document.body.removeChild(a)
                          }
                          return(
                            <button key={i} title={`تحميل: ${att.name}`} onClick={download} className="flex items-center gap-1 px-2 py-0.5 rounded bg-red-50 text-red-600 hover:bg-red-100 text-xs transition"><Paperclip className="w-3 h-3"/><span className="max-w-[80px] truncate">{att.name}</span></button>
                          )
                        })}</div>}</td>
                        <td className="py-2 text-xs text-muted-foreground">{e.addedBy}</td>
                        {role==='ADMIN'&&<td className="py-2"><button onClick={()=>deleteExpense(e)} className="p-1 rounded text-muted-foreground hover:text-red-500 hover:bg-red-50 transition"><X className="w-3.5 h-3.5"/></button></td>}
                      </tr>
                    ))}</tbody>
                    <tfoot><tr className="border-t-2 border-border"><td colSpan={3} className="pt-2 text-xs font-semibold text-muted-foreground">الإجمالي</td><td className="pt-2 font-bold text-red-600">{fmt(s)} د.ت</td><td colSpan={role==='ADMIN'?4:3}/></tr></tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {/* Supply Requests Tab */}
      {view === 'supply' && (
        <div className="space-y-4">
          {!supplyBudget ? (
            budgets.filter(b=>b.status==='active').length === 0 ? (
              <div className="text-center py-16 text-muted-foreground"><ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-20"/><p className="text-sm">لا توجد اعتمادات نشطة</p></div>
            ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {budgets.filter(b=>b.status==='active').map(b=>(
                <button key={b.id} onClick={()=>setSupplyBudget(b)} className="rounded-xl border border-border bg-card shadow-sm p-5 hover:shadow-md hover:border-primary/50 transition text-right">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div><h3 className="font-semibold text-foreground truncate">{b.name}</h3><p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1"><Building2 className="w-3 h-3"/>{b.department}</p></div>
                    <ChevronLeft className="w-4 h-4 text-muted-foreground shrink-0"/>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    {[['المعتمد',fmt(b.amount)],['المصروف',fmt(spentByBudget[b.id]??0)],['المتبقي',fmt(b.amount-(spentByBudget[b.id]??0))]].map(([l,v])=>(<div key={l} className="bg-muted/50 rounded p-2"><p className="text-muted-foreground">{l}</p><p className="font-bold text-foreground">{v}</p></div>))}
                  </div>
                </button>
              ))}
            </div>
            )
          ) : (
            <div className="space-y-4">
              <button onClick={()=>{setSupplyBudget(null);resetSupplyModal();setPreviewFile(null)}} className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1.5 transition"><ChevronDown className="w-4 h-4 rotate-90"/> العودة</button>
              <div className="rounded-xl border border-border bg-card shadow-sm p-5">
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center"><ShoppingCart className="w-5 h-5 text-emerald-600"/></div>
                    <div><h2 className="font-bold text-foreground">{supplyBudget.name}</h2><p className="text-xs text-muted-foreground mt-0.5">{supplyBudget.department}</p></div>
                  </div>
                </div>
                {/* Add new request form */}
                <div className="bg-muted/20 rounded-xl p-4 mb-5 border border-border">
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><Plus className="w-4 h-4 text-emerald-600"/> طلب جديد</h3>
                  <div className="space-y-3">
                    <div><label className="block text-xs font-medium text-foreground mb-1">عنوان الطلب *</label><input value={supplyForm.title} onChange={e=>setSupplyForm(p=>({...p,title:e.target.value}))} placeholder="مثال: طلب مواد مكتبية للربع الأول..." className="w-full border border-input bg-background rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"/></div>
                    <div ref={supplySupplierBoxRef} className="relative">
                      <label className="block text-xs font-medium text-foreground mb-1">المزود</label>
                      <input
                        value={supplySupplierSearch}
                        onChange={e => { setSupplySupplierSearch(e.target.value); setSupplyForm(p => ({ ...p, supplier: e.target.value })); setShowSupplySupplierDropdown(true) }}
                        onFocus={() => setShowSupplySupplierDropdown(true)}
                        placeholder="ابحث أو اكتب اسم المزود..."
                        className="w-full border border-input bg-background rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        autoComplete="off"
                      />
                      {showSupplySupplierDropdown && (
                        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {filteredSupplySuppliers.length > 0 ? filteredSupplySuppliers.map((e: any) => (
                            <button key={e.id} type="button"
                              onMouseDown={() => { setSupplySupplierSearch(e.name); setSupplyForm(p => ({ ...p, supplier: e.name })); setShowSupplySupplierDropdown(false) }}
                              className="w-full text-right px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition flex items-center gap-2">
                              <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />{e.name}
                            </button>
                          )) : supplySupplierSearch.trim() !== '' ? (
                            <div className="px-3 py-2 text-sm text-muted-foreground text-center">لا يوجد تطابق</div>
                          ) : null}
                          {supplySupplierSearch.trim() !== '' && !exactSupplySupplierMatch && (
                            <button type="button"
                              onMouseDown={() => { setSupplyForm(p => ({ ...p, supplier: supplySupplierSearch.trim() })); setShowSupplySupplierDropdown(false) }}
                              className="w-full text-right px-3 py-2 text-sm text-emerald-600 hover:bg-emerald-50 transition flex items-center gap-2 border-t border-border">
                              <Plus className="w-3.5 h-3.5 shrink-0" />إضافة "{supplySupplierSearch.trim()}" كمزود جديد
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    <div><label className="block text-xs font-medium text-foreground mb-1">ملاحظات</label><textarea rows={2} value={supplyForm.notes} onChange={e=>setSupplyForm(p=>({...p,notes:e.target.value}))} className="w-full border border-input bg-background rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"/></div>
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1">المرفقات (صور أو PDF)</label>
                      <input ref={supplyFileRef} type="file" accept="image/*,.pdf,application/pdf" multiple className="hidden" onChange={e=>handleSupplyFiles(e.target.files)}/>
                      <button type="button" onClick={()=>supplyFileRef.current?.click()} className="flex items-center gap-2 w-full border border-dashed border-border rounded-lg p-2.5 text-sm text-muted-foreground hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 transition"><Paperclip className="w-4 h-4"/><span>انقر لإرفاق صور أو ملفات PDF</span></button>
                      {supplyAttachments.length>0&&<div className="mt-2 space-y-1.5">{supplyAttachments.map((a,i)=><div key={i} className="flex items-center justify-between bg-emerald-50 rounded-lg px-3 py-1.5"><div className="flex items-center gap-2 text-xs text-emerald-700 min-w-0">{a.type.startsWith('image/')?<ImageIcon className="w-3.5 h-3.5 shrink-0"/>:<Paperclip className="w-3.5 h-3.5 shrink-0"/>}<span className="truncate">{a.name}</span></div><button type="button" onClick={()=>setSupplyAttachments(prev=>prev.filter((_,j)=>j!==i))} className="text-emerald-400 hover:text-red-500 ml-2 shrink-0"><X className="w-3.5 h-3.5"/></button></div>)}</div>}
                    </div>
                    {supplyError&&<div className="text-red-600 text-xs bg-red-50 rounded-lg p-2.5 border border-red-200 text-right">{supplyError}</div>}
                    <button onClick={saveSupplyRequest} disabled={!supplyForm.title.trim()||addSupplyRequest.isLoading} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed">{addSupplyRequest.isLoading?<><div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"/>جارٍ الحفظ...</>:<><Plus className="w-4 h-4"/>إضافة طلب</>}</button>
                  </div>
                </div>
              </div>
              {/* Requests list */}
              <div className="rounded-xl border border-border bg-card shadow-sm p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2"><FileText className="w-4 h-4 text-muted-foreground"/> الطلبات المسجلة ({supplyRequests.length})</h3>
                {supplyQuery.isLoading?(
                  <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"/></div>
                ):supplyRequests.length===0?(
                  <div className="text-center py-10 text-muted-foreground"><ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-20"/><p className="text-sm">لا توجد طلبات مسجلة</p></div>
                ):(
                  <div className="space-y-3">
                    {supplyRequests.map(req=>(
                      <div key={req.id} className="rounded-xl border border-border bg-background p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0"><p className="font-semibold text-sm text-foreground">{req.title}</p>{req.supplier&&<p className="text-xs text-emerald-700 mt-0.5 flex items-center gap-1"><Building2 className="w-3 h-3 shrink-0"/>{req.supplier}</p>}{req.notes&&<p className="text-xs text-muted-foreground mt-1">{req.notes}</p>}<p className="text-[11px] text-muted-foreground/70 mt-1.5">{req.createdBy} · {new Date(req.createdAt).toLocaleDateString('ar-DZ')}</p></div>
                          {role==='ADMIN'&&<button onClick={()=>deleteSupplyRequest.mutate({id:req.id,budgetId:supplyBudget!.id})} className="p-1 rounded text-muted-foreground hover:text-red-500 hover:bg-red-50 transition shrink-0"><X className="w-3.5 h-3.5"/></button>}
                        </div>
                        {req.attachments.length>0&&(
                          <div className="mt-3 pt-3 border-t border-border"><p className="text-[11px] text-muted-foreground mb-2">المرفقات ({req.attachments.length})</p><div className="flex flex-wrap gap-2">{req.attachments.map((att,i)=>{if(att.type&&att.type.startsWith('image/'))return(
                            <div key={i} className="relative group"><img src={att.data} alt={att.name} className="w-16 h-16 object-cover rounded-lg border border-border cursor-pointer hover:opacity-90 transition" onClick={()=>setPreviewFile(att)}/><div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 rounded-lg transition"><Eye className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition"/></div><button onClick={()=>downloadFile(att)} title="تحميل" className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 transition"><Download className="w-2.5 h-2.5"/></button></div>
                          );return(
                            <button key={i} onClick={()=>downloadFile(att)} title={`تحميل: ${att.name}`} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-xs transition border border-red-100"><Paperclip className="w-3 h-3 shrink-0"/><span className="max-w-[100px] truncate">{att.name}</span><Download className="w-2.5 h-2.5 shrink-0 opacity-60"/></button>
                          )})}</div></div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Audit */}
      {view==='audit'&&(
        <div className="rounded-xl border border-border bg-card shadow-sm p-5">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2"><Clock className="w-4 h-4 text-muted-foreground"/> سجل العمليات ({audit.length})</h3>
          {audit.length===0?<p className="text-center text-muted-foreground py-10 text-sm">لا توجد عمليات مسجلة بعد</p>:(
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right">
                <thead><tr className="border-b border-border text-xs text-muted-foreground"><th className="pb-2 pr-2">التاريخ والوقت</th><th className="pb-2">العملية</th><th className="pb-2">المستخدم</th><th className="pb-2">التفاصيل</th></tr></thead>
                <tbody>{audit.map(a=>(
                  <tr key={a.id} onClick={()=>setSelectedAudit(a)} className="border-b border-border hover:bg-muted/50 cursor-pointer transition">
                    <td className="py-2 pr-2 text-xs text-muted-foreground font-mono whitespace-nowrap">{new Date(a.date).toLocaleString('ar-DZ')}</td>
                    <td className="py-2"><span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">{a.action}</span></td>
                    <td className="py-2 font-medium">{a.user}</td><td className="py-2 text-muted-foreground text-xs">{a.details}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Budget Modal */}
      {showBudgetModal&&(
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl border border-border shadow-lg w-full max-w-lg" dir="rtl">
            <div className="flex items-center justify-between p-5 border-b border-border"><h2 className="font-bold text-foreground">{editingBudget?'تعديل الاعتماد':'إضافة اعتماد جديد'}</h2><button onClick={()=>setShowBudgetModal(false)} className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground transition"><X className="w-4 h-4"/></button></div>
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div><label className="block text-xs font-medium text-foreground mb-1">اسم الاعتماد *</label><input value={budgetForm.name} onChange={e=>setBudgetForm(p=>({...p,name:e.target.value}))} placeholder="مثال: اعتماد التجهيزات..." className="w-full border border-input bg-background rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"/></div>
              <div><label className="block text-xs font-medium text-foreground mb-1">المبلغ المعتمد (د) *</label><input type="number" min={0} value={budgetForm.amount||''} onChange={e=>setBudgetForm(p=>({...p,amount:Number(e.target.value)}))} className="w-full border border-input bg-background rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"/></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-foreground mb-1">تاريخ البداية *</label><input type="date" value={budgetForm.startDate} onChange={e=>setBudgetForm(p=>({...p,startDate:e.target.value}))} className="w-full border border-input bg-background rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"/></div>
                <div><label className="block text-xs font-medium text-foreground mb-1">تاريخ النهاية *</label><input type="date" value={budgetForm.endDate} onChange={e=>setBudgetForm(p=>({...p,endDate:e.target.value}))} className="w-full border border-input bg-background rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"/></div>
              </div>
              {editingBudget&&<div><label className="block text-xs font-medium text-foreground mb-1">الحالة</label><select value={budgetForm.status} onChange={e=>setBudgetForm(p=>({...p,status:e.target.value as BudgetStatus}))} className="w-full border border-input bg-background rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"><option value="active">نشط</option><option value="expired">منتهي</option><option value="closed">مغلق</option></select></div>}
              <div><label className="block text-xs font-medium text-foreground mb-1">ملاحظات</label><textarea rows={3} value={budgetForm.notes} onChange={e=>setBudgetForm(p=>({...p,notes:e.target.value}))} className="w-full border border-input bg-background rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"/></div>
            </div>
            <div className="flex gap-3 p-5 border-t border-border">
              <button onClick={saveBudget} disabled={!budgetForm.name||!budgetForm.amount||!budgetForm.startDate||!budgetForm.endDate||createBudget.isLoading||updateBudget.isLoading} className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition disabled:opacity-40 disabled:cursor-not-allowed text-sm">{(createBudget.isLoading||updateBudget.isLoading)?'جارِ الحفظ...':editingBudget?'حفظ التعديلات':'إضافة الاعتماد'}</button>
              <button onClick={()=>setShowBudgetModal(false)} className="px-5 py-2.5 rounded-xl border border-border text-muted-foreground hover:bg-muted/50 transition text-sm">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Expense Modal */}
      {showExpenseModal&&selectedBudget&&(
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl border border-border shadow-lg w-full max-w-md" dir="rtl">
            <div className="flex items-center justify-between p-5 border-b border-border"><h2 className="font-bold text-foreground">إضافة مصروف جديد</h2><button onClick={resetExpenseModal} className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground transition"><X className="w-4 h-4"/></button></div>
            <div className="p-5 space-y-4">
              <div className="p-3 bg-primary/10 rounded-lg text-xs text-primary flex items-center gap-2"><Info className="w-4 h-4 shrink-0"/>الاعتماد: <span className="font-semibold">{selectedBudget.name}</span>  متبقي: <span className="font-bold">{fmt(selectedBudget.amount-(spentByBudget[selectedBudget.id]??0))} د.ت</span></div>
              <div><label className="block text-xs font-medium text-foreground mb-1">التاريخ *</label><input type="date" value={expenseForm.date} onChange={e=>setExpenseForm(p=>({...p,date:e.target.value}))} className="w-full border border-input bg-background rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"/></div>
              <div ref={supplierBoxRef} className="relative">
                <label className="block text-xs font-medium text-foreground mb-1">المورد *</label>
                <input
                  value={supplierSearch}
                  onChange={e => { setSupplierSearch(e.target.value); setExpenseForm(p => ({ ...p, supplier: e.target.value })); setShowSupplierDropdown(true) }}
                  onFocus={() => setShowSupplierDropdown(true)}
                  placeholder="ابحث أو اكتب اسم المورد..."
                  className="w-full border border-input bg-background rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  autoComplete="off"
                />
                {showSupplierDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filteredSuppliers.length > 0 ? filteredSuppliers.map((e: any) => (
                      <button
                        key={e.id}
                        type="button"
                        onMouseDown={() => { setSupplierSearch(e.name); setExpenseForm(p => ({ ...p, supplier: e.name })); setShowSupplierDropdown(false) }}
                        className="w-full text-right px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition flex items-center gap-2"
                      >
                        <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        {e.name}
                      </button>
                    )) : supplierSearch.trim() !== '' ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground text-center">لا يوجد تطابق</div>
                    ) : null}
                    {supplierSearch.trim() !== '' && !exactSupplierMatch && (
                      <button
                        type="button"
                        onMouseDown={() => { setShowSupplierDropdown(false) }}
                        className="w-full text-right px-3 py-2 text-sm text-primary hover:bg-primary/10 transition border-t border-border flex items-center gap-2 font-medium"
                      >
                        <Plus className="w-3.5 h-3.5 shrink-0" />
                        إضافة "{supplierSearch.trim()}" كجهة جديدة تلقائياً
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div><label className="block text-xs font-medium text-foreground mb-1">رقم الفاتورة</label><input value={expenseForm.invoiceNumber} onChange={e=>setExpenseForm(p=>({...p,invoiceNumber:e.target.value}))} placeholder="INV-XXXX" className="w-full border border-input bg-background rounded-lg p-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"/></div>
              <div><label className="block text-xs font-medium text-foreground mb-1">المبلغ (د) *</label><input type="number" min={0} value={expenseForm.amount||''} onChange={e=>setExpenseForm(p=>({...p,amount:Number(e.target.value)}))} className="w-full border border-input bg-background rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"/></div>
              <div><label className="block text-xs font-medium text-foreground mb-1">ملاحظات</label><textarea rows={2} value={expenseForm.notes} onChange={e=>setExpenseForm(p=>({...p,notes:e.target.value}))} className="w-full border border-input bg-background rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"/></div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">المرفقات (PDF)</label>
                <input ref={expenseFileRef} type="file" accept=".pdf,application/pdf" multiple className="hidden" onChange={e=>handleExpenseFiles(e.target.files)}/>
                <button type="button" onClick={()=>expenseFileRef.current?.click()} className="flex items-center gap-2 w-full border border-dashed border-border rounded-lg p-2.5 text-sm text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/10 transition"><Paperclip className="w-4 h-4"/><span>انقر لإرفاق ملفات PDF</span></button>
                {expenseAttachments.length>0&&<div className="mt-2 space-y-1.5">{expenseAttachments.map((a,i)=><div key={i} className="flex items-center justify-between bg-red-50 rounded-lg px-3 py-1.5"><div className="flex items-center gap-2 text-xs text-red-700 min-w-0"><Paperclip className="w-3.5 h-3.5 shrink-0"/><span className="truncate">{a.name}</span></div><button type="button" onClick={()=>setExpenseAttachments(prev=>prev.filter((_,j)=>j!==i))} className="text-red-400 hover:text-red-600 ml-2 shrink-0"><X className="w-3.5 h-3.5"/></button></div>)}</div>}
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-border">
              <button onClick={saveExpense} disabled={!expenseForm.date||!expenseForm.supplier||!expenseForm.amount||addExpense.isLoading} className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition disabled:opacity-40 disabled:cursor-not-allowed text-sm">{addExpense.isLoading?'جارِ التسجيل...':'تسجيل المصروف'}</button>
              <button onClick={resetExpenseModal} className="px-5 py-2.5 rounded-xl border border-border text-muted-foreground hover:bg-muted/50 transition text-sm">إلغاء</button>
            </div>
          </div>
        </div>
      )}
      {/* ── Supply Requests Modal (hidden, using tab instead) ── */}
      {false && showSupplyModal && supplyBudget && (
        <div></div>
      )}

      {/* Image Preview Overlay */}

      {/* Image Preview Overlay */}
      {previewFile && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4" onClick={()=>setPreviewFile(null)}>
          <div className="relative max-w-3xl w-full" onClick={e=>e.stopPropagation()}>
            <button onClick={()=>setPreviewFile(null)} className="absolute -top-10 left-0 text-white/80 hover:text-white flex items-center gap-1.5 text-sm"><X className="w-4 h-4"/> إغلاق</button>
            <img src={previewFile.data} alt={previewFile.name} className="w-full max-h-[80vh] object-contain rounded-xl"/>
            <button onClick={()=>downloadFile(previewFile)} className="absolute bottom-3 left-3 flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition"><Download className="w-4 h-4"/> تحميل</button>
          </div>
        </div>
      )}

      {/* Audit Detail Modal */}
      {selectedAudit && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" dir="rtl">
          <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-md">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="font-bold text-foreground text-lg">تفاصيل العملية</h2>
              <button onClick={()=>setSelectedAudit(null)} className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground transition"><X className="w-4 h-4"/></button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4">
              <div className="rounded-xl border border-border/50 bg-muted/30 p-4">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1">نوع العملية</p>
                <p className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <span className="px-2 py-1 rounded-full bg-primary/15 text-primary text-xs font-medium">{selectedAudit.action}</span>
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div className="rounded-lg border border-border/50 bg-background p-3">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1">المستخدم</p>
                  <p className="font-medium text-foreground">{selectedAudit.user}</p>
                </div>

                <div className="rounded-lg border border-border/50 bg-background p-3">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1">التاريخ والوقت</p>
                  <p className="font-medium text-foreground font-mono text-sm">{new Date(selectedAudit.date).toLocaleString('ar-DZ')}</p>
                </div>

                <div className="rounded-lg border border-border/50 bg-background p-3">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1">الكيان المتأثر</p>
                  <p className="font-medium text-foreground flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700">{selectedAudit.entity}</span>
                    {selectedAudit.entityId && <span className="text-muted-foreground">#{selectedAudit.entityId}</span>}
                  </p>
                </div>

                <div className="rounded-lg border border-border/50 bg-background p-3">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1">التفاصيل</p>
                  <p className="text-sm text-foreground leading-relaxed">{selectedAudit.details}</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-2 p-5 border-t border-border">
              <button onClick={()=>setSelectedAudit(null)} className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition text-sm">إغلاق</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
