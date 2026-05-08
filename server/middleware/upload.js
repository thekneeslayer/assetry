const multer = require('multer')
const path = require('path')
const fs = require('fs')

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '..', 'uploads')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`
    cb(null, unique)
  },
})

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml']

const ALLOWED_TYPES = [
  'application/zip',
  'application/x-zip-compressed',
  'application/pdf',
  'application/epub+zip',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'video/mp4',
  'text/plain',
  'application/json',
  'application/octet-stream',
  ...IMAGE_TYPES,
]

const fileFilter = (req, file, cb) => {
  // Preview image field — only allow images
  if (file.fieldname === 'preview') {
    if (IMAGE_TYPES.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Preview must be an image (PNG, JPG, GIF, WebP)'), false)
    }
    return
  }
  // Product file field — allow all supported types
  if (ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error(`File type not allowed: ${file.mimetype}`), false)
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max
  },
})

module.exports = upload
