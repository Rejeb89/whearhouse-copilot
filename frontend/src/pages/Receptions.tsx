import React, { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import client from '../api/client'
import { Check, Loader2, Plus, Search, Truck } from 'lucide-react'

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
    referenceType: '',
    referenceNumber: '',
    referenceDate: '',
    notes: ''
  })
  const [supplierSearch, setSupplierSearch] = useState('')
  const [supplierPhone, setSupplierPhone] = useState('')
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [addingSupplier, setAddingSupplier] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

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
            lowStockThreshold: form.lowStockThreshold
          }
        ]
      })
      setSuccess('تم تسجيل الاستلام بنجاح وتمت إضافة الكمية إلى المخزون')
      setForm({ itemName: '', category: '', quantity: 1, lowStockThreshold: 5, referenceType: '', referenceNumber: '', referenceDate: '', notes: '' })
      setSelectedSupplier(null)
      setSupplierSearch('')
      setSupplierPhone('')
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
    try {
      setAddingSupplier(true)
      const res = await client.post('/entities', {
        name,
        type: 'SUPPLIER',
        phone: supplierPhone.trim() || 'غير متوفر'
      })
      setSelectedSupplier(res.data.data)
      setSupplierSearch('')
      setSupplierPhone('')
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
          <h1 className="text-2xl font-semibold">دخل يومي</h1>
          <p className="text-sm text-gray-600">تسجيل تجهيزات جديدة في المخزون</p>
        </div>
        {/* <div className="flex items-center gap-3 text-sm text-gray-700">
          <Truck className="w-5 h-5 text-blue-600" />
          <span>إدخال تجهيز جديد يرفع المخزون مباشرة</span>
        </div> */}
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section className="lg:col-span-2 bg-white p-5 rounded shadow space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">اسم التجهيز</label>
              <input
                type="text"
                name="itemName"
                value={form.itemName}
                onChange={handleChange}
                className="w-full border p-2 rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm mb-1">صنف التجهيز</label>
              <input
                type="text"
                name="category"
                value={form.category}
                onChange={handleChange}
                className="w-full border p-2 rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm mb-1">الكمية</label>
              <input
                type="number"
                name="quantity"
                min={1}
                value={form.quantity}
                onChange={handleChange}
                className="w-full border p-2 rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm mb-1 flex items-center gap-1">
                حد التنبيه الأدنى
                <span className="text-xs text-gray-400">(تنبيه عند انخفاض الكمية)</span>
              </label>
              <input
                type="number"
                name="lowStockThreshold"
                min={0}
                value={form.lowStockThreshold}
                onChange={handleChange}
                className="w-full border p-2 rounded"
                placeholder="مثال: 5"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">نوع المرجع</label>
              <input
                type="text"
                name="referenceType"
                value={form.referenceType}
                onChange={handleChange}
                list="referenceTypesList"
                className="w-full border p-2 rounded"
                placeholder="اختر نوع المرجع أو أضف جديد"
              />
              <datalist id="referenceTypesList">
                {referenceTypes.map((type) => (
                  <option key={type} value={type} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-sm mb-1">رقم المرجع</label>
              <input
                type="text"
                name="referenceNumber"
                value={form.referenceNumber}
                onChange={handleChange}
                className="w-full border p-2 rounded"
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
                className="w-full border p-2 rounded"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm mb-1">الملاحظات</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              className="w-full border p-2 rounded"
              rows={3}
              placeholder="أي تفاصيل إضافية حول الاستلام"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
              disabled={submitting}
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              تسجيل استلام جديد
            </button>
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          {success && <div className="text-sm text-green-600">{success}</div>}
        </section>

        <section className="bg-white p-5 rounded shadow space-y-3">
          <div className="flex items-center gap-2 text-sm text-gray-700">
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
              className="w-full border p-2 rounded"
            />
            <input
              type="text"
              value={supplierPhone}
              onChange={(e) => setSupplierPhone(e.target.value)}
              placeholder="هاتف الجهة (عند إضافة جديدة)"
              className="w-full border p-2 rounded"
            />
            <button
              type="button"
              onClick={handleAddSupplier}
              className="w-full px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center justify-center gap-2"
              disabled={addingSupplier}
            >
              {addingSupplier ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              إضافة جهة جديدة (مسلمة)
            </button>
          </div>

          <div className="border rounded divide-y max-h-64 overflow-y-auto">
            {loadingSuppliers && (
              <div className="p-3 text-sm text-gray-600">جاري التحميل...</div>
            )}
            {!loadingSuppliers && filteredSuppliers.length === 0 && (
              <div className="p-3 text-sm text-gray-600">لا يوجد نتائج</div>
            )}
            {filteredSuppliers.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedSupplier(s)}
                className={`w-full text-right p-3 hover:bg-slate-50 flex items-center justify-between ${selectedSupplier?.id === s.id ? 'bg-blue-50 border-r-4 border-blue-500' : ''}`}
              >
                <div>
                  <div className="font-semibold">{s.name}</div>
                  <div className="text-xs text-gray-600">{s.phone || 'بدون هاتف'}</div>
                </div>
                {selectedSupplier?.id === s.id && <Check className="w-4 h-4 text-blue-600" />}
              </button>
            ))}
          </div>

          {selectedSupplier && (
            <div className="p-3 bg-blue-50 rounded text-sm">
              <div className="font-semibold">الجهة المحددة</div>
              <div>{selectedSupplier.name}</div>
              <div className="text-gray-600">{selectedSupplier.phone || 'بدون هاتف'}</div>
            </div>
          )}
        </section>
      </form>
    </div>
  )
}
