import React, { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import client from '../api/client'

type EntityCategory = 'الادارات المركزية' | 'الوحدات المتنفعة' | 'جهات مختلفة'

const CATEGORIES: { value: EntityCategory; label: string; type: 'SUPPLIER' | 'BENEFICIARY' }[] = [
  { value: 'الادارات المركزية', label: 'الادارات المركزية', type: 'SUPPLIER' },
  { value: 'الوحدات المتنفعة', label: 'الوحدات المتنفعة', type: 'BENEFICIARY' },
  { value: 'جهات مختلفة',      label: 'جهات مختلفة',      type: 'BENEFICIARY' },
]

interface Entity {
  id: number
  name: string
  type: 'SUPPLIER' | 'BENEFICIARY'
  category?: string
  phone: string
  unitHead?: string
  unitHeadPhone?: string
}

interface EntityModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  entity?: Entity | null
}

export default function EntityModal({ isOpen, onClose, onSuccess, entity }: EntityModalProps) {
  const [category, setCategory] = useState<EntityCategory | ''>('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [unitHead, setUnitHead] = useState('')
  const [unitHeadPhone, setUnitHeadPhone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const selectedCat = CATEGORIES.find(c => c.value === category)

  useEffect(() => {
    if (entity) {
      // map stored category or fall back from type
      const cat = entity.category as EntityCategory | undefined
      setCategory(cat && CATEGORIES.find(c => c.value === cat) ? cat : (entity.type === 'SUPPLIER' ? 'الادارات المركزية' : 'الوحدات المتنفعة'))
      setName(entity.name)
      setPhone(entity.phone)
      setUnitHead(entity.unitHead || '')
      setUnitHeadPhone(entity.unitHeadPhone || '')
    } else {
      resetForm()
    }
  }, [entity, isOpen])

  const resetForm = () => {
    setCategory('')
    setName('')
    setPhone('')
    setUnitHead('')
    setUnitHeadPhone('')
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!category) {
      setError('يجب اختيار نوع الجهة')
      return
    }
    if (!name.trim()) {
      setError('يجب إدخال اسم الجهة')
      return
    }
    if (!phone.trim()) {
      setError('يجب إدخال رقم الهاتف')
      return
    }
    if (category === 'الوحدات المتنفعة') {
      if (!unitHead.trim()) {
        setError('يجب إدخال اسم رئيس الوحدة')
        return
      }
      if (!unitHeadPhone.trim()) {
        setError('يجب إدخال رقم هاتف رئيس الوحدة')
        return
      }
    }

    setLoading(true)
    try {
      const entityType = selectedCat?.type || 'BENEFICIARY'
      if (entity) {
        await client.put(`/entities/${entity.id}`, {
          name,
          category,
          phone,
          unitHead: category === 'الوحدات المتنفعة' ? unitHead : null,
          unitHeadPhone: category === 'الوحدات المتنفعة' ? unitHeadPhone : null,
        })
      } else {
        await client.post('/entities', {
          name,
          type: entityType,
          category,
          phone,
          unitHead: category === 'الوحدات المتنفعة' ? unitHead : null,
          unitHeadPhone: category === 'الوحدات المتنفعة' ? unitHeadPhone : null,
        })
      }
      onSuccess()
      resetForm()
    } catch (err: any) {
      setError(err?.response?.data?.error || 'حدث خطأ')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" dir="rtl">
      <div className="bg-card p-6 rounded-xl border border-border shadow-lg max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-foreground">{entity ? 'تعديل الجهة' : 'إضافة جهة جديدة'}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* تصنيف الجهة */}
          <div>
            <label className="block text-sm font-medium mb-1 text-foreground">تصنيف الجهة</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as EntityCategory | '')}
              className="w-full border border-border bg-background text-foreground p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              disabled={!!entity}
            >
              <option value="">اختر تصنيف الجهة</option>
              {CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {category && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1 text-foreground">اسم الجهة</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="أدخل اسم الجهة"
                  className="w-full border border-border bg-background text-foreground p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-foreground">رقم الهاتف</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="أدخل رقم الهاتف"
                  className="w-full border border-border bg-background text-foreground p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              {category === 'الوحدات المتنفعة' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-foreground">رئيس الوحدة</label>
                    <input
                      type="text"
                      value={unitHead}
                      onChange={(e) => setUnitHead(e.target.value)}
                      placeholder="أدخل اسم رئيس الوحدة"
                      className="w-full border border-border bg-background text-foreground p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-foreground">رقم هاتف رئيس الوحدة</label>
                    <input
                      type="text"
                      value={unitHeadPhone}
                      onChange={(e) => setUnitHeadPhone(e.target.value)}
                      placeholder="أدخل رقم الهاتف"
                      className="w-full border border-border bg-background text-foreground p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                </>
              )}
            </>
          )}

          {error && <div className="text-sm text-destructive bg-destructive/10 p-2 rounded-lg">{error}</div>}

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-border rounded-lg hover:bg-muted/50 text-sm"
              disabled={loading}
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 text-sm font-medium disabled:opacity-60"
              disabled={loading}
            >
              {loading ? 'جارٍ الحفظ...' : entity ? 'تحديث' : 'إضافة'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
