import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import client from '../api/client'
import { AuthContext } from '../context/AuthContext'
import DistributeItemModal from '../components/DistributeItemModal'
import { Truck, AlertCircle, User, Package, TrendingDown, TrendingUp, BarChart3, LogOut, X, Search, CalendarDays } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import LowStockChordChart from '../components/LowStockChordChart'

const fetchItems = async () => (await client.get('/items')).data.data
const fetchDistributions = async () => (await client.get('/distributions/recent')).data.data

type CalendarEvent = {
  id: string
  title: string
  date: string
  time: string
  description: string
  reminderMinutes: number
  linkedItemId?: string
  linkedTransport?: string
  createdAt: string
}

const getEventDateTime = (event: CalendarEvent) => new Date(`${event.date}T${event.time}`)

export default function Dashboard() {
  const navigate = useNavigate()
  const { data: items = [], refetch: refetchItems } = useQuery(['items'], fetchItems, { refetchInterval: 5000 })
  const { data: distributions = [], refetch: refetchDistributions } = useQuery(['distributions'], fetchDistributions, { refetchInterval: 5000 })
  const [lowAlerts, setLowAlerts] = useState<any[]>([])
  const [showDistributeModal, setShowDistributeModal] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  const { user, logout } = useContext(AuthContext)
  const [now, setNow] = useState(new Date());
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([])

  useEffect(() => {
    const alerts = (items || []).filter((it: any) => (it.category || '').trim() !== 'اثاث قار' && (it.lowStockThreshold ?? 5) >= it.quantity)
    setLowAlerts(alerts)
  }, [items])

  const eventsStorageKey = user ? `calendar-events-${user.id}` : 'calendar-events-guest'

  const loadCalendarEvents = useCallback(() => {
    if (typeof window === 'undefined') {
      setCalendarEvents([])
      return
    }

    const payload = localStorage.getItem(eventsStorageKey)
    if (!payload) {
      setCalendarEvents([])
      return
    }

    try {
      const parsed = JSON.parse(payload)
      setCalendarEvents(parsed)
    } catch (err) {
      console.error('failed parsing calendar events', err)
      setCalendarEvents([])
    }
  }, [eventsStorageKey])

  useEffect(() => {
    loadCalendarEvents()

    if (typeof window === 'undefined') {
      return
    }

    const handleStorageChange = (event: StorageEvent | Event) => {
      if ('key' in event && event.key && event.key !== eventsStorageKey) return
      loadCalendarEvents()
    }

    window.addEventListener('calendar-events-updated', handleStorageChange)
    window.addEventListener('storage', handleStorageChange)

    return () => {
      window.removeEventListener('calendar-events-updated', handleStorageChange)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [eventsStorageKey, loadCalendarEvents])

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setSearchResults([])
      setShowSearchResults(false)
      return
    }

    const query = searchQuery.toLowerCase()
    const results: any[] = []

    // Search in items
    items.forEach((item: any) => {
      if (item.name?.toLowerCase().includes(query) || item.code?.toLowerCase().includes(query)) {
        results.push({ type: 'item', data: item })
      }
    })

    // Search in distributions
    distributions.forEach((dist: any) => {
      if (dist.itemName?.toLowerCase().includes(query) || dist.itemCode?.toLowerCase().includes(query)) {
        results.push({ type: 'distribution', data: dist })
      }
    })

    setSearchResults(results)
    setShowSearchResults(true)
  }, [searchQuery, items, distributions])

  const handleDistributeSuccess = () => {
    refetchItems()
    refetchDistributions()
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const upcomingEvents = useMemo(() => {
    const nowDate = new Date()
    const currentMonth = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1)
    const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    
    return calendarEvents
      .filter((event) => {
        const eventDate = getEventDateTime(event)
        return eventDate >= currentMonth && eventDate < nextMonth
      })
      .sort((a, b) => getEventDateTime(a).getTime() - getEventDateTime(b).getTime())
  }, [calendarEvents])

  return (
    <div dir="rtl" className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">لوحة التحكم</h1>
          <p className="text-sm text-muted-foreground mt-0.5">مرحباً، {user?.name || user?.email}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/receptions')}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
          >
            <TrendingUp className="w-4 h-4" />
            دخل
          </button>
          <button
            onClick={() => navigate('/distributions')}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <TrendingDown className="w-4 h-4" />
            خرج
          </button>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Total Items */}
        <button
          onClick={() => navigate('/items')}
          className="rounded-xl border border-border bg-card text-card-foreground shadow-sm hover:shadow-md hover:border-primary/50 transition-all cursor-pointer"
        >
          <div className="flex flex-row items-center justify-between p-6 pb-2">
            <p className="text-sm font-medium text-muted-foreground">إجمالي الأصناف</p>
            <Package className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="p-6 pt-0">
            <p className="text-3xl font-bold text-foreground">{items.length}</p>
            <p className="text-xs text-muted-foreground mt-1">صنف مسجّل في المستودع</p>
          </div>
        </button>

        {/* Low Stock */}
        <button
          onClick={() => navigate('/items', { state: { activeTab: 'lowStock' } })}
          className="rounded-xl border border-border bg-card text-card-foreground shadow-sm hover:shadow-md hover:border-destructive/50 transition-all cursor-pointer"
        >
          <div className="flex flex-row items-center justify-between p-6 pb-2">
            <p className="text-sm font-medium text-muted-foreground">الأصناف المنخفضة</p>
            <AlertCircle className="w-4 h-4 text-destructive" />
          </div>
          <div className="p-6 pt-0">
            <p className={`text-3xl font-bold ${lowAlerts.length > 0 ? 'text-destructive' : 'text-foreground'}`}>{lowAlerts.length}</p>
            <p className="text-xs text-muted-foreground mt-1">{lowAlerts.length > 0 ? 'تحتاج إلى تموين' : 'جميع الأصناف بمستوى آمن'}</p>
          </div>
        </button>

        {/* Upcoming Events */}
        <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm">
          <div className="flex flex-row items-center justify-between p-6 pb-2">
            <p className="text-sm font-medium text-muted-foreground">الأحداث القادمة</p>
            <CalendarDays className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="p-6 pt-0">
            <p className="text-base font-bold text-foreground truncate">{upcomingEvents[0]?.title || '—'}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {upcomingEvents[0] ? `${upcomingEvents[0].date} · ${upcomingEvents[0].time}` : 'لا أحداث مُجدولة في هذا الشهر'}
            </p>
          </div>
        </div>

        {/* Current User */}
        <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm">
          <div className="flex flex-row items-center justify-between p-6 pb-2">
            <p className="text-sm font-medium text-muted-foreground">المستخدم الحالي</p>
            <User className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="p-6 pt-0">
            <p className="text-base font-bold text-foreground truncate">{user?.name || '—'}</p>
            <p className="text-xs text-muted-foreground mt-1 truncate">{user?.email}</p>
          </div>
        </div>

      </div>

      {/* ── Charts + Table ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Low Stock Chart */}
        <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm">
          <div className="flex items-center justify-between p-6 pb-2 border-b border-border">
            <div>
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                الأصناف المنخفضة
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">الأصناف التي تجاوزت حد التنبيه</p>
            </div>
          </div>
          <div className="p-6">
            {lowAlerts.length > 0 ? (
              <LowStockChordChart items={lowAlerts} width={460} height={380} />
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <AlertCircle className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm">جميع الأصناف بمستويات آمنة</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Distributions */}
        <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm">
          <div className="flex items-center justify-between p-6 pb-2 border-b border-border">
            <div>
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <TrendingDown className="w-4 h-4" />
                عمليات التسليم الأخيرة
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">آخر عمليات خرج التجهيزات</p>
            </div>
          </div>
          <div className="p-0">
            {distributions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-right">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-4 py-3 text-xs font-medium text-muted-foreground">اسم التجهيز</th>
                      <th className="px-4 py-3 text-xs font-medium text-muted-foreground">الوحدة</th>
                      <th className="px-4 py-3 text-xs font-medium text-muted-foreground text-center">موزَّع</th>
                      <th className="px-4 py-3 text-xs font-medium text-muted-foreground text-center">متبقي</th>
                      <th className="px-4 py-3 text-xs font-medium text-muted-foreground">التاريخ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {distributions.flatMap((d: any) =>
                      d.items.map((di: any, idx: number) => (
                        <tr key={`${d.id}-${idx}`} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                          <td className="px-4 py-3 font-medium text-foreground">{di.item.name}</td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">{d.beneficiary?.name || '—'}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                              {di.quantity}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
                              di.item.quantity === 0
                                ? 'bg-destructive/10 text-destructive'
                                : di.item.quantity < (di.item.lowStockThreshold || 5)
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-secondary text-secondary-foreground'
                            }`}>
                              {di.item.quantity}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(d.createdAt).toLocaleString('ar-TN', { dateStyle: 'short', timeStyle: 'short' })}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Truck className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm">لا توجد عمليات تسليم حديثة</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ── Upcoming Events ── */}
      <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm">
        <div className="flex items-center justify-between p-6 pb-4 border-b border-border">
          <div>
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <CalendarDays className="w-4 h-4" />
              الأحداث القادمة
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">مزامنة من الرزنامة</p>
          </div>
          <button onClick={() => navigate('/calendar')} className="text-xs text-muted-foreground hover:text-foreground transition-colors">عرض الكل</button>
        </div>
        <div className="p-6">
          {upcomingEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد أحداث مرتبة</p>
          ) : (
            <ul className="space-y-3">
              {upcomingEvents.map((event) => (
                <li key={event.id} className="flex items-start justify-between gap-4 rounded-lg border border-border p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{event.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{event.description || 'بدون وصف'}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">{event.linkedItemId ? '🔗 مرتبط بتجهيز' : event.linkedTransport ? '🚐 مرتبط بوسيلة نقل' : ''}</p>
                  </div>
                  <div className="text-left shrink-0">
                    <p className="text-xs font-medium text-foreground">{event.date}</p>
                    <p className="text-xs text-muted-foreground">{event.time}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <DistributeItemModal
        isOpen={showDistributeModal}
        onClose={() => setShowDistributeModal(false)}
        onSuccess={handleDistributeSuccess}
      />

      {showUserMenu && (
        <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
      )}
    </div>
  )
}

