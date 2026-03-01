import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import client from '../services/client'
import { Plus, Search, Pencil, Trash2, X, Car, Fuel, Building2, ChevronDown } from 'lucide-react'

// ─── Constants ────────────────────────────────────────────────────────────────
const VEHICLE_TYPES = ['50', 'غزوال عادي', 'غزوال بيك أب', 'P4', 'حافلة', 'شاحنة', 'سيارة إدارية']
const FUEL_TYPES    = ['بنزين رفيع', 'غزوال']

const EMPTY_FORM = {
  adminNumber: '',
  type:        '',
  fuelType:    '',
  entityId:    0,
  notes:       '',
}

interface Entity { id: number; name: string; category?: string }
interface Vehicle {
  id:          number
  adminNumber: string
  type:        string
  fuelType:    string
  entityId:    number
  entity:      Entity
  notes?:      string
  createdAt:   string
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Vehicles() {
  const qc = useQueryClient()
  const [search, setSearch]     = useState('')
  const [filterEntity, setFilterEntity] = useState('')
  const [filterFuel,   setFilterFuel]   = useState('')
  const [showModal, setShowModal]       = useState(false)
  const [editing, setEditing]           = useState<Vehicle | null>(null)
  const [form, setForm]                 = useState(EMPTY_FORM)
  const [error, setError]               = useState('')
  const [typeInput, setTypeInput]       = useState('')
  const [showTypeDrop, setShowTypeDrop] = useState(false)

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
    setForm({ adminNumber: v.adminNumber, type: v.type, fuelType: v.fuelType, entityId: v.entityId, notes: v.notes || '' })
    setTypeInput(v.type)
    setError('')
    setShowModal(true)
  }

  const closeModal = () => { setShowModal(false); setEditing(null); setForm(EMPTY_FORM); setTypeInput(''); setError('') }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.adminNumber.trim()) return setError('الرقم الإداري مطلوب')
    if (!form.type.trim())        return setError('نوع الوسيلة مطلوب')
    if (!form.fuelType)           return setError('نوع الوقود مطلوب')
    if (!form.entityId)           return setError('الوحدة التابعة مطلوبة')
    saveMut.mutate({ ...form, ...(editing ? { id: editing.id } : {}) } )
  }

  const selectType = (t: string) => { setForm(p => ({ ...p, type: t })); setTypeInput(t); setShowTypeDrop(false) }

  const fuelColor: Record<string, string> = {
    'بنزين رفيع': 'bg-blue-100 text-blue-700',
    'غزوال':      'bg-amber-100 text-amber-700',
  }

  const typeFilterOptions = VEHICLE_TYPES

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
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          إضافة وسيلة
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'إجمالي الوسائل', value: vehicles.length, icon: <Car className="w-4 h-4" /> },
          { label: 'بنزين رفيع', value: vehicles.filter(v => v.fuelType === 'بنزين رفيع').length, icon: <Fuel className="w-4 h-4 text-blue-500" /> },

          { label: 'غزوال', value: vehicles.filter(v => v.fuelType === 'غزوال').length, icon: <Fuel className="w-4 h-4 text-amber-500" /> },
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
            <ChevronDown className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground pointer-events-none" />
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
            <ChevronDown className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground pointer-events-none" />
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
                  <th className="px-4 py-3 text-right font-semibold text-muted-foreground">نوع الوقود</th>
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
          <div className="relative w-full max-w-md rounded-xl border border-border bg-card shadow-xl z-10" dir="rtl">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Car className="w-5 h-5 text-primary" />
                {editing ? 'تعديل الوسيلة' : 'إضافة وسيلة جديدة'}
              </h2>
              <button onClick={closeModal} className="p-1 rounded-md hover:bg-muted text-muted-foreground"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
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

              {/* نوع الوسيلة */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">نوع الوسيلة <span className="text-destructive">*</span></label>
                <div className="relative">
                  <input
                    value={typeInput}
                    onChange={e => { setTypeInput(e.target.value); setForm(p => ({ ...p, type: e.target.value })); setShowTypeDrop(true) }}
                    onFocus={() => setShowTypeDrop(true)}
                    placeholder="اختر أو اكتب النوع..."
                    className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    autoComplete="off"
                  />
                  {showTypeDrop && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowTypeDrop(false)} />
                      <div className="absolute top-full mt-1 w-full z-20 rounded-lg border border-border bg-card shadow-lg overflow-hidden">
                        {VEHICLE_TYPES.filter(t => t.toLowerCase().includes(typeInput.toLowerCase())).map(t => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => selectType(t)}
                            className="w-full text-right px-4 py-2 text-sm hover:bg-muted transition-colors"
                          >{t}</button>
                        ))}
                        {typeInput && !VEHICLE_TYPES.includes(typeInput) && (
                          <button
                            type="button"
                            onClick={() => selectType(typeInput)}
                            className="w-full text-right px-4 py-2 text-sm hover:bg-muted transition-colors text-primary"
                          >استخدام "{typeInput}"</button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* نوع الوقود */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">نوع الوقود <span className="text-destructive">*</span></label>
                <div className="grid grid-cols-3 gap-2">
                  {FUEL_TYPES.map(f => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, fuelType: f }))}
                      className={`rounded-lg border px-3 py-2 text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
                        form.fuelType === f
                          ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary'
                          : 'border-input bg-background text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      <Fuel className="w-3.5 h-3.5" />
                      {f}
                    </button>
                  ))}
                </div>
              </div>

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
