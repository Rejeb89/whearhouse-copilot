import React, { useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'
import { User, LogOut } from 'lucide-react'

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
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  return (
    <header className="w-full flex items-center justify-between px-4 h-14 border-b bg-white" dir="rtl">
      <div>
        <span className="text-sm font-semibold text-slate-700">{timeStr}</span>
        <div className="text-xs text-slate-500">{dateStr}</div>
      </div>

      <div className="relative">
        <button
          onClick={() => setShowMenu(v => !v)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100 transition"
        >
          <span className="text-sm text-slate-700">{user.email}</span>
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white">
            <User className="w-4 h-4" />
          </div>
        </button>

        {showMenu && (
          <div className="absolute left-0 mt-2 w-48 rounded-lg border bg-white shadow-lg p-2 text-right">
            <p className="text-xs text-slate-500">الحساب</p>
            <p className="text-sm font-semibold text-slate-700 truncate">{user.email}</p>
            <p className="text-xs text-slate-400">{user.role === 'ADMIN' ? 'مدير النظام' : 'مستخدم'}</p>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 mt-2 w-full justify-end text-sm text-red-600 hover:bg-red-50 px-2 py-1 rounded"
            >
              <LogOut className="w-4 h-4" />
              تسجيل الخروج
            </button>
          </div>
        )}
      </div>
    </header>
  )
}

export default TopBar