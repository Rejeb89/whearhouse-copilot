import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import client from '../api/client'
import { Plus, Building2, Phone, User, ChevronLeft, Landmark, Users, Globe } from 'lucide-react'
import EntityModal from '../components/EntityModal'

type TabKey = 'الادارات المركزية' | 'الوحدات المتنفعة' | 'جهات مختلفة'

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'الادارات المركزية', label: 'الادارات المركزية', icon: <Landmark className="w-4 h-4" /> },
  { key: 'الوحدات المتنفعة',  label: 'الوحدات المتنفعة',  icon: <Users className="w-4 h-4" /> },
  { key: 'جهات مختلفة',       label: 'جهات مختلفة',       icon: <Globe className="w-4 h-4" /> },
]

interface Entity {
  id: number
  name: string
  type: 'SUPPLIER' | 'BENEFICIARY'
  category?: string
  phone: string
  unitHead?: string
  unitHeadPhone?: string
  createdAt: string
}

export default function Entities() {
  const [showModal, setShowModal] = useState(false)
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>('الادارات المركزية')
  const [distributionCounts, setDistributionCounts] = useState<{ [key: number]: number }>({})

  const { data: entities = [], refetch } = useQuery(['entities'], async () => {
    const res = await client.get('/entities')
    return res.data.data
  }, { refetchInterval: 5000 })

  // Load distribution counts for all entities
  React.useEffect(() => {
    const loadDistributionCounts = async () => {
      const counts: { [key: number]: number } = {}
      for (const entity of entities) {
        try {
          const res = await client.get(`/entities/${entity.id}/distributions-count`)
          counts[entity.id] = res.data.data.distributionCount
        } catch (err) {
          counts[entity.id] = 0
        }
      }
      setDistributionCounts(counts)
    }
    if (entities.length > 0) loadDistributionCounts()
  }, [entities])

  const isAdminCentral = (e: Entity) => {
    const cat = e.category || ''
    return cat === 'الادارات المركزية' || cat === 'إدارة مركزية' || (cat === '' && e.type === 'SUPPLIER')
  }
  const isBeneficiary = (e: Entity) => {
    const cat = e.category || ''
    return cat === 'الوحدات المتنفعة' || (cat === '' && e.type === 'BENEFICIARY')
  }

  const tabEntities = entities.filter((e: Entity) => {
    if (activeTab === 'الادارات المركزية') return isAdminCentral(e)
    if (activeTab === 'الوحدات المتنفعة')  return isBeneficiary(e)
    return !isAdminCentral(e) && !isBeneficiary(e)
  })

  const countFor = (tab: TabKey) => entities.filter((e: Entity) => {
    if (tab === 'الادارات المركزية') return isAdminCentral(e)
    if (tab === 'الوحدات المتنفعة')  return isBeneficiary(e)
    return !isAdminCentral(e) && !isBeneficiary(e)
  }).length

  const handleAddEntity = () => { setEditingEntity(null); setShowModal(true) }
  const handleEditEntity = (entity: Entity) => { setEditingEntity(entity); setShowModal(true) }
  const handleSuccess = () => { refetch(); setShowModal(false) }

  const handleDeleteEntity = async (id: number) => {
    if (confirm('هل تريد حذف هذه الجهة؟')) {
      try {
        await client.delete(`/entities/${id}`)
        refetch()
      } catch (err: any) {
        alert(err?.response?.data?.error || 'خطأ في حذف الجهة')
      }
    }
  }

  return (
    <div dir="rtl" className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-foreground">الجهات</h1>
        <button
          onClick={handleAddEntity}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-semibold transition"
        >
          <Plus className="w-4 h-4" />
          إضافة جهة جديدة
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition -mb-px ${
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.icon}
            {tab.label}
            <span className={`text-xs rounded-full px-1.5 py-0.5 font-semibold ${
              activeTab === tab.key ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
            }`}>
              {countFor(tab.key)}
            </span>
          </button>
        ))}
      </div>

      {/* Entity cards */}
      <div>
        {tabEntities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Building2 className="w-12 h-12 mb-3 opacity-25" />
            <p className="text-sm">لا توجد جهات في هذا التصنيف</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {tabEntities.map((entity: Entity) => (
              <div key={entity.id} className="rounded-xl border border-border bg-card p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start gap-2 mb-3">
                  <h3 className="font-semibold text-foreground leading-tight">{entity.name}</h3>
                  <div className="flex gap-1.5 shrink-0">
                    <Link
                      to={`/entities/${entity.id}`}
                      className="text-xs px-2.5 py-1 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 inline-flex items-center gap-1 transition"
                    >
                      تفاصيل <ChevronLeft className="w-3.5 h-3.5" />
                    </Link>
                    <button
                      onClick={() => handleEditEntity(entity)}
                      className="text-xs px-2.5 py-1 border border-border bg-background rounded-md hover:bg-muted transition"
                    >
                      تعديل
                    </button>
                    <button
                      onClick={() => handleDeleteEntity(entity.id)}
                      disabled={distributionCounts[entity.id] > 0}
                      title={distributionCounts[entity.id] > 0 ? `مرتبطة بـ ${distributionCounts[entity.id]} عملية خرج` : ''}
                      className={`text-xs px-2.5 py-1 border rounded-md transition ${
                        distributionCounts[entity.id] > 0
                          ? 'text-muted-foreground border-muted-foreground/30 bg-muted/20 cursor-not-allowed opacity-50'
                          : 'text-destructive border-destructive/30 hover:bg-destructive/10'
                      }`}
                    >
                      حذف
                    </button>
                  </div>
                </div>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 shrink-0" />
                    <span>{entity.phone || ''}</span>
                  </div>
                  {entity.unitHead && (
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 shrink-0" />
                      <span>رئيس الوحدة: {entity.unitHead}</span>
                    </div>
                  )}
                  {entity.unitHeadPhone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 shrink-0" />
                      <span>{entity.unitHeadPhone}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
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