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

const fileFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp']
  if (allowed.includes(file.mimetype)) cb(null, true)
  else cb(new Error('Solo se permiten imágenes JPG, PNG o WEBP'))
}

export const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } })

export function getPublicUrl(filename: string): string {
  const base = process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 3001}`
  return `${base}/uploads/${filename}`
}
