/**
 * Chequeo rápido en el navegador: ¿esta imagen tiene pinta de foto 360° (equirectangular)?
 * Una equirectangular real tiene el ancho = 2 × el alto (ej: 4000×2000, 6144×3072).
 * No es 100% infalible (alguien podría subir una foto normal recortada a 2:1), pero
 * atrapa el caso típico: subir una foto de cámara común sin darse cuenta.
 */
export interface ChequeoPanorama {
  archivo: File
  ancho: number
  alto: number
  esPanoramica: boolean
}

function leerDimensiones(file: File): Promise<{ ancho: number; alto: number } | null> {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ ancho: img.naturalWidth, alto: img.naturalHeight })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(null) // si no se puede leer, no bloqueamos la subida
    }
    img.src = url
  })
}

export async function chequearPanoramicas(files: File[]): Promise<ChequeoPanorama[]> {
  const dimensiones = await Promise.all(files.map(leerDimensiones))
  return files.map((archivo, i) => {
    const d = dimensiones[i]
    if (!d) return { archivo, ancho: 0, alto: 0, esPanoramica: true } // no se pudo leer → dejar pasar
    const ratio = d.ancho / d.alto
    return { archivo, ancho: d.ancho, alto: d.alto, esPanoramica: ratio > 1.9 && ratio < 2.1 }
  })
}

/**
 * Muestra un confirm() si hay fotos que no parecen panorámicas 2:1.
 * Devuelve true si hay que seguir con la subida (nada sospechoso, o el usuario confirmó igual).
 */
export async function confirmarSiNoSonPanoramicas(files: File[]): Promise<boolean> {
  const chequeos = await chequearPanoramicas(files)
  const sospechosas = chequeos.filter((c) => !c.esPanoramica)
  if (sospechosas.length === 0) return true

  const detalle = sospechosas.map((c) => `${c.ancho}×${c.alto}`).join(', ')
  const plural = sospechosas.length === files.length
  return confirm(
    `${plural ? 'Estas fotos no' : 'Algunas de estas fotos no'} parecen panorámicas 360° ` +
      `(una 360° real tiene el ancho = 2× el alto, ej: 4000×2000). Detectado: ${detalle}.\n\n` +
      `Si es una foto normal, en el tour 360° se va a ver como una foto recortada que se puede recorrer parcialmente, no como una esfera completa.\n\n` +
      `¿Subir igual?`
  )
}
