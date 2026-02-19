import React, { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import client from '../api/client'

interface Entity {
  id: number
  name: string
  type: 'SUPPLIER' | 'BENEFICIARY'
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
  const [entityType, setEntityType] = useState<'SUPPLIER' | 'BENEFICIARY' | ''>('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [unitHead, setUnitHead] = useState('')
  const [unitHeadPhone, setUnitHeadPhone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (entity) {
      setEntityType(entity.type)
      setName(entity.name)
      setPhone(entity.phone)
      setUnitHead(entity.unitHead || '')
      setUnitHeadPhone(entity.unitHeadPhone || '')
    } else {
      resetForm()
    }
  }, [entity, isOpen])

  const resetForm = () => {
    setEntityType('')
    setName('')
    setPhone('')
    setUnitHead('')
    setUnitHeadPhone('')
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!entityType) {
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

    if (entityType === 'BENEFICIARY') {
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
      if (entity) {
        await client.put(`/entities/${entity.id}`, {
          name,
          phone,
          unitHead: entityType === 'BENEFICIARY' ? unitHead : null,
          unitHeadPhone: entityType === 'BENEFICIARY' ? unitHeadPhone : null,
        })
      } else {
        await client.post('/entities', {
          name,
          type: entityType,
          phone,
          unitHead: entityType === 'BENEFICIARY' ? unitHead : null,
          unitHeadPhone: entityType === 'BENEFICIARY' ? unitHeadPhone : null,
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
      <div className="bg-white p-6 rounded shadow-lg max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">{entity ? 'تعديل الجهة' : 'إضافة جهة جديدة'}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* نوع الجهة */}
          <div>
            <label className="block text-sm mb-1">نوع الجهة</label>
            <select
              value={entityType}
              onChange={(e) => setEntityType(e.target.value as 'SUPPLIER' | 'BENEFICIARY')}
              className="w-full border p-2 rounded"
              disabled={!!entity}
            >
              <option value="">اختر نوع الجهة</option>
              <option value="SUPPLIER">جهة مسلمة</option>
              <option value="BENEFICIARY">جهة منتفعة</option>
            </select>
          </div>

          {/* اسم الجهة */}
          {entityType && (
            <>
              <div>
                <label className="block text-sm mb-1">اسم الجهة</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="أدخل اسم الجهة"
                  className="w-full border p-2 rounded"
                />
              </div>

              {/* رقم هاتف الجهة */}
              <div>
                <label className="block text-sm mb-1">رقم هاتف الجهة</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="أدخل رقم الهاتف"
                  className="w-full border p-2 rounded"
                />
              </div>

              {/* حقول الجهة المنتفعة فقط */}
              {entityType === 'BENEFICIARY' && (
                <>
                  <div>
                    <label className="block text-sm mb-1">رئيس الوحدة</label>
                    <input
                      type="text"
                      value={unitHead}
                      onChange={(e) => setUnitHead(e.target.value)}
                      placeholder="أدخل اسم رئيس الوحدة"
                      className="w-full border p-2 rounded"
                    />
                  </div>

                  <div>
                    <label className="block text-sm mb-1">رقم هاتف رئيس الوحدة</label>
                    <input
                      type="text"
                      value={unitHeadPhone}
                      onChange={(e) => setUnitHeadPhone(e.target.value)}
                      placeholder="أدخل رقم الهاتف"
                      className="w-full border p-2 rounded"
                    />
                  </div>
                </>
              )}
            </>
          )}

          {error && <div className="text-sm text-red-600">{error}</div>}

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded hover:bg-slate-100"
              disabled={loading}
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              disabled={loading}
            >
              {loading ? 'جاري...' : entity ? 'تحديث' : 'إضافة'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
