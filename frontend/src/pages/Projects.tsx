import { useState, useMemo, useContext } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'
import client from '../services/client'
import {
  HardHat, Plus, Search, X, Pencil, Trash2,
  DollarSign, CalendarDays, Building2, ChevronDown,
  BadgePercent, FileText, AlertTriangle, CheckCircle2,
  BookOpen, Hammer, ShieldAlert, BarChart3, Printer
} from 'lucide-react'

/* ─── Types ─────────────────────────────────────────────────── */
interface EntityOption { id: number; name: string; type: string; category: string }

interface Project {
  id: number
  name: string
  type: 'CONSTRUCTION' | 'DEVELOPMENT' | 'PROTECTION'
  status: 'STUDY' | 'WORK' | 'COMPLETED' | 'SUSPENDED'
  entityId: number
  entity: EntityOption
  progress: number
  budget: number
  budgetYear: number
  extraBudget?: number
  extraBudgetYear?: number
  startDate?: string
  expectedEndDate?: string
  notes?: string
  securityUnit?: string
  createdAt: string
}

/* ─── Labels / helpers ──────────────────────────────────────── */
const TYPE_LABELS: Record<string, string> = {
  CONSTRUCTION: 'بناء',
  DEVELOPMENT:  'تهيئة',
  PROTECTION:   'حماية وتسييج',
  OTHER:        'أخرى',
}
const STATUS_LABELS: Record<string, string> = {
  STUDY:     'طور الدراسات',
  WORK:      'طور الأشغال',
  COMPLETED: 'مكتمل',
  SUSPENDED: 'موقوف',
}
const STATUS_BADGE: Record<string, string> = {
  STUDY:     'bg-blue-100 text-blue-700 border border-blue-200',
  WORK:      'bg-green-100 text-green-700 border border-green-200',
  COMPLETED: 'bg-slate-100 text-slate-600 border border-slate-200',
  SUSPENDED: 'bg-red-100 text-red-600 border border-red-200',
}
const STATUS_ICON: Record<string, JSX.Element> = {
  STUDY:     <BookOpen className="w-3 h-3" />,
  WORK:      <Hammer   className="w-3 h-3" />,
  COMPLETED: <CheckCircle2 className="w-3 h-3" />,
  SUSPENDED: <AlertTriangle className="w-3 h-3" />,
}
const TYPE_DOT: Record<string, string> = {
  CONSTRUCTION: 'bg-orange-500',
  DEVELOPMENT:  'bg-violet-500',
  PROTECTION:   'bg-teal-500',
}
const PROGRESS_BAR = (p: number) => {
  if (p >= 100) return 'bg-emerald-500'
  if (p >= 60)  return 'bg-blue-500'
  if (p >= 30)  return 'bg-amber-400'
  return 'bg-red-400'
}
const fmt = (n: number) => n.toLocaleString('ar-TN')

/* ─── PDF Export ────────────────────────────────────────────── */
async function exportProjectsPDF(
  projects: Project[],
  user: { title?: string; securityUnit?: string; region?: string; regionChief?: string; name: string } | null,
) {
  const activeProjects = projects.filter(p => p.status === 'STUDY' || p.status === 'WORK')
  const today = new Date().toLocaleDateString('ar-TN', { year: 'numeric', month: 'long', day: 'numeric' })
  const unit             = user?.securityUnit || '—'
  const region           = user?.region       || '—'
  const title            = user?.title        || ''
  const regionChief      = user?.regionChief  || ''
  const _r = (user?.securityUnit || '').trim()
  const regionChiefLabel = _r.startsWith('فوج') ? 'امر فوج' : _r.startsWith('اقليم') || _r.startsWith('إقليم') ? 'مدير الاقليم' : _r.startsWith('منطقة') || _r.startsWith('المنطقة') ? 'رئيس المنطقة' : 'رئيس المنطقة'

  const rows = activeProjects.map((p, i) => [
    String(i + 1),
    p.name,
    TYPE_LABELS[p.type]   || p.type,
    p.entity?.name        || '—',
    p.budget ? fmt(p.budget) : '—',
    String(p.budgetYear  || '—'),
    p.extraBudget ? fmt(p.extraBudget) : '—',
    String(p.extraBudgetYear || '—'),
    STATUS_LABELS[p.status] || p.status,
    `${p.progress}%`,
    p.notes || '—',
  ])

  const headers = ['العدد', 'اسم المشروع', 'نوع المشروع', 'المقر الأمني المستفيد',
    'الاعتماد الأصلي', 'السنة', 'الاعتماد الإضافي', 'السنة', 'الحالة الحالية', 'نسبة التقدم', 'الملاحظات']

  const el = document.createElement('div')
  el.style.cssText = "direction:rtl;font-family:'Cairo','Tahoma',sans-serif;background:#fff;padding:32px 36px;width:1400px;color:#000;position:absolute;left:-9999px;top:0;z-index:-1;"

  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;">
      <div style="text-align:center;line-height:2.2;">
        <div style="font-weight:800;font-size:20px;color:#000;">الإدارة العامة للحرس الوطني</div>
        <div style="font-size:16px;color:#000;">${region}</div>
        ${region !== unit ? `<div style="font-size:16px;color:#000;">${unit}</div>` : ''}
        <div style="font-size:16px;color:#000;text-align:right;">عدد</div>
      </div>
    </div>

    <div style="text-align:center;margin:10px 0 30px;">
      <span style="font-size:22px;font-weight:800;color:#000;border-bottom:2px solid #000;padding-bottom:4px;">
        كشف في المشاريع الجارية (${unit})
      </span>
    </div>

    <table style="width:100%;border-collapse:collapse;font-size:13px;border:2px solid #000;">
      <thead>
        <tr style="border-bottom:2px solid #000;">
          ${headers.map(h => `<th style="padding:8px 5px;text-align:center;vertical-align:middle;border-left:1.5px solid #000;white-space:nowrap;font-weight:700;">${h}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${rows.length === 0
          ? `<tr><td colspan="${headers.length}" style="text-align:center;padding:20px;color:#000;">لا توجد مشاريع نشطة</td></tr>`
          : rows.map((row) => `
          <tr style="border-bottom:1px solid #000;">
            ${row.map(c => `<td style="padding:7px 5px;border-left:1px solid #000;text-align:center;vertical-align:middle;">${c}</td>`).join('')}
          </tr>`).join('')}
      </tbody>
    </table>

    <div style="margin-top:40px;display:flex;justify-content:flex-end;">
      <div style="text-align:center;">
        <div style="font-size:16px;color:#000;line-height:1.9;margin-bottom:8px;">
          <span style="font-weight:700;color:#000;">${title}</span> في : ${today}
        </div>
        <div style="font-weight:700;font-size:16px;color:#000;">${regionChiefLabel}</div>
        ${regionChief ? `<div style="font-size:16px;color:#000;margin-top:6px;">${regionChief}</div>` : ''}
      </div>
    </div>`

  document.body.appendChild(el)
  try {
    const { jsPDF }    = await import('jspdf')
    const html2canvas  = await import('html2canvas')
    const canvas = await html2canvas.default(el, { scale: 2, backgroundColor: '#fff', useCORS: true, logging: false })
    const imgData = canvas.toDataURL('image/png')
    const pw = 297; const iw = pw - 14; const ih = (canvas.height * iw) / canvas.width
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const pageH = 200
    let y = 0; let page = 0
    while (y < ih) {
      if (page > 0) doc.addPage()
      doc.addImage(imgData, 'PNG', 7, 7 - y, iw, ih)
      y += pageH; page++
    }
    doc.save(`كشف-المشاريع-الجارية-${unit}-${new Date().getFullYear()}.pdf`)
  } finally { el.remove() }
}

/* ─── Empty form ────────────────────────────────────────────── */
const EMPTY_FORM = {
  name: '',
  type: 'CONSTRUCTION' as const,
  status: 'STUDY' as const,
  entityId: '',
  progress: 0,
  budget: '',
  budgetYear: new Date().getFullYear(),
  extraBudget: '',
  extraBudgetYear: '',
  startDate: '',
  expectedEndDate: '',
  notes: '',
}

/* ═══════════════════════════════════════════════════════════════ */
export default function Projects() {
  const qc = useQueryClient()
  const { user } = useContext(AuthContext)
  const canEdit = user?.role === 'SECTION_CHIEF' || user?.role === 'ADMIN'

  /* filters */
  const [search,     setSearch]     = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [yearFilter,   setYearFilter]   = useState('')
  const [showFilters, setShowFilters]   = useState(false)

  /* modal */
  const [showModal, setShowModal]   = useState(false)
  const [editing,   setEditing]     = useState<Project | null>(null)
  const [form,      setForm]        = useState({ ...EMPTY_FORM })
  const [saving,    setSaving]      = useState(false)
  const [formErr,   setFormErr]     = useState('')

  /* delete */
  const [delId,  setDelId]  = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  /* ── Queries ──────────────────────────────────────────────── */
  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await client.get('/projects')
      return res.data.data
    },
  })

  const { data: entities = [] } = useQuery<EntityOption[]>({
    queryKey: ['entities-options'],
    queryFn: async () => {
      const res = await client.get('/entities')
      return (res.data.data as EntityOption[]).filter(e => e.type === 'BENEFICIARY')
    },
  })

  /* ── Stats ────────────────────────────────────────────────── */
  const stats = useMemo(() => ({
    total:     projects.length,
    study:     projects.filter(p => p.status === 'STUDY').length,
    work:      projects.filter(p => p.status === 'WORK').length,
    completed: projects.filter(p => p.status === 'COMPLETED').length,
    suspended: projects.filter(p => p.status === 'SUSPENDED').length,
  }), [projects])

  /* ── Filtered list ────────────────────────────────────────── */
  const filtered = useMemo(() => {
    return projects.filter(p => {
      if (typeFilter   && p.type   !== typeFilter)   return false
      if (statusFilter && p.status !== statusFilter) return false
      if (yearFilter   && String(p.budgetYear) !== yearFilter) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        if (
          !p.name.toLowerCase().includes(q) &&
          !p.entity?.name.toLowerCase().includes(q) &&
          !(p.notes || '').toLowerCase().includes(q)
        ) return false
      }
      return true
    })
  }, [projects, typeFilter, statusFilter, yearFilter, search])

  const years = useMemo(() => {
    const ys = new Set(projects.map(p => String(p.budgetYear)))
    return Array.from(ys).sort((a, b) => Number(b) - Number(a))
  }, [projects])

  /* ── Modal helpers ────────────────────────────────────────── */
  const openAdd = () => {
    setEditing(null)
    setForm({ ...EMPTY_FORM })
    setFormErr('')
    setShowModal(true)
  }
  const openEdit = (p: Project) => {
    setEditing(p)
    setForm({
      name:            p.name,
      type:            p.type,
      status:          p.status,
      entityId:        String(p.entityId),
      progress:        p.progress,
      budget:          String(p.budget),
      budgetYear:      p.budgetYear,
      extraBudget:     p.extraBudget != null ? String(p.extraBudget) : '',
      extraBudgetYear: p.extraBudgetYear != null ? String(p.extraBudgetYear) : '',
      startDate:       p.startDate ? p.startDate.slice(0, 10) : '',
      expectedEndDate: p.expectedEndDate ? p.expectedEndDate.slice(0, 10) : '',
      notes:           p.notes || '',
    })
    setFormErr('')
    setShowModal(true)
  }
  const closeModal = () => { setShowModal(false); setEditing(null) }

  const handleSave = async () => {
    if (!form.name.trim())  { setFormErr('اسم المشروع مطلوب'); return }
    if (!form.entityId)     { setFormErr('يجب اختيار المقر الأمني المستفيد'); return }
    if (!form.budget)       { setFormErr('الاعتماد الأصلي مطلوب'); return }
    setFormErr(''); setSaving(true)
    try {
      const payload: any = {
        name:            form.name.trim(),
        type:            form.type,
        status:          form.status,
        entityId:        Number(form.entityId),
        progress:        Number(form.progress),
        budget:          Number(form.budget),
        budgetYear:      Number(form.budgetYear),
        extraBudget:     form.extraBudget     ? Number(form.extraBudget)     : null,
        extraBudgetYear: form.extraBudgetYear ? Number(form.extraBudgetYear) : null,
        startDate:       form.startDate       || null,
        expectedEndDate: form.expectedEndDate || null,
        notes:           form.notes.trim()    || null,
      }
      if (editing) {
        await client.patch(`/projects/${editing.id}`, payload)
      } else {
        await client.post('/projects', payload)
      }
      await qc.invalidateQueries({ queryKey: ['projects'] })
      closeModal()
    } catch (e: any) {
      setFormErr(e?.response?.data?.error || 'حدث خطأ')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!delId) return
    setDeleting(true)
    try {
      await client.delete(`/projects/${delId}`)
      await qc.invalidateQueries({ queryKey: ['projects'] })
      setDelId(null)
    } catch (e: any) {
      alert(e?.response?.data?.error || 'حدث خطأ')
    } finally {
      setDeleting(false)
    }
  }

  /* ─────────────────────────────────────────────────────────── */
  return (
    <div dir="rtl" className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <HardHat className="w-6 h-6 text-primary" />
            المشاريع الجارية
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">متابعة نسبة تقدم مشاريع البناء والتهيئة والحماية</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => exportProjectsPDF(projects, user)}
            className="flex items-center gap-2 bg-white border border-border text-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:bg-muted transition"
            title="تصدير تقرير PDF"
          >
            <Printer className="w-4 h-4 text-red-500" />
            تصدير PDF
          </button>
          {canEdit && (
            <button
              onClick={openAdd}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary/90 transition"
            >
              <Plus className="w-4 h-4" />
              مشروع جديد
            </button>
          )}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: 'إجمالي المشاريع', value: stats.total,     icon: <HardHat className="w-5 h-5" />,       color: 'text-primary',    bg: 'bg-primary/10',    border: 'border-l-primary' },
          { label: 'طور الدراسات',    value: stats.study,     icon: <BookOpen className="w-5 h-5" />,       color: 'text-blue-600',   bg: 'bg-blue-50',       border: 'border-l-blue-500' },
          { label: 'طور الأشغال',     value: stats.work,      icon: <Hammer className="w-5 h-5" />,         color: 'text-green-600',  bg: 'bg-green-50',      border: 'border-l-green-500' },
          { label: 'مكتملة',          value: stats.completed, icon: <CheckCircle2 className="w-5 h-5" />,   color: 'text-slate-600',  bg: 'bg-slate-100',     border: 'border-l-slate-400' },
          { label: 'موقوفة',          value: stats.suspended, icon: <AlertTriangle className="w-5 h-5" />,  color: 'text-red-600',    bg: 'bg-red-50',        border: 'border-l-red-500' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border border-border bg-card p-4 border-l-4 ${s.border}`}>
            <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center mb-2 ${s.color}`}>
              {s.icon}
            </div>
            <div className="text-2xl font-bold text-foreground">{s.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="بحث بالاسم أو المقر الأمني..."
              className="w-full pr-9 pl-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition ${
              showFilters || typeFilter || statusFilter || yearFilter
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-background text-muted-foreground hover:text-foreground'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            تصفية
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {showFilters && (
          <div className="mt-3 pt-3 border-t border-border grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1 block">نوع المشروع</label>
              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">الكل</option>
                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1 block">الحالة</label>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">الكل</option>
                {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1 block">سنة الاعتماد</label>
              <select
                value={yearFilter}
                onChange={e => setYearFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">الكل</option>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Results count */}
      {(search || typeFilter || statusFilter || yearFilter) && (
        <p className="text-sm text-muted-foreground">
          {filtered.length} نتيجة من أصل {projects.length}
          <button
            onClick={() => { setSearch(''); setTypeFilter(''); setStatusFilter(''); setYearFilter('') }}
            className="mr-2 text-primary hover:underline text-xs"
          >
            مسح الفلاتر
          </button>
        </p>
      )}

      {/* Cards grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24 text-muted-foreground">
          <HardHat className="w-8 h-8 animate-pulse opacity-30" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground rounded-xl border border-dashed border-border bg-card">
          <HardHat className="w-10 h-10 opacity-20 mb-3" />
          <p className="text-base font-medium">لا توجد مشاريع</p>
          <p className="text-sm mt-1 opacity-70">{canEdit ? 'أضف مشروعاً جديداً للبدء' : 'لم يتم تسجيل أي مشروع بعد'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map(p => (
            <ProjectCard
              key={p.id}
              project={p}
              canEdit={canEdit}
              onEdit={() => openEdit(p)}
              onDelete={() => setDelId(p.id)}
            />
          ))}
        </div>
      )}

      {/* ── Add / Edit Modal ─────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-border" dir="rtl">
            <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card z-10">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <HardHat className="w-5 h-5 text-primary" />
                {editing ? 'تعديل المشروع' : 'مشروع جديد'}
              </h2>
              <button onClick={closeModal} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {formErr && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2.5 rounded-lg">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {formErr}
                </div>
              )}

              {/* Row 1: Name */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">اسم المشروع *</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="مثال: مشروع بناء مقر الفرقة الفلانية"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {/* Row 2: type + status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">نوع المشروع *</label>
                  <select
                    value={form.type}
                    onChange={e => setForm(f => ({ ...f, type: e.target.value as any }))}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">الحالة الحالية *</label>
                  <select
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>

              {/* Row 3: entity */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">المقر الأمني المستفيد *</label>
                <select
                  value={form.entityId}
                  onChange={e => setForm(f => ({ ...f, entityId: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">— اختر الجهة —</option>
                  {entities.map(e => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </div>

              {/* Row 4: progress */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center justify-between">
                  <span>نسبة التقدم *</span>
                  <span className="text-primary font-bold text-sm">{form.progress}%</span>
                </label>
                <input
                  type="range"
                  min={0} max={100} step={1}
                  value={form.progress}
                  onChange={e => setForm(f => ({ ...f, progress: Number(e.target.value) }))}
                  className="w-full accent-primary"
                />
                <div className="mt-1.5 h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all ${PROGRESS_BAR(form.progress)}`}
                    style={{ width: `${form.progress}%` }}
                  />
                </div>
              </div>

              {/* Row 5: budget + year */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">الاعتماد الأصلي (د.ت) *</label>
                  <input
                    type="number" min={0}
                    value={form.budget}
                    onChange={e => setForm(f => ({ ...f, budget: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">سنة الاعتماد *</label>
                  <input
                    type="number" min={2000} max={2100}
                    value={form.budgetYear}
                    onChange={e => setForm(f => ({ ...f, budgetYear: Number(e.target.value) }))}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>

              {/* Row 6: extra budget + year */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">اعتماد إضافي (د.ت) — اختياري</label>
                  <input
                    type="number" min={0}
                    value={form.extraBudget}
                    onChange={e => setForm(f => ({ ...f, extraBudget: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">سنة الاعتماد الإضافي</label>
                  <input
                    type="number" min={2000} max={2100}
                    value={form.extraBudgetYear}
                    onChange={e => setForm(f => ({ ...f, extraBudgetYear: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="—"
                  />
                </div>
              </div>

              {/* Row 7: dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">تاريخ البدء</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">تاريخ الانتهاء</label>
                  <input
                    type="date"
                    value={form.expectedEndDate}
                    onChange={e => setForm(f => ({ ...f, expectedEndDate: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>

              {/* Row 8: notes */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">ملاحظات</label>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="أي ملاحظات إضافية حول المشروع..."
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-5 border-t border-border sticky bottom-0 bg-card">
              <button onClick={closeModal} className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition">
                إلغاء
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-60"
              >
                {saving ? '...جاري الحفظ' : editing ? 'حفظ التعديلات' : 'إضافة المشروع'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirm ───────────────────────────────────── */}
      {delId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm border border-border p-6" dir="rtl">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">حذف المشروع</h3>
                <p className="text-sm text-muted-foreground mt-1">هل أنت متأكد من حذف هذا المشروع؟ لا يمكن التراجع عن هذا الإجراء.</p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDelId(null)} className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition">
                إلغاء
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition disabled:opacity-60"
              >
                {deleting ? '...جاري الحذف' : 'حذف'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── ProjectCard component ─────────────────────────────────── */
interface CardProps {
  project: Project
  canEdit: boolean
  onEdit: () => void
  onDelete: () => void
}
function ProjectCard({ project: p, canEdit, onEdit, onDelete }: CardProps) {
  const total = p.budget + (p.extraBudget ?? 0)
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden hover:shadow-md transition-shadow flex flex-col">
      {/* Color bar */}
      <div className={`h-1.5 w-full ${TYPE_DOT[p.type]}`} />

      <div className="p-5 flex flex-col flex-1 gap-3">
        {/* Top row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${STATUS_BADGE[p.status]}`}>
                {STATUS_ICON[p.status]}
                {STATUS_LABELS[p.status]}
              </span>
              <span className="text-xs text-muted-foreground">{TYPE_LABELS[p.type]}</span>
            </div>
            <h3 className="font-bold text-foreground text-sm leading-snug">{p.name}</h3>
          </div>
          {canEdit && (
            <div className="flex gap-1 shrink-0">
              <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition">
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Entity */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Building2 className="w-3.5 h-3.5 shrink-0" />
          <Link
            to={`/entities/${p.entityId}`}
            className="font-medium text-foreground hover:text-primary transition truncate"
            title={p.entity?.name}
          >
            {p.entity?.name ?? '—'}
          </Link>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-muted-foreground">نسبة الإنجاز</span>
            <span className={`font-bold ${p.progress >= 100 ? 'text-emerald-600' : p.progress >= 60 ? 'text-blue-600' : p.progress >= 30 ? 'text-amber-600' : 'text-red-500'}`}>
              {p.progress}%
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={`h-2 rounded-full transition-all ${PROGRESS_BAR(p.progress)}`}
              style={{ width: `${p.progress}%` }}
            />
          </div>
        </div>

        {/* Budget info */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg bg-muted/50 px-3 py-2">
            <div className="text-muted-foreground mb-0.5 flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              الاعتماد الأصلي
            </div>
            <div className="font-bold text-foreground">{fmt(p.budget)} <span className="font-normal text-muted-foreground">د.ت</span></div>
            <div className="text-muted-foreground mt-0.5">{p.budgetYear}</div>
          </div>
          {p.extraBudget != null && p.extraBudget > 0 ? (
            <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2">
              <div className="text-amber-700 mb-0.5 flex items-center gap-1">
                <BadgePercent className="w-3 h-3" />
                اعتماد إضافي
              </div>
              <div className="font-bold text-amber-800">{fmt(p.extraBudget)} <span className="font-normal">د.ت</span></div>
              {p.extraBudgetYear && <div className="text-amber-600 mt-0.5">{p.extraBudgetYear}</div>}
            </div>
          ) : (
            <div className="rounded-lg bg-muted/50 px-3 py-2">
              <div className="text-muted-foreground mb-0.5">الإجمالي</div>
              <div className="font-bold text-foreground">{fmt(total)} <span className="font-normal text-muted-foreground">د.ت</span></div>
            </div>
          )}
        </div>

        {/* Dates */}
        {(p.startDate || p.expectedEndDate) && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
            <CalendarDays className="w-3.5 h-3.5 shrink-0" />
            {p.startDate && <span>بداية: <strong className="text-foreground">{new Date(p.startDate).toLocaleDateString('ar-TN')}</strong></span>}
            {p.startDate && p.expectedEndDate && <span className="text-border">|</span>}
            {p.expectedEndDate && <span>نهاية متوقعة: <strong className="text-foreground">{new Date(p.expectedEndDate).toLocaleDateString('ar-TN')}</strong></span>}
          </div>
        )}

        {/* Notes */}
        {p.notes && (
          <div className="flex items-start gap-1.5 text-xs text-muted-foreground border-t border-dashed border-border pt-2.5">
            <FileText className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span className="line-clamp-2">{p.notes}</span>
          </div>
        )}
      </div>
    </div>
  )
}
