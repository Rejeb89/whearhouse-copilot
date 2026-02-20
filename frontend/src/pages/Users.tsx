import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import client from '../api/client'
import { Users, Shield, UserCheck, Plus, Loader2, X, Trash2, Eye, EyeOff, User, Lock } from 'lucide-react'

interface AppUser {
  id: number
  email: string
  name?: string
  role: string
  personalNumber?: string
  securityUnit?: string
  createdAt: string
}

const roleLabel: Record<string, { label: string; color: string }> = {
  ADMIN:        { label: 'مسؤول',          color: 'bg-red-100 text-red-700' },
  STORE_KEEPER: { label: 'أمين المستودع', color: 'bg-blue-100 text-blue-700' },
  USER:         { label: 'مستخدم',         color: 'bg-gray-100 text-gray-700' },
}

const EMPTY_FORM = { email: '', password: '', name: '', role: 'USER', personalNumber: '', securityUnit: '' }

const fetchUsers = async () => (await client.get('/users')).data.data

export default function UsersList() {
  const qc = useQueryClient()
  const { data: users = [], isLoading } = useQuery<AppUser[]>(['users'], fetchUsers)

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)

  const createMutation = useMutation(
    (data: typeof EMPTY_FORM) => client.post('/users', data).then(r => r.data.data),
    {
      onSuccess: () => {
        qc.invalidateQueries(['users'])
        setForm(EMPTY_FORM)
        setShowForm(false)
        setError(null)
      },
      onError: (err: any) => setError(err?.response?.data?.error || 'تعذر إضافة المستخدم'),
    }
  )

  const deleteMutation = useMutation(
    (id: number) => client.delete(`/users/${id}`).then(r => r.data),
    {
      onSuccess: () => { qc.invalidateQueries(['users']); setDeleteConfirm(null) },
      onError: (err: any) => setError(err?.response?.data?.error || 'تعذر حذف المستخدم'),
    }
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    createMutation.mutate(form)
  }

  return (
    <div dir="rtl" className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-700" />
            إدارة المستخدمين
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{users.length} مستخدم مسجل</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setError(null) }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-800 hover:bg-blue-900 text-white text-sm font-semibold rounded-lg transition"
        >
          <Plus className="w-4 h-4" /> إضافة مستخدم
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg flex items-center justify-between">
          {error}
          <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-gray-400">جارٍ التحميل...</div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center text-gray-400">لا يوجد مستخدمون</div>
        ) : (
          <table className="w-full text-sm text-right">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 font-medium">
                <th className="px-4 py-3">الاسم الكامل</th>
                <th className="px-4 py-3">البريد الإلكتروني</th>
                <th className="px-4 py-3">الرقم الشخصي</th>
                <th className="px-4 py-3">الوحدة الأمنية</th>
                <th className="px-4 py-3">الصلاحية</th>
                <th className="px-4 py-3">تاريخ الإنشاء</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const rl = roleLabel[u.role] || roleLabel.USER
                return (
                  <tr key={u.id} className="border-b border-gray-50 hover:bg-blue-50/30 transition">
                    <td className="px-4 py-3 font-semibold text-gray-700">
                      <span className="flex items-center gap-2">
                        {u.role === 'ADMIN' ? <Shield className="w-3.5 h-3.5 text-red-500" /> : <UserCheck className="w-3.5 h-3.5 text-blue-500" />}
                        {u.name || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600" dir="ltr">{u.email}</td>
                    <td className="px-4 py-3 text-gray-600 font-mono">{u.personalNumber || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{u.securityUnit || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${rl.color}`}>{rl.label}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{new Date(u.createdAt).toLocaleDateString('ar-TN')}</td>
                    <td className="px-4 py-3">
                      {deleteConfirm === u.id ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => deleteMutation.mutate(u.id)}
                            disabled={deleteMutation.isLoading}
                            className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
                          >
                            {deleteMutation.isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'تأكيد'}
                          </button>
                          <button onClick={() => setDeleteConfirm(null)} className="text-xs text-gray-500 hover:text-gray-700">إلغاء</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(u.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Add User Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                  <User className="w-4 h-4 text-blue-700" />
                </div>
                <h2 className="font-bold text-gray-800">إضافة مستخدم جديد</h2>
              </div>
              <button onClick={() => { setShowForm(false); setError(null) }} className="p-2 rounded-lg hover:bg-gray-100">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {/* Name */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">الاسم الكامل</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    className="w-full border border-gray-200 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="الاسم الكامل للمستخدم"
                  />
                </div>

                {/* Personal Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الرقم الشخصي</label>
                  <input
                    type="text"
                    value={form.personalNumber}
                    onChange={e => setForm(p => ({ ...p, personalNumber: e.target.value }))}
                    className="w-full border border-gray-200 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    placeholder="XXXXXXX"
                  />
                </div>

                {/* Security Unit */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الوحدة الأمنية الحالية</label>
                  <input
                    type="text"
                    value={form.securityUnit}
                    onChange={e => setForm(p => ({ ...p, securityUnit: e.target.value }))}
                    className="w-full border border-gray-200 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="اسم الوحدة"
                  />
                </div>

                {/* Email */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    className="w-full border border-gray-200 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="user@example.com"
                    required
                    dir="ltr"
                  />
                </div>

                {/* Password */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5" /> كلمة المرور
                  </label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={form.password}
                      onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                      className="w-full border border-gray-200 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                      placeholder="6 أحرف على الأقل"
                      required
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(p => !p)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Role */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">الصلاحية</label>
                  <select
                    value={form.role}
                    onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                    className="w-full border border-gray-200 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="USER">مستخدم</option>
                    <option value="STORE_KEEPER">أمين المستودع</option>
                    <option value="ADMIN">مسؤول</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setError(null) }}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-800 hover:bg-blue-900 text-white text-sm font-semibold rounded-lg transition"
                >
                  {createMutation.isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  حفظ المستخدم
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
