import { Request, Response, NextFunction } from 'express'

/**
 * Middleware to properly decode UTF-8 filenames from multipart form data
 * Handles RFC 5987 encoding and standard filename parameters
 */
export const filenameDecoder = (req: Request, res: Response, next: NextFunction) => {
  // Only process multipart requests
  if (!req.is('multipart/form-data')) {
    return next()
  }

  // Store original filename decoder in request
  const originalWrite = res.write
  const originalEnd = res.end

  // Monkey-patch the file object if it exists (after Multer processes it)
  const interceptor = (chunk: any, encoding: any, callback: any) => {
    if (req.file && req.file.originalname) {
      // Decode the filename properly
      req.file.originalname = decodeFilename(req.file.originalname)
    }
    
    if (typeof originalWrite === 'function') {
      if (callback) {
        return originalWrite.call(res, chunk, encoding, callback)
      } else {
        return originalWrite.call(res, chunk, encoding)
      }
    }
  }

  res.write = interceptor as any
  next()
}

/**
 * Decode filename from various encoding formats to UTF-8 string
 */
function decodeFilename(filename: string): string {
  if (!filename) return filename

  try {
    // Try to decode as UTF-8 if it's percent-encoded or corrupted
    
    // Case 1: Already proper UTF-8 string
    if (isValidUtf8String(filename)) {
      return filename
    }

    // Case 2: Latin1 encoded bytes that should be UTF-8
    // This happens when UTF-8 bytes are misinterpreted as Latin1
    const latin1Buffer = Buffer.from(filename, 'latin1')
    const utf8String = latin1Buffer.toString('utf-8')
    
    // Verify the result is valid UTF-8
    if (isValidUtf8String(utf8String)) {
      return utf8String
    }

    // Case 3: Try percent-encoded UTF-8 (RFC 5987)
    const decodedPercent = decodeURIComponent(filename)
    if (isValidUtf8String(decodedPercent)) {
      return decodedPercent
    }

    // If nothing works, return original
    return filename
  } catch (err) {
    console.error('Error decoding filename:', filename, err)
    return filename
  }
}

/**
 * Check if a string is valid UTF-8 (no mojibake)
 */
function isValidUtf8String(str: string): boolean {
  if (!str) return true
  
  try {
    // Convert to buffer and back to detect invalid sequences
    const buffer = Buffer.from(str, 'utf-8')
    const reconstructed = buffer.toString('utf-8')
    
    // Check for replacement characters which indicate corruption
    if (reconstructed.includes('\uFFFD')) {
      return false
    }
    
    // Check for suspicious mojibake patterns (like "ÙØ­Ø±ÙÙØ§Øª")
    // These are Latin1 representations of UTF-8 bytes
    const mojibakePattern = /[\xC0-\xFF][\x80-\xBF]/
    if (mojibakePattern.test(str)) {
      return false
    }
    
    return true
  } catch (err) {
    return false
  }
}
