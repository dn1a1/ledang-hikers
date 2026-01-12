"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import {
  Map,
  MapTileLayer,
  MapMarker,
  MapPopup,
  MapZoomControl,
} from "@/components/ui/map"

/* ================= TYPES ================= */
type HikerLocation = {
  hiker_id: number
  name: string
  latitude: number
  longitude: number
  updated_at: string
}

/**
 * Real Supabase row shape
 * ⚠️ hikers is ARRAY because of join
 */
type LiveLocationRow = {
  hiker_id: number
  latitude: number
  longitude: number
  updated_at: string
  hikers: {
    name: string
  }[] | null
}

export default function LiveMonitoringPage() {
  const [hikers, setHikers] = useState<HikerLocation[]>([])

  /* ================= FETCH LIVE LOCATIONS ================= */
  async function fetchLiveLocations() {
    const { data, error } = await supabase
      .from("lokasi_pendaki")
      .select(`
        hiker_id,
        latitude,
        longitude,
        updated_at,
        hikers!lokasi_pendaki_hiker_id_fkey ( name )
      `)

    if (error) {
      console.error("❌ SUPABASE ERROR:", error)
      return
    }

    if (!data) return

    setHikers(
      data.map((h: LiveLocationRow) => ({
        hiker_id: h.hiker_id,
        name: h.hikers?.[0]?.name ?? "Unknown",
        latitude: h.latitude,
        longitude: h.longitude,
        updated_at: h.updated_at,
      }))
    )
  }

  /* ================= POLLING ================= */
  useEffect(() => {
    fetchLiveLocations()
    const interval = setInterval(fetchLiveLocations, 5000)
    return () => clearInterval(interval)
  }, [])

  /* ================= UI ================= */
  return (
    <div className="h-[calc(100vh-80px)] w-full">
      <Map center={[1.8571, 103.0726]} zoom={15}>
        <MapTileLayer name="Default" />
        <MapZoomControl />

        {hikers.map(h => (
          <MapMarker
            key={h.hiker_id}
            position={[h.latitude, h.longitude]}
          >
            <MapPopup>
              <b>{h.name}</b>
              <br />
              Last update:
              <br />
              {new Date(h.updated_at).toLocaleTimeString()}
            </MapPopup>
          </MapMarker>
        ))}
      </Map>
    </div>
  )
}
