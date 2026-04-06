import prisma from '../config/database'
import fs from 'fs/promises'
import path from 'path'

const UPLOADS_DIR = path.join(process.cwd(), 'uploads', 'monthly-services')

// Ensure upload directory exists
export const ensureUploadDir = async () => {
  try {
    await fs.mkdir(UPLOADS_DIR, { recursive: true })
  } catch (err) {
    console.error('Failed to create uploads directory:', err)
  }
}

// Upload a monthly service file
export const uploadMonthlyService = async (data: {
  month: number
  year: number
  securityUnit?: string | null
  fileName: string
  fileData: Buffer
  mimeType: string
  uploadedById: number
  notes?: string | null
}) => {
  try {
    // Save to database
    const record = await prisma.monthlyFuelService.create({
      data: {
        month: data.month,
        year: data.year,
        securityUnit: data.securityUnit,
        fileName: data.fileName,
        fileData: data.fileData,
        fileSize: data.fileData.length,
        mimeType: data.mimeType,
        uploadedById: data.uploadedById,
        notes: data.notes,
      },
      include: {
        uploadedBy: { select: { id: true, email: true, name: true } },
      },
    })

    return record
  } catch (err: any) {
    if (err.code === 'P2002') {
      throw new Error('هذا الملف مرفوع بالفعل لهذا الشهر')
    }
    throw err
  }
}

// Get monthly services for a specific month
export const getMonthlyServices = async (
  month: number,
  year: number,
  securityUnit?: string | null
) => {
  const where: any = { month, year }
  if (securityUnit) where.securityUnit = securityUnit

  const services = await prisma.monthlyFuelService.findMany({
    where,
    include: {
      uploadedBy: { select: { id: true, email: true, name: true } },
    },
    orderBy: { uploadedAt: 'desc' },
  })

  return services.map((s: any) => ({
    id: s.id,
    month: s.month,
    year: s.year,
    securityUnit: s.securityUnit,
    fileName: s.fileName,
    fileSize: s.fileSize,
    mimeType: s.mimeType,
    uploadedBy: s.uploadedBy,
    uploadedAt: s.uploadedAt,
    notes: s.notes,
  }))
}

// Get a specific file for download
export const getMonthlyServiceFile = async (fileId: number) => {
  const record = await prisma.monthlyFuelService.findUnique({
    where: { id: fileId },
  })

  if (!record) {
    throw new Error('الملف غير موجود')
  }

  return {
    fileName: record.fileName,
    fileData: record.fileData,
    mimeType: record.mimeType,
  }
}

// Delete a monthly service file
export const deleteMonthlyService = async (fileId: number) => {
  const record = await prisma.monthlyFuelService.findUnique({
    where: { id: fileId },
  })

  if (!record) {
    throw new Error('الملف غير موجود')
  }

  await prisma.monthlyFuelService.delete({
    where: { id: fileId },
  })

  return record
}

// Get all months with available services for a security unit
export const getAvailableMonths = async (securityUnit?: string | null) => {
  const where: any = {}
  if (securityUnit) where.securityUnit = securityUnit

  const records = await prisma.monthlyFuelService.findMany({
    where,
    select: {
      month: true,
      year: true,
    },
    distinct: ['month', 'year'],
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  })

  return records
}
