import React, { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import client from '../api/client'
import { Check, Loader2, Plus, Search, TrendingDown, UserCheck } from 'lucide-react'

interface Item {
  id: number
  name: string
  category: string | null
  quantity: number
  sku: string
}

interface Entity {
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
  phone?: string
  entityId: number
}

interface NewEmployeeState {
  rank: string
  name: string
  surname: string
  number: string
  phone: string
}

export default function Distributions() {
  // Item
  const [itemSearch, setItemSearch] = useState('')
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState('')

  // Beneficiary
  const [beneficiarySearch, setBeneficiarySearch] = useState('')
  const [beneficiaryPhone, setBeneficiaryPhone] = useState('')
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<Entity | null>(null)
  const [addingBeneficiary, setAddingBeneficiary] = useState(false)

  // Employee
  const [employeeSearch, setEmployeeSearch] = useState('')
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [showAddEmployee, setShowAddEmployee] = useState(false)
  const [newEmployee, setNewEmployee] = useState<NewEmployeeState>({ rank: '', name: '', surname: '', number: '', phone: '' })
  const [addingEmployee, setAddingEmployee] = useState(false)

  // Form state
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const { data: items = [], isLoading: loadingItems } = useQuery<Item[]>(
    ['items'],
    async () => (await client.get('/items')).data.data,
    { refetchInterval: 10000 }
  )

  const { data: beneficiaries = [], refetch: refetchBeneficiaries, isLoading: loadingBeneficiaries } = useQuery<Entity[]>(
    ['beneficiaries'],
    async () => (await client.get('/entities?type=BENEFICIARY')).data.data,
    { refetchInterval: 10000 }
  )

  const { data: employees = [], refetch: refetchEmployees } = useQuery<Employee[]>(
    ['employees', selectedBeneficiary?.id],
    async () => (await client.get(`/employees/${selectedBeneficiary!.id}`)).data.data,
    { enabled: !!selectedBeneficiary, refetchInterval: 10000 }
  )

  const filteredItems = useMemo(() => {
    const term = itemSearch.trim().toLowerCase()
    if (!term) return items
    return items.filter(i => i.name.toLowerCase().includes(term) || (i.category || '').toLowerCase().includes(term))
  }, [itemSearch, items])

  const filteredBeneficiaries = useMemo(() => {
    const term = beneficiarySearch.trim().toLowerCase()
    if (!term) return beneficiaries
    return beneficiaries.filter(b => b.name.toLowerCase().includes(term) || (b.phone || '').toLowerCase().includes(term))
  }, [beneficiarySearch, beneficiaries])

  const filteredEmployees = useMemo(() => {
    const term = employeeSearch.trim().toLowerCase()
    if (!term) return employees
    return employees.filter(e =>
      e.name.toLowerCase().includes(term) ||
      e.surname.toLowerCase().includes(term) ||
      e.number.toLowerCase().includes(term)
    )
  }, [employeeSearch, employees])

  const handleSelectItem = (item: Item) => {
    setSelectedItem(item)
    setItemSearch(item.name)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    if (!selectedItem) { setError('يرجى اختيار التجهيز'); return }
    if (!selectedBeneficiary) { setError('يرجى اختيار الجهة المنتفعة'); return }
    if (!selectedEmployee) { setError('يرجى تحديد المكلف بالسحب'); return }
    if (quantity < 1) { setError('الكمية يجب أن تكون 1 على الأقل'); return }
    if (selectedItem.quantity < quantity) {
      setError(`الكمية المتاحة في المخزون هي ${selectedItem.quantity}`)
      return
    }
    try {
      setSubmitting(true)
      await client.post('/distributions', {
        items: [{ itemId: selectedItem.id, quantity }],
        beneficiaryId: selectedBeneficiary.id,
        assignedToId: selectedEmployee.id,
        notes: notes || undefined
      })
      setSuccess('تم تسجيل التوزيع بنجاح وتم خصم الكمية من المخزون')
      setSelectedItem(null)
      setItemSearch('')
      setQuantity(1)
      setNotes('')
      setSelectedEmployee(null)
      setEmployeeSearch('')
    } catch (err: any) {
      setError(err?.response?.data?.error || 'تعذر حفظ التوزيع')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAddBeneficiary = async () => {
    setError(null)
    const name = beneficiarySearch.trim()
    if (!name) { setError('يرجى إدخال اسم الجهة المنتفعة'); return }
    try {
      setAddingBeneficiary(true)
      const res = await client.post('/entities', {
        name,
        type: 'BENEFICIARY',
        phone: beneficiaryPhone.trim() || 'غير متوفر'
      })
      setSelectedBeneficiary(res.data.data)
      setBeneficiarySearch('')
      setBeneficiaryPhone('')
      await refetchBeneficiaries()
      setSuccess('تمت إضافة الجهة المنتفعة بنجاح')
    } catch (err: any) {
      setError(err?.response?.data?.error || 'تعذر إضافة الجهة')
    } finally {
      setAddingBeneficiary(false)
    }
  }

  const handleAddEmployee = async () => {
    setError(null)
    const { rank, name, surname, number } = newEmployee
    if (!rank || !name || !surname || !number) {
      setError('يرجى تعبئة الرتبة، الاسم، اللقب، والرقم الشخصي')
      return
    }
    try {
      setAddingEmployee(true)
      const res = await client.post(`/employees/${selectedBeneficiary!.id}`, {
        rank,
        name,
        surname,
        number,
        phone: newEmployee.phone || undefined
      })
      setSelectedEmployee(res.data.data)
      setNewEmployee({ rank: '', name: '', surname: '', number: '', phone: '' })
      setShowAddEmployee(false)
      await refetchEmployees()
      setSuccess('تمت إضافة الموظف وربطه بالجهة المنتفعة')
    } catch (err: any) {
      setError(err?.response?.data?.error || 'تعذر إضافة الموظف')
    } finally {
      setAddingEmployee(false)
    }
  }

  return (
    <div dir="rtl" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">تسجيل توزيع تجهيزات من المخزون</p>
          <h1 className="text-2xl font-semibold">التوزيعات</h1>
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-700">
          <TrendingDown className="w-5 h-5 text-green-600" />
          <span>توزيع تجهيز يخصم الكمية من المخزون مباشرة</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ===== Main form (left 2/3) ===== */}
        <section className="lg:col-span-2 bg-white p-5 rounded shadow space-y-4">

          {/* 1. Item name search */}
          <div>
            <label className="block text-sm mb-1">اسم التجهيز</label>
            <div className="relative">
              <Search className="absolute right-2 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={itemSearch}
                onChange={e => { setItemSearch(e.target.value); setSelectedItem(null) }}
                placeholder="ابحث باسم التجهيز أو الصنف..."
                className="w-full border p-2 pr-8 rounded"
              />
            </div>
            {itemSearch && !selectedItem && (
              <div className="border rounded mt-1 max-h-44 overflow-y-auto shadow-sm">
                {loadingItems && <div className="p-2 text-sm text-gray-500">جاري التحميل...</div>}
                {!loadingItems && filteredItems.length === 0 && (
                  <div className="p-2 text-sm text-gray-500">لا توجد تجهيزات مطابقة</div>
                )}
                {filteredItems.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectItem(item)}
                    className="w-full text-right p-2 hover:bg-slate-50 flex justify-between items-center border-b last:border-0"
                  >
                    <div>
                      <div className="font-semibold text-sm">{item.name}</div>
                      <div className="text-xs text-gray-500">{item.category || 'بدون صنف'}</div>
                    </div>
                    <div className={`text-xs font-semibold ${item.quantity === 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {item.quantity === 0 ? 'نفذ المخزون' : `${item.quantity} متوفر`}
                    </div>
                  </button>
                ))}
              </div>
            )}
            {selectedItem && (
              <div className="mt-1 p-2 bg-blue-50 rounded text-sm flex items-center justify-between">
                <div>
                  <span className="font-semibold">{selectedItem.name}</span>
                  <span className="text-gray-500 text-xs mr-2">({selectedItem.category || 'بدون صنف'})</span>
                </div>
                <span className={`text-xs font-semibold ${selectedItem.quantity === 0 ? 'text-red-600' : 'text-green-600'}`}>
                  متوفر: {selectedItem.quantity}
                </span>
              </div>
            )}
          </div>

          {/* 2. Category (auto-filled, read-only) */}
          <div>
            <label className="block text-sm mb-1">صنف التجهيز</label>
            <input
              type="text"
              value={selectedItem?.category || ''}
              readOnly
              className="w-full border p-2 rounded bg-gray-50 text-gray-600 cursor-not-allowed"
              placeholder="يتم تعبئته تلقائيًا عند اختيار التجهيز"
            />
          </div>

          {/* 3. Quantity */}
          <div>
            <label className="block text-sm mb-1">الكمية المسلمة</label>
            <input
              type="number"
              min={1}
              max={selectedItem?.quantity || undefined}
              value={quantity}
              onChange={e => setQuantity(Math.max(1, Number(e.target.value) || 1))}
              className="w-full border p-2 rounded"
              required
            />
            {selectedItem && quantity > selectedItem.quantity && (
              <p className="text-xs text-red-600 mt-1">
                الكمية المطلوبة تتجاوز المخزون المتاح ({selectedItem.quantity})
              </p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm mb-1">ملاحظات</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full border p-2 rounded"
              rows={3}
              placeholder="أي تفاصيل إضافية حول التوزيع"
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2"
              disabled={submitting}
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              تسجيل توزيع جديد
            </button>
          </div>
          {error && <div className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</div>}
          {success && <div className="text-sm text-green-600 bg-green-50 p-2 rounded">{success}</div>}
        </section>

        {/* ===== Right column: Beneficiary + Employee ===== */}
        <div className="space-y-4">

          {/* Beneficiary section */}
          <section className="bg-white p-5 rounded shadow space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <Search className="w-4 h-4" />
              الجهة المنتفعة
            </div>

            <div className="space-y-2">
              <input
                type="text"
                value={beneficiarySearch}
                onChange={e => setBeneficiarySearch(e.target.value)}
                placeholder="اسم الجهة أو رقم الهاتف"
                className="w-full border p-2 rounded"
              />
              <input
                type="text"
                value={beneficiaryPhone}
                onChange={e => setBeneficiaryPhone(e.target.value)}
                placeholder="هاتف الجهة (عند إضافة جديدة)"
                className="w-full border p-2 rounded"
              />
              <button
                type="button"
                onClick={handleAddBeneficiary}
                className="w-full px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center justify-center gap-2"
                disabled={addingBeneficiary}
              >
                {addingBeneficiary ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                إضافة جهة جديدة
              </button>
            </div>

            <div className="border rounded divide-y max-h-52 overflow-y-auto">
              {loadingBeneficiaries && <div className="p-3 text-sm text-gray-500">جاري التحميل...</div>}
              {!loadingBeneficiaries && filteredBeneficiaries.length === 0 && (
                <div className="p-3 text-sm text-gray-500">لا يوجد نتائج</div>
              )}
              {filteredBeneficiaries.map(b => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => {
                    setSelectedBeneficiary(b)
                    setSelectedEmployee(null)
                    setEmployeeSearch('')
                    setShowAddEmployee(false)
                  }}
                  className={`w-full text-right p-3 hover:bg-slate-50 flex items-center justify-between ${
                    selectedBeneficiary?.id === b.id ? 'bg-blue-50 border-r-4 border-blue-500' : ''
                  }`}
                >
                  <div>
                    <div className="font-semibold text-sm">{b.name}</div>
                    <div className="text-xs text-gray-500">{b.phone || 'بدون هاتف'}</div>
                  </div>
                  {selectedBeneficiary?.id === b.id && <Check className="w-4 h-4 text-blue-600" />}
                </button>
              ))}
            </div>

            {selectedBeneficiary && (
              <div className="p-3 bg-blue-50 rounded text-sm">
                <div className="font-semibold">الجهة المحددة</div>
                <div>{selectedBeneficiary.name}</div>
                <div className="text-xs text-gray-500">{selectedBeneficiary.phone || 'بدون هاتف'}</div>
              </div>
            )}
          </section>

          {/* Employee section — shown only after beneficiary is selected */}
          {selectedBeneficiary && (
            <section className="bg-white p-5 rounded shadow space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <UserCheck className="w-4 h-4" />
                المكلف بالسحب
              </div>

              <input
                type="text"
                value={employeeSearch}
                onChange={e => setEmployeeSearch(e.target.value)}
                placeholder="ابحث بالاسم أو اللقب أو الرقم الشخصي"
                className="w-full border p-2 rounded"
              />

              <div className="border rounded divide-y max-h-44 overflow-y-auto">
                {filteredEmployees.length === 0 && (
                  <div className="p-3 text-sm text-gray-500">لا يوجد موظفون للجهة المحددة</div>
                )}
                {filteredEmployees.map(emp => (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => { setSelectedEmployee(emp); setShowAddEmployee(false) }}
                    className={`w-full text-right p-3 hover:bg-slate-50 flex items-center justify-between ${
                      selectedEmployee?.id === emp.id ? 'bg-green-50 border-r-4 border-green-500' : ''
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-sm">{emp.rank} {emp.name} {emp.surname}</div>
                      <div className="text-xs text-gray-500">رقم: {emp.number}</div>
                    </div>
                    {selectedEmployee?.id === emp.id && <Check className="w-4 h-4 text-green-600" />}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setShowAddEmployee(!showAddEmployee)}
                className="w-full px-3 py-2 border border-dashed border-gray-300 text-gray-600 rounded hover:bg-slate-50 flex items-center justify-center gap-2 text-sm"
              >
                <Plus className="w-4 h-4" />
                {showAddEmployee ? 'إلغاء إضافة موظف' : 'إضافة موظف جديد'}
              </button>

              {showAddEmployee && (
                <div className="space-y-2 border rounded p-3 bg-gray-50">
                  {[
                    { key: 'rank', placeholder: 'الرتبة' },
                    { key: 'name', placeholder: 'الاسم' },
                    { key: 'surname', placeholder: 'اللقب' },
                    { key: 'number', placeholder: 'الرقم الشخصي' },
                    { key: 'phone', placeholder: 'الهاتف (اختياري)' },
                  ].map(({ key, placeholder }) => (
                    <input
                      key={key}
                      type="text"
                      placeholder={placeholder}
                      value={(newEmployee as any)[key]}
                      onChange={e => setNewEmployee(prev => ({ ...prev, [key]: e.target.value }))}
                      className="w-full border p-2 rounded text-sm"
                    />
                  ))}
                  <button
                    type="button"
                    onClick={handleAddEmployee}
                    className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center justify-center gap-2 text-sm"
                    disabled={addingEmployee}
                  >
                    {addingEmployee ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    حفظ الموظف
                  </button>
                </div>
              )}

              {selectedEmployee && (
                <div className="p-3 bg-green-50 rounded text-sm">
                  <div className="font-semibold">المكلف المحدد</div>
                  <div>{selectedEmployee.rank} {selectedEmployee.name} {selectedEmployee.surname}</div>
                  <div className="text-xs text-gray-500">الرقم الشخصي: {selectedEmployee.number}</div>
                </div>
              )}
            </section>
          )}
        </div>
      </form>
    </div>
  )
}

