import React, { useContext } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AuthContext } from '../../context/AuthContext'
import { LayoutDashboard, Package, Building2, CalendarDays, FileText, Settings, Wallet, ClipboardCheck, Car, X, Shield } from 'lucide-react'
import GlobalSearch from './GlobalSearch'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user } = useContext(AuthContext)
  const location = useLocation()

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
        <div className="flex flex-row items-center gap-3 h-14 px-4 shrink-0">
          <img src="/logo.png" alt="شعار الحرس الوطني" className="h-9 w-9 object-contain shrink-0" />
          {user?.securityUnit && (
            <p className="text-xs font-semibold text-foreground leading-tight">{user.securityUnit}</p>
          )}
        </div>

        {/* Global Search */}
        <div className="px-3 pb-2">
          <GlobalSearch placeholder="بحث..." />
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3">
          <ul className="space-y-1">
            {(
              user?.role === 'REGION_CHIEF' || user?.role === 'DISTRICT_MANAGER' ? [
                { to: '/monitoring', icon: <Shield className="w-5 h-5" />,   label: 'لوحة المراقبة' },
                { to: '/settings',   icon: <Settings className="w-5 h-5" />, label: 'الإعدادات' },
              ] :
              user?.role === 'ADMIN' ? [
                { to: '/monitoring', icon: <Shield className="w-5 h-5" />,          label: 'لوحة المراقبة' },
                { to: '/calendar',   icon: <CalendarDays className="w-5 h-5" />,    label: 'الرزنامة' },
                { to: '/settings',   icon: <Settings className="w-5 h-5" />,        label: 'الإعدادات' },
              ] : [
                { to: '/',             icon: <LayoutDashboard className="w-5 h-5" />, label: 'لوحة التحكم' },
                { to: '/items',        icon: <Package className="w-5 h-5" />,         label: 'التجهيزات' },
                { to: '/vehicles',     icon: <Car className="w-5 h-5" />,             label: 'الوسائل' },
                { to: '/entities',     icon: <Building2 className="w-5 h-5" />,       label: 'الجهات' },
                { to: '/calendar',     icon: <CalendarDays className="w-5 h-5" />,    label: 'الرزنامة' },
                { to: '/receipts',     icon: <ClipboardCheck className="w-5 h-5" />,  label: 'وصولات التسليم' },
                ...(user?.role === 'SECTION_CHIEF' ? [
                  { to: '/budgets',  icon: <Wallet className="w-5 h-5" />,   label: 'الاعتمادات المالية' },
                  { to: '/logs',     icon: <FileText className="w-5 h-5" />,  label: 'السجلات' },
                  { to: '/settings', icon: <Settings className="w-5 h-5" />, label: 'الإعدادات' },
                ] : []),
              ]
            ).map(({ to, icon, label }) => {
              const isActive = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)
              return (
              <li key={to}>
                <Link
                  to={to}
                  onClick={onClose}
                  className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-base font-medium transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground font-bold shadow-sm'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {icon}
                  <span>{label}</span>
                </Link>
              </li>
              )
            })}
          </ul>
        </nav>

      </aside>
    </>
  )
}

export default Sidebar
