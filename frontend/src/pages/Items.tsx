import React, { useContext, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import client from '../api/client'
import { AuthContext } from '../context/AuthContext'
import {
  Package, AlertTriangle, ChevronLeft, BarChart2,
  Layers, Hash, Calendar, User, TrendingDown, ArrowRight,
  Edit2, Trash2, X, Save, Search,
} from 'lucide-react'

const fetchItems = async () => (await client.get('/items')).data.data
const fetchItemDists = async (itemId: number) =>
  (await client.get(`/distributions/item/${itemId}`)).data.data

type View = 'categories' | 'category-items' | 'item-report'

export default function Items() {
  const { user } = useContext(AuthContext)!
  const isAdmin = user?.role === 'ADMIN'
  const qc = useQueryClient()
  const navigate = useNavigate()

  const { data: items = [] } = useQuery(['items'], fetchItems)

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

  const { data: dists = [], isLoading: distsLoading } = useQuery(
    ['item-dists', selectedItem?.id],
    () => fetchItemDists(selectedItem.id),
    { enabled: view === 'item-report' && !!selectedItem }
  )

  const totalDistributed = useMemo(
    () => dists.reduce((s: number, d: any) => s + d.quantity, 0),
    [dists]
  )

  const openCategory = (cat: string) => { setSelectedCategory(cat); setView('category-items') }
  const openItemReport = (it: any)   => { setSelectedItem(it); setView('item-report') }
  const goBack = () => {
    if (view === 'item-report')      { setView('category-items'); setSelectedItem(null) }
    else if (view === 'category-items') { setView('categories'); setSelectedCategory('') }
  }

  return (
    <div dir="rtl" className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-gray-500">إدارة المستودع</p>
          <h1 className="text-3xl font-bold text-gray-800">التجهيزات</h1>
        </div>
      </div>

      {/* ── Search Bar ── */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
        <div className="relative">
          <Search className="absolute right-3 top-3 w-5 h-5 text-slate-400 pointer-events-none" />
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
            className="w-full pl-4 pr-10 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm('')
                setSelectedItem(null)
              }}
              className="absolute left-3 top-2.5 text-slate-400 hover:text-slate-600 transition"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* ── Breadcrumb ── */}
      <div className="flex items-center gap-2 text-sm text-slate-500 flex-wrap">
        <button onClick={() => { setView('categories'); setSelectedCategory(''); setSelectedItem(null) }} className="hover:text-blue-600 flex items-center gap-1">
          <Package className="w-4 h-4" /> التجهيزات
        </button>
        {view !== 'categories' && (
          <>
            <ChevronLeft className="w-4 h-4" />
            <button onClick={() => { setView('category-items'); setSelectedItem(null) }} className={`hover:text-blue-600 ${view === 'category-items' ? 'font-semibold text-slate-700' : ''}`}>
              {selectedCategory}
            </button>
          </>
        )}
        {view === 'item-report' && (
          <>
            <ChevronLeft className="w-4 h-4" />
            <span className="font-semibold text-slate-700">{selectedItem?.name}</span>
          </>
        )}
      </div>

      {/* ══════════ VIEW: categories ══════════ */}
      {view === 'categories' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
          {searchTerm ? (
            // ── Search results view ──
            <>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Search className="w-5 h-5 text-blue-500" /> نتائج البحث
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">{filteredItems.length} تجهيز من أصل {items.length}</p>
                </div>
              </div>
              {filteredItems.length === 0 ? (
                <div className="text-center py-10">
                  <Package className="w-12 h-12 mx-auto mb-3 opacity-30 text-slate-400" />
                  <p className="text-sm text-slate-500">لا توجد تجهيزات تطابق البحث</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredItems.map((it: any) => {
                    const low = it.quantity <= (it.lowStockThreshold ?? 5)
                    return (
                      <div key={it.id} className="group relative text-right bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-xl transition-all shadow-sm hover:shadow">
                        <button onClick={() => { setSelectedItem(it); setView('item-report') }} className="w-full text-right p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className={`p-2 rounded-lg transition ${low ? 'bg-red-100 group-hover:bg-red-200' : 'bg-green-100 group-hover:bg-green-200'}`}>
                              <Package className={`w-5 h-5 ${low ? 'text-red-600' : 'text-green-600'}`} />
                            </div>
                            <div className="flex items-center gap-1 text-slate-300 group-hover:text-blue-500 transition text-xs">
                              <BarChart2 className="w-4 h-4" /> تقرير
                            </div>
                          </div>
                          <p className="text-sm font-bold text-slate-800 mb-1 leading-snug">{it.name}</p>
                          <p className="text-xs text-slate-400 font-mono mb-1">{it.sku}</p>
                          <p className="text-xs text-slate-500 mb-3 line-clamp-2">{it.category || 'بدون صنف'}</p>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500">الكمية</span>
                            <span className={`font-bold text-lg ${low ? 'text-red-600' : 'text-green-700'}`}>
                              {it.quantity}
                              {low && <AlertTriangle className="w-3 h-3 inline mr-1" />}
                            </span>
                          </div>
                        </button>
                        <div className={`flex border-t border-slate-200`}>
                          <button
                            onClick={(e) => { e.stopPropagation(); navigate('/distributions', { state: { preselectedItem: it } }) }}
                            className="flex-1 flex items-center justify-center gap-1 py-2 text-xs text-orange-500 hover:text-orange-700 hover:bg-orange-50 transition rounded-b-xl"
                          >
                            <TrendingDown className="w-3 h-3" /> خرج
                          </button>
                          {isAdmin && (
                            <>
                              <div className="w-px bg-slate-200" />
                              <button onClick={(e) => openEdit(it, e)} className="flex-1 flex items-center justify-center gap-1 py-2 text-xs text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition">
                                <Edit2 className="w-3 h-3" /> تعديل
                              </button>
                              <div className="w-px bg-slate-200" />
                              <button onClick={(e) => openDelete(it, e)} className="flex-1 flex items-center justify-center gap-1 py-2 text-xs text-slate-500 hover:text-red-600 hover:bg-red-50 transition rounded-bl-xl">
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
                  <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Layers className="w-5 h-5 text-blue-500" /> التجهيزات حسب الصنف
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">{items.length} تجهيز — {categoryList.length} صنف</p>
                </div>
              </div>
              {categoryList.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-10">لا توجد أصناف لعرضها</p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoryList.map(cat => {
                  const s = categoryStats[cat]
                  return (
                    <button
                      key={cat}
                      onClick={() => openCategory(cat)}
                      className="group text-right bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-xl p-4 transition-all shadow-sm hover:shadow"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="p-2 rounded-lg bg-blue-100 group-hover:bg-blue-200 transition">
                          <Layers className="w-5 h-5 text-blue-600" />
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-400 transition mt-1" />
                      </div>
                      <p className="text-base font-bold text-slate-800 mb-2">{cat}</p>
                      <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                        <span><span className="font-semibold text-slate-700">{s.count}</span> تجهيز</span>
                        <span><span className="font-semibold text-slate-700">{s.qty}</span> وحدة</span>
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
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-500" /> {selectedCategory}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">{categoryItems.length} تجهيز</p>
            </div>
            <button onClick={goBack} className="flex items-center gap-1 text-sm text-slate-500 hover:text-blue-600 transition">
              <ChevronLeft className="w-4 h-4" /> رجوع
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoryItems.map((it: any) => {
              const low = it.quantity <= (it.lowStockThreshold ?? 5)
              return (
                <div key={it.id} className="group relative text-right bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-xl transition-all shadow-sm hover:shadow">
                  <button onClick={() => openItemReport(it)} className="w-full text-right p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`p-2 rounded-lg transition ${low ? 'bg-red-100 group-hover:bg-red-200' : 'bg-green-100 group-hover:bg-green-200'}`}>
                        <Package className={`w-5 h-5 ${low ? 'text-red-600' : 'text-green-600'}`} />
                      </div>
                      <div className="flex items-center gap-1 text-slate-300 group-hover:text-blue-500 transition text-xs">
                        <BarChart2 className="w-4 h-4" /> تقرير
                      </div>
                    </div>
                    <p className="text-sm font-bold text-slate-800 mb-1 leading-snug">{it.name}</p>
                    <p className="text-xs text-slate-400 font-mono mb-3">{it.sku}</p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">الكمية</span>
                      <span className={`font-bold text-lg ${low ? 'text-red-600' : 'text-green-700'}`}>
                        {it.quantity}
                        {low && <AlertTriangle className="w-3 h-3 inline mr-1" />}
                      </span>
                    </div>
                  </button>
                  <div className="flex border-t border-slate-200">
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate('/distributions', { state: { preselectedItem: it } }) }}
                      className="flex-1 flex items-center justify-center gap-1 py-2 text-xs text-orange-500 hover:text-orange-700 hover:bg-orange-50 transition rounded-b-xl"
                    >
                      <TrendingDown className="w-3 h-3" /> خرج
                    </button>
                    {isAdmin && (
                      <>
                        <div className="w-px bg-slate-200" />
                        <button onClick={(e) => openEdit(it, e)} className="flex-1 flex items-center justify-center gap-1 py-2 text-xs text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition">
                          <Edit2 className="w-3 h-3" /> تعديل
                        </button>
                        <div className="w-px bg-slate-200" />
                        <button onClick={(e) => openDelete(it, e)} className="flex-1 flex items-center justify-center gap-1 py-2 text-xs text-slate-500 hover:text-red-600 hover:bg-red-50 transition rounded-bl-xl">
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
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-blue-50 shrink-0">
                  <Package className="w-7 h-7 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">{selectedItem.name}</h2>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">{selectedItem.sku}</p>
                  <p className="text-xs text-slate-500 mt-1">{selectedItem.category || 'بدون صنف'}</p>
                  {selectedItem.description && (
                    <p className="text-sm text-slate-500 mt-2">{selectedItem.description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <>
                    <button onClick={(e) => openEdit(selectedItem, e)} className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition">
                      <Edit2 className="w-3.5 h-3.5" /> تعديل
                    </button>
                    <button onClick={(e) => openDelete(selectedItem, e)} className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition">
                      <Trash2 className="w-3.5 h-3.5" /> حذف
                    </button>
                  </>
                )}
                <button onClick={goBack} className="flex items-center gap-1 text-sm text-slate-500 hover:text-blue-600 transition whitespace-nowrap">
                  <ChevronLeft className="w-4 h-4" /> رجوع
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
              {([
                ['الكمية الحالية',        selectedItem.quantity,           selectedItem.quantity <= (selectedItem.lowStockThreshold ?? 5) ? 'text-red-600' : 'text-green-700'],
                ['الحد الأدنى',          selectedItem.lowStockThreshold ?? 5, 'text-orange-600'],
                ['إجمالي الموزع',        distsLoading ? '…' : totalDistributed, 'text-blue-600'],
                ['عدد عمليات التوزيع',   distsLoading ? '…' : dists.length, 'text-purple-600'],
              ] as [string, any, string][]).map(([lbl, val, cls]) => (
                <div key={lbl} className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-400 mb-1">{lbl}</p>
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

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-blue-500" />
              سجل التوزيع ({distsLoading ? '…' : dists.length})
            </h3>

            {distsLoading && (
              <div className="text-center py-10 text-slate-400 text-sm">جاري التحميل…</div>
            )}

            {!distsLoading && dists.length === 0 && (
              <div className="text-center py-10 text-slate-400">
                <TrendingDown className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">لا توجد عمليات توزيع لهذا التجهيز</p>
              </div>
            )}

            {!distsLoading && dists.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-right">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs text-slate-400">
                      <th className="pb-2 pr-2">رمز العملية</th>
                      <th className="pb-2">الكمية</th>
                      <th className="pb-2">المستفيد</th>
                      <th className="pb-2">موزع بواسطة</th>
                      <th className="pb-2">التاريخ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dists.map((d: any) => (
                      <tr key={d.id} className="border-b border-slate-50 hover:bg-slate-50 transition">
                        <td className="py-2 pr-2 font-mono text-xs text-slate-400">{d.distribution?.reference ?? '—'}</td>
                        <td className="py-2">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold text-xs">
                            <Hash className="w-3 h-3" />{d.quantity}
                          </span>
                        </td>
                        <td className="py-2 text-slate-600 text-xs">
                          {d.distribution?.beneficiary
                            ? d.distribution.beneficiary.name
                            : d.distribution?.assignedTo
                              ? `${d.distribution.assignedTo.rank ?? ''} ${d.distribution.assignedTo.name} ${d.distribution.assignedTo.surname}`.trim()
                              : '—'}
                        </td>
                        <td className="py-2 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {d.distribution?.user?.name ?? d.distribution?.user?.email ?? '—'}
                          </span>
                        </td>
                        <td className="py-2 text-xs text-slate-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {d.distribution?.createdAt ? new Date(d.distribution.createdAt).toLocaleDateString('ar-DZ') : '—'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-200">
                      <td className="pt-2 text-xs font-semibold text-slate-500 pr-2">الإجمالي</td>
                      <td className="pt-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-xs">
                          <Hash className="w-3 h-3" />{totalDistributed}
                        </span>
                      </td>
                      <td colSpan={3} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
      {/* ══════════ EDIT MODAL ══════════ */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setEditTarget(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6" dir="rtl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-blue-500" /> تعديل التجهيز
              </h3>
              <button onClick={() => setEditTarget(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">اسم التجهيز *</label>
                  <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">الرمز (SKU)</label>
                  <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" value={editForm.sku} onChange={e => setEditForm(f => ({ ...f, sku: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">الصنف</label>
                  <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" value={editForm.category} onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">الكمية</label>
                  <input type="number" min="0" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" value={editForm.quantity} onChange={e => setEditForm(f => ({ ...f, quantity: Number(e.target.value) }))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">حد المخزون المنخفض</label>
                  <input type="number" min="0" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" value={editForm.lowStockThreshold} onChange={e => setEditForm(f => ({ ...f, lowStockThreshold: Number(e.target.value) }))} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">الوصف</label>
                  <textarea rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none" value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button onClick={() => setEditTarget(null)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition">إلغاء</button>
              <button
                disabled={updateMutation.isLoading || !editForm.name.trim()}
                onClick={() => updateMutation.mutate({ id: editTarget.id, data: editForm })}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" dir="rtl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-red-100">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">تأكيد الحذف</h3>
            </div>
            <p className="text-sm text-slate-600 mb-1">هل أنت متأكد من حذف التجهيز التالي؟</p>
            <p className="font-bold text-slate-800 mb-5">{deleteTarget.name}</p>
            {deleteMutation.isError && (
              <p className="text-xs text-red-600 mb-3 bg-red-50 p-2 rounded border border-red-200">
                {(deleteMutation.error as any)?.response?.data?.error || 'حدث خطأ أثناء الحذف'}
              </p>
            )}
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition">إلغاء</button>
              <button
                disabled={deleteMutation.isLoading}
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
                className="flex items-center gap-2 px-5 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50 transition"
              >
                <Trash2 className="w-4 h-4" />
                {deleteMutation.isLoading ? 'جاري الحذف…' : 'حذف'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
