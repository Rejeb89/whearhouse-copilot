import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import client from '../api/client'
import { Package, X, AlertTriangle } from 'lucide-react'

const fetchItems = async () => (await client.get('/items')).data.data

export default function Items() {
  const { data: items = [] } = useQuery(['items'], fetchItems)
  const [selectedItem, setSelectedItem] = useState<any>(null)

  return (
    <div dir="rtl">
      <h1 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <Package className="w-5 h-5" />
        التجهيزات
      </h1>
      <div className="bg-white rounded shadow p-4">
        <table className="w-full table-auto">
          <thead>
            <tr className="border-b bg-slate-50">
              <th className="text-right p-2">الاسم</th>
              <th className="text-right p-2">رمز الصنف</th>
              <th className="text-right p-2">الصنف</th>
              <th className="text-right p-2">الكمية</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it: any) => (
              <tr
                key={it.id}
                className="border-b hover:bg-blue-50 cursor-pointer transition-colors"
                onClick={() => setSelectedItem(it)}
              >
                <td className="p-2 font-semibold text-blue-700 hover:underline">{it.name}</td>
                <td className="p-2 text-gray-500 font-mono text-sm">{it.sku}</td>
                <td className="p-2 text-gray-600">{it.category || '—'}</td>
                <td className="p-2">
                  <span className={`font-semibold ${it.quantity <= (it.lowStockThreshold ?? 5) ? 'text-red-600' : 'text-green-700'}`}>
                    {it.quantity}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* نافذة تفاصيل التجهيز */}
      {selectedItem && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4"
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* رأس النافذة */}
            <div className="flex items-center justify-between bg-blue-600 text-white px-5 py-4 rounded-t-lg">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                <h2 className="text-lg font-semibold">تفاصيل التجهيز</h2>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="hover:bg-blue-700 p-1 rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* محتوى النافذة */}
            <div className="p-6 space-y-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">اسم التجهيز</p>
                <p className="text-xl font-bold text-gray-800">{selectedItem.name}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded p-3">
                  <p className="text-xs text-gray-500 mb-1">رمز الصنف (SKU)</p>
                  <p className="font-mono text-sm font-semibold">{selectedItem.sku}</p>
                </div>
                <div className="bg-gray-50 rounded p-3">
                  <p className="text-xs text-gray-500 mb-1">الصنف</p>
                  <p className="font-semibold">{selectedItem.category || 'بدون صنف'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className={`rounded p-3 ${selectedItem.quantity <= (selectedItem.lowStockThreshold ?? 5) ? 'bg-red-50' : 'bg-green-50'}`}>
                  <p className="text-xs text-gray-500 mb-1">الكمية الحالية</p>
                  <p className={`text-2xl font-bold ${selectedItem.quantity <= (selectedItem.lowStockThreshold ?? 5) ? 'text-red-600' : 'text-green-700'}`}>
                    {selectedItem.quantity}
                  </p>
                </div>
                <div className="bg-orange-50 rounded p-3">
                  <p className="text-xs text-gray-500 mb-1">الحد الأدنى</p>
                  <p className="text-2xl font-bold text-orange-600">{selectedItem.lowStockThreshold ?? 5}</p>
                </div>
              </div>

              {selectedItem.description && (
                <div className="bg-gray-50 rounded p-3">
                  <p className="text-xs text-gray-500 mb-1">الوصف</p>
                  <p className="text-sm text-gray-700">{selectedItem.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm text-gray-500">
                <div>
                  <p className="text-xs mb-1">تاريخ الإضافة</p>
                  <p>{selectedItem.createdAt ? new Date(selectedItem.createdAt).toLocaleDateString('en-GB') : '—'}</p>
                </div>
                <div>
                  <p className="text-xs mb-1">آخر تحديث</p>
                  <p>{selectedItem.updatedAt ? new Date(selectedItem.updatedAt).toLocaleDateString('en-GB') : '—'}</p>
                </div>
              </div>

              {selectedItem.quantity <= (selectedItem.lowStockThreshold ?? 5) && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>الكمية أقل من أو تساوي الحد الأدنى للتخزين</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
