import React, { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import client from '../services/client'
import { Upload, Trash2, Download, X, ChevronDown, FileText } from 'lucide-react'

const MONTHS_AR = [
  'جانفي', 'فيفري', 'مارس', 'أفريل', 'ماي', 'جوان',
  'جويلية', 'أوت', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
]

interface User {
  id: number
  email: string
  name?: string
  role?: string
  securityUnit?: string
}

interface MonthlyService {
  id: number
  month: number
  year: number
  securityUnit?: string
  fileName: string
  fileSize: number
  mimeType: string
  uploadedBy: User
  uploadedAt: string
  notes?: string
}

export default function MonthlyServicesTab({
  user,
  selMonth,
  selYear,
  setSelMonth,
  setSelYear
}: {
  user?: User | null
  selMonth: number
  selYear: number
  setSelMonth: (m: number) => void
  setSelYear: (y: number) => void
}) {
  const qc = useQueryClient()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragZoneRef = useRef<HTMLDivElement>(null)

  // ── Queries ──
  const { data: services = [], isLoading } = useQuery<MonthlyService[]>(
    ['monthly-services', selMonth, selYear],
    async () => {
      try {
        const res = await client.get(
          `/fuel/monthly-services?month=${selMonth}&year=${selYear}`
        )
        return res.data.data || []
      } catch (err) {
        console.error('Error fetching services:', err)
        return []
      }
    },
    { refetchInterval: 30000 }
  )

  // ── Upload Mutation ──
  const uploadMut = useMutation(
    async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('month', String(selMonth))
      formData.append('year', String(selYear))
      if (notes.trim()) formData.append('notes', notes)

      const res = await client.post('/fuel/monthly-services/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      return res.data.data
    },
    {
      onSuccess: () => {
        setSelectedFile(null)
        setNotes('')
        setError('')
        setSuccess('تم تحميل الملف بنجاح')
        qc.invalidateQueries(['monthly-services'])
        setTimeout(() => setSuccess(''), 3000)
      },
      onError: (err: any) => {
        const msg =
          err.response?.data?.message ||
          err.message ||
          'فشل تحميل الملف'
        setError(msg)
      }
    }
  )

  // ── Delete Mutation ──
  const deleteMut = useMutation(
    async (fileId: number) => {
      await client.delete(`/fuel/monthly-services/${fileId}`)
    },
    {
      onSuccess: () => {
        setError('')
        setSuccess('تم حذف الملف بنجاح')
        qc.invalidateQueries(['monthly-services'])
        setTimeout(() => setSuccess(''), 3000)
      },
      onError: (err: any) => {
        const msg = err.response?.data?.message || err.message || 'فشل حذف الملف'
        setError(msg)
      }
    }
  )

  // ── Handlers ──
  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    const files = e.dataTransfer?.files
    if (files && files.length > 0) {
      setSelectedFile(files[0])
      setError('')
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files
    if (files && files.length > 0) {
      setSelectedFile(files[0])
      setError('')
    }
  }

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedFile) {
      setError('يرجى اختيار ملف')
      return
    }
    await uploadMut.mutateAsync(selectedFile)
  }

  const handleDownload = async (fileId: number, fileName: string) => {
    try {
      const res = await client.get(`/fuel/monthly-services/download/${fileId}`, {
        responseType: 'blob'
      })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', fileName)
      document.body.appendChild(link)
      link.click()
      link.parentElement?.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error downloading file:', err)
      setError('فشل تحميل الملف')
    }
  }

  const handleDelete = (fileId: number) => {
    if (
      window.confirm(
        'هل أنت متأكد من حذف هذا الملف؟ لا يمكن التراجع عن هذا الإجراء.'
      )
    ) {
      deleteMut.mutate(fileId)
    }
  }

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) return '📄'
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝'
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊'
    if (mimeType.includes('image')) return '🖼️'
    return '📎'
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* ── Header with Month/Year Selectors ── */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              الخدمات الشهرية
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              تحميل وإدارة ملفات الخدمات الشهرية
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Month selector */}
            <div className="relative">
              <select
                value={selMonth}
                onChange={e => setSelMonth(Number(e.target.value))}
                className="appearance-none border border-input bg-background rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {MONTHS_AR.map((m, i) => (
                  <option key={i} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
            {/* Year selector */}
            <div className="relative">
              <select
                value={selYear}
                onChange={e => setSelYear(Number(e.target.value))}
                className="appearance-none border border-input bg-background rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {[2023, 2024, 2025, 2026, 2027].map(y => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Error / Success Messages ── */}
      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive flex items-center justify-between">
          {error}
          <button onClick={() => setError('')} className="p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {success && (
        <div className="rounded-md bg-emerald-500/10 border border-emerald-500/30 px-4 py-3 text-sm text-emerald-600">
          {success}
        </div>
      )}

      {/* ── Upload Form ── */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Upload className="w-4 h-4 text-primary" />
          تحميل ملف جديد
        </h3>

        <form onSubmit={handleUpload} className="space-y-4">
          {/* Drop Zone */}
          <div
            ref={dragZoneRef}
            onDragOver={e => e.preventDefault()}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            className="relative border-2 border-dashed border-border rounded-lg p-6 bg-muted/20 cursor-pointer hover:bg-muted/40 hover:border-primary/50 transition flex flex-col items-center justify-center text-center"
          >
            <Upload className="w-10 h-10 text-muted-foreground opacity-50 mb-2" />
            <p className="text-sm font-medium text-foreground">
              انقر هنا أو اسحب ملف لتحميله
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              PDF, Word, Excel, صور ، أو ملفات نصية (الحد الأقصى 50 MB)
            </p>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt"
            />
          </div>

          {/* Selected File Info */}
          {selectedFile && (
            <div className="rounded-lg bg-muted/30 border border-border p-3 flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <span className="text-2xl">{getFileIcon(selectedFile.type)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedFile(null)
                  if (fileInputRef.current) fileInputRef.current.value = ''
                }}
                className="p-1 rounded hover:bg-muted text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              ملاحظات (اختياري)
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="أضف أي تفاصيل أو ملاحظات حول الملف..."
              rows={2}
              className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!selectedFile || uploadMut.isLoading}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            <Upload className="w-4 h-4" />
            {uploadMut.isLoading ? 'جارٍ التحميل...' : 'تحميل الملف'}
          </button>
        </form>
      </div>

      {/* ── Files List ── */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          الملفات المرفوعة ({services.length})
        </h3>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : services.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
            <FileText className="w-10 h-10 opacity-20" />
            <p className="text-sm">لا توجد ملفات مرفوعة في {MONTHS_AR[selMonth - 1]}</p>
            <p className="text-xs text-muted-foreground">ابدأ بتحميل ملف جديد</p>
          </div>
        ) : (
          <div className="space-y-2">
            {services.map(service => (
              <div
                key={service.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 transition"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="text-2xl flex-shrink-0">
                    {getFileIcon(service.mimeType)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {service.fileName}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatFileSize(service.fileSize)} • {service.uploadedBy?.name || service.uploadedBy?.email || 'مستخدم'} • {new Date(service.uploadedAt).toLocaleDateString('ar-EG')}
                    </p>
                    {service.notes && (
                      <p className="text-xs text-muted-foreground mt-1 italic">
                        "{service.notes}"
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                  <button
                    onClick={() =>
                      handleDownload(service.id, service.fileName)
                    }
                    title="تحميل الملف"
                    className="p-2 rounded-md bg-primary/10 hover:bg-primary/20 text-primary transition"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  {(user?.role === 'ADMIN' || user?.id === service.uploadedBy?.id) && (
                    <button
                      onClick={() => handleDelete(service.id)}
                      disabled={deleteMut.isLoading}
                      title="حذف الملف"
                      className="p-2 rounded-md bg-destructive/10 hover:bg-destructive/20 text-destructive transition disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
