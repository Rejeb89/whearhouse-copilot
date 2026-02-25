import React, { useContext, useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import client from '../api/client'
import { AuthContext } from '../context/AuthContext'
import {
  FileText, CheckCircle, XCircle, Download, Eye, Search,
  Printer, AlertTriangle, Clock, ChevronRight, X, Package, Paperclip, Upload, ImageIcon
} from 'lucide-react'
import { Receipt, conditionLabel, downloadPDF, ReceiptPrintTemplate } from '../components/ReceiptPrintTemplate'

// ─── Helpers ─────────────────────────────────────────────────────────────────
const statusLabel: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  DRAFT:     { label: 'مسودة',       color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200',  icon: <Clock className="w-3 h-3" /> },
  APPROVED:  { label: 'مصادق عليه', color: 'text-green-700',  bg: 'bg-green-50 border-green-200',    icon: <CheckCircle className="w-3 h-3" /> },
  CANCELLED: { label: 'ملغي',        color: 'text-red-700',    bg: 'bg-red-50 border-red-200',         icon: <XCircle className="w-3 h-3" /> },
}

const fetchReceipts = async () => (await client.get('/receipts')).data.data
const fetchReceiptById = async (id: number) => (await client.get(`/receipts/${id}`)).data.data

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Receipts() {
  const { user } = useContext(AuthContext)!
  const qc = useQueryClient()
  const canApprove = user?.role === 'ADMIN' || user?.role === 'STORE_KEEPER'

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [printVisible, setPrintVisible] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  // Signed attachment: local map receiptId → parsed attachment
  const [signedAtts, setSignedAtts] = useState<Record<number, {name: string; data: string; type: string}>>( {})
  const [uploadingId, setUploadingId] = useState<number | null>(null)
  const signedFileRef = useRef<HTMLInputElement>(null)
  const [activeUploadId, setActiveUploadId] = useState<number | null>(null)

  const { data: receipts = [], isLoading } = useQuery<Receipt[]>(['receipts'], fetchReceipts, { refetchInterval: 15000 })

  // Seed signedAtts from list data
  useEffect(() => {
    if (!receipts.length) return
    setSignedAtts(prev => {
      const next = { ...prev }
      receipts.forEach((r: any) => {
        if (r.signedAttachment && !next[r.id]) {
          try { next[r.id] = JSON.parse(r.signedAttachment) } catch { /* ignore */ }
        }
      })
      return next
    })
  }, [receipts])
  const { data: selectedReceipt, isLoading: loadingDetail } = useQuery<Receipt>(
    ['receipt', selectedId],
    () => fetchReceiptById(selectedId!),
    { enabled: !!selectedId }
  )

  const approveMutation = useMutation(
    (id: number) => client.patch(`/receipts/${id}/approve`).then(r => r.data.data),
    { onSuccess: () => { qc.invalidateQueries(['receipts']); qc.invalidateQueries(['receipt', selectedId]) } }
  )
  const cancelMutation = useMutation(
    (id: number) => client.patch(`/receipts/${id}/cancel`).then(r => r.data.data),
    { onSuccess: () => { qc.invalidateQueries(['receipts']); qc.invalidateQueries(['receipt', selectedId]) } }
  )

  const filtered = receipts.filter(r => {
    const s = search.toLowerCase()
    if (statusFilter !== 'ALL' && r.status !== statusFilter) return false
    if (!s) return true
    const d = r.distribution
    return (
      r.serialNumber.toLowerCase().includes(s) ||
      (d.beneficiary?.name || '').toLowerCase().includes(s) ||
      (d.beneficiary?.phone || '').toLowerCase().includes(s) ||
      (d.referenceNumber || '').toLowerCase().includes(s) ||
      (d.referenceType || '').toLowerCase().includes(s) ||
      (d.notes || '').toLowerCase().includes(s) ||
      (d.deliveredByName || '').toLowerCase().includes(s) ||
      (d.assignedTo ? `${d.assignedTo.rank} ${d.assignedTo.name} ${d.assignedTo.surname} ${d.assignedTo.number || ''}`.toLowerCase().includes(s) : false) ||
      (d.items || []).some((di: any) =>
        (di.item?.name || '').toLowerCase().includes(s) ||
        (di.item?.sku || '').toLowerCase().includes(s) ||
        (di.item?.category || '').toLowerCase().includes(s) ||
        (di.adminNumber || '').toLowerCase().includes(s)
      )
    )
  })

  const handlePrintPDF = async () => {
    if (!selectedReceipt) return
    setPrintVisible(true)
    await new Promise(r => setTimeout(r, 500))
    await downloadPDF('receipt-print-area', `${selectedReceipt.serialNumber}.pdf`)
    setPrintVisible(false)
  }

  const handleSignedFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || activeUploadId === null) return
    e.target.value = ''
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const att = { name: file.name, data: ev.target?.result as string, type: file.type }
      setUploadingId(activeUploadId)
      try {
        await client.patch(`/receipts/${activeUploadId}/signed-attachment`, { signedAttachment: att })
        setSignedAtts(prev => ({ ...prev, [activeUploadId]: att }))
        qc.invalidateQueries(['receipts'])
      } finally {
        setUploadingId(null)
        setActiveUploadId(null)
      }
    }
    reader.readAsDataURL(file)
  }

  const downloadAtt = (att: {name: string; data: string}) => {
    const a = document.createElement('a'); a.href = att.data; a.download = att.name
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
  }

  return (
    <div dir="rtl" className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">وصولات التسليم</h1>
          <p className="text-sm text-muted-foreground mt-0.5">إدارة وطباعة وصولات خرج التجهيزات</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <FileText className="w-4 h-4" />
          {receipts.length} وصل
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative w-full sm:flex-1 sm:min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="ابحث بالرقم، الجهة، التجهيز، المرجع..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pr-9 pl-3 py-2 text-sm border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex flex-wrap gap-2">
        {(['ALL', 'DRAFT', 'APPROVED', 'CANCELLED'] as const).map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
              statusFilter === s ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-border hover:bg-muted/50'
            }`}
          >
            {s === 'ALL' ? 'الكل' : statusLabel[s].label}
          </button>
        ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-muted-foreground">جارٍ التحميل...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>لا توجد وصولات</p>
          </div>
        ) : (
          <table className="w-full text-sm text-right">
            <thead>
                <tr className="border-b border-border bg-muted/50 text-xs text-muted-foreground font-medium">
                  <th className="px-4 py-3">رقم الوصل</th>
                  <th className="px-4 py-3">اسم التجهيز</th>
                  <th className="px-4 py-3">الجهة المنتفعة</th>
                  <th className="px-4 py-3">المستلم</th>
                  <th className="px-4 py-3">القائم بالتسليم</th>
                  <th className="px-4 py-3">تاريخ الإصدار</th>
                  <th className="px-4 py-3">الوصل بعد الامضاء</th>
                  <th className="px-4 py-3">إجراءات</th>
                </tr>
            </thead>
            <tbody>
              {filtered.map(r => {
                return (
                  <tr key={r.id} className="border-b border-border hover:bg-muted/50 transition">
                    <td className="px-4 py-3 font-mono font-semibold text-primary">{r.serialNumber}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {(r.distribution.items || []).map(i => i.item.name).filter(Boolean).join(', ') || '—'}
                    </td>
                    <td className="px-4 py-3 text-foreground">{r.distribution.beneficiary?.name || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {r.distribution.assignedTo
                        ? `${r.distribution.assignedTo.rank} ${r.distribution.assignedTo.name} ${r.distribution.assignedTo.surname}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {r.distribution.deliveredByName || r.distribution.user?.name || r.distribution.user?.email || '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(r.issuedAt).toLocaleDateString('ar-TN')}</td>
                    <td className="px-4 py-3">
                      {(() => {
                        const att = signedAtts[r.id]
                        const isUploading = uploadingId === r.id
                        if (att) {
                          return (
                            <div className="flex flex-col gap-1.5">
                              {att.type?.startsWith('image/') ? (
                                <img src={att.data} alt={att.name} className="w-14 h-14 object-cover rounded-lg border border-border cursor-pointer hover:opacity-90" onClick={() => window.open(att.data, '_blank')} title="عرض الصورة"/>
                              ) : (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground"><Paperclip className="w-3.5 h-3.5"/><span className="truncate max-w-[90px]">{att.name}</span></div>
                              )}
                              <div className="flex gap-1">
                                <button onClick={() => downloadAtt(att)} className="flex items-center gap-1 px-2 py-0.5 text-[10px] bg-primary/10 text-primary rounded hover:bg-primary/20 transition"><Download className="w-3 h-3"/>تحميل</button>
                                <button onClick={() => { setActiveUploadId(r.id); signedFileRef.current?.click() }} className="flex items-center gap-1 px-2 py-0.5 text-[10px] bg-muted text-muted-foreground rounded hover:bg-muted/70 transition"><Upload className="w-3 h-3"/>تغيير</button>
                              </div>
                            </div>
                          )
                        }
                        return (
                          <button
                            disabled={isUploading}
                            onClick={() => { setActiveUploadId(r.id); signedFileRef.current?.click() }}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs border border-dashed border-border rounded-lg text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition disabled:opacity-50"
                          >
                            {isUploading ? <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"/> : <Upload className="w-3.5 h-3.5"/>}
                            {isUploading ? 'جارٍ...' : 'إرفاق'}
                          </button>
                        )
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelectedId(r.id)}
                        className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium"
                      >
                        <Eye className="w-3.5 h-3.5" /> عرض
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Detail Modal ── */}
      {selectedId && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-8 pb-8 overflow-auto">
        <div className="bg-card rounded-xl border border-border shadow-lg w-full max-w-4xl mx-4 relative">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-bold text-foreground">{selectedReceipt?.serialNumber || '...'}</h2>
                  {selectedReceipt && (
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${statusLabel[selectedReceipt.status].bg} ${statusLabel[selectedReceipt.status].color}`}>
                      {statusLabel[selectedReceipt.status].icon} {statusLabel[selectedReceipt.status].label}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center flex-wrap gap-2">
                {canApprove && selectedReceipt?.status === 'DRAFT' && (
                  <>
                    <button
                    onClick={() => approveMutation.mutate(selectedReceipt.id)}
                    disabled={approveMutation.isLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg transition"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> مصادقة
                  </button>
                    <button
                      onClick={() => cancelMutation.mutate(selectedReceipt.id)}
                      disabled={cancelMutation.isLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-destructive/10 hover:bg-destructive/20 text-destructive text-xs font-semibold rounded-lg transition"
                    >
                      <XCircle className="w-3.5 h-3.5" /> إلغاء
                    </button>
                  </>
                )}
                {selectedReceipt && (
                  <button
                    onClick={handlePrintPDF}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold rounded-lg transition"
                  >
                    <Download className="w-3.5 h-3.5" /> تحميل PDF
                  </button>
                )}
                <button onClick={() => setSelectedId(null)} className="p-2 rounded-lg hover:bg-muted transition">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-auto max-h-[75vh]">
              {loadingDetail ? (
                <div className="py-16 text-center text-muted-foreground">جارٍ التحميل...</div>
              ) : selectedReceipt ? (
                <div className="space-y-5">
                  {/* Info Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      ['تاريخ الإصدار', new Date(selectedReceipt.issuedAt).toLocaleString('ar-TN')],
                      ['نوع المرجع', selectedReceipt.distribution.referenceType || '—'],
                      ['رقم المرجع', selectedReceipt.distribution.referenceNumber || '—'],
                      ['تاريخ المرجع', selectedReceipt.distribution.referenceDate ? new Date(selectedReceipt.distribution.referenceDate).toLocaleDateString('ar-TN') : '—'],
                      ['الجهة / القسم', selectedReceipt.distribution.beneficiary?.name || '—'],
                      ['الموظف المستلم', selectedReceipt.distribution.assignedTo
                        ? `${selectedReceipt.distribution.assignedTo.rank} ${selectedReceipt.distribution.assignedTo.name} ${selectedReceipt.distribution.assignedTo.surname}`
                        : '—'],
                      ['اسم المسلِّم', selectedReceipt.distribution.deliveredByName || (selectedReceipt.distribution.user.name || selectedReceipt.distribution.user.email)],
                      ['أنشئ بواسطة', selectedReceipt.createdBy.name || selectedReceipt.createdBy.email],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-lg border border-border bg-muted/50 p-3">
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className="text-sm font-semibold text-foreground mt-0.5">{value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Items */}
                  <div>
                    <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-1.5">
                      <Package className="w-4 h-4 text-primary" /> قائمة التجهيزات
                    </h3>
                    <div className="overflow-x-auto rounded-lg border border-border">
                      <table className="w-full text-xs text-right">
                        <thead>
                          <tr className="bg-muted/50 border-b border-border">
                            {['اسم التجهيز', 'الرقم التسلسلي', 'الكمية', 'الحالة', 'ملاحظات'].map(h => (
                              <th key={h} className="px-3 py-2.5 font-semibold text-muted-foreground">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {selectedReceipt.distribution.items.map((di, i) => (
                            <tr key={di.id} className={`border-b border-border ${i % 2 === 0 ? '' : 'bg-muted/30'}`}>
                              <td className="px-3 py-2.5 font-medium text-foreground">{di.item.name}</td>
                              <td className="px-3 py-2.5 text-muted-foreground font-mono">{di.serialNumber || '—'}</td>
                              <td className="px-3 py-2.5 text-center font-bold text-primary">{di.quantity}</td>
                              <td className="px-3 py-2.5">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                  di.condition === 'NEW' ? 'bg-green-100 text-green-700' :
                                  di.condition === 'USED' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-red-100 text-red-700'
                                }`}>{conditionLabel[di.condition]}</span>
                              </td>
                              <td className="px-3 py-2.5 text-muted-foreground">{di.notes || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Signed Attachment */}
                  {(() => {
                    const att = selectedReceipt?.id ? signedAtts[selectedReceipt.id] : null
                    return (
                      <div className="rounded-lg border border-border bg-muted/30 p-4">
                        <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5"><Paperclip className="w-3.5 h-3.5 text-primary"/>الوصل بعد الامضاء</p>
                        {att ? (
                          <div className="flex flex-col gap-2">
                            {att.type?.startsWith('image/') ? (
                              <img src={att.data} alt={att.name} className="max-h-64 rounded-lg border border-border object-contain cursor-pointer" onClick={() => window.open(att.data, '_blank')}/>
                            ) : (
                              <div className="flex items-center gap-2 text-sm text-foreground"><Paperclip className="w-4 h-4 text-muted-foreground"/>{att.name}</div>
                            )}
                            <div className="flex gap-2">
                              <button onClick={() => downloadAtt(att)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition"><Download className="w-3.5 h-3.5"/>تحميل</button>
                              <button onClick={() => { setActiveUploadId(selectedReceipt!.id); signedFileRef.current?.click() }} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-muted text-muted-foreground rounded-lg hover:bg-muted/70 transition"><Upload className="w-3.5 h-3.5"/>تغيير الملف</button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => { setActiveUploadId(selectedReceipt!.id); signedFileRef.current?.click() }}
                            className="flex items-center gap-2 w-full border border-dashed border-border rounded-lg p-3 text-sm text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition">
                            <Upload className="w-4 h-4"/>انقر لإرفاق صورة أو ملف PDF للوصل بعد الامضاء
                          </button>
                        )}
                      </div>
                    )
                  })()}

                  {/* Approval info */}
                  {selectedReceipt.approvedBy && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-green-800">
                          صادق عليه: {selectedReceipt.approvedBy.name || selectedReceipt.approvedBy.email}
                        </p>
                        <p className="text-xs text-green-600">{selectedReceipt.approvedAt ? new Date(selectedReceipt.approvedAt).toLocaleString('ar-TN') : ''}</p>
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {selectedReceipt.distribution.notes && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <p className="text-xs text-amber-600">ملاحظات</p>
                      <p className="text-sm text-amber-800 mt-0.5">{selectedReceipt.distribution.notes}</p>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Hidden file input for signed attachment */}
      <input
        ref={signedFileRef}
        type="file"
        accept="image/*,.pdf,application/pdf"
        className="hidden"
        onChange={handleSignedFile}
      />

      {/* Hidden Print Area */}
      {printVisible && selectedReceipt && (
        <div style={{ position: 'fixed', top: '-9999px', left: '-9999px' }}>
          <div id="receipt-print-area">
            <ReceiptPrintTemplate ref={printRef} receipt={selectedReceipt} currentUser={{ region: user?.region, securityUnit: user?.securityUnit, personalNumber: user?.personalNumber, name: user?.name, title: user?.title }} />
          </div>
        </div>
      )}
    </div>
  )
}
