import React, { useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, User, Menu } from 'lucide-react'
import { AuthContext } from '../context/AuthContext'

interface TopBarProps {
  onToggleSidebar?: () => void
}

const TopBar: React.FC<TopBarProps> = ({ onToggleSidebar }) => {
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
    <header className="w-full flex items-center justify-between gap-4 px-6 h-14 border-b border-border bg-card shrink-0" dir="rtl">
      {/* Hamburger — mobile only */}
      <button
        onClick={onToggleSidebar}
        className="lg:hidden p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground shrink-0"
        aria-label="فتح القائمة"
      >
        <Menu className="w-5 h-5" />
      </button>

      <div className="shrink-0 text-right">
        <span className="text-sm font-semibold text-foreground">{timeStr}</span>
        <div className="text-xs text-muted-foreground">{dateStr}</div>
      </div>

      <div className="relative shrink-0">
        <button
          onClick={() => setShowMenu((prev) => !prev)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-accent transition-colors"
        >
          <span className="text-sm font-medium text-foreground">{user.name || user.email}</span>
          <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
            <User className="w-3.5 h-3.5" />
          </div>
        </button>

        {showMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
            <div className="absolute left-0 mt-2 w-52 rounded-lg border border-border bg-card shadow-md p-3 text-right z-50">
              <p className="text-xs text-muted-foreground">الحساب</p>
              <p className="text-sm font-semibold text-foreground truncate mt-0.5">{user.email}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{user.role === 'ADMIN' ? 'مدير النظام' : 'مستخدم'}</p>
              <hr className="my-2 border-border" />
              <button
                onClick={() => { setShowMenu(false); handleLogout() }}
                className="flex items-center gap-2 w-full justify-end text-sm text-destructive hover:bg-destructive/10 px-2 py-1.5 rounded-md transition-colors"
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
