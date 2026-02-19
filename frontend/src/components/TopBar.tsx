import React, { useContext, useEffect, useState } from 'react'
import { User, LogOut, X, Search } from 'lucide-react'
import { AuthContext } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

interface SearchResult {
  type: 'item' | 'distribution'
  data: any
}

interface TopBarProps {
  items?: any[]
  distributions?: any[]
}

export default function TopBar({ items = [], distributions = [] }: TopBarProps) {
  const navigate = useNavigate()
  const [now, setNow] = useState(new Date())
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  const { user, logout } = useContext(AuthContext)

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setSearchResults([])
      setShowSearchResults(false)
      return
    }

    const query = searchQuery.toLowerCase()
    const results: SearchResult[] = []

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

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="w-full flex items-center justify-between bg-blue-600 rounded-t-lg mb-4 px-6 py-4 shadow gap-4">
      <div className="text-white font-semibold text-lg flex-shrink-0">
        {`${now.getDate()} ${now.toLocaleString('ar-EG', { month: 'long' })} ${now.getFullYear()}`}
        {' | '}
        {now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </div>

      {/* Search Bar */}
      <div className="relative flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="بحث عن التجهيزات أو التوزيعات..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-4 pr-10 py-2 bg-white text-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        {/* Search Results Dropdown */}
        {showSearchResults && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 max-h-96 overflow-y-auto z-50">
            {searchResults.map((result, idx) => (
              <div key={idx} className="px-4 py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 cursor-pointer">
                {result.type === 'item' && (
                  <div>
                    <p className="font-semibold text-gray-800">{result.data.name}</p>
                    <p className="text-xs text-gray-500">تجهيز • الكمية: {result.data.quantity}</p>
                  </div>
                )}
                {result.type === 'distribution' && (
                  <div>
                    <p className="font-semibold text-gray-800">{result.data.itemName}</p>
                    <p className="text-xs text-gray-500">توزيع • {result.data.createdAt}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {showSearchResults && searchQuery && searchResults.length === 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50">
            <p className="text-gray-500 text-center">لا توجد نتائج</p>
          </div>
        )}
      </div>

      <div className="relative flex-shrink-0">
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="p-3 bg-blue-500 rounded-full hover:bg-blue-700 transition shadow-md border-2 border-white"
        >
          <User className="w-7 h-7 text-white" />
        </button>
        {showUserMenu && (
          <div className="absolute top-14 left-0 bg-white rounded-lg shadow-xl border border-gray-200 w-64 z-50">
            <div className="p-4 border-b border-gray-100 flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-500">حساب المستخدم</p>
                <p className="font-semibold text-gray-800 break-all">{user?.email}</p>
              </div>
              <button
                onClick={() => setShowUserMenu(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 border-b border-gray-100 space-y-2">
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                <User className="w-4 h-4 text-gray-600" />
                <span className="text-xs text-gray-700">{user?.role}</span>
              </div>
              <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded mt-2">
                <LogOut className="w-4 h-4" />
                تسجيل الخروج
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
