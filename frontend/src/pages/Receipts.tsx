import React, { useContext, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import client from '../api/client'
import { AuthContext } from '../context/AuthContext'
import {
  FileText, CheckCircle, XCircle, Download, Eye, Search,
  Printer, AlertTriangle, Clock, ChevronRight, X, Package
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────
interface Receipt {
  id: number
  serialNumber: string
  status: 'DRAFT' | 'APPROVED' | 'CANCELLED'
  issuedAt: string
  approvedAt?: string
  cancelledAt?: string
  createdAt: string
  distribution: {
    id: number
    reference: string
    referenceType?: string
    referenceNumber?: string
    referenceDate?: string
    deliveredByName?: string
    notes?: string
    createdAt: string
    user: { id: number; email: string; name?: string }
    beneficiary?: { id: number; name: string }
    assignedTo?: { id: number; name: string; surname: string; rank: string; entity?: { name: string } }
    items: Array<{
      id: number
      quantity: number
      serialNumber?: string
      condition: 'NEW' | 'USED' | 'NEEDS_MAINTENANCE'
      notes?: string
      item: { id: number; name: string; sku: string; category?: string }
    }>
  }
  createdBy: { id: number; email: string; name?: string }
  approvedBy?: { id: number; email: string; name?: string }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const statusLabel: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  DRAFT:     { label: 'مسودة',       color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200',  icon: <Clock className="w-3 h-3" /> },
  APPROVED:  { label: 'مصادق عليه', color: 'text-green-700',  bg: 'bg-green-50 border-green-200',    icon: <CheckCircle className="w-3 h-3" /> },
  CANCELLED: { label: 'ملغي',        color: 'text-red-700',    bg: 'bg-red-50 border-red-200',         icon: <XCircle className="w-3 h-3" /> },
}

const conditionLabel: Record<string, string> = {
  NEW: 'جديد',
  USED: 'مستعمل',
  NEEDS_MAINTENANCE: 'يحتاج صيانة',
}

const fetchReceipts = async () => (await client.get('/receipts')).data.data
const fetchReceiptById = async (id: number) => (await client.get(`/receipts/${id}`)).data.data

// ─── Print-ready Receipt Component ───────────────────────────────────────────
const ReceiptPrintTemplate = React.forwardRef<HTMLDivElement, { receipt: Receipt }>(
  ({ receipt }, ref) => {
    const d = receipt.distribution

    return (
      <div
        ref={ref}
        dir="rtl"
        style={{
          fontFamily: "'Cairo', 'Arial', sans-serif",
          backgroundColor: '#fff',
          color: '#1a1a2e',
          width: '794px',
          minHeight: '1123px',
          padding: '40px',
          boxSizing: 'border-box',
          position: 'relative',
        }}
      >
        {/* Watermark CANCELLED */}
        {receipt.status === 'CANCELLED' && (
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%) rotate(-45deg)',
            fontSize: '120px', fontWeight: 900, opacity: 0.05,
            color: '#ef4444', pointerEvents: 'none', zIndex: 0, whiteSpace: 'nowrap',
          }}>ملغي</div>
        )}

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #1e3a5f', paddingBottom: '20px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src="/logo.png" alt="logo" style={{ width: '72px', height: '72px', objectFit: 'contain' }} onError={(e) => { (e.target as any).style.display = 'none' }} />
            </div>
            <div>
              <div style={{ fontSize: '13px', color: '#6b7280' }}>الإدارة العامة للحرس الوطني</div>
              <div style={{ fontSize: '11px', color: '#9ca3af' }}>نظام إدارة المستودع</div>
            </div>
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '22px', fontWeight: 900, color: '#1e3a5f' }}>وصل تسليم تجهيزات</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#1e3a5f', direction: 'ltr' }}>{receipt.serialNumber}</div>
            <div style={{ marginTop: '4px' }}>
              <span style={{
                fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '9999px',
                backgroundColor: receipt.status === 'APPROVED' ? '#dcfce7' : receipt.status === 'CANCELLED' ? '#fee2e2' : '#fef9c3',
                color: receipt.status === 'APPROVED' ? '#166534' : receipt.status === 'CANCELLED' ? '#991b1b' : '#854d0e',
                border: `1px solid ${receipt.status === 'APPROVED' ? '#86efac' : receipt.status === 'CANCELLED' ? '#fca5a5' : '#fde047'}`,
              }}>
                {receipt.status === 'APPROVED' ? 'مصادق عليه' : receipt.status === 'CANCELLED' ? 'ملغي' : 'مسودة'}
              </span>
            </div>
          </div>
        </div>

        {/* Meta grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
          {[
            ['تاريخ الإصدار', new Date(receipt.issuedAt).toLocaleString('ar-TN')],
            ['رقم المرجع', d.referenceNumber || '—'],
            ['نوع المرجع', d.referenceType || '—'],
            ['تاريخ المرجع', d.referenceDate ? new Date(d.referenceDate).toLocaleDateString('ar-TN') : '—'],
            ['الجهة / القسم', d.beneficiary?.name || '—'],
            ['الموظف المستلم', d.assignedTo ? `${d.assignedTo.rank} ${d.assignedTo.name} ${d.assignedTo.surname}` : '—'],
            ['اسم المسلِّم', d.deliveredByName || (d.user.name || d.user.email)],
            ['أنشئ بواسطة', receipt.createdBy.name || receipt.createdBy.email],
          ].map(([label, value]) => (
            <div key={label} style={{ backgroundColor: '#f8fafc', borderRadius: '8px', padding: '10px 14px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '10px', color: '#9ca3af', marginBottom: '2px' }}>{label}</div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e3a5f' }}>{value}</div>
            </div>
          ))}
          {receipt.approvedBy && (
            <div style={{ backgroundColor: '#f0fdf4', borderRadius: '8px', padding: '10px 14px', border: '1px solid #86efac' }}>
              <div style={{ fontSize: '10px', color: '#9ca3af', marginBottom: '2px' }}>المصادق عليه</div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#166534' }}>{receipt.approvedBy.name || receipt.approvedBy.email}</div>
              {receipt.approvedAt && <div style={{ fontSize: '10px', color: '#6b7280' }}>{new Date(receipt.approvedAt).toLocaleString('ar-TN')}</div>}
            </div>
          )}
        </div>

        {/* Items Table */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e3a5f', marginBottom: '10px', paddingRight: '4px', borderRight: '3px solid #1e3a5f', paddingLeft: '8px' }}>
            قائمة التجهيزات
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ backgroundColor: '#1e3a5f', color: '#fff' }}>
                {['#', 'اسم التجهيز', 'الرقم التسلسلي', 'الكمية', 'الحالة', 'ملاحظات'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {d.items.map((di, i) => (
                <tr key={di.id} style={{ backgroundColor: i % 2 === 0 ? '#f8fafc' : '#fff', borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '9px 12px', color: '#64748b' }}>{i + 1}</td>
                  <td style={{ padding: '9px 12px', fontWeight: 600, color: '#1e3a5f' }}>{di.item.name}</td>
                  <td style={{ padding: '9px 12px', color: '#64748b', direction: 'ltr', textAlign: 'right' }}>{di.serialNumber || '—'}</td>
                  <td style={{ padding: '9px 12px', textAlign: 'center', fontWeight: 700, color: '#1e3a5f' }}>{di.quantity}</td>
                  <td style={{ padding: '9px 12px' }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: '9999px', fontSize: '10px', fontWeight: 600,
                      backgroundColor: di.condition === 'NEW' ? '#dcfce7' : di.condition === 'USED' ? '#fef9c3' : '#fee2e2',
                      color: di.condition === 'NEW' ? '#166534' : di.condition === 'USED' ? '#854d0e' : '#991b1b',
                    }}>{conditionLabel[di.condition]}</span>
                  </td>
                  <td style={{ padding: '9px 12px', color: '#64748b', fontSize: '11px' }}>{di.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Notes */}
        {d.notes && (
          <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde047', borderRadius: '8px', padding: '12px 16px', marginBottom: '24px' }}>
            <div style={{ fontSize: '11px', color: '#854d0e', marginBottom: '4px' }}>ملاحظات</div>
            <div style={{ fontSize: '13px', color: '#78350f' }}>{d.notes}</div>
          </div>
        )}

        {/* Signatures */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginTop: '32px' }}>
          {['إمضاء المسلِّم', 'إمضاء المستلم', 'إمضاء المصادق'].map(label => (
            <div key={label} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '40px' }}>{label}</div>
              <div style={{ height: '1px', backgroundColor: '#e2e8f0' }} />
              <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '6px' }}>التوقيع والختم</div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ marginTop: '24px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
          <div style={{ fontSize: '10px', color: '#9ca3af' }}>رقم الوصل: {receipt.serialNumber}</div>
          <div style={{ fontSize: '10px', color: '#9ca3af' }}>تاريخ الطباعة: {new Date().toLocaleString('ar-TN')}</div>
        </div>
      </div>
    )
  }
)
ReceiptPrintTemplate.displayName = 'ReceiptPrintTemplate'

// ─── PDF Download ─────────────────────────────────────────────────────────────
const downloadPDF = async (elementId: string, filename: string) => {
  const { default: html2canvas } = await import('html2canvas')
  const { jsPDF } = await import('jspdf')
  const el = document.getElementById(elementId)
  if (!el) return
  const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' })
  const imgData = canvas.toDataURL('image/png')
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const imgWidth = pageWidth
  const imgHeight = (canvas.height * imgWidth) / canvas.width
  let heightLeft = imgHeight
  let position = 0
  pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
  heightLeft -= pageHeight
  while (heightLeft > 0) {
    position = heightLeft - imgHeight
    pdf.addPage()
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
    heightLeft -= pageHeight
  }
  pdf.save(filename)
}

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
          <h1 className="text-2xl font-bold text-gray-800">وصولات التسليم</h1>
          <p className="text-sm text-gray-500 mt-0.5">إدارة وطباعة وصولات توزيع التجهيزات</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <FileText className="w-4 h-4" />
          {receipts.length} وصل
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="ابحث بالرقم أو الجهة..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pr-9 pl-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {(['ALL', 'DRAFT', 'APPROVED', 'CANCELLED'] as const).map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
              statusFilter === s ? 'bg-blue-800 text-white border-blue-800' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            {s === 'ALL' ? 'الكل' : statusLabel[s].label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-gray-400">جارٍ التحميل...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>لا توجد وصولات</p>
          </div>
        ) : (
          <table className="w-full text-sm text-right">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500 font-medium">
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
                  <tr key={r.id} className="border-b border-gray-50 hover:bg-blue-50/30 transition">
                    <td className="px-4 py-3 font-mono font-semibold text-blue-800">{r.serialNumber}</td>
                    <td className="px-4 py-3 text-gray-700">{r.distribution.beneficiary?.name || '—'}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {r.distribution.assignedTo
                        ? `${r.distribution.assignedTo.rank} ${r.distribution.assignedTo.name} ${r.distribution.assignedTo.surname}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{new Date(r.issuedAt).toLocaleDateString('ar-TN')}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${st.bg} ${st.color}`}>
                        {st.icon} {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelectedId(r.id)}
                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4 relative">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-700" />
                </div>
                <div>
                  <h2 className="font-bold text-gray-800">{selectedReceipt?.serialNumber || '...'}</h2>
                  {selectedReceipt && (
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${statusLabel[selectedReceipt.status].bg} ${statusLabel[selectedReceipt.status].color}`}>
                      {statusLabel[selectedReceipt.status].icon} {statusLabel[selectedReceipt.status].label}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
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
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-semibold rounded-lg transition"
                    >
                      <XCircle className="w-3.5 h-3.5" /> إلغاء
                    </button>
                  </>
                )}
                {selectedReceipt && (
                  <button
                    onClick={handlePrintPDF}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-800 hover:bg-blue-900 text-white text-xs font-semibold rounded-lg transition"
                  >
                    <Download className="w-3.5 h-3.5" /> تحميل PDF
                  </button>
                )}
                <button onClick={() => setSelectedId(null)} className="p-2 rounded-lg hover:bg-gray-100 transition">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-auto max-h-[75vh]">
              {loadingDetail ? (
                <div className="py-16 text-center text-gray-400">جارٍ التحميل...</div>
              ) : selectedReceipt ? (
                <div className="space-y-5">
                  {/* Info Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
                      <div key={label} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                        <p className="text-xs text-gray-400">{label}</p>
                        <p className="text-sm font-semibold text-gray-700 mt-0.5">{value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Items */}
                  <div>
                    <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-1.5">
                      <Package className="w-4 h-4 text-blue-600" /> قائمة التجهيزات
                    </h3>
                    <div className="overflow-x-auto rounded-lg border border-gray-100">
                      <table className="w-full text-xs text-right">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-100">
                            {['اسم التجهيز', 'الرقم التسلسلي', 'الكمية', 'الحالة', 'ملاحظات'].map(h => (
                              <th key={h} className="px-3 py-2.5 font-semibold text-gray-600">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {selectedReceipt.distribution.items.map((di, i) => (
                            <tr key={di.id} className={`border-b border-gray-50 ${i % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
                              <td className="px-3 py-2.5 font-medium text-gray-700">{di.item.name}</td>
                              <td className="px-3 py-2.5 text-gray-500 font-mono">{di.serialNumber || '—'}</td>
                              <td className="px-3 py-2.5 text-center font-bold text-blue-800">{di.quantity}</td>
                              <td className="px-3 py-2.5">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                  di.condition === 'NEW' ? 'bg-green-100 text-green-700' :
                                  di.condition === 'USED' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-red-100 text-red-700'
                                }`}>{conditionLabel[di.condition]}</span>
                              </td>
                              <td className="px-3 py-2.5 text-gray-400">{di.notes || '—'}</td>
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
