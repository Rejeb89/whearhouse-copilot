import React, { useMemo, useState, useEffect, useCallback, useContext, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import client from '../api/client'
import { AuthContext } from '../context/AuthContext'
import { Check, Loader2, Plus, Search, UserCheck, RefreshCw, Info, ChevronDown, X } from 'lucide-react'

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
  category?: string
  type?: string
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

export default function Distributions({ preselectedItem: propItem }: { preselectedItem?: any } = {}) {
  const location = useLocation()
  const { user } = useContext(AuthContext)

  // Item
  const [itemSearch, setItemSearch] = useState('')
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [itemDropdownOpen, setItemDropdownOpen] = useState(false)
  const itemInputRef = useRef<HTMLInputElement>(null)
  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    const pre = propItem || (location.state as any)?.preselectedItem
    if (pre) {
      setSelectedItem(pre)
      setItemSearch(pre.name)
    }
  }, [propItem?.id])

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

  // Receipt reference fields
  const [referenceType, setReferenceType] = useState('')
  const [referenceNumber, setReferenceNumber] = useState('')
  const [referenceDate, setReferenceDate] = useState('')
  const [deliveredByName, setDeliveredByName] = useState(user?.name || user?.email || '')
  const [refAutoFilled, setRefAutoFilled] = useState(false)
  const [loadingRef, setLoadingRef] = useState(false)

  // Per-item receipt fields
  const [itemSerialNumber, setItemSerialNumber] = useState('')
  const [itemCondition, setItemCondition] = useState<'NEW' | 'USED' | 'NEEDS_MAINTENANCE'>('NEW')

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
    const onlyBeneficiary = beneficiaries.filter(b => b.category === 'الوحدات المتنفعة')
    if (!term) return onlyBeneficiary
    return onlyBeneficiary.filter(b => b.name.toLowerCase().includes(term) || (b.phone || '').toLowerCase().includes(term))
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

  // Auto-fill reference fields from the latest reception when item changes
  useEffect(() => {
    if (!selectedItem) return
    setRefAutoFilled(false)
    setLoadingRef(true)
    client.get(`/receptions/by-item/${selectedItem.id}`)
      .then(res => {
        const r = res.data.data
        if (r) {
          setReferenceType(r.referenceType || '')
          setReferenceNumber(r.referenceNumber || '')
          setReferenceDate(r.referenceDate ? r.referenceDate.split('T')[0] : '')
          setRefAutoFilled(true)
        }
      })
      .catch(() => { /* silent */ })
      .finally(() => setLoadingRef(false))
  }, [selectedItem?.id])

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
        items: [{
          itemId: selectedItem.id,
          quantity,
          serialNumber: itemSerialNumber || undefined,
          condition: itemCondition,
        }],
        beneficiaryId: selectedBeneficiary.id,
        assignedToId: selectedEmployee.id,
        notes: notes || undefined,
        referenceType: referenceType || undefined,
        referenceNumber: referenceNumber || undefined,
        referenceDate: referenceDate || undefined,
        deliveredByName: deliveredByName || undefined,
      })
      setSuccess('تم تسجيل الخرج بنجاح وتم خصم الكمية من المخزون')
      setSelectedItem(null)
      setItemSearch('')
      setQuantity(1)
      setNotes('')
      setSelectedEmployee(null)
      setEmployeeSearch('')
      setItemSerialNumber('')
      setItemCondition('NEW')
      setReferenceType('')
      setReferenceNumber('')
      setReferenceDate('')
      setDeliveredByName(user?.name || user?.email || '')
      setRefAutoFilled(false)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'تعذر حفظ الخرج')
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
        category: 'الوحدات المتنفعة',
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
      <div>
        <h1 className="text-2xl font-bold text-foreground">خرج يومي</h1>
        <p className="text-sm text-muted-foreground">تسجيل خرج تجهيزات من المخزون</p>
      </div>

      {/* <div className="flex items-center gap-3 text-sm text-gray-700">
        <TrendingDown className="w-5 h-5 text-green-600" />
        <span>توزيع تجهيز يخصم الكمية من المخزون مباشرة</span>
      </div> */}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ===== Main form (left 2/3) ===== */}
        <section className="lg:col-span-2 rounded-xl border border-border bg-card p-5 space-y-4">

          {/* 1. Item name combobox */}
          <div>
            <label className="block text-sm mb-1">اسم التجهيز</label>
            <div className="relative">
              <input
                ref={itemInputRef}
                type="text"
                value={itemSearch}
                onChange={e => { setItemSearch(e.target.value); setSelectedItem(null); setRefAutoFilled(false); setItemDropdownOpen(true) }}
                onFocus={() => setItemDropdownOpen(true)}
                onBlur={() => setTimeout(() => setItemDropdownOpen(false), 180)}
                placeholder="ابحث باسم التجهيز أو الصنف..."
                className="w-full border border-input bg-background p-2 pl-8 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <ChevronDown className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground pointer-events-none" />
              {itemSearch && (
                <button
                  type="button"
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => { setItemSearch(''); setSelectedItem(null); setRefAutoFilled(false); itemInputRef.current?.focus() }}
                  className="absolute left-7 top-2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {itemDropdownOpen && (
              <div className="relative z-50">
                <div className="absolute w-full rounded-lg border border-border bg-card shadow-lg max-h-52 overflow-y-auto mt-1">
                  {loadingItems && <div className="p-2 text-sm text-muted-foreground">جاري التحميل...</div>}
                  {!loadingItems && filteredItems.length === 0 && (
                    <div className="p-2 text-sm text-muted-foreground">لا توجد تجهيزات مطابقة</div>
                  )}
                  {filteredItems.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => { handleSelectItem(item); setItemDropdownOpen(false) }}
                      className={`w-full text-right px-3 py-2 hover:bg-muted/60 flex justify-between items-center border-b border-border last:border-0 transition ${
                        selectedItem?.id === item.id ? 'bg-primary/10 font-semibold' : ''
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-sm text-foreground">{item.name}</div>
                        <div className="text-xs text-muted-foreground">{item.category || 'بدون صنف'}</div>
                      </div>
                      <div className={`text-xs font-semibold ${item.quantity === 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {item.quantity === 0 ? 'نفذ المخزون' : `${item.quantity} متوفر`}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {selectedItem && (
              <div className="mt-1 p-2 bg-primary/10 rounded-lg text-sm flex items-center justify-between border border-primary/20">
                <div>
                  <span className="font-semibold text-foreground">{selectedItem.name}</span>
                  <span className="text-muted-foreground text-xs mr-2">({selectedItem.category || 'بدون صنف'})</span>
                </div>
                <span className={`text-xs font-semibold ${selectedItem.quantity === 0 ? 'text-red-600' : 'text-green-600'}`}>
                  متوفر: {selectedItem.quantity}
                </span>
              </div>
            )}
          </div>

          {/* 2. Category (auto-filled, read-only) */}
          <div>
            <label className="block text-sm mb-1 text-foreground">صنف التجهيز</label>
            <input
              type="text"
              value={selectedItem?.category || ''}
              readOnly
              className="w-full border border-input bg-muted p-2 rounded-lg text-sm text-muted-foreground cursor-not-allowed"
              placeholder="يتم تعبئته تلقائيًا عند اختيار التجهيز"
            />
          </div>

          {/* 3. Quantity */}
          <div>
            <label className="block text-sm mb-1 text-foreground">الكمية المسلمة</label>
            <input
              type="number"
              min={1}
              max={selectedItem?.quantity || undefined}
              value={quantity}
              onChange={e => setQuantity(Math.max(1, Number(e.target.value) || 1))}
              className="w-full border border-input bg-background p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              required
            />
            {selectedItem && quantity > selectedItem.quantity && (
              <p className="text-xs text-red-600 mt-1">
                الكمية المطلوبة تتجاوز المخزون المتاح ({selectedItem.quantity})
              </p>
            )}
          </div>

          {/* Per-item receipt fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1 text-foreground">الرقم التسلسلي للتجهيز</label>
              <input
                type="text"
                value={itemSerialNumber}
                onChange={e => setItemSerialNumber(e.target.value)}
                className="w-full border border-input bg-background p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="SN-XXXXXXX (اختياري)"
              />
            </div>
            <div>
              <label className="block text-sm mb-1 text-foreground">حالة التجهيز</label>
              <select
                value={itemCondition}
                onChange={e => setItemCondition(e.target.value as any)}
                className="w-full border border-input bg-background p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="NEW">جديد</option>
                <option value="USED">مستعمل</option>
                <option value="NEEDS_MAINTENANCE">يحتاج صيانة</option>
              </select>
            </div>
          </div>

          {/* Reference section */}
          <div className="border-t border-dashed border-border pt-4">
            <div className="flex items-center gap-2 mb-3">
              <p className="text-xs font-semibold text-muted-foreground">بيانات الوصل / المرجع</p>
              {loadingRef && (
                <span className="flex items-center gap-1 text-xs text-blue-500">
                  <RefreshCw className="w-3 h-3 animate-spin" /> جارٍ الجلب...
                </span>
              )}
              {refAutoFilled && !loadingRef && (
                  <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                  <Info className="w-3 h-3" /> مجلوبة من الدخل اليومي
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm mb-1">نوع المرجع</label>
                <input
                  type="text"
                  value={referenceType}
                  onChange={e => { setReferenceType(e.target.value); setRefAutoFilled(false) }}
                  className={`w-full border p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring ${
                  refAutoFilled && referenceType ? 'border-green-300 bg-green-50' : 'border-input bg-background'
                }`}
                  placeholder="أمر خدمة / قرار ..."
                />
              </div>
              <div>
                <label className="block text-sm mb-1">رقم المرجع</label>
                <input
                  type="text"
                  value={referenceNumber}
                  onChange={e => { setReferenceNumber(e.target.value); setRefAutoFilled(false) }}
                  className={`w-full border p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring ${
                  refAutoFilled && referenceNumber ? 'border-green-300 bg-green-50' : 'border-input bg-background'
                }`}
                  placeholder="2024/XXXX"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">تاريخ المرجع</label>
                <input
                  type="date"
                  value={referenceDate}
                  onChange={e => { setReferenceDate(e.target.value); setRefAutoFilled(false) }}
                  className={`w-full border p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring ${
                  refAutoFilled && referenceDate ? 'border-green-300 bg-green-50' : 'border-input bg-background'
                }`}
                />
              </div>
              <div>
                <label className="block text-sm mb-1">اسم المسلِّم</label>
                <input
                  type="text"
                  value={deliveredByName}
                  onChange={e => setDeliveredByName(e.target.value)}
                className="w-full border border-input bg-background p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="الاسم الكامل للمسلِّم"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm mb-1">ملاحظات</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full border border-input bg-background p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              rows={3}
              placeholder="أي تفاصيل إضافية حول الخرج"
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center gap-2 text-sm font-medium transition"
              disabled={submitting}
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              تسجيل خرج جديد
            </button>
          </div>
          {error && <div className="text-sm text-destructive bg-destructive/10 p-2 rounded-lg border border-destructive/20">{error}</div>}
          {success && <div className="text-sm text-green-700 bg-green-50 border border-green-200 p-2 rounded-lg">{success}</div>}
        </section>

        {/* ===== Right column: Beneficiary + Employee ===== */}
        <div className="space-y-4">

          {/* Beneficiary section */}
          <section className="rounded-xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Search className="w-4 h-4" />
              الجهة المنتفعة
            </div>

            <div className="space-y-2">
              <input
                type="text"
                value={beneficiarySearch}
                onChange={e => setBeneficiarySearch(e.target.value)}
                placeholder="اسم الجهة أو رقم الهاتف"
                className="w-full border border-input bg-background p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <input
                type="text"
                value={beneficiaryPhone}
                onChange={e => setBeneficiaryPhone(e.target.value)}
                placeholder="هاتف الجهة (عند إضافة جديدة)"
                className="w-full border border-input bg-background p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="button"
                onClick={handleAddBeneficiary}
                className="w-full px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center justify-center gap-2 text-sm font-medium transition"
                disabled={addingBeneficiary}
              >
                {addingBeneficiary ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                إضافة جهة جديدة
              </button>
            </div>

            <div className="rounded-lg border border-border divide-y divide-border max-h-52 overflow-y-auto">
              {loadingBeneficiaries && <div className="p-3 text-sm text-muted-foreground">جاري التحميل...</div>}
              {!loadingBeneficiaries && filteredBeneficiaries.length === 0 && (
                <div className="p-3 text-sm text-muted-foreground">لا يوجد نتائج</div>
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
                  className={`w-full text-right p-3 hover:bg-muted/50 flex items-center justify-between transition ${
                    selectedBeneficiary?.id === b.id ? 'bg-primary/10 border-r-4 border-primary' : ''
                  }`}
                >
                  <div>
                    <div className="font-semibold text-sm text-foreground">{b.name}</div>
                    <div className="text-xs text-muted-foreground">{b.phone || 'بدون هاتف'}</div>
                  </div>
                  {selectedBeneficiary?.id === b.id && <Check className="w-4 h-4 text-primary" />}
                </button>
              ))}
            </div>

            {selectedBeneficiary && (
              <div className="p-3 bg-primary/10 rounded-lg text-sm border border-primary/20">
                <div className="font-semibold text-foreground">الجهة المحددة</div>
                <div className="text-foreground">{selectedBeneficiary.name}</div>
                <div className="text-xs text-muted-foreground">{selectedBeneficiary.phone || 'بدون هاتف'}</div>
              </div>
            )}
          </section>

          {/* Employee section — shown only after beneficiary is selected */}
          {selectedBeneficiary && (
            <section className="rounded-xl border border-border bg-card p-5 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <UserCheck className="w-4 h-4" />
                المكلف بالسحب
              </div>

              <input
                type="text"
                value={employeeSearch}
                onChange={e => setEmployeeSearch(e.target.value)}
                placeholder="ابحث بالاسم أو اللقب أو الرقم الشخصي"
                className="w-full border border-input bg-background p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />

              <div className="rounded-lg border border-border divide-y divide-border max-h-44 overflow-y-auto">
                {filteredEmployees.length === 0 && (
                  <div className="p-3 text-sm text-muted-foreground">لا يوجد موظفون للجهة المحددة</div>
                )}
                {filteredEmployees.map(emp => (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => { setSelectedEmployee(emp); setShowAddEmployee(false) }}
                    className={`w-full text-right p-3 hover:bg-muted/50 flex items-center justify-between transition ${
                      selectedEmployee?.id === emp.id ? 'bg-green-50 border-r-4 border-green-500' : ''
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-sm text-foreground">{emp.rank} {emp.name} {emp.surname}</div>
                      <div className="text-xs text-muted-foreground">رقم: {emp.number}</div>
                    </div>
                    {selectedEmployee?.id === emp.id && <Check className="w-4 h-4 text-green-600" />}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setShowAddEmployee(!showAddEmployee)}
                className="w-full px-3 py-2 border border-dashed border-border text-muted-foreground rounded-lg hover:bg-muted/50 flex items-center justify-center gap-2 text-sm transition"
              >
                <Plus className="w-4 h-4" />
                {showAddEmployee ? 'إلغاء إضافة موظف' : 'إضافة موظف جديد'}
              </button>

              {showAddEmployee && (
                <div className="space-y-2 rounded-lg border border-border p-3 bg-muted/50">
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
                      className="w-full border border-input bg-background p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  ))}
                  <button
                    type="button"
                    onClick={handleAddEmployee}
                    className="w-full px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center justify-center gap-2 text-sm font-medium transition"
                    disabled={addingEmployee}
                  >
                    {addingEmployee ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    حفظ الموظف
                  </button>
                </div>
              )}

              {selectedEmployee && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
                  <div className="font-semibold text-green-800">المكلف المحدد</div>
                  <div className="text-foreground">{selectedEmployee.rank} {selectedEmployee.name} {selectedEmployee.surname}</div>
                  <div className="text-xs text-muted-foreground">الرقم الشخصي: {selectedEmployee.number}</div>
                </div>
              )}
            </section>
          )}
        </div>
      </form>
    </div>
  )
}

