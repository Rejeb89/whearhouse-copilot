import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import client from '../api/client'
import { Plus, Building2, Phone, User, ChevronLeft } from 'lucide-react'
import EntityModal from '../components/EntityModal'

interface Entity {
  id: number
  name: string
  type: 'SUPPLIER' | 'BENEFICIARY'
  phone: string
  unitHead?: string
  unitHeadPhone?: string
  createdAt: string
}

export default function Entities() {
  const [showModal, setShowModal] = useState(false)
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null)
  const { data: entities = [], refetch } = useQuery(['entities'], async () => {
    const res = await client.get('/entities')
    return res.data.data
  }, { refetchInterval: 5000 })

  const suppliers = entities.filter((e: Entity) => e.type === 'SUPPLIER')
  const beneficiaries = entities.filter((e: Entity) => e.type === 'BENEFICIARY')

  const handleAddEntity = () => {
    setEditingEntity(null)
    setShowModal(true)
  }

  const handleEditEntity = (entity: Entity) => {
    setEditingEntity(entity)
    setShowModal(true)
  }

  const handleSuccess = () => {
    refetch()
    setShowModal(false)
  }

  const handleDeleteEntity = async (id: number) => {
    if (confirm('هل تريد حذف هذه الجهة؟')) {
      try {
        await client.delete(`/entities/${id}`)
        refetch()
      } catch (err) {
        alert('خطأ في حذف الجهة')
      }
    }
  }

  return (
    <div dir="rtl">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-semibold">الجهات</h1>
        <button
          onClick={handleAddEntity}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          إضافة جهة جديدة
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* الجهات المسلمة */}
        <section className="bg-white p-6 rounded shadow">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold">الجهات المسلمة</h2>
          </div>
          {suppliers.length === 0 ? (
            <p className="text-gray-600">لا توجد جهات مسلمة</p>
          ) : (
            <div className="space-y-3">
              {suppliers.map((entity: Entity) => (
                <div key={entity.id} className="border p-3 rounded hover:bg-blue-50 group">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold">{entity.name}</h3>
                    <div className="flex gap-2">
                      <Link
                        to={`/entities/${entity.id}`}
                        className="text-sm px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 inline-flex items-center gap-1"
                      >
                        <span>تفاصيل</span>
                        <ChevronLeft className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => handleEditEntity(entity)}
                        className="text-sm px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        تعديل
                      </button>
                      <button
                        onClick={() => handleDeleteEntity(entity.id)}
                        className="text-sm px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        حذف
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="w-4 h-4" />
                    {entity.phone}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* الجهات المنتفعة */}
        <section className="bg-white p-6 rounded shadow">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-semibold">الجهات المنتفعة</h2>
          </div>
          {beneficiaries.length === 0 ? (
            <p className="text-gray-600">لا توجد جهات منتفعة</p>
          ) : (
            <div className="space-y-3">
              {beneficiaries.map((entity: Entity) => (
                <div key={entity.id} className="border p-3 rounded hover:bg-green-50 group">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold">{entity.name}</h3>
                    <div className="flex gap-2">
                      <Link
                        to={`/entities/${entity.id}`}
                        className="text-sm px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 inline-flex items-center gap-1"
                      >
                        <span>تفاصيل</span>
                        <ChevronLeft className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => handleEditEntity(entity)}
                        className="text-sm px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        تعديل
                      </button>
                      <button
                        onClick={() => handleDeleteEntity(entity.id)}
                        className="text-sm px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        حذف
                      </button>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      {entity.phone}
                    </div>
                    {entity.unitHead && (
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        رئيس الوحدة: {entity.unitHead}
                      </div>
                    )}
                    {entity.unitHeadPhone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        {entity.unitHeadPhone}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <EntityModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={handleSuccess}
        entity={editingEntity}
      />
    </div>
  )
}
