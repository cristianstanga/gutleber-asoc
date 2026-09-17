import { useEffect, useRef, useState } from 'react'
import { PropiedadTour360 } from '../lib/api'

// Pannellum se carga por <script> en index.html (librería standalone, expone window.pannellum)
declare global {
  interface Window { pannellum: any }
}

export default function Tour360Viewer({ tours }: { tours: PropiedadTour360[] }) {
  const containerId = useRef(`pano-${Math.random().toString(36).slice(2)}`)
  const viewerRef = useRef<any>(null)
  const [activo, setActivo] = useState(0)

  useEffect(() => {
    if (!tours.length) return
    let cancelado = false

    function init() {
      if (cancelado) return
      if (!window.pannellum) { setTimeout(init, 200); return }
      viewerRef.current = window.pannellum.viewer(containerId.current, {
        type: 'equirectangular',
        panorama: tours[0].url,
        autoLoad: true,
        compass: false,
        showZoomCtrl: true,
      })
    }
    init()

    return () => {
      cancelado = true
      try { viewerRef.current?.destroy?.() } catch { /* noop */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tours[0]?.id])

  function irA(i: number) {
    setActivo(i)
    viewerRef.current?.setPanorama?.(tours[i].url)
  }

  if (!tours.length) return null

  return (
    <div>
      <div id={containerId.current} className="w-full aspect-video rounded-xl overflow-hidden bg-petroleo" />
      {tours.length > 1 && (
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          {tours.map((t, i) => (
            <button
              key={t.id}
              onClick={() => irA(i)}
              className={`shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                i === activo ? 'bg-petroleo text-white border-petroleo' : 'border-crema text-petroleo/70 hover:border-acero'
              }`}
            >
              {t.etiqueta || `Vista ${i + 1}`}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
