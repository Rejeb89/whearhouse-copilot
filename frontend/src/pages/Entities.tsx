import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import client from '../services/client'
import {
  Plus, Building2, Phone, User, Landmark, Users, Globe,
  Search, ChevronLeft, Filter
} from 'lucide-react'
import EntityModal from '../components/modals/EntityModal'

type FilterKey = 'الكل' | 'الادارات المركزية' | 'الوحدات المتنفعة' | 'جهات مختلفة'

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

const categoryMeta: Record<FilterKey, { icon: React.ReactNode; color: string; bg: string; border: string }> = {
  'الكل':               { icon: <Filter className="w-4 h-4" />,   color: 'text-foreground',  bg: 'bg-muted',          border: 'border-border' },
  'الادارات المركزية':  { icon: <Landmark className="w-4 h-4" />, color: 'text-blue-600',    bg: 'bg-blue-50 dark:bg-blue-950/40',   border: 'border-blue-200 dark:border-blue-800' },
  'الوحدات المتنفعة':   { icon: <Users className="w-4 h-4" />,    color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/40', border: 'border-emerald-200 dark:border-emerald-800' },
  'جهات مختلفة':        { icon: <Globe className="w-4 h-4" />,    color: 'text-violet-600',  bg: 'bg-violet-50 dark:bg-violet-950/40',  border: 'border-violet-200 dark:border-violet-800' },
}

const cardAccent: Record<string, string> = {
  'الادارات المركزية': 'border-r-4 border-r-blue-500',
  'الوحدات المتنفعة':  'border-r-4 border-r-emerald-500',
  'جهات مختلفة':       'border-r-4 border-r-violet-500',
}

export default function Entities() {
  const navigate = useNavigate()
  const [showModal, setShowModal] = useState(false)
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null)
  const [activeFilter, setActiveFilter] = useState<FilterKey>('الكل')
  const [search, setSearch] = useState('')

  const { data: entities = [], refetch } = useQuery(['entities'], async () => {
    const res = await client.get('/entities')
    return res.data.data
  }, { refetchInterval: 5000 })

  const getCategory = (e: Entity): FilterKey => {
    const cat = e.category || ''
    if (cat === 'الادارات المركزية' || cat === 'إدارة مركزية' || (cat === '' && e.type === 'SUPPLIER'))
      return 'الادارات المركزية'
    if (cat === 'الوحدات المتنفعة' || (cat === '' && e.type === 'BENEFICIARY'))
      return 'الوحدات المتنفعة'
    return 'جهات مختلفة'
  }

  const countFor = (key: FilterKey) =>
    key === 'الكل' ? entities.length : entities.filter((e: Entity) => getCategory(e) === key).length

  const filtered = useMemo(() => {
    let list = entities as Entity[]
    if (activeFilter !== 'الكل') list = list.filter(e => getCategory(e) === activeFilter)
    if (search.trim()) list = list.filter(e =>
      e.name.includes(search) || (e.unitHead || '').includes(search) || (e.phone || '').includes(search)
    )
    return list
  }, [entities, activeFilter, search])

  const handleAddEntity = () => { setEditingEntity(null); setShowModal(true) }
  const handleSuccess = () => { refetch(); setShowModal(false) }

  const FILTERS: FilterKey[] = ['الكل', 'الادارات المركزية', 'الوحدات المتنفعة', 'جهات مختلفة']

  return (
    <div dir="rtl" className="space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">الجهات</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            إدارة الجهات المورّدة والوحدات المنتفعة — {entities.length} جهة مسجّلة
          </p>
        </div>
        <button
          onClick={handleAddEntity}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-sm font-semibold shadow-sm transition-all hover:shadow-md"
        >
          <Plus className="w-4 h-4" />
          إضافة جهة جديدة
        </button>
      </div>

      {/* ── Stats cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {FILTERS.map(key => {
          const meta = categoryMeta[key]
          const count = countFor(key)
          const isActive = activeFilter === key
          return (
            <button
              key={key}
              onClick={() => setActiveFilter(key)}
              className={`relative flex flex-col gap-2 p-4 rounded-xl border text-right transition-all hover:shadow-md ${
                isActive
                  ? `${meta.bg} ${meta.border} shadow-sm ring-1 ring-inset ${meta.border}`
                  : 'bg-card border-border hover:border-muted-foreground/30'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isActive ? meta.bg : 'bg-muted'} ${meta.color}`}>
                {meta.icon}
              </div>
              <div>
                <p className={`text-2xl font-bold ${isActive ? meta.color : 'text-foreground'}`}>{count}</p>
                <p className={`text-xs font-medium mt-0.5 ${isActive ? meta.color : 'text-muted-foreground'}`}>{key}</p>
              </div>
              {isActive && (
                <span className={`absolute top-2 left-2 w-2 h-2 rounded-full ${meta.color.replace('text-', 'bg-')}`} />
              )}
            </button>
          )
        })}
      </div>

      {/* ── Search & count ── */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="ابحث عن جهة، رئيس وحدة، أو رقم هاتف..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pr-9 pl-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
          />
        </div>
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {filtered.length} نتيجة
        </span>
      </div>

      {/* ── Entity grid ── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Building2 className="w-7 h-7 opacity-40" />
          </div>
          <p className="font-medium">لا توجد جهات</p>
          <p className="text-sm mt-1 opacity-70">
            {search ? 'جرّب مصطلح بحث مختلف' : 'أضف جهة جديدة للبدء'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((entity: Entity) => {
            const cat = getCategory(entity)
            const meta = categoryMeta[cat]
            const accent = cardAccent[cat] || ''
            return (
              <div
                key={entity.id}
                onClick={() => navigate(`/entities/${entity.id}`)}
                className={`group relative flex flex-col rounded-xl border border-border bg-card hover:shadow-lg hover:border-primary/30 transition-all cursor-pointer overflow-hidden ${accent}`}
              >
                {/* Card top */}
                <div className="p-4 flex-1">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${meta.bg} ${meta.color}`}>
                        {meta.icon}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-foreground leading-tight truncate group-hover:text-primary transition-colors">
                          {entity.name}
                        </h3>
                        <span className={`text-xs font-medium ${meta.color}`}>{cat}</span>
                      </div>
                    </div>
                    <ChevronLeft className="w-4 h-4 text-muted-foreground shrink-0 mt-1 group-hover:text-primary transition-colors group-hover:-translate-x-0.5 duration-150" />
                  </div>

                  <div className="space-y-1.5 text-sm text-muted-foreground">
                    {entity.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 shrink-0" />
                        <span dir="ltr" className="font-mono">{entity.phone}</span>
                      </div>
                    )}
                    {entity.unitHead && (
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{entity.unitHead}</span>
                      </div>
                    )}
                    {entity.unitHeadPhone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 shrink-0" />
                        <span dir="ltr" className="font-mono">{entity.unitHeadPhone}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card footer */}
                <div className={`px-4 py-2 border-t border-border ${meta.bg} flex items-center justify-between`}>
                  <span className="text-xs text-muted-foreground">
                    {new Date(entity.createdAt).toLocaleDateString('ar-DZ')}
                  </span>
                  <span className={`text-xs font-semibold ${meta.color}`}>عرض التفاصيل</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <EntityModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={handleSuccess}
        entity={editingEntity}
      />
    </div>
  )
}