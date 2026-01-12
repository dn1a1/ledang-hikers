'use client'

import { useEffect, useState } from 'react'
import * as L from 'leaflet'
import { Polyline, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

import { Map, MapTileLayer } from '@/components/ui/map'

export default function LedangMapClient() {
  const [route, setRoute] = useState<L.LatLngExpression[]>([])
  const [bounds, setBounds] = useState<L.LatLngBounds | null>(null)

  useEffect(() => {
    fetch('/gpx/gunung-ledang.gpx')
      .then(res => res.text())
      .then(gpxText => {
        const parser = new DOMParser()
        const xml = parser.parseFromString(gpxText, 'application/xml')

        const points = Array.from(xml.getElementsByTagName('trkpt')).map(p => [
          parseFloat(p.getAttribute('lat')!),
          parseFloat(p.getAttribute('lon')!)
        ]) as L.LatLngExpression[]

        if (points.length > 0) {
          setRoute(points)
          setBounds(L.latLngBounds(points))
        }
      })
  }, [])

  return (
    <div className="h-screen w-full">
      <Map center={[2.35, 102.62]} zoom={13} className="h-full w-full">
        <MapTileLayer />

        {route.length > 0 && (
          <Polyline
            positions={route}
            pathOptions={{
              color: '#22c55e',
              weight: 5,
              opacity: 0.9,
            }}
          />
        )}

        {bounds && <FitBounds bounds={bounds} />}
      </Map>
    </div>
  )
}

function FitBounds({ bounds }: { bounds: L.LatLngBounds }) {
  const map = useMap()

  useEffect(() => {
    map.fitBounds(bounds, { padding: [30, 30] })
  }, [bounds, map])

  return null
}
