import React, { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import client from '../services/client'
import * as XLSX from 'xlsx'
import {
  Search, Package, Users, Building2, Receipt,
  Eye, Download, Printer, ChevronLeft,
  ArrowDownToLine, ArrowUpFromLine, X, RefreshCw,
} from 'lucide-react'
import { ReceiptPrintTemplate, downloadPDF } from '../components/receipts'

/* ─── Lookup maps ─── */
const CONDITION_AR: Record<string, string> = {
  NEW: 'جديد', GOOD: 'جيد', FAIR: 'مقبول', POOR: 'ضعيف', DAMAGED: 'تالف',
}
const RECEIPT_STATUS_AR: Record<string, { label: string; cls: string }> = {
  DRAFT:     { label: 'مسودة',  cls: 'bg-gray-100 text-gray-600' },
  APPROVED:  { label: 'معتمد',  cls: 'bg-green-100 text-green-700' },
  CANCELLED: { label: 'ملغى',   cls: 'bg-red-100 text-red-700' },
}

/* ─── Local helpers ─── */
function fmtD(d: string) {
  return d ? new Date(d).toLocaleDateString('ar-TN', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'
}
function fmtDT(d: string) {
  return d ? new Date(d).toLocaleDateString('ar-TN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'
}

function QtyBadge({ qty, threshold }: { qty: number; threshold?: number }) {
  const t = threshold ?? 5
  const cls = qty <= 0 ? 'bg-red-100 text-red-700' : qty <= t ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold ${cls}`}>{qty}</span>
}

function LoadingBlock() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
      <RefreshCw className="w-6 h-6 animate-spin mb-2" />
      <span className="text-sm">جارٍ التحميل...</span>
    </div>
  )
}

function EmptyBlock({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
      <Package className="w-10 h-10 opacity-20 mb-2" />
      <span className="text-sm">{message}</span>
    </div>
  )
}

function Field({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="bg-muted/40 rounded-xl px-3.5 py-2.5">
      <p className="text-[11px] text-muted-foreground mb-0.5">{label}</p>
      {typeof value === 'string' || typeof value === 'number'
        ? <p className={`text-sm font-medium text-foreground ${mono ? 'font-mono' : ''}`}>{String(value) || '—'}</p>
        : value}
    </div>
  )
}

function exportExcel(
  rows: Record<string, any>[],
  headers: { key: string; label: string }[],
  sheetName: string,
  fileName: string,
) {
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

/* ═══════════════════════════════════════════════════════════════════ */
/*  Page component                                                    */
/* ═══════════════════════════════════════════════════════════════════ */
export default function MonitoringItemDetail() {
  const { unit: unitParam, itemId } = useParams<{ unit: string; itemId: string }>()
  const navigate = useNavigate()
  const unit    = decodeURIComponent(unitParam ?? '')
  const encoded = encodeURIComponent(unit)

  const [activeSubTab, setActiveSubTab] = useState<'receptions' | 'distributions'>('receptions')
  const [recSearch,    setRecSearch]    = useState('')
  const [distSearch,   setDistSearch]   = useState('')
  const [viewReceiptId, setViewReceiptId] = useState<number | null>(null)

  const { data, isLoading } = useQuery(
    ['mon', unit, 'itemDetail', itemId],
    () => client.get(`/monitoring/units/${encoded}/items/${itemId}`).then(r => r.data.data),
    { staleTime: 30000 },
  )

  const item       = data?.item
  const recItems:  any[] = data?.receptionItems  ?? []
  const distItems: any[] = data?.distributionItems ?? []

  const filteredRec = useMemo(() => {
    const q = recSearch.toLowerCase()
    return q ? recItems.filter((r: any) =>
      (r.reception?.reference ?? '').toLowerCase().includes(q) ||
      (r.reception?.supplier?.name ?? '').toLowerCase().includes(q) ||
      (r.reception?.collector?.name ?? '').toLowerCase().includes(q) ||
      (r.adminNumber ?? '').toLowerCase().includes(q),
    ) : recItems
  }, [recItems, recSearch])

  const filteredDist = useMemo(() => {
    const q = distSearch.toLowerCase()
    return q ? distItems.filter((d: any) =>
      (d.distribution?.reference ?? '').toLowerCase().includes(q) ||
      (d.distribution?.beneficiary?.name ?? '').toLowerCase().includes(q) ||
      (d.distribution?.assignedTo?.name ?? '').toLowerCase().includes(q) ||
      (d.distribution?.deliveredByName ?? '').toLowerCase().includes(q) ||
      (d.adminNumber ?? '').toLowerCase().includes(q) ||
      (d.serialNumber ?? '').toLowerCase().includes(q),
    ) : distItems
  }, [distItems, distSearch])

  /* ── Export helpers ── */
  const exportReceptions = (fmt: 'excel' | 'pdf') => {
    if (!item) return
    const hdrs = [
      { key: 'ref',       label: 'الرقم المرجعي' },
      { key: 'refType',   label: 'نوع المرجع' },
      { key: 'refDate',   label: 'تاريخ المرجع' },
      { key: 'supplier',  label: 'المورد (المسلِّم)' },
      { key: 'collector', label: 'المتسلِّم' },
      { key: 'qty',       label: 'الكمية' },
      { key: 'adminNum',  label: 'الرقم الإداري' },
      { key: 'date',      label: 'تاريخ العملية' },
    ]
    const rows = filteredRec.map((r: any) => ({
      ref:       r.reception?.reference ?? '—',
      refType:   r.reception?.referenceType ?? '—',
      refDate:   r.reception?.referenceDate ? fmtD(r.reception.referenceDate) : '—',
      supplier:  r.reception?.supplier?.name ?? '—',
      collector: r.reception?.collector?.name ?? '—',
      qty:       r.quantity,
      adminNum:  r.adminNumber ?? '—',
      date:      fmtDT(r.reception?.createdAt),
    }))
    if (fmt === 'excel')
      exportExcel(rows, hdrs, `دخل — ${item.name}`, `دخل_${item.name}_${unit}.xlsx`)
    else
      exportPDF(unit, `سجل الدخل — ${item.name}`, hdrs.map(h => h.label),
        rows.map((r: any) => hdrs.map(h => String(r[h.key] ?? '—'))), `دخل_${item.name}_${unit}.pdf`)
  }

  const exportDistributions = (fmt: 'excel' | 'pdf') => {
    if (!item) return
    const hdrs = [
      { key: 'ref',         label: 'الرقم المرجعي' },
      { key: 'refType',     label: 'نوع المرجع' },
      { key: 'refDate',     label: 'تاريخ المرجع' },
      { key: 'beneficiary', label: 'الجهة المستفيدة' },
      { key: 'assignedTo',  label: 'المتسلِّم' },
      { key: 'deliveredBy', label: 'المسلِّم' },
      { key: 'qty',         label: 'الكمية' },
      { key: 'adminNum',    label: 'الرقم الإداري' },
      { key: 'serial',      label: 'الرقم التسلسلي' },
      { key: 'condition',   label: 'الحالة' },
      { key: 'receipt',     label: 'رقم وصل التسليم' },
      { key: 'date',        label: 'تاريخ العملية' },
    ]
    const rows = filteredDist.map((d: any) => ({
      ref:         d.distribution?.reference ?? '—',
      refType:     d.distribution?.referenceType ?? '—',
      refDate:     d.distribution?.referenceDate ? fmtD(d.distribution.referenceDate) : '—',
      beneficiary: d.distribution?.beneficiary?.name ?? '—',
      assignedTo:  d.distribution?.assignedTo?.name ?? '—',
      deliveredBy: d.distribution?.deliveredByName ?? '—',
      qty:         d.quantity,
      adminNum:    d.adminNumber ?? '—',
      serial:      d.serialNumber ?? '—',
      condition:   CONDITION_AR[d.condition] ?? d.condition ?? '—',
      receipt:     d.distribution?.receipt?.serialNumber ?? '—',
      date:        fmtDT(d.distribution?.createdAt),
    }))
    if (fmt === 'excel')
      exportExcel(rows, hdrs, `خرج — ${item.name}`, `خرج_${item.name}_${unit}.xlsx`)
    else
      exportPDF(unit, `سجل الخرج — ${item.name}`, hdrs.map(h => h.label),
        rows.map((r: any) => hdrs.map(h => String(r[h.key] ?? '—'))), `خرج_${item.name}_${unit}.pdf`)
  }

  /* ── Loading / not-found state ── */
  if (isLoading || !item) {
    return (
      <div className="min-h-full flex flex-col" dir="rtl">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-card sticky top-0 z-10">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm text-muted-foreground">
            {isLoading ? 'جارٍ تحميل تفاصيل التجهيز...' : 'التجهيز غير موجود'}
          </span>
        </div>
        {isLoading ? <LoadingBlock /> : <EmptyBlock message="لم يتم العثور على التجهيز" />}
      </div>
    )
  }

  const t      = item.lowStockThreshold ?? 5
  const isLow  = item.quantity <= 0
  const isWarn = !isLow && item.quantity <= t
  const barPct = t > 0 ? Math.min(100, Math.round((item.quantity / (t * 2)) * 100)) : 100

  return (
    <div className="min-h-full flex flex-col bg-background" dir="rtl">

      {/* ── Page header ── */}
      <div className="bg-card border-b border-border px-5 py-4 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors shrink-0"
          title="رجوع"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className={`p-2.5 rounded-xl shrink-0 ${isLow ? 'bg-red-100 text-red-600' : isWarn ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
          <Package className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-bold text-base text-foreground truncate">{item.name}</h1>
          <p className="text-xs text-muted-foreground">
            {item.sku}{item.category ? ` · ${item.category}` : ''} · الوحدة:{' '}
            <span className="font-semibold text-foreground">{unit}</span>
          </p>
        </div>
        <QtyBadge qty={item.quantity} threshold={item.lowStockThreshold} />
      </div>

      {/* ── KPI cards ── */}
      <div className="p-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 border-b border-border bg-muted/10">
        {[
          { label: 'الرصيد الحالي',  value: item.quantity,                cls: isLow ? 'text-red-600' : isWarn ? 'text-orange-500' : 'text-green-600' },
          { label: 'إجمالي المستلم', value: data?.totalReceived ?? '…',   cls: 'text-blue-600' },
          { label: 'إجمالي الموزع',  value: data?.totalDistributed ?? '…', cls: 'text-orange-600' },
          { label: 'الحد الأدنى',    value: item.lowStockThreshold ?? '—', cls: 'text-muted-foreground' },
          { label: 'رقم إداري',      value: item.adminNumber ?? '—',       mono: true, cls: 'text-foreground' },
          { label: 'آخر تحديث',      value: fmtD(item.updatedAt),          cls: 'text-muted-foreground' },
        ].map((c, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-3 text-center">
            <p className="text-[10px] text-muted-foreground mb-1">{c.label}</p>
            <p className={`text-base font-bold ${c.cls} ${(c as any).mono ? 'font-mono text-sm' : ''}`}>{String(c.value)}</p>
          </div>
        ))}
      </div>

      {/* ── Stock progress bar ── */}
      <div className="px-5 py-3 border-b border-border bg-card">
        <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
          <span>نسبة المخزون المتوفر</span>
          <span className="font-semibold">{barPct}%</span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${isLow ? 'bg-red-500' : isWarn ? 'bg-orange-500' : 'bg-green-500'}`}
            style={{ width: `${barPct}%` }}
          />
        </div>
        {item.description && (
          <p className="text-xs text-muted-foreground mt-2 italic">"{item.description}"</p>
        )}
      </div>

      {/* ── Sub-tabs ── */}
      <div className="flex border-b border-border bg-card sticky top-[73px] z-[5]">
        {[
          { k: 'receptions',    label: 'سجل الدخل',  icon: <ArrowDownToLine className="w-3.5 h-3.5" />, count: recItems.length },
          { k: 'distributions', label: 'سجل الخرج',  icon: <ArrowUpFromLine className="w-3.5 h-3.5" />, count: distItems.length },
        ].map(tab => (
          <button
            key={tab.k}
            onClick={() => setActiveSubTab(tab.k as any)}
            className={`flex items-center gap-1.5 px-5 py-3 text-xs font-semibold border-b-2 transition-colors ${activeSubTab === tab.k ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            {tab.icon}
            {tab.label}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeSubTab === tab.k ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── Receptions panel ── */}
      {activeSubTab === 'receptions' && (
        <div className="p-4 space-y-3">
          <div className="flex flex-wrap gap-2 items-center justify-between">
            <div className="relative">
              <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                value={recSearch}
                onChange={e => setRecSearch(e.target.value)}
                placeholder="بحث..."
                className="pr-7 pl-3 py-1.5 text-xs border border-border rounded-lg bg-card w-44 text-foreground"
              />
            </div>
            <div className="flex gap-1.5 items-center">
              <span className="text-xs text-muted-foreground">{filteredRec.length} سجل</span>
              <button
                onClick={() => exportReceptions('excel')}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
              >
                <Download className="w-3 h-3" /> Excel
              </button>
              <button
                onClick={() => exportReceptions('pdf')}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
              >
                <Printer className="w-3 h-3" /> PDF
              </button>
            </div>
          </div>

          {filteredRec.length === 0
            ? <EmptyBlock message="لا توجد حركات استلام" />
            : (
              <div className="overflow-x-auto rounded-xl border border-border bg-card">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-green-50/60 dark:bg-green-900/10">
                      {['الرقم المرجعي', 'نوع المرجع', 'تاريخ المرجع', 'المورد (المسلِّم)', 'المتسلِّم', 'الكمية', 'الرقم الإداري', 'التاريخ'].map(h => (
                        <th key={h} className="text-right px-3 py-2.5 font-bold text-xs text-green-800 dark:text-green-300 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredRec.map((r: any) => (
                      <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-3 py-2.5 font-mono text-foreground">{r.reception?.reference ?? '—'}</td>
                        <td className="px-3 py-2.5">
                          <span className="bg-muted px-1.5 py-0.5 rounded text-[10px]">{r.reception?.referenceType ?? '—'}</span>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">
                          {r.reception?.referenceDate ? fmtD(r.reception.referenceDate) : '—'}
                        </td>
                        {/* المورد – المسلِّم */}
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                              <ArrowDownToLine className="w-3 h-3 text-blue-600" />
                            </div>
                            <span className="font-semibold text-foreground">{r.reception?.supplier?.name ?? '—'}</span>
                          </div>
                        </td>
                        {/* المتسلِّم */}
                        <td className="px-3 py-2.5">
                          {r.reception?.collector ? (
                            <div className="flex items-center gap-1.5">
                              <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                                <Users className="w-3 h-3 text-green-600" />
                              </div>
                              <span className="font-semibold text-foreground">{r.reception.collector.name}</span>
                            </div>
                          ) : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-3 py-2.5 font-bold text-green-700 text-center">{r.quantity}</td>
                        <td className="px-3 py-2.5 font-mono text-muted-foreground">{r.adminNumber ?? '—'}</td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">{fmtD(r.reception?.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted/30 border-t border-border">
                      <td colSpan={5} className="px-3 py-2 text-xs font-semibold text-muted-foreground">الإجمالي</td>
                      <td className="px-3 py-2 font-bold text-green-700 text-center">
                        {filteredRec.reduce((s: number, r: any) => s + r.quantity, 0)}
                      </td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
        </div>
      )}

      {/* ── Distributions panel ── */}
      {activeSubTab === 'distributions' && (
        <div className="p-4 space-y-3">
          <div className="flex flex-wrap gap-2 items-center justify-between">
            <div className="relative">
              <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                value={distSearch}
                onChange={e => setDistSearch(e.target.value)}
                placeholder="بحث..."
                className="pr-7 pl-3 py-1.5 text-xs border border-border rounded-lg bg-card w-44 text-foreground"
              />
            </div>
            <div className="flex gap-1.5 items-center">
              <span className="text-xs text-muted-foreground">{filteredDist.length} سجل</span>
              <button
                onClick={() => exportDistributions('excel')}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
              >
                <Download className="w-3 h-3" /> Excel
              </button>
              <button
                onClick={() => exportDistributions('pdf')}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
              >
                <Printer className="w-3 h-3" /> PDF
              </button>
            </div>
          </div>

          {filteredDist.length === 0
            ? <EmptyBlock message="لا توجد حركات توزيع" />
            : (
              <div className="overflow-x-auto rounded-xl border border-border bg-card">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-orange-50/60 dark:bg-orange-900/10">
                      {['الرقم المرجعي', 'نوع المرجع', 'تاريخ المرجع', 'الجهة المستفيدة', 'المتسلِّم', 'المسلِّم', 'الكمية', 'الرقم الإداري', 'الرقم التسلسلي', 'الحالة', 'وصل التسليم', 'التاريخ'].map(h => (
                        <th key={h} className="text-right px-3 py-2.5 font-bold text-xs text-orange-800 dark:text-orange-300 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredDist.map((d: any) => {
                      const dist    = d.distribution ?? {}
                      const receipt = dist.receipt
                      const rMeta   = RECEIPT_STATUS_AR[receipt?.status] ?? null
                      return (
                        <tr key={d.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-3 py-2.5 font-mono text-foreground">{dist.reference ?? '—'}</td>
                          <td className="px-3 py-2.5">
                            <span className="bg-muted px-1.5 py-0.5 rounded text-[10px]">{dist.referenceType ?? '—'}</span>
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">
                            {dist.referenceDate ? fmtD(dist.referenceDate) : '—'}
                          </td>
                          {/* الجهة المستفيدة */}
                          <td className="px-3 py-2.5">
                            {dist.beneficiary ? (
                              <div className="flex items-center gap-1.5">
                                <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                                  <Building2 className="w-3 h-3 text-purple-600" />
                                </div>
                                <span className="font-semibold text-foreground">{dist.beneficiary.name}</span>
                              </div>
                            ) : <span className="text-muted-foreground">—</span>}
                          </td>
                          {/* المتسلِّم */}
                          <td className="px-3 py-2.5">
                            {dist.assignedTo ? (
                              <div className="flex items-center gap-1.5">
                                <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                                  <Users className="w-3 h-3 text-green-600" />
                                </div>
                                <span className="font-semibold text-foreground">{dist.assignedTo.name}</span>
                              </div>
                            ) : <span className="text-muted-foreground">—</span>}
                          </td>
                          {/* المسلِّم */}
                          <td className="px-3 py-2.5">
                            {dist.deliveredByName ? (
                              <div className="flex items-center gap-1.5">
                                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                                  <ArrowUpFromLine className="w-3 h-3 text-blue-600" />
                                </div>
                                <span className="font-semibold text-foreground">{dist.deliveredByName}</span>
                              </div>
                            ) : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="px-3 py-2.5 font-bold text-orange-700 text-center">{d.quantity}</td>
                          <td className="px-3 py-2.5 font-mono text-muted-foreground">{d.adminNumber ?? '—'}</td>
                          <td className="px-3 py-2.5 font-mono text-muted-foreground">{d.serialNumber ?? '—'}</td>
                          <td className="px-3 py-2.5">
                            <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">
                              {CONDITION_AR[d.condition] ?? d.condition ?? '—'}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            {receipt ? (
                              <button
                                onClick={() => setViewReceiptId(receipt.id)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold border border-border hover:bg-muted transition-colors"
                              >
                                <Receipt className="w-3 h-3" />
                                <span className={`px-1 py-0.5 rounded text-[9px] font-bold ${rMeta?.cls}`}>{rMeta?.label}</span>
                                <Eye className="w-3 h-3 text-muted-foreground" />
                              </button>
                            ) : (
                              <span className="text-muted-foreground/60 text-[10px]">لا يوجد</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">{fmtD(dist.createdAt)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted/30 border-t border-border">
                      <td colSpan={6} className="px-3 py-2 text-xs font-semibold text-muted-foreground">الإجمالي</td>
                      <td className="px-3 py-2 font-bold text-orange-700 text-center">
                        {filteredDist.reduce((s: number, d: any) => s + d.quantity, 0)}
                      </td>
                      <td colSpan={5} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
        </div>
      )}

      {/* ── Receipt full-page modal ── */}
      {viewReceiptId !== null && (
        <ReceiptViewModal
          receiptId={viewReceiptId}
          securityUnit={unit}
          onClose={() => setViewReceiptId(null)}
        />
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════ */
/*  Receipt View Modal — fetches full receipt and renders template  */
/* ══════════════════════════════════════════════════════════════════ */
function ReceiptViewModal({
  receiptId,
  securityUnit,
  onClose,
}: {
  receiptId: number
  securityUnit: string
  onClose: () => void
}) {
  const templateId = `receipt-view-${receiptId}`

  const { data, isLoading } = useQuery(
    ['receipt', receiptId],
    () => client.get(`/receipts/${receiptId}`).then(r => r.data.data),
    { staleTime: 60000 },
  )

  const statusMeta = RECEIPT_STATUS_AR[data?.status] ?? null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-4xl bg-card border border-border rounded-2xl shadow-2xl z-10 max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-primary" />
            <h3 className="font-bold text-sm text-foreground">وصل تسلم و تسليم</h3>
            {data && statusMeta && (
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${statusMeta.cls}`}>
                {statusMeta.label}
              </span>
            )}
            {data && (
              <span className="text-xs text-muted-foreground font-mono">{data.serialNumber}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {data && (
              <button
                onClick={() => downloadPDF(templateId, `وصل_${data.serialNumber}.pdf`)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" /> تحميل PDF
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <RefreshCw className="w-5 h-5 animate-spin mb-2" />
              <span className="text-sm">جارٍ تحميل الوصل...</span>
            </div>
          ) : data ? (
            <div className="mx-auto overflow-x-auto flex justify-center">
              <ReceiptPrintTemplate
                id={templateId}
                receipt={data}
                currentUser={{ securityUnit }}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Package className="w-10 h-10 opacity-20 mb-2" />
              <span className="text-sm">لم يتم العثور على الوصل</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
