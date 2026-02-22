import React, { useContext, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import client from '../api/client'
import { AuthContext } from '../context/AuthContext'
import {
  FileText, CheckCircle, XCircle, Download, Eye, Search,
  Printer, AlertTriangle, Clock, ChevronRight, X, Package
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

  const { data: receipts = [], isLoading } = useQuery<Receipt[]>(['receipts'], fetchReceipts, { refetchInterval: 15000 })
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

  const filtered = receipts.filter(r =>
    (statusFilter === 'ALL' || r.status === statusFilter) &&
    (r.serialNumber.toLowerCase().includes(search.toLowerCase()) ||
      (r.distribution.beneficiary?.name || '').toLowerCase().includes(search.toLowerCase()))
  )

  const handlePrintPDF = async () => {
    if (!selectedReceipt) return
    setPrintVisible(true)
    await new Promise(r => setTimeout(r, 500))
    await downloadPDF('receipt-print-area', `${selectedReceipt.serialNumber}.pdf`)
    setPrintVisible(false)
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
            placeholder="ابحث بالرقم أو الجهة..."
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
                <th className="px-4 py-3">الجهة</th>
                <th className="px-4 py-3">المستلم</th>
                <th className="px-4 py-3">تاريخ الإصدار</th>
                <th className="px-4 py-3">الحالة</th>
                <th className="px-4 py-3">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => {
                const st = statusLabel[r.status]
                return (
                  <tr key={r.id} className="border-b border-border hover:bg-muted/50 transition">
                    <td className="px-4 py-3 font-mono font-semibold text-primary">{r.serialNumber}</td>
                    <td className="px-4 py-3 text-foreground">{r.distribution.beneficiary?.name || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {r.distribution.assignedTo
                        ? `${r.distribution.assignedTo.rank} ${r.distribution.assignedTo.name} ${r.distribution.assignedTo.surname}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(r.issuedAt).toLocaleDateString('ar-TN')}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${st.bg} ${st.color}`}>
                        {st.icon} {st.label}
                      </span>
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

      {/* Hidden Print Area */}
      {printVisible && selectedReceipt && (
        <div style={{ position: 'fixed', top: '-9999px', left: '-9999px' }}>
          <div id="receipt-print-area">
            <ReceiptPrintTemplate ref={printRef} receipt={selectedReceipt} />
          </div>
        </div>
      )}
    </div>
  )
}
