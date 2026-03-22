import React, { useState, useMemo, useContext, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import client from '../services/client'
import { AuthContext } from '../context/AuthContext'
import { Fuel, Settings2, X, Pencil, ChevronDown, Trash2, FileDown } from 'lucide-react'
import FuelThresholdChart, { MonthStat } from '../components/charts/FuelThresholdChart'

// ─── Types ────────────────────────────────────────────────────────────────────
interface FuelPrice { id: number; fuelType: string; pricePerLiter: number }
interface FuelRecord {
  id: number; vehicleId: number; month: number; year: number
  monthlyQuotaLiters: number
  deliveredAmount?: number | null
  additionalAmount?: number | null
  consumedAmount?: number | null
  startMileage?: number | null
  endMileage?: number | null
  notes?: string | null
}
interface Vehicle {
  id: number; adminNumber: string; vehicleType?: string | null
  type: string; fuelType: string; fuelQuota?: number | null
  entity: { id: number; name: string }
  fuelRecords: FuelRecord[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const MONTHS_AR = ['جانفي','فيفري','مارس','أفريل','ماي','جوان','جويلية','أوت','سبتمبر','أكتوبر','نوفمبر','ديسمبر']
const fmt = (n?: number | null, dec = 2) => n == null ? '—' : parseFloat(n.toFixed(dec)).toString()

const computeRow = (rec: Partial<FuelRecord>, price: number, quota: number) => {
  const delivered  = rec.deliveredAmount ?? (quota * price)
  const additional = rec.additionalAmount ?? 0
  // الفائض يُحسب فقط إن أُدخل المستهلك فعلياً
  const consumedRaw = rec.consumedAmount ?? null
  const consumed    = consumedRaw ?? 0
  const surplusVal  = consumedRaw != null ? (delivered + additional) - consumedRaw : null
  const surplus     = surplusVal != null && surplusVal > 0 ? surplusVal : 0
  // النقص = (المقرر × ثمن اللتر) - المسلم
  const deficit     = (quota * price) - delivered
  const distance    = (rec.endMileage != null && rec.startMileage != null)
    ? rec.endMileage - rec.startMileage : null
  // L/100km = (المستهلك بالليتر × 100) / المسافة ، المستهلك بالليتر = consumedRaw / price
  const consRate    = (consumedRaw != null && consumedRaw > 0 && price > 0 && distance && distance > 0)
    ? (consumedRaw / price * 100) / distance : null
  return { delivered, additional, consumed, surplus,
    surplusNull: consumedRaw === null,
    deficit: deficit > 0 ? deficit : 0, distance, consRate }
}

const EMPTY_FORM = {
  vehicleId: 0, month: 0, year: 0,
  monthlyQuotaLiters: 0,
  deliveredAmount: '' as string | number,
  additionalAmount: '' as string | number,
  consumedAmount: '' as string | number,
  startMileage: '' as string | number,
  endMileage: '' as string | number,
  notes: '',
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function FuelPage() {
  const qc = useQueryClient()
  const { user } = useContext(AuthContext)
  const now = new Date()
  const [selMonth, setSelMonth] = useState(now.getMonth() + 1)
  const [selYear,  setSelYear]  = useState(now.getFullYear())
  const [showPrices, setShowPrices] = useState(false)
  const [priceInputs, setPriceInputs] = useState<Record<string, string>>({})
  const [showModal, setShowModal] = useState(false)
  const [editVehicle, setEditVehicle] = useState<Vehicle | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [selFuelType, setSelFuelType] = useState<string>('all')
  const [chartMetric, setChartMetric] = useState<'consumed' | 'delivered'>('consumed')
  const chartRef = useRef<HTMLDivElement>(null)
  const [chartWidth, setChartWidth] = useState(700)
  useEffect(() => {
    const el = chartRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => setChartWidth(entries[0].contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: prices = [] } = useQuery<FuelPrice[]>(
    ['fuel-prices'],
    async () => (await client.get('/fuel/prices')).data.data
  )

  const { data: vehicles = [], isLoading } = useQuery<Vehicle[]>(
    ['fuel-records', selMonth, selYear],
    async () => (await client.get(`/fuel/records?month=${selMonth}&year=${selYear}`)).data.data,
    { refetchInterval: 30000 }
  )

  // إحصائيات سنوية
  const { data: curYearStats = [] } = useQuery<MonthStat[]>(
    ['fuel-yearly', selYear, selFuelType],
    async () => {
      const params = new URLSearchParams({ year: String(selYear) })
      if (selFuelType !== 'all') params.set('fuelType', selFuelType)
      return (await client.get(`/fuel/yearly-stats?${params}`)).data.data
    }
  )
  const { data: prevYearStats = [] } = useQuery<MonthStat[]>(
    ['fuel-yearly', selYear - 1, selFuelType],
    async () => {
      const params = new URLSearchParams({ year: String(selYear - 1) })
      if (selFuelType !== 'all') params.set('fuelType', selFuelType)
      return (await client.get(`/fuel/yearly-stats?${params}`)).data.data
    }
  )

  // ── Price map ──────────────────────────────────────────────────────────────
  const priceMap = useMemo(() => {
    const m: Record<string, number> = {}
    prices.forEach(p => { m[p.fuelType] = p.pricePerLiter })
    return m
  }, [prices])

  const getPriceForVehicle = (v: Vehicle) => priceMap[v.fuelType] ?? 0

  // ── Mutations ─────────────────────────────────────────────────────────────
  const priceMut = useMutation(
    async ({ fuelType, pricePerLiter }: { fuelType: string; pricePerLiter: number }) =>
      (await client.post('/fuel/prices', { fuelType, pricePerLiter })).data.data,
    { onSuccess: () => qc.invalidateQueries(['fuel-prices']) }
  )

  const recordMut = useMutation(
    async (payload: any) => (await client.post('/fuel/records', payload)).data.data,
    {
      onSuccess: () => {
        qc.invalidateQueries(['fuel-records', selMonth, selYear])
        closeModal()
      },
      onError: (e: any) => setError(e?.response?.data?.error || 'حدث خطأ'),
    }
  )

  const deleteMut = useMutation(
    async (id: number) => client.delete(`/fuel/records/${id}`),
    { onSuccess: () => qc.invalidateQueries(['fuel-records', selMonth, selYear]) }
  )

  // الأنواع المتاحة
  const fuelTypeTabs = useMemo(() => {
    const types = Array.from(new Set(vehicles.map(v => v.fuelType).filter(Boolean))) as string[]
    return types.sort()
  }, [vehicles])

  // تصفية حسب نوع الوقود
  const filteredByType = useMemo(() => {
    if (selFuelType === 'all') return vehicles
    return vehicles.filter(v => v.fuelType === selFuelType)
  }, [vehicles, selFuelType])

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    let totalQuotaLiters = 0, totalDelivered = 0, totalAdditional = 0, totalConsumed = 0, totalSurplus = 0, totalDeficit = 0
    filteredByType.forEach(v => {
      const quota = v.fuelQuota ?? 0
      const price = getPriceForVehicle(v)
      const rec = v.fuelRecords[0]
      const c = computeRow(rec ?? {}, price, quota)
      totalQuotaLiters += quota
      totalDelivered   += c.delivered
      totalAdditional  += c.additional
      totalConsumed    += c.consumed
      totalSurplus     += c.surplus
      totalDeficit     += c.deficit
    })
    return { totalQuotaLiters, totalDelivered, totalAdditional, totalConsumed, totalSurplus, totalDeficit }
  }, [filteredByType, priceMap])

  // ── Filtered ──────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return filteredByType
    return filteredByType.filter(v =>
      v.adminNumber.toLowerCase().includes(q) ||
      (v.vehicleType || '').toLowerCase().includes(q) ||
      v.type.toLowerCase().includes(q) ||
      (v.entity?.name || '').toLowerCase().includes(q)
    )
  }, [filteredByType, search])

  // ── Modal helpers ─────────────────────────────────────────────────────────
  const openEdit = (v: Vehicle) => {
    const rec = v.fuelRecords[0]
    const price = getPriceForVehicle(v)
    const quota = v.fuelQuota ?? 0
    setEditVehicle(v)
    setForm({
      vehicleId: v.id,
      month: selMonth,
      year:  selYear,
      monthlyQuotaLiters: quota,
      deliveredAmount:  rec?.deliveredAmount  ?? '',
      additionalAmount: rec?.additionalAmount ?? '',
      consumedAmount:   rec?.consumedAmount   ?? '',
      startMileage:     rec?.startMileage     ?? '',
      endMileage:       rec?.endMileage       ?? '',
      notes:            rec?.notes            ?? '',
    })
    setError('')
    setShowModal(true)
  }

  const closeModal = () => { setShowModal(false); setEditVehicle(null); setForm(EMPTY_FORM); setError('') }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload: any = {
      vehicleId: form.vehicleId,
      month: form.month,
      year:  form.year,
      monthlyQuotaLiters: form.monthlyQuotaLiters,
      deliveredAmount:    form.deliveredAmount  !== '' ? Number(form.deliveredAmount)  : null,
      additionalAmount:   form.additionalAmount !== '' ? Number(form.additionalAmount) : null,
      consumedAmount:     form.consumedAmount   !== '' ? Number(form.consumedAmount)   : null,
      startMileage:       form.startMileage     !== '' ? Number(form.startMileage)     : null,
      endMileage:         form.endMileage       !== '' ? Number(form.endMileage)       : null,
      notes:              form.notes || null,
    }
    recordMut.mutate(payload)
  }

  // ── Save single price ─────────────────────────────────────────────────────
  const savePrice = (fuelType: string) => {
    const val = parseFloat(priceInputs[fuelType] ?? '')
    if (isNaN(val) || val <= 0) return
    priceMut.mutate({ fuelType, pricePerLiter: val })
    setPriceInputs(p => ({ ...p, [fuelType]: '' }))
  }

  // ── PDF Export ────────────────────────────────────────────────────────────
  const exportPDF = async () => {
    const monthLabel = `${MONTHS_AR[selMonth - 1]} ${selYear}`
    const unit             = user?.securityUnit || '—'
    const region           = user?.region       || '—'
    const title            = user?.title        || ''
    const regionChief      = (user as any)?.regionChief || ''
    const _r = (user?.securityUnit || '').trim()
    const regionChiefLabel = _r.startsWith('فوج') ? 'امر فوج' : _r.startsWith('اقليم') || _r.startsWith('إقليم') ? 'مدير الاقليم' : _r.startsWith('منطقة') || _r.startsWith('المنطقة') ? 'رئيس المنطقة' : 'رئيس المنطقة'

    const headers = ['الوحدة الأمنية','نوع الوسيلة','الرقم الإداري','المقرر (لتر)','المسلم (د.ت)','الإضافي (د.ت)','المستهلك (د.ت)','الفائض (د.ت)','النقص (د.ت)','عداد أول الشهر','عداد آخر الشهر','المسافة المقطوعة (كلم)','المعدل المئوي','ملاحظات']

    const rows = filtered.map(v => {
      const quota = v.fuelQuota ?? 0
      const price = getPriceForVehicle(v)
      const rec   = v.fuelRecords[0]
      const c = computeRow(rec ?? {}, price, quota)
      return [
        v.entity?.name || '—',
        v.vehicleType || '—',
        v.adminNumber,
        fmt(quota, 1),
        fmt(c.delivered),
        fmt(c.additional),
        c.consumed > 0 ? fmt(c.consumed) : '—',
        fmt(c.surplus),
        fmt(c.deficit),
        rec?.startMileage != null ? fmt(rec.startMileage, 0) : '—',
        rec?.endMileage   != null ? fmt(rec.endMileage,   0) : '—',
        c.distance != null ? fmt(c.distance, 0) : '—',
        c.consRate  != null ? fmt(c.consRate, 2) + ' %' : '—',
        rec?.notes || '—',
      ]
    })

    const today = new Date().toLocaleDateString('ar-TN', { year: 'numeric', month: 'long', day: 'numeric' })

    // جدول ملخص أنواع الوقود و الكميات الجملية
    const fuelSummaryMap: Record<string, number> = {}
    filtered.forEach(v => {
      const ft = v.fuelType || 'غير محدد'
      const quota = v.fuelQuota ?? 0
      fuelSummaryMap[ft] = (fuelSummaryMap[ft] || 0) + quota
    })
    const fuelSummaryRows = Object.entries(fuelSummaryMap).sort((a, b) => a[0].localeCompare(b[0]))

    const el = document.createElement('div')
    el.style.cssText = 'direction:rtl;font-family:"Cairo","Tahoma",sans-serif;background:#fff;padding:32px 36px;width:1800px;color:#0f172a;position:absolute;left:-9999px;top:0;z-index:-1;'

    el.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;">
        <div style="text-align:center;line-height:2.2;">
          <div style="font-weight:800;font-size:20px;color:#000;">الإدارة العامة للحرس الوطني</div>
          <div style="font-size:16px;color:#000;">${region}</div>
          ${region !== unit ? `<div style="font-size:16px;color:#000;">${unit}</div>` : ''}
          <div style="font-size:16px;color:#000;text-align:right;">عدد</div>
        </div>
        <div style="min-width:320px;">
          <table style="border-collapse:collapse;font-size:15px;border:1.5px solid #000;width:100%;">
            <thead>
              <tr style="border-bottom:1.5px solid #000;">
                <th style="padding:6px 14px;text-align:center;border-left:1.5px solid #000;font-weight:700;">نوع الوقود</th>
                <th style="padding:6px 14px;text-align:center;font-weight:700;">الكمية الجملية (لتر)</th>
              </tr>
            </thead>
            <tbody>
              ${fuelSummaryRows.map(([ ft, total ]) => `
              <tr style="border-bottom:1px solid #000;">
                <td style="padding:5px 14px;text-align:center;border-left:1px solid #000;font-weight:600;">${ft}</td>
                <td style="padding:5px 14px;text-align:center;">${total.toFixed(1)}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
      <div style="text-align:center;margin:10px 0 30px;">
        <span style="font-size:22px;font-weight:800;color:#000;border-bottom:2px solid #000;padding-bottom:4px;">
          جدول استهلاك المحروقات لشهر ${monthLabel} (${unit})
        </span>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:13px;border:2px solid #000;">
        <thead>
          <tr style="border-bottom:2px solid #000;">
            ${headers.map(h => `<th style="padding:8px 5px;text-align:center;vertical-align:middle;border-left:1.5px solid #000;white-space:nowrap;font-weight:700;">${h}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${rows.length === 0
            ? `<tr><td colspan="${headers.length}" style="text-align:center;padding:20px;color:#000;">لا توجد بيانات</td></tr>`
            : rows.map((row) => `
            <tr style="border-bottom:1px solid #000;">
              ${row.map(c => `<td style="padding:7px 5px;border-left:1px solid #000;text-align:center;vertical-align:middle;">${c}</td>`).join('')}
            </tr>`).join('')}
        </tbody>
        <tfoot>
          <tr style="border-top:2px solid #000;font-weight:700;font-size:14px;">
            <td colspan="3" style="padding:8px;text-align:right;vertical-align:middle;border-left:1px solid #000;">الإجمالي</td>
            <td style="padding:8px;text-align:center;vertical-align:middle;border-left:1px solid #000;">${fmt(stats.totalQuotaLiters,1)}</td>
            <td style="padding:8px;text-align:center;vertical-align:middle;border-left:1px solid #000;">${fmt(stats.totalDelivered)}</td>
            <td style="padding:8px;text-align:center;vertical-align:middle;border-left:1px solid #000;">${fmt(stats.totalAdditional)}</td>
            <td style="padding:8px;text-align:center;vertical-align:middle;border-left:1px solid #000;">${fmt(stats.totalConsumed)}</td>
            <td style="padding:8px;text-align:center;vertical-align:middle;border-left:1px solid #000;">${fmt(stats.totalSurplus)}</td>
            <td style="padding:8px;text-align:center;vertical-align:middle;border-left:1px solid #000;">${fmt(stats.totalDeficit)}</td>
            <td colspan="5" style="padding:8px;vertical-align:middle;border-left:1px solid #000;"></td>
          </tr>
        </tfoot>
      </table>
      <div style="margin-top:40px;display:flex;justify-content:flex-end;">
        <div style="text-align:center;">
          <div style="font-size:16px;color:#000;line-height:1.9;margin-bottom:8px;">
            <span style="font-weight:700;color:#000;">${title}</span> في : ${today}
          </div>
          <div style="font-weight:700;font-size:16px;color:#000;">${regionChiefLabel}</div>
          ${regionChief ? `<div style="font-size:16px;color:#000;margin-top:6px;">${regionChief}</div>` : ''}
        </div>
      </div>`

    document.body.appendChild(el)
    try {
      const { jsPDF }    = await import('jspdf')
      const html2canvas  = await import('html2canvas')
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
      doc.save(`محروقات-${monthLabel}-${unit}.pdf`)
    } finally { el.remove() }
  }


  return (
    <div dir="rtl" className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Fuel className="w-6 h-6 text-primary" />
            المحروقات
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">متابعة استهلاك الوقود الشهري للوسائل</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Date picker for ADMIN / REGION_CHIEF / DISTRICT_MANAGER */}
          {(user?.role === 'ADMIN' || user?.role === 'REGION_CHIEF' || user?.role === 'BATTALION_COMMANDER' || user?.role === 'DISTRICT_MANAGER') && (
            <div className="flex items-center gap-1.5 border border-input bg-background rounded-lg px-3 py-1.5">
              <span className="text-xs text-muted-foreground whitespace-nowrap">التاريخ:</span>
              <input
                type="date"
                value={`${selYear}-${String(selMonth).padStart(2, '0')}-01`}
                onChange={e => {
                  const d = new Date(e.target.value)
                  if (!isNaN(d.getTime())) {
                    setSelMonth(d.getMonth() + 1)
                    setSelYear(d.getFullYear())
                  }
                }}
                className="bg-transparent text-sm focus:outline-none"
              />
            </div>
          )}
          {/* Month selector */}
          <div className="relative">
            <select
              value={selMonth}
              onChange={e => setSelMonth(Number(e.target.value))}
              className="appearance-none border border-input bg-background rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {MONTHS_AR.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>
          {/* Year selector */}
          <div className="relative">
            <select
              value={selYear}
              onChange={e => setSelYear(Number(e.target.value))}
              className="appearance-none border border-input bg-background rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {[2023,2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>
          {/* Prices toggle */}
          <button
            onClick={() => setShowPrices(p => !p)}
            className="inline-flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            <Settings2 className="w-4 h-4" />
            أسعار الوقود
          </button>
          {/* PDF */}
          <button
            onClick={exportPDF}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
          >
            <FileDown className="w-4 h-4" />
            تصدير PDF
          </button>
        </div>
      </div>

      {/* ── Fuel Prices Panel ── */}
      {showPrices && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-primary" />
            إعداد أسعار الوقود (د.ت / لتر)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {['غزوال', 'غزوال رفيع', 'بنزين رفيع'].map(ft => {
              const current = priceMap[ft]
              return (
                <div key={ft} className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">{ft}</label>
                  <div className="flex gap-2">
                    <input
                      type="number" step="0.001" min="0"
                      placeholder={current != null ? `الحالي: ${current.toFixed(3)}` : 'أدخل السعر...'}
                      value={priceInputs[ft] ?? ''}
                      onChange={e => setPriceInputs(p => ({ ...p, [ft]: e.target.value }))}
                      className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <button
                      onClick={() => savePrice(ft)}
                      className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                    >
                      حفظ
                    </button>
                  </div>
                  {current != null && (
                    <p className="text-xs text-muted-foreground">السعر الحالي: {current.toFixed(3)} د.ت</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
      {/* التبويبات حسب نوع الوقود */}
      {fuelTypeTabs.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelFuelType('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
              selFuelType === 'all'
                ? 'bg-primary text-primary-foreground border-primary shadow'
                : 'bg-background text-foreground border-input hover:bg-muted'
            }`}
          >
            كل الأنواع
            <span className="mr-1.5 text-xs opacity-70">({vehicles.length})</span>
          </button>
          {fuelTypeTabs.map(ft => (
            <button
              key={ft}
              onClick={() => setSelFuelType(ft)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
                selFuelType === ft
                  ? 'bg-primary text-primary-foreground border-primary shadow'
                  : 'bg-background text-foreground border-input hover:bg-muted'
              }`}
            >
              {ft}
              <span className="mr-1.5 text-xs opacity-70">({vehicles.filter(v => v.fuelType === ft).length})</span>
            </button>
          ))}
        </div>
      )}


      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'إجمالي الحصة (لتر)',  value: fmt(stats.totalQuotaLiters, 1), cls: 'text-primary' },
          { label: 'إجمالي المسلم (د.ت)', value: fmt(stats.totalDelivered),    cls: 'text-foreground' },
          { label: 'إجمالي المستهلك (د.ت)', value: fmt(stats.totalConsumed),   cls: 'text-amber-600' },
          { label: 'إجمالي الفائض (د.ت)', value: fmt(stats.totalSurplus),      cls: 'text-emerald-600' },
          { label: 'إجمالي النقص (د.ت)',  value: fmt(stats.totalDeficit),      cls: 'text-destructive' },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-border bg-card px-4 py-3">
            <p className={`text-xl font-bold ${s.cls}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Search ── */}
      <div className="rounded-xl border border-border bg-card p-4">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="بحث بالرقم الإداري، الوحدة، نوع الوسيلة..."
          className="w-full rounded-lg border border-input bg-background px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <p className="text-xs text-muted-foreground mt-2">{filtered.length} وسيلة — {MONTHS_AR[selMonth - 1]} {selYear}</p>
      </div>

      {/* ── Table ── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
            <Fuel className="w-10 h-10 opacity-20" />
            <p className="text-sm">لا توجد وسائل مسجلة</p>
          </div>
        ) : (
          <div>
            <table className="w-full text-xs">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-3 py-3 text-right font-semibold text-muted-foreground">الوحدة الأمنية</th>
                  <th className="px-3 py-3 text-right font-semibold text-muted-foreground">نوع الوسيلة</th>
                  <th className="px-3 py-3 text-right font-semibold text-muted-foreground">الرقم الإداري</th>
                  <th className="px-3 py-3 text-right font-semibold text-muted-foreground">نوع الوقود</th>
                  <th className="px-3 py-3 text-center font-semibold text-muted-foreground">المقرر (لتر)</th>
                  <th className="px-3 py-3 text-center font-semibold text-muted-foreground">سعر اللتر</th>
                  <th className="px-3 py-3 text-center font-semibold text-muted-foreground">المسلم (د.ت)</th>
                  <th className="px-3 py-3 text-center font-semibold text-muted-foreground">الإضافي (د.ت)</th>
                  <th className="px-3 py-3 text-center font-semibold text-muted-foreground">المستهلك (د.ت)</th>
                  <th className="px-3 py-3 text-center font-semibold text-muted-foreground">الفائض (د.ت)</th>
                  <th className="px-3 py-3 text-center font-semibold text-muted-foreground">النقص (د.ت)</th>
                  <th className="px-3 py-3 text-center font-semibold text-muted-foreground">عداد أول الشهر</th>
                  <th className="px-3 py-3 text-center font-semibold text-muted-foreground">عداد آخر الشهر</th>
                  <th className="px-3 py-3 text-center font-semibold text-muted-foreground">المسافة المقطوعة (كلم)</th>
                  <th className="px-3 py-3 text-center font-semibold text-muted-foreground">المعدل المئوي</th>
                  <th className="px-3 py-3 text-right font-semibold text-muted-foreground">ملاحظات</th>
                  <th className="px-3 py-3 text-center font-semibold text-muted-foreground">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(v => {
                  const quota = v.fuelQuota ?? 0
                  const price = getPriceForVehicle(v)
                  const rec   = v.fuelRecords[0]
                  const c = computeRow(rec ?? {}, price, quota)
                  const hasRecord = !!rec
                  return (
                    <tr key={v.id} className={`border-b border-border last:border-0 hover:bg-muted/30 transition ${!hasRecord ? 'opacity-70' : ''}`}>
                      <td className="px-3 py-2.5 text-foreground">{v.entity?.name || '—'}</td>
                      <td className="px-3 py-2.5 text-foreground">{v.vehicleType || '—'}</td>
                      <td className="px-3 py-2.5 font-mono font-semibold text-foreground">{v.adminNumber}</td>
                      <td className="px-3 py-2.5 text-foreground">{v.fuelType}</td>
                      <td className="px-3 py-2.5 text-center font-mono">{quota > 0 ? fmt(quota, 1) : '—'}</td>
                      <td className="px-3 py-2.5 text-center text-muted-foreground">{price > 0 ? price.toFixed(3) : <span className="text-destructive text-xs">غير محدد</span>}</td>
                      {/* مسلم */}
                      <td className="px-3 py-2.5 text-center font-mono font-semibold text-foreground">
                        {c.delivered > 0 ? fmt(c.delivered) : '—'}
                      </td>
                      {/* إضافي */}
                      <td className="px-3 py-2.5 text-center font-mono">
                        {rec?.additionalAmount != null ? <span className="text-emerald-600 font-semibold">+{fmt(rec.additionalAmount)}</span> : <span className="text-muted-foreground">0</span>}
                      </td>
                      {/* مستهلك */}
                      <td className="px-3 py-2.5 text-center font-mono">
                        {c.consumed > 0 ? <span className="text-amber-600 font-semibold">{fmt(c.consumed)}</span> : '—'}
                      </td>
                      {/* فائض */}
                      <td className="px-3 py-2.5 text-center font-mono">
                        {c.surplus > 0 ? <span className="text-emerald-600 font-semibold">{fmt(c.surplus)}</span> : <span className="text-muted-foreground">0</span>}
                      </td>
                      {/* نقص */}
                      <td className="px-3 py-2.5 text-center font-mono">
                        {c.deficit > 0 ? <span className="text-destructive font-semibold">{fmt(c.deficit)}</span> : <span className="text-muted-foreground">0</span>}
                      </td>
                      {/* عدادات */}
                      <td className="px-3 py-2.5 text-center font-mono">{rec?.startMileage != null ? fmt(rec.startMileage, 0) : '—'}</td>
                      <td className="px-3 py-2.5 text-center font-mono">{rec?.endMileage   != null ? fmt(rec.endMileage,   0) : '—'}</td>
                      <td className="px-3 py-2.5 text-center font-mono">{c.distance != null ? fmt(c.distance, 0) : '—'}</td>
                      <td className="px-3 py-2.5 text-center font-mono">
                        {c.consRate != null ? <span className={`font-semibold ${c.consRate > 20 ? 'text-destructive' : 'text-foreground'}`}>{fmt(c.consRate, 2)} %</span> : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground max-w-[120px] truncate">{rec?.notes || '—'}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openEdit(v)}
                            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition"
                            title="تسجيل / تعديل"
                          ><Pencil className="w-3.5 h-3.5" /></button>
                          {hasRecord && (
                            <button
                              onClick={() => { if (confirm('حذف بيانات هذا الشهر للوسيلة؟')) deleteMut.mutate(rec.id) }}
                              className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition"
                              title="حذف"
                            ><Trash2 className="w-3.5 h-3.5" /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* مخطط المقارنة السنوية */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm">
            مقارنة الاستهلاك السنوي — {selYear} مقابل {selYear - 1}
          </h3>
          <div className="flex gap-2">
            {(['consumed', 'delivered'] as const).map(m => (
              <button
                key={m}
                onClick={() => setChartMetric(m)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  chartMetric === m
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {m === 'consumed' ? 'المستهلك' : 'المسلم'}
              </button>
            ))}
          </div>
        </div>
        <div ref={chartRef} className="w-full">
          <FuelThresholdChart
            curYear={selYear}
            prevYear={selYear - 1}
            curData={curYearStats}
            prevData={prevYearStats}
            width={chartWidth}
            metric={chartMetric}
          />
        </div>
      </div>

      {/* ── Edit Modal ── */}
      {showModal && editVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={closeModal} />
          <div className="relative w-full max-w-2xl rounded-xl border border-border bg-card shadow-xl z-10 max-h-[90vh] flex flex-col" dir="rtl">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div>
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Fuel className="w-5 h-5 text-primary" />
                  تسجيل بيانات المحروقات
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {editVehicle.adminNumber} · {editVehicle.vehicleType || editVehicle.type} · {MONTHS_AR[selMonth - 1]} {selYear}
                </p>
              </div>
              <button onClick={closeModal} className="p-1 rounded-md hover:bg-muted text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
              {error && (
                <div className="rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm text-destructive flex items-center justify-between">
                  {error}
                  <button type="button" onClick={() => setError('')}><X className="w-4 h-4" /></button>
                </div>
              )}

              {/* Info row */}
              <div className="grid grid-cols-3 gap-3 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
                <div><span className="font-semibold text-foreground">نوع الوقود: </span>{editVehicle.fuelType}</div>
                <div><span className="font-semibold text-foreground">المقرر: </span>{fmt(editVehicle.fuelQuota ?? 0, 1)} لتر</div>
                <div><span className="font-semibold text-foreground">ثمن اللتر: </span>{getPriceForVehicle(editVehicle) > 0 ? getPriceForVehicle(editVehicle).toFixed(3) + ' د.ت' : 'غير محدد'}</div>
              </div>

              {/* المسلم + الإضافي */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">المسلم (د.ت)</label>
                  <input type="number" step="0.001" min="0"
                    value={form.deliveredAmount}
                    onChange={e => setForm(p => ({ ...p, deliveredAmount: e.target.value }))}
                    placeholder={getPriceForVehicle(editVehicle) > 0 && (editVehicle.fuelQuota ?? 0) > 0 ? fmt((editVehicle.fuelQuota ?? 0) * getPriceForVehicle(editVehicle)) : '0'}
                    className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">الإضافي (د.ت)</label>
                  <input type="number" step="0.001" min="0"
                    value={form.additionalAmount}
                    onChange={e => setForm(p => ({ ...p, additionalAmount: e.target.value }))}
                    placeholder="0"
                    className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              {/* المستهلك */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">المستهلك (د.ت)</label>
                <input type="number" step="0.001" min="0"
                  value={form.consumedAmount}
                  onChange={e => setForm(p => ({ ...p, consumedAmount: e.target.value }))}
                  className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* Computed preview */}
              {(() => {
                const price = getPriceForVehicle(editVehicle)
                const quota = editVehicle.fuelQuota ?? 0
                const d = form.deliveredAmount !== '' ? Number(form.deliveredAmount) : (quota * price)
                const a = form.additionalAmount !== '' ? Number(form.additionalAmount) : 0
                // الفائض يُحسب فقط إن أُدخل المستهلك
                const cEntered = form.consumedAmount !== ''
                const c = cEntered ? Number(form.consumedAmount) : null
                const surplusVal = c != null ? (d + a) - c : null
                const surplus = surplusVal != null && surplusVal > 0 ? surplusVal : null
                // النقص = (المقرر × ثمن اللتر) - المسلم
                const deficit = (quota * price) - d
                return (
                  <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted/30 border border-border p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">الفائض</span>
                      <span className={`font-bold ${surplus != null ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                        {surplus != null ? fmt(surplus) + ' د.ت' : '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">النقص</span>
                      <span className={`font-bold ${deficit > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                        {deficit > 0 ? fmt(deficit) + ' د.ت' : '—'}
                      </span>
                    </div>
                  </div>
                )
              })()}

              {/* العدادات */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">عداد أول الشهر (كلم)</label>
                  <input type="number" step="1" min="0"
                    value={form.startMileage}
                    onChange={e => setForm(p => ({ ...p, startMileage: e.target.value }))}
                    placeholder="من العداد الشهر الماضي"
                    className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">عداد آخر الشهر (كلم)</label>
                  <input type="number" step="1" min="0"
                    value={form.endMileage}
                    onChange={e => setForm(p => ({ ...p, endMileage: e.target.value }))}
                    className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              {/* Computed distance + rate */}
              {(() => {
                const start = form.startMileage !== '' ? Number(form.startMileage) : null
                const end   = form.endMileage   !== '' ? Number(form.endMileage)   : null
                const price = getPriceForVehicle(editVehicle)
                const cons  = form.consumedAmount !== '' ? Number(form.consumedAmount) : 0
                const dist  = start != null && end != null ? end - start : null
                const rate  = (cons > 0 && price > 0 && dist && dist > 0)
                  ? (cons / price * 100) / dist : null
                if (dist == null && rate == null) return null
                return (
                  <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted/30 border border-border p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">المسافة المقطوعة</span>
                      <span className="font-bold text-foreground">{dist != null ? fmt(dist, 0) + ' كلم' : '—'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">المعدل المئوي</span>
                      <span className={`font-bold ${rate != null && rate > 20 ? 'text-destructive' : 'text-foreground'}`}>
                        {rate != null ? fmt(rate, 2) + ' %' : '—'}
                      </span>
                    </div>
                  </div>
                )
              })()}

              {/* ملاحظات */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">ملاحظات</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  rows={2}
                  className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal}
                  className="flex-1 rounded-lg border border-input bg-background px-4 py-2.5 text-sm font-medium hover:bg-muted transition-colors">
                  إلغاء
                </button>
                <button type="submit" disabled={recordMut.isLoading}
                  className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60">
                  {recordMut.isLoading ? 'جارٍ الحفظ...' : 'حفظ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
