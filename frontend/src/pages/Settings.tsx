import React from 'react'
import { Settings } from 'lucide-react'

export default function SettingsPage() {
  return (
    <div dir="rtl">
      <h1 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <Settings className="w-5 h-5" />
        الإعدادات
      </h1>
      <div className="bg-white rounded shadow p-4">
        <p className="text-gray-600">الإعدادات (تكوين حدود الأصناف المنخفضة، وغيرها)</p>
      </div>
    </div>
  )
}
