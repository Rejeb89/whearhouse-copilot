import prisma from '../prisma'

// Generate serial number: BL-YYYY-XXXX
export const generateSerialNumber = async (): Promise<string> => {
  const year = new Date().getFullYear()
  const prefix = `BL-${year}-`
  const last = await prisma.deliveryReceipt.findFirst({
    where: { serialNumber: { startsWith: prefix } },
    orderBy: { serialNumber: 'desc' },
  })
  let seq = 1
  if (last) {
    const parts = last.serialNumber.split('-')
    seq = parseInt(parts[parts.length - 1], 10) + 1
  }
  return `${prefix}${String(seq).padStart(4, '0')}`
}

export const createReceiptForDistribution = async (
  distributionId: number,
  createdById: number
) => {
  const serialNumber = await generateSerialNumber()
  return prisma.deliveryReceipt.create({
    data: {
      serialNumber,
      distributionId,
      createdById,
      status: 'DRAFT',
    },
  })
}

export const getReceiptByDistribution = (distributionId: number) =>
  prisma.deliveryReceipt.findUnique({
    where: { distributionId },
    include: {
      distribution: {
        include: {
          items: { include: { item: true } },
          beneficiary: true,
          assignedTo: { include: { entity: true } },
          user: { select: { id: true, email: true, name: true } },
        },
      },
      createdBy: { select: { id: true, email: true, name: true } },
      approvedBy: { select: { id: true, email: true, name: true } },
    },
  })

export const getReceiptById = (id: number) =>
  prisma.deliveryReceipt.findUnique({
    where: { id },
    include: {
      distribution: {
        include: {
          items: { include: { item: true } },
          beneficiary: true,
          assignedTo: { include: { entity: true } },
          user: { select: { id: true, email: true, name: true } },
        },
      },
      createdBy: { select: { id: true, email: true, name: true } },
      approvedBy: { select: { id: true, email: true, name: true } },
    },
  })

export const listReceipts = (page = 1, limit = 20) =>
  prisma.deliveryReceipt.findMany({
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
    include: {
      distribution: {
        include: {
          beneficiary: { select: { id: true, name: true } },
          assignedTo: { select: { id: true, name: true, surname: true, rank: true } },
        },
      },
      createdBy: { select: { id: true, email: true, name: true } },
    },
  })

export const approveReceipt = async (id: number, approvedById: number, approvedByEmail: string) => {
  const receipt = await prisma.deliveryReceipt.findUnique({ where: { id } })
  if (!receipt) throw new Error('الوصل غير موجود')
  if (receipt.status !== 'DRAFT') throw new Error('لا يمكن المصادقة على وصل غير مسودة')

  await prisma.auditLog.create({
    data: {
      action: 'APPROVE_RECEIPT',
      entity: 'DeliveryReceipt',
      entityId: id,
      actorId: approvedById,
      actorEmail: approvedByEmail,
      details: `Approved receipt ${receipt.serialNumber}`,
    },
  })

  return prisma.deliveryReceipt.update({
    where: { id },
    data: {
      status: 'APPROVED',
      approvedAt: new Date(),
      approvedById,
    },
  })
}

export const cancelReceipt = async (id: number, cancelledById: number, cancelledByEmail: string) => {
  const receipt = await prisma.deliveryReceipt.findUnique({ where: { id } })
  if (!receipt) throw new Error('الوصل غير موجود')
  if (receipt.status === 'APPROVED') throw new Error('لا يمكن إلغاء وصل مصادق عليه')

  await prisma.auditLog.create({
    data: {
      action: 'CANCEL_RECEIPT',
      entity: 'DeliveryReceipt',
      entityId: id,
      actorId: cancelledById,
      actorEmail: cancelledByEmail,
      details: `Cancelled receipt ${receipt.serialNumber}`,
    },
  })

  return prisma.deliveryReceipt.update({
    where: { id },
    data: {
      status: 'CANCELLED',
      cancelledAt: new Date(),
      cancelledById,
      cancelledByEmail,
    },
  })
}
