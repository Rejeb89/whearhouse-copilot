import React from 'react'
import { useQuery } from '@tanstack/react-query'
import client from '../api/client'
import { TrendingDown, Calendar } from 'lucide-react'

const fetchDistributions = async () => (await client.get('/distributions/recent')).data.data

export default function Distributions() {
  const { data: distributions = [] } = useQuery(['distributions'], fetchDistributions)

  return (
    <div dir="rtl">
      <h1 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <TrendingDown className="w-5 h-5" />
        التوزيعات
      </h1>
      <div className="bg-white rounded shadow p-4">
        <ul className="space-y-2">
          {distributions.map((d: any) => (
            <li key={d.id} className="flex items-center gap-2 p-3 border-b hover:bg-slate-50">
              <Calendar className="w-4 h-4 text-green-600" />
              <span className="font-semibold">{d.reference}</span>
              <span className="text-gray-500 text-sm">{new Date(d.createdAt).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
