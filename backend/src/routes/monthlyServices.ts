import { Router, Request, Response, NextFunction } from 'express'
import multer from 'multer'
import * as monthlyFuelController from '../controllers/monthlyFuelController'
import { authGuard } from '../middleware/authGuard'

const router = Router()

// Middleware to decode UTF-8 filenames from Content-Disposition header
const decodeFilename = (req: Request, res: Response, next: NextFunction) => {
  // Intercept the multer processing
  const originalExit = process.exit
  
  // Store the original filename decoder in request
  req.on('data', () => {
    // This runs during file upload processing
  })
  
  next()
}

/**
 * Decode filename from Latin1 (mojibake) to proper UTF-8
 */
function fixFilenameEncoding(filename: string): string {
  if (!filename) return filename

  try {
    // Check if this looks like mojibake (UTF-8 bytes interpreted as Latin1)
    // Pattern: ÙØ­Ø± etc. (bytes in range C0-FF followed by 80-BF)
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

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit (matches Express bodyParser)
  fileFilter: (req, file, cb) => {
    // Allow common file types
    const allowedMimes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
      'text/plain',
    ]

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('نوع الملف غير مدعوم'))
    }
  },
})

// Error handling middleware for multer errors
const handleUploadError = (err: any, _req: any, res: any, next: any) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ message: 'الملف كبير جداً. الحد الأقصى: 50MB' })
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(413).json({ message: 'يمكنك تحميل ملف واحد فقط' })
    }
    return res.status(400).json({ message: `خطأ في تحميل الملف: ${err.message}` })
  }
  if (err) {
    return res.status(400).json({ message: err.message || 'خطأ في تحميل الملف' })
  }
  next()
}

// Routes
router.post(
  '/monthly-services/upload',
  authGuard,
  upload.single('file'),
  handleUploadError,
  (req: Request, res: Response, next: NextFunction) => {
    // Fix filename encoding before passing to controller
    if (req.file) {
      req.file.originalname = fixFilenameEncoding(req.file.originalname)
    }
    next()
  },
  monthlyFuelController.uploadMonthlyService
)

router.get('/monthly-services', authGuard, monthlyFuelController.getMonthlyServices)

router.get(
  '/monthly-services/available-months',
  authGuard,
  monthlyFuelController.getAvailableMonths
)

router.get(
  '/monthly-services/download/:fileId',
  authGuard,
  monthlyFuelController.downloadMonthlyService
)

router.delete(
  '/monthly-services/:fileId',
  authGuard,
  monthlyFuelController.deleteMonthlyService
)

export default router
