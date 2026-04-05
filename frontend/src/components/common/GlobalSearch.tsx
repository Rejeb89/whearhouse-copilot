import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X, Package, TrendingUp, TrendingDown, Truck, User } from 'lucide-react'
import client from '../../services/client'

interface Props {
  placeholder?: string
  className?: string
}

export default function GlobalSearch({ placeholder, className }: Props) {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery]       = useState('')
  const [searchResults, setSearchResults]   = useState<{ items: any[]; receptions: any[]; distributions: any[]; entities: any[]; employees: any[]; users: any[] } | null>(null)
  const [searchLoading, setSearchLoading]   = useState(false)
  const [showSearchResults, setShowSearchResults] = useState(false)

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults(null)
      setShowSearchResults(false)
      return
    }
    setSearchLoading(true)
    const timer = setTimeout(async () => {
      try {
        const res = await client.get(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
        setSearchResults(res.data.data)
        setShowSearchResults(true)
      } catch {
        setSearchResults(null)
      } finally {
        setSearchLoading(false)
      }
    }, 350)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const clear = () => {
    setSearchQuery('')
    setSearchResults(null)
    setShowSearchResults(false)
  }

  const go = (path: string) => {
    navigate(path)
    clear()
  }

  return (
    <div className={`relative ${className ?? ''}`}>
      <div className="relative flex items-center">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          onFocus={() => searchResults && setShowSearchResults(true)}
          placeholder={placeholder ?? 'بحث شامل في قاعدة البيانات...'}
          className="w-full rounded-lg border border-border bg-background px-4 py-2 pr-9 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
        />
        {searchLoading && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        )}
        {searchQuery && !searchLoading && (
          <button onClick={clear} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {showSearchResults && searchResults && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowSearchResults(false)} />
          <div className="absolute top-full mt-1 w-full z-50 rounded-lg border border-border bg-card shadow-xl max-h-[70vh] overflow-y-auto" dir="rtl">

            {searchResults.items?.length > 0 && (
              <div>
                <div className="px-4 py-2 bg-muted/50 border-b border-border">
                  <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><Package className="w-3.5 h-3.5" />التجهيزات ({searchResults.items.length})</p>
                </div>
                {searchResults.items.map((item: any) => (
                  <button key={item.id} onClick={() => go('/items')} className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted/50 transition-colors text-right">
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.name}</p>
                      <p className="text-xs text-muted-foreground">المخزون: {item.quantity}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {searchResults.receptions?.length > 0 && (
              <div>
                <div className="px-4 py-2 bg-muted/50 border-b border-border">
                  <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5" />عمليات الدخل ({searchResults.receptions.length})</p>
                </div>
                {searchResults.receptions.map((r: any) => (
                  <button key={r.id} onClick={() => go('/receptions')} className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted/50 transition-colors text-right">
                    <span className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString('ar-TN')}</span>
                    <div>
                      <p className="text-sm font-medium text-foreground">{r.referenceNumber || r.reference || `#${r.id}`}</p>
                      <p className="text-xs text-muted-foreground">{r.supplier?.name || '—'} · {r._count?.items ?? 0} صنف</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {searchResults.distributions?.length > 0 && (
              <div>
                <div className="px-4 py-2 bg-muted/50 border-b border-border">
                  <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><TrendingDown className="w-3.5 h-3.5" />عمليات الخرج ({searchResults.distributions.length})</p>
                </div>
                {searchResults.distributions.map((d: any) => (
                  <button key={d.id} onClick={() => go('/distributions')} className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted/50 transition-colors text-right">
                    <span className="text-xs text-muted-foreground">{new Date(d.createdAt).toLocaleDateString('ar-TN')}</span>
                    <div>
                      <p className="text-sm font-medium text-foreground">{d.referenceNumber || d.reference || `#${d.id}`}</p>
                      <p className="text-xs text-muted-foreground">{d.beneficiary?.name || '—'} · {d._count?.items ?? 0} صنف</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {searchResults.entities?.length > 0 && (
              <div>
                <div className="px-4 py-2 bg-muted/50 border-b border-border">
                  <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><Truck className="w-3.5 h-3.5" />الجهات ({searchResults.entities.length})</p>
                </div>
                {searchResults.entities.map((e: any) => (
                  <button key={e.id} onClick={() => go(`/entities/${e.id}`)} className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted/50 transition-colors text-right">
                    <span className="text-xs text-muted-foreground">{e.type || '—'}</span>
                    <div>
                      <p className="text-sm font-medium text-foreground">{e.name}</p>
                      <p className="text-xs text-muted-foreground">{e.phone || '—'}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {searchResults.employees?.length > 0 && (
              <div>
                <div className="px-4 py-2 bg-muted/50 border-b border-border">
                  <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><User className="w-3.5 h-3.5" />الموظفون ({searchResults.employees.length})</p>
                </div>
                {searchResults.employees.map((e: any) => (
                  <button key={e.id} onClick={() => go(`/entities/${e.entityId}`)} className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted/50 transition-colors text-right">
                    <span className="text-xs text-muted-foreground">{e.entity?.name || '—'}</span>
                    <div>
                      <p className="text-sm font-medium text-foreground">{e.rank} {e.name} {e.surname}</p>
                      <p className="text-xs text-muted-foreground">{e.number || '—'}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {searchResults.items?.length === 0 &&
             searchResults.receptions?.length === 0 &&
             searchResults.distributions?.length === 0 &&
             searchResults.entities?.length === 0 &&
             searchResults.employees?.length === 0 &&
             searchResults.users?.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <Search className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-sm">لا توجد نتائج لـ "{searchQuery}"</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
