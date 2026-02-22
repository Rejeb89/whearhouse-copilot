import React, { useContext } from 'react'
import { Link } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'
import { LayoutDashboard, Package, Building2, CalendarDays, FileText, Settings, Wallet, ClipboardCheck, X } from 'lucide-react'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user } = useContext(AuthContext)

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 right-0 z-40 w-56 bg-card border-l border-border flex flex-col transition-transform duration-300
          lg:static lg:translate-x-0 lg:z-auto
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        dir="rtl"
      >
        {/* Mobile close button */}
        <div className="flex justify-start p-2 lg:hidden border-b border-border">
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground"
            aria-label="إغلاق القائمة"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Logo */}
        <div className="flex flex-row items-center gap-3 h-14 px-4 border-b border-border shrink-0">
          <img src="/logo.png" alt="شعار الحرس الوطني" className="h-9 w-9 object-contain shrink-0" />
          {user?.securityUnit && (
            <p className="text-xs font-semibold text-foreground text-right leading-tight">{user.securityUnit}</p>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-2">
          <ul className="space-y-0.5">
            {[
              { to: '/',             icon: <LayoutDashboard className="w-4 h-4" />, label: 'لوحة التحكم' },
              { to: '/items',        icon: <Package className="w-4 h-4" />,         label: 'التجهيزات' },
              { to: '/entities',     icon: <Building2 className="w-4 h-4" />,       label: 'الجهات' },
              { to: '/calendar',     icon: <CalendarDays className="w-4 h-4" />,    label: 'الرزنامة' },
              { to: '/receipts',     icon: <ClipboardCheck className="w-4 h-4" />,  label: 'وصولات التسليم' },
              ...(user?.role === 'ADMIN' ? [
                { to: '/budgets',  icon: <Wallet className="w-4 h-4" />,   label: 'الاعتمادات المالية' },
                { to: '/logs',     icon: <FileText className="w-4 h-4" />,  label: 'السجلات' },
                { to: '/settings', icon: <Settings className="w-4 h-4" />, label: 'الإعدادات' },
              ] : []),
            ].map(({ to, icon, label }) => (
              <li key={to}>
                <Link
                  to={to}
                  onClick={onClose}
                  className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  {icon}
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

      </aside>
    </>
  )
}

export default Sidebar
