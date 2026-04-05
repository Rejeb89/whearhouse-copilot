import React, { useState, useMemo, useCallback, useContext, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AuthContext } from '../context/AuthContext'
import client from '../services/client'
import * as XLSX from 'xlsx'
import { ReceiptPrintTemplate, downloadPDF } from '../components/receipts'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import {
  Search, Shield, Users, Package, Car, Building2, Wallet, FileText, Truck,
  ArrowRight, RefreshCw, BarChart3, Eye, TrendingDown, X,
  Download, Printer, ChevronLeft, ExternalLink,
  ShoppingCart, Receipt, Paperclip, TrendingUp, CheckCircle2, AlertTriangle, Clock,
  DollarSign, Layers, ArrowDownToLine, ArrowUpFromLine, PackageSearch, Warehouse,
  Calendar, ShieldCheck, ChevronDown, ChevronUp, HardHat, Hammer, BookOpen, BadgePercent,
  Fuel as FuelIcon,
} from 'lucide-react'

/* ─── API helpers ─── */
const fetchUnits = async () => (await client.get('/monitoring/units')).data.data
const fetchUnitData = (unit: string, tab: string) => async () => {
  const encoded = encodeURIComponent(unit)
  return (await client.get(`/monitoring/units/${encoded}/${tab === 'overview' ? 'overview' : tab}`)).data.data
}

/* ─── Types ─── */
interface UnitSummary { securityUnit: string; users: number; items: number; vehicles: number; receptions: number; distributions: number; entities: number; budgets: number; projects: number }

/* ─── Constants ─── */
const TABS = [
  { key: 'overview',       label: 'نظرة عامة',      icon: <BarChart3 className="w-4 h-4" /> },
  { key: 'items',          label: 'التجهيزات',       icon: <Package className="w-4 h-4" /> },
  { key: 'vehicles',       label: 'الوسائل',         icon: <Car className="w-4 h-4" /> },
  { key: 'receptions',     label: 'الدخل اليومي',    icon: <Truck className="w-4 h-4" /> },
  { key: 'distributions',  label: 'الخرج اليومي',   icon: <ArrowRight className="w-4 h-4" /> },
  { key: 'entities',       label: 'الجهات',          icon: <Building2 className="w-4 h-4" /> },
  { key: 'projects',       label: 'المشاريع',        icon: <HardHat className="w-4 h-4" /> },
  { key: 'budgets',        label: 'الاعتمادات',      icon: <Wallet className="w-4 h-4" /> },
  { key: 'receipts',       label: 'وصولات التسليم',  icon: <Receipt className="w-4 h-4" /> },
  { key: 'logs',           label: 'السجلات',         icon: <FileText className="w-4 h-4" /> },
  { key: 'fuel',           label: 'المحروقات',       icon: <FuelIcon className="w-4 h-4" /> },
  { key: 'users',          label: 'المستخدمون',      icon: <Users className="w-4 h-4" /> },
]

const ROLE_META: Record<string, { label: string; color: string }> = {
  ADMIN:            { label: 'مدير النظام',    color: 'bg-red-100 text-red-700' },
  SECTION_CHIEF:    { label: 'رئيس قسم',      color: 'bg-blue-100 text-blue-700' },
  USER:             { label: 'مستخدم',         color: 'bg-gray-100 text-gray-700' },
  REGION_CHIEF:        { label: 'رئيس منطقة',  color: 'bg-purple-100 text-purple-700' },
  BATTALION_COMMANDER: { label: 'آمر فوج',      color: 'bg-teal-100 text-teal-700' },
  DISTRICT_MANAGER:    { label: 'مدير اقليم',   color: 'bg-orange-100 text-orange-700' },
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Export utilities                                                 */
/* ═══════════════════════════════════════════════════════════════════ */

function exportExcel(rows: Record<string, any>[], headers: { key: string; label: string }[], sheetName: string, fileName: string) {
  const data = rows.map(r => {
    const obj: any = {}
    headers.forEach(h => { obj[h.label] = r[h.key] ?? '—' })
    return obj
  })
  const ws = XLSX.utils.json_to_sheet(data)
  ws['!cols'] = headers.map(() => ({ wch: 22 }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, fileName)
}

async function exportPDF(
  unit: string,
  tabLabel: string,
  headers: string[],
  rows: string[][],
  filename: string,
  summaryHtml?: string,
) {
  const { jsPDF } = await import('jspdf')
  const html2canvas = await import('html2canvas')
  const el = document.createElement('div')
  el.style.cssText = "direction:rtl;font-family:'Cairo','Tahoma',sans-serif;background:#fff;padding:28px;width:1400px;color:#0f172a;position:absolute;left:-9999px;top:0;z-index:-1;"
  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:8px;border-bottom:3px solid #1e40af;padding-bottom:14px;">
      <div>
        <p style="margin:0;font-size:22px;font-weight:800;color:#1e3a5f;">تقرير ${tabLabel}</p>
        <p style="margin:4px 0 0;font-size:13px;color:#64748b;">الوحدة الأمنية: <strong style="color:#0f172a;">${unit}</strong></p>
        <p style="margin:2px 0 0;font-size:11px;color:#94a3b8;">تاريخ التقرير: ${new Date().toLocaleString('ar-TN', { dateStyle: 'full', timeStyle: 'short' })}</p>
      </div>
    </div>
    ${summaryHtml ? `<div style="margin-bottom:16px;">${summaryHtml}</div>` : ''}
    <table style="width:100%;border-collapse:collapse;font-size:11px;border:1px solid #cbd5e1;">
      <thead>
        <tr style="background:#1e40af;color:#fff;">
          ${headers.map(h => `<th style="padding:8px 6px;text-align:right;border-left:1px solid #3b82f6;font-weight:700;">${h}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${rows.map((row, i) => `
          <tr style="background:${i % 2 === 0 ? '#fff' : '#f8fafc'};border-bottom:1px solid #e2e8f0;">
            ${row.map(c => `<td style="padding:7px 6px;border-left:1px solid #e5e7eb;">${c}</td>`).join('')}
          </tr>`).join('')}
      </tbody>
    </table>
    <div style="margin-top:16px;text-align:center;">
      <p style="font-size:10px;color:#94a3b8;">— نهاية التقرير — إجمالي ${rows.length} سجل —</p>
    </div>`

  document.body.appendChild(el)
  try {
    const canvas = await html2canvas.default(el, { scale: 2, backgroundColor: '#fff', useCORS: true, logging: false })
    const imgData = canvas.toDataURL('image/png')
    const pw = 297; const iw = pw - 14; const ih = (canvas.height * iw) / canvas.width
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const pageH = 200
    let y = 0; let page = 0
    while (y < ih) {
      if (page > 0) doc.addPage()
      doc.addImage(imgData, 'PNG', 7, 7 - y, iw, ih)
      y += pageH; page++
    }
    doc.save(filename)
  } finally { el.remove() }
}

/* toolbar with export buttons */
function ExportBar({ unit, tabLabel, onExcel, onPDF, count }: { unit: string; tabLabel: string; onExcel: () => void; onPDF: () => void; count: number }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-muted-foreground">{count} سجل</span>
      <div className="flex-1" />
      <button onClick={onExcel} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-green-200 bg-green-50 text-green-700 hover:bg-green-100 transition-colors" title="تصدير Excel">
        <Download className="w-3.5 h-3.5" /> Excel
      </button>
      <button onClick={onPDF} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors" title="تصدير PDF">
        <Printer className="w-3.5 h-3.5" /> PDF
      </button>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Detail modal (generic)                                          */
/* ═══════════════════════════════════════════════════════════════════ */
function DetailModal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg border border-border max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border shrink-0">
          <h3 className="font-bold text-foreground text-sm">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted/60 text-muted-foreground"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 overflow-y-auto flex-1 space-y-3">{children}</div>
      </div>
    </div>
  )
}

function Field({ label, value, mono, ltr }: { label: string; value: React.ReactNode; mono?: boolean; ltr?: boolean }) {
  return (
    <div className="bg-muted/40 rounded-xl px-3.5 py-2.5">
      <p className="text-[11px] text-muted-foreground mb-0.5">{label}</p>
      {typeof value === 'string' || typeof value === 'number'
        ? <p className={`text-sm font-medium text-foreground ${mono ? 'font-mono' : ''}`} dir={ltr ? 'ltr' : undefined}>{value || '—'}</p>
        : value}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Main component                                                   */
/* ═══════════════════════════════════════════════════════════════════ */
export default function AdminMonitoring() {
  const { user } = useContext(AuthContext)
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  // REGION_CHIEF / BATTALION_COMMANDER go directly to their own unit — no list needed
  if (user?.role === 'REGION_CHIEF' || user?.role === 'BATTALION_COMMANDER') {
    return <UnitDetail unit={user.securityUnit ?? ''} onBack={undefined} />
  }

  if (selectedUnit) return <UnitDetail unit={selectedUnit} onBack={() => setSelectedUnit(null)} />
  return <UnitsList user={user} search={search} setSearch={setSearch} onSelect={setSelectedUnit} />
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Units List                                                       */
/* ═══════════════════════════════════════════════════════════════════ */
function UnitsList({ user, search, setSearch, onSelect }: { user: any; search: string; setSearch: (s: string) => void; onSelect: (u: string) => void }) {
  const { data: units = [], isLoading, refetch } = useQuery<UnitSummary[]>(['monitoring-units'], fetchUnits, { refetchInterval: 30000 })
  const [detailUnit, setDetailUnit] = useState<UnitSummary | null>(null)

  const filtered = useMemo(() => {
    if (!search.trim()) return units
    const q = search.trim().toLowerCase()
    return units.filter(u => u.securityUnit.toLowerCase().includes(q))
  }, [units, search])

  const totals = useMemo(() => ({
    items: units.reduce((s, u) => s + u.items, 0),
    vehicles: units.reduce((s, u) => s + u.vehicles, 0),
    users: units.reduce((s, u) => s + u.users, 0),
    ops: units.reduce((s, u) => s + u.receptions + u.distributions, 0),
  }), [units])

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-l from-red-600 via-rose-600 to-pink-700 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center gap-4">
          <div className="p-1 bg-white/15 rounded-xl backdrop-blur-sm"><img src="/logo.png" alt="شعار الحرس الوطني" className="w-12 h-12 object-contain drop-shadow-lg" /></div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">لوحة المراقبة المركزية</h1>
            <p className="text-sm text-white/75 mt-0.5">
              {user?.role === 'DISTRICT_MANAGER'
                ? `مدير اقليم — ${user.region ?? 'إقليم غير محدد'}`
                : 'مراقبة شاملة لجميع الوحدات الأمنية والعمليات'}
            </p>
          </div>
        </div>
        {!isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            {[
              { icon: <Shield className="w-5 h-5" />, v: units.length, l: 'وحدة أمنية' },
              { icon: <Package className="w-5 h-5" />, v: totals.items, l: 'تجهيز' },
              { icon: <Car className="w-5 h-5" />, v: totals.vehicles, l: 'وسيلة' },
              { icon: <Users className="w-5 h-5" />, v: totals.users, l: 'مستخدم' },
            ].map(s => (
              <div key={s.l} className="bg-white/10 backdrop-blur-sm rounded-xl p-3 flex items-center gap-3">
                <div className="p-1.5 bg-white/15 rounded-lg">{s.icon}</div>
                <div><p className="text-lg font-extrabold">{s.v}</p><p className="text-[11px] text-white/70">{s.l}</p></div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Search */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث عن وحدة أمنية..."
            className="w-full rounded-xl border border-input bg-background pr-10 pl-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring shadow-sm" />
        </div>
        <button onClick={() => refetch()} className="p-2.5 rounded-xl border border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors" title="تحديث">
          <RefreshCw className="w-4 h-4" />
        </button>
        <button onClick={() => {
          const headers = [{ key: 'securityUnit', label: 'الوحدة' }, { key: 'users', label: 'المستخدمون' }, { key: 'items', label: 'التجهيزات' }, { key: 'vehicles', label: 'الوسائل' }, { key: 'receptions', label: 'الدخل اليومي' }, { key: 'distributions', label: 'الخرج اليومي' }, { key: 'entities', label: 'الجهات' }, { key: 'budgets', label: 'الاعتمادات' }]
          exportExcel(units, headers, 'الوحدات', 'تقرير_الوحدات_الأمنية.xlsx')
        }} className="hidden inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium border border-green-200 bg-green-50 text-green-700 hover:bg-green-100 transition-colors" title="تصدير ملخص الوحدات">
          <Download className="w-4 h-4" /> ملخص Excel
        </button>
      </div>

      {/* Units grid */}
      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground"><RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />جارٍ التحميل...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground"><Shield className="w-10 h-10 mx-auto mb-2 opacity-30" />لا توجد وحدات مطابقة</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(unit => (
            <div key={unit.securityUnit} className="group bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/40 hover:shadow-xl transition-all duration-300">
              {/* card header — click to go to detail page */}
              <button onClick={() => onSelect(unit.securityUnit)} className="w-full text-right p-5 pb-3">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl text-white shadow-md"><Shield className="w-5 h-5" /></div>
                    <h3 className="font-bold text-foreground text-sm leading-tight">{unit.securityUnit}</h3>
                  </div>
                  <ChevronLeft className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:-translate-x-1 transition-all" />
                </div>
              </button>
              {/* stats row — click to see detail modal */}
              <div className="grid grid-cols-4 gap-px bg-border">
                {[
                  { icon: <Users className="w-3.5 h-3.5" />, v: unit.users, l: 'مستخدم', c: 'text-blue-600', bg: 'bg-blue-50' },
                  { icon: <Package className="w-3.5 h-3.5" />, v: unit.items, l: 'تجهيز', c: 'text-emerald-600', bg: 'bg-emerald-50' },
                  { icon: <HardHat className="w-3.5 h-3.5" />, v: unit.projects ?? 0, l: 'مشروع', c: 'text-orange-600', bg: 'bg-orange-50' },
                  { icon: <Truck className="w-3.5 h-3.5" />, v: unit.receptions + unit.distributions, l: 'عملية', c: 'text-purple-600', bg: 'bg-purple-50' },
                ].map(s => (
                  <button key={s.l} onClick={() => setDetailUnit(unit)} className={`${s.bg} flex flex-col items-center gap-0.5 py-3 hover:brightness-95 transition-all`}>
                    <span className={s.c}>{s.icon}</span>
                    <span className={`text-sm font-extrabold ${s.c}`}>{s.v}</span>
                    <span className="text-[10px] text-muted-foreground">{s.l}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick unit summary modal */}
      <DetailModal open={!!detailUnit} onClose={() => setDetailUnit(null)} title={detailUnit?.securityUnit ?? ''}>
        {detailUnit && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {[
                { l: 'المستخدمون', v: detailUnit.users }, { l: 'التجهيزات', v: detailUnit.items },
                { l: 'الوسائل', v: detailUnit.vehicles }, { l: 'الجهات', v: detailUnit.entities },
                { l: 'الدخل اليومي', v: detailUnit.receptions }, { l: 'الخرج اليومي', v: detailUnit.distributions },
                { l: 'الاعتمادات', v: detailUnit.budgets },
                { l: 'المشاريع', v: detailUnit.projects ?? 0 },
              ].map(s => <Field key={s.l} label={s.l} value={String(s.v)} />)}
            </div>
            <button onClick={() => { onSelect(detailUnit.securityUnit); setDetailUnit(null) }}
              className="w-full mt-2 flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-medium hover:bg-primary/90 transition-colors">
              <Eye className="w-4 h-4" /> فتح لوحة مراقبة الوحدة
            </button>
          </div>
        )}
      </DetailModal>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Unit Detail (tabs)                                              */
/* ═══════════════════════════════════════════════════════════════════ */
function UnitDetail({ unit, onBack }: { unit: string; onBack?: () => void }) {
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-l from-blue-600 via-indigo-600 to-violet-700 rounded-2xl p-5 text-white shadow-xl">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="p-2 rounded-xl bg-white/15 hover:bg-white/25 transition-colors"><ArrowRight className="w-5 h-5" /></button>
          )}
          <div className="p-1 bg-white/15 rounded-xl backdrop-blur-sm"><img src="/logo.png" alt="شعار الحرس الوطني" className="w-9 h-9 object-contain drop-shadow" /></div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-extrabold truncate">{unit}</h1>
            <p className="text-xs text-white/70">لوحة مراقبة الوحدة الأمنية</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-card border border-border rounded-xl p-1 flex gap-1 overflow-x-auto shadow-sm">
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              activeTab === tab.key ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}>
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        {activeTab === 'overview'      && <OverviewTab unit={unit} onNavigate={setActiveTab} />}
        {activeTab === 'items'         && <ItemsTab unit={unit} />}
        {activeTab === 'vehicles'      && <VehiclesTab unit={unit} />}
        {activeTab === 'receptions'    && <ReceptionsTab unit={unit} />}
        {activeTab === 'distributions' && <DistributionsTab unit={unit} />}
        {activeTab === 'entities'      && <EntitiesTab unit={unit} />}
        {activeTab === 'projects'      && <ProjectsTab unit={unit} />}
        {activeTab === 'budgets'       && <BudgetsTab unit={unit} />}
        {activeTab === 'receipts'      && <ReceiptsTab unit={unit} />}
        {activeTab === 'logs'          && <LogsTab unit={unit} />}
        {activeTab === 'fuel'          && <FuelTab unit={unit} />}
        {activeTab === 'users'         && <UsersTab unit={unit} />}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Overview Tab                                                     */
/* ═══════════════════════════════════════════════════════════════════ */
function OverviewTab({ unit, onNavigate }: { unit: string; onNavigate: (tab: string) => void }) {
  const { data, isLoading } = useQuery(['monitoring', unit, 'overview'], fetchUnitData(unit, 'overview'), { refetchInterval: 20000 })

  if (isLoading) return <LoadingBlock />
  if (!data) return <EmptyBlock message="لا توجد بيانات" />

  const stats = [
    { icon: <Package className="w-5 h-5" />, label: 'التجهيزات', value: data.items, color: 'from-blue-500 to-indigo-600', tab: 'items' },
    { icon: <Car className="w-5 h-5" />,     label: 'الوسائل',   value: data.vehicles, color: 'from-emerald-500 to-green-600', tab: 'vehicles' },
    { icon: <Truck className="w-5 h-5" />,   label: 'الدخل اليومي', value: data.receptions, color: 'from-cyan-500 to-teal-600', tab: 'receptions' },
    { icon: <ArrowRight className="w-5 h-5" />, label: 'الخرج اليومي', value: data.distributions, color: 'from-orange-500 to-amber-600', tab: 'distributions' },
    { icon: <Building2 className="w-5 h-5" />, label: 'الجهات', value: data.entities, color: 'from-purple-500 to-violet-600', tab: 'entities' },
    { icon: <HardHat className="w-5 h-5" />,    label: 'المشاريع', value: data.projects ?? 0, color: 'from-teal-500 to-cyan-600', tab: 'projects' },
    { icon: <Wallet className="w-5 h-5" />,    label: 'الاعتمادات', value: data.budgets, color: 'from-pink-500 to-rose-600', tab: 'budgets' },
    { icon: <Users className="w-5 h-5" />,     label: 'المستخدمون', value: data.users, color: 'from-amber-500 to-orange-600', tab: 'users' },
    { icon: <FileText className="w-5 h-5" />,  label: 'السجلات', value: data.logs, color: 'from-gray-500 to-slate-600', tab: 'logs' },
  ]

  const handleOverviewPDF = () => {
    const headers = ['القسم', 'العدد']
    const rows = stats.map(s => [s.label, String(s.value)])
    if (data.lowStockItems?.length) {
      rows.push(['', ''])
      rows.push(['--- التجهيزات الأقل كمية ---', ''])
      data.lowStockItems.forEach((it: any) => rows.push([it.name, String(it.quantity)]))
    }
    exportPDF(unit, 'نظرة عامة', headers, rows, `نظرة_عامة_${unit}.pdf`)
  }

  return (
    <div className="p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" /> إحصائيات الوحدة</h3>
        <button onClick={handleOverviewPDF} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors">
          <Printer className="w-3.5 h-3.5" /> تقرير PDF
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map(s => (
          <button key={s.label} onClick={() => onNavigate(s.tab)} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 hover:shadow-md hover:border-primary/30 hover:bg-primary/5 transition-all cursor-pointer text-right w-full">
            <div className={`p-2 bg-gradient-to-br ${s.color} rounded-lg text-white shrink-0`}>{s.icon}</div>
            <div><p className="text-xl font-extrabold text-foreground">{s.value}</p><p className="text-[11px] text-muted-foreground">{s.label}</p></div>
          </button>
        ))}
      </div>

      {/* ─── Financial Summary ─── */}
      {data.financialSummary && (data.financialSummary.activeBudgets?.length > 0) && (() => {
        const { totalBudget, totalSpent, activeBudgets: abuds } = data.financialSummary
        const totalRemaining = totalBudget - totalSpent
        const pct = totalBudget > 0 ? Math.min(100, Math.round((totalSpent / totalBudget) * 100)) : 0
        return (
          <div>
            <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-pink-500" /> ملخص التقارير المالية
            </h3>
            {/* totals row */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="bg-card border border-border rounded-xl p-3 text-center">
                <p className="text-[10px] text-muted-foreground mb-1">الميزانية الإجمالية</p>
                <p className="text-sm font-extrabold text-foreground">{numFmt(totalBudget)}</p>
              </div>
              <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 text-center">
                <p className="text-[10px] text-orange-600 mb-1">المصروف</p>
                <p className="text-sm font-extrabold text-orange-600">{numFmt(totalSpent)}</p>
              </div>
              <div className={`rounded-xl p-3 text-center border ${totalRemaining < 0 ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
                <p className={`text-[10px] mb-1 ${totalRemaining < 0 ? 'text-red-600' : 'text-green-600'}`}>المتبقي</p>
                <p className={`text-sm font-extrabold ${totalRemaining < 0 ? 'text-red-600' : 'text-green-600'}`}>{numFmt(totalRemaining)}</p>
              </div>
            </div>
            {/* overall progress bar */}
            <div className="mb-3">
              <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                <span>نسبة الاستهلاك الإجمالية</span>
                <span className="font-bold">{pct}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2.5">
                <div className={`h-2.5 rounded-full transition-all ${pct > 90 ? 'bg-red-500' : pct > 65 ? 'bg-orange-500' : 'bg-green-500'}`}
                  style={{ width: `${pct}%` }} />
              </div>
            </div>
            {/* per-budget rows */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="text-right px-3 py-2 font-bold text-muted-foreground">الاعتماد</th>
                    <th className="text-right px-3 py-2 font-bold text-muted-foreground">القسم</th>
                    <th className="text-center px-3 py-2 font-bold text-muted-foreground">المبلغ</th>
                    <th className="text-center px-3 py-2 font-bold text-muted-foreground">المصروف</th>
                    <th className="text-center px-3 py-2 font-bold text-muted-foreground">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {abuds.map((b: any) => {
                    const bpct = b.amount > 0 ? Math.min(100, Math.round((b.spent / b.amount) * 100)) : 0
                    return (
                      <tr key={b.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-3 py-2 font-medium text-foreground truncate max-w-[120px]">{b.name}</td>
                        <td className="px-3 py-2 text-muted-foreground">{b.department}</td>
                        <td className="px-3 py-2 text-center font-mono">{numFmt(b.amount)}</td>
                        <td className="px-3 py-2 text-center font-mono text-orange-600">{numFmt(b.spent)}</td>
                        <td className="px-3 py-2 text-center">
                          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${bpct > 90 ? 'bg-red-100 text-red-700' : bpct > 65 ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                            {bpct}%
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      })()}

      {/* ─── Recent Distributions ─── */}
      {data.recentDistributions?.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-orange-500" /> عمليات التسليم الأخيرة
            <span className="text-[10px] font-normal text-muted-foreground">آخر عمليات خرج التجهيزات</span>
          </h3>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm text-right">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="px-4 py-2.5 text-xs font-bold text-muted-foreground">اسم التجهيز</th>
                  <th className="px-4 py-2.5 text-xs font-bold text-muted-foreground">الجهة المستفيدة</th>
                  <th className="px-4 py-2.5 text-xs font-bold text-muted-foreground text-center">موزَّع</th>
                  <th className="px-4 py-2.5 text-xs font-bold text-muted-foreground text-center">متبقي</th>
                  <th className="px-4 py-2.5 text-xs font-bold text-muted-foreground">التاريخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.recentDistributions.flatMap((d: any) =>
                  d.items.map((di: any, idx: number) => (
                    <tr key={`${d.id}-${idx}`} className="hover:bg-muted/40 transition-colors">
                      <td className="px-4 py-2.5 font-medium text-foreground">{di.item?.name}</td>
                      <td className="px-4 py-2.5 text-muted-foreground text-xs">{d.beneficiary?.name || '—'}</td>
                      <td className="px-4 py-2.5 text-center">
                        <span className="inline-flex items-center rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">{di.quantity}</span>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
                          di.item?.quantity === 0 ? 'bg-destructive/10 text-destructive'
                          : di.item?.quantity < (di.item?.lowStockThreshold || 5) ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-secondary text-secondary-foreground'
                        }`}>{di.item?.quantity ?? '—'}</span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{fmtDT(d.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <button onClick={() => onNavigate('distributions')}
            className="mt-2 text-xs text-primary hover:underline flex items-center gap-1">
            <ArrowRight className="w-3 h-3" /> عرض جميع عمليات الخرج
          </button>
        </div>
      )}

      {data.lowStockItems?.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2"><TrendingDown className="w-4 h-4 text-red-500" />التجهيزات الأقل كمية</h3>
          <div className="bg-red-50/50 border border-red-100 rounded-xl overflow-hidden">
            <table className="w-full text-sm"><thead><tr className="bg-red-100/60 border-b border-red-200">
              <th className="text-right px-4 py-2.5 text-xs text-red-700 font-bold">التجهيز</th>
              <th className="text-right px-4 py-2.5 text-xs text-red-700 font-bold">الصنف</th>
              <th className="text-center px-4 py-2.5 text-xs text-red-700 font-bold">الكمية</th>
            </tr></thead><tbody className="divide-y divide-red-100">
              {data.lowStockItems.map((it: any) => (
                <tr key={it.id} className="hover:bg-red-50 transition-colors">
                  <td className="px-4 py-2.5 font-medium text-foreground">{it.name}</td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">{it.category || '—'}</td>
                  <td className="px-4 py-2.5 text-center"><span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold ${it.quantity <= 0 ? 'bg-red-200 text-red-800' : 'bg-orange-100 text-orange-700'}`}>{it.quantity}</span></td>
                </tr>
              ))}
            </tbody></table>
          </div>
        </div>
      )}

    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Items Tab                                                        */
/* ═══════════════════════════════════════════════════════════════════ */

function ItemsTab({ unit }: { unit: string }) {
  const { data: items = [], isLoading } = useQuery(['monitoring', unit, 'items'], fetchUnitData(unit, 'items'))
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  const filtered = useMemo(() => {
    if (!search.trim()) return items
    const q = search.toLowerCase()
    return items.filter((i: any) => i.name?.toLowerCase().includes(q) || i.category?.toLowerCase().includes(q) || i.adminNumber?.toLowerCase().includes(q))
  }, [items, search])

  const hdrs = [{ key: 'name', label: 'الاسم' }, { key: 'category', label: 'الصنف' }, { key: 'quantity', label: 'الكمية' }, { key: 'adminNumber', label: 'الرقم الإداري' }]
  const pdfH = hdrs.map(h => h.label)
  const pdfR = () => filtered.map((i: any) => [i.name, i.category || '—', String(i.quantity), i.adminNumber || '—'])

  if (isLoading) return <LoadingBlock />

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <SearchInput value={search} onChange={setSearch} placeholder="بحث في التجهيزات..." />
        <ExportBar unit={unit} tabLabel="التجهيزات" count={filtered.length}
          onExcel={() => exportExcel(filtered, hdrs, 'التجهيزات', `تجهيزات_${unit}.xlsx`)}
          onPDF={() => exportPDF(unit, 'التجهيزات', pdfH, pdfR(), `تجهيزات_${unit}.pdf`)} />
      </div>
      {filtered.length === 0 ? <EmptyBlock message="لا توجد تجهيزات" /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((item: any) => {
            const t = item.lowStockThreshold ?? 5
            const isLow = item.quantity <= 0
            const isWarn = !isLow && item.quantity <= t
            const barPct = t > 0 ? Math.min(100, Math.round((item.quantity / (t * 2)) * 100)) : 100
            return (
              <div key={item.id} onClick={() => navigate(`/monitoring/units/${encodeURIComponent(unit)}/items/${item.id}`)}
                className="bg-card border border-border rounded-xl p-4 hover:border-primary/40 hover:shadow-md cursor-pointer transition-all duration-200 space-y-3 group">
                {/* header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`p-2 rounded-lg shrink-0 ${isLow ? 'bg-red-100 text-red-600' : isWarn ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                      <Package className="w-4 h-4" />
                    </div>
                    <p className="text-sm font-bold text-foreground truncate">{item.name}</p>
                  </div>
                  <QtyBadge qty={item.quantity} threshold={item.lowStockThreshold} />
                </div>
                {/* category & admin number */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="bg-muted/60 px-2 py-0.5 rounded-full">{item.category || 'غير محدد'}</span>
                  {item.adminNumber && <span className="font-mono">{item.adminNumber}</span>}
                </div>
                {/* quantity bar */}
                <div>
                  <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                    <span>الكمية المتوفرة</span>
                    <span className="font-bold">{item.quantity}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div className={`h-1.5 rounded-full transition-all ${isLow ? 'bg-red-500' : isWarn ? 'bg-orange-500' : 'bg-green-500'}`}
                      style={{ width: `${barPct}%` }} />
                  </div>
                </div>
                {/* footer */}
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-muted-foreground">آخر تحديث: {fmtD(item.updatedAt)}</p>
                  <span className="text-[10px] text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    <Eye className="w-3 h-3" /> عرض التفاصيل
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Vehicles Tab                                                     */
/* ═══════════════════════════════════════════════════════════════════ */
function VehiclesTab({ unit }: { unit: string }) {
  const { data: vehicles = [], isLoading } = useQuery(['monitoring', unit, 'vehicles'], fetchUnitData(unit, 'vehicles'))
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<any>(null)

  const filtered = useMemo(() => {
    if (!search.trim()) return vehicles
    const q = search.toLowerCase()
    return vehicles.filter((v: any) => v.adminNumber?.toLowerCase().includes(q) || v.type?.toLowerCase().includes(q) || v.entity?.name?.toLowerCase().includes(q))
  }, [vehicles, search])

  const statusLabel = (s: string) => s === 'BROKEN' ? 'معطبة' : 'صالحة'
  const hdrs = [
    { key: 'adminNumber', label: 'رقم الوسيلة' },
    { key: 'type',        label: 'النوع' },
    { key: '_entity',     label: 'الوحدة التابعة' },
    { key: '_status',     label: 'الحالة' },
    { key: 'notes',       label: 'الملاحظات' },
  ]
  const mapped = filtered.map((v: any) => ({
    ...v,
    _status: statusLabel(v.status ?? 'OPERATIONAL'),
    _entity: v.entity?.name || '—',
  }))

  if (isLoading) return <LoadingBlock />

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <SearchInput value={search} onChange={setSearch} placeholder="بحث في الوسائل..." />
        <ExportBar unit={unit} tabLabel="الوسائل" count={filtered.length}
          onExcel={() => exportExcel(mapped, hdrs, 'الوسائل', `وسائل_${unit}.xlsx`)}
          onPDF={() => exportPDF(unit, 'الوسائل', hdrs.map(h => h.label), mapped.map((v: any) => hdrs.map(h => String(v[h.key] ?? '—'))), `وسائل_${unit}.pdf`)} />
      </div>
      {filtered.length === 0 ? <EmptyBlock message="لا توجد وسائل" /> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-muted/50 border-b border-border">
              <th className="text-right px-4 py-3 text-xs font-bold text-muted-foreground">رقم الوسيلة</th>
              <th className="text-right px-4 py-3 text-xs font-bold text-muted-foreground">النوع</th>
              <th className="text-right px-4 py-3 text-xs font-bold text-muted-foreground">الوحدة التابعة</th>
              <th className="text-right px-4 py-3 text-xs font-bold text-muted-foreground">الحالة</th>
              <th className="text-right px-4 py-3 text-xs font-bold text-muted-foreground">الملاحظات</th>
            </tr></thead>
            <tbody className="divide-y divide-border">
              {filtered.map((v: any) => (
                <tr key={v.id} onClick={() => setSelected(v)} className="hover:bg-primary/5 cursor-pointer transition-colors">
                  <td className="px-4 py-3 font-mono font-medium text-foreground">{v.adminNumber}</td>
                  <td className="px-4 py-3 text-foreground">{v.type}</td>
                  <td className="px-4 py-3 text-muted-foreground">{v.entity?.name || '—'}</td>
                  <td className="px-4 py-3">
                    {v.status === 'BROKEN'
                      ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-xs font-medium">معطبة</span>
                      : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs font-medium">صالحة</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground truncate max-w-[200px]">{v.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <DetailModal open={!!selected} onClose={() => setSelected(null)} title={`وسيلة: ${selected?.adminNumber ?? ''}`}>
        {selected && <div className="grid grid-cols-2 gap-2">
          <Field label="الرقم الإداري" value={selected.adminNumber} mono />
          <Field label="النوع" value={selected.type} />
          <Field label="نوع الوقود" value={selected.fuelType} />
          <Field label="المقرر (لتر)" value={selected.fuelQuota != null ? `${selected.fuelQuota} لتر` : '—'} />
          <Field label="الحالة" value={selected.status === 'BROKEN' ? 'معطبة' : 'صالحة'} />
          <Field label="الجهة" value={selected.entity?.name ?? '—'} />
          {selected.status === 'BROKEN' && <>
            <Field label="رقم برقية التعطب" value={selected.breakdownRef || '—'} mono />
            <Field label="تاريخ البرقية" value={selected.breakdownDate ? fmtD(selected.breakdownDate) : '—'} />
          </>}
          <Field label="ملاحظات" value={selected.notes || '—'} />
          <Field label="تاريخ الإضافة" value={fmtD(selected.createdAt)} />
        </div>}
      </DetailModal>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Receptions Tab (الدخل اليومي)                                    */
/* ═══════════════════════════════════════════════════════════════════ */
function ReceptionsTab({ unit }: { unit: string }) {
  const { data: receptions = [], isLoading } = useQuery(['monitoring', unit, 'receptions'], fetchUnitData(unit, 'receptions'))
  const [search,   setSearch]   = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo,   setDateTo]   = useState('')
  const [selected, setSelected] = useState<any>(null)

  // Flatten: each row = one reception-item line
  const flatRows = useMemo(() => {
    const rows: any[] = []
    ;(receptions as any[]).forEach((r: any) => {
      if (!r.items?.length) {
        rows.push({
          _rowId: `${r.id}-empty`, receptionId: r.id,
          referenceType: r.referenceType || '—', referenceNumber: r.referenceNumber || '—',
          referenceDate: r.referenceDate, supplier: r.supplier, collector: r.collector,
          user: r.user, notes: r.notes, createdAt: r.createdAt,
          itemName: '—', itemSku: '—', itemCategory: '—', itemDescription: '—',
          quantity: 0, adminNumber: '—', itemCurrentQty: null, _reception: r, _item: null,
        })
      } else {
        r.items.forEach((ri: any) => {
          rows.push({
            _rowId: `${r.id}-${ri.id}`, receptionId: r.id,
            referenceType: r.referenceType || '—', referenceNumber: r.referenceNumber || '—',
            referenceDate: r.referenceDate, supplier: r.supplier, collector: r.collector,
            user: r.user, notes: r.notes, createdAt: r.createdAt,
            itemName:        ri.item?.name        || '—',
            itemSku:         ri.item?.sku         || '—',
            itemCategory:    ri.item?.category    || '—',
            itemDescription: ri.item?.description || '—',
            quantity:        ri.quantity,
            adminNumber:     ri.adminNumber       || '—',
            itemCurrentQty:  ri.item?.quantity    ?? null,
            _reception: r, _item: ri,
          })
        })
      }
    })
    return rows
  }, [receptions])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const from = dateFrom ? new Date(dateFrom) : null
    const to   = dateTo   ? new Date(dateTo + 'T23:59:59') : null
    return flatRows.filter(row => {
      // date filter
      if (from || to) {
        const d = new Date(row.createdAt)
        if (from && d < from) return false
        if (to   && d > to)   return false
      }
      // text filter
      if (!q) return true
      return (
        row.itemName.toLowerCase().includes(q) ||
        (row.supplier?.name || '').toLowerCase().includes(q) ||
        (row.referenceNumber !== '—' && row.referenceNumber.toLowerCase().includes(q)) ||
        (row.user?.name || '').toLowerCase().includes(q) ||
        (row.itemCategory !== '—' && row.itemCategory.toLowerCase().includes(q))
      )
    })
  }, [flatRows, search, dateFrom, dateTo])

  // Full-detail headers for Excel export
  const xlsHdrs = [
    { key: 'receptionId',     label: 'رقم العملية' },
    { key: 'itemName',        label: 'التجهيز' },
    { key: 'itemCategory',    label: 'الفئة' },
    { key: 'itemDescription', label: 'الوصف' },
    { key: 'quantity',        label: 'الكمية المُدخَلَة' },
    { key: 'adminNumber',     label: 'الرقم الإداري' },
    { key: '_currentQty',     label: 'المخزون الحالي' },
    { key: '_supplier',       label: 'المصدر / المورد' },
    { key: '_collector',      label: 'المستلم' },
    { key: '_operator',       label: 'القائم بالعملية' },
    { key: 'referenceType',   label: 'نوع المرجع' },
    { key: 'referenceNumber', label: 'رقم المرجع' },
    { key: '_refDate',        label: 'تاريخ المرجع' },
    { key: '_date',           label: 'تاريخ العملية' },
    { key: 'notes',           label: 'ملاحظات' },
  ]
  const xlsRows = filtered.map(row => ({
    ...row,
    _currentQty: row.itemCurrentQty != null ? String(row.itemCurrentQty) : '—',
    _supplier:   row.supplier?.name || '—',
    _collector:  row.collector ? `${row.collector.rank ?? ''} ${row.collector.name} ${row.collector.surname}`.trim() : '—',
    _operator:   row.user ? `${row.user.name || ''} (${row.user.email})`.trim() : '—',
    _refDate:    row.referenceDate ? fmtD(row.referenceDate) : '—',
    _date:       fmtDT(row.createdAt),
    notes:       row.notes || '—',
  }))

  const pdfHdrs = ['التجهيز', 'الفئة', 'الكمية', 'المصدر', 'المستلم', 'القائم بالعملية', 'المرجع', 'تاريخ العملية']
  const pdfRowsFn = () => filtered.map(row => [
    row.itemName,
    row.itemCategory !== '—' ? row.itemCategory : '—',
    String(row.quantity),
    row.supplier?.name || '—',
    row.collector ? `${row.collector.rank ?? ''} ${row.collector.name} ${row.collector.surname}`.trim() : '—',
    row.user ? (row.user.name || row.user.email) : '—',
    `${row.referenceType !== '—' ? row.referenceType : ''} ${row.referenceNumber !== '—' ? row.referenceNumber : ''}`.trim() || '—',
    fmtD(row.createdAt),
  ])

  if (isLoading) return <LoadingBlock />

  return (
    <div className="p-5 space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="بحث بالتجهيز، المورد، القائم بالعملية..." />
        {/* Date-range filter */}
        <div className="flex items-center gap-2 bg-muted/40 border border-border rounded-lg px-3 py-1.5">
          <span className="text-xs text-muted-foreground whitespace-nowrap">من</span>
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="text-xs bg-transparent border-none outline-none text-foreground w-[120px] cursor-pointer"
          />
          <span className="text-xs text-muted-foreground">إلى</span>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="text-xs bg-transparent border-none outline-none text-foreground w-[120px] cursor-pointer"
          />
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(''); setDateTo('') }}
              className="text-muted-foreground hover:text-destructive transition-colors" title="مسح التواريخ">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <ExportBar unit={unit} tabLabel="الدخل اليومي" count={filtered.length}
          onExcel={() => exportExcel(xlsRows, xlsHdrs, 'الدخل اليومي', `دخل_يومي_${unit}.xlsx`)}
          onPDF={() => exportPDF(unit, 'الدخل اليومي', pdfHdrs, pdfRowsFn(), `دخل_يومي_${unit}.pdf`)} />
      </div>

      {filtered.length === 0 ? <EmptyBlock message="لا توجد بيانات دخل يومي" /> : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-right px-3 py-3 text-xs font-bold text-muted-foreground">#</th>
                <th className="text-right px-3 py-3 text-xs font-bold text-muted-foreground">التجهيز</th>
                <th className="text-right px-3 py-3 text-xs font-bold text-muted-foreground">الفئة</th>
                <th className="text-right px-3 py-3 text-xs font-bold text-muted-foreground">الكمية</th>
                <th className="text-right px-3 py-3 text-xs font-bold text-muted-foreground">الرقم الإداري</th>
                <th className="text-right px-3 py-3 text-xs font-bold text-muted-foreground">المصدر / المورد</th>
                <th className="text-right px-3 py-3 text-xs font-bold text-muted-foreground">المستلم</th>
                <th className="text-right px-3 py-3 text-xs font-bold text-muted-foreground">القائم بالعملية</th>
                <th className="text-right px-3 py-3 text-xs font-bold text-muted-foreground">المرجع</th>
                <th className="text-right px-3 py-3 text-xs font-bold text-muted-foreground">تاريخ العملية</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((row, idx) => (
                <tr key={row._rowId} onClick={() => setSelected(row)}
                  className="hover:bg-primary/5 cursor-pointer transition-colors">
                  <td className="px-3 py-3 font-mono text-xs text-muted-foreground">{idx + 1}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                      <span className="font-medium text-foreground whitespace-nowrap">{row.itemName}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    {row.itemCategory !== '—'
                      ? <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100 whitespace-nowrap">{row.itemCategory}</span>
                      : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-3 py-3">
                    <span className="inline-flex items-center justify-center min-w-[2rem] h-7 px-2 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-sm border border-emerald-100">
                      {row.quantity}
                    </span>
                  </td>
                  <td className="px-3 py-3 font-mono text-xs">
                    {row.adminNumber !== '—' ? row.adminNumber : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-3 py-3 text-xs text-foreground font-medium">
                    {row.supplier?.name || <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {row.collector ? `${row.collector.rank ?? ''} ${row.collector.name} ${row.collector.surname}`.trim() : '—'}
                  </td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">
                    {row.user ? (row.user.name || row.user.email) : '—'}
                  </td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">
                    {(row.referenceType !== '—' || row.referenceNumber !== '—')
                      ? `${row.referenceType !== '—' ? row.referenceType : ''} ${row.referenceNumber !== '—' ? row.referenceNumber : ''}`.trim()
                      : '—'}
                  </td>
                  <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">{fmtD(row.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <DetailModal open={!!selected} onClose={() => setSelected(null)}
        title={`دخل يومي — ${selected?.itemName ?? ''}`}>
        {selected && (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">معلومات التجهيز</p>
              <div className="grid grid-cols-2 gap-2">
                <Field label="اسم التجهيز"      value={selected.itemName} />
                <Field label="الفئة"              value={selected.itemCategory} />
                <Field label="الكمية المُدخَلَة"  value={String(selected.quantity)} />
                <Field label="الرقم الإداري"      value={selected.adminNumber} mono />
                <Field label="المخزون الحالي"    value={selected.itemCurrentQty != null ? String(selected.itemCurrentQty) : '—'} />
                {selected.itemDescription !== '—' && <Field label="الوصف" value={selected.itemDescription} />}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">معلومات عملية الاستقبال</p>
              <div className="grid grid-cols-2 gap-2">
                <Field label="رقم العملية"     value={String(selected.receptionId)} mono />
                <Field label="نوع المرجع"      value={selected.referenceType} />
                <Field label="رقم المرجع"      value={selected.referenceNumber} mono />
                <Field label="تاريخ المرجع"    value={selected.referenceDate ? fmtD(selected.referenceDate) : '—'} />
                <Field label="المصدر / المورد" value={selected.supplier?.name || '—'} />
                <Field label="المستلم"         value={selected.collector ? `${selected.collector.rank ?? ''} ${selected.collector.name} ${selected.collector.surname}`.trim() : '—'} />
                <Field label="القائم بالعملية" value={selected.user ? `${selected.user.name || ''} (${selected.user.email})`.trim() : '—'} />
                <Field label="تاريخ العملية"   value={fmtDT(selected.createdAt)} />
              </div>
            </div>
            {selected.notes && (
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1">ملاحظات</p>
                <p className="text-sm text-foreground bg-muted/40 rounded-lg px-3 py-2">{selected.notes}</p>
              </div>
            )}
            {selected._reception?.items?.length > 1 && (
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">جميع التجهيزات في هذه العملية ({selected._reception.items.length})</p>
                <div className="space-y-1">
                  {selected._reception.items.map((ri: any) => (
                    <div key={ri.id} className="flex items-center justify-between bg-muted/40 rounded-lg px-3 py-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-foreground font-medium">{ri.item?.name}</span>
                        {ri.item?.category && <span className="text-xs text-muted-foreground">{ri.item.category}</span>}
                        {ri.adminNumber && <span className="text-xs font-mono text-muted-foreground">{ri.adminNumber}</span>}
                      </div>
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">×{ri.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DetailModal>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Distributions Tab (الخرج اليومي)                                   */
/* ═══════════════════════════════════════════════════════════════════ */
function DistributionsTab({ unit }: { unit: string }) {
  const { data: distributions = [], isLoading } = useQuery(['monitoring', unit, 'distributions'], fetchUnitData(unit, 'distributions'))
  const [search,   setSearch]   = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo,   setDateTo]   = useState('')
  const [selected, setSelected] = useState<any>(null)

  // Flatten: each row = one distribution-item line
  const flatRows = useMemo(() => {
    const rows: any[] = []
    ;(distributions as any[]).forEach((d: any) => {
      if (!d.items?.length) {
        rows.push({
          _rowId: `${d.id}-empty`, distributionId: d.id,
          referenceType: d.referenceType || '—', referenceNumber: d.referenceNumber || '—',
          referenceDate: d.referenceDate,
          beneficiary: d.beneficiary, assignedTo: d.assignedTo,
          user: d.user, deliveredByName: d.deliveredByName, notes: d.notes, createdAt: d.createdAt,
          itemName: '—', itemSku: '—', itemCategory: '—', itemDescription: '—',
          quantity: 0, adminNumber: '—', serialNumber: '—',
          itemCondition: '—', itemCurrentQty: null, _distribution: d, _item: null,
        })
      } else {
        d.items.forEach((di: any) => {
          rows.push({
            _rowId: `${d.id}-${di.id}`, distributionId: d.id,
            referenceType: d.referenceType || '—', referenceNumber: d.referenceNumber || '—',
            referenceDate: d.referenceDate,
            beneficiary: d.beneficiary, assignedTo: d.assignedTo,
            user: d.user, deliveredByName: d.deliveredByName, notes: d.notes, createdAt: d.createdAt,
            itemName:        di.item?.name        || '—',
            itemSku:         di.item?.sku         || '—',
            itemCategory:    di.item?.category    || '—',
            itemDescription: di.item?.description || '—',
            quantity:        di.quantity,
            adminNumber:     di.adminNumber       || '—',
            serialNumber:    di.serialNumber      || '—',
            itemCondition:   di.condition         || '—',
            itemCurrentQty:  di.item?.quantity    ?? null,
            _distribution: d, _item: di,
          })
        })
      }
    })
    return rows
  }, [distributions])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const from = dateFrom ? new Date(dateFrom) : null
    const to   = dateTo   ? new Date(dateTo + 'T23:59:59') : null
    return flatRows.filter(row => {
      if (from || to) {
        const d = new Date(row.createdAt)
        if (from && d < from) return false
        if (to   && d > to)   return false
      }
      if (!q) return true
      return (
        row.itemName.toLowerCase().includes(q) ||
        (row.beneficiary?.name || '').toLowerCase().includes(q) ||
        (row.assignedTo ? `${row.assignedTo.name} ${row.assignedTo.surname}`.toLowerCase() : '').includes(q) ||
        (row.referenceNumber !== '—' && row.referenceNumber.toLowerCase().includes(q)) ||
        (row.user?.name || '').toLowerCase().includes(q) ||
        (row.itemCategory !== '—' && row.itemCategory.toLowerCase().includes(q))
      )
    })
  }, [flatRows, search, dateFrom, dateTo])

  // Full-detail headers for Excel export
  const xlsHdrs = [
    { key: 'distributionId',  label: 'رقم العملية' },
    { key: 'itemName',        label: 'التجهيز' },
    { key: 'itemCategory',    label: 'الفئة' },
    { key: 'itemDescription', label: 'الوصف' },
    { key: 'quantity',        label: 'الكمية المُخرَجَة' },
    { key: 'adminNumber',     label: 'الرقم الإداري' },
    { key: 'serialNumber',    label: 'الرقم التسلسلي' },
    { key: '_currentQty',     label: 'المخزون الحالي' },
    { key: '_beneficiary',    label: 'الجهة المستفيدة' },
    { key: '_assignedTo',     label: 'المكلف بالتوزيع' },
    { key: '_operator',       label: 'القائم بالعملية' },
    { key: 'deliveredByName', label: 'التسليم بواسطة' },
    { key: 'referenceType',   label: 'نوع المرجع' },
    { key: 'referenceNumber', label: 'رقم المرجع' },
    { key: '_refDate',        label: 'تاريخ المرجع' },
    { key: '_date',           label: 'تاريخ العملية' },
    { key: 'notes',           label: 'ملاحظات' },
  ]
  const xlsRows = filtered.map(row => ({
    ...row,
    _currentQty:  row.itemCurrentQty != null ? String(row.itemCurrentQty) : '—',
    _beneficiary: row.beneficiary?.name || '—',
    _assignedTo:  row.assignedTo ? `${row.assignedTo.rank ?? ''} ${row.assignedTo.name} ${row.assignedTo.surname}`.trim() : '—',
    _operator:    row.user ? `${row.user.name || ''} (${row.user.email})`.trim() : '—',
    _refDate:     row.referenceDate ? fmtD(row.referenceDate) : '—',
    _date:        fmtDT(row.createdAt),
    notes:        row.notes || '—',
  }))

  const pdfHdrs = ['التجهيز', 'الفئة', 'الكمية', 'الجهة المستفيدة', 'المكلف', 'القائم بالعملية', 'المرجع', 'تاريخ العملية']
  const pdfRowsFn = () => filtered.map(row => [
    row.itemName,
    row.itemCategory !== '—' ? row.itemCategory : '—',
    String(row.quantity),
    row.beneficiary?.name || '—',
    row.assignedTo ? `${row.assignedTo.rank ?? ''} ${row.assignedTo.name} ${row.assignedTo.surname}`.trim() : '—',
    row.user ? (row.user.name || row.user.email) : '—',
    `${row.referenceType !== '—' ? row.referenceType : ''} ${row.referenceNumber !== '—' ? row.referenceNumber : ''}`.trim() || '—',
    fmtD(row.createdAt),
  ])

  if (isLoading) return <LoadingBlock />

  return (
    <div className="p-5 space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="بحث بالتجهيز، الجهة، المكلف..." />
        {/* Date-range filter */}
        <div className="flex items-center gap-2 bg-muted/40 border border-border rounded-lg px-3 py-1.5">
          <span className="text-xs text-muted-foreground whitespace-nowrap">من</span>
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="text-xs bg-transparent border-none outline-none text-foreground w-[120px] cursor-pointer"
          />
          <span className="text-xs text-muted-foreground">إلى</span>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="text-xs bg-transparent border-none outline-none text-foreground w-[120px] cursor-pointer"
          />
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(''); setDateTo('') }}
              className="text-muted-foreground hover:text-destructive transition-colors" title="مسح التواريخ">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <ExportBar unit={unit} tabLabel="الخرج اليومي" count={filtered.length}
          onExcel={() => exportExcel(xlsRows, xlsHdrs, 'الخرج اليومي', `خرج_يومي_${unit}.xlsx`)}
          onPDF={() => exportPDF(unit, 'الخرج اليومي', pdfHdrs, pdfRowsFn(), `خرج_يومي_${unit}.pdf`)} />
      </div>

      {filtered.length === 0 ? <EmptyBlock message="لا توجد بيانات خرج يومي" /> : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-right px-3 py-3 text-xs font-bold text-muted-foreground">#</th>
                <th className="text-right px-3 py-3 text-xs font-bold text-muted-foreground">التجهيز</th>
                <th className="text-right px-3 py-3 text-xs font-bold text-muted-foreground">الفئة</th>
                <th className="text-right px-3 py-3 text-xs font-bold text-muted-foreground">الكمية</th>
                <th className="text-right px-3 py-3 text-xs font-bold text-muted-foreground">الرقم الإداري</th>
                <th className="text-right px-3 py-3 text-xs font-bold text-muted-foreground">الجهة المستفيدة</th>
                <th className="text-right px-3 py-3 text-xs font-bold text-muted-foreground">المكلف بالتوزيع</th>
                <th className="text-right px-3 py-3 text-xs font-bold text-muted-foreground">القائم بالعملية</th>
                <th className="text-right px-3 py-3 text-xs font-bold text-muted-foreground">المرجع</th>
                <th className="text-right px-3 py-3 text-xs font-bold text-muted-foreground">تاريخ العملية</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((row, idx) => (
                <tr key={row._rowId} onClick={() => setSelected(row)}
                  className="hover:bg-primary/5 cursor-pointer transition-colors">
                  <td className="px-3 py-3 font-mono text-xs text-muted-foreground">{idx + 1}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                      <span className="font-medium text-foreground whitespace-nowrap">{row.itemName}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    {row.itemCategory !== '—'
                      ? <span className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full border border-orange-100 whitespace-nowrap">{row.itemCategory}</span>
                      : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-3 py-3">
                    <span className="inline-flex items-center justify-center min-w-[2rem] h-7 px-2 rounded-lg bg-orange-50 text-orange-700 font-bold text-sm border border-orange-100">
                      {row.quantity}
                    </span>
                  </td>
                  <td className="px-3 py-3 font-mono text-xs">
                    {row.adminNumber !== '—' ? row.adminNumber : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-3 py-3 text-xs text-foreground font-medium">
                    {row.beneficiary?.name || <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {row.assignedTo ? `${row.assignedTo.rank ?? ''} ${row.assignedTo.name} ${row.assignedTo.surname}`.trim() : '—'}
                  </td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">
                    {row.user ? (row.user.name || row.user.email) : '—'}
                  </td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">
                    {(row.referenceType !== '—' || row.referenceNumber !== '—')
                      ? `${row.referenceType !== '—' ? row.referenceType : ''} ${row.referenceNumber !== '—' ? row.referenceNumber : ''}`.trim()
                      : '—'}
                  </td>
                  <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">{fmtD(row.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <DetailModal open={!!selected} onClose={() => setSelected(null)}
        title={`خرج يومي — ${selected?.itemName ?? ''}`}>
        {selected && (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">معلومات التجهيز</p>
              <div className="grid grid-cols-2 gap-2">
                <Field label="اسم التجهيز"       value={selected.itemName} />
                <Field label="الفئة"               value={selected.itemCategory} />
                <Field label="الكمية المُخرَجَة"   value={String(selected.quantity)} />
                <Field label="الرقم الإداري"       value={selected.adminNumber} mono />
                {selected.serialNumber !== '—' && <Field label="الرقم التسلسلي" value={selected.serialNumber} mono />}
                <Field label="المخزون الحالي"     value={selected.itemCurrentQty != null ? String(selected.itemCurrentQty) : '—'} />
                {selected.itemDescription !== '—' && <Field label="الوصف" value={selected.itemDescription} />}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">معلومات عملية التوزيع</p>
              <div className="grid grid-cols-2 gap-2">
                <Field label="رقم العملية"       value={String(selected.distributionId)} mono />
                <Field label="نوع المرجع"         value={selected.referenceType} />
                <Field label="رقم المرجع"         value={selected.referenceNumber} mono />
                <Field label="تاريخ المرجع"       value={selected.referenceDate ? fmtD(selected.referenceDate) : '—'} />
                <Field label="الجهة المستفيدة"   value={selected.beneficiary?.name || '—'} />
                <Field label="المكلف بالتوزيع"  value={selected.assignedTo ? `${selected.assignedTo.rank ?? ''} ${selected.assignedTo.name} ${selected.assignedTo.surname}`.trim() : '—'} />
                <Field label="القائم بالعملية"   value={selected.user ? `${selected.user.name || ''} (${selected.user.email})`.trim() : '—'} />
                {selected.deliveredByName && <Field label="التسليم بواسطة" value={selected.deliveredByName} />}
                <Field label="تاريخ العملية"     value={fmtDT(selected.createdAt)} />
              </div>
            </div>
            {selected.notes && (
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1">ملاحظات</p>
                <p className="text-sm text-foreground bg-muted/40 rounded-lg px-3 py-2">{selected.notes}</p>
              </div>
            )}
            {selected._distribution?.items?.length > 1 && (
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">جميع التجهيزات في هذه العملية ({selected._distribution.items.length})</p>
                <div className="space-y-1">
                  {selected._distribution.items.map((di: any) => (
                    <div key={di.id} className="flex items-center justify-between bg-muted/40 rounded-lg px-3 py-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-foreground font-medium">{di.item?.name}</span>
                        {di.item?.category && <span className="text-xs text-muted-foreground">{di.item.category}</span>}
                        {di.adminNumber && <span className="text-xs font-mono text-muted-foreground">{di.adminNumber}</span>}
                        {di.serialNumber && <span className="text-xs font-mono text-muted-foreground">SN: {di.serialNumber}</span>}
                      </div>
                      <span className="text-xs font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100">×{di.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DetailModal>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Entities Tab                                                     */
/* ═══════════════════════════════════════════════════════════════════ */
function EntitiesTab({ unit }: { unit: string }) {
  const navigate = useNavigate()
  const { data: entities = [], isLoading } = useQuery(['monitoring', unit, 'entities'], fetchUnitData(unit, 'entities'))
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search.trim()) return entities
    const q = search.toLowerCase()
    return entities.filter((e: any) =>
      e.name?.toLowerCase().includes(q) ||
      (e.type === 'SUPPLIER' ? 'مورد' : 'مستفيد').includes(q) ||
      (e.phone || '').toLowerCase().includes(q) ||
      (e.category || '').toLowerCase().includes(q)
    )
  }, [entities, search])

  const hdrs = [
    { key: 'name',      label: 'الاسم' },
    { key: '_type',     label: 'النوع' },
    { key: 'category',  label: 'الفئة' },
    { key: 'phone',     label: 'الهاتف' },
    { key: 'unitHead',  label: 'رئيس الوحدة' },
    { key: '_created',  label: 'تاريخ الإضافة' },
  ]
  const mapped = filtered.map((e: any) => ({
    ...e,
    _type:    e.type === 'SUPPLIER' ? 'مورد' : 'مستفيد',
    _created: fmtD(e.createdAt),
  }))

  if (isLoading) return <LoadingBlock />
  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <SearchInput value={search} onChange={setSearch} placeholder="بحث في الجهات..." />
        <ExportBar unit={unit} tabLabel="الجهات" count={filtered.length}
          onExcel={() => exportExcel(mapped, hdrs, 'الجهات', `جهات_${unit}.xlsx`)}
          onPDF={() => exportPDF(unit, 'الجهات', hdrs.map(h => h.label), mapped.map((e: any) => hdrs.map(h => String(e[h.key] ?? '—'))), `جهات_${unit}.pdf`)} />
      </div>
      {filtered.length === 0 ? <EmptyBlock message="لا توجد جهات" /> : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-right px-4 py-3 text-xs font-bold text-muted-foreground">الاسم</th>
                <th className="text-right px-4 py-3 text-xs font-bold text-muted-foreground">النوع</th>
                <th className="text-right px-4 py-3 text-xs font-bold text-muted-foreground">الفئة</th>
                <th className="text-right px-4 py-3 text-xs font-bold text-muted-foreground">الهاتف</th>
                <th className="text-right px-4 py-3 text-xs font-bold text-muted-foreground">رئيس الوحدة</th>
                <th className="text-right px-4 py-3 text-xs font-bold text-muted-foreground">تاريخ الإضافة</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((e: any) => (
                <tr
                  key={e.id}
                  onClick={() => navigate(`/entities/${e.id}`)}
                  className="hover:bg-primary/5 cursor-pointer transition-colors group"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="font-semibold text-foreground">{e.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      e.type === 'SUPPLIER' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {e.type === 'SUPPLIER' ? 'مورد' : 'مستفيد'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{e.category || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{e.phone || '—'}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{e.unitHead || '—'}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{fmtD(e.createdAt)}</td>
                  <td className="px-4 py-3 text-left">
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Projects Tab                                                     */
/* ═══════════════════════════════════════════════════════════════════ */
const PROJ_TYPE_LABELS: Record<string, string> = { CONSTRUCTION: 'بناء', DEVELOPMENT: 'تهيئة', PROTECTION: 'حماية وتسييج' }
const PROJ_STATUS_LABELS: Record<string, string> = { STUDY: 'طور الدراسات', WORK: 'طور الأشغال', COMPLETED: 'مكتمل', SUSPENDED: 'موقوف' }
const PROJ_STATUS_BADGE: Record<string, string> = {
  STUDY:     'bg-blue-100 text-blue-700 border border-blue-200',
  WORK:      'bg-green-100 text-green-700 border border-green-200',
  COMPLETED: 'bg-slate-100 text-slate-600 border border-slate-200',
  SUSPENDED: 'bg-red-100 text-red-600 border border-red-200',
}
const PROJ_TYPE_BAR: Record<string, string> = { CONSTRUCTION: 'bg-orange-500', DEVELOPMENT: 'bg-violet-500', PROTECTION: 'bg-teal-500' }
const projProg = (p: number) => p >= 100 ? 'bg-emerald-500' : p >= 60 ? 'bg-blue-500' : p >= 30 ? 'bg-amber-400' : 'bg-red-400'

function ProjectsTab({ unit }: { unit: string }) {
  const { data: projects = [], isLoading } = useQuery(
    ['monitoring', unit, 'projects'],
    async () => (await client.get(`/monitoring/units/${encodeURIComponent(unit)}/projects`)).data.data,
    { refetchInterval: 30000 }
  )

  if (isLoading) return <LoadingBlock />
  if (!projects.length) return (
    <div className="p-5">
      <EmptyBlock message="لا توجد مشاريع مسجلة لهذه الوحدة" />
    </div>
  )

  const ps = projects as any[]
  const inWork  = ps.filter(p => p.status === 'WORK').length
  const inStudy = ps.filter(p => p.status === 'STUDY').length
  const done    = ps.filter(p => p.status === 'COMPLETED').length
  const avgProg = Math.round(ps.reduce((s, p) => s + (p.progress || 0), 0) / ps.length)

  return (
    <div className="p-5 space-y-5">
      {/* stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'إجمالي المشاريع', v: ps.length,  color: 'from-teal-500 to-cyan-600',    icon: <HardHat className="w-4 h-4" /> },
          { label: 'طور الأشغال',     v: inWork,     color: 'from-green-500 to-emerald-600', icon: <Hammer className="w-4 h-4" /> },
          { label: 'طور الدراسات',    v: inStudy,    color: 'from-blue-500 to-indigo-600',   icon: <BookOpen className="w-4 h-4" /> },
          { label: 'مكتملة',          v: done,       color: 'from-slate-400 to-slate-500',   icon: <CheckCircle2 className="w-4 h-4" /> },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
            <div className={`p-2 bg-gradient-to-br ${s.color} rounded-lg text-white shrink-0`}>{s.icon}</div>
            <div><p className="text-xl font-extrabold text-foreground">{s.v}</p><p className="text-[11px] text-muted-foreground">{s.label}</p></div>
          </div>
        ))}
      </div>

      {/* avg progress */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-2 text-sm">
          <span className="font-medium text-foreground">متوسط نسبة الإنجاز</span>
          <span className="font-bold text-primary">{avgProg}%</span>
        </div>
        <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
          <div className={`h-3 rounded-full transition-all ${projProg(avgProg)}`} style={{ width: `${avgProg}%` }} />
        </div>
      </div>

      {/* projects grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {ps.map((p: any) => (
          <div key={p.id} className="rounded-xl border border-border bg-card overflow-hidden">
            <div className={`h-1 w-full ${PROJ_TYPE_BAR[p.type] ?? 'bg-primary'}`} />
            <div className="p-4 space-y-3">
              <div>
                <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${PROJ_STATUS_BADGE[p.status]} mb-1`}>
                  {p.status === 'WORK' && <Hammer className="w-3 h-3" />}
                  {p.status === 'STUDY' && <BookOpen className="w-3 h-3" />}
                  {p.status === 'COMPLETED' && <CheckCircle2 className="w-3 h-3" />}
                  {p.status === 'SUSPENDED' && <AlertTriangle className="w-3 h-3" />}
                  {PROJ_STATUS_LABELS[p.status]}
                </span>
                <p className="font-bold text-foreground text-sm">{p.name}</p>
                <p className="text-xs text-muted-foreground">{PROJ_TYPE_LABELS[p.type]} — {p.entity?.name ?? '—'}</p>
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">نسبة الإنجاز</span>
                  <span className="font-bold text-foreground">{p.progress}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div className={`h-2 rounded-full ${projProg(p.progress)}`} style={{ width: `${p.progress}%` }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-muted/50 px-3 py-2">
                  <p className="text-muted-foreground">الاعتماد</p>
                  <p className="font-bold text-foreground">{p.budget?.toLocaleString('ar-TN')} <span className="font-normal">د.ت</span></p>
                  <p className="text-muted-foreground">{p.budgetYear}</p>
                </div>
                {p.extraBudget ? (
                  <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2">
                    <p className="text-amber-700">اعتماد إضافي</p>
                    <p className="font-bold text-amber-800">{p.extraBudget?.toLocaleString('ar-TN')} <span className="font-normal">د.ت</span></p>
                    {p.extraBudgetYear && <p className="text-amber-600">{p.extraBudgetYear}</p>}
                  </div>
                ) : (
                  <div className="rounded-lg bg-muted/50 px-3 py-2">
                    <p className="text-muted-foreground">المجموع</p>
                    <p className="font-bold text-foreground">{p.budget?.toLocaleString('ar-TN')} <span className="font-normal">د.ت</span></p>
                  </div>
                )}
              </div>
              {p.notes && <p className="text-xs text-muted-foreground border-t border-dashed border-border pt-2 line-clamp-2">{p.notes}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Budgets Tab                                                      */
/* ═══════════════════════════════════════════════════════════════════ */
function BudgetsTab({ unit }: { unit: string }) {
  const { data: budgets = [], isLoading } = useQuery(['monitoring', unit, 'budgets'], fetchUnitData(unit, 'budgets'))
  const [selected, setSelected] = useState<any>(null)
  const [detailTab, setDetailTab] = useState<'overview' | 'requests' | 'expenses'>('overview')

  const openBudget = (b: any) => { setSelected(b); setDetailTab('overview') }

  const xlsHdrs = [
    { key: 'name',         label: 'اسم الاعتماد' },
    { key: 'department',   label: 'القسم' },
    { key: 'amount',       label: 'المبلغ الإجمالي' },
    { key: '_spent',       label: 'المصروف' },
    { key: '_remaining',   label: 'المتبقي' },
    { key: 'status',       label: 'الحالة' },
    { key: 'startDate',    label: 'تاريخ البداية' },
    { key: 'endDate',      label: 'تاريخ الانتهاء' },
    { key: '_requests',    label: 'طلبات التزود' },
    { key: '_expenseCount',label: 'عدد الفواتير' },
    { key: 'createdBy',    label: 'منشئ بواسطة' },
    { key: 'notes',        label: 'ملاحظات' },
  ]
  const xlsRows = budgets.map((b: any) => {
    const spent = b.expenses?.reduce((s: number, e: any) => s + (e.amount || 0), 0) || 0
    return {
      ...b,
      _spent:        spent,
      _remaining:    (b.amount || 0) - spent,
      _requests:     b.supplyRequests?.length || 0,
      _expenseCount: b.expenses?.length || 0,
      notes:         b.notes || '—',
    }
  })

  const statusMeta: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    active:  { label: 'نشط',   color: 'bg-green-100 text-green-700',  icon: <CheckCircle2 className="w-3 h-3" /> },
    expired: { label: 'منتهي', color: 'bg-red-100 text-red-700',    icon: <AlertTriangle className="w-3 h-3" /> },
    closed:  { label: 'مغلق',  color: 'bg-gray-100 text-gray-600',  icon: <Clock className="w-3 h-3" /> },
  }

  if (isLoading) return <LoadingBlock />
  return (
    <div className="p-5 space-y-4">
      <ExportBar unit={unit} tabLabel="الاعتمادات" count={budgets.length}
        onExcel={() => exportExcel(xlsRows, xlsHdrs, 'الاعتمادات', `اعتمادات_${unit}.xlsx`)}
        onPDF={() => exportPDF(unit, 'الاعتمادات المالية',
          ['الاسم', 'القسم', 'المبلغ', 'المصروف', 'المتبقي', 'الحالة'],
          xlsRows.map((b: any) => [b.name, b.department, numFmt(b.amount), numFmt(b._spent), numFmt(b._remaining), b.status]),
          `اعتمادات_${unit}.pdf`)} />

      {budgets.length === 0 ? <EmptyBlock message="لا توجد اعتمادات" /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {budgets.map((b: any) => {
            const spent = b.expenses?.reduce((s: number, e: any) => s + (e.amount || 0), 0) || 0
            const remaining = (b.amount || 0) - spent
            const pct = b.amount ? Math.min(100, Math.round((spent / b.amount) * 100)) : 0
            const sm = statusMeta[b.status] ?? statusMeta.closed
            return (
              <div key={b.id} onClick={() => openBudget(b)}
                className="bg-card border border-border rounded-xl p-4 hover:border-primary/40 hover:shadow-md cursor-pointer transition-all duration-200 space-y-3">
                {/* header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="p-1.5 rounded-lg bg-pink-100 text-pink-600 shrink-0">
                      <Wallet className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-foreground text-sm truncate">{b.name || b.department}</p>
                      <p className="text-xs text-muted-foreground">{b.department}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${sm.color}`}>
                    {sm.icon}{sm.label}
                  </span>
                </div>
                {/* amounts */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-muted/40 rounded-lg px-2 py-2">
                    <p className="text-[10px] text-muted-foreground mb-0.5">المبلغ</p>
                    <p className="text-xs font-bold text-foreground">{numFmt(b.amount)}</p>
                  </div>
                  <div className="bg-orange-50 rounded-lg px-2 py-2">
                    <p className="text-[10px] text-orange-600 mb-0.5">المصروف</p>
                    <p className="text-xs font-bold text-orange-600">{numFmt(spent)}</p>
                  </div>
                  <div className={`rounded-lg px-2 py-2 ${remaining < 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                    <p className={`text-[10px] mb-0.5 ${remaining < 0 ? 'text-red-600' : 'text-green-600'}`}>المتبقي</p>
                    <p className={`text-xs font-bold ${remaining < 0 ? 'text-red-600' : 'text-green-600'}`}>{numFmt(remaining)}</p>
                  </div>
                </div>
                {/* progress */}
                <div>
                  <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                    <span>{b.startDate} ← {b.endDate}</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className={`h-2 rounded-full transition-all ${
                      pct > 90 ? 'bg-red-500' : pct > 65 ? 'bg-orange-500' : 'bg-green-500'
                    }`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
                {/* footer counts */}
                <div className="flex items-center gap-3 text-xs text-muted-foreground border-t border-border pt-2">
                  <span className="flex items-center gap-1">
                    <ShoppingCart className="w-3 h-3" />
                    {b.supplyRequests?.length || 0} طلب تزود
                  </span>
                  <span className="flex items-center gap-1">
                    <Receipt className="w-3 h-3" />
                    {b.expenses?.length || 0} فاتورة
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Full detail modal ── */}
      {selected && (() => {
        const spent     = selected.expenses?.reduce((s: number, e: any) => s + (e.amount || 0), 0) || 0
        const remaining = (selected.amount || 0) - spent
        const pct       = selected.amount ? Math.min(100, Math.round((spent / selected.amount) * 100)) : 0
        const sm        = statusMeta[selected.status] ?? statusMeta.closed
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelected(null)} />
            <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-border bg-card shadow-2xl z-10">
              {/* Modal header */}
              <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 text-white">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="font-bold text-foreground">{selected.name}</h2>
                    <p className="text-xs text-muted-foreground">{selected.department}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-bold ${sm.color}`}>
                    {sm.icon}{sm.label}
                  </span>
                  <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Stats bar */}
              <div className="grid grid-cols-3 gap-px bg-border shrink-0">
                {[
                  { label: 'المبلغ الإجمالي', value: numFmt(selected.amount), cls: 'bg-card text-foreground' },
                  { label: 'المصروف', value: numFmt(spent), cls: 'bg-orange-50 text-orange-600' },
                  { label: 'المتبقي', value: numFmt(remaining), cls: remaining < 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600' },
                ].map(s => (
                  <div key={s.label} className={`${s.cls} flex flex-col items-center py-3 px-2`}>
                    <p className="text-xs text-muted-foreground mb-0.5">{s.label}</p>
                    <p className={`text-sm font-extrabold ${s.cls.includes('text-') ? '' : 'text-foreground'}`}>{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Progress */}
              <div className="px-5 py-3 shrink-0 border-b border-border">
                <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                  <span>من {selected.startDate} إلى {selected.endDate}</span>
                  <span className="font-bold">{pct}% مختصم</span>
                </div>
                <div className="w-full bg-muted rounded-full h-3">
                  <div className={`h-3 rounded-full transition-all ${
                    pct > 90 ? 'bg-red-500' : pct > 65 ? 'bg-orange-500' : 'bg-green-500'
                  }`} style={{ width: `${pct}%` }} />
                </div>
              </div>

              {/* Inner tabs */}
              <div className="flex border-b border-border shrink-0">
                {([
                  { key: 'overview', label: 'نظرة عامة',    icon: <BarChart3 className="w-3.5 h-3.5" /> },
                  { key: 'requests', label: `طلبات التزود (${selected.supplyRequests?.length || 0})`, icon: <ShoppingCart className="w-3.5 h-3.5" /> },
                  { key: 'expenses', label: `الفواتير (${selected.expenses?.length || 0})`, icon: <Receipt className="w-3.5 h-3.5" /> },
                ] as const).map(t => (
                  <button key={t.key} onClick={() => setDetailTab(t.key)}
                    className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors border-b-2 ${
                      detailTab === t.key
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}>
                    {t.icon}{t.label}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="flex-1 overflow-y-auto p-5">

                {/* Overview tab */}
                {detailTab === 'overview' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="اسم الاعتماد" value={selected.name} />
                      <Field label="القسم" value={selected.department} />
                      <Field label="تاريخ البداية" value={selected.startDate || '—'} />
                      <Field label="تاريخ الانتهاء" value={selected.endDate || '—'} />
                      <Field label="منشئ بواسطة" value={selected.createdBy || '—'} />
                      <Field label="تاريخ الإنشاء" value={fmtD(selected.createdAt)} />
                    </div>
                    {selected.notes && (
                      <div>
                        <p className="text-xs font-bold text-muted-foreground mb-1">ملاحظات</p>
                        <p className="text-sm text-foreground bg-muted/40 rounded-lg px-3 py-2">{selected.notes}</p>
                      </div>
                    )}
                    {/* mini expense breakdown */}
                    {selected.expenses?.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-muted-foreground mb-2">ملخص المصاريف</p>
                        <div className="space-y-1">
                          {selected.expenses.slice(0, 5).map((ex: any) => (
                            <div key={ex.id} className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2 text-xs">
                              <span className="text-foreground font-medium truncate max-w-[60%]">{ex.supplier || `فاتورة #${ex.id}`}</span>
                              <span className="font-bold text-orange-600">{numFmt(ex.amount)}</span>
                            </div>
                          ))}
                          {selected.expenses.length > 5 && (
                            <button onClick={() => setDetailTab('expenses')}
                              className="w-full text-center text-xs text-primary hover:underline py-1">
                              عرض جميع الفواتير ({selected.expenses.length})
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Supply Requests tab */}
                {detailTab === 'requests' && (
                  <div className="space-y-3">
                    {!selected.supplyRequests?.length ? (
                      <EmptyBlock message="لا توجد طلبات تزود" />
                    ) : selected.supplyRequests.map((r: any) => (
                      <div key={r.id} className="border border-border rounded-xl p-4 space-y-2 bg-muted/20">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <ShoppingCart className="w-3.5 h-3.5 text-violet-500" />
                            <span className="text-sm font-bold text-foreground">{r.title}</span>
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">{fmtD(r.createdAt)}</span>
                        </div>
                        {r.supplier && (
                          <p className="text-xs text-muted-foreground">المورد: <span className="text-foreground font-medium">{r.supplier}</span></p>
                        )}
                        {r.notes && (
                          <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-2.5 py-1.5">{r.notes}</p>
                        )}
                        {r.createdBy && (
                          <p className="text-xs text-muted-foreground">أضيف بواسطة: <span className="text-foreground">{r.createdBy}</span></p>
                        )}
                        {r.attachments?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {r.attachments.map((a: any, i: number) => (
                              <a key={i} href={a.data} download={a.name}
                                className="inline-flex items-center gap-1 text-xs bg-violet-50 text-violet-700 border border-violet-100 px-2 py-0.5 rounded-full hover:bg-violet-100 transition-colors"
                                onClick={e => e.stopPropagation()}>
                                <Paperclip className="w-3 h-3" />{a.name || `مرفق ${i + 1}`}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Expenses / Invoices tab */}
                {detailTab === 'expenses' && (
                  <div className="space-y-3">
                    {!selected.expenses?.length ? (
                      <EmptyBlock message="لا توجد فواتير" />
                    ) : (
                      <>
                        {/* Summary row */}
                        <div className="flex items-center justify-between bg-orange-50 border border-orange-100 rounded-xl px-4 py-2.5">
                          <span className="text-xs font-bold text-orange-700">إجمالي الفواتير: {selected.expenses.length}</span>
                          <span className="text-sm font-extrabold text-orange-700">{numFmt(spent)}</span>
                        </div>
                        {selected.expenses.map((ex: any) => (
                          <div key={ex.id} className="border border-border rounded-xl p-4 space-y-2 bg-muted/20">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <Receipt className="w-3.5 h-3.5 text-orange-500" />
                                <span className="text-sm font-bold text-foreground">{ex.supplier}</span>
                              </div>
                              <span className="font-extrabold text-sm text-orange-600 shrink-0">{numFmt(ex.amount)}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-x-4 text-xs text-muted-foreground">
                              {ex.invoiceNumber && <span>رقم الفاتورة: <span className="font-mono text-foreground">{ex.invoiceNumber}</span></span>}
                              <span>التاريخ: <span className="text-foreground">{ex.date}</span></span>
                              {ex.addedBy && <span>أضيف بواسطة: <span className="text-foreground">{ex.addedBy}</span></span>}
                            </div>
                            {ex.notes && <p className="text-xs text-muted-foreground bg-muted/40 rounded px-2 py-1">{ex.notes}</p>}
                            {ex.attachments?.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {ex.attachments.map((a: any, i: number) => (
                                  <a key={i} href={a.data} download={a.name}
                                    className="inline-flex items-center gap-1 text-xs bg-orange-50 text-orange-700 border border-orange-100 px-2 py-0.5 rounded-full hover:bg-orange-100 transition-colors"
                                    onClick={e => e.stopPropagation()}>
                                    <Paperclip className="w-3 h-3" />{a.name || `مرفق ${i + 1}`}
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}

              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Logs Tab — 5 Accordion Sections                                  */
/* ═══════════════════════════════════════════════════════════════════ */
/* ── LogsTab constants ── */
const LOG_ACTION_LABELS: Record<string, string> = {
  CREATE: 'إضافة', UPDATE: 'تعديل', DELETE: 'حذف',
  LOGIN: 'تسجيل دخول', LOGOUT: 'تسجيل خروج',
  BLOCK_USER: 'حجب مستخدم', UNBLOCK_USER: 'فك حجب مستخدم',
}
const LOG_TABLE_LABELS: Record<string, string> = {
  User: 'مستخدمون', Item: 'أصناف', Reception: 'دخل', Distribution: 'خرج',
  Entity: 'جهات', Employee: 'موظفون', Budget: 'اعتمادات', DeliveryReceipt: 'وصولات',
}
const AR_MONTHS_LOG = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']
const CHART_COLORS  = ['#3b82f6','#22c55e','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#84cc16']

function LogsTab({ unit }: { unit: string }) {
  const now     = new Date()
  const encoded = encodeURIComponent(unit)

  const [open, setOpen] = useState({ overview: true, audit: true, financial: true, monthly: true, inventory: true })
  const tog = (k: keyof typeof open) => setOpen(p => ({ ...p, [k]: !p[k] }))

  const [statsYear,   setStatsYear]   = useState(now.getFullYear())
  const [auditAction, setAuditAction] = useState('')
  const [auditFrom,   setAuditFrom]   = useState('')
  const [auditTo,     setAuditTo]     = useState('')
  const [auditSearch, setAuditSearch] = useState('')
  const [auditSort,   setAuditSort]   = useState<'desc'|'asc'>('desc')
  const [activeLog,   setActiveLog]   = useState<any>(null)
  const [rptYear,     setRptYear]     = useState(now.getFullYear())
  const [rptMonth,    setRptMonth]    = useState(now.getMonth() + 1)
  const [invSearch,       setInvSearch]       = useState('')
  const [invStockStatus,  setInvStockStatus]  = useState('all')
  const [invCategory,     setInvCategory]     = useState('')
  const [invExpandedId,   setInvExpandedId]   = useState<number|null>(null)

  const { data: stats, isLoading: statsLoading } = useQuery(
    ['mon', unit, 'logstats', statsYear],
    () => client.get(`/monitoring/units/${encoded}/logs/stats`, { params: { year: statsYear } }).then(r => r.data.data),
    { refetchInterval: 60000 },
  )
  const { data: auditRaw, isLoading: auditLoading } = useQuery(
    ['mon', unit, 'logs', auditAction, auditFrom, auditTo],
    () => client.get(`/monitoring/units/${encoded}/logs`, {
      params: { action: auditAction || undefined, from: auditFrom || undefined, to: auditTo || undefined, limit: 300 },
    }).then(r => r.data.data ?? r.data),
  )
  const { data: budgets = [] } = useQuery(['monitoring', unit, 'budgets'], fetchUnitData(unit, 'budgets'))
  const { data: reportData, isLoading: rptLoading } = useQuery(
    ['mon', unit, 'monthly', rptYear, rptMonth],
    () => client.get(`/monitoring/units/${encoded}/logs/monthly`, { params: { year: rptYear, month: rptMonth } }).then(r => r.data.data),
  )
  const { data: invRaw = [], isLoading: invLoading } = useQuery(
    ['mon', unit, 'inventory'],
    () => client.get(`/monitoring/units/${encoded}/logs/inventory`).then(r => r.data.data ?? []),
  )

  const auditLogs: any[]  = Array.isArray(auditRaw) ? auditRaw : (auditRaw?.data ?? [])
  const displayedAudit    = useMemo(() => {
    let r = [...auditLogs]
    if (auditSearch.trim()) {
      const q = auditSearch.toLowerCase()
      r = r.filter(l =>
        (l.action ?? '').toLowerCase().includes(q) ||
        (l.table ?? '').toLowerCase().includes(q) ||
        (l.user?.name ?? '').toLowerCase().includes(q) ||
        (l.user?.email ?? '').toLowerCase().includes(q) ||
        (l.counterparty ?? '').toLowerCase().includes(q) ||
        (l.equipmentNames?.join(',') ?? '').toLowerCase().includes(q),
      )
    }
    r.sort((a, b) => {
      const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      return auditSort === 'desc' ? -diff : diff
    })
    return r
  }, [auditLogs, auditSearch, auditSort])

  const budgetsArr: any[] = Array.isArray(budgets) ? budgets : []
  const activeBudgets     = budgetsArr.filter((b: any) => b.status === 'active')
  const totalBudgetAmt    = activeBudgets.reduce((s: number, b: any) => s + (b.amount || 0), 0)
  const totalSpent        = activeBudgets.reduce((s: number, b: any) =>
    s + (b.expenses || []).reduce((es: number, e: any) => es + (e.amount || 0), 0), 0)

  const inventory: any[]  = Array.isArray(invRaw) ? invRaw : []
  const allCategories     = useMemo(() => Array.from(new Set(inventory.map((it: any) => it.category).filter(Boolean))).sort() as string[], [inventory])
  const invFiltered       = useMemo(() => inventory.filter(it => {
    if (invSearch) {
      const q = invSearch.toLowerCase()
      if (!it.name.toLowerCase().includes(q) && !(it.sku ?? '').toLowerCase().includes(q) && !(it.category ?? '').toLowerCase().includes(q)) return false
    }
    if (invCategory && it.category !== invCategory) return false
    if (invStockStatus === 'low'    && !(it.currentStock > 0 && it.lowStockThreshold != null && it.currentStock <= it.lowStockThreshold)) return false
    if (invStockStatus === 'out'    && it.currentStock !== 0) return false
    if (invStockStatus === 'normal' && (it.currentStock === 0 || (it.lowStockThreshold != null && it.currentStock <= it.lowStockThreshold))) return false
    return true
  }), [inventory, invSearch, invCategory, invStockStatus])

  const TooltipStyle = {
    contentStyle: { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, color: 'hsl(var(--foreground))' },
    labelStyle:   { color: 'hsl(var(--muted-foreground))', fontWeight: 600 },
  }

  const SectionHead = ({ k, label, icon, count, onExcel, onPDF }: { k: keyof typeof open; label: string; icon: React.ReactNode; count?: number; onExcel?: () => void; onPDF?: () => void }) => (
    <div className="w-full flex items-center justify-between bg-muted/40 hover:bg-muted/70 border border-border rounded-xl px-4 py-2.5 transition-colors">
      <button onClick={() => tog(k)} className="flex items-center gap-2.5 flex-1 text-right min-w-0">
        <span className="text-primary shrink-0">{icon}</span>
        <span className="font-bold text-sm text-foreground">{label}</span>
        {count !== undefined && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{count}</span>}
      </button>
      <div className="flex items-center gap-1.5 shrink-0 mr-2">
        {onExcel && (
          <button onClick={e => { e.stopPropagation(); onExcel() }}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border border-green-200 bg-green-50 text-green-700 hover:bg-green-100 transition-colors">
            <Download className="w-3 h-3" /> Excel
          </button>
        )}
        {onPDF && (
          <button onClick={e => { e.stopPropagation(); onPDF() }}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors">
            <Printer className="w-3 h-3" /> PDF
          </button>
        )}
        <button onClick={() => tog(k)} className="p-1 text-muted-foreground hover:text-foreground">
          {open[k] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )

  const StockBadge = ({ it }: { it: any }) => {
    if (it.currentStock === 0) return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200"><AlertTriangle className="w-3 h-3" />نفذ</span>
    if (it.lowStockThreshold != null && it.currentStock <= it.lowStockThreshold) return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 border border-yellow-200"><TrendingDown className="w-3 h-3" />منخفض</span>
    return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200"><CheckCircle2 className="w-3 h-3" />طبيعي</span>
  }

  return (
    <div className="p-5 space-y-4">

      {/* ── Section 1: نظرة عامة ── */}
      <div className="space-y-3">
        <SectionHead k="overview" label="نظرة عامة" icon={<BarChart3 className="w-4 h-4" />} count={stats?.totalLogs}
          onExcel={() => {
            const hdrs = [{ key: 'month', label: 'الشهر' }, { key: 'count', label: 'عدد العمليات' }]
            exportExcel(stats?.monthlyData ?? [], hdrs, 'نظرة عامة', `نظرة_عامة_${unit}.xlsx`)
          }}
          onPDF={() => {
            const hdrs = ['الشهر', 'عدد العمليات']
            const rows = (stats?.monthlyData ?? []).map((r: any) => [String(r.month ?? ''), String(r.count ?? '0')])
            exportPDF(unit, 'نظرة عامة — حركة النشاط الشهري', hdrs, rows, `نظرة_عامة_${unit}.pdf`)
          }}
        />
        {open.overview && (
          <div className="space-y-4 px-1">
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground">السنة:</label>
              <select value={statsYear} onChange={e => setStatsYear(Number(e.target.value))}
                className="text-xs border border-border rounded-lg px-2 py-1.5 bg-card text-foreground">
                {[now.getFullYear(), now.getFullYear()-1, now.getFullYear()-2].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            {statsLoading ? <LoadingBlock /> : stats ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'إجمالي السجلات',     value: stats.totalLogs,      cls: 'bg-blue-100 text-blue-600' },
                    { label: 'هذا الشهر',           value: stats.totalThisMonth, cls: 'bg-violet-100 text-violet-600' },
                    { label: 'الاعتمادات الفعّالة', value: activeBudgets.length, cls: 'bg-green-100 text-green-600' },
                    { label: 'مخزون منخفض',         value: inventory.filter((i: any) => i.lowStockThreshold != null && i.currentStock <= i.lowStockThreshold).length, cls: 'bg-red-100 text-red-600' },
                  ].map((k, i) => (
                    <div key={i} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${k.cls}`}><BarChart3 className="w-4 h-4" /></div>
                      <div><p className="text-xs text-muted-foreground">{k.label}</p><p className="text-xl font-bold text-foreground">{k.value ?? '…'}</p></div>
                    </div>
                  ))}
                </div>
                <div className="bg-card border border-border rounded-xl p-4">
                  <p className="text-xs font-bold text-foreground mb-3">حركة النشاط الشهري — {stats.year}</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={stats.monthlyData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gradLogA" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip {...TooltipStyle} formatter={(v: any) => [v, 'عدد العمليات']} />
                      <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} fill="url(#gradLogA)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="bg-card border border-border rounded-xl p-4">
                    <p className="text-xs font-bold text-foreground mb-3">توزيع العمليات حسب النوع</p>
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie data={stats.byAction} dataKey="count" nameKey="action" cx="50%" cy="50%" outerRadius={60} paddingAngle={2}
                          label={({ name, percent }: any) => `${LOG_ACTION_LABELS[name] ?? name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                          {stats.byAction.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                        </Pie>
                        <Tooltip {...TooltipStyle} formatter={(v: any, n: any) => [v, LOG_ACTION_LABELS[n] ?? n]} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="bg-card border border-border rounded-xl p-4">
                    <p className="text-xs font-bold text-foreground mb-3">ملخص العمليات</p>
                    <div className="grid grid-cols-2 gap-2">
                      {stats.byAction.map((item: any) => (
                        <div key={item.action} className="rounded-lg bg-muted/30 border border-border p-3 text-center">
                          <p className="text-lg font-bold text-foreground">{item.count}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{LOG_ACTION_LABELS[item.action] ?? item.action}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            ) : <EmptyBlock message="لا توجد إحصائيات" />}
          </div>
        )}
      </div>

      {/* ── Section 2: سجل العمليات ── */}
      <div className="space-y-3">
        <SectionHead k="audit" label="سجل العمليات" icon={<ShieldCheck className="w-4 h-4" />} count={displayedAudit.length}
          onExcel={() => {
            const hdrs = [
              { key: 'id', label: '#' }, { key: '_action', label: 'الإجراء' }, { key: '_table', label: 'النوع' },
              { key: '_equip', label: 'التجهيز' }, { key: '_cpty', label: 'الجهة' }, { key: '_assigned', label: 'المكلف' },
              { key: '_user', label: 'المستخدم' }, { key: '_date', label: 'التاريخ' },
            ]
            const rows = displayedAudit.map((l: any) => ({
              id: l.id,
              _action: LOG_ACTION_LABELS[l.action] ?? l.action,
              _table:  LOG_TABLE_LABELS[l.table] ?? l.table,
              _equip:  l.equipmentNames?.[0] ?? '—',
              _cpty:   l.counterparty ?? '—',
              _assigned: l.assignedTo ?? '—',
              _user:   l.user?.name ?? l.user?.email ?? '—',
              _date:   new Date(l.createdAt).toLocaleString('en-GB'),
            }))
            exportExcel(rows, hdrs, 'سجل العمليات', `سجل_عمليات_${unit}.xlsx`)
          }}
          onPDF={() => {
            const hdrs = ['#','الإجراء','النوع','التجهيز','الجهة','المكلف','المستخدم','التاريخ']
            const rows = displayedAudit.map((l: any) => [
              String(l.id), LOG_ACTION_LABELS[l.action] ?? l.action, LOG_TABLE_LABELS[l.table] ?? l.table,
              l.equipmentNames?.[0] ?? '—', l.counterparty ?? '—', l.assignedTo ?? '—',
              l.user?.name ?? l.user?.email ?? '—', new Date(l.createdAt).toLocaleString('en-GB'),
            ])
            exportPDF(unit, 'سجل العمليات', hdrs, rows, `سجل_عمليات_${unit}.pdf`)
          }}
        />
        {open.audit && (
          <div className="space-y-3 px-1">
            <div className="flex flex-wrap gap-2 items-center">
              <div className="relative">
                <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input value={auditSearch} onChange={e => setAuditSearch(e.target.value)}
                  placeholder="بحث..." className="pr-7 pl-3 py-1.5 text-xs border border-border rounded-lg bg-card w-36 text-foreground" />
              </div>
              <select value={auditAction} onChange={e => setAuditAction(e.target.value)}
                className="text-xs border border-border rounded-lg px-2 py-1.5 bg-card text-foreground">
                <option value="">كل العمليات</option>
                {Object.entries(LOG_ACTION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <input type="date" value={auditFrom} onChange={e => setAuditFrom(e.target.value)}
                className="text-xs border border-border rounded-lg px-2 py-1.5 bg-card text-foreground" />
              <span className="text-xs text-muted-foreground">→</span>
              <input type="date" value={auditTo} onChange={e => setAuditTo(e.target.value)}
                className="text-xs border border-border rounded-lg px-2 py-1.5 bg-card text-foreground" />
              {(auditAction || auditFrom || auditTo || auditSearch) && (
                <button onClick={() => { setAuditAction(''); setAuditFrom(''); setAuditTo(''); setAuditSearch('') }}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                  <X className="w-3 h-3" /> مسح
                </button>
              )}
              <button onClick={() => setAuditSort(d => d === 'desc' ? 'asc' : 'desc')}
                className="text-xs border border-border rounded-lg px-2 py-1.5 bg-card text-muted-foreground">
                {auditSort === 'desc' ? '↓ الأحدث' : '↑ الأقدم'}
              </button>
            </div>
            {auditLoading ? <LoadingBlock /> : displayedAudit.length === 0 ? <EmptyBlock message="لا توجد سجلات" /> : (
              <div className="overflow-x-auto max-h-[450px] overflow-y-auto rounded-xl border border-border bg-card">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-muted/80 border-b border-border">
                      {['#','الإجراء','النوع','التجهيز','الجهة','المكلف','المستخدم','التاريخ'].map(h => (
                        <th key={h} className="text-right px-3 py-2.5 font-bold text-muted-foreground whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {displayedAudit.map((log: any) => (
                      <tr key={log.id} onClick={() => setActiveLog(log)} className="hover:bg-primary/5 cursor-pointer transition-colors">
                        <td className="px-3 py-2 text-muted-foreground font-mono">{log.id}</td>
                        <td className="px-3 py-2"><ActionBadge action={log.action} /></td>
                        <td className="px-3 py-2"><span className="text-xs bg-muted px-1.5 py-0.5 rounded-md">{LOG_TABLE_LABELS[log.table] ?? log.table}</span></td>
                        <td className="px-3 py-2 max-w-[130px] truncate text-foreground">{log.equipmentNames?.[0] ?? <span className="text-muted-foreground/40">—</span>}</td>
                        <td className="px-3 py-2 max-w-[110px] truncate text-foreground">{log.counterparty ?? <span className="text-muted-foreground/40">—</span>}</td>
                        <td className="px-3 py-2 max-w-[100px] truncate text-foreground">{log.assignedTo ?? <span className="text-muted-foreground/40">—</span>}</td>
                        <td className="px-3 py-2 text-muted-foreground">{log.user?.name ?? log.user?.email ?? '—'}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-muted-foreground font-mono">{new Date(log.createdAt).toLocaleString('en-GB')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Section 3: التقارير المالية ── */}
      <div className="space-y-3">
        <SectionHead k="financial" label="التقارير المالية" icon={<DollarSign className="w-4 h-4" />} count={activeBudgets.length}
          onExcel={() => {
            const hdrs = [
              { key: 'name', label: 'اسم الاعتماد' }, { key: 'department', label: 'البند' },
              { key: 'amount', label: 'المبلغ المرصود' }, { key: '_spent', label: 'المصروف' },
              { key: '_remaining', label: 'المتبقي' }, { key: '_pct', label: 'نسبة الصرف %' }, { key: 'status', label: 'الحالة' },
            ]
            const rows = budgetsArr.map((b: any) => {
              const spent = (b.expenses||[]).reduce((s: number, e: any) => s + (e.amount||0), 0)
              return { name: b.name, department: b.department ?? '—', amount: b.amount, _spent: spent, _remaining: b.amount - spent, _pct: b.amount > 0 ? Math.round((spent/b.amount)*100) : 0, status: b.status }
            })
            exportExcel(rows, hdrs, 'التقارير المالية', `تقارير_مالية_${unit}.xlsx`)
          }}
          onPDF={() => {
            const hdrs = ['اسم الاعتماد','البند','المبلغ','المصروف','المتبقي','%','الحالة']
            const rows = budgetsArr.map((b: any) => {
              const spent = (b.expenses||[]).reduce((s: number, e: any) => s + (e.amount||0), 0)
              return [b.name, b.department ?? '—', `${numFmt(b.amount)} د.ت`, `${numFmt(spent)} د.ت`, `${numFmt(b.amount - spent)} د.ت`, `${b.amount > 0 ? Math.round((spent/b.amount)*100) : 0}%`, b.status]
            })
            exportPDF(unit, 'التقارير المالية', hdrs, rows, `تقارير_مالية_${unit}.pdf`)
          }}
        />
        {open.financial && (
          <div className="space-y-4 px-1">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'المجموع الإجمالي',   value: `${numFmt(totalBudgetAmt)} د.ت`,             cls: 'bg-blue-100 text-blue-600',    icon: <Layers className="w-4 h-4" /> },
                { label: 'إجمالي المصروف',     value: `${numFmt(totalSpent)} د.ت`,                  cls: 'bg-orange-100 text-orange-600', icon: <ArrowUpFromLine className="w-4 h-4" /> },
                { label: 'المتبقي الإجمالي',   value: `${numFmt(totalBudgetAmt - totalSpent)} د.ت`, cls: (totalBudgetAmt - totalSpent) < 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600', icon: <ArrowDownToLine className="w-4 h-4" /> },
                { label: 'قريبة الاستهلاك',    value: activeBudgets.filter((b: any) => { const s = (b.expenses||[]).reduce((e: number, ex: any) => e + (ex.amount||0), 0); return b.amount > 0 && s/b.amount >= 0.7 }).length, cls: 'bg-yellow-100 text-yellow-600', icon: <AlertTriangle className="w-4 h-4" /> },
              ].map((k, i) => (
                <div key={i} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${k.cls}`}>{k.icon}</div>
                  <div><p className="text-xs text-muted-foreground">{k.label}</p><p className="text-sm font-bold text-foreground">{k.value}</p></div>
                </div>
              ))}
            </div>
            {activeBudgets.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="text-xs font-bold text-foreground mb-3">مقارنة الاعتماد المرصود مقابل المصروف</p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={activeBudgets.map((b: any) => {
                    const s = (b.expenses||[]).reduce((e: number, ex: any) => e + (ex.amount||0), 0)
                    return { name: (b.name||b.department||'').slice(0,14), الاعتماد: b.amount, المصروف: s }
                  })}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip {...TooltipStyle} formatter={(v: any) => [`${Number(v).toLocaleString()} د.ت`]} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="الاعتماد"  fill="#3b82f6" radius={[4,4,0,0]} />
                    <Bar dataKey="المصروف" fill="#f59e0b" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            {budgetsArr.length === 0 ? <EmptyBlock message="لا توجد اعتمادات" /> : (
              <div className="space-y-3">
                {budgetsArr.map((b: any) => {
                  const spent = (b.expenses||[]).reduce((s: number, e: any) => s + (e.amount||0), 0)
                  const pct   = b.amount > 0 ? Math.min(Math.round((spent/b.amount)*100), 100) : 0
                  const danger = pct >= 90; const warn = pct >= 70
                  return (
                    <div key={b.id} className="bg-card border border-border rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div><p className="text-sm font-semibold text-foreground">{b.name}</p><p className="text-xs text-muted-foreground">{b.department}</p></div>
                        <div className="text-left"><p className="text-xs text-muted-foreground">المتبقي</p>
                          <p className={`text-base font-bold ${danger ? 'text-red-600' : warn ? 'text-yellow-600' : 'text-foreground'}`}>{numFmt(b.amount - spent)} د.ت</p>
                        </div>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>المصروف: {numFmt(spent)} د.ت</span><span className="font-semibold">{pct}%</span><span>الاعتماد: {numFmt(b.amount)} د.ت</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full ${danger ? 'bg-red-500' : warn ? 'bg-yellow-500' : 'bg-primary'}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Section 4: التقرير الشهري ── */}
      <div className="space-y-3">
        <SectionHead k="monthly" label="التقرير الشهري" icon={<Calendar className="w-4 h-4" />} count={reportData?.totalRows}
          onExcel={reportData?.logs?.length ? () => {
            const hdrs = [
              { key: 'id', label: '#' }, { key: '_action', label: 'الإجراء' }, { key: '_table', label: 'النوع' },
              { key: '_equip', label: 'التجهيز' }, { key: '_cpty', label: 'الجهة' }, { key: '_assigned', label: 'المكلف' },
              { key: '_user', label: 'المستخدم' }, { key: '_date', label: 'التاريخ' },
            ]
            const rows = (reportData.logs as any[]).map((l: any) => ({
              id: l.id, _action: LOG_ACTION_LABELS[l.action] ?? l.action, _table: LOG_TABLE_LABELS[l.table] ?? l.table,
              _equip: l.equipmentNames?.slice(0,2).join('، ') ?? '—', _cpty: l.counterparty ?? '—',
              _assigned: l.assignedTo ?? '—', _user: l.user?.name ?? l.user?.email ?? '—',
              _date: new Date(l.createdAt).toLocaleString('en-GB'),
            }))
            exportExcel(rows, hdrs, 'التقرير الشهري', `تقرير_شهري_${unit}_${rptYear}_${rptMonth}.xlsx`)
          } : undefined}
          onPDF={reportData?.logs?.length ? () => {
            const hdrs = ['#','الإجراء','النوع','التجهيز','الجهة','المكلف','المستخدم','التاريخ']
            const rows = (reportData.logs as any[]).map((l: any) => [
              String(l.id), LOG_ACTION_LABELS[l.action] ?? l.action, LOG_TABLE_LABELS[l.table] ?? l.table,
              l.equipmentNames?.slice(0,2).join('، ') ?? '—', l.counterparty ?? '—', l.assignedTo ?? '—',
              l.user?.name ?? l.user?.email ?? '—', new Date(l.createdAt).toLocaleString('en-GB'),
            ])
            exportPDF(unit, `التقرير الشهري — ${AR_MONTHS_LOG[rptMonth-1]} ${rptYear}`, hdrs, rows, `تقرير_شهري_${unit}_${rptYear}_${rptMonth}.pdf`)
          } : undefined}
        />
        {open.monthly && (
          <div className="space-y-4 px-1">
            <div className="flex flex-wrap gap-3 items-end bg-card border border-border rounded-xl p-4">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">الشهر</label>
                <select value={rptMonth} onChange={e => setRptMonth(Number(e.target.value))}
                  className="text-xs border border-border rounded-lg px-2 py-1.5 bg-background text-foreground">
                  {AR_MONTHS_LOG.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">السنة</label>
                <select value={rptYear} onChange={e => setRptYear(Number(e.target.value))}
                  className="text-xs border border-border rounded-lg px-2 py-1.5 bg-background text-foreground">
                  {[now.getFullYear(), now.getFullYear()-1, now.getFullYear()-2].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
            {rptLoading ? <LoadingBlock /> : reportData ? (
              <>
                {reportData.summary && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {Object.entries(reportData.summary as Record<string, number>).map(([action, count]) => (
                      <div key={action} className="bg-card border border-border rounded-xl p-3 text-center">
                        <p className="text-xl font-bold text-foreground">{count as number}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{LOG_ACTION_LABELS[action] ?? action}</p>
                      </div>
                    ))}
                  </div>
                )}
                {reportData.logs?.length > 0 && (() => {
                  const dayMap: Record<number, number> = {}
                  reportData.logs.forEach((l: any) => { const d = new Date(l.createdAt).getDate(); dayMap[d] = (dayMap[d] ?? 0) + 1 })
                  const chartData = Object.entries(dayMap).sort((a, b) => Number(a[0]) - Number(b[0])).map(([d, c]) => ({ day: d, count: c }))
                  return (
                    <div className="bg-card border border-border rounded-xl p-4">
                      <p className="text-xs font-bold text-foreground mb-3">توزيع العمليات اليومية — {reportData.monthName} {reportData.year}</p>
                      <ResponsiveContainer width="100%" height={160}>
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                          <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                          <Tooltip {...TooltipStyle} formatter={(v: any) => [v, 'عدد']} />
                          <Bar dataKey="count" fill="#3b82f6" radius={[3,3,0,0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )
                })()}
                <div className="overflow-x-auto max-h-[400px] overflow-y-auto rounded-xl border border-border bg-card">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-muted/80 border-b border-border">
                        {['#','الإجراء','النوع','التجهيز','الجهة','المكلف','المستخدم','التاريخ'].map(h => (
                          <th key={h} className="text-right px-3 py-2 font-bold text-muted-foreground whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {reportData.logs.map((log: any) => (
                        <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-3 py-2 text-muted-foreground font-mono">{log.id}</td>
                          <td className="px-3 py-2"><ActionBadge action={log.action} /></td>
                          <td className="px-3 py-2"><span className="text-xs bg-muted px-1.5 py-0.5 rounded-md">{LOG_TABLE_LABELS[log.table] ?? log.table}</span></td>
                          <td className="px-3 py-2 max-w-[120px] truncate text-foreground">{log.equipmentNames?.slice(0,2).join('، ') ?? '—'}</td>
                          <td className="px-3 py-2 max-w-[100px] truncate text-foreground">{log.counterparty ?? '—'}</td>
                          <td className="px-3 py-2 max-w-[100px] truncate text-foreground">{log.assignedTo ?? '—'}</td>
                          <td className="px-3 py-2 text-muted-foreground">{log.user?.name ?? log.user?.email ?? '—'}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-muted-foreground font-mono">{new Date(log.createdAt).toLocaleString('en-GB')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : <div className="h-24 flex items-center justify-center rounded-xl border border-border bg-card text-xs text-muted-foreground">اختر الشهر والسنة لعرض التقرير</div>}
          </div>
        )}
      </div>

      {/* ── Section 5: جرد التجهيزات ── */}
      <div className="space-y-3">
        <SectionHead k="inventory" label="جرد التجهيزات" icon={<PackageSearch className="w-4 h-4" />} count={invFiltered.length}
          onExcel={() => {
            const hdrs = [
              { key: 'name', label: 'اسم التجهيز' }, { key: 'category', label: 'الفئة' },
              { key: 'totalReceived', label: 'إجمالي المستلم' }, { key: 'totalDistributed', label: 'إجمالي الموزع' },
              { key: 'currentStock', label: 'الرصيد الحالي' }, { key: '_status', label: 'الحالة' },
            ]
            const rows = invFiltered.map((it: any) => ({
              name: it.name, category: it.category ?? '—', totalReceived: it.totalReceived,
              totalDistributed: it.totalDistributed, currentStock: it.currentStock,
              _status: it.currentStock === 0 ? 'نفذ' : (it.lowStockThreshold != null && it.currentStock <= it.lowStockThreshold ? 'منخفض' : 'طبيعي'),
            }))
            exportExcel(rows, hdrs, 'جرد التجهيزات', `جرد_تجهيزات_${unit}.xlsx`)
          }}
          onPDF={() => {
            const hdrs = ['اسم التجهيز','الفئة','المستلم','الموزع','الرصيد','الحالة']
            const rows = invFiltered.map((it: any) => [
              it.name, it.category ?? '—', String(it.totalReceived), String(it.totalDistributed), String(it.currentStock),
              it.currentStock === 0 ? 'نفذ' : (it.lowStockThreshold != null && it.currentStock <= it.lowStockThreshold ? 'منخفض' : 'طبيعي'),
            ])
            exportPDF(unit, 'جرد التجهيزات', hdrs, rows, `جرد_تجهيزات_${unit}.pdf`)
          }}
        />
        {open.inventory && (
          <div className="space-y-4 px-1">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: 'أصناف التجهيزات', value: inventory.length,                                                                                                                     cls: 'bg-blue-100 text-blue-600',    icon: <Package className="w-4 h-4" /> },
                { label: 'الرصيد الإجمالي', value: inventory.reduce((s: number, i: any) => s + i.currentStock, 0),                                                                     cls: 'bg-violet-100 text-violet-600', icon: <Warehouse className="w-4 h-4" /> },
                { label: 'إجمالي المستلم',  value: inventory.reduce((s: number, i: any) => s + i.totalReceived, 0),                                                                    cls: 'bg-green-100 text-green-600',  icon: <ArrowDownToLine className="w-4 h-4" /> },
                { label: 'إجمالي الموزع',   value: inventory.reduce((s: number, i: any) => s + i.totalDistributed, 0),                                                                 cls: 'bg-orange-100 text-orange-600', icon: <ArrowUpFromLine className="w-4 h-4" /> },
                { label: 'مخزون منخفض',     value: inventory.filter((i: any) => i.lowStockThreshold != null && i.currentStock > 0 && i.currentStock <= i.lowStockThreshold).length,  cls: 'bg-yellow-100 text-yellow-600', icon: <TrendingDown className="w-4 h-4" /> },
                { label: 'نفذ المخزون',      value: inventory.filter((i: any) => i.currentStock === 0).length,                                                                          cls: 'bg-red-100 text-red-600',      icon: <AlertTriangle className="w-4 h-4" /> },
              ].map((k, i) => (
                <div key={i} className="bg-card border border-border rounded-xl p-3 flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${k.cls}`}>{k.icon}</div>
                  <div><p className="text-[10px] text-muted-foreground">{k.label}</p><p className="text-lg font-bold text-foreground">{k.value}</p></div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <div className="relative">
                <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input value={invSearch} onChange={e => setInvSearch(e.target.value)}
                  placeholder="ابحث باسم التجهيز..." className="pr-7 pl-3 py-1.5 text-xs border border-border rounded-lg bg-card w-44 text-foreground" />
              </div>
              <select value={invCategory} onChange={e => setInvCategory(e.target.value)}
                className="text-xs border border-border rounded-lg px-2 py-1.5 bg-card text-foreground">
                <option value="">كل الفئات</option>
                {allCategories.map((c: string) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={invStockStatus} onChange={e => setInvStockStatus(e.target.value)}
                className="text-xs border border-border rounded-lg px-2 py-1.5 bg-card text-foreground">
                <option value="all">كل الحالات</option>
                <option value="normal">طبيعي</option>
                <option value="low">منخفض</option>
                <option value="out">نفذ</option>
              </select>
              {(invSearch || invCategory || invStockStatus !== 'all') && (
                <button onClick={() => { setInvSearch(''); setInvCategory(''); setInvStockStatus('all') }}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                  <X className="w-3 h-3" /> مسح
                </button>
              )}
            </div>
            {invLoading ? <LoadingBlock /> : invFiltered.length === 0 ? <EmptyBlock message="لا توجد نتائج" /> : (
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      {['','اسم التجهيز','الفئة','الدخل','المستلم','الخرج','الموزع','الرصيد','الحالة'].map(h => (
                        <th key={h} className="text-right px-3 py-2.5 font-bold text-muted-foreground whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {invFiltered.map((it: any) => {
                      const isExp = invExpandedId === it.id
                      return (
                        <React.Fragment key={it.id}>
                          <tr onClick={() => setInvExpandedId(isExp ? null : it.id)}
                            className={`cursor-pointer transition-colors ${isExp ? 'bg-primary/5' : 'hover:bg-muted/40'}`}>
                            <td className="px-3 py-2.5 text-muted-foreground">{isExp ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}</td>
                            <td className="px-3 py-2.5 font-semibold text-foreground">{it.name}</td>
                            <td className="px-3 py-2.5 text-muted-foreground">{it.category ?? '—'}</td>
                            <td className="px-3 py-2.5 text-center"><span className="text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">{it.receptions.length}</span></td>
                            <td className="px-3 py-2.5 font-bold text-green-700">{it.totalReceived}</td>
                            <td className="px-3 py-2.5 text-center"><span className="text-xs font-semibold text-purple-600 bg-purple-50 border border-purple-100 px-2 py-0.5 rounded-full">{it.distributions.length}</span></td>
                            <td className="px-3 py-2.5 font-bold text-orange-700">{it.totalDistributed}</td>
                            <td className={`px-3 py-2.5 font-bold ${it.currentStock===0?'text-red-600':it.lowStockThreshold!=null&&it.currentStock<=it.lowStockThreshold?'text-yellow-600':'text-foreground'}`}>{it.currentStock}</td>
                            <td className="px-3 py-2.5"><StockBadge it={it} /></td>
                          </tr>
                          {isExp && (
                            <tr className="bg-muted/20">
                              <td colSpan={9} className="px-4 py-3">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                  <div>
                                    <p className="text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1"><ArrowDownToLine className="w-3 h-3 text-green-600" /> حركات الاستلام ({it.receptions.length})</p>
                                    {it.receptions.length === 0 ? <p className="text-xs text-muted-foreground italic">لا توجد</p> : (
                                      <div className="rounded-lg border border-border overflow-hidden">
                                        <table className="w-full text-xs">
                                          <thead><tr className="bg-green-50 border-b border-green-100">
                                            {['نوع المرجع','الكمية','الرقم الإداري','المورد','التاريخ'].map(h => <th key={h} className="text-right px-2 py-1 font-semibold text-green-800">{h}</th>)}
                                          </tr></thead>
                                          <tbody className="divide-y divide-border">
                                            {it.receptions.map((r: any, ri: number) => (
                                              <tr key={ri} className={ri%2===0?'bg-white':'bg-green-50/30'}>
                                                <td className="px-2 py-1">{r.referenceType ?? '—'}</td>
                                                <td className="px-2 py-1 font-bold text-green-700">{r.quantity}</td>
                                                <td className="px-2 py-1">{r.adminNumber ?? '—'}</td>
                                                <td className="px-2 py-1">{r.supplierName ?? '—'}</td>
                                                <td className="px-2 py-1 whitespace-nowrap">{new Date(r.createdAt).toLocaleDateString('en-GB')}</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}
                                  </div>
                                  <div>
                                    <p className="text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1"><ArrowUpFromLine className="w-3 h-3 text-orange-600" /> حركات التوزيع ({it.distributions.length})</p>
                                    {it.distributions.length === 0 ? <p className="text-xs text-muted-foreground italic">لا توجد</p> : (
                                      <div className="rounded-lg border border-border overflow-hidden">
                                        <table className="w-full text-xs">
                                          <thead><tr className="bg-orange-50 border-b border-orange-100">
                                            {['نوع المرجع','الكمية','الرقم الإداري','الجهة','المكلف','التاريخ'].map(h => <th key={h} className="text-right px-2 py-1 font-semibold text-orange-800">{h}</th>)}
                                          </tr></thead>
                                          <tbody className="divide-y divide-border">
                                            {it.distributions.map((d: any, di: number) => (
                                              <tr key={di} className={di%2===0?'bg-white':'bg-orange-50/30'}>
                                                <td className="px-2 py-1">{d.referenceType ?? '—'}</td>
                                                <td className="px-2 py-1 font-bold text-orange-700">{d.quantity}</td>
                                                <td className="px-2 py-1">{d.adminNumber ?? '—'}</td>
                                                <td className="px-2 py-1">{d.beneficiaryName ?? '—'}</td>
                                                <td className="px-2 py-1">{d.assignedTo ?? '—'}</td>
                                                <td className="px-2 py-1 whitespace-nowrap">{new Date(d.createdAt).toLocaleDateString('en-GB')}</td>
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
                <div className="border-t border-border bg-muted/30 px-4 py-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                  <span>الأصناف: <strong className="text-foreground">{invFiltered.length}</strong></span>
                  <span>الرصيد: <strong className="text-foreground">{invFiltered.reduce((s: number, i: any) => s + i.currentStock, 0).toLocaleString()}</strong></span>
                  <span>المستلم: <strong className="text-green-700">{invFiltered.reduce((s: number, i: any) => s + i.totalReceived, 0).toLocaleString()}</strong></span>
                  <span>الموزع: <strong className="text-orange-700">{invFiltered.reduce((s: number, i: any) => s + i.totalDistributed, 0).toLocaleString()}</strong></span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Log detail modal */}
      {activeLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setActiveLog(null)} />
          <div className="relative w-full max-w-md rounded-xl border border-border bg-card shadow-2xl z-10">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <p className="text-sm font-bold text-foreground">تفاصيل السجل #{activeLog.id}</p>
              <button onClick={() => setActiveLog(null)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3">
              <Field label="الإجراء"        value={<ActionBadge action={activeLog.action} />} />
              <Field label="الجدول"         value={LOG_TABLE_LABELS[activeLog.table] ?? activeLog.table} />
              <Field label="نوع المعاملة"   value={activeLog.transactionType ?? '—'} />
              <Field label="رقم السجل"      value={String(activeLog.recordId ?? '—')} mono />
              <Field label="الجهة / المورد" value={activeLog.counterparty ?? '—'} />
              <Field label="المكلف بالسحب"  value={activeLog.assignedTo ?? '—'} />
              <Field label="المستخدم"       value={activeLog.user?.name ?? activeLog.user?.email ?? '—'} />
              <Field label="التاريخ"        value={new Date(activeLog.createdAt).toLocaleString('en-GB')} />
              {activeLog.equipmentNames?.length > 0 && (
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground mb-1">التجهيزات</p>
                  <div className="flex flex-wrap gap-1.5">
                    {activeLog.equipmentNames.map((n: string, i: number) => (
                      <span key={i} className="text-xs bg-muted px-2 py-0.5 rounded-md border border-border">{n}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
/* ══════════════════════════════════════════════════════════════════ */
/*  Receipt View Modal (Monitoring)                                   */
/* ══════════════════════════════════════════════════════════════════ */
function ReceiptViewModal({ receiptId, securityUnit, onClose }: { receiptId: number; securityUnit: string; onClose: () => void }) {
  const templateId = `receipt-mon-${receiptId}`
  const { data, isLoading } = useQuery(
    ['receipt', receiptId],
    () => client.get(`/receipts/${receiptId}`).then(r => r.data.data),
    { staleTime: 60000 },
  )
  const SMETA: Record<string, { label: string; cls: string }> = {
    DRAFT:     { label: 'مسودة',       cls: 'bg-yellow-100 text-yellow-700' },
    APPROVED:  { label: 'مصادق عليه',  cls: 'bg-green-100 text-green-700' },
    CANCELLED: { label: 'ملغي',        cls: 'bg-red-100 text-red-700' },
  }
  const sMeta = data ? (SMETA[data.status] ?? null) : null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-4xl bg-card border border-border rounded-2xl shadow-2xl z-10 max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-primary" />
            <h3 className="font-bold text-sm text-foreground">وصل تسلم و تسليم</h3>
            {sMeta && <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${sMeta.cls}`}>{sMeta.label}</span>}
            {data && <span className="text-xs text-muted-foreground font-mono">{data.serialNumber}</span>}
          </div>
          <div className="flex items-center gap-2">
            {data && (
              <button onClick={() => downloadPDF(templateId, `وصل_${data.serialNumber}.pdf`)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors">
                <Printer className="w-3.5 h-3.5" /> PDF
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4">
          {isLoading
            ? <div className="flex flex-col items-center justify-center py-20 text-muted-foreground"><RefreshCw className="w-5 h-5 animate-spin mb-2" /><span className="text-sm">جارٍ تحميل الوصل...</span></div>
            : data
              ? <div className="mx-auto overflow-x-auto flex justify-center"><ReceiptPrintTemplate id={templateId} receipt={data} currentUser={{ securityUnit }} /></div>
              : <div className="flex flex-col items-center justify-center py-20 text-muted-foreground"><Package className="w-10 h-10 opacity-20 mb-2" /><span className="text-sm">لم يتم العثور على الوصل</span></div>}
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════ */
/*  Receipts Tab                                                      */
/* ══════════════════════════════════════════════════════════════════ */
function ReceiptsTab({ unit }: { unit: string }) {
  const encoded = encodeURIComponent(unit)
  const [search, setSearch]               = useState('')
  const [statusFilter, setStatusFilter]   = useState<string>('ALL')
  const [viewReceiptId, setViewReceiptId] = useState<number | null>(null)
  const [viewAtt, setViewAtt]             = useState<{ name: string; data: string; type: string } | null>(null)

  const { data: receipts = [], isLoading } = useQuery(
    ['monitoring', unit, 'receipts'],
    () => client.get(`/monitoring/units/${encoded}/receipts`).then(r => r.data.data),
    { staleTime: 30000 },
  )

  const SMETA: Record<string, { label: string; cls: string }> = {
    DRAFT:     { label: 'مسودة',       cls: 'bg-yellow-100 text-yellow-700' },
    APPROVED:  { label: 'مصادق عليه',  cls: 'bg-green-100 text-green-700' },
    CANCELLED: { label: 'ملغي',        cls: 'bg-red-100 text-red-700' },
  }

  const stats = useMemo(() => ({
    total:     receipts.length,
    approved:  receipts.filter((r: any) => r.status === 'APPROVED').length,
    draft:     receipts.filter((r: any) => r.status === 'DRAFT').length,
    cancelled: receipts.filter((r: any) => r.status === 'CANCELLED').length,
    attached:  receipts.filter((r: any) => r.signedAttachment).length,
  }), [receipts])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return receipts.filter((r: any) => {
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false
      if (!q) return true
      const d = r.distribution ?? {}
      return (
        r.serialNumber.toLowerCase().includes(q) ||
        (d.beneficiary?.name ?? '').toLowerCase().includes(q) ||
        (d.assignedTo ? `${d.assignedTo.rank} ${d.assignedTo.name} ${d.assignedTo.surname}`.toLowerCase().includes(q) : false) ||
        (d.deliveredByName ?? '').toLowerCase().includes(q) ||
        (d.user?.name ?? '').toLowerCase().includes(q) ||
        (r.createdBy?.name ?? '').toLowerCase().includes(q)
      )
    })
  }, [receipts, search, statusFilter])

  const hdrs = [
    { key: 'serial',      label: 'الرقم التسلسلي' },
    { key: 'status',      label: 'الحالة' },
    { key: 'beneficiary', label: 'الجهة المنتفعة' },
    { key: 'assignedTo',  label: 'المتسلِّم' },
    { key: 'deliveredBy', label: 'المسلِّم' },
    { key: 'itemsCount',  label: 'عدد التجهيزات' },
    { key: 'hasAtt',      label: 'وصل ممضي' },
    { key: 'date',        label: 'التاريخ' },
  ]
  const exportRows = filtered.map((r: any) => ({
    serial:      r.serialNumber,
    status:      SMETA[r.status]?.label ?? r.status,
    beneficiary: r.distribution?.beneficiary?.name ?? '—',
    assignedTo:  r.distribution?.assignedTo ? `${r.distribution.assignedTo.rank} ${r.distribution.assignedTo.name} ${r.distribution.assignedTo.surname}` : '—',
    deliveredBy: r.distribution?.deliveredByName ?? r.distribution?.user?.name ?? '—',
    itemsCount:  r.distribution?.items?.length ?? 0,
    hasAtt:      r.signedAttachment ? 'نعم' : 'لا',
    date:        fmtD(r.createdAt),
  }))

  if (isLoading) return <LoadingBlock />

  return (
    <div className="p-4 space-y-4">
      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'إجمالي الوصولات', value: stats.total,     cls: 'text-foreground',   bg: 'bg-muted/30' },
          { label: 'مصادق عليه',      value: stats.approved,  cls: 'text-green-600',    bg: 'bg-green-50 dark:bg-green-950/30' },
          { label: 'مسودة',           value: stats.draft,     cls: 'text-yellow-600',   bg: 'bg-yellow-50 dark:bg-yellow-950/30' },
          { label: 'ملغي',            value: stats.cancelled, cls: 'text-red-600',      bg: 'bg-red-50 dark:bg-red-950/30' },
          { label: 'ممضية (مرفق وصل)', value: stats.attached, cls: 'text-blue-600',    bg: 'bg-blue-50 dark:bg-blue-950/30' },
        ].map((s, i) => (
          <div key={i} className={`${s.bg} rounded-xl p-3 text-center border border-border`}>
            <p className="text-[10px] text-muted-foreground mb-0.5">{s.label}</p>
            <p className={`text-xl font-extrabold ${s.cls}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search + status filter + export */}
      <div className="flex flex-wrap gap-2 items-center">
        <SearchInput value={search} onChange={setSearch} placeholder="بحث في الوصولات..." />
        <div className="flex gap-1 flex-wrap">
          {([['ALL', 'الكل'], ['APPROVED', 'مصادق عليه'], ['DRAFT', 'مسودة'], ['CANCELLED', 'ملغي']] as const).map(([k, l]) => (
            <button key={k} onClick={() => setStatusFilter(k)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === k ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              }`}>{l}</button>
          ))}
        </div>
        <div className="flex-1" />
        <ExportBar unit={unit} tabLabel="وصولات التسليم" count={filtered.length}
          onExcel={() => exportExcel(exportRows, hdrs, 'وصولات', `وصولات_${unit}.xlsx`)}
          onPDF={() => exportPDF(unit, 'وصولات التسلم و التسليم', hdrs.map(h => h.label),
            exportRows.map(r => hdrs.map(h => String((r as any)[h.key] ?? '—'))), `وصولات_${unit}.pdf`)} />
      </div>

      {/* Table */}
      {filtered.length === 0 ? <EmptyBlock message="لا توجد وصولات" /> : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {['الرقم التسلسلي', 'الحالة', 'الجهة المنتفعة', 'المتسلِّم', 'المسلِّم', 'عدد التجهيزات', 'وصل ممضي', 'التاريخ', ''].map(h => (
                  <th key={h} className="text-right px-3 py-2.5 font-bold text-xs text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((r: any) => {
                const d = r.distribution ?? {}
                const smeta = SMETA[r.status]
                let att: { name: string; data: string; type: string } | null = null
                if (r.signedAttachment) try { att = JSON.parse(r.signedAttachment) } catch {}
                return (
                  <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-3 py-2.5 font-mono font-semibold text-foreground whitespace-nowrap">{r.serialNumber}</td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${smeta?.cls ?? ''}`}>{smeta?.label ?? r.status}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      {d.beneficiary
                        ? <div className="flex items-center gap-1.5"><div className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center shrink-0"><Building2 className="w-2.5 h-2.5 text-purple-600" /></div><span className="font-medium text-foreground">{d.beneficiary.name}</span></div>
                        : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      {d.assignedTo
                        ? <div className="flex items-center gap-1.5"><div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center shrink-0"><Users className="w-2.5 h-2.5 text-green-600" /></div><span className="font-medium text-foreground">{d.assignedTo.rank} {d.assignedTo.name} {d.assignedTo.surname}</span></div>
                        : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1"><div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center shrink-0"><ArrowUpFromLine className="w-2.5 h-2.5 text-blue-600" /></div><span className="text-foreground">{d.deliveredByName ?? d.user?.name ?? '—'}</span></div>
                    </td>
                    <td className="px-3 py-2.5 text-center font-bold text-foreground">{d.items?.length ?? 0}</td>
                    <td className="px-3 py-2.5">
                      {att
                        ? <button onClick={() => setViewAtt(att)} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 transition-colors"><Paperclip className="w-3 h-3" /> عرض</button>
                        : <span className="text-muted-foreground/60 text-[10px]">—</span>}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">{fmtD(r.createdAt)}</td>
                    <td className="px-3 py-2.5">
                      <button onClick={() => setViewReceiptId(r.id)} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold border border-border hover:bg-muted transition-colors"><Eye className="w-3 h-3" /> وصل</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Receipt full view modal */}
      {viewReceiptId !== null && <ReceiptViewModal receiptId={viewReceiptId} securityUnit={unit} onClose={() => setViewReceiptId(null)} />}

      {/* Signed attachment preview */}
      {viewAtt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setViewAtt(null)} />
          <div className="relative w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl z-10 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
              <div className="flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-sm text-foreground">الوصل الممضي</h3>
                <span className="text-xs text-muted-foreground font-mono truncate max-w-xs">{viewAtt.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <a href={viewAtt.data} download={viewAtt.name}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-green-200 bg-green-50 text-green-700 hover:bg-green-100 transition-colors">
                  <Download className="w-3.5 h-3.5" /> تنزيل
                </a>
                <button onClick={() => setViewAtt(null)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="p-4 flex items-center justify-center bg-gray-50 dark:bg-gray-900 min-h-[400px]">
              {viewAtt.type?.startsWith('image/')
                ? <img src={viewAtt.data} alt={viewAtt.name} className="max-w-full max-h-[65vh] object-contain rounded-lg shadow" />
                : viewAtt.type === 'application/pdf'
                  ? <iframe src={viewAtt.data} className="w-full h-[65vh] rounded-lg" title={viewAtt.name} />
                  : <div className="text-center text-muted-foreground"><Paperclip className="w-12 h-12 mx-auto mb-3 opacity-30" /><p className="text-sm mb-2">لا يمكن معاينة هذا الملف</p><a href={viewAtt.data} download={viewAtt.name} className="text-primary hover:underline text-sm">تنزيل الملف</a></div>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Fuel Tab (المحروقات)                                              */
/* ═══════════════════════════════════════════════════════════════════ */
const MONTHS_AR = ['جانفي','فيفري','مارس','أفريل','ماي','جوان','جويلية','أوت','سبتمبر','أكتوبر','نوفمبر','ديسمبر']
const fmtF = (n?: number | null, dec = 2) => n == null ? '—' : parseFloat(n.toFixed(dec)).toString()

const computeFuelRow = (rec: any, price: number, quota: number) => {
  const delivered  = rec.deliveredAmount ?? (quota * price)
  const additional = rec.additionalAmount ?? 0
  const consumedRaw = rec.consumedAmount ?? null
  const consumed    = consumedRaw ?? 0
  const surplusVal  = consumedRaw != null ? (delivered + additional) - consumedRaw : null
  const surplus     = surplusVal != null && surplusVal > 0 ? surplusVal : 0
  const deficit     = (quota * price) - delivered
  const distance    = (rec.endMileage != null && rec.startMileage != null)
    ? rec.endMileage - rec.startMileage : null
  const consRate    = (consumedRaw != null && consumedRaw > 0 && price > 0 && distance && distance > 0)
    ? (consumedRaw / price * 100) / distance : null
  return { delivered, additional, consumed, surplus,
    surplusNull: consumedRaw === null,
    deficit: deficit > 0 ? deficit : 0, distance, consRate }
}

function FuelTab({ unit }: { unit: string }) {
  const now = new Date()
  const [selMonth, setSelMonth] = useState(now.getMonth() + 1)
  const [selYear,  setSelYear]  = useState(now.getFullYear())
  const [search, setSearch] = useState('')
  const [selFuelType, setSelFuelType] = useState<string>('all')
  const [selected, setSelected] = useState<any>(null)

  const { data: fuelData, isLoading } = useQuery(
    ['monitoring', unit, 'fuel', selMonth, selYear],
    async () => {
      const encoded = encodeURIComponent(unit)
      return (await client.get(`/monitoring/units/${encoded}/fuel?month=${selMonth}&year=${selYear}`)).data.data
    }
  )

  const vehicles: any[] = fuelData?.vehicles ?? []
  const prices: any[] = fuelData?.prices ?? []

  const priceMap = useMemo(() => {
    const m: Record<string, number> = {}
    prices.forEach((p: any) => { m[p.fuelType] = p.pricePerLiter })
    return m
  }, [prices])

  const getPriceForVehicle = (v: any) => priceMap[v.fuelType] ?? 0

  const fuelTypeTabs = useMemo(() => {
    const types = Array.from(new Set(vehicles.map((v: any) => v.fuelType).filter(Boolean))) as string[]
    return types.sort()
  }, [vehicles])

  const filteredByType = useMemo(() => {
    if (selFuelType === 'all') return vehicles
    return vehicles.filter((v: any) => v.fuelType === selFuelType)
  }, [vehicles, selFuelType])

  const stats = useMemo(() => {
    let totalQuotaLiters = 0, totalDelivered = 0, totalAdditional = 0, totalConsumed = 0, totalSurplus = 0, totalDeficit = 0
    filteredByType.forEach((v: any) => {
      const quota = v.fuelQuota ?? 0
      const price = getPriceForVehicle(v)
      const rec = (v.fuelRecords ?? [])[0]
      const c = computeFuelRow(rec ?? {}, price, quota)
      totalQuotaLiters += quota
      totalDelivered   += c.delivered
      totalAdditional  += c.additional
      totalConsumed    += c.consumed
      totalSurplus     += c.surplus
      totalDeficit     += c.deficit
    })
    return { totalQuotaLiters, totalDelivered, totalAdditional, totalConsumed, totalSurplus, totalDeficit }
  }, [filteredByType, priceMap])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return filteredByType
    return filteredByType.filter((v: any) =>
      v.adminNumber?.toLowerCase().includes(q) ||
      (v.vehicleType || '').toLowerCase().includes(q) ||
      v.type?.toLowerCase().includes(q) ||
      (v.entity?.name || '').toLowerCase().includes(q)
    )
  }, [filteredByType, search])

  const FUEL_HEADERS = ['الرقم الإداري', 'نوع الوسيلة', 'المقرر (لتر)', 'المسلم (د.ت)', 'الإضافي (د.ت)', 'المستهلك (د.ت)', 'الفائض (د.ت)', 'النقص (د.ت)', 'عداد أول الشهر', 'عداد آخر الشهر', 'المسافة المقطوعة (كلم)', 'المعدل المئوي', 'ملاحظات']

  if (isLoading) return <LoadingBlock />

  return (
    <div className="p-5 space-y-4">
      {/* Month/Year selector + search */}
      <div className="flex items-center gap-3 flex-wrap">
        <select value={selMonth} onChange={e => setSelMonth(+e.target.value)}
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          {MONTHS_AR.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
        </select>
        <input type="number" value={selYear} onChange={e => setSelYear(+e.target.value)} min={2020} max={2099}
          className="w-20 rounded-lg border border-input bg-background px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-ring" />
        <SearchInput value={search} onChange={setSearch} placeholder="بحث..." />
        <ExportBar unit={unit} tabLabel="المحروقات" count={filtered.length}
          onExcel={() => {
            const hdrs = FUEL_HEADERS.map((label, i) => ({ key: `c${i}`, label }))
            const rows = filtered.map((v: any) => {
              const quota = v.fuelQuota ?? 0
              const price = getPriceForVehicle(v)
              const rec = (v.fuelRecords ?? [])[0] ?? {}
              const c = computeFuelRow(rec, price, quota)
              return {
                c0: v.adminNumber, c1: v.vehicleType || v.type, c2: quota,
                c3: fmtF(c.delivered), c4: fmtF(c.additional), c5: fmtF(c.consumed),
                c6: fmtF(c.surplus), c7: fmtF(c.deficit), c8: fmtF(rec.startMileage),
                c9: fmtF(rec.endMileage), c10: fmtF(c.distance), c11: c.consRate != null ? fmtF(c.consRate) + '%' : '—',
                c12: rec.notes || '—',
              }
            })
            exportExcel(rows, hdrs, 'المحروقات', `محروقات_${unit}.xlsx`)
          }}
          onPDF={() => {
            const rows = filtered.map((v: any) => {
              const quota = v.fuelQuota ?? 0
              const price = getPriceForVehicle(v)
              const rec = (v.fuelRecords ?? [])[0] ?? {}
              const c = computeFuelRow(rec, price, quota)
              return [v.adminNumber, v.vehicleType || v.type, String(quota),
                fmtF(c.delivered), fmtF(c.additional), fmtF(c.consumed),
                fmtF(c.surplus), fmtF(c.deficit), fmtF(rec.startMileage),
                fmtF(rec.endMileage), fmtF(c.distance), c.consRate != null ? fmtF(c.consRate) + '%' : '—',
                rec.notes || '—']
            })
            exportPDF(unit, `المحروقات — ${MONTHS_AR[selMonth-1]} ${selYear}`, FUEL_HEADERS, rows, `محروقات_${unit}.pdf`,
              `<div style="display:flex;gap:16px;flex-wrap:wrap;">
                <div style="padding:8px 14px;border:1px solid #cbd5e1;border-radius:8px;font-size:12px;">إجمالي المقرر: <strong>${fmtF(stats.totalQuotaLiters)} لتر</strong></div>
                <div style="padding:8px 14px;border:1px solid #cbd5e1;border-radius:8px;font-size:12px;">المسلم: <strong>${fmtF(stats.totalDelivered)} د.ت</strong></div>
                <div style="padding:8px 14px;border:1px solid #cbd5e1;border-radius:8px;font-size:12px;">المستهلك: <strong>${fmtF(stats.totalConsumed)} د.ت</strong></div>
                <div style="padding:8px 14px;border:1px solid #cbd5e1;border-radius:8px;font-size:12px;">النقص: <strong>${fmtF(stats.totalDeficit)} د.ت</strong></div>
              </div>`)
          }}
        />
      </div>

      {/* Fuel type tabs */}
      {fuelTypeTabs.length > 1 && (
        <div className="flex gap-1 flex-wrap">
          <button onClick={() => setSelFuelType('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${selFuelType === 'all' ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:bg-muted/50'}`}>الكل</button>
          {fuelTypeTabs.map(ft => (
            <button key={ft} onClick={() => setSelFuelType(ft)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${selFuelType === ft ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:bg-muted/50'}`}>{ft}</button>
          ))}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'المقرر (لتر)', value: fmtF(stats.totalQuotaLiters), icon: <FuelIcon className="w-4 h-4" /> },
          { label: 'المسلم (د.ت)',  value: fmtF(stats.totalDelivered),  icon: <DollarSign className="w-4 h-4" /> },
          { label: 'الإضافي (د.ت)', value: fmtF(stats.totalAdditional), icon: <TrendingUp className="w-4 h-4" /> },
          { label: 'المستهلك (د.ت)', value: fmtF(stats.totalConsumed),  icon: <TrendingDown className="w-4 h-4" /> },
          { label: 'الفائض (د.ت)',   value: fmtF(stats.totalSurplus),   icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" /> },
          { label: 'النقص (د.ت)',    value: fmtF(stats.totalDeficit),   icon: <AlertTriangle className="w-4 h-4 text-destructive" /> },
        ].map(c => (
          <div key={c.label} className="rounded-xl border border-border bg-muted/30 p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">{c.icon}<span className="text-[11px]">{c.label}</span></div>
            <p className="text-lg font-bold text-foreground">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? <EmptyBlock message="لا توجد بيانات محروقات" /> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-muted/50 border-b border-border">
              <th className="text-right px-3 py-3 text-xs font-bold text-muted-foreground">الرقم الإداري</th>
              <th className="text-right px-3 py-3 text-xs font-bold text-muted-foreground">نوع الوسيلة</th>
              <th className="text-right px-3 py-3 text-xs font-bold text-muted-foreground">المقرر (لتر)</th>
              <th className="text-right px-3 py-3 text-xs font-bold text-muted-foreground">المسلم (د.ت)</th>
              <th className="text-right px-3 py-3 text-xs font-bold text-muted-foreground">الإضافي</th>
              <th className="text-right px-3 py-3 text-xs font-bold text-muted-foreground">المستهلك</th>
              <th className="text-right px-3 py-3 text-xs font-bold text-muted-foreground">الفائض</th>
              <th className="text-right px-3 py-3 text-xs font-bold text-muted-foreground">النقص</th>
              <th className="text-right px-3 py-3 text-xs font-bold text-muted-foreground">المسافة (كلم)</th>
              <th className="text-right px-3 py-3 text-xs font-bold text-muted-foreground">المعدل المئوي</th>
            </tr></thead>
            <tbody className="divide-y divide-border">
              {filtered.map((v: any) => {
                const quota = v.fuelQuota ?? 0
                const price = getPriceForVehicle(v)
                const rec = (v.fuelRecords ?? [])[0] ?? {}
                const c = computeFuelRow(rec, price, quota)
                return (
                  <tr key={v.id} onClick={() => setSelected(v)} className="hover:bg-primary/5 cursor-pointer transition-colors">
                    <td className="px-3 py-3 font-mono font-medium text-foreground">{v.adminNumber}</td>
                    <td className="px-3 py-3 text-foreground">{v.vehicleType || v.type}</td>
                    <td className="px-3 py-3 text-muted-foreground font-mono">{quota}</td>
                    <td className="px-3 py-3 text-muted-foreground font-mono">{fmtF(c.delivered)}</td>
                    <td className="px-3 py-3 text-muted-foreground font-mono">{fmtF(c.additional)}</td>
                    <td className="px-3 py-3 text-muted-foreground font-mono">{fmtF(c.consumed)}</td>
                    <td className="px-3 py-3 text-muted-foreground font-mono">{fmtF(c.surplus)}</td>
                    <td className="px-3 py-3 font-mono">{c.deficit > 0 ? <span className="text-destructive font-medium">{fmtF(c.deficit)}</span> : '0'}</td>
                    <td className="px-3 py-3 text-muted-foreground font-mono">{fmtF(c.distance)}</td>
                    <td className="px-3 py-3 text-muted-foreground font-mono">{c.consRate != null ? fmtF(c.consRate) + '%' : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="bg-muted/50 font-bold text-xs border-t-2 border-border">
                <td colSpan={2} className="px-3 py-2 text-right">الإجمالي</td>
                <td className="px-3 py-2 font-mono">{fmtF(stats.totalQuotaLiters)}</td>
                <td className="px-3 py-2 font-mono">{fmtF(stats.totalDelivered)}</td>
                <td className="px-3 py-2 font-mono">{fmtF(stats.totalAdditional)}</td>
                <td className="px-3 py-2 font-mono">{fmtF(stats.totalConsumed)}</td>
                <td className="px-3 py-2 font-mono">{fmtF(stats.totalSurplus)}</td>
                <td className="px-3 py-2 font-mono">{fmtF(stats.totalDeficit)}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Detail modal */}
      <DetailModal open={!!selected} onClose={() => setSelected(null)} title={`محروقات: ${selected?.adminNumber ?? ''}`}>
        {selected && (() => {
          const quota = selected.fuelQuota ?? 0
          const price = getPriceForVehicle(selected)
          const rec = (selected.fuelRecords ?? [])[0] ?? {}
          const c = computeFuelRow(rec, price, quota)
          return (
            <div className="grid grid-cols-2 gap-2">
              <Field label="الرقم الإداري" value={selected.adminNumber} mono />
              <Field label="نوع الوسيلة" value={selected.vehicleType || selected.type} />
              <Field label="نوع الوقود" value={selected.fuelType} />
              <Field label="المقرر (لتر)" value={`${quota}`} />
              <Field label="المسلم (د.ت)" value={fmtF(c.delivered)} />
              <Field label="الإضافي (د.ت)" value={fmtF(c.additional)} />
              <Field label="المستهلك (د.ت)" value={fmtF(c.consumed)} />
              <Field label="الفائض (د.ت)" value={fmtF(c.surplus)} />
              <Field label="النقص (د.ت)" value={c.deficit > 0 ? fmtF(c.deficit) : '0'} />
              <Field label="عداد أول الشهر" value={fmtF(rec.startMileage)} />
              <Field label="عداد آخر الشهر" value={fmtF(rec.endMileage)} />
              <Field label="المسافة المقطوعة" value={c.distance != null ? `${fmtF(c.distance)} كلم` : '—'} />
              <Field label="المعدل المئوي" value={c.consRate != null ? fmtF(c.consRate) + '%' : '—'} />
              <Field label="ملاحظات" value={rec.notes || '—'} />
            </div>
          )
        })()}
      </DetailModal>
    </div>
  )
}

function UsersTab({ unit }: { unit: string }) {
  const { data: users = [], isLoading } = useQuery(['monitoring', unit, 'users'], fetchUnitData(unit, 'users'))
  const [selected, setSelected] = useState<any>(null)

  const hdrs = [{ key: 'name', label: 'الاسم' }, { key: 'email', label: 'البريد' }, { key: 'role', label: 'الدور' }, { key: 'personalNumber', label: 'الرقم الشخصي' }, { key: '_date', label: 'تاريخ الإنشاء' }]
  const mapped = users.map((u: any) => ({ ...u, _date: fmtD(u.createdAt) }))

  if (isLoading) return <LoadingBlock />
  return (
    <div className="p-5 space-y-4">
      <ExportBar unit={unit} tabLabel="المستخدمون" count={users.length}
        onExcel={() => exportExcel(mapped, hdrs, 'المستخدمون', `مستخدمون_${unit}.xlsx`)}
        onPDF={() => exportPDF(unit, 'المستخدمون', hdrs.map(h => h.label), mapped.map((u: any) => hdrs.map(h => String(u[h.key] ?? '—'))), `مستخدمون_${unit}.pdf`)} />
      {users.length === 0 ? <EmptyBlock message="لا يوجد مستخدمون" /> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm"><thead><tr className="bg-muted/50 border-b border-border">
            <th className="text-right px-4 py-3 text-xs font-bold text-muted-foreground">الاسم</th>
            <th className="text-right px-4 py-3 text-xs font-bold text-muted-foreground">البريد</th>
            <th className="text-right px-4 py-3 text-xs font-bold text-muted-foreground">الدور</th>
            <th className="text-right px-4 py-3 text-xs font-bold text-muted-foreground">الرقم الشخصي</th>
            <th className="text-right px-4 py-3 text-xs font-bold text-muted-foreground">تاريخ الإنشاء</th>
          </tr></thead><tbody className="divide-y divide-border">
            {users.map((u: any) => {
              const rmeta = ROLE_META[u.role] || { label: u.role, color: 'bg-gray-100 text-gray-700' }
              return (
                <tr key={u.id} onClick={() => setSelected(u)} className="hover:bg-primary/5 cursor-pointer transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {(u.name ?? u.email).charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-foreground">{u.name || '—'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs" dir="ltr">{u.email}</td>
                  <td className="px-4 py-3"><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${rmeta.color}`}>{rmeta.label}</span></td>
                  <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{u.personalNumber || '—'}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{fmtD(u.createdAt)}</td>
                </tr>
              )
            })}
          </tbody></table>
        </div>
      )}
      <DetailModal open={!!selected} onClose={() => setSelected(null)} title={selected?.name || 'مستخدم'}>
        {selected && <div className="grid grid-cols-2 gap-2">
          <Field label="الاسم" value={selected.name} />
          <Field label="البريد الإلكتروني" value={selected.email} ltr mono />
          <Field label="الدور" value={<span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${(ROLE_META[selected.role] || {}).color || ''}`}>{(ROLE_META[selected.role] || {}).label || selected.role}</span>} />
          <Field label="الرقم الشخصي" value={selected.personalNumber} mono />
          <Field label="الإقليم" value={selected.region} />
          <Field label="العنوان" value={selected.title} />
          <Field label="تاريخ الإنشاء" value={fmtDT(selected.createdAt)} />
        </div>}
      </DetailModal>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Shared helpers                                                   */
/* ═══════════════════════════════════════════════════════════════════ */
function LoadingBlock() {
  return <div className="flex flex-col items-center justify-center py-16 text-muted-foreground"><RefreshCw className="w-5 h-5 animate-spin mb-2" /><span className="text-sm">جارٍ التحميل...</span></div>
}

function EmptyBlock({ message }: { message: string }) {
  return <div className="flex flex-col items-center justify-center py-16 text-muted-foreground"><Package className="w-10 h-10 opacity-20 mb-2" /><span className="text-sm">{message}</span></div>
}

function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative flex-1 min-w-[180px] max-w-xs">
      <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-lg border border-input bg-background pr-9 pl-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
    </div>
  )
}

function QtyBadge({ qty, threshold }: { qty: number; threshold?: number }) {
  const t = threshold ?? 5
  const cls = qty <= 0 ? 'bg-red-100 text-red-700' : qty <= t ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold ${cls}`}>{qty}</span>
}

function ActionBadge({ action }: { action: string }) {
  const cls = action === 'CREATE' ? 'bg-green-100 text-green-700 border-green-200' : action === 'UPDATE' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : action === 'DELETE' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-gray-100 text-gray-700 border-gray-200'
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>{action}</span>
}

function fmtD(d: string) { return d ? new Date(d).toLocaleDateString('ar-TN', { year: 'numeric', month: 'short', day: 'numeric' }) : '—' }
function fmtDT(d: string) { return d ? new Date(d).toLocaleDateString('ar-TN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—' }
function numFmt(n: number) { return new Intl.NumberFormat('ar-TN', { style: 'decimal' }).format(n) }
