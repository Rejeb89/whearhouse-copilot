import React, { useState, useMemo, useContext } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import client from '../services/client'
import { AuthContext } from '../context/AuthContext'
import { Plus, Search, Pencil, Trash2, X, Car, Fuel, Building2, ChevronDown, AlertTriangle, CheckCircle2, FileDown } from 'lucide-react'

// ─── Constants ────────────────────────────────────────────────────────────────
const VEHICLE_TYPES = ['وسيلة نقل إدارية', 'مضخة مياه', 'مولد كهربائي', 'أخرى']
const FUEL_TYPES    = ['بنزين رفيع', 'غزوال', 'غزوال رفيع']

const EMPTY_FORM = {
  adminNumber:   '',
  vehicleType:   '',
  type:          '',
  fuelType:      '',
  fuelQuota:     '' as string | number,
  status:        'OPERATIONAL' as 'OPERATIONAL' | 'BROKEN',
  breakdownRef:  '',
  breakdownDate: '',
  entityId:      0,
  notes:         '',
}

interface Entity { id: number; name: string; category?: string }
interface Vehicle {
  id:             number
  adminNumber:    string
  vehicleType?:   string | null
  type:           string
  fuelType:       string
  fuelQuota?:     number | null
  status:         'OPERATIONAL' | 'BROKEN'
  breakdownRef?:  string | null
  breakdownDate?: string | null
  entityId:       number
  entity:         Entity
  securityUnit?:  string | null
  notes?:         string
  createdAt:      string
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Vehicles() {
  const qc = useQueryClient()
  const { user } = useContext(AuthContext)
  const [search, setSearch]     = useState('')
  const [filterEntity, setFilterEntity] = useState('')
  const [filterFuel,   setFilterFuel]   = useState('')
  const [showModal, setShowModal]       = useState(false)
  const [editing, setEditing]           = useState<Vehicle | null>(null)
  const [form, setForm]                 = useState(EMPTY_FORM)
  const [error, setError]               = useState('')
  const [typeInput, setTypeInput]       = useState('')

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: vehicles = [], isLoading } = useQuery<Vehicle[]>(
    ['vehicles'],
    async () => (await client.get('/vehicles')).data.data,
    { refetchInterval: 20000 }
  )

  const { data: allEntities = [] } = useQuery<Entity[]>(
    ['entities-beneficiary'],
    async () => {
      const res = await client.get('/entities')
      return (res.data.data as Entity[]).filter((e: any) => e.type === 'BENEFICIARY')
    }
  )

  // ── Mutations ────────────────────────────────────────────────────────────
  const saveMut = useMutation(
    async (payload: typeof EMPTY_FORM & { id?: number }) => {
      const { id, ...data } = payload
      if (id) return (await client.patch(`/vehicles/${id}`, data)).data.data
      return (await client.post('/vehicles', data)).data.data
    },
    {
      onSuccess: () => { qc.invalidateQueries(['vehicles']); closeModal() },
      onError: (e: any) => setError(e?.response?.data?.error || 'حدث خطأ'),
    }
  )

  const deleteMut = useMutation(
    (id: number) => client.delete(`/vehicles/${id}`),
    { onSuccess: () => qc.invalidateQueries(['vehicles']) }
  )

  // ── Derived data ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return vehicles.filter(v => {
      if (filterEntity && String(v.entityId) !== filterEntity) return false
      if (filterFuel   && v.fuelType !== filterFuel) return false
      if (!q) return true
      return (
        v.adminNumber.toLowerCase().includes(q) ||
        v.type.toLowerCase().includes(q) ||
        (v.vehicleType || '').toLowerCase().includes(q) ||
        v.fuelType.toLowerCase().includes(q) ||
        (v.entity?.name || '').toLowerCase().includes(q) ||
        (v.notes || '').toLowerCase().includes(q)
      )
    })
  }, [vehicles, search, filterEntity, filterFuel])

  const uniqueEntitiesInData = useMemo(() => {
    const seen = new Map<number, string>()
    vehicles.forEach(v => { if (!seen.has(v.entityId)) seen.set(v.entityId, v.entity?.name) })
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }))
  }, [vehicles])

  // ── Helpers ──────────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setTypeInput('')
    setError('')
    setShowModal(true)
  }

  const openEdit = (v: Vehicle) => {
    setEditing(v)
    setForm({
      adminNumber:   v.adminNumber,
      vehicleType:   (v as any).vehicleType || '',
      type:          v.type,
      fuelType:      v.fuelType,
      fuelQuota:     v.fuelQuota ?? '',
      status:        v.status ?? 'OPERATIONAL',
      breakdownRef:  v.breakdownRef || '',
      breakdownDate: v.breakdownDate ? v.breakdownDate.slice(0, 10) : '',
      entityId:      v.entityId,
      notes:         v.notes || '',
    })
    setTypeInput(v.type)
    setError('')
    setShowModal(true)
  }

  const closeModal = () => { setShowModal(false); setEditing(null); setForm(EMPTY_FORM); setTypeInput(''); setError('') }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.adminNumber.trim()) return setError('الرقم الإداري مطلوب')
    if (!form.type.trim())        return setError('صنف الوسيلة مطلوب')
    if (!form.fuelType)           return setError('نوع الوقود مطلوب')
    if (!form.entityId)           return setError('الوحدة التابعة مطلوبة')
    if (form.status === 'BROKEN' && !form.breakdownRef?.trim()) return setError('رقم برقية التعطب مطلوب')
    if (form.status === 'BROKEN' && !form.breakdownDate)         return setError('تاريخ برقية التعطب مطلوب')
    const payload: any = {
      ...form,
      fuelQuota:     form.fuelQuota !== '' ? Number(form.fuelQuota) : null,
      breakdownRef:  form.status === 'BROKEN' ? (form.breakdownRef || null) : null,
      breakdownDate: form.status === 'BROKEN' ? (form.breakdownDate || null) : null,
      ...(editing ? { id: editing.id } : {}),
    }
    saveMut.mutate(payload)
  }

  const fuelColor: Record<string, string> = {
    'بنزين رفيع':  'bg-blue-100 text-blue-700',
    'غزوال':       'bg-amber-100 text-amber-700',
    'غزوال رفيع': 'bg-orange-100 text-orange-700',
  }

  const typeFilterOptions = VEHICLE_TYPES

  // ── PDF Export ────────────────────────────────────────────────────────────
  const exportPDF = async () => {
    const unit   = user?.securityUnit || '—'
    const region = user?.region       || '—'
    const title  = user?.title        || ''
    const regionChief = (user as any)?.regionChief || ''
    const _r = (user?.securityUnit || '').trim()
    const regionChiefLabel = _r.startsWith('فوج') ? 'امر فوج' : _r.startsWith('اقليم') || _r.startsWith('إقليم') ? 'مدير الاقليم' : _r.startsWith('منطقة') ? 'رئيس المنطقة' : 'رئيس المنطقة'
    const today = (() => {
      const d = new Date()
      const day = String(d.getDate()).padStart(2, '0')
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const year = d.getFullYear()
      return `${year}/${month}/${day}`
    })()

    const headers = ['الرقم', 'رقم الوسيلة', 'نوع الوسيلة', 'الوحدة التابعة', 'الحالة', 'الملاحظات']
    const rows = filtered.map((v, i) => [
      String(i + 1),
      v.adminNumber,
      v.type,
      v.entity?.name || v.securityUnit || '—',
      v.status === 'BROKEN' ? 'معطبة' : 'صالحة',
      v.notes || '—',
    ])

    const totalOp = filtered.filter(v => v.status !== 'BROKEN').length
    const totalBr = filtered.filter(v => v.status === 'BROKEN').length

    const el = document.createElement('div')
    el.style.cssText = 'direction:rtl;font-family:"Cairo","Tahoma",sans-serif;background:#fff;padding:32px 36px;width:1200px;color:#0f172a;position:absolute;left:-9999px;top:0;z-index:-1;'
    el.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;">
        <div style="text-align:center;line-height:2.2;">
          <div style="font-weight:800;font-size:20px;color:#000;">الإدارة العامة للحرس الوطني</div>
          <div style="font-size:16px;color:#000;">${region}</div>
          ${region !== unit ? `<div style="font-size:16px;color:#000;">${unit}</div>` : ''}
          <div style="font-size:16px;color:#000;text-align:right;">عدد</div>
        </div>
        <div style="min-width:260px;">
          <table style="border-collapse:collapse;font-size:15px;border:1.5px solid #000;width:100%;">
            <thead>
              <tr style="border-bottom:1.5px solid #000;">
                <th style="padding:6px 14px;text-align:center;border-left:1.5px solid #000;font-weight:700;">الحالة</th>
                <th style="padding:6px 14px;text-align:center;font-weight:700;">العدد</th>
              </tr>
            </thead>
            <tbody>
              <tr style="border-bottom:1px solid #000;">
                <td style="padding:5px 14px;text-align:center;border-left:1px solid #000;font-weight:600;">صالحة</td>
                <td style="padding:5px 14px;text-align:center;">${totalOp}</td>
              </tr>
              <tr>
                <td style="padding:5px 14px;text-align:center;border-left:1px solid #000;font-weight:600;">معطبة</td>
                <td style="padding:5px 14px;text-align:center;">${totalBr}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div style="text-align:center;margin:10px 0 30px;">
        <span style="font-size:22px;font-weight:800;color:#000;border-bottom:2px solid #000;padding-bottom:4px;">
          قائمة الوسائل (${unit})
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
            : rows.map(row => `
            <tr style="border-bottom:1px solid #000;">
              ${row.map(c => `<td style="padding:7px 5px;border-left:1px solid #000;text-align:center;vertical-align:middle;">${c}</td>`).join('')}
            </tr>`).join('')}
        </tbody>
        <tfoot>
          <tr style="border-top:2px solid #000;font-weight:700;font-size:14px;">
            <td colspan="${headers.length - 1}" style="padding:8px;text-align:right;border-left:1px solid #000;">الإجمالي</td>
            <td style="padding:8px;text-align:center;">${filtered.length}</td>
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
      const { jsPDF }   = await import('jspdf')
      const html2canvas = await import('html2canvas')
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
      doc.save(`وسائل-${unit}.pdf`)
    } finally { el.remove() }
  }

  return (
    <div dir="rtl" className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Car className="w-6 h-6 text-primary" />
            الوسائل
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">وسائل النقل الإدارية المرتبطة بالوحدات</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={exportPDF}
            className="inline-flex items-center gap-2 rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            <FileDown className="w-4 h-4" />
            تصدير PDF
          </button>
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            إضافة وسيلة
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'إجمالي الوسائل',   value: vehicles.length,                                             icon: <Car className="w-4 h-4" />,                                  cls: '' },
          { label: 'صالحة',             value: vehicles.filter(v => v.status !== 'BROKEN').length,          icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,        cls: '' },
          { label: 'معطبة',             value: vehicles.filter(v => v.status === 'BROKEN').length,          icon: <AlertTriangle className="w-4 h-4 text-destructive" />,       cls: '' },
          { label: 'بنزين رفيع',       value: vehicles.filter(v => v.fuelType === 'بنزين رفيع').length, icon: <Fuel className="w-4 h-4 text-blue-500" />,                   cls: '' },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-border bg-card px-4 py-3 flex items-center gap-3">
            <div className="text-muted-foreground">{s.icon}</div>
            <div>
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute right-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="بحث بالرقم الإداري، النوع، الوحدة..."
              className="w-full pr-9 pl-8 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {search && <button onClick={() => setSearch('')} className="absolute left-2 top-2.5 text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>}
          </div>

          <div className="relative">
            <select
              value={filterEntity}
              onChange={e => setFilterEntity(e.target.value)}
              className="appearance-none border border-input bg-background rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">كل الوحدات</option>
              {uniqueEntitiesInData.map(e => <option key={e.id} value={String(e.id)}>{e.name}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>

          <div className="relative">
            <select
              value={filterFuel}
              onChange={e => setFilterFuel(e.target.value)}
              className="appearance-none border border-input bg-background rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">كل أنواع الوقود</option>
              {FUEL_TYPES.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>

          {(search || filterEntity || filterFuel) && (
            <button onClick={() => { setSearch(''); setFilterEntity(''); setFilterFuel('') }} className="text-xs text-destructive flex items-center gap-1 hover:underline">
              <X className="w-3 h-3" /> مسح الفلاتر
            </button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{filtered.length} وسيلة</p>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
            <Car className="w-10 h-10 opacity-20" />
            <p className="text-sm">{search || filterEntity || filterFuel ? 'لا توجد نتائج مطابقة' : 'لا توجد وسائل مسجلة بعد'}</p>
            {!search && !filterEntity && !filterFuel && (
              <button onClick={openAdd} className="text-primary text-sm hover:underline flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> إضافة أول وسيلة
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-right font-semibold text-muted-foreground">الرقم الإداري</th>
                  <th className="px-4 py-3 text-right font-semibold text-muted-foreground">نوع الوسيلة</th>
                  <th className="px-4 py-3 text-right font-semibold text-muted-foreground">صنف الوسيلة</th>
                  <th className="px-4 py-3 text-right font-semibold text-muted-foreground">نوع الوقود</th>
                  <th className="px-4 py-3 text-right font-semibold text-muted-foreground">المقرر (لتر)</th>
                  <th className="px-4 py-3 text-right font-semibold text-muted-foreground">الحالة</th>
                  <th className="px-4 py-3 text-right font-semibold text-muted-foreground">الوحدة التابعة</th>
                  <th className="px-4 py-3 text-right font-semibold text-muted-foreground">ملاحظات</th>
                  <th className="px-4 py-3 text-right font-semibold text-muted-foreground">تاريخ الإضافة</th>
                  <th className="px-4 py-3 text-center font-semibold text-muted-foreground">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(v => (
                  <tr key={v.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition">
                    <td className="px-4 py-3 font-mono font-semibold text-foreground">{v.adminNumber}</td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {(v as any).vehicleType ? (v as any).vehicleType : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-medium">
                        <Car className="w-3 h-3" />{v.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${fuelColor[v.fuelType] || 'bg-muted text-muted-foreground'}`}>
                        <Fuel className="w-3 h-3" />{v.fuelType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {v.fuelQuota != null ? <span className="font-mono">{v.fuelQuota} لتر</span> : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {v.status === 'BROKEN' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-xs font-medium">
                          <AlertTriangle className="w-3 h-3" />معطبة
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs font-medium">
                          <CheckCircle2 className="w-3 h-3" />صالحة
                        </span>
                      )}
                      {v.status === 'BROKEN' && v.breakdownRef && (
                        <p className="text-xs text-muted-foreground mt-0.5">برقية: {v.breakdownRef}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-foreground">
                        <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        {v.entity?.name || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs max-w-[160px] truncate">{v.notes || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                      {new Date(v.createdAt).toLocaleDateString('ar-TN')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEdit(v)}
                          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition"
                          title="تعديل"
                        ><Pencil className="w-4 h-4" /></button>
                        <button
                          onClick={() => { if (confirm(`حذف الوسيلة رقم ${v.adminNumber}؟`)) deleteMut.mutate(v.id) }}
                          className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition"
                          title="حذف"
                        ><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={closeModal} />
          <div className="relative w-full max-w-lg rounded-xl border border-border bg-card shadow-xl z-10 max-h-[90vh] flex flex-col" dir="rtl">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Car className="w-5 h-5 text-primary" />
                {editing ? 'تعديل الوسيلة' : 'إضافة وسيلة جديدة'}
              </h2>
              <button onClick={closeModal} className="p-1 rounded-md hover:bg-muted text-muted-foreground"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
              {error && (
                <div className="rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm text-destructive flex items-center justify-between">
                  {error}
                  <button type="button" onClick={() => setError('')}><X className="w-4 h-4" /></button>
                </div>
              )}

              {/* الرقم الإداري */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">الرقم الإداري <span className="text-destructive">*</span></label>
                <input
                  value={form.adminNumber}
                  onChange={e => setForm(p => ({ ...p, adminNumber: e.target.value }))}
                  placeholder="مثال: 12345-A"
                  className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* نوع الوسيلة - نص حر */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">نوع الوسيلة</label>
                <input
                  value={(form as any).vehicleType || ''}
                  onChange={e => setForm(p => ({ ...p, vehicleType: e.target.value }))}
                  placeholder="مثال: غزوال بيك آب، P4..."
                  className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* صنف الوسيلة */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">صنف الوسيلة <span className="text-destructive">*</span></label>
                <select
                  value={form.type}
                  onChange={e => { setForm(p => ({ ...p, type: e.target.value })); setTypeInput(e.target.value) }}
                  className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">اختر صنف الوسيلة...</option>
                  {VEHICLE_TYPES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* نوع الوقود */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">نوع الوقود <span className="text-destructive">*</span></label>
                <select
                  value={form.fuelType}
                  onChange={e => setForm(p => ({ ...p, fuelType: e.target.value }))}
                  className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">اختر نوع الوقود...</option>
                  {FUEL_TYPES.map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>

              {/* المقرر بالتر */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">المقرر بالتر</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={form.fuelQuota}
                  onChange={e => setForm(p => ({ ...p, fuelQuota: e.target.value }))}
                  placeholder="مثال: 60"
                  className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* حالة الوسيلة */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">حالة الوسيلة</label>
                <select
                  value={form.status}
                  onChange={e => setForm(p => ({ ...p, status: e.target.value as 'OPERATIONAL' | 'BROKEN', breakdownRef: '', breakdownDate: '' }))}
                  className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="OPERATIONAL">صالحة</option>
                  <option value="BROKEN">معطبة</option>
                </select>
              </div>

              {/* حقول التعطب — تظهر فقط عند اختيار معطبة */}
              {form.status === 'BROKEN' && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-3">
                  <p className="text-xs font-semibold text-destructive flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />بيانات برقية التعطب
                  </p>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">رقم برقية التعطب <span className="text-destructive">*</span></label>
                    <input
                      value={form.breakdownRef}
                      onChange={e => setForm(p => ({ ...p, breakdownRef: e.target.value }))}
                      placeholder="مثال: 2024/1234"
                      className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">تاريخ البرقية <span className="text-destructive">*</span></label>
                    <input
                      type="date"
                      value={form.breakdownDate}
                      onChange={e => setForm(p => ({ ...p, breakdownDate: e.target.value }))}
                      className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
              )}

              {/* الوحدة التابعة */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">الوحدة التابعة لها <span className="text-destructive">*</span></label>
                <div className="relative">
                  <select
                    value={form.entityId || ''}
                    onChange={e => setForm(p => ({ ...p, entityId: Number(e.target.value) }))}
                    className="w-full appearance-none rounded-lg border border-input bg-background px-3.5 py-2.5 pr-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">اختر الوحدة...</option>
                    {allEntities.map(e => (
                      <option key={e.id} value={e.id}>{e.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute left-3 top-3 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              {/* ملاحظات */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">ملاحظات</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="أي معلومات إضافية..."
                  rows={3}
                  className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={saveMut.isLoading}
                  className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {saveMut.isLoading && <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />}
                  {editing ? 'حفظ التعديلات' : 'إضافة الوسيلة'}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted transition"
                >إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
