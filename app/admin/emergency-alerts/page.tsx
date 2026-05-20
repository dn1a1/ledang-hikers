"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  Activity,
  AlertTriangle,
  Bell,
  BellOff,
  CheckCircle2,
  Clock,
  MapPin,
  Navigation,
  Radio,
  RefreshCw,
  Satellite,
  Shield,
  User,
  UserCheck,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"

type Hiker = {
  id: number
  name: string
  email: string | null
}

type EmergencyAlert = {
  id: number
  emergency_type: string
  status: string
  created_at: string
  acknowledged_at: string | null
  latitude: number | null
  longitude: number | null
  hiker_id: number | null
  hikers: Hiker | null
}

type EmergencyAlertPayload = Omit<EmergencyAlert, "hikers"> & {
  hikers?: Hiker | null
}

function formatTimeAgo(dateString: string) {
  const diff = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000)
  if (diff < 60) return "Just now"
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function getEmergencyMeta(type: string) {
  switch (type.toLowerCase()) {
    case "critical":
      return {
        label: "Critical",
        icon: AlertTriangle,
        tone: "theme-text-danger",
        chip: "theme-chip-danger",
        panel: "theme-callout theme-callout-danger",
        accent: "border-l-red-500",
      }
    case "medical":
      return {
        label: "Medical",
        icon: Activity,
        tone: "theme-text-warning",
        chip: "theme-chip-warning",
        panel: "theme-callout theme-callout-warning",
        accent: "border-l-orange-500",
      }
    case "injury":
      return {
        label: "Injury",
        icon: Shield,
        tone: "theme-text-warning",
        chip: "theme-chip-warning",
        panel: "theme-callout theme-callout-warning",
        accent: "border-l-amber-500",
      }
    case "lost":
      return {
        label: "Lost",
        icon: MapPin,
        tone: "theme-text-info",
        chip: "theme-chip-info",
        panel: "theme-callout theme-callout-info",
        accent: "border-l-blue-500",
      }
    default:
      return {
        label: type,
        icon: AlertTriangle,
        tone: "theme-text-danger",
        chip: "theme-chip-danger",
        panel: "theme-callout theme-callout-danger",
        accent: "border-l-red-500",
      }
  }
}

export default function EmergencyAlertsPage() {
  const [alerts, setAlerts] = useState<EmergencyAlert[]>([])
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [now, setNow] = useState(new Date())

  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const savedSound = localStorage.getItem("soundEnabled")
    setSoundEnabled(savedSound === null || savedSound === "true")
  }, [])

  useEffect(() => {
    fetchAlerts()
  }, [])

  useEffect(() => {
    const channel = supabase
      .channel("emergency-alerts-live")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "emergency_alerts",
        },
        async (payload) => {
          const newAlert = payload.new as EmergencyAlertPayload
          let hiker: Hiker | null = newAlert.hikers ?? null

          if (newAlert.hiker_id) {
            const { data: hikerData, error: hikerError } = await supabase
              .from("hikers")
              .select("id, name, email")
              .eq("id", newAlert.hiker_id)
              .single()

            if (hikerError) {
              console.error("fetch hiker error:", hikerError)
            } else {
              hiker = hikerData
            }
          }

          const alert: EmergencyAlert = { ...newAlert, hikers: hiker }

          setAlerts((previous) => {
            if (previous.some((item) => item.id === alert.id)) return previous
            return [alert, ...previous]
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    if (!audioRef.current) return

    if (soundEnabled && alerts.length > 0) {
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(() => {})
      return
    }

    audioRef.current.pause()
    audioRef.current.currentTime = 0
  }, [alerts.length, soundEnabled])

  async function fetchAlerts() {
    setIsLoading(true)

    try {
      const { data, error } = await supabase
        .from("emergency_alerts")
        .select("*, hikers (id, name, email)")
        .eq("status", "NEW")
        .order("created_at", { ascending: false })

      if (error) {
        console.error("fetch emergency alerts error:", error)
        return
      }

      setAlerts(data ?? [])
    } catch (error) {
      console.error("unexpected emergency fetch error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  async function acknowledgeAlert(id: number) {
    const { error } = await supabase
      .from("emergency_alerts")
      .update({ status: "ACKNOWLEDGED", acknowledged_at: new Date().toISOString() })
      .eq("id", id)

    if (error) {
      console.error("acknowledge emergency error:", error)
      alert("Gagal acknowledge emergency")
      return
    }

    setAlerts((previous) => previous.filter((alert) => alert.id !== id))
  }

  function openGoogleMaps(lat: number, lng: number) {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
    window.open(url, "_blank")
  }

  const hasAlerts = alerts.length > 0
  const uniqueHikersInDistress = useMemo(
    () => new Set(alerts.map((alert) => alert.hiker_id).filter((id): id is number => id !== null)).size,
    [alerts]
  )
  const criticalAlerts = useMemo(
    () => alerts.filter((alert) => alert.emergency_type.toLowerCase() === "critical").length,
    [alerts]
  )
  const latestAlert = alerts[0] ?? null

  return (
    <div className="app-shell min-h-screen p-4 md:p-6">
      <div className="mx-auto max-w-screen-xl space-y-6">
        {hasAlerts && (
          <section className="theme-callout theme-callout-danger rounded-3xl px-4 py-3 text-sm theme-text-danger">
            <div className="flex flex-wrap items-center justify-center gap-3 text-center font-medium">
              <AlertTriangle className="h-4 w-4" />
              {alerts.length} active {alerts.length === 1 ? "emergency" : "emergencies"} require immediate attention
              <AlertTriangle className="h-4 w-4" />
            </div>
          </section>
        )}

        <section className="panel-surface">
          <div className="panel-header">
            <div className="flex items-start gap-4">
              <div className="theme-icon-chip theme-icon-chip-danger">
                <Bell className="h-6 w-6" />
              </div>
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge variant="outline">Emergency Operations</Badge>
                  <Badge className="theme-chip-danger hover:bg-red-500/10">
                    Incident Monitor
                  </Badge>
                  {hasAlerts && (
                    <Badge className="theme-chip-warning hover:bg-amber-500/10">
                      {alerts.length} Active
                    </Badge>
                  )}
                </div>
                <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Emergency Alerts</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Real-time incident monitoring for hikers on Gunung Ledang, with response actions and live audio alerts.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Satellite className="theme-text-info h-3.5 w-3.5" />
                    Real-time hiker tracking
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Radio className="theme-text-success h-3.5 w-3.5" />
                    Supabase live channel
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="theme-text-warning h-3.5 w-3.5" />
                    Gunung Ledang, Johor
                  </span>
                </div>
              </div>
            </div>

            <div className="flex w-full flex-col gap-3 sm:w-auto sm:items-end">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="theme-chip-success hover:bg-emerald-500/10">
                  <span className="theme-dot-success size-2 rounded-full" />
                  Live
                </Badge>
                <Badge variant="outline" className="font-mono">
                  {now.toLocaleTimeString("en-MY", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </Badge>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={soundEnabled ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => {
                    const nextState = !soundEnabled
                    setSoundEnabled(nextState)
                    localStorage.setItem("soundEnabled", String(nextState))
                  }}
                >
                  {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                  {soundEnabled ? "Alarm On" : "Alarm Off"}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={fetchAlerts} disabled={isLoading}>
                  <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                  {isLoading ? "Refreshing..." : "Refresh"}
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={<Bell className="h-5 w-5" />}
            label="Active Alerts"
            value={alerts.length}
            tone={hasAlerts ? "theme-text-danger" : "theme-text-success"}
            note={hasAlerts ? "Require response" : "All clear"}
          />
          <MetricCard
            icon={<UserCheck className="h-5 w-5" />}
            label="Hikers in Distress"
            value={uniqueHikersInDistress}
            tone="theme-text-info"
            note="Unique individuals"
          />
          <MetricCard
            icon={<Clock className="h-5 w-5" />}
            label="Latest Alert"
            value={
              latestAlert
                ? new Date(latestAlert.created_at).toLocaleTimeString("en-MY", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "--"
            }
            tone="theme-text-warning"
            note={latestAlert ? formatTimeAgo(latestAlert.created_at) : "No recent alerts"}
          />
          <MetricCard
            icon={<Zap className="h-5 w-5" />}
            label="Critical Alerts"
            value={criticalAlerts}
            tone="text-primary"
            note={soundEnabled ? "Alarm enabled" : "Alarm muted"}
          />
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Active Emergencies</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Review each incident, navigate to coordinates, and acknowledge when a response has started.
              </p>
            </div>
            {hasAlerts && (
              <Badge className="theme-chip-danger hover:bg-red-500/10">
                {alerts.length} pending
              </Badge>
            )}
          </div>

          {isLoading ? (
            <section className="panel-surface">
              <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                <div>
                  <h3 className="font-medium text-foreground">Loading emergency data</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Pulling the latest live incidents from Supabase.</p>
                </div>
              </div>
            </section>
          ) : !hasAlerts ? (
            <section className="panel-surface">
              <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                  <BellOff className="h-7 w-7 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">All systems clear</h3>
                  <p className="mt-1 max-w-md text-sm text-muted-foreground">
                    No active emergency alerts right now. Monitoring remains live for all registered hikers.
                  </p>
                </div>
              </div>
            </section>
          ) : (
            <div className="space-y-4">
              {alerts.map((alert) => {
                const meta = getEmergencyMeta(alert.emergency_type)
                const Icon = meta.icon

                return (
                  <section key={alert.id} className={cn("panel-surface overflow-hidden border-l-4", meta.panel, meta.accent)}>
                    <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_280px]">
                      <div className="space-y-5 p-5 sm:p-6">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl border", meta.chip)}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="outline" className={meta.chip}>
                                  <Zap className="h-3 w-3" />
                                  {meta.label}
                                </Badge>
                                <Badge className="theme-chip-warning hover:bg-amber-500/10">
                                  {alert.status}
                                </Badge>
                                <Badge variant="outline" className="theme-chip-info">
                                  <User className="h-3 w-3" />
                                  {alert.hikers?.name ?? "Unknown Hiker"}
                                </Badge>
                              </div>
                              <h3 className="mt-3 text-lg font-semibold text-foreground">Alert #{alert.id}</h3>
                              <p className="mt-1 text-sm text-muted-foreground">
                                Logged {formatTimeAgo(alert.created_at)} at{" "}
                                {new Date(alert.created_at).toLocaleTimeString("en-MY", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            </div>
                          </div>

                          <Badge variant="outline" className="font-mono text-muted-foreground">
                            TG-{String(alert.id).padStart(5, "0")}
                          </Badge>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                          <MetaCard
                            icon={<Clock className="h-4 w-4" />}
                            label="Alert Time"
                            value={new Date(alert.created_at).toLocaleTimeString("en-MY", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                            note={formatTimeAgo(alert.created_at)}
                          />
                          <MetaCard
                            icon={<User className="h-4 w-4" />}
                            label="Hiker"
                            value={alert.hiker_id ? `HKR-${String(alert.hiker_id).padStart(4, "0")}` : "Unknown"}
                            note={alert.hikers?.name ?? "No linked hiker record"}
                          />
                          <MetaCard
                            icon={<MapPin className="h-4 w-4" />}
                            label="Coordinates"
                            value={
                              alert.latitude !== null && alert.longitude !== null
                                ? `${alert.latitude.toFixed(4)}, ${alert.longitude.toFixed(4)}`
                                : "Unavailable"
                            }
                            note={alert.latitude !== null && alert.longitude !== null ? "GPS destination ready" : "No location sent"}
                          />
                        </div>

                        {alert.latitude !== null && alert.longitude !== null && (
                          <div className="flex flex-wrap gap-2">
                            <Button type="button" variant="outline" onClick={() => openGoogleMaps(alert.latitude!, alert.longitude!)}>
                              <Navigation className="h-4 w-4" />
                              Navigate to Location
                            </Button>
                          </div>
                        )}
                      </div>

                      <div className="border-t border-border/60 bg-muted/25 p-5 xl:border-t-0 xl:border-l">
                        <div className="flex h-full flex-col justify-between gap-5">
                          <div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground">
                              <Shield className="h-3.5 w-3.5" />
                              Response Action
                            </div>
                            <p className="mt-3 text-sm text-muted-foreground">
                              Acknowledge this incident to confirm it has been received and stop the ongoing alarm.
                            </p>
                          </div>

                          <div className="space-y-3">
                            <Button
                              type="button"
                              className="w-full bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
                              onClick={() => acknowledgeAlert(alert.id)}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              Acknowledge Alert
                            </Button>
                            <p className="text-xs text-muted-foreground">Status changes to acknowledged and removes it from the live queue.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>
                )
              })}
            </div>
          )}
        </section>

        <section className="panel-surface">
          <div className="panel-header">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "size-2 rounded-full",
                  hasAlerts ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.7)]" : "bg-emerald-500 shadow-[0_0_10px_rgba(34,197,94,0.7)]"
                )}
              />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {hasAlerts
                    ? `${alerts.length} active ${alerts.length === 1 ? "emergency" : "emergencies"} requiring attention`
                    : "All systems operational with no active alerts"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Last updated at{" "}
                  {now.toLocaleTimeString("en-MY", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Radio className="h-3.5 w-3.5" />
                Live connection
              </span>
              <span>Control Center v2.0</span>
              <span>Gunung Ledang, Johor</span>
            </div>
          </div>
        </section>
      </div>

      <audio ref={audioRef} src="/alarm.mp3" loop />
    </div>
  )
}

function MetricCard({
  icon,
  label,
  value,
  tone,
  note,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  tone: string
  note: string
}) {
  return (
    <div className="metric-card">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-muted text-primary">{icon}</div>
        <div>
          <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
          <p className={cn("mt-1 text-2xl font-semibold", tone)}>{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{note}</p>
        </div>
      </div>
    </div>
  )
}

function MetaCard({
  icon,
  label,
  value,
  note,
}: {
  icon: React.ReactNode
  label: string
  value: string
  note: string
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-1 break-words font-mono text-sm text-foreground">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{note}</p>
        </div>
      </div>
    </div>
  )
}
