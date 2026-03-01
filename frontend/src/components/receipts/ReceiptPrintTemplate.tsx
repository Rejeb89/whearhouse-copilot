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
    user: { id: number; email: string; name?: string; personalNumber?: string; region?: string; securityUnit?: string }
    beneficiary?: { id: number; name: string }
    assignedTo?: { id: number; name: string; surname: string; rank: string; number?: string; entity?: { name: string } }
    items: Array<{
      id: number
      quantity: number
      serialNumber?: string
      adminNumber?: string
      condition: 'NEW' | 'USED' | 'NEEDS_MAINTENANCE'
      notes?: string
      item: { id: number; name: string; sku: string; category?: string }
    }>
  }
  createdBy: { id: number; email: string; name?: string }
  approvedBy?: { id: number; email: string; name?: string }
}

export interface ReceiptCurrentUser {
  region?: string
  securityUnit?: string
  personalNumber?: string
  name?: string
  title?: string
}

// Format serial number: BL-2025-0001 → 0001/2025
const formatSerial = (sn: string) => {
  const raw = sn.replace(/^BL-/, '')
  const parts = raw.split('-')
  if (parts.length === 2) return `${parts[1]}/${parts[0]}`
  return raw
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
  while (heightLeft > 10) {
    position = heightLeft - imgHeight
    pdf.addPage()
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
    heightLeft -= pageHeight
  }
  pdf.save(filename)
}

// ─── Print-ready Receipt Component ───────────────────────────────────────────
export const ReceiptPrintTemplate = React.forwardRef<HTMLDivElement, { receipt: Receipt; currentUser?: ReceiptCurrentUser; id?: string }>(
  ({ receipt, currentUser, id }, ref) => {
    const d = receipt.distribution

    return (
      <div
        ref={ref}
        id={id}
        dir="rtl"
        style={{
          fontFamily: "'Cairo', 'Arial', sans-serif",
          backgroundColor: '#fff',
          color: '#1a1a2e',
          width: '794px',
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
              {currentUser?.region && (
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#1e3a5f' }}>{currentUser.region}</div>
              )}
              {currentUser?.securityUnit && (
                <div style={{ fontSize: '11px', color: '#4b5563' }}>{currentUser.securityUnit}</div>
              )}
            </div>
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '22px', fontWeight: 900, color: '#1e3a5f' }}>وصل تسلم و تسليم</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#1e3a5f', direction: 'ltr', marginTop: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 400, color: '#9ca3af', marginLeft: '6px' }}>الرقم:</span>
              {formatSerial(receipt.serialNumber)}
            </div>
          </div>
        </div>

        {/* Meta grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
          {[
            ['المرجع', [d.referenceType, d.referenceNumber ? `الرقم: ${d.referenceNumber}` : '', d.referenceDate ? `التاريخ: ${new Date(d.referenceDate).toLocaleDateString('ar-TN')}` : ''].filter(Boolean).join(' / ') || '—'],
            ['الوحدة المنتفعة', d.beneficiary?.name || '—'],
            ['المتسلم', d.assignedTo ? `${d.assignedTo.rank} ${d.assignedTo.name} ${d.assignedTo.surname}${d.assignedTo.number ? ` (${d.assignedTo.number})` : ''}` : '—'],
            ['المسلِّم', `${d.deliveredByName || (d.user.name || d.user.email)}${d.user.personalNumber ? ` (${d.user.personalNumber})` : ''}`],
          ].map(([label, value]) => (
            <div key={label} style={{ backgroundColor: '#f8fafc', borderRadius: '8px', padding: '10px 14px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '10px', color: '#9ca3af', marginBottom: '2px' }}>{label}</div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e3a5f' }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Items Table */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e3a5f', marginBottom: '10px', paddingRight: '4px', borderRight: '3px solid #1e3a5f', paddingLeft: '8px' }}>
            قائمة التجهيزات
          </div>
          {(() => {
            const hasAdminNumber = d.items.some(di => di.adminNumber)
            return (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#1e3a5f', color: '#fff' }}>
                    {['#', 'اسم التجهيز', ...(hasAdminNumber ? ['الرقم الإداري'] : []), 'الكمية', 'الحالة', 'ملاحظات'].map(h => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: h === 'الكمية' ? 'center' : 'right', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {d.items.map((di, i) => (
                    <tr key={di.id} style={{ backgroundColor: i % 2 === 0 ? '#f8fafc' : '#fff', borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '9px 12px', color: '#64748b' }}>{i + 1}</td>
                      <td style={{ padding: '9px 12px', fontWeight: 600, color: '#1e3a5f' }}>{di.item.name}</td>
                      {hasAdminNumber && (
                        <td style={{ padding: '9px 12px', color: '#64748b', direction: 'ltr', textAlign: 'right' }}>{di.adminNumber || '—'}</td>
                      )}
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
            )
          })()}
        </div>

        {/* Notes */}
        {d.notes && (
          <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde047', borderRadius: '8px', padding: '12px 16px', marginBottom: '24px' }}>
            <div style={{ fontSize: '11px', color: '#854d0e', marginBottom: '4px' }}>ملاحظات</div>
            <div style={{ fontSize: '13px', color: '#78350f' }}>{d.notes}</div>
          </div>
        )}

        {/* Signatures */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px', marginTop: '32px' }}>
          {['المسلِّم', 'المتسلم', 'رئيس المستودع', 'رئيس الادارة'].map(label => (
            <div key={label} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#1e3a5f', marginBottom: '40px' }}>{label}</div>
              <div style={{ height: '1px', backgroundColor: '#e2e8f0' }} />
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ marginTop: '24px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
          <div style={{ fontSize: '10px', color: '#9ca3af' }}>رقم الوصل: {formatSerial(receipt.serialNumber)}</div>
          <div style={{ fontSize: '10px', color: '#9ca3af' }}>
            {currentUser?.title ? `${currentUser.title} في: ` : 'تاريخ الطباعة: '}
            {new Date().toLocaleString('ar-TN', { hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    )
  }
)
ReceiptPrintTemplate.displayName = 'ReceiptPrintTemplate'
