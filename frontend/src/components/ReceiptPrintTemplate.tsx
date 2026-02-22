import React from 'react'

// ─── Types ───────────────────────────────────────────────────────────────────
export interface Receipt {
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
export const conditionLabel: Record<string, string> = {
  NEW: 'جديد',
  USED: 'مستعمل',
  NEEDS_MAINTENANCE: 'يحتاج صيانة',
}

// ─── PDF Download ─────────────────────────────────────────────────────────────
export const downloadPDF = async (elementId: string, filename: string) => {
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

// ─── Print-ready Receipt Component ───────────────────────────────────────────
export const ReceiptPrintTemplate = React.forwardRef<HTMLDivElement, { receipt: Receipt }>(
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
