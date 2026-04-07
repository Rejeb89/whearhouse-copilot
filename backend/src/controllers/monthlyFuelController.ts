import { Request, Response } from 'express'
import * as monthlyFuelService from '../services/monthlyFuelService'
import prisma from '../config/database'

/**
 * Fix filename encoding (convert Latin1 mojibake back to UTF-8)
 */
function fixFilenameEncoding(filename: string): string {
  if (!filename) return filename

  try {
    // Check if this looks like mojibake (UTF-8 bytes interpreted as Latin1)
    const mojibakePattern = /[\xC0-\xFF][\x80-\xBF]/
    
    if (mojibakePattern.test(filename)) {
      // This is likely UTF-8 bytes read as Latin1
      // Convert back: Latin1 string -> UTF-8 buffer -> UTF-8 string
      const buffer = Buffer.from(filename, 'latin1')
      return buffer.toString('utf-8')
    }
    
    return filename
  } catch (err) {
    console.error('Error fixing filename encoding:', err)
    return filename
  }
}

export const uploadMonthlyService = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user
    const { month, year, notes } = req.body
    const file = (req as any).file

    if (!file) {
      return res.status(400).json({ error: 'لم يتم تحديد ملف' })
    }

    if (!month || !year) {
      return res.status(400).json({ error: 'الشهر والسنة مطلوبة' })
    }

    if (month < 1 || month > 12) {
      return res.status(400).json({ error: 'الشهر يجب أن يكون بين 1 و 12' })
    }

    // Ensure filename is properly encoded as UTF-8
    const fileName = fixFilenameEncoding(file.originalname)

    const record = await monthlyFuelService.uploadMonthlyService({
      month: parseInt(month),
      year: parseInt(year),
      securityUnit: user.securityUnit,
      fileName: fileName,
      fileData: file.buffer,
      mimeType: file.mimetype,
      uploadedById: user.id,
      notes: notes || null,
    })

    res.json({ data: record })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

export const getMonthlyServices = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user
    const { month, year, unit } = req.query

    if (!month || !year) {
      return res.status(400).json({ error: 'الشهر والسنة مطلوبة' })
    }

    // Allow ADMIN and supervisory roles to query any unit, otherwise use user's security unit
    const allowedRoles = ['ADMIN', 'SECTION_CHIEF', 'REGION_CHIEF', 'DISTRICT_MANAGER', 'BATTALION_COMMANDER']
    const securityUnit = allowedRoles.includes(user.role) && unit ? (unit as string) : user.securityUnit

    const data = await monthlyFuelService.getMonthlyServices(
      parseInt(month as string),
      parseInt(year as string),
      securityUnit
    )

    // Fix filenames if they have encoding issues
    const fixedData = data.map(record => ({
      ...record,
      fileName: fixFilenameEncoding(record.fileName)
    }))

    res.json({ data: fixedData })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

export const downloadMonthlyService = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user
    const { fileId } = req.params

    console.log(`[Download] Starting download for fileId: ${fileId}, userId: ${user.id}`)

    // Get file and verify access
    const record = await prisma.monthlyFuelService.findUnique({
      where: { id: parseInt(fileId) },
    })

    if (!record) {
      console.log(`[Download] File not found: ${fileId}`)
      return res.status(404).json({ error: 'الملف غير موجود' })
    }

    console.log(`[Download] Found file: ${record.fileName}, size: ${record.fileSize} bytes, unit: ${record.securityUnit}`)

    // Check access - allow supervisory roles to access any unit's files
    const allowedRoles = ['ADMIN', 'SECTION_CHIEF', 'REGION_CHIEF', 'DISTRICT_MANAGER', 'BATTALION_COMMANDER']
    const isSupervisory = allowedRoles.includes(user.role)

    console.log(`[Download] Access check - record unit: ${record.securityUnit}, user unit: ${user.securityUnit}, role: ${user.role}, supervisory: ${isSupervisory}`)

    if (record.securityUnit !== user.securityUnit && !isSupervisory) {
      console.log(`[Download] Access denied for user ${user.id}`)
      return res.status(403).json({ error: 'ليس لديك صلاحيات لتنزيل هذا الملف' })
    }

    // Fix filename encoding for download
    const fixedFileName = fixFilenameEncoding(record.fileName)
    console.log(`[Download] Filename: "${record.fileName}" -> "${fixedFileName}"`)

    // Create a safe ASCII filename for the fallback
    const safeFilename = record.fileName
      .replace(/[^\w\s.-]/g, '_')  // Replace non-word chars with underscore
      .replace(/\s+/g, '_')  // Replace spaces with underscore
      .substring(0, 200)  // Limit length

    console.log(`[Download] Safe filename for fallback: "${safeFilename}"`)

    // Validate fileData
    if (!record.fileData) {
      console.error(`[Download] No fileData in record`)
      return res.status(500).json({ error: 'بيانات الملف فارغة' })
    }

    // Ensure fileData is a Buffer
    let fileBuffer: Buffer
    if (Buffer.isBuffer(record.fileData)) {
      fileBuffer = record.fileData
    } else if (typeof record.fileData === 'string') {
      fileBuffer = Buffer.from(record.fileData, 'binary')
    } else {
      fileBuffer = Buffer.from(record.fileData as any)
    }

    console.log(`[Download] FileData type: ${typeof fileBuffer}, is Buffer: ${Buffer.isBuffer(fileBuffer)}, actual size: ${fileBuffer.length} bytes`)

    if (fileBuffer.length === 0) {
      console.error(`[Download] FileData is empty (0 bytes)`)
      return res.status(500).json({ error: 'بيانات الملف فارغة' })
    }

    const dispositionHeader = `attachment; filename*=UTF-8''${encodeURIComponent(fixedFileName)}; filename="${safeFilename}"`
    console.log(`[Download] Content-Disposition: ${dispositionHeader}`)
    console.log(`[Download] Content-Type: ${record.mimeType || 'application/octet-stream'}`)

    // Set response headers
    res.set({
      'Content-Type': record.mimeType || 'application/octet-stream',
      'Content-Length': fileBuffer.length.toString(),
      'Content-Disposition': dispositionHeader,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    })

    console.log(`[Download] Sending ${fileBuffer.length} bytes of type ${record.mimeType || 'application/octet-stream'}`)
    
    // Send file using res.send() which handles Buffers well
    res.send(fileBuffer)
    
    console.log(`[Download] File sent successfully`)
  } catch (err: any) {
    console.error(`[Download] Error: ${err.message}`, err)
    res.status(500).json({ error: err.message })
  }
}

export const deleteMonthlyService = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user
    const { fileId } = req.params

    // Check ownership or admin
    const { PrismaClient } = await import('@prisma/client')
    const prisma = new PrismaClient()
    const record = await prisma.monthlyFuelService.findUnique({
      where: { id: parseInt(fileId) },
    })
    await prisma.$disconnect()

    if (!record) {
      return res.status(404).json({ error: 'الملف غير موجود' })
    }

    // Allow ADMIN and supervisory roles to delete any file
    const allowedRoles = ['ADMIN', 'SECTION_CHIEF', 'REGION_CHIEF', 'DISTRICT_MANAGER', 'BATTALION_COMMANDER']
    const isSupervisory = allowedRoles.includes(user.role)

    if (
      record.uploadedById !== user.id &&
      record.securityUnit !== user.securityUnit &&
      !isSupervisory
    ) {
      return res.status(403).json({ error: 'ليس لديك صلاحيات لحذف هذا الملف' })
    }

    await monthlyFuelService.deleteMonthlyService(parseInt(fileId))

    res.json({ message: 'تم حذف الملف بنجاح' })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

export const getAvailableMonths = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user

    const data = await monthlyFuelService.getAvailableMonths(user.securityUnit)

    res.json({ data })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}
