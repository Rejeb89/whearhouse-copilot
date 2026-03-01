import React, { useState, useContext, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import client from '../services/client'
import { AuthContext } from '../context/AuthContext'
import {
  Settings,
  Users,
  ShieldCheck,
  Plus,
  Pencil,
  Trash2,
  X,
  Search,
  Eye,
  EyeOff,
  ClipboardList,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Download,
  Upload,
  Database,
  FileJson,
  Trash,
  Info,
} from 'lucide-react'

// ─── API helpers ──────────────────────────────────────────────────────────────

const fetchUsers = async (search = '', role = '') => {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  if (role) params.set('role', role)
  return (await client.get(`/users?${params}`)).data.data
}

const fetchAuditLogs = async () => (await client.get('/audit')).data.data
const fetchDbStats = async () => (await client.get('/data/stats')).data.data

const createUser = (data: any) => client.post('/users', data)
const updateUser = (id: number, data: any) => client.put(`/users/${id}`, data)
const deleteUser = (id: number) => client.delete(`/users/${id}`)

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLE_META: Record<string, { label: string; color: string }> = {
  ADMIN: { label: 'مسؤول', color: 'bg-red-100 text-red-700 border border-red-200' },
  SECTION_CHIEF: { label: 'رئيس قسم', color: 'bg-blue-100 text-blue-700 border border-blue-200' },
  USER: { label: 'مستخدم', color: 'bg-muted text-muted-foreground border border-border' },
}

const AUDIT_ACTION_COLORS: Record<string, string> = {
  CREATE_USER: 'bg-green-100 text-green-700',
  UPDATE_USER: 'bg-yellow-100 text-yellow-700',
  DELETE_USER: 'bg-red-100 text-red-700',
}

const EMPTY_FORM = { name: '', email: '', password: '', role: 'USER' as string, personalNumber: '', securityUnit: '', region: '', title: '' }

// ─── Sub-components ───────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  const meta = ROLE_META[role] ?? { label: role, color: 'bg-muted text-muted-foreground' }
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${meta.color}`}>
      {role === 'ADMIN' && <ShieldCheck className="w-3 h-3" />}
      {meta.label}
    </span>
  )
}

function Alert({
  type,
  message,
  onDismiss,
}: {
  type: 'error' | 'success'
  message: string
  onDismiss: () => void
}) {
  if (!message) return null
  return (
    <div
      className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm mb-4 ${
        type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'
      }`}
    >
      {type === 'error' ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <CheckCircle className="w-4 h-4 shrink-0" />}
      <span className="flex-1">{message}</span>
      <button onClick={onDismiss} className="p-0.5 hover:opacity-70">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

// ─── User Form Modal ──────────────────────────────────────────────────────────

interface UserModalProps {
  open: boolean
  editing: any | null
  onClose: () => void
  onSaved: () => void
}

function UserModal({ open, editing, onClose, onSaved }: UserModalProps) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(
        editing
          ? { name: editing.name ?? '', email: editing.email, password: '', role: editing.role, personalNumber: editing.personalNumber ?? '', securityUnit: editing.securityUnit ?? '', region: editing.region ?? '', title: (editing as any).title ?? '' }
          : EMPTY_FORM,
      )
      setError('')
      setShowPw(false)
    }
  }, [open, editing])

  const validate = () => {
    if (!form.email.trim()) return 'البريد الإلكتروني مطلوب'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'البريد الإلكتروني غير صالح'
    if (!editing && !form.password) return 'كلمة المرور مطلوبة'
    if (form.password && form.password.length < 6) return 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'
    if (!form.name.trim()) return 'الاسم مطلوب'
    return ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const err = validate()
    if (err) { setError(err); return }
    setLoading(true)
    setError('')
    try {
      const payload: any = { name: form.name, email: form.email, role: form.role, personalNumber: form.personalNumber || undefined, securityUnit: form.securityUnit || undefined, region: (form as any).region || undefined, title: (form as any).title || undefined }
      if (form.password) payload.password = form.password
      if (editing) await updateUser(editing.id, payload)
      else await createUser({ ...payload, password: form.password })
      onSaved()
      onClose()
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'حدث خطأ غير متوقع')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" dir="rtl">
      <div className="bg-card w-full max-w-md rounded-xl border border-border shadow-lg overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/50">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            {editing ? 'تعديل المستخدم' : 'إضافة مستخدم جديد'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted/50 hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <Alert type="error" message={error} onDismiss={() => setError('')} />}

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">الاسم الكامل</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="مثال: أحمد علي"
              className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">الرقم الشخصي</label>
            <input
              value={form.personalNumber}
              onChange={(e) => setForm({ ...form, personalNumber: e.target.value })}
              placeholder="XXXXXXX"
              className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">الإقليم الحالي</label>
              <input
                value={(form as any).region || ''}
                onChange={(e) => setForm({ ...form, region: e.target.value } as any)}
                placeholder="اسم الإقليم"
                className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">الوحدة الأمنية الحالية</label>
              <input
                value={form.securityUnit}
                onChange={(e) => setForm({ ...form, securityUnit: e.target.value })}
                placeholder="اسم الوحدة"
                className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">العنوان</label>
            <input
              value={(form as any).title || ''}
              onChange={(e) => setForm({ ...form, title: e.target.value } as any)}
              placeholder="مثال: أمين المستودع بوحدة كذا"
              className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">البريد الإلكتروني</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="ahmed@example.com"
              className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              كلمة المرور {editing && <span className="text-xs text-muted-foreground">(اتركها فارغة للإبقاء على القديمة)</span>}
            </label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={editing ? '••••••••' : 'أدخل كلمة المرور'}
                className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent pl-10"
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">الدور الوظيفي</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            >
              <option value="USER">مستخدم</option>
              <option value="SECTION_CHIEF">رئيس قسم</option>
              <option value="ADMIN">مسؤول</option>
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-medium hover:bg-primary/90 active:bg-primary/80 disabled:opacity-60 transition-colors"
            >
              {loading ? 'جارٍ الحفظ...' : editing ? 'حفظ التعديلات' : 'إضافة المستخدم'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 bg-muted text-foreground rounded-lg py-2.5 text-sm font-medium hover:bg-muted/80 transition-colors"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Delete Confirmation Modal ────────────────────────────────────────────────

interface DeleteModalProps {
  user: any | null
  onClose: () => void
  onConfirm: () => Promise<void>
}

function DeleteModal({ user, onClose, onConfirm }: DeleteModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  if (!user) return null

  const handle = async () => {
    setLoading(true)
    setError('')
    try {
      await onConfirm()
      onClose()
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'حدث خطأ أثناء الحذف')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" dir="rtl">
      <div className="bg-card w-full max-w-sm rounded-xl border border-border shadow-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-destructive/10 rounded-full">
            <Trash2 className="w-5 h-5 text-destructive" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">تأكيد الحذف</h2>
        </div>
        {error && <Alert type="error" message={error} onDismiss={() => setError('')} />}
        <p className="text-sm text-muted-foreground mb-1">هل أنت متأكد من حذف المستخدم:</p>
        <p className="font-semibold text-foreground mb-5">{user.name || user.email}</p>
        <p className="text-xs text-red-500 mb-5 bg-red-50 border border-red-100 rounded-lg p-3">
          ⚠ لا يمكن التراجع عن هذا الإجراء. سيتم حذف المستخدم نهائياً.
        </p>
        <div className="flex gap-3">
          <button
            onClick={handle}
            disabled={loading}
            className="flex-1 bg-red-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-red-700 disabled:opacity-60 transition-colors"
          >
            {loading ? 'جارٍ الحذف...' : 'حذف'}
          </button>
          <button
            onClick={onClose}
            className="px-5 bg-muted text-foreground rounded-lg py-2.5 text-sm font-medium hover:bg-muted/80 transition-colors"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Users Tab ────────────────────────────────────────────────────────────────

function UsersTab() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<any | null>(null)
  const [deletingUser, setDeletingUser] = useState<any | null>(null)
  const [toast, setToast] = useState<{ type: 'error' | 'success'; message: string }>({ type: 'success', message: '' })

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const { data: users = [], isLoading, refetch } = useQuery(
    ['users', debouncedSearch, roleFilter],
    () => fetchUsers(debouncedSearch, roleFilter),
    { keepPreviousData: true },
  )

  const showToast = (type: 'error' | 'success', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast({ type: 'success', message: '' }), 3500)
  }

  const handleSaved = () => {
    queryClient.invalidateQueries(['users'])
    showToast('success', editingUser ? 'تم تحديث المستخدم بنجاح' : 'تمت إضافة المستخدم بنجاح')
    setEditingUser(null)
  }

  const handleDeleteConfirm = async () => {
    await deleteUser(deletingUser.id)
    queryClient.invalidateQueries(['users'])
    showToast('success', 'تم حذف المستخدم بنجاح')
  }

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-3 flex-1 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث باسم أو بريد..."
              className="w-full rounded-lg border border-input bg-background pr-9 pl-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-w-36"
          >
            <option value="">جميع الأدوار</option>
            <option value="ADMIN">مسؤول</option>
            <option value="SECTION_CHIEF">رئيس قسم</option>
            <option value="USER">مستخدم</option>
          </select>
          <button
            onClick={() => refetch()}
            className="p-2.5 rounded-lg border border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
            title="تحديث"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        <button
          onClick={() => { setEditingUser(null); setAddOpen(true) }}
          className="flex items-center gap-2 bg-primary text-primary-foreground rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          إضافة مستخدم
        </button>
      </div>

      {toast.message && (
        <Alert type={toast.type} message={toast.message} onDismiss={() => setToast({ type: 'success', message: '' })} />
      )}

      {/* Table */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-right px-5 py-3.5 font-semibold text-muted-foreground text-xs uppercase tracking-wide">الاسم</th>
                <th className="text-right px-5 py-3.5 font-semibold text-muted-foreground text-xs uppercase tracking-wide">البريد الإلكتروني</th>
                <th className="text-right px-5 py-3.5 font-semibold text-muted-foreground text-xs uppercase tracking-wide">الرقم الشخصي</th>
                <th className="text-right px-5 py-3.5 font-semibold text-muted-foreground text-xs uppercase tracking-wide">الوحدة الأمنية</th>
                <th className="text-right px-5 py-3.5 font-semibold text-muted-foreground text-xs uppercase tracking-wide">الدور</th>
                <th className="text-right px-5 py-3.5 font-semibold text-muted-foreground text-xs uppercase tracking-wide">تاريخ الإنشاء</th>
                <th className="text-center px-5 py-3.5 font-semibold text-muted-foreground text-xs uppercase tracking-wide">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-muted-foreground">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                    جارٍ التحميل...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-muted-foreground">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    لا يوجد مستخدمون مطابقون
                  </td>
                </tr>
              ) : (
                users.map((u: any) => (
                  <tr key={u.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {(u.name ?? u.email).charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-foreground">{u.name || '—'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-muted-foreground" dir="ltr">{u.email}</td>
                    <td className="px-5 py-4">
                      {u.personalNumber
                        ? <span className="font-mono text-foreground bg-muted px-2 py-0.5 rounded text-xs">{u.personalNumber}</span>
                        : <span className="text-muted-foreground text-xs">—</span>}
                    </td>
                    <td className="px-5 py-4 text-foreground text-sm">{u.securityUnit || <span className="text-muted-foreground text-xs">—</span>}</td>
                    <td className="px-5 py-4">
                      <RoleBadge role={u.role} />
                    </td>
                    <td className="px-5 py-4 text-muted-foreground text-xs">
                      {new Date(u.createdAt).toLocaleDateString('en-GB', {
                        year: 'numeric', month: 'short', day: 'numeric',
                      })}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => { setEditingUser(u); setAddOpen(true) }}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                          title="تعديل"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingUser(u)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!isLoading && users.length > 0 && (
          <div className="px-5 py-3 border-t border-border bg-muted/50 text-xs text-muted-foreground">
            إجمالي {users.length} مستخدم
          </div>
        )}
      </div>

      {/* Modals */}
      <UserModal
        open={addOpen}
        editing={editingUser}
        onClose={() => { setAddOpen(false); setEditingUser(null) }}
        onSaved={handleSaved}
      />
      <DeleteModal
        user={deletingUser}
        onClose={() => setDeletingUser(null)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  )
}

// ─── Audit Log Tab ────────────────────────────────────────────────────────────

function AuditTab() {
  const { data: logs = [], isLoading, refetch } = useQuery(['audit'], fetchAuditLogs, { refetchInterval: 30000 })

  const formatAction = (action: string) =>
    action === 'CREATE_USER' ? 'إضافة' : action === 'UPDATE_USER' ? 'تعديل' : action === 'DELETE_USER' ? 'حذف' : action

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">آخر 300 إجراء</p>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg px-3 py-1.5 hover:bg-muted/50"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          تحديث
        </button>
      </div>
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-right px-5 py-3.5 font-semibold text-muted-foreground text-xs uppercase">الإجراء</th>
                <th className="text-right px-5 py-3.5 font-semibold text-muted-foreground text-xs uppercase">الكيان</th>
                <th className="text-right px-5 py-3.5 font-semibold text-muted-foreground text-xs uppercase">المنفذ</th>
                <th className="text-right px-5 py-3.5 font-semibold text-muted-foreground text-xs uppercase">التفاصيل</th>
                <th className="text-right px-5 py-3.5 font-semibold text-muted-foreground text-xs uppercase">التاريخ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-muted-foreground">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                    جارٍ التحميل...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">
                    <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    لا توجد سجلات مراجعة بعد
                  </td>
                </tr>
              ) : (
                logs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full ${AUDIT_ACTION_COLORS[log.action] ?? 'bg-muted text-muted-foreground'}`}>
                        {formatAction(log.action)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground">
                      {log.entity}{log.entityId ? ` #${log.entityId}` : ''}
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground text-xs" dir="ltr">
                      {log.actorEmail ?? '—'}
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground text-xs max-w-xs truncate">
                      {log.details
                        ? (() => {
                            try {
                              const p = JSON.parse(log.details)
                              return Object.entries(p)
                                .map(([k, v]) => `${k}: ${v}`)
                                .join(' | ')
                            } catch {
                              return log.details
                            }
                          })()
                        : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground text-xs whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString('en-GB')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Data Management Tab ─────────────────────────────────────────────────────

// Arabic labels for each data table key
const TABLE_LABELS: Record<string, { label: string; icon: string }> = {
  users:             { label: 'المستخدمون',          icon: '👤' },
  items:             { label: 'الأصناف',              icon: '📦' },
  entities:          { label: 'الجهات',               icon: '🏢' },
  employees:         { label: 'الموظفون',             icon: '👷' },
  receptions:        { label: 'المدخلات',             icon: '📥' },
  receptionItems:    { label: 'تفاصيل الدخل',          icon: '📋' },
  distributions:     { label: 'عمليات التسليم',       icon: '📤' },
  distributionItems: { label: 'تفاصيل التسليم',       icon: '📄' },
  logs:              { label: 'السجلات',              icon: '🗂️' },
  budgets:           { label: 'الاعتمادات المالية',   icon: '💰' },
  budgetExpenses:    { label: 'مصاريف الاعتمادات',    icon: '🧾' },
}

function DataTab() {
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery(['dbStats'], fetchDbStats, { refetchInterval: 30000 })
  const [exportLoading, setExportLoading] = useState(false)
  const [importLoading, setImportLoading] = useState(false)
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge')
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importPreview, setImportPreview] = useState<any | null>(null)
  const [importError, setImportError] = useState('')
  const [importResult, setImportResult] = useState<Record<string, number> | null>(null)
  const [toast, setToast] = useState<{ type: 'error' | 'success'; message: string }>({ type: 'success', message: '' })
  const [confirmReplace, setConfirmReplace] = useState(false)

  const showToast = (type: 'error' | 'success', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast({ type: 'success', message: '' }), 5000)
  }

  // ── Export ────────────────────────────────────────────────────────────────
  const handleExport = async () => {
    setExportLoading(true)
    try {
      const res = await client.get('/data/export')
      const json = JSON.stringify(res.data, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `warehouse-backup-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      showToast('success', 'تم تنزيل نسخة احتياطية بنجاح ✓')
    } catch (err: any) {
      showToast('error', err?.response?.data?.error ?? 'فشل التصدير')
    } finally {
      setExportLoading(false)
    }
  }

  // ── File picker ───────────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    setImportFile(file)
    setImportPreview(null)
    setImportError('')
    setImportResult(null)
    setConfirmReplace(false)
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string)
        if (!parsed?.data || typeof parsed.data !== 'object') {
          setImportError('الملف لا يحتوي على بيانات صالحة — تأكد أنه ملف نسخة احتياطية صحيح')
          return
        }
        setImportPreview(parsed)
      } catch {
        setImportError('الملف ليس JSON صالحاً أو تالف')
      }
    }
    reader.readAsText(file)
  }

  // ── Reset file ────────────────────────────────────────────────────────────
  const resetImport = () => {
    setImportFile(null)
    setImportPreview(null)
    setImportError('')
    setImportResult(null)
    setConfirmReplace(false)
  }

  // ── Import ────────────────────────────────────────────────────────────────
  const handleImport = async () => {
    if (!importPreview) return
    if (importMode === 'replace' && !confirmReplace) {
      setConfirmReplace(true)
      return
    }
    setImportLoading(true)
    setImportError('')
    setImportResult(null)
    try {
      const res = await client.post('/data/import', { data: importPreview.data, mode: importMode })
      const { stats: importStats } = res.data.data
      setImportResult(importStats)
      const total = Object.values(importStats as Record<string, number>).reduce((a, b) => a + b, 0)
      showToast('success', `تم الاستيراد بنجاح — ${total} سجل إجمالاً ✓`)
      resetImport()
      refetchStats()
    } catch (err: any) {
      setImportError(err?.response?.data?.error ?? 'فشل الاستيراد — تحقق من الملف وحاول مجدداً')
    } finally {
      setImportLoading(false)
    }
  }

  const statRows = [
    { label: 'الأصناف',              key: 'items',             icon: '📦', color: 'bg-blue-50   border-blue-100  text-blue-700'  },
    { label: 'المستخدمون',           key: 'users',             icon: '👤', color: 'bg-purple-50 border-purple-100 text-purple-700'},
    { label: 'الجهات',               key: 'entities',          icon: '🏢', color: 'bg-orange-50 border-orange-100 text-orange-700'},
    { label: 'الموظفون',             key: 'employees',         icon: '👷', color: 'bg-teal-50   border-teal-100  text-teal-700'  },
    { label: 'المدخلات',             key: 'receptions',        icon: '📥', color: 'bg-green-50  border-green-100 text-green-700' },
    { label: 'عمليات التسليم',       key: 'distributions',     icon: '📤', color: 'bg-red-50    border-red-100   text-red-700'   },
    { label: 'تفاصيل الدخل',          key: 'receptionItems',    icon: '📋', color: 'bg-muted border-border text-muted-foreground'},
    { label: 'تفاصيل التسليم',       key: 'distributionItems', icon: '📄', color: 'bg-muted border-border text-muted-foreground'},
    { label: 'الاعتمادات المالية',   key: 'budgets',           icon: '💰', color: 'bg-yellow-50 border-yellow-100 text-yellow-700'},
    { label: 'مصاريف الاعتمادات',   key: 'budgetExpenses',    icon: '🧾', color: 'bg-amber-50  border-amber-100  text-amber-700' },
  ]

  return (
    <div className="space-y-6">
      {toast.message && (
        <Alert type={toast.type} message={toast.message} onDismiss={() => setToast({ type: 'success', message: '' })} />
      )}

      {/* ── Database Stats ── */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Database className="w-5 h-5 text-muted-foreground" />
            إحصائيات قاعدة البيانات
          </h2>
          <button
            onClick={() => refetchStats()}
            className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            title="تحديث"
          >
            <RefreshCw className={`w-4 h-4 ${statsLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {statRows.map(({ label, key, icon, color }) => (
            <div key={key} className={`border rounded-xl p-4 text-center ${color}`}>
              <div className="text-2xl mb-1">{icon}</div>
              <div className="text-2xl font-bold">
                {statsLoading ? '…' : ((stats as any)?.[key] ?? 0)}
              </div>
              <div className="text-xs mt-0.5 opacity-80">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Export ── */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 bg-green-100 rounded-lg shrink-0">
            <Download className="w-5 h-5 text-green-700" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">تصدير نسخة احتياطية</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              تنزيل كامل البيانات (أصناف، مستخدمون، جهات، موظفون، مدخلات، مخرجات، سجلات) بصيغة JSON
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3.5 bg-amber-50 border border-amber-200 rounded-lg mb-5 text-sm text-amber-700">
          <Info className="w-4 h-4 shrink-0" />
          <span>كلمات المرور غير مُصدَّرة لأسباب أمنية. عند الاستيراد ستكون كلمة المرور الافتراضية: <strong dir="ltr">admin123</strong></span>
        </div>

        <button
          onClick={handleExport}
          disabled={exportLoading}
          className="flex items-center gap-2 bg-green-600 text-white rounded-lg px-5 py-2.5 text-sm font-semibold hover:bg-green-700 active:bg-green-800 disabled:opacity-60 transition-colors shadow-sm"
        >
          {exportLoading ? (
            <><RefreshCw className="w-4 h-4 animate-spin" /> جارٍ التصدير...</>
          ) : (
            <><Download className="w-4 h-4" /> تنزيل نسخة احتياطية (JSON)</>
          )}
        </button>
      </div>

      {/* ── Import ── */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-6">
        <div className="flex items-start gap-3 mb-5">
          <div className="p-2 bg-primary/10 rounded-lg shrink-0">
            <Upload className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">استيراد نسخة احتياطية</h2>
            <p className="text-sm text-muted-foreground mt-0.5">

              استيراد بيانات من ملف JSON تم تنزيله مسبقاً. يتم الحفاظ على جميع المعرّفات الأصلية لضمان سلامة الروابط.
            </p>
          </div>
        </div>

        {/* Mode selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          {/* Merge */}
          <button
            type="button"
            onClick={() => { setImportMode('merge'); setConfirmReplace(false) }}
            className={`flex items-start gap-3 p-4 rounded-xl border-2 text-right transition-colors ${
              importMode === 'merge' ? 'border-blue-500 bg-blue-50' : 'border-border hover:border-border bg-card'
            }`}
          >
            <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
              importMode === 'merge' ? 'border-blue-500 bg-blue-500' : 'border-border'
            }`}>
              {importMode === 'merge' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
            </div>
            <div>
              <p className={`text-sm font-semibold ${importMode === 'merge' ? 'text-blue-700' : 'text-foreground'}`}>
                دمج <span className="font-normal text-xs opacity-70">(موصى به)</span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">إضافة وتحديث البيانات دون حذف الموجود حالياً</p>
            </div>
          </button>

          {/* Replace */}
          <button
            type="button"
            onClick={() => { setImportMode('replace'); setConfirmReplace(false) }}
            className={`flex items-start gap-3 p-4 rounded-xl border-2 text-right transition-colors ${
              importMode === 'replace' ? 'border-red-500 bg-red-50' : 'border-border hover:border-border bg-card'
            }`}
          >
            <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
              importMode === 'replace' ? 'border-red-500 bg-red-500' : 'border-border'
            }`}>
              {importMode === 'replace' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
            </div>
            <div>
              <p className={`text-sm font-semibold ${importMode === 'replace' ? 'text-red-700' : 'text-foreground'}`}>
                استبدال كامل <span className="text-xs">⚠</span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">حذف جميع البيانات الحالية ثم إعادة الاستيراد من الملف</p>
            </div>
          </button>
        </div>

        {/* File picker */}
        <label className="relative flex flex-col items-center justify-center gap-3 border-2 border-dashed border-border rounded-xl p-8 cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors mb-4 group">
          <FileJson className="w-10 h-10 text-muted-foreground/50 group-hover:text-primary transition-colors" />
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">
              {importFile ? (
                <span className="text-blue-600 flex items-center gap-1.5 justify-center">
                  <CheckCircle className="w-4 h-4" />
                  {importFile.name}
                </span>
              ) : (
                'اسحب ملف JSON هنا أو انقر للاختيار'
              )}
            </p>
            <p className="text-xs text-muted-foreground mt-1">ملفات .json فقط — نسخ احتياطية هذا التطبيق</p>
          </div>
          <input type="file" accept=".json,application/json" className="hidden" onChange={handleFileChange} />
          {importFile && (
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); resetImport() }}
              className="absolute top-3 left-3 p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </label>

        {/* Error */}
        {importError && (
          <Alert type="error" message={importError} onDismiss={() => setImportError('')} />
        )}

        {/* Preview */}
        {importPreview && !importError && (
          <div className="mb-5 bg-muted/50 border border-border rounded-xl p-4">
            <p className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-green-500" />
              معاينة الملف
              {importPreview.exportedAt && (
                <span className="font-normal text-muted-foreground mr-auto">
                  تاريخ التصدير: {new Date(importPreview.exportedAt).toLocaleString('en-GB')}
                </span>
              )}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(importPreview.data as Record<string, any[]>).map(([key, arr]) => {
                const meta = TABLE_LABELS[key]
                return (
                  <div key={key} className="bg-card border border-border rounded-lg px-3 py-2.5 flex items-center gap-2">
                    <span className="text-xl">{meta?.icon ?? '📁'}</span>
                    <div>
                      <p className="text-xs font-semibold text-foreground">{meta?.label ?? key}</p>
                      <p className="text-xs text-muted-foreground">{Array.isArray(arr) ? arr.length : '—'} سجل</p>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                ستكون كلمة مرور جميع المستخدمين المستوردين: <strong dir="ltr">admin123</strong> — يُنصح بتغييرها بعد الاستيراد
              </p>
            </div>
          </div>
        )}

        {/* Replace confirmation warning */}
        {confirmReplace && importMode === 'replace' && (
          <div className="flex items-start gap-3 p-4 bg-red-50 border-2 border-red-300 rounded-xl mb-4">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-red-700">تحذير: سيتم حذف جميع البيانات الحالية!</p>
              <p className="text-xs text-red-600 mt-1">
                سيُحذف كل شيء (أصناف، جهات، موظفون، مدخلات، مخرجات، سجلات، مستخدمون) واستبداله بالبيانات الجديدة.
                <strong> لا يمكن التراجع عن هذا الإجراء.</strong>
              </p>
              <p className="text-xs text-red-600 mt-1">اضغط مرة أخرى للتأكيد والمتابعة.</p>
            </div>
          </div>
        )}

        {/* Import result */}
        {importResult && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-green-700 mb-3 flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4" />
              تم الاستيراد بنجاح
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(importResult).map(([key, count]) => {
                const meta = TABLE_LABELS[key]
                return (
                  <div key={key} className="bg-card border border-green-100 rounded-lg px-3 py-2 flex items-center gap-2">
                    <span className="text-lg">{meta?.icon ?? '✅'}</span>
                    <div>
                      <p className="text-xs font-semibold text-foreground">{meta?.label ?? key}</p>
                      <p className="text-xs text-green-600">{count} سجل</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Submit button */}
        <button
          onClick={handleImport}
          disabled={!importPreview || !!importError || importLoading}
          className={`flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold disabled:opacity-50 transition-colors shadow-sm ${
            confirmReplace
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {importLoading ? (
            <><RefreshCw className="w-4 h-4 animate-spin" /> جارٍ الاستيراد...</>
          ) : confirmReplace ? (
            <><AlertTriangle className="w-4 h-4" /> تأكيد الاستبدال الكامل</>
          ) : (
            <><Upload className="w-4 h-4" /> استيراد البيانات</>
          )}
        </button>
      </div>
    </div>
  )
}

// ─── Main Settings Page ───────────────────────────────────────────────────────

type Tab = 'users' | 'audit' | 'data'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('users')
  const { user } = useContext(AuthContext)
  const isAdmin = user?.role === 'ADMIN'

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'users', label: 'إدارة المستخدمين', icon: <Users className="w-4 h-4" /> },
    { key: 'audit', label: 'سجل المراجعة', icon: <ClipboardList className="w-4 h-4" /> },
    { key: 'data', label: 'إدارة البيانات', icon: <Database className="w-4 h-4" /> },
  ]

  return (
    <div dir="rtl" className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start gap-4">
        <div className="p-3 bg-primary/10 rounded-xl">
          <Settings className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">الإعدادات</h1>
          <p className="text-sm text-muted-foreground mt-0.5">إدارة المستخدمين والصلاحيات وسجل الأحداث والنسخ الاحتياطي</p>
        </div>
      </div>

      {!isAdmin && (
        <div className="flex items-center gap-2 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          لديك صلاحية القراءة فقط. تواصل مع المسؤول لإجراء تعديلات.
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex gap-1" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'users' && <UsersTab />}
      {activeTab === 'audit' && <AuditTab />}
      {activeTab === 'data' && <DataTab />}
    </div>
  )
}
