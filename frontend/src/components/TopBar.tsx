import React, { useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, User } from 'lucide-react'
import { AuthContext } from '../context/AuthContext'

const TopBar: React.FC = () => {
  const { user, logout } = useContext(AuthContext)
  const navigate = useNavigate()
  const [now, setNow] = useState(new Date())
  const [showMenu, setShowMenu] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  if (!user) return null

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <header className="w-full flex items-center justify-between gap-4 px-6 h-16 border-b bg-white shrink-0" dir="rtl">
      <div className="shrink-0 text-right">
        <span className="text-sm font-semibold text-slate-700">{timeStr}</span>
        <div className="text-xs text-slate-500">{dateStr}</div>
      </div>

      <div className="relative shrink-0">
        <button
          onClick={() => setShowMenu((prev) => !prev)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100 transition"
        >
          <span className="text-sm font-medium text-slate-700">{user.name || user.email}</span>
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white">
            <User className="w-4 h-4" />
          </div>
        </button>

        {showMenu && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowMenu(false)}
            />
            <div className="absolute left-0 mt-2 w-52 rounded-xl border bg-white shadow-xl p-3 text-right z-50">
              <p className="text-xs text-slate-400">الحساب</p>
              <p className="text-sm font-semibold text-slate-700 truncate mt-0.5">{user.email}</p>
              <p className="text-xs text-slate-400 mt-0.5">{user.role === 'ADMIN' ? 'مدير النظام' : 'مستخدم'}</p>
              <hr className="my-2 border-slate-100" />
              <button
                onClick={() => { setShowMenu(false); handleLogout() }}
                className="flex items-center gap-2 w-full justify-end text-sm text-red-600 hover:bg-red-50 px-2 py-1.5 rounded-lg"
              >
                <LogOut className="w-4 h-4" />
                تسجيل الخروج
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  )
}

export default TopBar
