import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix marker icons broken by bundlers
const icon = L.icon({
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize:    [25, 41],
  iconAnchor:  [12, 41],
  popupAnchor: [1, -34],
  shadowSize:  [41, 41],
})

interface Props {
  lat: number | null
  lng: number | null
  onMove: (lat: number, lng: number) => void
}

export default function MapPickerLeaflet({ lat, lng, onMove }: Props) {
  const divRef    = useRef<HTMLDivElement>(null)
  const mapRef    = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)

  // Initialize map once
  useEffect(() => {
    if (!divRef.current || mapRef.current) return

    const center: L.LatLngTuple = lat && lng ? [lat, lng] : [-27.3671, -55.8961]
    const map = L.map(divRef.current, { center, zoom: lat && lng ? 15 : 13 })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>',
    }).addTo(map)

    map.on('click', (e: L.LeafletMouseEvent) => {
      onMove(e.latlng.lat, e.latlng.lng)
    })

    if (lat && lng) {
      markerRef.current = L.marker([lat, lng], { icon }).addTo(map)
    }

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update marker and pan when lat/lng change from outside (geocoding)
  useEffect(() => {
    const map = mapRef.current
    if (!map || !lat || !lng) return

    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng])
    } else {
      markerRef.current = L.marker([lat, lng], { icon }).addTo(map)
    }
    map.setView([lat, lng], 15)
  }, [lat, lng])

  // Keep click handler fresh (onMove is a closure that changes)
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const handler = (e: L.LeafletMouseEvent) => onMove(e.latlng.lat, e.latlng.lng)
    map.off('click').on('click', handler)
  }, [onMove])

  return <div ref={divRef} style={{ position: 'absolute', inset: 0 }} />
}
