import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import client from '../api/client'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  BellRing,
  Pencil,
  Trash2
} from 'lucide-react'

const fetchItems = async () => (await client.get('/items')).data.data || []

const transportOptions = ['شاحنة النقل السريعة', 'مقطورة 12 طن', 'سيارة صغيرة', 'طائرة شحن']
const reminderOptions = [5, 10, 15, 30, 60]

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

type ViewMode = 'monthly' | 'weekly' | 'daily'

const formatDate = (date: Date) => date.toISOString().split('T')[0]

const formatTime = (date: Date) => date.toTimeString().slice(0, 5)

const getEventDateTime = (event: CalendarEvent) => new Date(`${event.date}T${event.time}`)

export default function Calendar() {
  const { data: items = [] } = useQuery(['items'], fetchItems)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>('monthly')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [form, setForm] = useState({
    title: '',
    date: formatDate(new Date()),
    time: formatTime(new Date()),
    description: '',
    reminderMinutes: 30,
    linkedItemId: '',
    linkedTransport: ''
  })
  const [filterKeyword, setFilterKeyword] = useState('')
  const [notifications, setNotifications] = useState<string[]>([])
  const notifiedRef = useRef<string[]>([])
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const payload = localStorage.getItem('calendar-events')
    if (payload) {
      setEvents(JSON.parse(payload))
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('calendar-events', JSON.stringify(events))
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('calendar-events-updated'))
    }
  }, [events])

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date()
      events.forEach((event) => {
        const eventTime = getEventDateTime(event)
        const diffMinutes = (eventTime.getTime() - now.getTime()) / 60000
        if (diffMinutes <= event.reminderMinutes && diffMinutes >= 0 && !notifiedRef.current.includes(event.id)) {
          notifiedRef.current = [...notifiedRef.current, event.id]
          setNotifications((prev) => [...prev, `تذكير: ${event.title} الساعة ${event.time}`])
        }
      })
    }, 10000)

    return () => clearInterval(interval)
  }, [events])

  useEffect(() => {
    if (!notifications.length) return
    const timer = setTimeout(() => setNotifications([]), 12000)
    return () => clearTimeout(timer)
  }, [notifications])

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const matchesKeyword =
        !filterKeyword ||
        event.title.toLowerCase().includes(filterKeyword.toLowerCase()) ||
        event.description.toLowerCase().includes(filterKeyword.toLowerCase())
      return matchesKeyword
    })
  }, [events, filterKeyword])

  const eventsByDate = useMemo(() => {
    return events.reduce<Record<string, CalendarEvent[]>>((acc, event) => {
      acc[event.date] = [...(acc[event.date] || []), event]
      return acc
    }, {})
  }, [events])

  const activeMonth = useMemo(() => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1), [selectedDate])

  const incrementMonth = (delta: number) => {
    const next = new Date(activeMonth)
    next.setMonth(next.getMonth() + delta)
    setSelectedDate(next)
  }

  const weekStart = new Date(selectedDate)
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())

  const monthDays = useMemo(() => {
    const days: (Date | null)[] = []
    const firstDayIndex = new Date(activeMonth.getFullYear(), activeMonth.getMonth(), 1).getDay()
    const totalDays = new Date(activeMonth.getFullYear(), activeMonth.getMonth() + 1, 0).getDate()
    const totalCells = Math.ceil((firstDayIndex + totalDays) / 7) * 7

    for (let idx = 0; idx < totalCells; idx += 1) {
      const dayNumber = idx - firstDayIndex + 1
      if (dayNumber > 0 && dayNumber <= totalDays) {
        days.push(new Date(activeMonth.getFullYear(), activeMonth.getMonth(), dayNumber))
      } else {
        days.push(null)
      }
    }

    return days
  }, [activeMonth])

  const openModalForDay = (date: Date) => {
    setEditingEvent(null)
    setForm((prev) => ({
      ...prev,
      date: formatDate(date),
      time: prev.time || formatTime(new Date())
    }))
    setModalOpen(true)
  }

  const openEditModal = (event: CalendarEvent) => {
    setEditingEvent(event)
    setForm({
      title: event.title,
      date: event.date,
      time: event.time,
      description: event.description,
      reminderMinutes: event.reminderMinutes,
      linkedItemId: event.linkedItemId ?? '',
      linkedTransport: event.linkedTransport ?? ''
    })
    setModalOpen(true)
  }

  const handleSave = () => {
    if (!form.title.trim()) {
      setErrorMessage('يرجى إدخال عنوان الحدث')
      return
    }
    if (!form.date) {
      setErrorMessage('يرجى تحديد تاريخ الحدث')
      return
    }
    if (!form.time) {
      setErrorMessage('يرجى تحديد وقت الحدث')
      return
    }

    const payload: CalendarEvent = {
      id: editingEvent?.id || crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
      title: form.title.trim(),
      date: form.date,
      time: form.time,
      description: form.description.trim(),
      reminderMinutes: Number(form.reminderMinutes),
      linkedItemId: form.linkedItemId || undefined,
      linkedTransport: form.linkedTransport || undefined,
      createdAt: editingEvent?.createdAt || new Date().toISOString()
    }

    setEvents((prev) => {
      if (editingEvent) {
        return prev.map((event) => (event.id === editingEvent.id ? payload : event))
      }
      return [...prev, payload]
    })

    setModalOpen(false)
    setEditingEvent(null)
    setErrorMessage('')
  }

  const handleDelete = (eventId: string) => {
    setEvents((prev) => prev.filter((event) => event.id !== eventId))
  }

  const getItemName = (itemId?: string) => items.find((item: any) => item.id === itemId)?.name

  const weeklyDays = Array.from({ length: 7 }, (_, idx) => {
    const day = new Date(weekStart)
    day.setDate(day.getDate() + idx)
    return day
  })

  const dailyEvents = useMemo(() => {
    const key = formatDate(selectedDate)
    return eventsByDate[key]?.sort((a, b) => a.time.localeCompare(b.time)) || []
  }, [eventsByDate, selectedDate])

  const upcomingEvents = useMemo(() => {
    const now = new Date()
    return events
      .filter((event) => getEventDateTime(event) >= now)
      .sort((a, b) => getEventDateTime(a).getTime() - getEventDateTime(b).getTime())
      .slice(0, 5)
  }, [events])

  return (
    <div className="space-y-6" dir="rtl">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <CalendarDays className="w-5 h-5" />
            الرزنامة
          </h1>
          <p className="text-sm text-slate-500">إدارة الأحداث والتذكيرات المرتبطة بالتجهيزات ووسائل النقل</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex gap-1 rounded-lg bg-white border border-slate-200 shadow-sm">
            {(['monthly', 'weekly', 'daily'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-4 py-2 text-sm ${viewMode === mode ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:text-blue-600'}`}
              >
                {mode === 'monthly' ? 'شهري' : mode === 'weekly' ? 'أسبوعي' : 'يومي'}
              </button>
            ))}
          </div>
          <button
            onClick={() => openModalForDay(selectedDate)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-sm text-sm"
          >
            <Plus className="w-4 h-4" />
            إضافة حدث
          </button>
        </div>
      </header>

      {notifications.length > 0 && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 flex items-center gap-2 text-sm text-amber-800">
          <BellRing className="w-5 h-5" />
          {notifications[notifications.length - 1]}
        </div>
      )}

      <section className="grid lg:grid-cols-[2fr,1fr] gap-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <button
                onClick={() => incrementMonth(-1)}
                className="p-2 rounded-full hover:bg-slate-100"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-semibold">
                {activeMonth.toLocaleString('en-GB', { month: 'long', year: 'numeric' })}
              </span>
              <button
                onClick={() => incrementMonth(1)}
                className="p-2 rounded-full hover:bg-slate-100"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>* أو اضغط على أي يوم في الرزنامة</span>
            </div>
          </div>

          {viewMode === 'monthly' && (
            <div className="border rounded-lg bg-white shadow-sm" dir="rtl">
              <div className="grid grid-cols-7 border-b text-center text-xs uppercase text-slate-500 bg-slate-50">
                {['أحد', 'اثن', 'ثلاث', 'أرب', 'خمس', 'جمعة', 'سبت'].map((name) => (
                  <div key={name} className="py-2 border-slate-100 border-r last:border-r-0">
                    {name}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1 p-2">
                {monthDays.map((day, idx) => {
                  const dayKey = day ? formatDate(day) : `empty-${idx}`
                  const isSelected = day && formatDate(day) === formatDate(selectedDate)
                  const dayEvents = day ? eventsByDate[formatDate(day)] : []
                  return (
                    <button
                      key={dayKey}
                      onClick={() => day && setSelectedDate(day)}
                      className={`flex flex-col h-28 rounded-lg border p-2 text-right text-sm text-slate-600 transition ${
                        isSelected ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:border-slate-200'
                      }`}
                      disabled={!day}
                    >
                      {day ? (
                        <div className="flex justify-between items-center">
                          <span className="text-base font-semibold text-slate-700">{day.getDate()}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              openModalForDay(day)
                            }}
                            className="text-[10px] text-blue-600"
                          >
                            + حدث
                          </button>
                        </div>
                      ) : (
                        <span>&nbsp;</span>
                      )}
                      <div className="mt-1 space-y-1 overflow-hidden text-xs">
                        {dayEvents?.slice(0, 2).map((event) => (
                          <div
                            key={event.id}
                            className="bg-slate-100 rounded px-2 py-1 text-ellipsis"
                            title={event.description}
                          >
                            <span className="font-semibold text-slate-700">{event.title}</span>
                            <div className="text-[10px] text-slate-500">{event.time}</div>
                          </div>
                        ))}
                        {dayEvents && dayEvents.length > 2 && (
                          <span className="text-[10px] text-blue-600">+ المزيد...</span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {viewMode === 'weekly' && (
            <div className="grid grid-cols-1 gap-1 sm:grid-cols-7">
              {weeklyDays.map((day) => (
                <div key={formatDate(day)} className="border rounded-lg bg-white shadow-sm flex flex-col overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 border-b text-sm font-semibold text-slate-600 bg-slate-50">
                    <span>{day.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })}</span>
                    <button
                      type="button"
                      onClick={() => openModalForDay(day)}
                      className="text-[10px] text-blue-600"
                    >
                      + حدث
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-2 p-2">
                    {(eventsByDate[formatDate(day)] || []).map((event) => (
                      <div key={event.id} className="rounded-lg border border-slate-100 px-3 py-2 bg-slate-50">
                        <div className="flex justify-between gap-2 text-xs text-slate-500">
                          <span>{event.time}</span>
                          <span>{event.linkedItemId ? getItemName(event.linkedItemId) : event.linkedTransport || ''}</span>
                        </div>
                        <p className="font-semibold text-slate-800 text-sm">{event.title}</p>
                        <p className="text-xs text-slate-500 truncate">{event.description || 'بدون وصف'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {viewMode === 'daily' && (
            <div className="border rounded-lg bg-white shadow-sm">
              <div className="flex items-center justify-between px-4 py-2 border-b bg-slate-50">
                <span className="font-semibold text-slate-600">{selectedDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
                <button
                  type="button"
                  onClick={() => openModalForDay(selectedDate)}
                  className="text-xs text-blue-600"
                >
                  إضافة حدث
                </button>
              </div>
              <div className="divide-y">
                {dailyEvents.length === 0 && (
                  <div className="p-4 text-sm text-slate-500">لا توجد فعاليات لليوم الحالي.</div>
                )}
                {dailyEvents.map((event) => (
                  <div key={event.id} className="flex flex-col gap-2 px-4 py-3 hover:bg-slate-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{event.title}</p>
                        <p className="text-xs text-slate-500">{event.time} · {event.linkedItemId ? getItemName(event.linkedItemId) : event.linkedTransport || 'بدون رابط'}</p>
                      </div>
                      <div className="flex gap-2 text-slate-500">
                        <button onClick={() => openEditModal(event)} className="hover:text-blue-600">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(event.id)} className="hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500">{event.description || 'بدون وصف'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="bg-white rounded-lg border shadow-sm p-4 space-y-3">
            <h2 className="text-base font-semibold">تصفية الأحداث</h2>
            <input
              placeholder="البحث بالعنوان أو الوصف"
              className="w-full rounded border px-3 py-2 text-sm"
              value={filterKeyword}
              onChange={(e) => setFilterKeyword(e.target.value)}
            />
          </div>

          <div className="bg-white rounded-lg border shadow-sm p-4 space-y-3">
            <h2 className="text-base font-semibold">الأحداث القادمة</h2>
            {upcomingEvents.length === 0 ? (
              <p className="text-sm text-slate-500">لا توجد أحداث قادمة.</p>
            ) : (
              <div className="space-y-2 text-sm text-slate-700">
                {upcomingEvents.map((event) => (
                  <div key={event.id} className="flex items-start justify-between gap-2 p-2 rounded border border-slate-100 bg-slate-50">
                    <div>
                      <p className="font-semibold text-slate-800">{event.title}</p>
                      <p className="text-[11px] text-slate-500">{event.date} · {event.time}</p>
                    </div>
                    <button onClick={() => openEditModal(event)} className="text-blue-600 text-xs">تعديل</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg border shadow-sm p-4 space-y-3">
            <h2 className="text-base font-semibold">قائمة الأحداث</h2>
            {filteredEvents.length === 0 && <p className="text-sm text-slate-500">لا توجد أحداث مطابقة للفلتر.</p>}
            <div className="space-y-2 max-h-[320px] overflow-y-auto">
              {filteredEvents.map((event) => (
                <div key={event.id} className="rounded-lg border border-slate-100 px-3 py-2 bg-slate-50 flex flex-col gap-1 text-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-800">{event.title}</p>
                      <p className="text-xs text-slate-500">{event.date} · {event.time}</p>
                    </div>
                    <div className="flex gap-1 text-slate-500">
                      <button onClick={() => openEditModal(event)} className="hover:text-blue-600">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(event.id)} className="hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">{event.description || 'بدون وصف'}</p>
                  <div className="text-[11px] text-slate-500">
                    {event.linkedItemId ? `تجهيز: ${getItemName(event.linkedItemId)}` : event.linkedTransport ? `نقل: ${event.linkedTransport}` : 'بدون رابط'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </section>

      {modalOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center px-4"
          dir="rtl"
        >
          <div className="bg-white w-full max-w-2xl rounded-lg shadow-xl overflow-hidden">
            <header className="flex items-center justify-between px-6 py-4 border-b bg-slate-50">
              <h3 className="text-lg font-semibold">{editingEvent ? 'تعديل الحدث' : 'إضافة حدث جديد'}</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-500 hover:text-slate-900">
                إغلاق
              </button>
            </header>
            <div className="p-6 space-y-4">
              {errorMessage && <p className="text-xs text-red-600">{errorMessage}</p>}
              <div>
                <label className="text-xs text-slate-500">العنوان</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full rounded border px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-slate-500">التاريخ</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full rounded border px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500">الوقت</label>
                  <input
                    type="time"
                    value={form.time}
                    onChange={(e) => setForm({ ...form, time: e.target.value })}
                    className="w-full rounded border px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500">التذكير (دقائق)</label>
                  <select
                    value={form.reminderMinutes}
                    onChange={(e) => setForm({ ...form, reminderMinutes: Number(e.target.value) })}
                    className="w-full rounded border px-3 py-2 text-sm"
                  >
                    {reminderOptions.map((option) => (
                      <option key={option} value={option}>{option} دقيقة</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500">الوصف</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full rounded border px-3 py-2 text-sm min-h-[80px]"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500">ربط بتجهيز</label>
                  <select
                    value={form.linkedItemId}
                    onChange={(e) => setForm({ ...form, linkedItemId: e.target.value })}
                    className="w-full rounded border px-3 py-2 text-sm"
                  >
                    <option value="">بدون ربط</option>
                    {items.map((item: any) => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500">ربط بوسيلة نقل</label>
                  <select
                    value={form.linkedTransport}
                    onChange={(e) => setForm({ ...form, linkedTransport: e.target.value })}
                    className="w-full rounded border px-3 py-2 text-sm"
                  >
                    <option value="">بدون ربط</option>
                    {transportOptions.map((transport) => (
                      <option key={transport} value={transport}>{transport}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <footer className="flex items-center justify-between px-6 py-4 border-t bg-slate-50">
              <button onClick={() => setModalOpen(false)} className="text-sm text-slate-500 hover:text-slate-800">
                إلغاء
              </button>
              <button onClick={handleSave} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">
                {editingEvent ? 'حفظ التعديلات' : 'حفظ الحدث'}
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  )
}
