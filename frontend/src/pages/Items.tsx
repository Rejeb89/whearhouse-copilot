import React from 'react'
import { useQuery } from '@tanstack/react-query'
import client from '../api/client'
import { Package } from 'lucide-react'

const fetchItems = async () => (await client.get('/items')).data.data

export default function Items() {
  const { data: items = [] } = useQuery(['items'], fetchItems)

  return (
    <div dir="rtl">
      <h1 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <Package className="w-5 h-5" />
        الأصناف
      </h1>
      <div className="bg-white rounded shadow p-4">
        <table className="w-full table-auto">
          <thead>
            <tr className="border-b">
              <th className="text-right p-2">الاسم</th>
              <th className="text-right p-2">رمز الصنف</th>
              <th className="text-right p-2">الكمية</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it: any) => (
              <tr key={it.id} className="border-b hover:bg-slate-50">
                <td className="p-2">{it.name}</td>
                <td className="p-2">{it.sku}</td>
                <td className="p-2">
                  <span className={it.quantity <= (it.lowStockThreshold ?? 5) ? 'text-red-600 font-semibold' : ''}>
                    {it.quantity}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
