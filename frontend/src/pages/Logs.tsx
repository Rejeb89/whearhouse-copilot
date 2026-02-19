import React from 'react'
import { useQuery } from '@tanstack/react-query'
import client from '../api/client'
import { FileText, Clock } from 'lucide-react'

const fetchLogs = async () => (await client.get('/logs')).data.data

export default function Logs() {
  const { data: logs = [] } = useQuery(['logs'], fetchLogs)

  return (
    <div dir="rtl">
      <h1 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <FileText className="w-5 h-5" />
        السجلات
      </h1>
      <div className="bg-white rounded shadow p-4">
        <ul className="text-sm space-y-2">
          {logs.map((l: any) => (
            <li key={l.id} className="flex items-start gap-2 p-2 border-b hover:bg-slate-50">
              <Clock className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" />
              <div className="flex-grow">
                <div className="font-semibold">{l.action} على {l.table}</div>
                <div className="text-gray-600 text-xs">
                  {new Date(l.createdAt).toLocaleString()} • رقم السجل: {l.recordId}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
