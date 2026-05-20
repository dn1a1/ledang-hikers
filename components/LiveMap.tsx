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

type LiveMapProps = {
  tileStyle?: "default" | "topo"
}

export default function LiveMap({ tileStyle = "default" }: LiveMapProps) {
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

  const tileLayerProps =
    tileStyle === "topo"
      ? {
          name: "OpenTopoMap",
          url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
          attribution: "Map data © OpenStreetMap contributors, SRTM | Map style © OpenTopoMap",
        }
      : {
          name: "Default",
        }

  return (
    <div className="h-full w-full">
      <Map center={[1.8571, 103.0726]} zoom={15}>
        <MapTileLayer {...tileLayerProps} />
        <MapZoomControl />

        {hikers.map(h => (
          <MapMarker
            key={getMarkerKey(h)}
            position={[h.latitude, h.longitude]}
            iconAnchor={[60, 52]}
            popupAnchor={[0, -24]}
            icon={
              <div className="relative flex flex-col items-center">
                <div className="mb-1 max-w-[110px] truncate rounded-full border border-emerald-400/30 bg-[#080c0b]/90 px-2 py-1 text-[10px] font-semibold text-white shadow-lg shadow-emerald-500/20 backdrop-blur-md">
                  {h.name}
                </div>

                <div className="relative flex h-9 w-9 items-center justify-center">
                  <span className="absolute h-9 w-9 animate-ping rounded-full bg-emerald-400/35" />
                  <span className="absolute h-7 w-7 rounded-full bg-emerald-500/25 blur-sm" />
                  <div className="relative flex h-6 w-6 items-center justify-center rounded-full border-4 border-white bg-emerald-500 shadow-[0_0_22px_rgba(16,185,129,0.9)]">
                    <div className="h-2.5 w-2.5 rounded-full bg-white" />
                  </div>
                </div>
              </div>
            }
          >
            <MapPopup>
              <div className="min-w-[240px] max-w-[270px] overflow-hidden rounded-3xl border border-emerald-400/25 bg-[#080c0b]/95 p-4 text-white shadow-2xl shadow-emerald-500/20 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-emerald-400/30 bg-emerald-500/10 text-sm font-bold text-emerald-300 shadow-lg shadow-emerald-500/10">
                    {h.role === "GUIDER" ? "G" : "H"}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-bold tracking-[0.03em] text-white">
                      {h.name}
                    </h3>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
                        {h.role}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] ${
                          h.tracking_status === "ACTIVE"
                            ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-300"
                            : h.tracking_status === "COMPLETE"
                              ? "border-cyan-400/25 bg-cyan-500/10 text-cyan-200"
                              : "border-white/10 bg-white/5 text-zinc-300"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            h.tracking_status === "ACTIVE"
                              ? "bg-emerald-400"
                              : h.tracking_status === "COMPLETE"
                                ? "bg-cyan-300"
                                : "bg-zinc-400"
                          }`}
                        />
                        {h.tracking_status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="my-4 h-px bg-gradient-to-r from-emerald-400/40 via-white/10 to-transparent" />

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-white/45">Status</span>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] ${
                        h.tracking_status === "ACTIVE"
                          ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-300"
                          : h.tracking_status === "COMPLETE"
                            ? "border-cyan-400/25 bg-cyan-500/10 text-cyan-200"
                            : "border-white/10 bg-white/5 text-zinc-300"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          h.tracking_status === "ACTIVE"
                            ? "bg-emerald-400"
                            : h.tracking_status === "COMPLETE"
                              ? "bg-cyan-300"
                              : "bg-zinc-400"
                        }`}
                      />
                      {h.tracking_status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-white/45">Last update</span>
                    <span className="font-mono text-xs text-white/80">
                      {new Date(h.updated_at).toLocaleTimeString()}
                    </span>
                  </div>

                  {h.battery_level !== null && (
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-white/45">Battery</span>
                      <span className="font-mono text-xs text-white/80">
                        {h.battery_level}%
                        {h.battery_status ? ` • ${h.battery_status}` : ""}
                      </span>
                    </div>
                  )}

                  <div className="flex items-start justify-between gap-3 text-sm">
                    <span className="pt-0.5 text-white/45">Coordinates</span>
                    <span className="text-right font-mono text-[11px] leading-4 text-white/60">
                      {h.latitude.toFixed(5)}, {h.longitude.toFixed(5)}
                    </span>
                  </div>
                </div>
              </div>
            </MapPopup>
          </MapMarker>
        ))}
      </Map>
    </div>
  )
}
