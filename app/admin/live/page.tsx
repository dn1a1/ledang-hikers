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
import {
  Activity,
  Battery,
  BatteryWarning,
  Users,
  Clock,
  Radio,
  Satellite,
  MapPin,
  RefreshCw,
  Signal,
} from "lucide-react"

/* ================= TYPES ================= */
type TrackerRole = "HIKER" | "GUIDER"

type HikerLocation = {
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

/* ================= HELPERS ================= */
function formatTimeAgo(dateString: string) {
  const diff = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}

function getStatusColor(dateString: string) {
  const diff = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000)

  if (diff < 30) {
    return { dot: "bg-emerald-400", text: "text-emerald-400", label: "Live" }
  }

  if (diff < 120) {
    return { dot: "bg-amber-400", text: "text-amber-400", label: "Recent" }
  }

  return { dot: "bg-red-400", text: "text-red-400", label: "Offline" }
}

/* ================= MAIN PAGE ================= */
export default function LiveMonitoringPage() {
  const [hikers, setHikers] = useState<HikerLocation[]>([])
  const [selectedHiker, setSelectedHiker] = useState<HikerLocation | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [isRefreshing, setIsRefreshing] = useState(false)

  /* ================= FETCH LIVE LOCATIONS ================= */
  async function fetchLiveLocations() {
    setIsRefreshing(true)

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
      setIsRefreshing(false)
      return
    }

    if (!data) {
      setIsRefreshing(false)
      return
    }

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

    setLastRefresh(new Date())
    setIsRefreshing(false)
  }

  /* ================= POLLING ================= */
  useEffect(() => {
    fetchLiveLocations()

    const interval = setInterval(fetchLiveLocations, 5000)

    return () => clearInterval(interval)
  }, [])

  const liveCount = hikers.filter(h => {
    const diff = Math.floor((Date.now() - new Date(h.updated_at).getTime()) / 1000)
    return diff < 30
  }).length

  const getLocationKey = (location: HikerLocation) =>
    `${location.role}-${location.hiker_id || location.guider_id}`

  /* ================= UI ================= */
  return (
    <div
      className="flex h-screen flex-col"
      style={{ background: "#080d0b", fontFamily: "'DM Mono', monospace" }}
    >
      {/* TOP BAR */}
      <header
        className="flex flex-shrink-0 items-center justify-between border-b px-6 py-3"
        style={{
          background: "rgba(255,255,255,0.02)",
          borderColor: "rgba(255,255,255,0.06)",
        }}
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Satellite className="h-4 w-4 text-emerald-400" />
            <span
              className="text-sm font-bold tracking-widest text-white"
              style={{ letterSpacing: "0.2em" }}
            >
              LIVE TRACKING
            </span>
          </div>

          <div
            className="h-4 w-px"
            style={{ background: "rgba(255,255,255,0.1)" }}
          />

          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            <span className="text-xs font-medium text-emerald-400">
              SYSTEM ACTIVE
            </span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Users
              className="h-4 w-4"
              style={{ color: "rgba(255,255,255,0.4)" }}
            />
            <span className="text-sm font-bold text-white">{hikers.length}</span>
            <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
              tracked
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-400" />
            <span className="text-sm font-bold text-emerald-400">
              {liveCount}
            </span>
            <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
              live
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Clock
              className="h-4 w-4"
              style={{ color: "rgba(255,255,255,0.3)" }}
            />
            <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
              {lastRefresh.toLocaleTimeString("en-MY", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </span>
          </div>

          <button
            onClick={fetchLiveLocations}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition-all"
            style={{
              background: "rgba(255,255,255,0.05)",
              color: "rgba(255,255,255,0.5)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <RefreshCw className={`h-3 w-3 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <div className="flex flex-1 overflow-hidden">
        {/* MAP */}
        <div className="relative flex-1">
          <Map center={[1.8571, 103.0726]} zoom={15}>
            <MapTileLayer name="Default" />
            <MapZoomControl />

            {hikers.map(h => (
              <MapMarker key={getLocationKey(h)} position={[h.latitude, h.longitude]}>
                <MapPopup>
                  <div style={{ fontFamily: "DM Sans, sans-serif", minWidth: "140px" }}>
                    <p style={{ fontWeight: 700, fontSize: "14px", marginBottom: "4px" }}>
                      {h.name}
                    </p>

                    <p style={{ fontSize: "11px", color: "#6b7280" }}>
                      Role: {h.role}
                    </p>

                    <p style={{ fontSize: "11px", color: "#6b7280" }}>
                      Status: {h.tracking_status}
                    </p>

                    <p style={{ fontSize: "11px", color: "#6b7280" }}>
                      {h.latitude.toFixed(5)}, {h.longitude.toFixed(5)}
                    </p>

                    <p
                      style={{
                        fontSize: "11px",
                        color: "#6b7280",
                        marginTop: "2px",
                      }}
                    >
                      Updated: {new Date(h.updated_at).toLocaleTimeString()}
                    </p>
                  </div>
                </MapPopup>
              </MapMarker>
            ))}
          </Map>

          <div
            className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-xl px-4 py-2"
            style={{
              background: "rgba(8,13,11,0.85)",
              border: "1px solid rgba(255,255,255,0.08)",
              backdropFilter: "blur(8px)",
            }}
          >
            <MapPin className="h-4 w-4 text-emerald-400" />
            <span className="text-sm font-bold text-white">
              {hikers.length} Hikers On Trail
            </span>
          </div>

          <div
            className="absolute bottom-4 left-4 z-10 flex items-center gap-2 rounded-lg px-3 py-1.5"
            style={{
              background: "rgba(8,13,11,0.85)",
              border: "1px solid rgba(255,255,255,0.06)",
              backdropFilter: "blur(8px)",
            }}
          >
            <Signal className="h-3 w-3 text-emerald-400" />
            <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
              Auto-refresh every 5s
            </span>
          </div>
        </div>

        {/* SIDEBAR */}
        <aside
          className="flex w-72 flex-shrink-0 flex-col overflow-hidden border-l"
          style={{
            background: "rgba(255,255,255,0.02)",
            borderColor: "rgba(255,255,255,0.06)",
          }}
        >
          <div
            className="flex-shrink-0 border-b px-4 py-3"
            style={{ borderColor: "rgba(255,255,255,0.06)" }}
          >
            <div className="flex items-center gap-2">
              <Radio className="h-4 w-4 text-emerald-400" />
              <span
                className="text-xs font-bold tracking-widest text-white"
                style={{ letterSpacing: "0.15em" }}
              >
                ACTIVE HIKERS
              </span>
            </div>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto p-3">
            {hikers.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 py-12">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-2xl"
                  style={{ background: "rgba(255,255,255,0.04)" }}
                >
                  <Users
                    className="h-6 w-6"
                    style={{ color: "rgba(255,255,255,0.2)" }}
                  />
                </div>

                <p
                  className="text-center text-xs"
                  style={{ color: "rgba(255,255,255,0.3)" }}
                >
                  No hikers currently tracked
                </p>
              </div>
            ) : (
              hikers.map(h => {
                const status = getStatusColor(h.updated_at)
                const batteryLevel = h.battery_level
                const hasBatteryLevel = batteryLevel !== null
                const isLowBattery = batteryLevel !== null && batteryLevel <= 20
                const isSelected = selectedHiker
                  ? getLocationKey(selectedHiker) === getLocationKey(h)
                  : false

                return (
                  <button
                    key={getLocationKey(h)}
                    onClick={() => setSelectedHiker(isSelected ? null : h)}
                    className="w-full rounded-xl p-3 text-left transition-all"
                    style={{
                      background: isSelected
                        ? "rgba(16,185,129,0.1)"
                        : "rgba(255,255,255,0.03)",
                      border: isSelected
                        ? "1px solid rgba(16,185,129,0.3)"
                        : "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 flex-1 items-center gap-2.5">
                        <div
                          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold"
                          style={{
                            background: "rgba(16,185,129,0.15)",
                            color: "#10b981",
                          }}
                        >
                          {h.name.charAt(0).toUpperCase()}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">
                            {h.name}
                          </p>
                          <p
                            className="truncate text-xs"
                            style={{
                              color: "rgba(255,255,255,0.35)",
                              fontFamily: "DM Mono, monospace",
                            }}
                          >
                            {h.latitude.toFixed(4)}, {h.longitude.toFixed(4)}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-shrink-0 flex-col items-end gap-1">
                        <span className={`h-2 w-2 animate-pulse rounded-full ${status.dot}`} />
                        <span className={`text-xs font-medium ${status.text}`}>
                          {status.label}
                        </span>
                      </div>
                    </div>

                    <div
                      className="mt-2 flex items-center gap-1.5 pt-2"
                      style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
                    >
                      <Clock
                        className="h-3 w-3"
                        style={{ color: "rgba(255,255,255,0.25)" }}
                      />
                      <span
                        className="text-xs"
                        style={{ color: "rgba(255,255,255,0.3)" }}
                      >
                        {formatTimeAgo(h.updated_at)}
                      </span>
                    </div>

                    <div
                      className="mt-2 flex items-center justify-between gap-2 rounded-lg px-2.5 py-2"
                      style={{
                        background: isLowBattery
                          ? "rgba(239,68,68,0.1)"
                          : "rgba(255,255,255,0.025)",
                        border: isLowBattery
                          ? "1px solid rgba(248,113,113,0.28)"
                          : "1px solid rgba(255,255,255,0.05)",
                      }}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        {isLowBattery ? (
                          <BatteryWarning className="h-3.5 w-3.5 flex-shrink-0 text-red-400" />
                        ) : (
                          <Battery
                            className="h-3.5 w-3.5 flex-shrink-0"
                            style={{ color: "rgba(255,255,255,0.32)" }}
                          />
                        )}

                        <span
                          className="truncate text-xs"
                          style={{
                            color: isLowBattery
                              ? "#fca5a5"
                              : "rgba(255,255,255,0.42)",
                          }}
                        >
                          Battery: {hasBatteryLevel ? `${batteryLevel}%` : "Unknown"}
                        </span>
                      </div>

                      {isLowBattery && (
                        <span
                          className="flex-shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold"
                          style={{
                            background: "rgba(251,191,36,0.16)",
                            border: "1px solid rgba(251,191,36,0.35)",
                            color: "#fbbf24",
                            letterSpacing: "0.08em",
                          }}
                        >
                          LOW BATTERY
                        </span>
                      )}
                    </div>
                  </button>
                )
              })
            )}
          </div>

          <div
            className="flex-shrink-0 border-t px-4 py-3"
            style={{ borderColor: "rgba(255,255,255,0.06)" }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                  Live connection
                </span>
              </div>

              <span
                className="text-xs"
                style={{
                  color: "rgba(255,255,255,0.2)",
                  fontFamily: "DM Mono, monospace",
                }}
              >
                5s interval
              </span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
