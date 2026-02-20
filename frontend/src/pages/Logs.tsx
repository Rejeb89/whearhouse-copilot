import React, { useState, useMemo, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import client from '../api/client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area, LineChart, Line,
} from 'recharts'
import {
  FileText, BarChart3, PieChart as PieIcon, Download, FileSpreadsheet,
  Calendar, Filter, RefreshCw, Search, TrendingUp, Activity,
  Clock, ChevronLeft, ChevronRight, AlertCircle, X,
  Users, Award, Zap, CalendarDays, ArrowUpRight, Hash,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Constants ────────────────────────────────────────────────────────────────

const AR_MONTHS = [
  'يناير','فبراير','مارس','أبريل','مايو','يونيو',
  'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر',
]

const ACTION_COLORS: Record<string, string> = {
  CREATE: '#22c55e',
  UPDATE: '#f59e0b',
  DELETE: '#ef4444',
  LOGIN:  '#3b82f6',
  LOGOUT: '#8b5cf6',
}
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
  Reception: 'استقبالات',
  Distribution: 'توزيعات',
  Entity: 'جهات',
  Employee: 'موظفون',
}

// ─── API helpers ──────────────────────────────────────────────────────────────

const fetchLogs = (params: Record<string, string>) =>
  client.get('/logs', { params }).then((r) => r.data)

const fetchStats = (year: number) =>
  client.get('/logs/stats', { params: { year } }).then((r) => r.data.data)

const fetchMeta = () =>
  client.get('/logs/meta').then((r) => r.data.data)

const fetchMonthlyReport = (year: number, month: number) =>
  client.get('/logs/monthly-report', { params: { year, month } }).then((r) => r.data.data)

// ─── Export helpers (client-side) ────────────────────────────────────────────

async function exportExcel(logs: Log[], filename: string) {
  const XLSX = await import('xlsx')
  const rows = logs.map((l) => ({
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
    { wch: 6 },   // #
    { wch: 12 },  // الإجراء
    { wch: 14 },  // نوع المعاملة
    { wch: 12 },  // الجدول
    { wch: 20 },  // اسم التجهيز
    { wch: 10 },  // رقم السجل
    { wch: 25 },  // الجهة
    { wch: 18 },  // المكلف بالسحب
    { wch: 20 },  // المستخدم
    { wch: 22 },  // التاريخ والوقت
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
  const { jsPDF } = await import('jspdf')
  const html2canvas = await import('html2canvas')
  
  const container = document.createElement('div')
  container.style.direction = 'rtl'
  container.style.fontFamily = "'Cairo', 'Tahoma', sans-serif"
  container.style.background = '#ffffff'
  container.style.padding = '20px'
  container.style.width = '1400px'
  container.style.color = '#0f172a'
  container.innerHTML = `
    <div>
      <div style="display:flex; justify-content:space-between; align-items:center; gap:20px; margin-bottom:20px;">
        <div>
          <p style="margin:0; font-size:24px; font-weight:700;">${title}</p>
          <p style="margin:4px 0 0; font-size:12px; color:#475569;">تم توليد التقرير: ${new Date().toLocaleString('en-GB')}</p>
        </div>
        <div style="text-align:left; font-size:12px; color:#475569; min-width:100px;">
          <p style="margin:0;"><strong>${logs.length}</strong> سجل</p>
        </div>
      </div>
      <div style="margin-bottom:20px; border-top:1px solid #e2e8f0; padding-top:16px;">
        ${summary && Object.keys(summary).length > 0 ? `
          <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(120px,1fr)); gap:12px;">
            ${Object.entries(summary).map(([action, count]) => `
              <div style="border:1px solid #e5e7eb; border-radius:8px; padding:10px; background:#f8fafc; text-align:center;">
                <p style="margin:0; font-size:11px; color:#475569; font-weight:600;">${ACTION_LABELS[action] ?? action}</p>
                <p style="margin-top:4px; font-size:18px; font-weight:700; color:#0f172a;">${count}</p>
              </div>
            `).join('')}
          </div>
        ` : '<p style="margin:0; font-size:12px; color:#94a3b8;">لا يوجد ملخص متاح</p>'}
      </div>
      <div style="margin-top:20px; overflow-x:auto;">
        <table style="width:100%; border-collapse:collapse; font-size:10px; border:1px solid #cbd5f5;">
          <thead>
            <tr style="background:#f3f4f6; border-bottom:2px solid #cbd5f5;">
              <th style="padding:6px 4px; text-align:right; border-right:1px solid #e5e7eb;">#</th>
              <th style="padding:6px 4px; text-align:right; border-right:1px solid #e5e7eb;">الإجراء</th>
              <th style="padding:6px 4px; text-align:right; border-right:1px solid #e5e7eb;">النوع</th>
              <th style="padding:6px 4px; text-align:right; border-right:1px solid #e5e7eb;">التجهيز</th>
              <th style="padding:6px 4px; text-align:right; border-right:1px solid #e5e7eb;">الجدول</th>
              <th style="padding:6px 4px; text-align:right; border-right:1px solid #e5e7eb;">الجهة</th>
              <th style="padding:6px 4px; text-align:right; border-right:1px solid #e5e7eb;">المكلف</th>
              <th style="padding:6px 4px; text-align:right; border-right:1px solid #e5e7eb;">المستخدم</th>
              <th style="padding:6px 4px; text-align:right;">التاريخ</th>
            </tr>
          </thead>
          <tbody>
            ${logs.map((l, idx) => `
              <tr style="border-bottom:1px solid #e2e8f0; background:${idx % 2 === 0 ? '#ffffff' : '#f9fafb'};">
                <td style="padding:6px 4px; text-align:right; border-right:1px solid #e5e7eb;">${l.id}</td>
                <td style="padding:6px 4px; text-align:right; font-weight:600; border-right:1px solid #e5e7eb;">${ACTION_LABELS[l.action] ?? l.action}</td>
                <td style="padding:6px 4px; text-align:right; border-right:1px solid #e5e7eb;">${l.transactionType ?? '—'}</td>
                <td style="padding:6px 4px; text-align:right; border-right:1px solid #e5e7eb;">${l.equipmentNames?.slice(0, 1).join('، ') ?? '—'}</td>
                <td style="padding:6px 4px; text-align:right; border-right:1px solid #e5e7eb;">${TABLE_LABELS[l.table] ?? l.table}</td>
                <td style="padding:6px 4px; text-align:right; border-right:1px solid #e5e7eb; max-width:120px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${l.counterparty ?? '—'}</td>
                <td style="padding:6px 4px; text-align:right; border-right:1px solid #e5e7eb;">${l.assignedTo ?? '—'}</td>
                <td style="padding:6px 4px; text-align:right; border-right:1px solid #e5e7eb;">${l.user?.name ?? l.user?.email ?? '—'}</td>
                <td style="padding:6px 4px; text-align:right;">${new Date(l.createdAt).toLocaleString('en-GB')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `
  
  document.body.appendChild(container)
  
  try {
    const canvas = await html2canvas.default(container, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      allowTaint: true,
      logging: false,
    })
    
    const imgData = canvas.toDataURL('image/png')
    const pdfWidth = 297 // A4 landscape width in mm
    const pdfHeight = 210 // A4 landscape height in mm
    const imgWidth = pdfWidth - 10
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    })
    
    let yPosition = 5
    const pageHeight = pdfHeight - 10
    let remainingHeight = imgHeight
    
    doc.addImage(imgData, 'PNG', 5, yPosition, imgWidth, imgHeight)
    
    // Add new pages if content is too long
    let currentPage = 1
    while (remainingHeight > pageHeight) {
      doc.addPage()
      remainingHeight -= pageHeight
      doc.addImage(imgData, 'PNG', 5, -currentPage * pageHeight + 5, imgWidth, imgHeight)
      currentPage += 1
    }
    
    doc.save(filename)
  } finally {
    container.remove()
  }
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, color }: { label: string; value: number | string; icon: React.ReactNode; color: string }) {
  return (
    <div className={`rounded-xl border p-5 ${color} flex items-center gap-4 shadow-sm`}>
      <div className="p-3 rounded-full bg-white/60">{icon}</div>
      <div>
        <p className="text-xs font-medium opacity-70">{label}</p>
        <p className="text-3xl font-bold">{value}</p>
      </div>
    </div>
  )
}

// ─── Action badge ─────────────────────────────────────────────────────────────

function ActionBadge({ action }: { action: string }) {
  const colors: Record<string, string> = {
    CREATE: 'bg-green-100 text-green-700 border-green-200',
    UPDATE: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    DELETE: 'bg-red-100 text-red-700 border-red-200',
    LOGIN:  'bg-blue-100 text-blue-700 border-blue-200',
    LOGOUT: 'bg-purple-100 text-purple-700 border-purple-200',
  }
  return (
    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full border ${colors[action] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>
      {ACTION_LABELS[action] ?? action}
    </span>
  )
}

function LogDetailsModal({ log, onClose }: { log: Log; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white text-right shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between bg-slate-900 px-6 py-4 text-white">
          <div>
            <p className="text-sm font-semibold">تفاصيل السجل #{log.id}</p>
            <p className="text-xs opacity-80">{new Date(log.createdAt).toLocaleString('en-GB')}</p>
          </div>
          <button onClick={onClose} className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-4 px-6 py-6">
          <div>
            <p className="text-xs text-slate-500">الإجراء</p>
            <p className="text-lg font-semibold text-slate-900 mt-0.5">{ACTION_LABELS[log.action] ?? log.action}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">الجدول</p>
            <p className="text-lg font-semibold text-slate-900 mt-0.5">{TABLE_LABELS[log.table] ?? log.table}</p>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm text-slate-500">
            <div>
              <p className="text-xs">نوع المعاملة</p>
              <p className="text-base text-slate-800">{log.transactionType ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs">اسم التجهيز</p>
              <p className="text-base text-slate-800">{log.equipmentNames?.join('، ') ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs">الجهة</p>
              <p className="text-base text-slate-800">{log.counterparty ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs">المكلف بالسحب</p>
              <p className="text-base text-slate-800">{log.assignedTo ?? '—'}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-500">رقم السجل</p>
              <p className="text-base font-semibold text-slate-700 mt-0.5">{log.recordId ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">المستخدم</p>
              <p className="text-base font-semibold text-slate-700 mt-0.5">{log.user?.name ?? log.user?.email ?? '—'}</p>
            </div>
          </div>
          <div>
            <p className="text-xs text-slate-500">الوقت</p>
            <p className="text-lg font-semibold text-slate-700 mt-0.5">{new Date(log.createdAt).toLocaleString('en-GB')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

type ActiveTab = 'logs' | 'stats' | 'reports'

export default function Logs() {
  const now = new Date()
  const [activeTab, setActiveTab]       = useState<ActiveTab>('logs')
  const [statsYear, setStatsYear]       = useState(now.getFullYear())
  const [reportYear, setReportYear]     = useState(now.getFullYear())
  const [reportMonth, setReportMonth]   = useState(now.getMonth() + 1)
  const [exportingExcel, setExportingExcel] = useState(false)
  const [exportingPDF, setExportingPDF]     = useState(false)
  const [activeLogDetails, setActiveLogDetails] = useState<Log | null>(null)

  // ── Logs filter state
  const [filterAction, setFilterAction]   = useState('')
  const [filterTable, setFilterTable]     = useState('')
  const [filterFrom, setFilterFrom]       = useState('')
  const [filterTo, setFilterTo]           = useState('')
  const [filterSearch, setFilterSearch]   = useState('')
  const [currentPage, setCurrentPage]     = useState(1)
  const PAGE_SIZE = 50

  // ── Build query params
  const logsParams = useMemo(() => {
    const p: Record<string, string> = { limit: String(PAGE_SIZE), page: String(currentPage) }
    if (filterAction) p.action = filterAction
    if (filterTable)  p.table  = filterTable
    if (filterFrom)   p.from   = filterFrom
    if (filterTo)     p.to     = filterTo
    return p
  }, [filterAction, filterTable, filterFrom, filterTo, currentPage])

  // ── Queries
  const { data: logsData, isLoading: logsLoading, refetch: refetchLogs } =
    useQuery(['logs', logsParams], () => fetchLogs(logsParams), { keepPreviousData: true })

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } =
    useQuery(['logs-stats', statsYear], () => fetchStats(statsYear))

  const { data: meta } = useQuery(['logs-meta'], fetchMeta, { staleTime: 60000 })

  const { data: reportData, isLoading: reportLoading } =
    useQuery(
      ['logs-report', reportYear, reportMonth],
      () => fetchMonthlyReport(reportYear, reportMonth),
      { enabled: activeTab === 'reports', staleTime: 30000 },
    )

  const logs: Log[]    = logsData?.data ?? []
  const logsMeta       = logsData?.meta ?? { total: 0, page: 1 }
  const totalPages     = Math.ceil((logsMeta.total ?? 0) / PAGE_SIZE)

  // ── Client-side search filter (on top of server filter)
  const displayedLogs = useMemo(() => {
    if (!filterSearch.trim()) return logs
    const q = filterSearch.toLowerCase()
    return logs.filter(
      (l) =>
        l.action.toLowerCase().includes(q) ||
        l.table.toLowerCase().includes(q)  ||
        String(l.recordId ?? '').includes(q) ||
        (l.user?.email ?? '').toLowerCase().includes(q) ||
        (l.user?.name  ?? '').toLowerCase().includes(q) ||
        (l.transactionType ?? '').toLowerCase().includes(q) ||
        (l.equipmentNames?.join(', ') ?? '').toLowerCase().includes(q) ||
        (l.counterparty ?? '').toLowerCase().includes(q) ||
        (l.assignedTo ?? '').toLowerCase().includes(q),
    )
  }, [logs, filterSearch])

  // ── Reset page when filters change
  const applyFilter = useCallback(() => setCurrentPage(1), [])
  const openLogDetails = useCallback((log: Log) => setActiveLogDetails(log), [])

  // ── Export current logs page to Excel
  const handleExcelCurrent = async () => {
    setExportingExcel(true)
    try { await exportExcel(displayedLogs, `logs-page-${currentPage}.xlsx`) }
    finally { setExportingExcel(false) }
  }

  // ── Export monthly report
  const handleMonthlyExcel = async () => {
    if (!reportData) return
    setExportingExcel(true)
    try {
      await exportExcel(
        reportData.logs,
        `تقرير-${reportData.monthName}-${reportData.year}.xlsx`,
      )
    } finally { setExportingExcel(false) }
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

  const tabs = [
    { key: 'logs'    as ActiveTab, label: 'السجلات',         icon: <FileText    className="w-4 h-4" /> },
    { key: 'stats'   as ActiveTab, label: 'الإحصائيات',      icon: <BarChart3   className="w-4 h-4" /> },
    { key: 'reports' as ActiveTab, label: 'التقارير الشهرية', icon: <Calendar    className="w-4 h-4" /> },
  ]

  return (
    <div dir="rtl" className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-gray-500">تتبع ومراقبة</p>
          <h1 className="text-3xl font-bold text-gray-800">سجلات النشاط والتقارير</h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === t.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ══════════════ LOGS TAB ═══════════════════════════════════════════ */}
      {activeTab === 'logs' && (
        <div className="space-y-5">
          {/* Filter bar */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <div className="flex flex-wrap gap-3 items-end">
              {/* Search */}
              <div className="relative flex-1 min-w-48">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  value={filterSearch}
                  onChange={(e) => setFilterSearch(e.target.value)}
                  placeholder="بحث سريع..."
                  className="w-full rounded-lg border border-slate-300 pr-9 pl-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {/* Action filter */}
              <select
                value={filterAction}
                onChange={(e) => { setFilterAction(e.target.value); applyFilter() }}
                className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-36"
              >
                <option value="">جميع الإجراءات</option>
                {(meta?.actions ?? []).map((a: string) => (
                  <option key={a} value={a}>{ACTION_LABELS[a] ?? a}</option>
                ))}
              </select>
              {/* Table filter */}
              <select
                value={filterTable}
                onChange={(e) => { setFilterTable(e.target.value); applyFilter() }}
                className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-36"
              >
                <option value="">جميع الجداول</option>
                {(meta?.tables ?? []).map((t: string) => (
                  <option key={t} value={t}>{TABLE_LABELS[t] ?? t}</option>
                ))}
              </select>
              {/* Date range */}
              <input
                type="date"
                value={filterFrom}
                onChange={(e) => { setFilterFrom(e.target.value); applyFilter() }}
                className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                title="من تاريخ"
              />
              <input
                type="date"
                value={filterTo}
                onChange={(e) => { setFilterTo(e.target.value); applyFilter() }}
                className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                title="إلى تاريخ"
              />
              {/* Reset */}
              <button
                onClick={() => {
                  setFilterAction(''); setFilterTable(''); setFilterFrom(''); setFilterTo(''); setFilterSearch(''); setCurrentPage(1)
                }}
                className="p-2.5 rounded-lg border border-slate-300 text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                title="مسح الفلاتر"
              >
                <Filter className="w-4 h-4" />
              </button>
              {/* Refresh */}
              <button
                onClick={() => refetchLogs()}
                className="p-2.5 rounded-lg border border-slate-300 text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                title="تحديث"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              {/* Export current page to Excel */}
              <button
                onClick={handleExcelCurrent}
                disabled={exportingExcel || displayedLogs.length === 0}
                className="flex items-center gap-2 bg-green-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4" />
                {exportingExcel ? 'جارٍ التصدير...' : 'تصدير Excel'}
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase">
                    <th className="text-right px-4 py-3.5 font-semibold">#</th>
                    <th className="text-right px-4 py-3.5 font-semibold">الإجراء</th>
                    <th className="text-right px-4 py-3.5 font-semibold">نوع المعاملة</th>
                    <th className="text-right px-4 py-3.5 font-semibold">الجدول</th>
                    <th className="text-right px-4 py-3.5 font-semibold">اسم التجهيز</th>
                    <th className="text-right px-4 py-3.5 font-semibold">رقم السجل</th>
                    <th className="text-right px-4 py-3.5 font-semibold">الجهة</th>
                    <th className="text-right px-4 py-3.5 font-semibold">المكلف بالسحب</th>
                    <th className="text-right px-4 py-3.5 font-semibold">المستخدم</th>
                    <th className="text-right px-4 py-3.5 font-semibold">التاريخ والوقت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logsLoading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                        جارٍ التحميل...
                      </td>
                    </tr>
                  ) : displayedLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        لا توجد سجلات مطابقة
                      </td>
                    </tr>
                  ) : (
                    displayedLogs.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 text-slate-400 text-xs">{l.id}</td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => openLogDetails(l)}
                              type="button"
                              className="transition hover:ring-1 hover:ring-blue-300 rounded-full px-2 py-1"
                            >
                              <ActionBadge action={l.action} />
                            </button>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">
                            {l.transactionType ?? '—'}
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-700">
                            {TABLE_LABELS[l.table] ?? l.table}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {l.equipmentNames?.slice(0, 2).join('، ') ?? '—'}
                            {l.equipmentNames && l.equipmentNames.length > 2 && (
                              <span className="text-[11px] text-slate-400"> (+{l.equipmentNames.length - 2})</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-500">{l.recordId ?? '—'}</td>
                          <td className="px-4 py-3 text-slate-500 text-xs">
                            {l.counterparty ?? '—'}
                          </td>
                          <td className="px-4 py-3 text-slate-500 text-xs">
                            {l.assignedTo ?? '—'}
                          </td>
                          <td className="px-4 py-3 text-slate-500 text-xs">
                            {l.user?.name ?? l.user?.email ?? '—'}
                          </td>
                          <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(l.createdAt).toLocaleString('en-GB')}
                            </span>
                          </td>
                        </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50 text-sm text-slate-600">
                <span>إجمالي {logsMeta.total} سجل</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    className="p-1.5 rounded border border-slate-300 disabled:opacity-40 hover:bg-slate-100"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <span>صفحة {currentPage} من {totalPages}</span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className="p-1.5 rounded border border-slate-300 disabled:opacity-40 hover:bg-slate-100"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════ STATS TAB ══════════════════════════════════════════ */}
      {activeTab === 'stats' && (
        <div className="space-y-6">
          {/* Year selector */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setStatsYear((y) => y - 1)}
              className="p-2 rounded-lg border border-slate-300 hover:bg-slate-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <span className="text-lg font-bold text-slate-800 min-w-16 text-center">{statsYear}</span>
            <button
              onClick={() => setStatsYear((y) => Math.min(y + 1, now.getFullYear()))}
              className="p-2 rounded-lg border border-slate-300 hover:bg-slate-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => refetchStats()}
              className="p-2 rounded-lg border border-slate-300 text-slate-500 hover:bg-slate-50"
            >
              <RefreshCw className={`w-4 h-4 ${statsLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Summary cards */}
          {stats && (
            <>
              {/* ── 6 KPI Cards ── */}
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <StatCard
                  label="إجمالي السجلات"
                  value={stats.totalLogs.toLocaleString('en-US')}
                  icon={<FileText className="w-5 h-5 text-blue-700" />}
                  color="bg-gradient-to-br from-blue-50 to-blue-100 text-blue-800 border-blue-200"
                />
                <StatCard
                  label="هذا الشهر"
                  value={stats.totalThisMonth.toLocaleString('en-US')}
                  icon={<TrendingUp className="w-5 h-5 text-green-700" />}
                  color="bg-gradient-to-br from-green-50 to-green-100 text-green-800 border-green-200"
                />
                <StatCard
                  label="أكثر إجراء"
                  value={stats.byAction[0]?.action ? (ACTION_LABELS[stats.byAction[0].action] ?? stats.byAction[0].action) : '—'}
                  icon={<Activity className="w-5 h-5 text-amber-700" />}
                  color="bg-gradient-to-br from-amber-50 to-amber-100 text-amber-800 border-amber-200"
                />
                <StatCard
                  label="أكثر جدول نشاطاً"
                  value={stats.byTable[0]?.table ? (TABLE_LABELS[stats.byTable[0].table] ?? stats.byTable[0].table) : '—'}
                  icon={<BarChart3 className="w-5 h-5 text-purple-700" />}
                  color="bg-gradient-to-br from-purple-50 to-purple-100 text-purple-800 border-purple-200"
                />
                <StatCard
                  label="أعلى شهر نشاطاً"
                  value={(() => {
                    const peak = stats.monthlyData?.reduce((a: any, b: any) => (b.count > a.count ? b : a), { count: 0, month: '—' })
                    return peak?.month ?? '—'
                  })()}
                  icon={<Award className="w-5 h-5 text-rose-700" />}
                  color="bg-gradient-to-br from-rose-50 to-rose-100 text-rose-800 border-rose-200"
                />
                <StatCard
                  label="متوسط يومي"
                  value={(stats.totalLogs / (() => { const n = new Date(); return statsYear === n.getFullYear() ? Math.ceil((n.getTime() - new Date(n.getFullYear(), 0, 0).getTime()) / 86400000) : 365 })()).toFixed(1)}
                  icon={<Zap className="w-5 h-5 text-cyan-700" />}
                  color="bg-gradient-to-br from-cyan-50 to-cyan-100 text-cyan-800 border-cyan-200"
                />
              </div>

              {/* Monthly bar chart */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <h2 className="text-base font-semibold text-slate-800 mb-5 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  توزيع الأنشطة شهرياً — {statsYear}
                </h2>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={stats.monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                      formatter={(v: any) => [`${v} سجل`, 'العدد']}
                    />
                    <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2.5} fill="url(#colorCount)" name="عدد السجلات" dot={{ r: 4, fill: '#3b82f6' }} activeDot={{ r: 6 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Action + Table pie charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                  <h2 className="text-base font-semibold text-slate-800 mb-5 flex items-center gap-2">
                    <PieIcon className="w-5 h-5 text-amber-500" />
                    توزيع حسب نوع الإجراء
                  </h2>
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie
                        data={stats.byAction}
                        dataKey="count"
                        nameKey="action"
                        cx="50%" cy="50%"
                        outerRadius={90}
                        label={({ action, percent }) =>
                          `${ACTION_LABELS[action] ?? action} ${(percent * 100).toFixed(0)}%`
                        }
                        labelLine={false}
                      >
                        {stats.byAction.map((entry: any, idx: number) => (
                          <Cell key={entry.action} fill={ACTION_COLORS[entry.action] ?? CHART_PALETTE[idx % CHART_PALETTE.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: any, name: any) => [v, ACTION_LABELS[name] ?? name]} />
                      <Legend formatter={(value) => ACTION_LABELS[value] ?? value} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                  <h2 className="text-base font-semibold text-slate-800 mb-5 flex items-center gap-2">
                    <PieIcon className="w-5 h-5 text-green-500" />
                    توزيع حسب الجدول
                  </h2>
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie
                        data={stats.byTable}
                        dataKey="count"
                        nameKey="table"
                        cx="50%" cy="50%"
                        outerRadius={90}
                        label={({ table, percent }) =>
                          `${TABLE_LABELS[table] ?? table} ${(percent * 100).toFixed(0)}%`
                        }
                        labelLine={false}
                      >
                        {stats.byTable.map((entry: any, idx: number) => (
                          <Cell key={entry.table} fill={CHART_PALETTE[idx % CHART_PALETTE.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: any, name: any) => [v, TABLE_LABELS[name] ?? name]} />
                      <Legend formatter={(value) => TABLE_LABELS[value] ?? value} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Tables + Actions breakdown side by side */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* By Table */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                  <h2 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <Hash className="w-5 h-5 text-slate-500" />
                    تفصيل حسب الجدول — {statsYear}
                  </h2>
                  <div className="space-y-3">
                    {stats.byTable.map((row: any, idx: number) => {
                      const total = stats.byTable.reduce((s: number, r: any) => s + r.count, 0)
                      const pct = total > 0 ? ((row.count / total) * 100).toFixed(1) : '0'
                      return (
                        <div key={row.table}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium text-slate-700">{TABLE_LABELS[row.table] ?? row.table}</span>
                            <span className="text-slate-500 font-semibold">{row.count.toLocaleString('en-US')} <span className="text-slate-400 font-normal">({pct}%)</span></span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2.5">
                            <div
                              className="h-2.5 rounded-full transition-all duration-500"
                              style={{ width: `${pct}%`, backgroundColor: CHART_PALETTE[idx % CHART_PALETTE.length] }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* By Action */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                  <h2 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-slate-500" />
                    تفصيل حسب نوع الإجراء — {statsYear}
                  </h2>
                  <div className="space-y-3">
                    {stats.byAction.map((row: any, idx: number) => {
                      const total = stats.byAction.reduce((s: number, r: any) => s + r.count, 0)
                      const pct = total > 0 ? ((row.count / total) * 100).toFixed(1) : '0'
                      return (
                        <div key={row.action}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium text-slate-700 flex items-center gap-2">
                              <ActionBadge action={row.action} />
                            </span>
                            <span className="text-slate-500 font-semibold">{row.count.toLocaleString('en-US')} <span className="text-slate-400 font-normal">({pct}%)</span></span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2.5">
                            <div
                              className="h-2.5 rounded-full transition-all duration-500"
                              style={{ width: `${pct}%`, backgroundColor: ACTION_COLORS[row.action] ?? CHART_PALETTE[idx % CHART_PALETTE.length] }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Monthly trend line chart */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <h2 className="text-base font-semibold text-slate-800 mb-5 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  منحنى النمو الشهري — {statsYear}
                </h2>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={stats.monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                      formatter={(v: any) => [`${v} سجل`, 'العدد']}
                    />
                    <Line type="monotone" dataKey="count" stroke="#22c55e" strokeWidth={2.5} dot={{ r: 5, fill: '#22c55e' }} activeDot={{ r: 7 }} name="عدد السجلات" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      )}

      {/* ══════════════ REPORTS TAB ════════════════════════════════════════ */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          {/* Month / year selector + download buttons */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-base font-semibold text-slate-800 mb-5 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              اختر الشهر لتوليد التقرير
            </h2>
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1.5 font-medium">الشهر</label>
                <select
                  value={reportMonth}
                  onChange={(e) => setReportMonth(Number(e.target.value))}
                  className="rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-36"
                >
                  {AR_MONTHS.map((m, i) => (
                    <option key={i} value={i + 1}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1.5 font-medium">السنة</label>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setReportYear((y) => y - 1)}
                    className="p-2 rounded-lg border border-slate-300 hover:bg-slate-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <span className="text-base font-bold min-w-14 text-center">{reportYear}</span>
                  <button
                    onClick={() => setReportYear((y) => Math.min(y + 1, now.getFullYear()))}
                    className="p-2 rounded-lg border border-slate-300 hover:bg-slate-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex gap-3 mr-auto">
                <button
                  onClick={handleMonthlyExcel}
                  disabled={!reportData || exportingExcel || reportLoading}
                  className="flex items-center gap-2 bg-green-600 text-white rounded-lg px-5 py-2.5 text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors shadow-sm"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  {exportingExcel ? 'جارٍ التصدير...' : 'تنزيل Excel'}
                </button>
                <button
                  onClick={handleMonthlyPDF}
                  disabled={!reportData || exportingPDF || reportLoading}
                  className="flex items-center gap-2 bg-red-600 text-white rounded-lg px-5 py-2.5 text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  {exportingPDF ? 'جارٍ التصدير...' : 'تنزيل PDF'}
                </button>
              </div>
            </div>
          </div>

          {reportLoading && (
            <div className="text-center py-16 text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3" />
              جارٍ تحميل بيانات {AR_MONTHS[reportMonth - 1]} {reportYear}...
            </div>
          )}

          {reportData && !reportLoading && (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 p-5 text-center">
                  <p className="text-xs text-blue-600 font-medium mb-1">إجمالي العمليات</p>
                  <p className="text-4xl font-bold text-blue-700">{reportData.totalRows}</p>
                  <p className="text-xs text-blue-500 mt-1">{reportData.monthName} {reportData.year}</p>
                </div>
                {Object.entries(reportData.summary as Record<string, number>)
                  .slice(0, 3)
                  .map(([action, count], idx) => (
                    <div
                      key={action}
                      className="rounded-xl border bg-white p-5 text-center shadow-sm"
                    >
                      <ActionBadge action={action} />
                      <p className="text-4xl font-bold text-slate-800 mt-2">{count as number}</p>
                      <p className="text-xs text-slate-400 mt-1">عملية</p>
                    </div>
                  ))}
              </div>

              {/* Operations breakdown chart */}
              {Object.keys(reportData.summary).length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                  <h2 className="text-base font-semibold text-slate-800 mb-5 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                    توزيع العمليات في {reportData.monthName} {reportData.year}
                  </h2>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart
                      data={Object.entries(reportData.summary).map(([action, count]) => ({
                        action: ACTION_LABELS[action] ?? action,
                        count,
                      }))}
                      margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="action" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]} name="العدد">
                        {Object.entries(reportData.summary).map(([action]: [string, any]) => (
                          <Cell key={action} fill={ACTION_COLORS[action] ?? '#3b82f6'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Deep analytics from logs */}
              {(() => {
                const logs: Log[] = reportData.logs

                // Top counterparties
                const cpMap: Record<string, number> = {}
                logs.forEach((l) => { if (l.counterparty) cpMap[l.counterparty] = (cpMap[l.counterparty] ?? 0) + 1 })
                const topCPs = Object.entries(cpMap).sort((a, b) => b[1] - a[1]).slice(0, 6)

                // Top items distributed
                const itemMap: Record<string, number> = {}
                logs.filter((l) => l.table === 'Distribution' && l.equipmentNames).forEach((l) => {
                  l.equipmentNames!.forEach((name) => { itemMap[name] = (itemMap[name] ?? 0) + 1 })
                })
                const topItems = Object.entries(itemMap).sort((a, b) => b[1] - a[1]).slice(0, 6)

                // Top active users
                const userMap: Record<string, number> = {}
                logs.forEach((l) => { const name = l.user?.name ?? l.user?.email; if (name) userMap[name] = (userMap[name] ?? 0) + 1 })
                const topUsers = Object.entries(userMap).sort((a, b) => b[1] - a[1]).slice(0, 5)

                // Daily activity map
                const dayMap: Record<string, number> = {}
                logs.forEach((l) => {
                  const day = new Date(l.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })
                  dayMap[day] = (dayMap[day] ?? 0) + 1
                })
                const dailyData = Object.entries(dayMap)
                  .map(([date, count]) => ({ date, count }))
                  .sort((a, b) => a.date.localeCompare(b.date))

                return (
                  <div className="space-y-6">
                    {/* Daily activity chart */}
                    {dailyData.length > 1 && (
                      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                        <h2 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
                          <CalendarDays className="w-5 h-5 text-indigo-600" />
                          النشاط اليومي — {reportData.monthName} {reportData.year}
                        </h2>
                        <ResponsiveContainer width="100%" height={200}>
                          <AreaChart data={dailyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                            <defs>
                              <linearGradient id="dailyGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="date" tick={{ fontSize: 9 }} interval={Math.floor(dailyData.length / 8)} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                            <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} formatter={(v: any) => [`${v} عملية`, 'اليوم']} />
                            <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} fill="url(#dailyGrad)" name="العمليات" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    {/* Top counterparties + top items */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {topCPs.length > 0 && (
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                          <h2 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
                            <Users className="w-4 h-4 text-blue-500" />
                            أكثر الجهات تعاملاً
                          </h2>
                          <div className="space-y-2.5">
                            {topCPs.map(([name, count], idx) => {
                              const max = topCPs[0][1]
                              return (
                                <div key={name}>
                                  <div className="flex justify-between text-xs mb-1">
                                    <span className="font-medium text-slate-700 truncate max-w-[70%]">{name}</span>
                                    <span className="text-slate-500 font-semibold">{count} عملية</span>
                                  </div>
                                  <div className="w-full bg-slate-100 rounded-full h-2">
                                    <div className="h-2 rounded-full bg-blue-500 transition-all" style={{ width: `${(count / max) * 100}%` }} />
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {topItems.length > 0 && (
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                          <h2 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
                            <ArrowUpRight className="w-4 h-4 text-green-500" />
                            أكثر التجهيزات صرفاً
                          </h2>
                          <div className="space-y-2.5">
                            {topItems.map(([name, count]) => {
                              const max = topItems[0][1]
                              return (
                                <div key={name}>
                                  <div className="flex justify-between text-xs mb-1">
                                    <span className="font-medium text-slate-700 truncate max-w-[70%]">{name}</span>
                                    <span className="text-slate-500 font-semibold">{count} سجل</span>
                                  </div>
                                  <div className="w-full bg-slate-100 rounded-full h-2">
                                    <div className="h-2 rounded-full bg-green-500 transition-all" style={{ width: `${(count / max) * 100}%` }} />
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Top active users in month */}
                    {topUsers.length > 0 && (
                      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                        <h2 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
                          <Award className="w-4 h-4 text-amber-500" />
                          أكثر المستخدمين نشاطاً في {reportData.monthName}
                        </h2>
                        <div className="divide-y divide-slate-100">
                          {topUsers.map(([name, count], idx) => (
                            <div key={name} className="flex items-center justify-between py-3">
                              <div className="flex items-center gap-3">
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                  idx === 0 ? 'bg-amber-100 text-amber-700' :
                                  idx === 1 ? 'bg-slate-200 text-slate-600' :
                                  idx === 2 ? 'bg-orange-100 text-orange-700' :
                                  'bg-slate-100 text-slate-500'
                                }`}>{idx + 1}</span>
                                <span className="text-sm font-medium text-slate-700">{name}</span>
                              </div>
                              <span className="text-sm font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">{count} عملية</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* Detailed log table preview */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b bg-slate-50 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700">
                    تفاصيل السجلات — {reportData.monthName} {reportData.year}
                    <span className="mr-2 text-xs text-slate-400">({reportData.totalRows} سجل)</span>
                  </span>
                </div>
                <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0">
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase">
                        <th className="text-right px-4 py-3 font-semibold">#</th>
                        <th className="text-right px-4 py-3 font-semibold">الإجراء</th>
                        <th className="text-right px-4 py-3 font-semibold">نوع المعاملة</th>
                        <th className="text-right px-4 py-3 font-semibold">الجدول</th>
                        <th className="text-right px-4 py-3 font-semibold">اسم التجهيز</th>
                        <th className="text-right px-4 py-3 font-semibold">رقم السجل</th>
                        <th className="text-right px-4 py-3 font-semibold">الجهة</th>
                        <th className="text-right px-4 py-3 font-semibold">المكلف بالسحب</th>
                        <th className="text-right px-4 py-3 font-semibold">المستخدم</th>
                        <th className="text-right px-4 py-3 font-semibold">التاريخ والوقت</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reportData.logs.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="py-10 text-center text-slate-400">
                            لا توجد سجلات في هذا الشهر
                          </td>
                        </tr>
                      ) : (
                        reportData.logs.map((l: Log) => (
                          <tr key={l.id} className="hover:bg-slate-50">
                            <td className="px-4 py-2.5 text-slate-400 text-xs">{l.id}</td>
                            <td className="px-4 py-2.5">
                              <button
                                type="button"
                                onClick={() => openLogDetails(l)}
                                className="transition hover:ring-1 hover:ring-blue-300 rounded-full px-2 py-1"
                              >
                                <ActionBadge action={l.action} />
                              </button>
                            </td>
                            <td className="px-4 py-2.5 text-xs text-slate-500">
                              {l.transactionType ?? '—'}
                            </td>
                            <td className="px-4 py-2.5 text-slate-700">{TABLE_LABELS[l.table] ?? l.table}</td>
                            <td className="px-4 py-2.5 text-slate-600">
                              {l.equipmentNames?.slice(0, 2).join('، ') ?? '—'}
                              {l.equipmentNames && l.equipmentNames.length > 2 && (
                                <span className="text-[11px] text-slate-400"> (+{l.equipmentNames.length - 2})</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-slate-500">{l.recordId ?? '—'}</td>
                            <td className="px-4 py-2.5 text-slate-500 text-xs">
                              {l.counterparty ?? '—'}
                            </td>
                            <td className="px-4 py-2.5 text-slate-500 text-xs">
                              {l.assignedTo ?? '—'}
                            </td>
                            <td className="px-4 py-2.5 text-slate-500 text-xs">
                              {l.user?.name ?? l.user?.email ?? '—'}
                            </td>
                            <td className="px-4 py-2.5 text-slate-400 text-xs whitespace-nowrap">
                              {new Date(l.createdAt).toLocaleString('en-GB')}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}
      {activeLogDetails && (
        <LogDetailsModal log={activeLogDetails} onClose={() => setActiveLogDetails(null)} />
      )}
    </div>
  )
}
