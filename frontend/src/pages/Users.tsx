import React from 'react'
import { useQuery } from '@tanstack/react-query'
import client from '../api/client'
import { Users, Shield, UserCheck } from 'lucide-react'

const fetchUsers = async () => (await client.get('/users')).data.data

export default function UsersList() {
  const { data: users = [] } = useQuery(['users'], fetchUsers)

  const getRoleIcon = (role: string) => {
    if (role === 'ADMIN') return <Shield className="w-4 h-4" />
    return <UserCheck className="w-4 h-4" />
  }

  return (
    <div dir="rtl">
      <h1 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <Users className="w-5 h-5" />
        المستخدمون
      </h1>
      <div className="bg-white rounded shadow p-4">
        <ul className="space-y-2">
          {users.map((u: any) => (
            <li key={u.id} className="flex items-center gap-2 p-3 border-b hover:bg-slate-50">
              {getRoleIcon(u.role)}
              <span className="font-semibold">{u.email}</span>
              <span className={`text-xs px-2 py-1 rounded ${u.role === 'ADMIN' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                {u.role === 'ADMIN' ? 'مسؤول' : u.role === 'STORE_KEEPER' ? 'أمين المستودع' : 'مستخدم'}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
