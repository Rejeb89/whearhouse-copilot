import React, { useContext } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'
import { LayoutDashboard, Package, TrendingUp, TrendingDown, Building2, Users, FileText, Settings, LogOut } from 'lucide-react'

const Sidebar: React.FC = () => {
  const { user, logout } = useContext(AuthContext)
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <aside className="w-56 bg-white border-l" dir="rtl">
      <div className="p-4 font-bold flex items-center gap-2">
        <Package className="w-6 h-6" />
        نظام إدارة المستودع
      </div>
      <nav className="p-2">
        <ul className="space-y-1">
          <li>
            <Link to="/" className="flex items-center gap-2 p-2 rounded hover:bg-slate-100">
              <LayoutDashboard className="w-4 h-4" />
              لوحة التحكم
            </Link>
          </li>
          <li>
            <Link to="/items" className="flex items-center gap-2 p-2 rounded hover:bg-slate-100">
              <Package className="w-4 h-4" />
              الأصناف
            </Link>
          </li>
          <li>
            <Link to="/receptions" className="flex items-center gap-2 p-2 rounded hover:bg-slate-100">
              <TrendingUp className="w-4 h-4" />
              الاستقبالات
            </Link>
          </li>
          <li>
            <Link to="/distributions" className="flex items-center gap-2 p-2 rounded hover:bg-slate-100">
              <TrendingDown className="w-4 h-4" />
              التوزيعات
            </Link>
          </li>
          <li>
            <Link to="/entities" className="flex items-center gap-2 p-2 rounded hover:bg-slate-100">
              <Building2 className="w-4 h-4" />
              الجهات
            </Link>
          </li>
          {user?.role === 'ADMIN' && (
            <>
              <li>
                <Link to="/users" className="flex items-center gap-2 p-2 rounded hover:bg-slate-100">
                  <Users className="w-4 h-4" />
                  المستخدمون
                </Link>
              </li>
              <li>
                <Link to="/logs" className="flex items-center gap-2 p-2 rounded hover:bg-slate-100">
                  <FileText className="w-4 h-4" />
                  السجلات
                </Link>
              </li>
              <li>
                <Link to="/settings" className="flex items-center gap-2 p-2 rounded hover:bg-slate-100">
                  <Settings className="w-4 h-4" />
                  الإعدادات
                </Link>
              </li>
            </>
          )}
        </ul>
      </nav>
      <div className="mt-auto p-4">
        <div className="text-sm">{user?.email}</div>
        <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-red-600 mt-2">
          <LogOut className="w-4 h-4" />
          تسجيل الخروج
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
