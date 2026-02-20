import React, { useContext, useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import client from '../api/client'
import { AuthContext } from '../context/AuthContext'
import DistributeItemModal from '../components/DistributeItemModal'
import { Truck, AlertCircle, User, Package, TrendingDown, TrendingUp, BarChart3, LogOut, X, Search, CalendarDays } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

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
    const alerts = (items || []).filter((it: any) => (it.lowStockThreshold ?? 5) >= it.quantity)
    setLowAlerts(alerts)
  }, [items])

  const loadCalendarEvents = () => {
    if (typeof localStorage === 'undefined') {
      setCalendarEvents([])
      return
    }

    const payload = localStorage.getItem('calendar-events')
    if (!payload) {
      setCalendarEvents([])
      return
    }

    try {
      const parsed = JSON.parse(payload)
      setCalendarEvents(parsed)
    } catch (err) {
      console.error('failed parsing calendar events', err)
    }
  }

  useEffect(() => {
    loadCalendarEvents()

    if (typeof window === 'undefined') {
      return
    }

    const handleStorageChange = () => loadCalendarEvents()
    window.addEventListener('calendar-events-updated', handleStorageChange)
    window.addEventListener('storage', handleStorageChange)

    return () => {
      window.removeEventListener('calendar-events-updated', handleStorageChange)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

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

  const chartData = lowAlerts.map((item: any) => ({
    name: item.name,
    quantity: item.quantity,
    threshold: item.lowStockThreshold || 5
  }))

  const upcomingEvents = useMemo(() => {
    const nowDate = new Date()
    return calendarEvents
      .filter((event) => getEventDateTime(event) >= nowDate)
      .sort((a, b) => getEventDateTime(a).getTime() - getEventDateTime(b).getTime())
      .slice(0, 5)
  }, [calendarEvents])

  return (
    <div dir="rtl" className="space-y-6">
      <div className="flex flex-col gap-1 mb-6">
        <p className="text-sm text-gray-500">مرحبا بك</p>
        <h1 className="text-3xl font-bold text-gray-800">لوحة التحكم</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg shadow-md border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-600 text-sm font-medium">إجمالي الأصناف</p>
              <p className="text-4xl font-bold text-blue-700 mt-2">{items.length}</p>
            </div>
            <div className="p-4 bg-blue-200 rounded-full">
              <Package className="w-8 h-8 text-blue-700" />
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-lg shadow-md border border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-600 text-sm font-medium">الأصناف المنخفضة</p>
              <p className="text-4xl font-bold text-red-700 mt-2">{lowAlerts.length}</p>
            </div>
            <div className="p-4 bg-red-200 rounded-full">
              <AlertCircle className="w-8 h-8 text-red-700" />
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg shadow-md border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-600 text-sm font-medium">المستخدم الحالي</p>
              <p className="text-lg font-bold text-green-700 mt-2 truncate">{user?.email}</p>
            </div>
            <div className="p-4 bg-green-200 rounded-full">
              <User className="w-8 h-8 text-green-700" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-6 rounded-lg shadow-md border border-indigo-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-indigo-600 text-sm font-medium">الأحداث القادمة</p>
              <p className="text-4xl font-bold text-indigo-700 mt-2">{upcomingEvents.length}</p>
              <p className="text-xs text-indigo-600 mt-1">
                {upcomingEvents[0]
                  ? `${upcomingEvents[0].date} · ${upcomingEvents[0].time}`
                  : 'لا يوجد أحداث مُجدولة'}
              </p>
            </div>
            <div className="p-4 bg-indigo-200 rounded-full">
              <CalendarDays className="w-8 h-8 text-indigo-700" />
            </div>
          </div>
          {upcomingEvents.length > 0 && (
            <ul className="mt-4 space-y-1 text-xs text-indigo-700">
              {upcomingEvents.slice(0, 2).map((event) => (
                <li key={event.id} className="truncate">
                  <span className="font-semibold">{event.title}</span>
                  <span className="text-[11px] text-indigo-500 block">{event.date} · {event.time}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-800">
            <BarChart3 className="w-5 h-5 text-red-600" />
            الأصناف المنخفضة
          </h3>
          {lowAlerts.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="quantity" fill="#ef4444" name="الكمية الحالية" />
                <Bar dataKey="threshold" fill="#fbbf24" name="حد التنبيه" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>جميع الأصناف بمستويات آمنة</p>
            </div>
          )}
        </section>

        <section className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-800">
            <TrendingDown className="w-5 h-5 text-green-600" />
            التوزيعات الأخيرة
          </h3>
          {distributions.length > 0 ? (
            <ul className="space-y-3">
              {distributions.map((d: any) => (
                <li key={d.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                  <span className="font-semibold text-gray-700">{d.reference}</span>
                  <span className="text-sm text-gray-500">{new Date(d.createdAt).toLocaleString('en-GB')}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Truck className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>لا توجد توزيعات حديثة</p>
            </div>
          )}
        </section>
      </div>

      <section className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            الأحداث القادمة
          </h3>
          <span className="text-xs text-gray-500">مزامنة من الرزنامة</span>
        </div>
        {upcomingEvents.length === 0 ? (
          <p className="text-sm text-gray-500">لا توجد أحداث مرتبة</p>
        ) : (
          <ul className="space-y-3">
            {upcomingEvents.map((event) => (
              <li key={event.id} className="flex flex-col gap-1 p-3 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>{event.date}</span>
                  <span>{event.time}</span>
                </div>
                <p className="text-base font-semibold text-gray-800">{event.title}</p>
                <p className="text-xs text-gray-500">{event.description || 'بدون وصف'}</p>
                <p className="text-[11px] text-blue-600">{event.linkedItemId ? 'مرتبط بتجهيز' : event.linkedTransport ? 'مرتبط بوسيلة نقل' : 'بدون ارتباط'}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <DistributeItemModal 
        isOpen={showDistributeModal} 
        onClose={() => setShowDistributeModal(false)} 
        onSuccess={handleDistributeSuccess} 
      />      {showUserMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowUserMenu(false)}
        />
      )}    </div>
  )
}

