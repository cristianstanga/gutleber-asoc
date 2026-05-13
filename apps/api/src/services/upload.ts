import multer from 'multer'
import path from 'path'
import fs from 'fs'

const UPLOADS_DIR = path.join(process.cwd(), 'uploads')

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname)
    const nombre = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`
    cb(null, nombre)
  },
})

// ── Filtro solo imágenes ──────────────────────────────────────────────────────

const imageFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp']
  if (allowed.includes(file.mimetype)) cb(null, true)
  else cb(new Error('Solo se permiten imágenes JPG, PNG o WEBP'))
}

export const upload = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
})

// ── Filtro solo videos ────────────────────────────────────────────────────────

const videoFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo', 'video/mpeg']
  if (allowed.includes(file.mimetype)) cb(null, true)
  else cb(new Error('Solo se permiten videos MP4, MOV, WEBM o AVI'))
}

export const uploadVideo = multer({
  storage,
  fileFilter: videoFilter,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB
})

// ── URL pública ───────────────────────────────────────────────────────────────

export function getPublicUrl(filename: string): string {
  const base = process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 3001}`
  return `${base}/uploads/${filename}`
}
