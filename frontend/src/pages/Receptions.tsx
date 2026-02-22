import React, { useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import client from '../api/client'
import { Check, ChevronDown, Loader2, Plus, Search, Truck, X } from 'lucide-react'

interface Supplier {
  id: number
  name: string
  phone?: string
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

  const { data: referenceTypes = [] } = useQuery<string[]>(
    ['reference-types'],
    async () => (await client.get('/receptions/reference-types')).data.data,
    { refetchInterval: 30000 }
  )

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
      setForm({ itemName: '', category: '', quantity: 1, lowStockThreshold: 5, adminNumber: '', referenceType: '', referenceNumber: '', referenceDate: '', notes: '' })
      setSelectedSupplier(null)
      setSupplierSearch('')
      setSupplierPhone('')
      setItemSearch('')
      setSelectedItemId(null)
      setRefTypeKnown(false)
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
    </div>
  )
}
