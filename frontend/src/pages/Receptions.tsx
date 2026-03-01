import React, { useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import client from '../services/client'
import { Check, ChevronDown, Download, Eye, Loader2, Plus, Search, Truck, User, X } from 'lucide-react'
import * as XLSX from 'xlsx'

interface Supplier {
  id: number
  name: string
  phone?: string
}

interface Employee {
  id: number
  rank: string
  name: string
  surname: string
  number: string
  entity?: { id: number; name: string }
}

interface ReceptionFormState {
  itemName: string
  category: string
  quantity: number
  lowStockThreshold: number
  adminNumber: string
  referenceType: string
  referenceNumber: string
  referenceDate: string
  notes: string
}

interface ReceptionRecord {
  id: number
  reference: string
  referenceType?: string
  referenceNumber?: string
  referenceDate?: string
  notes?: string
  createdAt: string
  supplier?: { id: number; name: string; phone?: string }
  collector?: { id: number; rank: string; name: string; surname: string; number: string }
  items: { id: number; quantity: number; adminNumber?: string; item: { id: number; name: string; category: string; quantity: number } }[]
}

export default function Receptions() {
  const [form, setForm] = useState<ReceptionFormState>({
    itemName: '',
    category: '',
    quantity: 1,
    lowStockThreshold: 5,
    adminNumber: '',
    referenceType: '',
    referenceNumber: '',
    referenceDate: '',
    notes: ''
  })
  /* ── item combobox ── */
  const [itemSearch, setItemSearch] = useState('')
  const [itemDropdownOpen, setItemDropdownOpen] = useState(false)
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null)
  const itemInputRef = useRef<HTMLInputElement>(null)

  /* ── reference type combobox ── */
  const [refTypeOpen, setRefTypeOpen] = useState(false)
  const [refTypeKnown, setRefTypeKnown] = useState(false)
  const refTypeInputRef = useRef<HTMLInputElement>(null)

  /* ── category combobox (for new items) ── */
  const [categoryOpen, setCategoryOpen] = useState(false)
  const categoryInputRef = useRef<HTMLInputElement>(null)

  const [supplierSearch, setSupplierSearch] = useState('')
  const [supplierPhone, setSupplierPhone] = useState('')
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [addingSupplier, setAddingSupplier] = useState(false)
  const [supplierType, setSupplierType] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  /* ── collector (القائم بالسحب) ── */
  const [collectorSearch, setCollectorSearch] = useState('')
  const [collectorDropdownOpen, setCollectorDropdownOpen] = useState(false)
  const [selectedCollector, setSelectedCollector] = useState<Employee | null>(null)
  const collectorInputRef = useRef<HTMLInputElement>(null)

  /* ── history section ── */
  const [histSearch, setHistSearch] = useState('')
  const [histRefTypeFilter, setHistRefTypeFilter] = useState('')
  const [histDateFrom, setHistDateFrom] = useState('')
  const [histDateTo, setHistDateTo] = useState('')
  const [detailReception, setDetailReception] = useState<ReceptionRecord | null>(null)
  const queryClient = useQueryClient()

  const { data: allItems = [] } = useQuery<any[]>(
    ['items-list'],
    async () => (await client.get('/items')).data.data,
    { refetchInterval: 30000 }
  )

  const filteredItems = useMemo(() => {
    const term = itemSearch.trim().toLowerCase()
    if (!term) return allItems.slice(0, 50)
    return allItems.filter((it: any) =>
      it.name.toLowerCase().includes(term) ||
      (it.category || '').toLowerCase().includes(term)
    )
  }, [itemSearch, allItems])

  const availableCategories = useMemo(() => {
    const cats = new Set<string>()
    allItems.forEach((it: any) => {
      if (it.category && it.category.trim()) {
        cats.add(it.category.trim())
      }
    })
    return Array.from(cats).sort()
  }, [allItems])

  const filteredCategories = useMemo(() => {
    const term = form.category.trim().toLowerCase()
    if (!term) return availableCategories
    return availableCategories.filter(cat => cat.toLowerCase().includes(term))
  }, [form.category, availableCategories])

  const { data: suppliers = [], refetch: refetchSuppliers, isLoading: loadingSuppliers } = useQuery<Supplier[]>(
    ['suppliers'],
    async () => (await client.get('/entities?type=SUPPLIER')).data.data,
    { refetchInterval: 10000 }
  )

  const { data: allEmployees = [] } = useQuery<Employee[]>(
    ['all-employees'],
    async () => (await client.get('/employees')).data.data,
    { refetchInterval: 60000 }
  )

  const filteredCollectors = useMemo(() => {
    const term = collectorSearch.trim().toLowerCase()
    if (!term) return allEmployees.slice(0, 40)
    return allEmployees.filter((e) =>
      e.name.toLowerCase().includes(term) ||
      e.surname.toLowerCase().includes(term) ||
      e.rank.toLowerCase().includes(term) ||
      e.number.toLowerCase().includes(term)
    )
  }, [collectorSearch, allEmployees])

  const { data: referenceTypes = [] } = useQuery<string[]>(
    ['reference-types'],
    async () => (await client.get('/receptions/reference-types')).data.data,
    { refetchInterval: 30000 }
  )

  const { data: allReceptions = [], isLoading: loadingHistory } = useQuery<ReceptionRecord[]>(
    ['receptions-all'],
    async () => (await client.get('/receptions')).data.data,
    { refetchInterval: 15000 }
  )

  const filteredHistory = useMemo(() => {
    let list = allReceptions
    if (histRefTypeFilter) list = list.filter(r => r.referenceType === histRefTypeFilter)
    if (histDateFrom) list = list.filter(r => new Date(r.createdAt) >= new Date(histDateFrom))
    if (histDateTo) {
      const to = new Date(histDateTo); to.setHours(23, 59, 59, 999)
      list = list.filter(r => new Date(r.createdAt) <= to)
    }
    if (histSearch.trim()) {
      const q = histSearch.trim().toLowerCase()
      list = list.filter(r =>
        (r.items || []).some(ri =>
          ri && ri.item && (
            (ri.item.name || '').toLowerCase().includes(q) ||
            (ri.item.sku || '').toLowerCase().includes(q) ||
            (ri.item.category || '').toLowerCase().includes(q) ||
            (ri.item.description || '').toLowerCase().includes(q)
          ) ||
          (ri.adminNumber || '').toLowerCase().includes(q)
        ) ||
        (r.referenceNumber || '').toLowerCase().includes(q) ||
        (r.referenceType || '').toLowerCase().includes(q) ||
        (r.notes || '').toLowerCase().includes(q) ||
        (r.supplier?.name || '').toLowerCase().includes(q) ||
        (r.supplier?.phone || '').toLowerCase().includes(q) ||
        (r.collector ? `${r.collector.rank} ${r.collector.name} ${r.collector.surname} ${r.collector.number || ''}`.toLowerCase().includes(q) : false)
      )
    }
    return list
  }, [allReceptions, histSearch, histRefTypeFilter, histDateFrom, histDateTo])

  const filteredRefTypes = useMemo(() => {
    const term = form.referenceType.trim().toLowerCase()
    if (!term) return referenceTypes
    return (referenceTypes as string[]).filter(t => t.toLowerCase().includes(term))
  }, [form.referenceType, referenceTypes])

  const filteredSuppliers = useMemo(() => {
    const term = supplierSearch.trim().toLowerCase()
    if (!term) return suppliers
    return suppliers.filter((s) => s.name.toLowerCase().includes(term) || (s.phone || '').toLowerCase().includes(term))
  }, [supplierSearch, suppliers])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: (name === 'quantity' || name === 'lowStockThreshold') ? Math.max(0, Number(value) || 0) : value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    if (!form.itemName.trim() || !form.category.trim()) {
      setError('يرجى تعبئة اسم التجهيز وصنف التجهيز')
      return
    }

    try {
      setSubmitting(true)
      await client.post('/receptions', {
        referenceNumber: form.referenceNumber || undefined,
        referenceType: form.referenceType || undefined,
        referenceDate: form.referenceDate || undefined,
        supplierId: selectedSupplier?.id,
        collectorId: selectedCollector?.id,
        notes: form.notes || undefined,
        items: [
          {
            itemName: form.itemName,
            category: form.category,
            quantity: form.quantity,
            lowStockThreshold: form.category.trim().replace(/[أإآ]/g, 'ا') === 'اثاث قار' ? 0 : form.lowStockThreshold,
            adminNumber: form.adminNumber || undefined
          }
        ]
      })
      setSuccess('تم تسجيل الاستلام بنجاح وتمت إضافة الكمية إلى المخزون')
      queryClient.invalidateQueries(['receptions-all'])
      setForm({ itemName: '', category: '', quantity: 1, lowStockThreshold: 5, adminNumber: '', referenceType: '', referenceNumber: '', referenceDate: '', notes: '' })
      setSelectedSupplier(null)
      setSupplierSearch('')
      setSupplierPhone('')
      setItemSearch('')
      setSelectedItemId(null)
      setRefTypeKnown(false)
      setSelectedCollector(null)
      setCollectorSearch('')
    } catch (err: any) {
      setError(err?.response?.data?.error || 'تعذر حفظ الاستلام')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAddSupplier = async () => {
    setError(null)
    setSuccess(null)
    const name = supplierSearch.trim()
    if (!name) {
      setError('يرجى إدخال اسم الجهة المرسلة')
      return
    }
    if (!supplierType) {
      setError('يرجى تحديد نوع الجهة')
      return
    }
    try {
      setAddingSupplier(true)
      const res = await client.post('/entities', {
        name,
        type: 'SUPPLIER',
        category: supplierType,
        phone: supplierPhone.trim() || 'غير متوفر'
      })
      setSelectedSupplier(res.data.data)
      setSupplierSearch('')
      setSupplierPhone('')
      setSupplierType('')
      await refetchSuppliers()
      setSuccess('تمت إضافة الجهة المرسلة وربطها بالاستلام')
    } catch (err: any) {
      setError(err?.response?.data?.error || 'تعذر إضافة الجهة المرسلة')
    } finally {
      setAddingSupplier(false)
    }
  }

  const handleExportHistory = () => {
    const rows = allReceptions.flatMap(r =>
      (r.items || []).filter(ri => ri && ri.item).map(ri => ({
        'اسم التجهيز': ri.item?.name || '—',
        'الصنف': ri.item?.category || '—',
        'الكمية': ri?.quantity || 0,
        'رقم المخزن': ri?.adminNumber || '—',
        'نوع المرجع': r.referenceType || '—',
        'رقم المرجع': r.referenceNumber || '—',
        'تاريخ المرجع': r.referenceDate ? new Date(r.referenceDate).toLocaleDateString('ar-DZ') : '—',
        'الجهة المرسلة': r.supplier?.name || '—',
        'القائم بالسحب': r.collector ? `${r.collector.rank} ${r.collector.name} ${r.collector.surname}` : '—',
        'تاريخ التسلم': new Date(r.createdAt).toLocaleDateString('ar-DZ'),
        'الملاحظات': r.notes || '—',
      }))
    )
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'الدخل اليومي')
    XLSX.writeFile(wb, `receptions_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  return (
    <div dir="rtl" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">دخل يومي</h1>
          <p className="text-sm text-muted-foreground">تسجيل تجهيزات جديدة في المخزون</p>
        </div>
        {/* <div className="flex items-center gap-3 text-sm text-gray-700">
          <Truck className="w-5 h-5 text-blue-600" />
          <span>إدخال تجهيز جديد يرفع المخزون مباشرة</span>
        </div> */}
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section className="lg:col-span-2 rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* ─── Item name combobox ─── */}
            <div className="relative">
              <label className="block text-sm mb-1">اسم التجهيز</label>
              <div className="relative">
                <input
                  ref={itemInputRef}
                  type="text"
                  value={itemSearch || form.itemName}
                  onChange={(e) => {
                    const val = e.target.value
                    setItemSearch(val)
                    setForm(prev => ({ ...prev, itemName: val }))
                    setSelectedItemId(null)
                    setItemDropdownOpen(true)
                  }}
                  onFocus={() => setItemDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setItemDropdownOpen(false), 180)}
                  placeholder="ابحث أو أضف تجهيزاً جديداً"
                  className="w-full border border-input bg-background p-2 pl-8 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                />
                <ChevronDown className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground pointer-events-none" />
                {(itemSearch || form.itemName) && (
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setItemSearch('')
                      setForm(prev => ({ ...prev, itemName: '', category: '' }))
                      setSelectedItemId(null)
                      itemInputRef.current?.focus()
                    }}
                    className="absolute left-7 top-2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {itemDropdownOpen && (
                <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-card shadow-lg max-h-52 overflow-y-auto">
                  {filteredItems.length === 0 && (
                    <div className="px-3 py-2 text-xs text-muted-foreground">
                      لا يوجد تجهيز مطابق — سيتم إنشاؤه تلقائياً عند الحفظ
                    </div>
                  )}
                  {filteredItems.map((it: any) => (
                    <button
                      key={it.id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setForm(prev => ({ ...prev, itemName: it.name, category: it.category || '' }))
                        setItemSearch('')
                        setSelectedItemId(it.id)
                        setItemDropdownOpen(false)
                      }}
                      className={`w-full text-right px-3 py-2 text-sm hover:bg-muted/60 flex items-center justify-between ${
                        selectedItemId === it.id ? 'bg-primary/10 font-semibold' : ''
                      }`}
                    >
                      <span>{it.name}</span>
                      <span className="text-xs text-muted-foreground">{it.category || '—'}</span>
                    </button>
                  ))}
                </div>
              )}
              {selectedItemId && (
                <p className="text-xs text-green-700 mt-1 flex items-center gap-1">
                  <Check className="w-3 h-3" /> تجهيز موجود — سيتم إضافة الكمية للمخزون
                </p>
              )}
              {!selectedItemId && form.itemName.trim() && (
                <p className="text-xs text-primary mt-1 flex items-center gap-1">
                  <Plus className="w-3 h-3" /> تجهيز جديد — سيتم إنشاؤه عند الحفظ
                </p>
              )}
            </div>
            {/* ─── Category (auto-filled from item or combobox) ─── */}
            {!selectedItemId ? (
              <div className="relative">
                <label className="block text-sm mb-1">صنف التجهيز</label>
                <div className="relative">
                  <input
                    ref={categoryInputRef}
                    type="text"
                    name="category"
                    value={form.category}
                    onChange={(e) => {
                      handleChange(e)
                      setCategoryOpen(true)
                    }}
                    onFocus={() => setCategoryOpen(true)}
                    onBlur={() => setTimeout(() => setCategoryOpen(false), 180)}
                    placeholder="ابحث أو أضف صنف جديد"
                    className="w-full border border-input bg-background p-2 pl-8 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    required
                  />
                  <ChevronDown className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground pointer-events-none" />
                  {form.category && (
                    <button
                      type="button"
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => {
                        setForm(prev => ({ ...prev, category: '' }))
                        categoryInputRef.current?.focus()
                      }}
                      className="absolute left-7 top-2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {categoryOpen && (
                  <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-card shadow-lg max-h-48 overflow-y-auto">
                    {filteredCategories.length === 0 && (
                      <div className="px-3 py-2 text-xs text-muted-foreground">
                        لا يوجد صنف مطابق — سيتم تسجيل صنف جديد عند الحفظ
                      </div>
                    )}
                    {filteredCategories.map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => {
                          setForm(prev => ({ ...prev, category: cat }))
                          setCategoryOpen(false)
                        }}
                        className={`w-full text-right px-3 py-2 text-sm hover:bg-muted/60 flex items-center justify-between ${
                          form.category === cat ? 'bg-primary/10 font-semibold' : ''
                        }`}
                      >
                        <span>{cat}</span>
                        {form.category === cat && <Check className="w-3.5 h-3.5 text-primary" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-sm mb-1">صنف التجهيز</label>
                <input
                  type="text"
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  readOnly={true}
                  className="w-full border border-input bg-background p-2 rounded-lg text-sm opacity-70 cursor-not-allowed bg-muted/50"
                />
                <p className="text-xs text-muted-foreground mt-1">مجلوب تلقائياً من التجهيز المحدد</p>
              </div>
            )}
            <div>
              <label className="block text-sm mb-1">الكمية</label>
              <input
                type="number"
                name="quantity"
                min={1}
                value={form.quantity}
                onChange={handleChange}
                className="w-full border border-input bg-background p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>
            {form.category.trim().replace(/[أإآ]/g, 'ا') !== 'اثاث قار' && (
            <div>
              <label className="block text-sm mb-1 flex items-center gap-1">
                حد التنبيه الأدنى
                <span className="text-xs text-muted-foreground">(تنبيه عند انخفاض الكمية)</span>
              </label>
              <input
                type="number"
                name="lowStockThreshold"
                min={0}
                value={form.lowStockThreshold}
                onChange={handleChange}
                className="w-full border border-input bg-background p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="مثال: 5"
              />
            </div>
            )}
            {/* الرقم الإداري — يظهر فقط عند صنف أثاث قار */}
            {form.category.trim().replace(/[أإآ]/g, 'ا') === 'اثاث قار' && (
              <div className="md:col-span-2">
                <label className="block text-sm mb-1 font-semibold text-blue-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
                  الرقم الإداري
                  <span className="text-xs font-normal text-muted-foreground">(خاص بأثاث قار)</span>
                </label>
                <input
                  type="text"
                  name="adminNumber"
                  value={form.adminNumber}
                  onChange={handleChange}
                  className="w-full border-2 border-primary/30 focus:border-primary p-2 rounded-lg bg-primary/5 focus:bg-background transition text-sm"
                  placeholder="أدخل الرقم الإداري للتجهيز"
                />
              </div>
            )}
            <div className="relative">
              <label className="block text-sm mb-1">نوع المرجع</label>
              <div className="relative">
                <input
                  ref={refTypeInputRef}
                  type="text"
                  name="referenceType"
                  value={form.referenceType}
                  onChange={(e) => {
                    handleChange(e)
                    setRefTypeKnown(false)
                    setRefTypeOpen(true)
                  }}
                  onFocus={() => setRefTypeOpen(true)}
                  onBlur={() => setTimeout(() => setRefTypeOpen(false), 180)}
                  placeholder="ابحث أو أضف نوع مرجع جديد"
                  className="w-full border border-input bg-background p-2 pl-8 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <ChevronDown className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground pointer-events-none" />
                {form.referenceType && (
                  <button
                    type="button"
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => {
                      setForm(prev => ({ ...prev, referenceType: '' }))
                      setRefTypeKnown(false)
                      refTypeInputRef.current?.focus()
                    }}
                    className="absolute left-7 top-2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {refTypeOpen && (
                <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-card shadow-lg max-h-52 overflow-y-auto">
                  {filteredRefTypes.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-muted-foreground">
                      لا يوجد نوع مطابق — سيتم تسجيله عند الحفظ
                    </div>
                  ) : (
                    (filteredRefTypes as string[]).map(type => (
                      <button
                        key={type}
                        type="button"
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => {
                          setForm(prev => ({ ...prev, referenceType: type }))
                          setRefTypeKnown(true)
                          setRefTypeOpen(false)
                        }}
                        className={`w-full text-right px-3 py-2 text-sm hover:bg-muted/60 flex items-center justify-between ${
                          form.referenceType === type && refTypeKnown ? 'bg-primary/10 font-semibold' : ''
                        }`}
                      >
                        <span>{type}</span>
                        {form.referenceType === type && refTypeKnown && <Check className="w-3.5 h-3.5 text-primary" />}
                      </button>
                    ))
                  )}
                </div>
              )}
              {refTypeKnown && (
                <p className="text-xs text-green-700 mt-1 flex items-center gap-1">
                  <Check className="w-3 h-3" /> نوع مرجع موجود
                </p>
              )}
              {!refTypeKnown && form.referenceType.trim() && (
                <p className="text-xs text-primary mt-1 flex items-center gap-1">
                  <Plus className="w-3 h-3" /> نوع جديد — سيتم تسجيله عند الحفظ
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm mb-1">رقم المرجع</label>
              <input
                type="text"
                name="referenceNumber"
                value={form.referenceNumber}
                onChange={handleChange}
                className="w-full border border-input bg-background p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="اختياري"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">تاريخ المرجع</label>
              <input
                type="date"
                name="referenceDate"
                value={form.referenceDate}
                onChange={handleChange}
                className="w-full border border-input bg-background p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          {/* ── القائم بالسحب ── */}
          <div className="relative">
            <label className="block text-sm mb-1 font-medium">القائم بالسحب</label>
            {selectedCollector ? (
              <div className="flex items-center justify-between gap-2 border border-primary bg-primary/5 rounded-lg px-3 py-2.5 text-sm">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-primary shrink-0" />
                  <span className="font-semibold text-primary">{selectedCollector.rank}</span>
                  <span className="text-foreground">{selectedCollector.name} {selectedCollector.surname}</span>
                  <span className="text-muted-foreground text-xs">({selectedCollector.number})</span>
                </div>
                <button
                  type="button"
                  onClick={() => { setSelectedCollector(null); setCollectorSearch('') }}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  ref={collectorInputRef}
                  type="text"
                  value={collectorSearch}
                  onChange={(e) => { setCollectorSearch(e.target.value); setCollectorDropdownOpen(true) }}
                  onFocus={() => setCollectorDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setCollectorDropdownOpen(false), 200)}
                  className="w-full border border-input bg-background pr-9 pl-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="ابحث بالاسم أو اللقب أو الرتبة أو الرقم الشخصي…"
                />
                {collectorDropdownOpen && filteredCollectors.length > 0 && (
                  <div className="absolute z-30 mt-1 w-full max-h-52 overflow-y-auto rounded-lg border border-border bg-card shadow-lg">
                    {filteredCollectors.map((emp) => (
                      <button
                        key={emp.id}
                        type="button"
                        onMouseDown={() => {
                          setSelectedCollector(emp)
                          setCollectorSearch('')
                          setCollectorDropdownOpen(false)
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted text-right transition-colors"
                      >
                        <User className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="font-semibold text-primary text-xs">{emp.rank} </span>
                          <span className="text-sm text-foreground">{emp.name} {emp.surname}</span>
                          <span className="text-xs text-muted-foreground mr-2">ر.ش: {emp.number}</span>
                        </div>
                        {emp.entity && (
                          <span className="text-xs text-muted-foreground truncate max-w-[100px]">{emp.entity.name}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                {collectorDropdownOpen && allEmployees.length === 0 && (
                  <div className="absolute z-30 mt-1 w-full rounded-lg border border-border bg-card shadow-lg px-3 py-3 text-sm text-muted-foreground text-center">
                    لا يوجد موظفون مسجّلون
                  </div>
                )}
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm mb-1">الملاحظات</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              className="w-full border border-input bg-background p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              rows={3}
              placeholder="أي تفاصيل إضافية حول الاستلام"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center gap-2 text-sm font-medium transition"
              disabled={submitting}
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              تسجيل استلام جديد
            </button>
          </div>
          {error && <div className="text-sm text-destructive bg-destructive/10 p-2 rounded-lg">{error}</div>}
          {success && <div className="text-sm text-green-700 bg-green-50 border border-green-200 p-2 rounded-lg">{success}</div>}
        </section>

        <section className="rounded-xl border border-border bg-card p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Search className="w-4 h-4" />
            <span>اختر الجهة المرسلة أو أضف جهة جديدة</span>
          </div>

          <div className="space-y-2">
            <label className="block text-sm">بحث عن جهة مرسلة</label>
            <input
              type="text"
              value={supplierSearch}
              onChange={(e) => setSupplierSearch(e.target.value)}
              placeholder="اسم الجهة أو رقم الهاتف"
              className="w-full border border-input bg-background p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              type="text"
              value={supplierPhone}
              onChange={(e) => setSupplierPhone(e.target.value)}
              placeholder="هاتف الجهة (عند إضافة جديدة)"
              className="w-full border border-input bg-background p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <select
              value={supplierType}
              onChange={(e) => setSupplierType(e.target.value)}
              className="w-full border border-input bg-background p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">اختر نوع الجهة</option>
              <option value="الادارات المركزية">إدارة مركزية</option>
              <option value="مزود">مزود</option>
              <option value="أخرى">أخرى</option>
            </select>
            <button
              type="button"
              onClick={handleAddSupplier}
              className="w-full px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center justify-center gap-2 text-sm font-medium transition"
              disabled={addingSupplier}
            >
              {addingSupplier ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              إضافة جهة جديدة (مسلمة)
            </button>
          </div>

          <div className="rounded-lg border border-border divide-y divide-border max-h-64 overflow-y-auto">
            {loadingSuppliers && (
              <div className="p-3 text-sm text-muted-foreground">جاري التحميل...</div>
            )}
            {!loadingSuppliers && filteredSuppliers.length === 0 && (
              <div className="p-3 text-sm text-muted-foreground">لا يوجد نتائج</div>
            )}
            {filteredSuppliers.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setSelectedSupplier(s)
                  setSupplierSearch('')
                  setSupplierPhone('')
                  setSupplierType('')
                }}
                className={`w-full text-right p-3 hover:bg-muted/50 flex items-center justify-between transition ${
                  selectedSupplier?.id === s.id ? 'bg-primary/10 border-r-4 border-primary' : ''
                }`}
              >
                <div>
                  <div className="font-semibold text-foreground">{s.name}</div>
                  <div className="text-xs text-muted-foreground">{s.phone || 'بدون هاتف'}</div>
                </div>
                {selectedSupplier?.id === s.id && <Check className="w-4 h-4 text-primary" />}
              </button>
            ))}
          </div>

          {selectedSupplier && (
            <div className="p-3 bg-primary/10 rounded-lg text-sm border border-primary/20">
              <div className="font-semibold text-foreground">الجهة المحددة</div>
              <div className="text-foreground">{selectedSupplier.name}</div>
              <div className="text-muted-foreground">{selectedSupplier.phone || 'بدون هاتف'}</div>
            </div>
          )}
        </section>
      </form>

      {/* ═════════════ HISTORY SECTION ═════════════ */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-lg font-bold text-foreground">سجل التجهيزات المستلمة</h2>
          <button
            onClick={handleExportHistory}
            className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition"
          >
            <Download className="w-4 h-4" />
            تصدير Excel
          </button>
        </div>

        {/* ─── Filters ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute right-2 top-2.5 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={histSearch}
              onChange={e => setHistSearch(e.target.value)}
              placeholder="بحث باسم التجهيز، الصنف، المرجع، المورد، المستلِم..."
              className="w-full border border-input bg-background p-2 pr-8 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <select
            value={histRefTypeFilter}
            onChange={e => setHistRefTypeFilter(e.target.value)}
            className="border border-input bg-background p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">كل أنواع المراجع</option>
            {(referenceTypes as string[]).map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <input
            type="date"
            value={histDateFrom}
            onChange={e => setHistDateFrom(e.target.value)}
            className="border border-input bg-background p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="من تاريخ"
          />
          <input
            type="date"
            value={histDateTo}
            onChange={e => setHistDateTo(e.target.value)}
            className="border border-input bg-background p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="إلى تاريخ"
          />
        </div>
        {(histSearch || histRefTypeFilter || histDateFrom || histDateTo) && (
          <button
            onClick={() => { setHistSearch(''); setHistRefTypeFilter(''); setHistDateFrom(''); setHistDateTo('') }}
            className="text-xs text-muted-foreground underline"
          >
            مسح الفلاتر
          </button>
        )}

        {/* ─── Table ─── */}
        {loadingHistory ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>جاري تحميل السجل...</span>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-sm">لا توجد نتائج مطابقة</div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm text-right">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">اسم التجهيز</th>
                  <th className="px-3 py-2 font-medium">الكمية</th>
                  <th className="px-3 py-2 font-medium">نوع المرجع</th>
                  <th className="px-3 py-2 font-medium">رقم المرجع</th>
                  <th className="px-3 py-2 font-medium">تاريخ المرجع</th>
                  <th className="px-3 py-2 font-medium">القائم بالسحب</th>
                  <th className="px-3 py-2 font-medium">تاريخ التسلم</th>
                  <th className="px-3 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredHistory.map(r => {
                  const items = (r.items || []).filter(ri => ri && ri.item)
                  return (
                  <tr key={r.id} className="hover:bg-muted/30 transition cursor-pointer" onClick={() => setDetailReception(r)}>
                    <td className="px-3 py-2">
                      {items.length === 0
                        ? '—'
                        : items.length === 1
                        ? items[0]?.item?.name || '—'
                        : <span>{items[0]?.item?.name || '—'} <span className="text-xs text-muted-foreground">+{items.length - 1}</span></span>
                      }
                    </td>
                    <td className="px-3 py-2">
                      {items.reduce((s, ri) => s + (ri?.quantity || 0), 0)}
                    </td>
                    <td className="px-3 py-2">{r.referenceType || '—'}</td>
                    <td className="px-3 py-2">{r.referenceNumber || '—'}</td>
                    <td className="px-3 py-2">{r.referenceDate ? new Date(r.referenceDate).toLocaleDateString('ar-DZ') : '—'}</td>
                    <td className="px-3 py-2">
                      {r.collector ? `${r.collector.rank} ${r.collector.name} ${r.collector.surname}` : '—'}
                    </td>
                    <td className="px-3 py-2">{new Date(r.createdAt).toLocaleDateString('ar-DZ')}</td>
                    <td className="px-3 py-2">
                      <button
                        onClick={e => { e.stopPropagation(); setDetailReception(r) }}
                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-muted-foreground text-left">{filteredHistory.length} نتيجة</p>
      </div>

      {/* ═════════════ DETAIL MODAL ═════════════ */}
      {detailReception && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setDetailReception(null)}
        >
          <div
            className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground">تفاصيل التجهيز</h3>
              <button onClick={() => setDetailReception(null)} className="p-1 rounded hover:bg-muted text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-muted/30 rounded-lg p-3">
                <div className="text-muted-foreground text-xs mb-1">نوع المرجع</div>
                <div className="font-medium">{detailReception.referenceType || '—'}</div>
              </div>
              <div className="bg-muted/30 rounded-lg p-3">
                <div className="text-muted-foreground text-xs mb-1">رقم المرجع</div>
                <div className="font-medium">{detailReception.referenceNumber || '—'}</div>
              </div>
              <div className="bg-muted/30 rounded-lg p-3">
                <div className="text-muted-foreground text-xs mb-1">تاريخ المرجع</div>
                <div className="font-medium">{detailReception.referenceDate ? new Date(detailReception.referenceDate).toLocaleDateString('ar-DZ') : '—'}</div>
              </div>
              <div className="bg-muted/30 rounded-lg p-3">
                <div className="text-muted-foreground text-xs mb-1">تاريخ التسلم</div>
                <div className="font-medium">{new Date(detailReception.createdAt).toLocaleDateString('ar-DZ')}</div>
              </div>
              <div className="bg-muted/30 rounded-lg p-3">
                <div className="text-muted-foreground text-xs mb-1">الجهة المرسلة</div>
                <div className="font-medium">{detailReception.supplier?.name || '—'}</div>
                {detailReception.supplier?.phone && <div className="text-xs text-muted-foreground">{detailReception.supplier.phone}</div>}
              </div>
              <div className="bg-muted/30 rounded-lg p-3">
                <div className="text-muted-foreground text-xs mb-1">القائم بالسحب</div>
                <div className="font-medium">
                  {detailReception.collector
                    ? `${detailReception.collector.rank} ${detailReception.collector.name} ${detailReception.collector.surname}`
                    : '—'}
                </div>
                {detailReception.collector?.number && <div className="text-xs text-muted-foreground">{detailReception.collector.number}</div>}
              </div>
              {detailReception.notes && (
                <div className="bg-muted/30 rounded-lg p-3 col-span-2">
                  <div className="text-muted-foreground text-xs mb-1">الملاحظات</div>
                  <div className="font-medium">{detailReception.notes}</div>
                </div>
              )}
            </div>

            <div>
              <div className="text-sm font-semibold mb-2">التجهيزات المستلمة</div>
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-sm text-right">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">اسم التجهيز</th>
                      <th className="px-3 py-2 font-medium">الصنف</th>
                      <th className="px-3 py-2 font-medium">الكمية</th>
                      <th className="px-3 py-2 font-medium">رقم المخزن</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(detailReception.items || []).filter(ri => ri && ri.item).map(ri => (
                      <tr key={ri?.id} className="hover:bg-muted/30">
                        <td className="px-3 py-2">{ri?.item?.name || '—'}</td>
                        <td className="px-3 py-2 text-muted-foreground">{ri?.item?.category || '—'}</td>
                        <td className="px-3 py-2">{ri?.quantity || 0}</td>
                        <td className="px-3 py-2">{ri?.adminNumber || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
