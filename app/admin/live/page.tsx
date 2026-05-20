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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

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
    return { dot: "theme-dot-success", text: "theme-text-success", label: "Live" }
  }

  if (diff < 120) {
    return { dot: "theme-dot-warning", text: "theme-text-warning", label: "Recent" }
  }

  return { dot: "theme-dot-danger", text: "theme-text-danger", label: "Offline" }
}

function getTrackingStatusBadge(status: string) {
  const normalizedStatus = status.toUpperCase()

  if (normalizedStatus === "ACTIVE") {
    return {
      dot: "bg-emerald-400",
      badge:
        "border-emerald-400/25 bg-emerald-500/10 text-emerald-300 shadow-emerald-500/10",
    }
  }

  if (normalizedStatus === "COMPLETE") {
    return {
      dot: "bg-cyan-300",
      badge:
        "border-cyan-400/25 bg-cyan-500/10 text-cyan-200 shadow-cyan-500/10",
    }
  }

  return {
    dot: "bg-zinc-400",
    badge: "border-white/10 bg-white/5 text-zinc-300 shadow-black/10",
  }
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
    <div className="app-shell flex min-h-screen min-w-0 flex-col font-sans">
      {/* TOP BAR */}
      <header className="flex flex-shrink-0 flex-col gap-4 border-b border-border/70 bg-background/70 px-4 py-4 backdrop-blur sm:px-6 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2">
            <Satellite className="h-4 w-4 text-primary" />
            <span className="text-sm font-bold tracking-normal text-foreground">
              LIVE TRACKING
            </span>
          </div>

          <div className="hidden h-4 w-px bg-border lg:block" />

          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
            <span className="text-xs font-medium text-primary">
              SYSTEM ACTIVE
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4 xl:justify-end">
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-4">
            <div className="flex min-w-0 items-center gap-2 rounded-lg border border-border/60 bg-card/60 px-3 py-2 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
              <Users className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
              <span className="text-sm font-bold text-foreground">{hikers.length}</span>
              <span className="truncate text-xs text-muted-foreground">
                tracked
              </span>
            </div>

            <div className="flex min-w-0 items-center gap-2 rounded-lg border border-border/60 bg-card/60 px-3 py-2 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
              <Activity className="h-4 w-4 flex-shrink-0 text-primary" />
              <span className="text-sm font-bold text-primary">
                {liveCount}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                live
              </span>
            </div>

            <div className="col-span-2 flex min-w-0 items-center gap-2 rounded-lg border border-border/60 bg-card/60 px-3 py-2 sm:col-span-1 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
              <Clock className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
              <span className="truncate text-xs text-muted-foreground">
                {lastRefresh.toLocaleTimeString("en-MY", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </span>
            </div>
          </div>

          <Button
            onClick={fetchLiveLocations}
            disabled={isRefreshing}
            variant="outline"
            size="sm"
            className="w-full sm:w-auto"
          >
            <RefreshCw className={`h-3 w-3 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <div className="flex flex-1 min-h-0 flex-col overflow-hidden lg:flex-row">
        {/* MAP */}
        <div className="relative min-h-[48vh] flex-1 lg:min-h-0">
          <Map center={[1.8571, 103.0726]} zoom={15}>
            <MapTileLayer
              name="OpenTopoMap"
              url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
              attribution="Map data © OpenStreetMap contributors, SRTM | Map style © OpenTopoMap"
            />
            <MapZoomControl />

            {hikers.map(h => (
              (() => {
                const trackingStatusBadge = getTrackingStatusBadge(h.tracking_status)

                return (
                  <MapMarker
                    key={getLocationKey(h)}
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
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-white/45">Status</span>
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] ${trackingStatusBadge.badge}`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${trackingStatusBadge.dot}`}
                              />
                              {h.tracking_status}
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-3">
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
                )
              })()
            ))}
          </Map>

          <Card className="absolute left-3 right-3 top-3 z-10 gap-0 border-border/70 bg-card/90 py-0 shadow-lg backdrop-blur sm:left-4 sm:right-auto sm:top-4">
            <CardContent className="flex items-center gap-2 px-3 py-2 sm:px-4">
              <MapPin className="h-4 w-4 flex-shrink-0 text-primary" />
              <span className="truncate text-sm font-bold text-foreground">
                {hikers.length} Hikers On Trail
              </span>
            </CardContent>
          </Card>

          <Card className="absolute bottom-3 left-3 right-3 z-10 gap-0 border-border/70 bg-card/90 py-0 backdrop-blur sm:bottom-4 sm:left-4 sm:right-auto">
            <CardContent className="flex items-center gap-2 px-3 py-1.5">
              <Signal className="h-3 w-3 flex-shrink-0 text-primary" />
              <span className="text-xs text-muted-foreground">
                Auto-refresh every 5s
              </span>
            </CardContent>
          </Card>
        </div>

        {/* SIDEBAR */}
        <aside className="flex max-h-[50vh] w-full flex-shrink-0 flex-col overflow-hidden border-t border-border/70 bg-card/75 lg:max-h-none lg:w-80 lg:border-l lg:border-t-0 xl:w-96">
          <div className="flex-shrink-0 border-b border-border/70 px-4 py-3">
            <div className="flex items-center gap-2">
              <Radio className="h-4 w-4 text-primary" />
              <span className="text-xs font-bold tracking-normal text-foreground">
                ACTIVE HIKERS
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-x-hidden overflow-y-auto p-3">
            {hikers.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 py-12">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted"
                >
                  <Users className="h-6 w-6 text-muted-foreground" />
                </div>

                <p className="text-center text-xs text-muted-foreground">
                  No hikers currently tracked
                </p>
              </div>
            ) : (
              <div className="grid gap-2">
              {hikers.map(h => {
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
                    type="button"
                    onClick={() => setSelectedHiker(isSelected ? null : h)}
                    className={`h-auto w-full items-stretch justify-start overflow-hidden whitespace-normal rounded-xl border p-3 text-left transition-all ${
                      isSelected
                        ? "border-primary/40 bg-primary/10"
                        : "border-border/60 bg-background/50 hover:bg-accent/40"
                    }`}
                  >
                    <div className="flex min-w-0 flex-wrap items-start gap-2.5">
                      <div
                        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary"
                      >
                        {h.name.charAt(0).toUpperCase()}
                      </div>

                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="min-w-0">
                          <p className="break-words text-sm font-semibold leading-5 text-foreground">
                            {h.name}
                          </p>
                          <p className="mt-1 break-all font-mono text-xs leading-4 text-muted-foreground">
                            {h.latitude.toFixed(4)}, {h.longitude.toFixed(4)}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`h-2 w-2 flex-shrink-0 animate-pulse rounded-full ${status.dot}`} />
                          <Badge
                            variant="outline"
                            className={`max-w-full flex-shrink whitespace-normal break-words px-2 py-1 text-[10px] leading-4 ${status.text}`}
                          >
                            {status.label}
                          </Badge>
                          <span className="max-w-full rounded-full border border-border/60 bg-background/60 px-2 py-1 text-[10px] font-medium text-muted-foreground">
                            {h.role}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div
                      className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-border/50 pt-2"
                    >
                      <Clock className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                      <span className="break-words text-xs text-muted-foreground">
                        Updated {formatTimeAgo(h.updated_at)}
                      </span>
                    </div>

                    <div
                      className={`mt-2 flex flex-wrap items-start gap-2 rounded-lg border px-2.5 py-2 ${
                        isLowBattery
                          ? "border-destructive/30 bg-destructive/10"
                          : "border-border/50 bg-background/50"
                      }`}
                    >
                      <div className="flex min-w-0 flex-1 items-start gap-2">
                        {isLowBattery ? (
                          <BatteryWarning className="theme-text-danger mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                        ) : (
                          <Battery className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                        )}

                        <span className={`min-w-0 break-words text-xs leading-4 ${isLowBattery ? "theme-text-danger" : "text-muted-foreground"}`}>
                          Battery: {hasBatteryLevel ? `${batteryLevel}%` : "Unknown"}
                        </span>
                      </div>

                      {isLowBattery && (
                        <Badge
                          variant="outline"
                          className="theme-chip-warning max-w-full flex-shrink whitespace-normal break-words text-[10px] font-bold tracking-[0.08em]"
                        >
                          LOW BATTERY
                        </Badge>
                      )}
                    </div>
                  </button>
                )
              })}
              </div>
            )}
          </div>

          <div className="flex-shrink-0 border-t border-border/70 px-4 py-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                <span className="text-xs text-muted-foreground">
                  Live connection
                </span>
              </div>

              <span className="font-mono text-xs text-muted-foreground">
                5s interval
              </span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
