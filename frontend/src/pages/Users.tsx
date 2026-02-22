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
  USER:         { label: 'مستخدم',         color: 'bg-muted text-muted-foreground' },
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
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            إدارة المستخدمين
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{users.length} مستخدم مسجل</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setError(null) }}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold rounded-lg transition"
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
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-muted-foreground">جارٍ التحميل...</div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">لا يوجد مستخدمون</div>
        ) : (
          <table className="w-full text-sm text-right">
            <thead>
              <tr className="bg-muted/50 border-b border-border text-xs text-muted-foreground font-medium">
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
                  <tr key={u.id} className="border-b border-border hover:bg-muted/50 transition">
                    <td className="px-4 py-3 font-semibold text-foreground">
                      <span className="flex items-center gap-2">
                        {u.role === 'ADMIN' ? <Shield className="w-3.5 h-3.5 text-destructive" /> : <UserCheck className="w-3.5 h-3.5 text-primary" />}
                        {u.name || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground" dir="ltr">{u.email}</td>
                    <td className="px-4 py-3 text-muted-foreground font-mono">{u.personalNumber || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{u.securityUnit || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${rl.color}`}>{rl.label}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(u.createdAt).toLocaleDateString('ar-TN')}</td>
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
                          <button onClick={() => setDeleteConfirm(null)} className="text-xs text-muted-foreground hover:text-foreground">إلغاء</button>
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
          <div className="bg-card rounded-xl border border-border shadow-lg w-full max-w-lg mx-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <h2 className="font-bold text-foreground">إضافة مستخدم جديد</h2>
              </div>
              <button onClick={() => { setShowForm(false); setError(null) }} className="p-2 rounded-lg hover:bg-muted">
                <X className="w-4 h-4 text-muted-foreground" />
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
                  <label className="block text-sm font-medium text-foreground mb-1">الاسم الكامل</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    className="w-full border border-input bg-background p-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="الاسم الكامل للمستخدم"
                  />
                </div>

                {/* Personal Number */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">الرقم الشخصي</label>
                  <input
                    type="text"
                    value={form.personalNumber}
                    onChange={e => setForm(p => ({ ...p, personalNumber: e.target.value }))}
                    className="w-full border border-input bg-background p-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                    placeholder="XXXXXXX"
                  />
                </div>

                {/* Security Unit */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">الوحدة الأمنية الحالية</label>
                  <input
                    type="text"
                    value={form.securityUnit}
                    onChange={e => setForm(p => ({ ...p, securityUnit: e.target.value }))}
                    className="w-full border border-input bg-background p-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="اسم الوحدة"
                  />
                </div>

                {/* Email */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-1">البريد الإلكتروني</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    className="w-full border border-input bg-background p-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="user@example.com"
                    required
                    dir="ltr"
                  />
                </div>

                {/* Password */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-1 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5" /> كلمة المرور
                  </label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={form.password}
                      onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                      className="w-full border border-input bg-background p-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring pr-10"
                      placeholder="6 أحرف على الأقل"
                      required
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(p => !p)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Role */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-1">الصلاحية</label>
                  <select
                    value={form.role}
                    onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                    className="w-full border border-input bg-background p-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="USER">مستخدم</option>
                    <option value="STORE_KEEPER">أمين المستودع</option>
                    <option value="ADMIN">مسؤول</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setError(null) }}
                  className="px-4 py-2 text-sm text-muted-foreground hover:bg-muted rounded-lg transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold rounded-lg transition"
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
