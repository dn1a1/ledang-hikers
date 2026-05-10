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

type TrackerRole = "HIKER" | "GUIDER"

type LiveLocation = {
  hiker_id: number | null
  guider_id: number | null
  role: TrackerRole
  name: string
  latitude: number
  longitude: number
  updated_at: string
  tracking_status: string
  battery_level: number | null
  battery_status: string | null
}

type LiveLocationRow = {
  hiker_id: number | null
  guider_id: number | null
  role: TrackerRole
  latitude: number
  longitude: number
  updated_at: string
  tracking_status: string
  battery_level: number | null
  battery_status: string | null
  hikers: { name: string } | { name: string }[] | null
  guiders: { name: string } | { name: string }[] | null
}

export default function LiveMap() {
  const [hikers, setHikers] = useState<LiveLocation[]>([])

  async function fetchLiveLocations() {
    const { data, error } = await supabase
      .from("lokasi_pendaki")
      .select(`
        hiker_id,
        guider_id,
        role,
        latitude,
        longitude,
        updated_at,
        tracking_status,
        battery_level,
        battery_status,
        hikers!lokasi_pendaki_hiker_id_fkey ( name ),
        guiders!lokasi_pendaki_guider_id_fkey ( name )
      `)
      .eq("tracking_status", "ACTIVE")

    if (error) {
      console.error("❌ SUPABASE ERROR:", error)
      return
    }

    if (!data) return

    setHikers(
      data.map((h: LiveLocationRow) => {
        const hikerData = Array.isArray(h.hikers) ? h.hikers[0] : h.hikers
        const guiderData = Array.isArray(h.guiders) ? h.guiders[0] : h.guiders
        const name = h.role === "GUIDER" ? guiderData?.name : hikerData?.name

        return {
          hiker_id: h.hiker_id,
          guider_id: h.guider_id,
          role: h.role,
          name: name ?? "Unknown",
          latitude: h.latitude,
          longitude: h.longitude,
          updated_at: h.updated_at,
          tracking_status: h.tracking_status,
          battery_level: h.battery_level,
          battery_status: h.battery_status,
        }
      })
    )
  }

  useEffect(() => {
    fetchLiveLocations()

    const interval = setInterval(fetchLiveLocations, 5000)

    return () => clearInterval(interval)
  }, [])

  const getMarkerKey = (location: LiveLocation) =>
    `${location.role}-${location.hiker_id || location.guider_id}`

  return (
    <div className="h-full w-full">
      <Map center={[1.8571, 103.0726]} zoom={15}>
        <MapTileLayer name="Default" />
        <MapZoomControl />

        {hikers.map(h => (
          <MapMarker key={getMarkerKey(h)} position={[h.latitude, h.longitude]}>
            <MapPopup>
              <b>{h.name}</b>
              <br />
              Role: {h.role}
              <br />
              Status: {h.tracking_status}
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
