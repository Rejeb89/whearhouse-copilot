import React, { useState, useMemo, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import client from '../services/client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from 'recharts'
import {
  FileText, BarChart3, Download, FileSpreadsheet,
  Calendar, RefreshCw, Search, Activity,
  ChevronLeft, ChevronRight, X, Filter,
  DollarSign, Package, ArrowDownToLine, ArrowUpFromLine,
  ClipboardList, Layers, ShieldCheck, Clock, Eye,
  AlertTriangle, CheckCircle2, SlidersHorizontal, ChevronDown, ChevronUp,
  PackageSearch, TrendingDown, Warehouse, InboxIcon,
} from 'lucide-react'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Log {
  id: number
  action: string
  table: string
  recordId: number | null
  userId: number | null
  createdAt: string
  user?: { email: string; name: string | null } | null
  transactionType?: string
  equipmentNames?: string[]
  counterparty?: string
  assignedTo?: string
}

interface Budget {
  id: number
  name: string
  department: string
  amount: number
  spent: number
  startDate: string
  endDate: string
  status: 'active' | 'expired' | 'closed'
  notes?: string
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const AR_MONTHS = [
  'يناير','فبراير','مارس','أبريل','مايو','يونيو',
  'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر',
]

const CHART_PALETTE = ['#3b82f6','#22c55e','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#84cc16']

const ACTION_LABELS: Record<string, string> = {
  CREATE: 'إضافة',
  UPDATE: 'تعديل',
  DELETE: 'حذف',
  LOGIN:  'تسجيل دخول',
  LOGOUT: 'تسجيل خروج',
}

const TABLE_LABELS: Record<string, string> = {
  User: 'مستخدمون',
  Item: 'أصناف',
  Reception: 'دخل',
  Distribution: 'خرج',
  Entity: 'جهات',
  Employee: 'موظفون',
  Budget: 'اعتمادات',
  DeliveryReceipt: 'وصولات التسليم',
}

const ACTION_BADGE: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-700 border-green-200',
  UPDATE: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  DELETE: 'bg-red-100 text-red-700 border-red-200',
  LOGIN:  'bg-blue-100 text-blue-700 border-blue-200',
  LOGOUT: 'bg-purple-100 text-purple-700 border-purple-200',
}

// ─── API helpers ────────────────────────────────────────────────────────────────

const fetchLogs       = (params: Record<string, string>) => client.get('/logs', { params }).then(r => r.data)
const fetchStats      = (year: number) => client.get('/logs/stats', { params: { year } }).then(r => r.data.data)
const fetchMeta       = () => client.get('/logs/meta').then(r => r.data.data)
const fetchMonthlyRpt = (year: number, month: number) =>
  client.get('/logs/monthly-report', { params: { year, month } }).then(r => r.data.data)
const fetchBudgets    = () => client.get('/budgets').then(r => r.data.data ?? r.data)
const fetchItems      = () => client.get('/items').then(r => r.data.data ?? r.data)

// ─── Export helpers ──────────────────────────────────────────────────────────────

async function exportExcel(logs: Log[], filename: string) {
  const XLSX = await import('xlsx')
  const rows = logs.map(l => ({
    '#': l.id,
    'الإجراء': ACTION_LABELS[l.action] ?? l.action,
    'نوع المعاملة': l.transactionType ?? '—',
    'الجدول': TABLE_LABELS[l.table] ?? l.table,
    'اسم التجهيز': l.equipmentNames?.join('، ') ?? '—',
    'رقم السجل': l.recordId ?? '—',
    'الجهة': l.counterparty ?? '—',
    'المكلف بالسحب': l.assignedTo ?? '—',
    'المستخدم': l.user?.name ?? l.user?.email ?? '—',
    'التاريخ والوقت': new Date(l.createdAt).toLocaleString('en-GB'),
  }))
  const ws = XLSX.utils.json_to_sheet(rows)
  ws['!cols'] = [
    { wch: 6 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 20 },
    { wch: 10 }, { wch: 25 }, { wch: 18 }, { wch: 20 }, { wch: 22 },
  ]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'السجلات')
  XLSX.writeFile(wb, filename)
}

async function exportPDF(
  logs: Log[],
  title: string,
  summary: Record<string, number> | null,
  filename: string,
) {
  const { jsPDF }   = await import('jspdf')
  const html2canvas = await import('html2canvas')
  const container   = document.createElement('div')
  container.style.direction  = 'rtl'
  container.style.fontFamily = "'Cairo','Tahoma',sans-serif"
  container.style.background = '#ffffff'
  container.style.padding    = '20px'
  container.style.width      = '1400px'
  container.style.color      = '#0f172a'
  container.innerHTML = `
    <div>
      <div style="display:flex;justify-content:space-between;align-items:center;gap:20px;margin-bottom:20px;">
        <div>
          <p style="margin:0;font-size:24px;font-weight:700;">${title}</p>
          <p style="margin:4px 0 0;font-size:12px;color:#475569;">تم توليد التقرير: ${new Date().toLocaleString('en-GB')}</p>
        </div>
        <div style="font-size:12px;color:#475569;"><p style="margin:0;"><strong>${logs.length}</strong> سجل</p></div>
      </div>
      <div style="margin-bottom:20px;border-top:1px solid #e2e8f0;padding-top:16px;">
        ${summary && Object.keys(summary).length > 0
          ? `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:12px;">
               ${Object.entries(summary).map(([a, c]) => `
                 <div style="border:1px solid #e5e7eb;border-radius:8px;padding:10px;background:#f8fafc;text-align:center;">
                   <p style="margin:0;font-size:11px;color:#475569;font-weight:600;">${ACTION_LABELS[a] ?? a}</p>
                   <p style="margin-top:4px;font-size:18px;font-weight:700;color:#0f172a;">${c}</p>
                 </div>`).join('')}
             </div>`
          : '<p style="color:#94a3b8;font-size:12px;margin:0;">لا يوجد ملخص</p>'}
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:10px;border:1px solid #cbd5e1;">
        <thead>
          <tr style="background:#f3f4f6;border-bottom:2px solid #cbd5e1;">
            <th style="padding:6px 4px;text-align:right;border-right:1px solid #e5e7eb;">#</th>
            <th style="padding:6px 4px;text-align:right;border-right:1px solid #e5e7eb;">الإجراء</th>
            <th style="padding:6px 4px;text-align:right;border-right:1px solid #e5e7eb;">النوع</th>
            <th style="padding:6px 4px;text-align:right;border-right:1px solid #e5e7eb;">التجهيز</th>
            <th style="padding:6px 4px;text-align:right;border-right:1px solid #e5e7eb;">الجدول</th>
            <th style="padding:6px 4px;text-align:right;border-right:1px solid #e5e7eb;">الجهة</th>
            <th style="padding:6px 4px;text-align:right;border-right:1px solid #e5e7eb;">المكلف</th>
            <th style="padding:6px 4px;text-align:right;border-right:1px solid #e5e7eb;">المستخدم</th>
            <th style="padding:6px 4px;text-align:right;">التاريخ</th>
          </tr>
        </thead>
        <tbody>
          ${logs.map((l, i) => `
            <tr style="border-bottom:1px solid #e2e8f0;background:${i % 2 === 0 ? '#fff' : '#f9fafb'};">
              <td style="padding:6px 4px;border-right:1px solid #e5e7eb;">${l.id}</td>
              <td style="padding:6px 4px;font-weight:600;border-right:1px solid #e5e7eb;">${ACTION_LABELS[l.action] ?? l.action}</td>
              <td style="padding:6px 4px;border-right:1px solid #e5e7eb;">${l.transactionType ?? '—'}</td>
              <td style="padding:6px 4px;border-right:1px solid #e5e7eb;">${l.equipmentNames?.slice(0, 1).join('، ') ?? '—'}</td>
              <td style="padding:6px 4px;border-right:1px solid #e5e7eb;">${TABLE_LABELS[l.table] ?? l.table}</td>
              <td style="padding:6px 4px;border-right:1px solid #e5e7eb;max-width:120px;overflow:hidden;white-space:nowrap;">${l.counterparty ?? '—'}</td>
              <td style="padding:6px 4px;border-right:1px solid #e5e7eb;">${l.assignedTo ?? '—'}</td>
              <td style="padding:6px 4px;border-right:1px solid #e5e7eb;">${l.user?.name ?? l.user?.email ?? '—'}</td>
              <td style="padding:6px 4px;">${new Date(l.createdAt).toLocaleString('en-GB')}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`
  document.body.appendChild(container)
  try {
    const canvas  = await html2canvas.default(container, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false })
    const imgData = canvas.toDataURL('image/png')
    const pw = 297, iw = pw - 10, ih = (canvas.height * iw) / canvas.width
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    doc.addImage(imgData, 'PNG', 5, 5, iw, ih)
    let rem = ih; let page = 1
    while (rem > 200) { doc.addPage(); rem -= 200; doc.addImage(imgData, 'PNG', 5, -page * 200 + 5, iw, ih); page++ }
    doc.save(filename)
  } finally { container.remove() }
}

// ─── Sub-components ──────────────────────────────────────────────────────────────

function ActionBadge({ action }: { action: string }) {
  return (
    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full border ${ACTION_BADGE[action] ?? 'bg-muted text-muted-foreground border-border'}`}>
      {ACTION_LABELS[action] ?? action}
    </span>
  )
}

function KpiCard({ label, value, sub, icon, accent }: {
  label: string; value: React.ReactNode; sub?: string
  icon: React.ReactNode; accent: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 flex items-start gap-4 shadow-sm">
      <div className={`p-3 rounded-xl shrink-0 ${accent}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <p className="text-2xl font-bold text-foreground mt-0.5 truncate">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function BudgetBar({ budget }: { budget: Budget }) {
  const spent   = budget.spent ?? 0
  const pct     = budget.amount > 0 ? Math.min((spent / budget.amount) * 100, 100) : 0
  const danger  = pct >= 90
  const warning = pct >= 70 && pct < 90

  const statusLabel: Record<string, string> = { active: 'فعّال', expired: 'منتهي', closed: 'مغلق' }
  const statusColor: Record<string, string> = {
    active:  'bg-green-100 text-green-700 border-green-200',
    expired: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    closed:  'bg-muted text-muted-foreground border-border',
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-foreground truncate">{budget.name}</p>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${statusColor[budget.status] ?? statusColor.closed}`}>
              {statusLabel[budget.status] ?? budget.status}
            </span>
            {danger && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />تحذير
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{budget.department}</p>
        </div>
        <div className="text-left shrink-0">
          <p className="text-xs text-muted-foreground">الرصيد المتبقي</p>
          <p className={`text-lg font-bold ${danger ? 'text-red-600' : warning ? 'text-yellow-600' : 'text-foreground'}`}>
            {(budget.amount - spent).toLocaleString('ar-DZ')} د.ت
          </p>
        </div>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>المصروف: {spent.toLocaleString('ar-DZ')} د.ت</span>
          <span className="font-semibold">{pct.toFixed(1)}%</span>
          <span>الاعتماد: {budget.amount.toLocaleString('ar-DZ')} د.ت</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${danger ? 'bg-red-500' : warning ? 'bg-yellow-500' : 'bg-primary'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  )
}

function LogDetailsModal({ log, onClose }: { log: Log; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-xl bg-card border border-border text-right shadow-xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between bg-foreground px-6 py-4 text-background">
          <div>
            <p className="text-sm font-semibold">تفاصيل السجل #{log.id}</p>
            <p className="text-xs opacity-70">{new Date(log.createdAt).toLocaleString('en-GB')}</p>
          </div>
          <button onClick={onClose} className="rounded-full bg-white/10 p-2 hover:bg-white/20 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">الإجراء</p>
              <div className="mt-1"><ActionBadge action={log.action} /></div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">الجدول / الوحدة</p>
              <p className="text-sm font-semibold text-foreground mt-1">{TABLE_LABELS[log.table] ?? log.table}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">نوع المعاملة</p>
              <p className="text-sm text-foreground mt-1">{log.transactionType ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">رقم السجل</p>
              <p className="text-sm font-mono text-foreground mt-1">{log.recordId ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">الجهة / المورد</p>
              <p className="text-sm text-foreground mt-1">{log.counterparty ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">المكلف بالسحب</p>
              <p className="text-sm text-foreground mt-1">{log.assignedTo ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">المستخدم</p>
              <p className="text-sm font-semibold text-foreground mt-1">{log.user?.name ?? log.user?.email ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">التاريخ والوقت</p>
              <p className="text-sm font-mono text-foreground mt-1">{new Date(log.createdAt).toLocaleString('en-GB')}</p>
            </div>
          </div>
          {log.equipmentNames && log.equipmentNames.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">التجهيزات</p>
              <div className="flex flex-wrap gap-1.5">
                {log.equipmentNames.map((n, i) => (
                  <span key={i} className="text-xs bg-muted text-foreground px-2 py-0.5 rounded-md border border-border">{n}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'audit' | 'financial' | 'monthly' | 'inventory'

export default function Logs() {
  const now = new Date()
  const [activeTab, setActiveTab]       = useState<Tab>('overview')
  const [statsYear, setStatsYear]       = useState(now.getFullYear())
  const [reportYear, setReportYear]     = useState(now.getFullYear())
  const [reportMonth, setReportMonth]   = useState(now.getMonth() + 1)
  const [exportingExcel, setExportingExcel] = useState(false)
  const [exportingPDF,   setExportingPDF]   = useState(false)
  const [activeLogDetails, setActiveLogDetails] = useState<Log | null>(null)

  // Audit log filters
  const [filterAction, setFilterAction] = useState('')
  const [filterTable,  setFilterTable]  = useState('')
  const [filterFrom,   setFilterFrom]   = useState('')
  const [filterTo,     setFilterTo]     = useState('')
  const [filterSearch, setFilterSearch] = useState('')
  const [filterUser,   setFilterUser]   = useState('')
  const [sortDir,      setSortDir]      = useState<'desc'|'asc'>('desc')
  const [pageSize,     setPageSize]     = useState(50)
  const [filtersOpen,  setFiltersOpen]  = useState(true)
  const [currentPage,  setCurrentPage]  = useState(1)

  const applyDatePreset = (preset: 'today'|'week'|'month') => {
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`
    const today = fmt(now)
    if (preset === 'today') { setFilterFrom(today); setFilterTo(today) }
    else if (preset === 'week') {
      const mon = new Date(now); mon.setDate(now.getDate() - now.getDay() + 1)
      setFilterFrom(fmt(mon)); setFilterTo(today)
    } else {
      setFilterFrom(`${now.getFullYear()}-${pad(now.getMonth()+1)}-01`); setFilterTo(today)
    }
    setCurrentPage(1)
  }

  const logsParams = useMemo(() => {
    const p: Record<string, string> = { limit: String(pageSize), page: String(currentPage) }
    if (filterAction) p.action = filterAction
    if (filterTable)  p.table  = filterTable
    if (filterFrom)   p.from   = filterFrom
    if (filterTo)     p.to     = filterTo
    return p
  }, [filterAction, filterTable, filterFrom, filterTo, currentPage, pageSize])

  // Queries
  const { data: logsData, isLoading: logsLoading, refetch: refetchLogs } =
    useQuery(['logs', logsParams], () => fetchLogs(logsParams), { keepPreviousData: true })

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } =
    useQuery(['logs-stats', statsYear], () => fetchStats(statsYear))

  const { data: meta } =
    useQuery(['logs-meta'], fetchMeta, { staleTime: 60000 })

  const { data: reportData, isLoading: reportLoading } =
    useQuery(
      ['logs-report', reportYear, reportMonth],
      () => fetchMonthlyRpt(reportYear, reportMonth),
      { enabled: activeTab === 'monthly', staleTime: 30000 },
    )

  const { data: budgetsRaw } =
    useQuery(['budgets'], fetchBudgets, { staleTime: 60000 })

  const { data: itemsRaw } =
    useQuery(['items'], fetchItems, { staleTime: 60000 })

  const { data: inventoryRaw, isLoading: inventoryLoading } =
    useQuery(['items-inventory'], () => client.get('/items/inventory').then(r => r.data.data ?? []), {
      staleTime: 30000,
      enabled: activeTab === 'inventory',
    })

  // ── Inventory tab state ──────────────────────────────────────────────────────
  const [invSearch,       setInvSearch]       = useState('')
  const [invCategory,     setInvCategory]     = useState('')
  const [invStockStatus,  setInvStockStatus]  = useState('all')
  const [invRefType,      setInvRefType]      = useState('')
  const [invDateFrom,     setInvDateFrom]     = useState('')
  const [invDateTo,       setInvDateTo]       = useState('')
  const [invShowFilters,  setInvShowFilters]  = useState(false)
  const [invExpandedId,   setInvExpandedId]   = useState<number | null>(null)
  const [invExportingXL,  setInvExportingXL]  = useState(false)
  const [invExportingPDF, setInvExportingPDF] = useState(false)

  // Derived values
  const logs: Log[]       = logsData?.data ?? []
  const logsMeta          = logsData?.meta ?? { total: 0, page: 1 }
  const totalPages        = Math.ceil((logsMeta.total ?? 0) / pageSize)
  const budgets: Budget[] = Array.isArray(budgetsRaw) ? budgetsRaw : (budgetsRaw?.data ?? [])
  const items: any[]      = Array.isArray(itemsRaw)   ? itemsRaw   : (itemsRaw?.data ?? [])

  // KPI derivations
  const totalItems    = items.length
  const lowStockCount = items.filter((i: any) => i.lowStockThreshold != null && i.quantity <= i.lowStockThreshold).length
  const activeBudgets = budgets.filter(b => b.status === 'active')
  const totalBudgetAmt = activeBudgets.reduce((s, b) => s + b.amount, 0)
  const totalSpent     = activeBudgets.reduce((s, b) => s + (b.spent ?? 0), 0)
  const budgetUtilPct  = totalBudgetAmt > 0 ? (totalSpent / totalBudgetAmt) * 100 : 0
  const todayLogs      = logs.filter(l => new Date(l.createdAt).toDateString() === now.toDateString()).length

  // Client-side search + user filter + sort
  const displayedLogs = useMemo(() => {
    let result = [...logs]
    if (filterSearch.trim()) {
      const q = filterSearch.toLowerCase()
      result = result.filter(l =>
        l.action.toLowerCase().includes(q) ||
        l.table.toLowerCase().includes(q) ||
        String(l.recordId ?? '').includes(q) ||
        (l.user?.email ?? '').toLowerCase().includes(q) ||
        (l.user?.name ?? '').toLowerCase().includes(q) ||
        (l.transactionType ?? '').toLowerCase().includes(q) ||
        (l.equipmentNames?.join(', ') ?? '').toLowerCase().includes(q) ||
        (l.counterparty ?? '').toLowerCase().includes(q) ||
        (l.assignedTo ?? '').toLowerCase().includes(q),
      )
    }
    if (filterUser.trim()) {
      const u = filterUser.toLowerCase()
      result = result.filter(l =>
        (l.user?.name ?? '').toLowerCase().includes(u) ||
        (l.user?.email ?? '').toLowerCase().includes(u)
      )
    }
    result.sort((a, b) => {
      const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      return sortDir === 'desc' ? -diff : diff
    })
    return result
  }, [logs, filterSearch, filterUser, sortDir])

  const handleExcelCurrent = useCallback(async () => {
    setExportingExcel(true)
    try { await exportExcel(displayedLogs, `logs-page-${currentPage}.xlsx`) }
    finally { setExportingExcel(false) }
  }, [displayedLogs, currentPage])

  const handleMonthlyExcel = async () => {
    if (!reportData) return
    setExportingExcel(true)
    try { await exportExcel(reportData.logs, `تقرير-${reportData.monthName}-${reportData.year}.xlsx`) }
    finally { setExportingExcel(false) }
  }

  const handleMonthlyPDF = async () => {
    if (!reportData) return
    setExportingPDF(true)
    try {
      await exportPDF(
        reportData.logs,
        `تقرير أنشطة المستودع — ${reportData.monthName} ${reportData.year}`,
        reportData.summary,
        `تقرير-${reportData.monthName}-${reportData.year}.pdf`,
      )
    } finally { setExportingPDF(false) }
  }

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'overview',   label: 'نظرة عامة',           icon: <BarChart3      className="w-4 h-4" /> },
    { key: 'audit',      label: 'سجل العمليات',         icon: <ShieldCheck    className="w-4 h-4" /> },
    { key: 'financial',  label: 'التقارير المالية',      icon: <DollarSign     className="w-4 h-4" /> },
    { key: 'monthly',    label: 'التقرير الشهري',        icon: <Calendar       className="w-4 h-4" /> },
    { key: 'inventory',  label: 'جرد التجهيزات',         icon: <PackageSearch  className="w-4 h-4" /> },
  ]

  const TooltipStyle = {
    contentStyle: {
      background: 'hsl(var(--card))',
      border: '1px solid hsl(var(--border))',
      borderRadius: 8,
      color: 'hsl(var(--foreground))',
    },
    labelStyle: { color: 'hsl(var(--muted-foreground))', fontWeight: 600 },
  }

  return (
    <div dir="rtl" className="space-y-6">

      {/* ── Page header ────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">التقارير والسجلات</h1>
        <p className="text-sm text-muted-foreground mt-0.5">المستودع — إدارة المعلومات</p>
      </div>

      {/* ── Tab bar ────────────────────────────────────────────── */}
      <div className="border-b border-border -mb-4">
        <nav className="flex gap-0 overflow-x-auto scrollbar-none">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeTab === t.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ════════════════════════════════════════════════════════════
          TAB 1  —  نظرة عامة  (Overview / Dashboard)
      ════════════════════════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <div className="space-y-6 pt-2">

          {/* Year picker + refresh */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm font-medium text-muted-foreground">مؤشرات أداء المستودع</p>
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground">السنة:</label>
              <select
                value={statsYear}
                onChange={e => setStatsYear(Number(e.target.value))}
                className="text-sm border border-border rounded-lg px-3 py-1.5 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {[now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <button
                onClick={() => refetchStats()}
                className="p-1.5 rounded-lg border border-border hover:bg-muted transition-colors text-muted-foreground"
                title="تحديث"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* KPI row 1 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="إجمالي التجهيزات"
              value={totalItems.toLocaleString('ar-DZ')}
              sub="صنف مسجل في المستودع"
              icon={<Package className="w-5 h-5 text-blue-600" />}
              accent="bg-blue-100"
            />
            <KpiCard
              label="إجمالي سجلات النظام"
              value={(stats?.totalLogs ?? '…').toLocaleString?.('ar-DZ') ?? stats?.totalLogs ?? '…'}
              sub={`${stats?.totalThisMonth ?? 0} هذا الشهر`}
              icon={<ClipboardList className="w-5 h-5 text-violet-600" />}
              accent="bg-violet-100"
            />
            <KpiCard
              label="نسبة استهلاك الاعتمادات"
              value={`${budgetUtilPct.toFixed(1)}%`}
              sub={`${totalSpent.toLocaleString('ar-DZ')} من ${totalBudgetAmt.toLocaleString('ar-DZ')} د.ت`}
              icon={<Activity className="w-5 h-5 text-orange-600" />}
              accent="bg-orange-100"
            />
            <KpiCard
              label="تنبيهات نقص المخزون"
              value={lowStockCount}
              sub="صنف أقل من الحد الأدنى"
              icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
              accent="bg-red-100"
            />
          </div>

          {/* KPI row 2 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KpiCard
              label="الاعتمادات الفعّالة"
              value={activeBudgets.length}
              sub="اعتماد مالي مفتوح"
              icon={<CheckCircle2 className="w-5 h-5 text-green-600" />}
              accent="bg-green-100"
            />
            <KpiCard
              label="الرصيد المتبقي الإجمالي"
              value={`${(totalBudgetAmt - totalSpent).toLocaleString('ar-DZ')} د.ت`}
              sub="للاعتمادات الفعّالة"
              icon={<DollarSign className="w-5 h-5 text-teal-600" />}
              accent="bg-teal-100"
            />
            <KpiCard
              label="نشاط اليوم"
              value={todayLogs}
              sub="عملية مسجّلة اليوم"
              icon={<Clock className="w-5 h-5 text-indigo-600" />}
              accent="bg-indigo-100"
            />
          </div>

          {/* Charts */}
          {statsLoading ? (
            <div className="h-48 flex items-center justify-center rounded-xl border border-border bg-card">
              <div className="flex items-center gap-3 text-muted-foreground">
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span className="text-sm">جاري تحميل الإحصائيات…</span>
              </div>
            </div>
          ) : stats ? (
            <>
              {/* Monthly area chart */}
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <h3 className="text-sm font-semibold text-foreground">حركة النشاط الشهري — {stats.year}</h3>
                  <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                    {(stats.totalLogs ?? 0).toLocaleString('ar-DZ')} عملية إجمالاً
                  </span>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={stats.monthlyData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradActivity" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip {...TooltipStyle} formatter={(v: any) => [v, 'عدد العمليات']} />
                    <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} fill="url(#gradActivity)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Pie + horizontal bar */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="rounded-xl border border-border bg-card p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-4">توزيع العمليات حسب النوع</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={stats.byAction}
                        dataKey="count"
                        nameKey="action"
                        cx="50%" cy="50%"
                        outerRadius={75}
                        paddingAngle={3}
                        label={({ name, percent }: any) =>
                          `${ACTION_LABELS[name] ?? name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {stats.byAction.map((_: any, i: number) => (
                          <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        {...TooltipStyle}
                        formatter={(v: any, n: any) => [v, ACTION_LABELS[n] ?? n]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="rounded-xl border border-border bg-card p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-4">العمليات حسب الوحدة</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart
                      data={stats.byTable}
                      layout="vertical"
                      margin={{ right: 10, left: 0, top: 5, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis
                        dataKey="table"
                        type="category"
                        tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                        tickFormatter={(v: string) => TABLE_LABELS[v] ?? v}
                        width={85}
                      />
                      <Tooltip
                        {...TooltipStyle}
                        formatter={(v: any) => [v, 'عدد']}
                        labelFormatter={(l: string) => TABLE_LABELS[l] ?? l}
                      />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        {stats.byTable.map((_: any, i: number) => (
                          <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Action summary cards */}
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4">ملخص العمليات — {stats.year}</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {stats.byAction.map((item: { action: string; count: number }) => (
                    <div key={item.action} className="rounded-lg border border-border bg-muted/30 p-4 text-center">
                      <p className="text-2xl font-bold text-foreground">{item.count}</p>
                      <p className="text-xs text-muted-foreground mt-1">{ACTION_LABELS[item.action] ?? item.action}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          TAB 2  —  سجل العمليات  (Audit Log)
      ════════════════════════════════════════════════════════════ */}
      {activeTab === 'audit' && (
        <div className="space-y-4 pt-2">

          {/* ── Filter Panel ─────────────────────────────────────────── */}
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            {/* Header bar */}
            <div
              className="flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-muted/40 transition-colors"
              onClick={() => setFiltersOpen(v => !v)}
            >
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">فلاتر البحث المتقدم</span>
                {(filterAction || filterTable || filterFrom || filterTo || filterSearch || filterUser) && (
                  <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                    {[filterAction, filterTable, filterFrom, filterTo, filterSearch, filterUser].filter(Boolean).length} فعّال
                  </span>
                )}
              </div>
              {filtersOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </div>

            {filtersOpen && (
              <div className="border-t border-border px-5 pb-5 pt-4 space-y-4">
                {/* Row 1: search + user */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <input
                      value={filterSearch}
                      onChange={e => { setFilterSearch(e.target.value); setCurrentPage(1) }}
                      placeholder="بحث عام (تجهيز، جهة، مكلف…)"
                      className="w-full pr-9 pl-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    {filterSearch && (
                      <button onClick={() => setFilterSearch('')} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <input
                      value={filterUser}
                      onChange={e => { setFilterUser(e.target.value); setCurrentPage(1) }}
                      placeholder="تصفية حسب المستخدم…"
                      className="w-full pr-9 pl-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    {filterUser && (
                      <button onClick={() => setFilterUser('')} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Row 2: Action chips */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">نوع العملية</p>
                  <div className="flex flex-wrap gap-2">
                    {(['', ...Object.keys(ACTION_LABELS)] as string[]).map(a => (
                      <button
                        key={a || '_all'}
                        onClick={() => { setFilterAction(a); setCurrentPage(1) }}
                        className={`text-xs px-3 py-1 rounded-full border transition-colors font-medium ${
                          filterAction === a
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                        }`}
                      >
                        {a === '' ? 'الكل' : ACTION_LABELS[a] ?? a}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Row 3: Table/module chips */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">الوحدة / القسم</p>
                  <div className="flex flex-wrap gap-2">
                    {(['', ...Object.keys(TABLE_LABELS)] as string[]).map(t => (
                      <button
                        key={t || '_all'}
                        onClick={() => { setFilterTable(t); setCurrentPage(1) }}
                        className={`text-xs px-3 py-1 rounded-full border transition-colors font-medium ${
                          filterTable === t
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                        }`}
                      >
                        {t === '' ? 'الكل' : TABLE_LABELS[t] ?? t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Row 4: date range + presets + page size */}
                <div className="flex flex-wrap gap-3 items-end">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">الفترة الزمنية</p>
                    <div className="flex gap-2 items-center">
                      <input
                        type="date"
                        value={filterFrom}
                        onChange={e => { setFilterFrom(e.target.value); setCurrentPage(1) }}
                        className="text-sm border border-border rounded-lg px-2.5 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                      <span className="text-xs text-muted-foreground">إلى</span>
                      <input
                        type="date"
                        value={filterTo}
                        onChange={e => { setFilterTo(e.target.value); setCurrentPage(1) }}
                        className="text-sm border border-border rounded-lg px-2.5 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">اختصارات</p>
                    <div className="flex gap-1.5">
                      {[{k:'today',l:'اليوم'},{k:'week',l:'هذا الأسبوع'},{k:'month',l:'هذا الشهر'}].map(p => (
                        <button
                          key={p.k}
                          onClick={() => applyDatePreset(p.k as any)}
                          className="text-xs px-2.5 py-1.5 rounded-lg border border-border hover:bg-muted hover:text-foreground text-muted-foreground transition-colors"
                        >{p.l}</button>
                      ))}
                    </div>
                  </div>
                  <div className="mr-auto">
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">عدد الصفوف</p>
                    <select
                      value={pageSize}
                      onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1) }}
                      className="text-sm border border-border rounded-lg px-2.5 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      {[25,50,100,200].map(n => <option key={n} value={n}>{n} سطر</option>)}
                    </select>
                  </div>
                </div>

                {/* Actions bar */}
                <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-border">
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => { setFilterAction(''); setFilterTable(''); setFilterFrom(''); setFilterTo(''); setFilterSearch(''); setFilterUser(''); setCurrentPage(1) }}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors text-muted-foreground"
                    >
                      <X className="w-3.5 h-3.5" /> مسح كل الفلاتر
                    </button>
                    <button
                      onClick={() => refetchLogs()}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors text-muted-foreground"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> تحديث
                    </button>
                    <button
                      onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors text-muted-foreground"
                    >
                      {sortDir === 'desc' ? '↓ الأحدث أولاً' : '↑ الأقدم أولاً'}
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleExcelCurrent}
                      disabled={exportingExcel || displayedLogs.length === 0}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      {exportingExcel ? 'جاري التصدير…' : `Excel (${displayedLogs.length})`}
                    </button>
                    <button
                      onClick={async () => {
                        setExportingPDF(true)
                        try {
                          const summary: Record<string, number> = {}
                          displayedLogs.forEach(l => { summary[l.action] = (summary[l.action] ?? 0) + 1 })
                          await exportPDF(displayedLogs, 'سجل العمليات', summary, `سجل-عمليات-${new Date().toISOString().slice(0,10)}.pdf`)
                        } finally { setExportingPDF(false) }
                      }}
                      disabled={exportingPDF || displayedLogs.length === 0}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      <Download className="w-3.5 h-3.5" />
                      {exportingPDF ? 'جاري التصدير…' : `PDF (${displayedLogs.length})`}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Summary chips ──────────────────────────────────────────── */}
          <div className="flex items-center gap-3 flex-wrap">
            {[
              { label: 'إجمالي النتائج', value: logsMeta.total },
              { label: 'المعروضة', value: displayedLogs.length },
              { label: 'الصفحة', value: `${currentPage} / ${totalPages || 1}` },
            ].map(({ label, value }) => (
              <span key={label} className="text-xs bg-muted text-muted-foreground px-3 py-1 rounded-full">
                {label}: <strong className="text-foreground">{value}</strong>
              </span>
            ))}
            {(filterAction || filterTable || filterFrom || filterTo || filterSearch || filterUser) && (
              <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 rounded-full">
                الفلاتر مفعّلة — النتائج مصفّاة
              </span>
            )}
          </div>

          {/* ── Desktop Table ─────────────────────────────────────────── */}
          <div className="hidden sm:block rounded-xl border border-border bg-card overflow-hidden shadow-sm">
            {logsLoading ? (
              <div className="h-40 flex items-center justify-center">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span className="text-sm">جاري تحميل السجلات…</span>
                </div>
              </div>
            ) : displayedLogs.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center text-muted-foreground gap-2">
                <FileText className="w-8 h-8 opacity-40" />
                <p className="text-sm">لا توجد سجلات تطابق الفلاتر المحددة</p>
                <button onClick={() => { setFilterAction(''); setFilterTable(''); setFilterFrom(''); setFilterTo(''); setFilterSearch(''); setFilterUser('') }} className="text-xs text-primary underline">مسح الفلاتر</button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b border-border bg-muted/70 backdrop-blur-sm">
                      <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground w-16">#</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">الإجراء</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">الوحدة</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">نوع المعاملة</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">التجهيز / الصنف</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">الجهة</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">المكلف بالسحب</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">المستخدم</th>
                      <th
                        className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground cursor-pointer select-none hover:text-foreground"
                        onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
                      >
                        التاريخ {sortDir === 'desc' ? '↓' : '↑'}
                      </th>
                      <th className="px-2 py-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {displayedLogs.map((log, idx) => (
                      <tr key={log.id} className={`hover:bg-primary/5 transition-colors group ${idx % 2 === 0 ? '' : 'bg-muted/20'}`}>
                        <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{log.id}</td>
                        <td className="px-4 py-3"><ActionBadge action={log.action} /></td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-medium bg-muted px-2 py-0.5 rounded-md text-foreground">
                            {TABLE_LABELS[log.table] ?? log.table}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {log.transactionType ? (
                            <span className="text-xs px-2 py-0.5 rounded-full border border-border bg-card text-foreground">{log.transactionType}</span>
                          ) : <span className="text-xs text-muted-foreground/40">—</span>}
                        </td>
                        <td className="px-4 py-3 max-w-[170px]">
                          {log.equipmentNames && log.equipmentNames.length > 0 ? (
                            <div className="space-y-0.5">
                              <p className="text-xs text-foreground truncate">{log.equipmentNames[0]}</p>
                              {log.equipmentNames.length > 1 && (
                                <p className="text-xs text-primary">+{log.equipmentNames.length - 1} آخر</p>
                              )}
                            </div>
                          ) : <span className="text-xs text-muted-foreground/40">—</span>}
                        </td>
                        <td className="px-4 py-3 text-xs text-foreground max-w-[140px] truncate">{log.counterparty ?? <span className="text-muted-foreground/40">—</span>}</td>
                        <td className="px-4 py-3 text-xs text-foreground max-w-[120px] truncate">{log.assignedTo ?? <span className="text-muted-foreground/40">—</span>}</td>
                        <td className="px-4 py-3">
                          <p className="text-xs font-medium text-foreground">{log.user?.name ?? '—'}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[130px]">{log.user?.email ?? ''}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap font-mono">
                          {new Date(log.createdAt).toLocaleString('en-GB')}
                        </td>
                        <td className="px-2 py-3 text-center">
                          <button
                            onClick={() => setActiveLogDetails(log)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
                            title="عرض التفاصيل"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Mobile cards ────────────────────────────────────────── */}
          <div className="sm:hidden space-y-2">
            {logsLoading ? (
              <div className="h-32 flex items-center justify-center rounded-xl border border-border bg-card">
                <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : displayedLogs.length === 0 ? (
              <div className="h-32 flex items-center justify-center rounded-xl border border-border bg-card text-sm text-muted-foreground">
                لا توجد سجلات
              </div>
            ) : displayedLogs.map(log => (
              <div
                key={log.id}
                className="rounded-xl border border-border bg-card p-4 space-y-2 cursor-pointer hover:border-primary/40 transition-colors"
                onClick={() => setActiveLogDetails(log)}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ActionBadge action={log.action} />
                    <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-md">{TABLE_LABELS[log.table] ?? log.table}</span>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">{new Date(log.createdAt).toLocaleDateString('en-GB')}</span>
                </div>
                {log.equipmentNames?.[0] && <p className="text-xs font-medium text-foreground">{log.equipmentNames[0]}</p>}
                {log.counterparty && <p className="text-xs text-muted-foreground">{log.counterparty}</p>}
                <p className="text-xs text-muted-foreground">{log.user?.name ?? log.user?.email ?? '—'}</p>
              </div>
            ))}
          </div>

          {/* ── Pagination ──────────────────────────────────────────── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage <= 1}
                className="p-2 rounded-lg border border-border hover:bg-muted transition-colors text-muted-foreground disabled:opacity-40 text-xs px-3"
              >الأولى</button>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="p-2 rounded-lg border border-border hover:bg-muted transition-colors text-muted-foreground disabled:opacity-40"
              ><ChevronRight className="w-4 h-4" /></button>
              <span className="text-sm text-muted-foreground">
                الصفحة <strong className="text-foreground">{currentPage}</strong> من <strong className="text-foreground">{totalPages}</strong>
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="p-2 rounded-lg border border-border hover:bg-muted transition-colors text-muted-foreground disabled:opacity-40"
              ><ChevronLeft className="w-4 h-4" /></button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage >= totalPages}
                className="p-2 rounded-lg border border-border hover:bg-muted transition-colors text-muted-foreground disabled:opacity-40 text-xs px-3"
              >الأخيرة</button>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          TAB 3  —  التقارير المالية  (Financial Reports)
      ════════════════════════════════════════════════════════════ */}
      {activeTab === 'financial' && (
        <div className="space-y-5 pt-2">

          {/* Financial KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="إجمالي الاعتمادات الفعّالة"
              value={`${totalBudgetAmt.toLocaleString('ar-DZ')} د.ت`}
              sub={`${activeBudgets.length} اعتماد`}
              icon={<Layers className="w-5 h-5 text-blue-600" />}
              accent="bg-blue-100"
            />
            <KpiCard
              label="إجمالي المصروف"
              value={`${totalSpent.toLocaleString('ar-DZ')} د.ت`}
              sub={`${budgetUtilPct.toFixed(1)}% من المجموع`}
              icon={<ArrowUpFromLine className="w-5 h-5 text-orange-600" />}
              accent="bg-orange-100"
            />
            <KpiCard
              label="الرصيد المتبقي"
              value={`${(totalBudgetAmt - totalSpent).toLocaleString('ar-DZ')} د.ت`}
              sub="للاعتمادات الفعّالة"
              icon={<ArrowDownToLine className="w-5 h-5 text-green-600" />}
              accent="bg-green-100"
            />
            <KpiCard
              label="اعتمادات قريبة الاستهلاك"
              value={activeBudgets.filter(b => {
                return b.amount > 0 && (b.spent ?? 0) / b.amount >= 0.7
              }).length}
              sub="استهلاك ≥ 70%"
              icon={<AlertTriangle className="w-5 h-5 text-yellow-600" />}
              accent="bg-yellow-100"
            />
          </div>

          {/* Budget vs Spent comparison bar chart */}
          {activeBudgets.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">
                مقارنة الاعتماد المرصود مقابل المصروف الفعلي
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={activeBudgets.map(b => ({
                    name: b.name.length > 16 ? b.name.slice(0, 14) + '…' : b.name,
                    الاعتماد: b.amount,
                    المصروف: b.spent ?? 0,
                  }))}
                  margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip
                    {...TooltipStyle}
                    formatter={(v: any) => [`${Number(v).toLocaleString('ar-DZ')} د.ت`]}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }} />
                  <Bar dataKey="الاعتماد"  fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="المصروف" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Budget detail cards */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">
              تفصيل الاعتمادات المالية
              <span className="mr-2 text-xs font-normal text-muted-foreground">({budgets.length} اعتماد)</span>
            </h3>
            {budgets.length === 0 ? (
              <div className="rounded-xl border border-border bg-card h-40 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <DollarSign className="w-8 h-8 opacity-40" />
                <p className="text-sm">لا يوجد اعتمادات مالية</p>
              </div>
            ) : (
              <div className="space-y-3">
                {budgets.map(b => <BudgetBar key={b.id} budget={b} />)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          TAB 4  —  التقرير الشهري  (Monthly Report)
      ════════════════════════════════════════════════════════════ */}
      {activeTab === 'monthly' && (
        <div className="space-y-5 pt-2">

          {/* Month / year picker */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              اختيار فترة التقرير
            </h3>
            <div className="flex flex-wrap gap-3 items-end">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">الشهر</label>
                <select
                  value={reportMonth}
                  onChange={e => setReportMonth(Number(e.target.value))}
                  className="text-sm border border-border rounded-lg px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {AR_MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">السنة</label>
                <select
                  value={reportYear}
                  onChange={e => setReportYear(Number(e.target.value))}
                  className="text-sm border border-border rounded-lg px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {[now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Report body */}
          {reportLoading ? (
            <div className="h-40 flex items-center justify-center rounded-xl border border-border bg-card">
              <div className="flex items-center gap-3 text-muted-foreground">
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span className="text-sm">جاري توليد التقرير…</span>
              </div>
            </div>
          ) : reportData ? (
            <>
              {/* Report header card */}
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-bold text-foreground">
                      تقرير {reportData.monthName} {reportData.year}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {reportData.totalRows} سجل خلال هذه الفترة
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={handleMonthlyExcel}
                      disabled={exportingExcel}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      {exportingExcel ? 'جاري التصدير…' : 'تصدير Excel'}
                    </button>
                    <button
                      onClick={handleMonthlyPDF}
                      disabled={exportingPDF}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      <Download className="w-4 h-4" />
                      {exportingPDF ? 'جاري التصدير…' : 'تصدير PDF'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Summary mini-cards */}
              {reportData.summary && Object.keys(reportData.summary).length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {Object.entries(reportData.summary as Record<string, number>).map(([action, count]) => (
                    <div key={action} className="rounded-xl border border-border bg-card p-4 text-center">
                      <p className="text-2xl font-bold text-foreground">{count}</p>
                      <p className="text-xs text-muted-foreground mt-1">{ACTION_LABELS[action] ?? action}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Daily distribution chart */}
              {reportData.logs?.length > 0 && (() => {
                const dayMap: Record<number, number> = {}
                reportData.logs.forEach((l: Log) => {
                  const d = new Date(l.createdAt).getDate()
                  dayMap[d] = (dayMap[d] ?? 0) + 1
                })
                const chartData = Object.entries(dayMap)
                  .sort((a, b) => Number(a[0]) - Number(b[0]))
                  .map(([d, c]) => ({ day: d, count: c }))
                return (
                  <div className="rounded-xl border border-border bg-card p-5">
                    <h3 className="text-sm font-semibold text-foreground mb-4">
                      توزيع العمليات على أيام {reportData.monthName}
                    </h3>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                        <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                        <Tooltip {...TooltipStyle} formatter={(v: any) => [v, 'عدد العمليات']} />
                        <Bar dataKey="count" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )
              })()}

              {/* Desktop table */}
              <div className="hidden sm:block rounded-xl border border-border bg-card overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      {['#','الإجراء','الوحدة','التجهيز','الجهة','المكلف','المستخدم','التاريخ'].map((h, i) => (
                        <th key={i} className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {reportData.logs.map((log: Log) => (
                      <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{log.id}</td>
                        <td className="px-4 py-3"><ActionBadge action={log.action} /></td>
                        <td className="px-4 py-3 text-xs text-foreground">{TABLE_LABELS[log.table] ?? log.table}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground max-w-[140px] truncate">
                          {log.equipmentNames?.slice(0, 2).join('، ') ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-foreground max-w-[120px] truncate">{log.counterparty ?? '—'}</td>
                        <td className="px-4 py-3 text-xs text-foreground max-w-[110px] truncate">{log.assignedTo ?? '—'}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{log.user?.name ?? log.user?.email ?? '—'}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground font-mono whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString('en-GB')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="sm:hidden space-y-2">
                {reportData.logs.map((log: Log) => (
                  <div key={log.id} className="rounded-xl border border-border bg-card p-4 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <ActionBadge action={log.action} />
                      <span className="text-xs text-muted-foreground font-mono">
                        {new Date(log.createdAt).toLocaleDateString('en-GB')}
                      </span>
                    </div>
                    <p className="text-xs text-foreground">
                      {TABLE_LABELS[log.table] ?? log.table}
                      {log.equipmentNames?.[0] ? ` — ${log.equipmentNames[0]}` : ''}
                    </p>
                    {log.counterparty && <p className="text-xs text-muted-foreground">{log.counterparty}</p>}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-32 flex items-center justify-center rounded-xl border border-border bg-card text-sm text-muted-foreground">
              اختر الشهر والسنة لعرض التقرير
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          TAB 5  —  جرد التجهيزات  (Inventory)
      ════════════════════════════════════════════════════════════ */}
      {activeTab === 'inventory' && (() => {
        const inventory: any[] = Array.isArray(inventoryRaw) ? inventoryRaw : []

        // ── derived KPIs ──────────────────────────────────────────────────────
        const kpiTotalItems   = inventory.length
        const kpiTotalStock   = inventory.reduce((s: number, it: any) => s + it.currentStock, 0)
        const kpiTotalRecvd   = inventory.reduce((s: number, it: any) => s + it.totalReceived, 0)
        const kpiTotalDistrib = inventory.reduce((s: number, it: any) => s + it.totalDistributed, 0)
        const kpiLowStock     = inventory.filter((it: any) => it.lowStockThreshold != null && it.currentStock <= it.lowStockThreshold && it.currentStock > 0).length
        const kpiOutOfStock   = inventory.filter((it: any) => it.currentStock === 0).length

        // ── unique categories & reference types for filter dropdowns ──────────
        const allCategories = Array.from(new Set(inventory.map((it: any) => it.category).filter(Boolean))).sort() as string[]
        const allRefTypes   = Array.from(new Set(
          inventory.flatMap((it: any) => [
            ...it.receptions.map((r: any) => r.referenceType),
            ...it.distributions.map((d: any) => d.referenceType),
          ]).filter(Boolean)
        )).sort() as string[]

        // ── client-side filtering ─────────────────────────────────────────────
        const filtered = inventory.filter((it: any) => {
          if (invSearch) {
            const q = invSearch.toLowerCase()
            if (!it.name.toLowerCase().includes(q) && !it.sku.toLowerCase().includes(q) && !(it.category ?? '').toLowerCase().includes(q)) return false
          }
          if (invCategory && it.category !== invCategory) return false
          if (invRefType) {
            const hasRef = it.receptions.some((r: any) => r.referenceType === invRefType) ||
                           it.distributions.some((d: any) => d.referenceType === invRefType)
            if (!hasRef) return false
          }
          if (invStockStatus === 'low' && !(it.lowStockThreshold != null && it.currentStock <= it.lowStockThreshold && it.currentStock > 0)) return false
          if (invStockStatus === 'out' && it.currentStock !== 0) return false
          if (invStockStatus === 'normal' && (it.currentStock === 0 || (it.lowStockThreshold != null && it.currentStock <= it.lowStockThreshold))) return false
          return true
        })

        const stockBadge = (it: any) => {
          if (it.currentStock === 0) return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200"><AlertTriangle className="w-3 h-3" />نفذ المخزون</span>
          if (it.lowStockThreshold != null && it.currentStock <= it.lowStockThreshold) return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 border border-yellow-200"><TrendingDown className="w-3 h-3" />مخزون منخفض</span>
          return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200"><CheckCircle2 className="w-3 h-3" />طبيعي</span>
        }

        // ── XLSX export ───────────────────────────────────────────────────────
        const handleInvXLSX = async () => {
          setInvExportingXL(true)
          try {
            const XLSX = await import('xlsx')
            const wb = XLSX.utils.book_new()

            // Sheet 1: summary
            const summaryRows = filtered.map((it: any) => ({
              'الاسم':             it.name,
              'الرمز (SKU)':       it.sku,
              'الفئة':             it.category ?? '—',
              'إجمالي المستلم':    it.totalReceived,
              'إجمالي الموزع':     it.totalDistributed,
              'الرصيد الحالي':     it.currentStock,
              'حد التنبيه':        it.lowStockThreshold ?? '—',
              'الحالة':            it.currentStock === 0 ? 'نفذ المخزون' : (it.lowStockThreshold != null && it.currentStock <= it.lowStockThreshold ? 'منخفض' : 'طبيعي'),
            }))
            const ws1 = XLSX.utils.json_to_sheet(summaryRows)
            ws1['!cols'] = [{ wch: 28 }, { wch: 14 }, { wch: 18 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 12 }, { wch: 14 }]
            XLSX.utils.book_append_sheet(wb, ws1, 'ملخص الجرد')

            // Sheet 2: reception movements
            const recvRows: any[] = []
            filtered.forEach((it: any) => {
              it.receptions.forEach((r: any) => recvRows.push({
                'التجهيز':         it.name,
                'الرمز':           it.sku,
                'الفئة':           it.category ?? '—',
                'نوع المرجع':      r.referenceType ?? '—',
                'رقم المرجع':      r.referenceNumber ?? '—',
                'تاريخ المرجع':    r.referenceDate ? new Date(r.referenceDate).toLocaleDateString('en-GB') : '—',
                'الكمية المستلمة': r.quantity,
                'الرقم الإداري':   r.adminNumber ?? '—',
                'المورد':          r.supplierName ?? '—',
                'تاريخ الاستلام':  new Date(r.createdAt).toLocaleDateString('en-GB'),
              }))
            })
            const ws2 = XLSX.utils.json_to_sheet(recvRows)
            ws2['!cols'] = [{ wch: 28 }, { wch: 14 }, { wch: 18 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 16 }, { wch: 25 }, { wch: 18 }]
            XLSX.utils.book_append_sheet(wb, ws2, 'حركات الاستلام')

            // Sheet 3: distribution movements
            const distRows: any[] = []
            filtered.forEach((it: any) => {
              it.distributions.forEach((d: any) => distRows.push({
                'التجهيز':         it.name,
                'الرمز':           it.sku,
                'الفئة':           it.category ?? '—',
                'نوع المرجع':      d.referenceType ?? '—',
                'رقم المرجع':      d.referenceNumber ?? '—',
                'تاريخ المرجع':    d.referenceDate ? new Date(d.referenceDate).toLocaleDateString('en-GB') : '—',
                'الكمية الموزعة':  d.quantity,
                'الرقم الإداري':   d.adminNumber ?? '—',
                'الجهة المنتفعة':  d.beneficiaryName ?? '—',
                'المكلف بالسحب':   d.assignedTo ?? '—',
                'تاريخ التوزيع':   new Date(d.createdAt).toLocaleDateString('en-GB'),
              }))
            })
            const ws3 = XLSX.utils.json_to_sheet(distRows)
            ws3['!cols'] = [{ wch: 28 }, { wch: 14 }, { wch: 18 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 16 }, { wch: 25 }, { wch: 22 }, { wch: 18 }]
            XLSX.utils.book_append_sheet(wb, ws3, 'حركات التوزيع')

            const dateStr = new Date().toISOString().slice(0, 10)
            XLSX.writeFile(wb, `جرد-التجهيزات-${dateStr}.xlsx`)
          } finally { setInvExportingXL(false) }
        }

        // ── PDF export (html2canvas → jsPDF for correct Arabic rendering) ─────
        const handleInvPDF = async () => {
          setInvExportingPDF(true)
          try {
            const { jsPDF }   = await import('jspdf')
            const html2canvas  = await import('html2canvas')

            const dateLabel = [
              invDateFrom ? `من: ${invDateFrom}` : '',
              invDateTo   ? `إلى: ${invDateTo}`  : '',
            ].filter(Boolean).join('   |   ')

            const statusColor = (it: any) =>
              it.currentStock === 0 ? '#dc2626'
              : (it.lowStockThreshold != null && it.currentStock <= it.lowStockThreshold ? '#ca8a04' : '#16a34a')
            const statusLabel = (it: any) =>
              it.currentStock === 0 ? 'نفذ المخزون'
              : (it.lowStockThreshold != null && it.currentStock <= it.lowStockThreshold ? 'مخزون منخفض' : 'طبيعي')

            const container = document.createElement('div')
            container.style.cssText = 'direction:rtl;font-family:Tahoma,Arial,sans-serif;background:#fff;padding:24px;width:1400px;color:#0f172a;'
            container.innerHTML = `
              <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px;">
                <div>
                  <p style="margin:0;font-size:22px;font-weight:700;color:#0f172a;">جرد التجهيزات</p>
                  <p style="margin:4px 0 0;font-size:11px;color:#64748b;">تاريخ الإصدار: ${new Date().toLocaleDateString('en-GB')}${dateLabel ? '   |   ' + dateLabel : ''}</p>
                </div>
                <div style="text-align:left;font-size:11px;color:#64748b;">
                  <p style="margin:0;">عدد الأصناف: <strong style="color:#0f172a;">${filtered.length}</strong></p>
                  <p style="margin:2px 0 0;">إجمالي الرصيد: <strong style="color:#0f172a;">${filtered.reduce((s: number, it: any) => s + it.currentStock, 0).toLocaleString('ar-DZ')}</strong></p>
                </div>
              </div>
              <table style="width:100%;border-collapse:collapse;font-size:11px;">
                <thead>
                  <tr style="background:#0f172a;color:#fff;">
                    <th style="padding:8px 10px;text-align:center;border:1px solid #1e293b;">#</th>
                    <th style="padding:8px 10px;text-align:right;border:1px solid #1e293b;">اسم التجهيز</th>
                    <th style="padding:8px 10px;text-align:center;border:1px solid #1e293b;">الفئة</th>
                    <th style="padding:8px 10px;text-align:center;border:1px solid #1e293b;">عمليات الدخل</th>
                    <th style="padding:8px 10px;text-align:center;border:1px solid #1e293b;">إجمالي المستلم</th>
                    <th style="padding:8px 10px;text-align:center;border:1px solid #1e293b;">عمليات الخرج</th>
                    <th style="padding:8px 10px;text-align:center;border:1px solid #1e293b;">إجمالي الموزع</th>
                    <th style="padding:8px 10px;text-align:center;border:1px solid #1e293b;">الرصيد الحالي</th>
                    <th style="padding:8px 10px;text-align:center;border:1px solid #1e293b;">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  ${filtered.map((it: any, idx: number) => `
                    <tr style="background:${idx % 2 === 0 ? '#fff' : '#f8fafc'};">
                      <td style="padding:7px 10px;text-align:center;border:1px solid #e2e8f0;color:#64748b;">${idx + 1}</td>
                      <td style="padding:7px 10px;text-align:right;border:1px solid #e2e8f0;font-weight:600;">${it.name}</td>
                      <td style="padding:7px 10px;text-align:center;border:1px solid #e2e8f0;color:#475569;">${it.category ?? '—'}</td>
                      <td style="padding:7px 10px;text-align:center;border:1px solid #e2e8f0;color:#2563eb;font-weight:600;">${it.receptions.length}</td>
                      <td style="padding:7px 10px;text-align:center;border:1px solid #e2e8f0;color:#16a34a;font-weight:700;">${it.totalReceived.toLocaleString()}</td>
                      <td style="padding:7px 10px;text-align:center;border:1px solid #e2e8f0;color:#7c3aed;font-weight:600;">${it.distributions.length}</td>
                      <td style="padding:7px 10px;text-align:center;border:1px solid #e2e8f0;color:#ea580c;font-weight:700;">${it.totalDistributed.toLocaleString()}</td>
                      <td style="padding:7px 10px;text-align:center;border:1px solid #e2e8f0;font-weight:700;color:${statusColor(it)};">${it.currentStock.toLocaleString()}</td>
                      <td style="padding:7px 10px;text-align:center;border:1px solid #e2e8f0;">
                        <span style="display:inline-block;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:600;
                          background:${it.currentStock === 0 ? '#fee2e2' : (it.lowStockThreshold != null && it.currentStock <= it.lowStockThreshold ? '#fef9c3' : '#dcfce7')};
                          color:${statusColor(it)};">${statusLabel(it)}</span>
                      </td>
                    </tr>`).join('')}
                </tbody>
              </table>
              <div style="margin-top:16px;border-top:1px solid #e2e8f0;padding-top:10px;display:flex;gap:32px;font-size:11px;color:#64748b;">
                <span>إجمالي المستلم: <strong style="color:#16a34a;">${filtered.reduce((s: number, it: any) => s + it.totalReceived, 0).toLocaleString('ar-DZ')}</strong></span>
                <span>إجمالي الموزع: <strong style="color:#ea580c;">${filtered.reduce((s: number, it: any) => s + it.totalDistributed, 0).toLocaleString('ar-DZ')}</strong></span>
                <span>الرصيد الإجمالي: <strong style="color:#0f172a;">${filtered.reduce((s: number, it: any) => s + it.currentStock, 0).toLocaleString('ar-DZ')}</strong></span>
              </div>`

            document.body.appendChild(container)
            try {
              const canvas  = await html2canvas.default(container, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false })
              const imgData = canvas.toDataURL('image/png')
              const pw = 297, iw = pw - 10, ih = (canvas.height * iw) / canvas.width
              const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
              doc.addImage(imgData, 'PNG', 5, 5, iw, ih)
              let rem = ih - 200; let page = 1
              while (rem > 10) { doc.addPage(); doc.addImage(imgData, 'PNG', 5, -(page * 200) + 5, iw, ih); rem -= 200; page++ }
              const dateStr = new Date().toISOString().slice(0, 10)
              doc.save(`جرد-التجهيزات-${dateStr}.pdf`)
            } finally { container.remove() }
          } finally { setInvExportingPDF(false) }
        }

        return (
          <div className="space-y-6 pt-2" key="inventory-tab">

            {/* ── KPI row ────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: 'أصناف التجهيزات',   value: kpiTotalItems.toLocaleString('ar-DZ'),   icon: <Package className="w-5 h-5 text-blue-600" />,   accent: 'bg-blue-100' },
                { label: 'الرصيد الإجمالي',   value: kpiTotalStock.toLocaleString('ar-DZ'),   icon: <Warehouse className="w-5 h-5 text-violet-600" />, accent: 'bg-violet-100' },
                { label: 'إجمالي المستلم',    value: kpiTotalRecvd.toLocaleString('ar-DZ'),   icon: <ArrowDownToLine className="w-5 h-5 text-green-600" />,  accent: 'bg-green-100' },
                { label: 'إجمالي الموزع',     value: kpiTotalDistrib.toLocaleString('ar-DZ'), icon: <ArrowUpFromLine className="w-5 h-5 text-orange-600" />, accent: 'bg-orange-100' },
                { label: 'مخزون منخفض',       value: kpiLowStock.toLocaleString('ar-DZ'),     icon: <TrendingDown className="w-5 h-5 text-yellow-600" />, accent: 'bg-yellow-100' },
                { label: 'نفذ المخزون',        value: kpiOutOfStock.toLocaleString('ar-DZ'),  icon: <AlertTriangle className="w-5 h-5 text-red-600" />,    accent: 'bg-red-100' },
              ].map((k, i) => (
                <div key={i} className="rounded-xl border border-border bg-card p-4 flex items-center gap-3 shadow-sm">
                  <div className={`p-2.5 rounded-xl shrink-0 ${k.accent}`}>{k.icon}</div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground font-medium leading-tight">{k.label}</p>
                    <p className="text-xl font-bold text-foreground mt-0.5">{k.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Toolbar ────────────────────────────────────────────── */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    value={invSearch}
                    onChange={e => setInvSearch(e.target.value)}
                    placeholder="ابحث باسم التجهيز، الرمز، الفئة…"
                    className="w-full pr-9 pl-3 py-2 rounded-lg border border-border bg-card text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <button
                  onClick={() => setInvShowFilters(v => !v)}
                  className={`flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg border transition-colors ${
                    invShowFilters ? 'bg-primary text-primary-foreground border-primary' : 'border-border bg-card text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  فلاتر
                  {(invCategory || invStockStatus !== 'all' || invRefType || invDateFrom || invDateTo) && (
                    <span className="w-2 h-2 rounded-full bg-yellow-400" />
                  )}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleInvXLSX}
                  disabled={invExportingXL || filtered.length === 0}
                  className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  {invExportingXL ? 'جارٍ التصدير…' : 'Excel'}
                </button>
                <button
                  onClick={handleInvPDF}
                  disabled={invExportingPDF || filtered.length === 0}
                  className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                >
                  <FileText className="w-4 h-4" />
                  {invExportingPDF ? 'جارٍ التصدير…' : 'PDF'}
                </button>
              </div>
            </div>

            {/* ── Filters panel ──────────────────────────────────────── */}
            {invShowFilters && (
              <div className="rounded-xl border border-border bg-muted/40 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">الفئة</label>
                  <select
                    value={invCategory}
                    onChange={e => setInvCategory(e.target.value)}
                    className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="">كل الفئات</option>
                    {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">نوع المرجع</label>
                  <select
                    value={invRefType}
                    onChange={e => setInvRefType(e.target.value)}
                    className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="">كل أنواع المرجع</option>
                    {allRefTypes.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">حالة المخزون</label>
                  <select
                    value={invStockStatus}
                    onChange={e => setInvStockStatus(e.target.value)}
                    className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="all">الكل</option>
                    <option value="normal">طبيعي</option>
                    <option value="low">مخزون منخفض</option>
                    <option value="out">نفذ المخزون</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">من تاريخ</label>
                  <input
                    type="date"
                    value={invDateFrom}
                    onChange={e => setInvDateFrom(e.target.value)}
                    className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">إلى تاريخ</label>
                  <input
                    type="date"
                    value={invDateTo}
                    onChange={e => setInvDateTo(e.target.value)}
                    className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                {(invCategory || invStockStatus !== 'all' || invRefType || invDateFrom || invDateTo) && (
                  <button
                    onClick={() => { setInvCategory(''); setInvStockStatus('all'); setInvRefType(''); setInvDateFrom(''); setInvDateTo('') }}
                    className="lg:col-span-5 sm:col-span-2 text-xs text-primary hover:underline text-right"
                  >
                    مسح الفلاتر ×
                  </button>
                )}
              </div>
            )}

            {/* ── Table ──────────────────────────────────────────────── */}
            {inventoryLoading ? (
              <div className="h-48 flex items-center justify-center rounded-xl border border-border bg-card">
                <RefreshCw className="w-6 h-6 text-muted-foreground animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center rounded-xl border border-border bg-card gap-2">
                <PackageSearch className="w-10 h-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">لا توجد نتائج تطابق الفلاتر المختارة</p>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      {['', '#', 'اسم التجهيز', 'الفئة', 'عمليات الدخل', 'مجموع المستلم', 'عمليات الخرج', 'مجموع الموزع', 'الرصيد الحالي', 'الحالة'].map((h, i) => (
                        <th key={i} className="text-right px-3 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map((it: any, idx: number) => {
                      const isExpanded = invExpandedId === it.id
                      return (
                        <React.Fragment key={it.id}>
                          <tr
                            className={`transition-colors cursor-pointer ${
                              isExpanded ? 'bg-primary/5' : 'hover:bg-muted/40'
                            }`}
                            onClick={() => setInvExpandedId(isExpanded ? null : it.id)}
                          >
                            <td className="px-3 py-3 text-muted-foreground">
                              {isExpanded
                                ? <ChevronUp className="w-4 h-4" />
                                : <ChevronDown className="w-4 h-4" />}
                            </td>
                            <td className="px-3 py-3 text-xs text-muted-foreground font-mono">{idx + 1}</td>
                            <td className="px-3 py-3 font-semibold text-foreground">{it.name}</td>
                            <td className="px-3 py-3 text-xs text-muted-foreground">
                              {it.category
                                ? <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border text-xs">{it.category}</span>
                                : '—'}
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span className="text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">{it.receptions.length}</span>
                            </td>
                            <td className="px-3 py-3">
                              <span className="flex items-center gap-1 text-sm font-bold text-green-700">
                                <ArrowDownToLine className="w-3.5 h-3.5" />{it.totalReceived.toLocaleString('ar-DZ')}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span className="text-xs font-semibold text-purple-600 bg-purple-50 border border-purple-100 px-2 py-0.5 rounded-full">{it.distributions.length}</span>
                            </td>
                            <td className="px-3 py-3">
                              <span className="flex items-center gap-1 text-sm font-bold text-orange-700">
                                <ArrowUpFromLine className="w-3.5 h-3.5" />{it.totalDistributed.toLocaleString('ar-DZ')}
                              </span>
                            </td>
                            <td className="px-3 py-3">
                              <span className={`text-sm font-bold ${
                                it.currentStock === 0 ? 'text-red-600'
                                : (it.lowStockThreshold != null && it.currentStock <= it.lowStockThreshold ? 'text-yellow-600' : 'text-foreground')
                              }`}>{it.currentStock.toLocaleString('ar-DZ')}</span>
                            </td>
                            <td className="px-3 py-3">{stockBadge(it)}</td>
                          </tr>

                          {/* ── Expanded detail row ───────────────── */}
                          {isExpanded && (
                            <tr className="bg-muted/20">
                              <td colSpan={10} className="px-4 py-4">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                                  {/* Receptions sub-table */}
                                  <div>
                                    <div className="flex items-center gap-2 mb-2">
                                      <ArrowDownToLine className="w-4 h-4 text-green-600" />
                                      <span className="text-xs font-semibold text-foreground">حركات الاستلام (دخل)</span>
                                      <span className="text-xs text-muted-foreground ml-1">({it.receptions.length} عملية)</span>
                                    </div>
                                    {it.receptions.length === 0 ? (
                                      <p className="text-xs text-muted-foreground italic">لا توجد عمليات استلام</p>
                                    ) : (
                                      <div className="rounded-lg border border-border overflow-hidden">
                                        <table className="w-full text-xs">
                                          <thead>
                                            <tr className="bg-green-50 border-b border-green-100">
                                              {['نوع المرجع', 'رقم المرجع', 'تاريخ المرجع', 'الكمية', 'الرقم الإداري', 'المورد', 'تاريخ الإضافة'].map((h, i) => (
                                                <th key={i} className="text-right px-2 py-1.5 font-semibold text-green-800 whitespace-nowrap">{h}</th>
                                              ))}
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-border">
                                            {it.receptions.map((r: any, ri: number) => (
                                              <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-green-50/30'}>
                                                <td className="px-2 py-1.5">{r.referenceType ?? '—'}</td>
                                                <td className="px-2 py-1.5 font-mono">{r.referenceNumber ?? '—'}</td>
                                                <td className="px-2 py-1.5 whitespace-nowrap">{r.referenceDate ? new Date(r.referenceDate).toLocaleDateString('en-GB') : '—'}</td>
                                                <td className="px-2 py-1.5 font-bold text-green-700">{r.quantity}</td>
                                                <td className="px-2 py-1.5">{r.adminNumber ?? '—'}</td>
                                                <td className="px-2 py-1.5">{r.supplierName ?? '—'}</td>
                                                <td className="px-2 py-1.5 whitespace-nowrap">{new Date(r.createdAt).toLocaleDateString('en-GB')}</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}
                                  </div>

                                  {/* Distributions sub-table */}
                                  <div>
                                    <div className="flex items-center gap-2 mb-2">
                                      <ArrowUpFromLine className="w-4 h-4 text-orange-600" />
                                      <span className="text-xs font-semibold text-foreground">حركات التوزيع (خرج)</span>
                                      <span className="text-xs text-muted-foreground ml-1">({it.distributions.length} عملية)</span>
                                    </div>
                                    {it.distributions.length === 0 ? (
                                      <p className="text-xs text-muted-foreground italic">لا توجد عمليات توزيع</p>
                                    ) : (
                                      <div className="rounded-lg border border-border overflow-hidden">
                                        <table className="w-full text-xs">
                                          <thead>
                                            <tr className="bg-orange-50 border-b border-orange-100">
                                              {['نوع المرجع', 'رقم المرجع', 'تاريخ المرجع', 'الكمية', 'الرقم الإداري', 'الجهة المنتفعة', 'المكلف', 'تاريخ التوزيع'].map((h, i) => (
                                                <th key={i} className="text-right px-2 py-1.5 font-semibold text-orange-800 whitespace-nowrap">{h}</th>
                                              ))}
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-border">
                                            {it.distributions.map((d: any, di: number) => (
                                              <tr key={di} className={di % 2 === 0 ? 'bg-white' : 'bg-orange-50/30'}>
                                                <td className="px-2 py-1.5">{d.referenceType ?? '—'}</td>
                                                <td className="px-2 py-1.5 font-mono">{d.referenceNumber ?? '—'}</td>
                                                <td className="px-2 py-1.5 whitespace-nowrap">{d.referenceDate ? new Date(d.referenceDate).toLocaleDateString('en-GB') : '—'}</td>
                                                <td className="px-2 py-1.5 font-bold text-orange-700">{d.quantity}</td>
                                                <td className="px-2 py-1.5">{d.adminNumber ?? '—'}</td>
                                                <td className="px-2 py-1.5">{d.beneficiaryName ?? '—'}</td>
                                                <td className="px-2 py-1.5">{d.assignedTo ?? '—'}</td>
                                                <td className="px-2 py-1.5 whitespace-nowrap">{new Date(d.createdAt).toLocaleDateString('en-GB')}</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}
                                  </div>

                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      )
                    })}
                  </tbody>
                </table>

                {/* ── Summary footer ─────────────────────────────── */}
                <div className="border-t border-border bg-muted/30 px-4 py-3 flex flex-wrap gap-6 text-xs text-muted-foreground">
                  <span>عدد الأصناف المعروضة: <strong className="text-foreground">{filtered.length}</strong></span>
                  <span>إجمالي الرصيد الحالي: <strong className="text-foreground">{filtered.reduce((s: number, it: any) => s + it.currentStock, 0).toLocaleString('ar-DZ')}</strong></span>
                  <span>إجمالي المستلم: <strong className="text-green-700">{filtered.reduce((s: number, it: any) => s + it.totalReceived, 0).toLocaleString('ar-DZ')}</strong></span>
                  <span>إجمالي الموزع: <strong className="text-orange-700">{filtered.reduce((s: number, it: any) => s + it.totalDistributed, 0).toLocaleString('ar-DZ')}</strong></span>
                </div>
              </div>
            )}
          </div>
        )
      })()}

      {/* Log details modal */}
      {activeLogDetails && (
        <LogDetailsModal log={activeLogDetails} onClose={() => setActiveLogDetails(null)} />
      )}
    </div>
  )
}
