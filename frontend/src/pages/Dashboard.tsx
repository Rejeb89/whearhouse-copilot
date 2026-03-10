import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import client from '../services/client'
import { AuthContext } from '../context/AuthContext'
import DistributeItemModal from '../components/modals/DistributeItemModal'
import LowStockChordChart from '../components/charts/LowStockChordChart'
import { Truck, AlertCircle, Package, TrendingDown, TrendingUp, BarChart3, LogOut, CalendarDays, Wallet, DollarSign, PiggyBank, ArrowRightLeft, HardHat } from 'lucide-react'
import GlobalSearch from '../components/common/GlobalSearch'

const fetchItems = async () => (await client.get('/items')).data.data
const fetchDistributions = async () => (await client.get('/distributions/recent')).data.data
const fetchBudgets = async () => (await client.get('/budgets')).data.data
const fetchProjects = async () => (await client.get('/projects')).data.data

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
  const { data: budgets = [] } = useQuery(['budgets'], fetchBudgets, { refetchInterval: 30000 })
  const { data: projects = [] } = useQuery(['projects'], fetchProjects, { refetchInterval: 60000 })
  const [lowAlerts, setLowAlerts] = useState<any[]>([])
  const [showDistributeModal, setShowDistributeModal] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
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

      {/* ── Global Search ── */}
      <GlobalSearch placeholder="بحث شامل في قاعدة البيانات... (تجهيزات، عمليات، جهات، موظفين)" />

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

        {/* Projects Card */}
        {(() => {
          const ps = projects as any[]
          const inWork  = ps.filter((p: any) => p.status === 'WORK').length
          const done    = ps.filter((p: any) => p.status === 'COMPLETED').length
          const avgProg = ps.length > 0 ? Math.round(ps.reduce((s: number, p: any) => s + (p.progress || 0), 0) / ps.length) : 0
          return (
            <button
              onClick={() => navigate('/projects')}
              className="rounded-xl border border-border bg-card text-card-foreground shadow-sm hover:shadow-md hover:border-primary/50 transition-all cursor-pointer text-right"
            >
              <div className="flex flex-row items-center justify-between p-6 pb-2">
                <p className="text-sm font-medium text-muted-foreground">المشاريع الجارية</p>
                <HardHat className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="p-6 pt-0">
                <p className="text-3xl font-bold text-foreground">{ps.length}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {ps.length === 0 ? 'لا توجد مشاريع' : `${inWork} أشغال · ${done} مكتملة · إنجاز ${avgProg}%`}
                </p>
              </div>
            </button>
          )
        })()}

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

      {/* ── Budget Statistics ── */}
      {(() => {
        const activeBudgets = (budgets as any[]).filter((b: any) => b.status === 'active')
        const totalBudget = activeBudgets.reduce((s: number, b: any) => s + b.amount, 0)
        const totalSpent = activeBudgets.reduce((s: number, b: any) => s + (b.spent ?? 0), 0)
        const totalRemaining = totalBudget - totalSpent
        const consumedPct = totalBudget > 0 ? Math.min(Math.round((totalSpent / totalBudget) * 100), 100) : 0
        const fmt = (n: number) => n.toLocaleString('ar-DZ', { minimumFractionDigits: 0 })
        return (
          <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/budgets')}>
            <div className="flex items-center justify-between p-6 pb-4 border-b border-border">
              <div>
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Wallet className="w-4 h-4" />
                  الاعتمادات المالية
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">ملخص الاعتمادات النشطة</p>
              </div>
              <span className="text-xs text-muted-foreground">عرض الكل ←</span>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3 shadow-sm">
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-muted-foreground font-medium">إجمالي الاعتمادات</p>
                    <p className="text-sm font-bold text-foreground truncate">{fmt(totalBudget)} د.ت</p>
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3 shadow-sm">
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <TrendingDown className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-muted-foreground font-medium">إجمالي المصاريف</p>
                    <p className="text-sm font-bold text-foreground truncate">{fmt(totalSpent)} د.ت</p>
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3 shadow-sm">
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <PiggyBank className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-muted-foreground font-medium">المتبقّي</p>
                    <p className="text-sm font-bold text-foreground truncate">{fmt(totalRemaining)} د.ت</p>
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3 shadow-sm">
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <ArrowRightLeft className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-muted-foreground font-medium">المستهلك</p>
                    <p className="text-sm font-bold text-foreground">{consumedPct}%</p>
                  </div>
                </div>
              </div>
              {/* progress bars per active budget */}
              {activeBudgets.length === 0 ? (
                <p className="text-sm text-muted-foreground">لا توجد اعتمادات نشطة</p>
              ) : (
                <ul className="space-y-3">
                  {activeBudgets.map((b: any) => {
                    const sp = b.spent ?? 0
                    const p = b.amount > 0 ? Math.min(Math.round((sp / b.amount) * 100), 100) : 0
                    const danger = p >= 90
                    const warn = p >= 70
                    const barColor = danger ? 'bg-red-500' : warn ? 'bg-amber-500' : 'bg-blue-500'
                    return (
                      <li key={b.id} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-foreground truncate max-w-[60%]">{b.name}</p>
                          <span className="text-xs text-muted-foreground">{fmt(sp)} / {fmt(b.amount)} د.ت</span>
                        </div>
                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${p}%` }} />
                        </div>
                        <p className="text-[11px] text-muted-foreground text-left">{p}%</p>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>
        )
      })()}

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

