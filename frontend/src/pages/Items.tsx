import React, { useContext, useMemo, useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import client from '../services/client'
import { AuthContext } from '../context/AuthContext'
import {
  Package, AlertTriangle, AlertCircle, ChevronLeft, BarChart2,
  Layers, Hash, Calendar, User, TrendingDown, TrendingUp, ArrowRight,
  Edit2, Trash2, X, Save, Search, Clock, Filter, SlidersHorizontal, Download,
  Monitor, Smartphone, Wifi, HardDrive, Shield, Wrench, Truck, Book, Sofa, Cpu,
} from 'lucide-react'
import Receptions from './Receptions'
import Distributions from './Distributions'
import { Receipt, ReceiptPrintTemplate, downloadPDF } from '../components/receipts/ReceiptPrintTemplate'

const fetchItems = async () => (await client.get('/items')).data.data
const fetchItemHistory = async (itemId: number) =>
  (await client.get(`/items/${itemId}/history`)).data.data

const categoryIconRules: Array<{ matcher: RegExp; Icon: React.ComponentType<React.SVGProps<SVGSVGElement>> }> = [
  { matcher: /أثاث|كرسي|طاولة|مكتب|سقْف/i, Icon: Sofa },
  { matcher: /حاسوب|كمبيوتر|laptop|desktop|pc|حاسبة|نظام/i, Icon: Monitor },
  { matcher: /محمول|هاتف|جوال|smartphone|mobile/i, Icon: Smartphone },
  { matcher: /شبكة|راوتر|wifi|switch|network/i, Icon: Wifi },
  { matcher: /هارد|تخزين|ssd|usb|قرص/i, Icon: HardDrive },
  { matcher: /أمان|حماية|security|درع/i, Icon: Shield },
  { matcher: /أدوات|صيانة|tool|wrench/i, Icon: Wrench },
  { matcher: /مركبة|سيارة|شاحنة|truck|عربة/i, Icon: Truck },
  { matcher: /برمجيات|system|software|cpu|برنامج/i, Icon: Cpu },
  { matcher: /مستند|doc|كتاب|book/i, Icon: Book },
]

const getCategoryIcon = (
  category?: string,
  options?: { sizeClass?: string; colorClass?: string }
) => {
  const normalized = (category || '').toLowerCase()
  const rule = categoryIconRules.find(r => r.matcher.test(normalized))
  const Icon = rule?.Icon ?? Package
  const { sizeClass = 'w-5 h-5', colorClass = 'text-primary' } = options || {}
  return <Icon className={`${sizeClass} ${colorClass}`} />
}

type View = 'categories' | 'category-items' | 'item-report'
type PageTab = 'items' | 'receptions' | 'distributions' | 'lowStock'

export default function Items() {
  const { user } = useContext(AuthContext)!
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SECTION_CHIEF'
  const qc = useQueryClient()
  const location = useLocation()

  const [activeTab, setActiveTab] = useState<PageTab>('items')
  const [preDistItem, setPreDistItem] = useState<any>(null)
  const [historyTab, setHistoryTab] = useState<'receptions' | 'distributions'>('receptions')
  const [historySearch, setHistorySearch] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo]     = useState('')
  const [showFilters, setShowFilters]       = useState(false)
  const [downloadingReceiptId, setDownloadingReceiptId] = useState<number | null>(null)
  const [downloadReceiptData, setDownloadReceiptData]   = useState<Receipt | null>(null)

  const handleDownloadReceipt = async (receiptId: number, serialNumber: string) => {
    setDownloadingReceiptId(receiptId)
    try {
      const data: Receipt = (await client.get(`/receipts/${receiptId}`)).data.data
      setDownloadReceiptData(data)
      await new Promise(r => setTimeout(r, 400))
      await downloadPDF('item-receipt-print-area', `${serialNumber}.pdf`)
    } finally {
      setDownloadingReceiptId(null)
      setDownloadReceiptData(null)
    }
  }

  // Handle tab from location state
  useEffect(() => {
    const tab = (location.state as any)?.activeTab as PageTab | undefined
    if (tab) {
      setActiveTab(tab)
    }
  }, [location.state])

  const openDistributions = (item: any) => {
    setPreDistItem(item)
    setActiveTab('distributions')
  }

  const { data: items = [] } = useQuery(['items'], fetchItems)
  const lowAlerts = useMemo(
    () => (items || []).filter((it: any) => (it.category || '').trim() !== 'اثاث قار' && (it.lowStockThreshold ?? 5) >= it.quantity),
    [items]
  )

  const [view, setView]                   = useState<View>('categories')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedItem, setSelectedItem]   = useState<any>(null)
  const [searchTerm, setSearchTerm]       = useState('')

  // ── edit modal ──
  const [editTarget, setEditTarget]   = useState<any>(null)
  const [editForm, setEditForm]       = useState({ name: '', sku: '', category: '', description: '', quantity: 0, lowStockThreshold: 5 })
  const openEdit = (it: any, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditTarget(it)
    setEditForm({ name: it.name ?? '', sku: it.sku ?? '', category: it.category ?? '', description: it.description ?? '', quantity: it.quantity ?? 0, lowStockThreshold: it.lowStockThreshold ?? 5 })
  }

  // ── delete confirmation ──
  const [deleteTarget, setDeleteTarget] = useState<any>(null)
  const openDelete = (it: any, e: React.MouseEvent) => { e.stopPropagation(); setDeleteTarget(it) }

  // ── mutations ──
  const updateMutation = useMutation(
    (payload: any) => client.put(`/items/${payload.id}`, payload.data).then(r => r.data.data),
    {
      onSuccess: (updated) => {
        qc.invalidateQueries(['items'])
        if (selectedItem?.id === updated.id) setSelectedItem(updated)
        setEditTarget(null)
      },
    }
  )
  const deleteMutation = useMutation(
    (id: number) => client.delete(`/items/${id}`).then(r => r.data.data),
    {
      onSuccess: (_, id) => {
        qc.invalidateQueries(['items'])
        if (selectedItem?.id === id) { setSelectedItem(null); setView('category-items') }
        setDeleteTarget(null)
      },
      onError: (error: any) => {
        console.error('Delete error:', error.response?.data || error.message)
      }
    }
  )

  const categoryStats = useMemo(() => {
    const map: Record<string, { count: number; qty: number; lowStock: number }> = {}
    items.forEach((it: any) => {
      const cat = it.category || 'بدون صنف'
      const s = map[cat] ?? { count: 0, qty: 0, lowStock: 0 }
      s.count += 1
      s.qty += Number(it.quantity ?? 0)
      if (it.category !== 'أثاث قار' && it.quantity <= (it.lowStockThreshold ?? 5)) s.lowStock += 1
      map[cat] = s
    })
    return map
  }, [items])

  // ── Search filtering ──
  const searchLower = searchTerm.toLowerCase().trim()
  const filteredItems = useMemo(() => {
    if (!searchLower) return items
    return items.filter((it: any) =>
      (it.name?.toLowerCase() || '').includes(searchLower) ||
      (it.sku?.toLowerCase() || '').includes(searchLower) ||
      (it.category?.toLowerCase() || '').includes(searchLower) ||
      (it.description?.toLowerCase() || '').includes(searchLower)
    )
  }, [items, searchLower])

  // ── Search results by category ──
  const searchResultsByCategory = useMemo(() => {
    if (!searchLower) return null
    const map: Record<string, any[]> = {}
    filteredItems.forEach((it: any) => {
      const cat = it.category || 'بدون صنف'
      if (!map[cat]) map[cat] = []
      map[cat].push(it)
    })
    return map
  }, [filteredItems, searchLower])

  const categoryList = useMemo(() => Object.keys(categoryStats), [categoryStats])

  const categoryItems = useMemo(() =>
    items.filter((it: any) => (it.category || 'بدون صنف') === selectedCategory),
    [items, selectedCategory])

  const { data: history = { receptions: [], distributions: [] }, isLoading: historyLoading } = useQuery(
    ['item-history', selectedItem?.id],
    () => fetchItemHistory(selectedItem!.id),
    { enabled: view === 'item-report' && !!selectedItem }
  )

  const totalDistributed = useMemo(
    () => (history.distributions as any[]).reduce((s: number, d: any) => s + d.quantity, 0),
    [history.distributions]
  )
  const totalReceived = useMemo(
    () => (history.receptions as any[]).reduce((s: number, r: any) => s + r.quantity, 0),
    [history.receptions]
  )

  /* ── filtered history ── */
  const filteredReceptions = useMemo(() => {
    let rows = history.receptions as any[]
    const term = historySearch.trim().toLowerCase()
    if (term) rows = rows.filter((r: any) =>
      (r.reception?.supplier?.name || '').toLowerCase().includes(term) ||
      (r.reception?.supplier?.phone || '').toLowerCase().includes(term) ||
      (r.reception?.user?.name    || '').toLowerCase().includes(term) ||
      (r.reception?.user?.email   || '').toLowerCase().includes(term) ||
      (r.reception?.referenceNumber || '').toLowerCase().includes(term) ||
      (r.reception?.referenceType   || '').toLowerCase().includes(term) ||
      (r.reception?.notes || '').toLowerCase().includes(term) ||
      (r.reception?.collector ? `${r.reception.collector.rank} ${r.reception.collector.name} ${r.reception.collector.surname} ${r.reception.collector.number || ''}`.toLowerCase().includes(term) : false) ||
      (r.adminNumber || '').toLowerCase().includes(term)
    )
    if (filterDateFrom) rows = rows.filter((r: any) => r.reception?.createdAt && new Date(r.reception.createdAt) >= new Date(filterDateFrom))
    if (filterDateTo)   rows = rows.filter((r: any) => r.reception?.createdAt && new Date(r.reception.createdAt) <= new Date(filterDateTo + 'T23:59:59'))
    return rows
  }, [history.receptions, historySearch, filterDateFrom, filterDateTo])

  const filteredDistributions = useMemo(() => {
    let rows = history.distributions as any[]
    const term = historySearch.trim().toLowerCase()
    if (term) rows = rows.filter((d: any) =>
      (d.distribution?.beneficiary?.name  || '').toLowerCase().includes(term) ||
      (d.distribution?.beneficiary?.phone || '').toLowerCase().includes(term) ||
      (d.distribution?.assignedTo ? `${d.distribution.assignedTo.rank} ${d.distribution.assignedTo.name} ${d.distribution.assignedTo.surname} ${d.distribution.assignedTo.number || ''}`.toLowerCase().includes(term) : false) ||
      (d.distribution?.deliveredByName   || '').toLowerCase().includes(term) ||
      (d.distribution?.user?.name        || '').toLowerCase().includes(term) ||
      (d.distribution?.user?.email       || '').toLowerCase().includes(term) ||
      (d.distribution?.referenceNumber   || '').toLowerCase().includes(term) ||
      (d.distribution?.referenceType     || '').toLowerCase().includes(term) ||
      (d.distribution?.notes             || '').toLowerCase().includes(term) ||
      (d.adminNumber                     || '').toLowerCase().includes(term)
    )
    if (filterDateFrom) rows = rows.filter((d: any) => d.distribution?.createdAt && new Date(d.distribution.createdAt) >= new Date(filterDateFrom))
    if (filterDateTo)   rows = rows.filter((d: any) => d.distribution?.createdAt && new Date(d.distribution.createdAt) <= new Date(filterDateTo + 'T23:59:59'))
    return rows
  }, [history.distributions, historySearch, filterDateFrom, filterDateTo])

  const openCategory = (cat: string) => { setSelectedCategory(cat); setView('category-items') }
  const openItemReport = (it: any)   => {
    setSelectedItem(it)
    setView('item-report')
    setHistorySearch('')
    setFilterDateFrom('')
    setFilterDateTo('')
    setShowFilters(false)
  }
  const goBack = () => {
    if (view === 'item-report')      { setView('category-items'); setSelectedItem(null) }
    else if (view === 'category-items') { setView('categories'); setSelectedCategory('') }
  }

  return (
    <div dir="rtl" className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold text-foreground">التجهيزات</h1>
          <p className="text-sm text-muted-foreground">إدارة المستودع</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('receptions')}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
          >
            <TrendingUp className="w-4 h-4" />
            دخل
          </button>
          <button
            onClick={() => setActiveTab('distributions')}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <TrendingDown className="w-4 h-4" />
            خرج
          </button>
        </div>
      </div>

      {/* ── Page-level Tab Bar ── */}
      <div className="flex items-center gap-1 border-b border-border">
        {([
          { key: 'items',         label: 'المخزون',           icon: <Package className="w-4 h-4" /> },
          { key: 'lowStock',      label: 'الأصناف المنخفضة',  icon: <AlertCircle className="w-4 h-4" />, badge: lowAlerts.length },
          { key: 'receptions',    label: 'الدخل اليومي',     icon: <TrendingUp className="w-4 h-4" /> },
          { key: 'distributions', label: 'الخرج اليومي',     icon: <TrendingDown className="w-4 h-4" /> },
        ] as { key: PageTab; label: string; icon: React.ReactNode; badge?: number }[]).map(tab => (
          <button
            key={tab.key}
            onClick={() => {
              if (tab.key !== 'distributions') setPreDistItem(null)
              setActiveTab(tab.key)
            }}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition ${
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className="inline-flex items-center justify-center px-2 py-0.5 ml-1 text-xs font-bold text-white bg-destructive rounded-full">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Low Stock Tab ── */}
      {activeTab === 'lowStock' && (
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              الأصناف المنخفضة
            </h2>
            <p className="text-xs text-muted-foreground">إجمالي: {lowAlerts.length}</p>
          </div>
          {lowAlerts.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">جميع الأصناف بمستويات آمنة</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {lowAlerts.map((it: any) => (
                <div key={it.id} className="group relative text-right bg-muted/50 hover:bg-muted border border-destructive/30 hover:border-destructive/50 rounded-xl transition-all shadow-sm">
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="p-2 rounded-lg bg-red-100">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-foreground">{it.name}</p>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">{it.sku}</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">{it.category || 'بدون صنف'}</p>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="bg-background rounded p-2">
                        <p className="text-xs text-muted-foreground">الكمية الحالية</p>
                        <p className="text-lg font-bold text-red-600">{it.quantity}</p>
                      </div>
                      <div className="bg-background rounded p-2">
                        <p className="text-xs text-muted-foreground">الحد الأدنى</p>
                        <p className="text-lg font-bold text-orange-600">{it.lowStockThreshold ?? 5}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => openDistributions(it)}
                      className="w-full px-3 py-1.5 bg-primary text-primary-foreground rounded text-xs font-medium hover:bg-primary/90 transition"
                    >
                      تسجيل خرج
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Receptions Tab ── */}
      {activeTab === 'receptions' && <Receptions />}

      {/* ── Distributions Tab ── */}
      {activeTab === 'distributions' && <Distributions preselectedItem={preDistItem} />}

      {/* ── Items Tab content (everything below is only shown when activeTab === 'items') ── */}
      {activeTab === 'items' && (<>

      {/* ── Search Bar ── */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="relative">
          <Search className="absolute right-3 top-3 w-5 h-5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="ابحث عن تجهيز باسمه، رمزه (SKU)، صنفه أو وصفه..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              if (e.target.value.trim()) {
                setView('categories')
                setSelectedCategory('')
                setSelectedItem(null)
              }
            }}
            className="w-full pl-4 pr-10 py-2.5 border border-input bg-background rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition"
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm('')
                setSelectedItem(null)
              }}
              className="absolute left-3 top-2.5 text-muted-foreground hover:text-foreground transition"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* ── Breadcrumb ── */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
        <button onClick={() => { setView('categories'); setSelectedCategory(''); setSelectedItem(null) }} className="hover:text-primary flex items-center gap-1">
          <Package className="w-4 h-4" /> التجهيزات
        </button>
        {view !== 'categories' && (
          <>
            <ChevronLeft className="w-4 h-4" />
            <button onClick={() => { setView('category-items'); setSelectedItem(null) }} className={`hover:text-primary ${view === 'category-items' ? 'font-semibold text-foreground' : ''}`}>
              {selectedCategory}
            </button>
          </>
        )}
        {view === 'item-report' && (
          <>
            <ChevronLeft className="w-4 h-4" />
            <span className="font-semibold text-foreground">{selectedItem?.name}</span>
          </>
        )}
      </div>

      {/* ══════════ VIEW: categories ══════════ */}
      {view === 'categories' && (
        <div className="rounded-xl border border-border bg-card p-5">
          {searchTerm ? (
            // ── Search results view ──
            <>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <Search className="w-5 h-5 text-primary" /> نتائج البحث
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">{filteredItems.length} تجهيز من أصل {items.length}</p>
                </div>
              </div>
              {filteredItems.length === 0 ? (
                <div className="text-center py-10">
                  <Package className="w-12 h-12 mx-auto mb-3 opacity-30 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">لا توجد تجهيزات تطابق البحث</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredItems.map((it: any) => {
                    const low = it.quantity <= (it.lowStockThreshold ?? 5)
                    return (
                      <div key={it.id} className="group relative text-right bg-card hover:bg-muted/50 border border-border rounded-xl transition-all shadow-sm hover:shadow">
                        <button onClick={() => { setSelectedItem(it); setView('item-report') }} className="w-full text-right p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className={`p-2 rounded-lg transition ${low ? 'bg-red-100 group-hover:bg-red-200' : 'bg-green-100 group-hover:bg-green-200'}`}>
                              {getCategoryIcon(it.category, { colorClass: low ? 'text-red-600' : 'text-green-600' })}
                            </div>
                            <div className="flex items-center gap-1 text-muted-foreground/50 group-hover:text-primary transition text-xs">
                              <BarChart2 className="w-4 h-4" /> تقرير
                            </div>
                          </div>
                          <p className="text-sm font-bold text-foreground mb-1 leading-snug">{it.name}</p>
                          <p className="text-xs text-muted-foreground font-mono mb-1">{it.sku}</p>
                          <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{it.category || 'بدون صنف'}</p>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">الكمية</span>
                            <span className={`font-bold text-lg ${low ? 'text-red-600' : 'text-green-700'}`}>
                              {it.quantity}
                              {low && <AlertTriangle className="w-3 h-3 inline mr-1" />}
                            </span>
                          </div>
                        </button>
                        <div className={`flex border-t border-border`}>
                          <button
                            onClick={(e) => { e.stopPropagation(); openDistributions(it) }}
                            className="flex-1 flex items-center justify-center gap-1 py-2 text-xs text-orange-500 hover:text-orange-700 hover:bg-orange-50 transition rounded-b-xl"
                          >
                            <TrendingDown className="w-3 h-3" /> خرج
                          </button>
                          {isAdmin && (
                            <>
                              <div className="w-px bg-border" />
                              <button onClick={(e) => openEdit(it, e)} className="flex-1 flex items-center justify-center gap-1 py-2 text-xs text-muted-foreground hover:text-primary hover:bg-muted/50 transition">
                                <Edit2 className="w-3 h-3" /> تعديل
                              </button>
                              <div className="w-px bg-border" />
                              <button onClick={(e) => openDelete(it, e)} className="flex-1 flex items-center justify-center gap-1 py-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition rounded-bl-xl">
                                <Trash2 className="w-3 h-3" /> حذف
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          ) : (
            // ── Categories view ──
            <>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <Layers className="w-5 h-5 text-primary" /> التجهيزات حسب الصنف
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">{items.length} تجهيز — {categoryList.length} صنف</p>
                </div>
              </div>
              {categoryList.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-10">لا توجد أصناف لعرضها</p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoryList.map(cat => {
                  const s = categoryStats[cat]
                  return (
                    <button
                      key={cat}
                      onClick={() => openCategory(cat)}
                      className="group text-right bg-card hover:bg-muted/50 border border-border rounded-xl p-4 transition-all shadow-sm hover:shadow"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="p-2 rounded-lg bg-muted group-hover:bg-muted transition">
                          {getCategoryIcon(cat, { sizeClass: 'w-6 h-6', colorClass: 'text-primary' })}
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary/60 transition mt-1" />
                      </div>
                      <p className="text-base font-bold text-foreground mb-2">{cat}</p>
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span><span className="font-semibold text-foreground">{s.count}</span> تجهيز</span>
                        <span><span className="font-semibold text-foreground">{s.qty}</span> وحدة</span>
                        {s.lowStock > 0 && (
                          <span className="text-red-500 font-semibold flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />{s.lowStock} منخفض
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ══════════ VIEW: category-items ══════════ */}
      {view === 'category-items' && (
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Layers className="w-5 h-5 text-primary" /> {selectedCategory}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">{categoryItems.length} تجهيز</p>
            </div>
            <button onClick={goBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition">
              <ChevronLeft className="w-4 h-4" /> رجوع
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoryItems.map((it: any) => {
              const low = it.quantity <= (it.lowStockThreshold ?? 5)
              return (
                <div key={it.id} className="group relative text-right bg-card hover:bg-muted/50 border border-border rounded-xl transition-all shadow-sm hover:shadow">
                  <button onClick={() => openItemReport(it)} className="w-full text-right p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`p-2 rounded-lg transition ${low ? 'bg-red-100 group-hover:bg-red-200' : 'bg-green-100 group-hover:bg-green-200'}`}>
                        {getCategoryIcon(it.category, { colorClass: low ? 'text-red-600' : 'text-green-600' })}
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground/50 group-hover:text-primary transition text-xs">
                        <BarChart2 className="w-4 h-4" /> تقرير
                      </div>
                    </div>
                    <p className="text-sm font-bold text-foreground mb-1 leading-snug">{it.name}</p>
                    <p className="text-xs text-muted-foreground font-mono mb-3">{it.sku}</p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">الكمية</span>
                      <span className={`font-bold text-lg ${low ? 'text-red-600' : 'text-green-700'}`}>
                        {it.quantity}
                        {low && <AlertTriangle className="w-3 h-3 inline mr-1" />}
                      </span>
                    </div>
                  </button>
                  <div className="flex border-t border-border">
                    <button
                      onClick={(e) => { e.stopPropagation(); openDistributions(it) }}
                      className="flex-1 flex items-center justify-center gap-1 py-2 text-xs text-orange-500 hover:text-orange-700 hover:bg-orange-50 transition rounded-b-xl"
                    >
                      <TrendingDown className="w-3 h-3" /> خرج
                    </button>
                    {isAdmin && (
                      <>
                        <div className="w-px bg-border" />
                        <button onClick={(e) => openEdit(it, e)} className="flex-1 flex items-center justify-center gap-1 py-2 text-xs text-muted-foreground hover:text-primary hover:bg-muted/50 transition">
                          <Edit2 className="w-3 h-3" /> تعديل
                        </button>
                        <div className="w-px bg-border" />
                        <button onClick={(e) => openDelete(it, e)} className="flex-1 flex items-center justify-center gap-1 py-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition rounded-bl-xl">
                          <Trash2 className="w-3 h-3" /> حذف
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ══════════ VIEW: item-report ══════════ */}
      {view === 'item-report' && selectedItem && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-muted shrink-0">
                  {getCategoryIcon(selectedItem.category, { sizeClass: 'w-7 h-7', colorClass: 'text-primary' })}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">{selectedItem.name}</h2>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">{selectedItem.sku}</p>
                  <p className="text-xs text-muted-foreground mt-1">{selectedItem.category || 'بدون صنف'}</p>
                  {selectedItem.description && (
                    <p className="text-sm text-muted-foreground mt-2">{selectedItem.description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <>
                    <button onClick={(e) => openEdit(selectedItem, e)} className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-muted text-foreground hover:bg-muted/80 transition">
                      <Edit2 className="w-3.5 h-3.5" /> تعديل
                    </button>
                    <button onClick={(e) => openDelete(selectedItem, e)} className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition">
                      <Trash2 className="w-3.5 h-3.5" /> حذف
                    </button>
                  </>
                )}
                <button onClick={goBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition whitespace-nowrap">
                  <ChevronLeft className="w-4 h-4" /> رجوع
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-5">
              {([
                ['الكمية الحالية',        selectedItem.quantity,           selectedItem.quantity <= (selectedItem.lowStockThreshold ?? 5) ? 'text-red-600' : 'text-green-700'],
                ['الحد الأدنى',          selectedItem.lowStockThreshold ?? 5, 'text-orange-600'],
                ['إجمالي المدخل',        historyLoading ? '…' : totalReceived, 'text-green-600'],
                ['عدد عمليات الدخل',     historyLoading ? '…' : (history.receptions as any[]).length, 'text-teal-600'],
                ['إجمالي الموزع',        historyLoading ? '…' : totalDistributed, 'text-primary'],
                ['عدد عمليات الخرج',     historyLoading ? '…' : (history.distributions as any[]).length, 'text-purple-600'],
              ] as [string, any, string][]).map(([lbl, val, cls]) => (
                <div key={lbl} className="rounded-xl border border-border bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground mb-1">{lbl}</p>
                  <p className={`text-2xl font-bold ${cls}`}>{val}</p>
                </div>
              ))}
            </div>
            {selectedItem.quantity <= (selectedItem.lowStockThreshold ?? 5) && (
              <div className="mt-4 flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                الكمية أقل من أو تساوي الحد الأدنى للتخزين
              </div>
            )}
          </div>

          {/* ── Transaction History ── */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-foreground flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                سجل المعاملات
              </h3>
              <div className="flex gap-1 rounded-lg border border-border bg-muted/40 p-0.5">
                <button
                  onClick={() => setHistoryTab('receptions')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition ${historyTab === 'receptions' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <TrendingUp className="w-3.5 h-3.5 text-green-600" />
                  الدخل ({historyLoading ? '…' : `${filteredReceptions.length}/${(history.receptions as any[]).length}`})
                </button>
                <button
                  onClick={() => setHistoryTab('distributions')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition ${historyTab === 'distributions' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <TrendingDown className="w-3.5 h-3.5 text-primary" />
                  الخرج ({historyLoading ? '…' : `${filteredDistributions.length}/${(history.distributions as any[]).length}`})
                </button>
              </div>
            </div>

            {/* ── Filter bar ── */}
            {!historyLoading && (
              <div className="mb-4 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute right-2.5 top-2 w-3.5 h-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      value={historySearch}
                      onChange={e => setHistorySearch(e.target.value)}
                      placeholder="بحث… (اسم، مرجع، جهة، منفذ)" 
                      className="w-full border border-input bg-background pr-8 pl-3 py-1.5 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    {historySearch && (
                      <button onClick={() => setHistorySearch('')} className="absolute left-2 top-1.5 text-muted-foreground hover:text-foreground">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => setShowFilters(v => !v)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition ${
                      showFilters || filterDateFrom || filterDateTo
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-background text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    فلاتر
                    {(filterDateFrom || filterDateTo) && (
                      <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
                    )}
                  </button>
                  {(historySearch || filterDateFrom || filterDateTo) && (
                    <button
                      onClick={() => { setHistorySearch(''); setFilterDateFrom(''); setFilterDateTo('') }}
                      className="text-xs text-destructive hover:underline"
                    >
                      مسح الكل
                    </button>
                  )}
                </div>
                {showFilters && (
                  <div className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-muted/30 p-3">
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">من تاريخ</label>
                      <input
                        type="date"
                        value={filterDateFrom}
                        onChange={e => setFilterDateFrom(e.target.value)}
                        className="w-full border border-input bg-background px-2 py-1 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">إلى تاريخ</label>
                      <input
                        type="date"
                        value={filterDateTo}
                        onChange={e => setFilterDateTo(e.target.value)}
                        className="w-full border border-input bg-background px-2 py-1 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {historyLoading && (
              <div className="text-center py-10 text-muted-foreground text-sm">جاري التحميل…</div>
            )}

            {/* Reception table */}
            {!historyLoading && historyTab === 'receptions' && (
              <>
                {filteredReceptions.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <TrendingUp className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">{(history.receptions as any[]).length === 0 ? 'لا توجد عمليات دخل لهذا التجهيز' : 'لا توجد نتائج تطابق الفلاتر المحددة'}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-right min-w-[700px]">
                      <thead>
                        <tr className="border-b border-border text-xs text-muted-foreground">
                          <th className="pb-2 pr-2">الكمية</th>
                          <th className="pb-2">الرقم الإداري</th>
                          <th className="pb-2">نوع المرجع</th>
                          <th className="pb-2">رقم المرجع</th>
                          <th className="pb-2">تاريخ المرجع</th>
                          <th className="pb-2">الجهة المسلمة</th>
                          <th className="pb-2">المنفذ</th>
                          <th className="pb-2">تاريخ العملية</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredReceptions.map((r: any) => (
                          <tr key={r.id} className="border-b border-border hover:bg-muted/50 transition">
                            <td className="py-2 pr-2">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-green-500/10 text-green-700 font-semibold text-xs">
                                <Hash className="w-3 h-3" />+{r.quantity}
                              </span>
                            </td>
                            <td className="py-2 text-xs text-muted-foreground">{r.adminNumber || '—'}</td>
                            <td className="py-2 text-xs">{r.reception?.referenceType || '—'}</td>
                            <td className="py-2 text-xs font-mono">{r.reception?.referenceNumber || '—'}</td>
                            <td className="py-2 text-xs text-muted-foreground">
                              {r.reception?.referenceDate ? new Date(r.reception.referenceDate).toLocaleDateString('ar-DZ') : '—'}
                            </td>
                            <td className="py-2 text-xs">{r.reception?.supplier?.name || '—'}</td>
                            <td className="py-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {r.reception?.user?.name || r.reception?.user?.email || '—'}
                              </span>
                            </td>
                            <td className="py-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {r.reception?.createdAt ? new Date(r.reception.createdAt).toLocaleDateString('ar-DZ') : '—'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {/* Distribution table */}
            {!historyLoading && historyTab === 'distributions' && (
              <>
                {filteredDistributions.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <TrendingDown className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">{(history.distributions as any[]).length === 0 ? 'لا توجد عمليات خرج لهذا التجهيز' : 'لا توجد نتائج تطابق الفلاتر المحددة'}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-right min-w-[1000px]">
                      <thead>
                        <tr className="border-b border-border text-xs text-muted-foreground">
                          <th className="pb-2 pr-2">الكمية</th>
                          <th className="pb-2">نوع المرجع</th>
                          <th className="pb-2">رقم المرجع</th>
                          <th className="pb-2">تاريخ المرجع</th>
                          <th className="pb-2">الوحدة المنتفعة</th>
                          <th className="pb-2">القائم بالتسلم</th>
                          <th className="pb-2">القائم بالتسليم</th>
                          <th className="pb-2">وصل التسليم</th>
                          <th className="pb-2">تاريخ العملية</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredDistributions.map((d: any) => (
                          <tr key={d.id} className="border-b border-border hover:bg-muted/50 transition">
                            <td className="py-2 pr-2">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-primary/10 text-primary font-semibold text-xs">
                                <Hash className="w-3 h-3" />{d.quantity}
                              </span>
                            </td>
                            <td className="py-2 text-xs">{d.distribution?.referenceType || '—'}</td>
                            <td className="py-2 text-xs font-mono">{d.distribution?.referenceNumber || '—'}</td>
                            <td className="py-2 text-xs text-muted-foreground">
                              {d.distribution?.referenceDate ? new Date(d.distribution.referenceDate).toLocaleDateString('ar-DZ') : '—'}
                            </td>
                            <td className="py-2 text-xs">{d.distribution?.beneficiary?.name || '—'}</td>
                            <td className="py-2 text-xs">
                              {d.distribution?.assignedTo
                                ? `${d.distribution.assignedTo.rank ?? ''} ${d.distribution.assignedTo.name} ${d.distribution.assignedTo.surname}`.trim()
                                : '—'}
                            </td>
                            <td className="py-2 text-xs">{d.distribution?.deliveredByName || '—'}</td>
                            <td className="py-2 text-xs">
                              {d.distribution?.receipt ? (
                                <button
                                  disabled={downloadingReceiptId === d.distribution.receipt.id}
                                  onClick={() => handleDownloadReceipt(d.distribution.receipt.id, d.distribution.receipt.serialNumber)}
                                  className="flex items-center gap-1.5 px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 transition font-mono text-xs cursor-pointer disabled:opacity-50"
                                >
                                  <Download className="w-3 h-3" />
                                  {downloadingReceiptId === d.distribution.receipt.id ? 'جاري التحميل...' : d.distribution.receipt.serialNumber}
                                </button>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="py-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {d.distribution?.createdAt ? new Date(d.distribution.createdAt).toLocaleDateString('ar-DZ') : '—'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
      {/* ══════════ HIDDEN RECEIPT PRINT AREA ══════════ */}
      {downloadReceiptData && (
        <div style={{ position: 'fixed', left: '-9999px', top: 0, zIndex: -1 }}>
          <div id="item-receipt-print-area">
            <ReceiptPrintTemplate receipt={downloadReceiptData} />
          </div>
        </div>
      )}

      {/* ══════════ EDIT MODAL ══════════ */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setEditTarget(null)}>
          <div className="bg-card rounded-xl border border-border shadow-lg w-full max-w-lg p-6" dir="rtl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-primary" /> تعديل التجهيز
              </h3>
              <button onClick={() => setEditTarget(null)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">اسم التجهيز *</label>
                  <input className="w-full border border-input bg-background rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">الرمز (SKU)</label>
                  <input className="w-full border border-input bg-background rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={editForm.sku} onChange={e => setEditForm(f => ({ ...f, sku: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">الصنف</label>
                  <input className="w-full border border-input bg-background rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={editForm.category} onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">الكمية</label>
                  <input type="number" min="0" className="w-full border border-input bg-background rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={editForm.quantity} onChange={e => setEditForm(f => ({ ...f, quantity: Number(e.target.value) }))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">حد المخزون المنخفض</label>
                  <input type="number" min="0" className="w-full border border-input bg-background rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={editForm.lowStockThreshold} onChange={e => setEditForm(f => ({ ...f, lowStockThreshold: Number(e.target.value) }))} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">الوصف</label>
                  <textarea rows={2} className="w-full border border-input bg-background rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button onClick={() => setEditTarget(null)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition">إلغاء</button>
              <button
                disabled={updateMutation.isLoading || !editForm.name.trim()}
                onClick={() => updateMutation.mutate({ id: editTarget.id, data: editForm })}
                className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground text-sm rounded-lg hover:bg-primary/90 disabled:opacity-50 transition"
              >
                <Save className="w-4 h-4" />
                {updateMutation.isLoading ? 'جاري الحفظ…' : 'حفظ التعديلات'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ DELETE CONFIRM MODAL ══════════ */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDeleteTarget(null)}>
          <div className="bg-card rounded-xl border border-border shadow-lg w-full max-w-sm p-6" dir="rtl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-destructive/10">
                <Trash2 className="w-6 h-6 text-destructive" />
              </div>
              <h3 className="text-lg font-bold text-foreground">تأكيد الحذف</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-1">هل أنت متأكد من حذف التجهيز التالي؟</p>
            <p className="font-bold text-foreground mb-5">{deleteTarget.name}</p>
            {deleteMutation.isError && (
              <p className="text-xs text-destructive mb-3 bg-destructive/10 p-2 rounded border border-destructive/20">
                {(deleteMutation.error as any)?.response?.data?.error || 'حدث خطأ أثناء الحذف'}
              </p>
            )}
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition">إلغاء</button>
              <button
                disabled={deleteMutation.isLoading}
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
                className="flex items-center gap-2 px-5 py-2 bg-destructive text-destructive-foreground text-sm rounded-lg hover:bg-destructive/90 disabled:opacity-50 transition"
              >
                <Trash2 className="w-4 h-4" />
                {deleteMutation.isLoading ? 'جاري الحذف…' : 'حذف'}
              </button>
            </div>
          </div>
        </div>
      )}
      </>
      )} {/* end activeTab === 'items' */}
    </div>
  )
}
