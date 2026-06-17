"use client"

import React, { useEffect, useRef, useState } from "react"
import Link from "next/link"

import {
  Activity,
  AlertTriangle,
  Bell,
  BellOff,
  CheckCircle,
  ChevronRight,
  Clock,
  MapPin,
  Radio,
  User,
  Users,
} from "lucide-react"

import { useEmergencyAlerts } from "@/components/admin/EmergencyAlertsProvider"
import LiveMap from "@/components/LiveMap"
import { supabase } from "@/lib/supabase"

type Hiker = { id: number; name: string; email: string | null }

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

type HikerProgress = {
  hiker_id: number
  hiker_name: string
  checkpoint_name: string | null
  checked_at: string | null
  last_gps_updated_at: string | null
  status: "ON_TRACK" | "DELAYED" | "NO_MOVEMENT"
}

type GpsLocation = {
  hiker_id: number | null
  updated_at: string | null
}

type CheckpointLogRow = {
  hiker_id: number | null
  checked_at: string | null
  checkpoints: { name: string } | { name: string }[] | null
}

export default function AdminDashboardPage() {
  const [alerts, setAlerts] = useState<EmergencyAlert[]>([])
  const [hikerProgress, setHikerProgress] = useState<HikerProgress[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const { alertCount, refreshAlertCount } = useEmergencyAlerts()

  async function fetchAlerts() {
    const { data, error } = await supabase
      .from("emergency_alerts")
      .select(`*, hikers (id, name, email)`)
      .eq("status", "NEW")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("FETCH ERROR:", error)
      return
    }

    if (data) setAlerts(data)
  }

  useEffect(() => {
    fetchAlerts()

    const channel = supabase
      .channel("emergency-alerts-admin")
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
              console.error("FETCH HIKER ERROR:", hikerError)
            } else {
              hiker = hikerData
            }
          }

          const alert: EmergencyAlert = {
            ...newAlert,
            hikers: hiker,
          }

          setAlerts((prev) => {
            if (prev.some((a) => a.id === alert.id)) return prev
            return [alert, ...prev]
          })

          if (audioRef.current) {
            audioRef.current.currentTime = 0
            audioRef.current.play().catch(() => {})
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    loadHikerProgress()

    const channel = supabase
      .channel("dashboard-hiker-progress")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lokasi_pendaki" },
        () => { loadHikerProgress() }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "checkpoint_logs" },
        () => { loadHikerProgress() }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  async function loadHikerProgress() {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const tomorrowStart = new Date(todayStart)
    tomorrowStart.setDate(tomorrowStart.getDate() + 1)

    const todayStartIso = todayStart.toISOString()
    const tomorrowStartIso = tomorrowStart.toISOString()

    const { data: gpsData, error: gpsError } = await supabase
      .from("lokasi_pendaki")
      .select("hiker_id, updated_at")
      .eq("tracking_status", "ACTIVE")
      .gte("updated_at", todayStartIso)
      .lt("updated_at", tomorrowStartIso)
      .order("updated_at", { ascending: false })

    if (gpsError) {
      console.error(gpsError)
      return
    }

    const { data: checkpointLogData, error: checkpointLogError } = await supabase
      .from("checkpoint_logs")
      .select("hiker_id, checked_at, checkpoints ( name )")
      .gte("checked_at", todayStartIso)
      .lt("checked_at", tomorrowStartIso)
      .order("checked_at", { ascending: false })

    if (checkpointLogError) {
      console.error(checkpointLogError)
      return
    }

    const latestGps = new Map<number, string>()
    ;((gpsData ?? []) as GpsLocation[]).forEach((gps) => {
      if (gps.hiker_id !== null && gps.updated_at && !latestGps.has(gps.hiker_id)) {
        latestGps.set(gps.hiker_id, gps.updated_at)
      }
    })

    const activeHikerIds = Array.from(latestGps.keys())

    const latestCheckpoint = new Map<number, { checkpoint_name: string | null; checked_at: string | null }>()
    ;((checkpointLogData ?? []) as CheckpointLogRow[]).forEach((log) => {
      if (
        log.hiker_id === null ||
        !activeHikerIds.includes(log.hiker_id) ||
        latestCheckpoint.has(log.hiker_id)
      ) {
        return
      }

      const checkpoint = Array.isArray(log.checkpoints) ? log.checkpoints[0] : log.checkpoints
      latestCheckpoint.set(log.hiker_id, {
        checkpoint_name: checkpoint?.name ?? null,
        checked_at: log.checked_at,
      })
    })

    const todayHikerIds = Array.from(new Set([...latestGps.keys(), ...latestCheckpoint.keys()]))

    if (todayHikerIds.length === 0) {
      setHikerProgress([])
      return
    }

    // If your production schema links hikers to sessions via qr_sessions.hiking_date,
    // add that session filter here. This uses today's GPS/checkpoint timestamps safely.
    const { data: hikers, error: hikersError } = await supabase
      .from("hikers")
      .select("id, name")
      .in("id", todayHikerIds)
      .order("name")

    if (hikersError) {
      console.error(hikersError)
      return
    }

    const now = Date.now()
    const progress: HikerProgress[] = (hikers ?? []).map((hiker) => {
      const lastGpsTime = latestGps.get(hiker.id) ?? null
      const checkpoint = latestCheckpoint.get(hiker.id)
      let status: HikerProgress["status"] = "NO_MOVEMENT"

      if (lastGpsTime) {
        const diffMin = (now - new Date(lastGpsTime).getTime()) / 60000
        if (diffMin < 5) status = "ON_TRACK"
        else if (diffMin < 15) status = "DELAYED"
      }

      return {
        hiker_id: hiker.id,
        hiker_name: hiker.name,
        checkpoint_name: checkpoint?.checkpoint_name ?? null,
        checked_at: checkpoint?.checked_at ?? null,
        last_gps_updated_at: lastGpsTime,
        status,
      }
    })

    setHikerProgress(progress)
  }

  async function acknowledgeAlert(id: number) {
    const { error } = await supabase
      .from("emergency_alerts")
      .update({ status: "ACKNOWLEDGED", acknowledged_at: new Date().toISOString() })
      .eq("id", id)

    if (error) {
      console.error("ACK ERROR:", error)
      return
    }

    setAlerts((prev) => prev.filter((a) => a.id !== id))
    await refreshAlertCount()

    if (alerts.length <= 1 && audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
  }

  const getEmergencyIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "critical":
        return "SOS"
      case "medical":
        return "MED"
      case "injury":
        return "INJ"
      case "lost":
        return "LOST"
      default:
        return "!"
    }
  }

  const getEmergencyColor = (type: string) => {
    switch (type.toLowerCase()) {
      case "critical":
        return "text-red-400 bg-red-500/10 border-red-500/30"
      case "medical":
        return "text-orange-400 bg-orange-500/10 border-orange-500/30"
      case "injury":
        return "text-amber-400 bg-amber-500/10 border-amber-500/30"
      case "lost":
        return "text-blue-400 bg-blue-500/10 border-blue-500/30"
      default:
        return "text-red-400 bg-red-500/10 border-red-500/30"
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const diff = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000)
    if (diff < 60) return "Just now"
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`
    return `${Math.floor(diff / 3600)} hrs ago`
  }

  const summaryCards = [
    {
      title: "Active Sessions",
      value: 5,
      icon: Activity,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
    },
    {
      title: "Registered Hikers",
      value: 124,
      icon: Users,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
    },
    {
      title: "Active Guiders",
      value: 8,
      icon: User,
      color: "text-violet-400",
      bg: "bg-violet-500/10",
      border: "border-violet-500/20",
    },
    {
      title: "Emergency Alerts",
      value: alertCount,
      icon: AlertTriangle,
      color: alertCount > 0 ? "text-red-400" : "text-slate-400",
      bg: alertCount > 0 ? "bg-red-500/10" : "bg-slate-500/10",
      border: alertCount > 0 ? "border-red-500/20" : "border-slate-500/20",
    },
  ]

  return (
    <div className="app-shell flex min-h-screen flex-col overflow-hidden">
      <header className="flex shrink-0 flex-col gap-4 border-b border-border/70 bg-background/70 px-4 py-4 backdrop-blur sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Admin Dashboard </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {new Date().toLocaleDateString("en-MY", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {alerts.length > 0 && (
            <div className="flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400">
              <Bell className="h-3 w-3 animate-pulse" />
              {alerts.length} Alert{alerts.length > 1 ? "s" : ""}
            </div>
          )}
          <div className="flex items-center gap-2.5 border-l border-border pl-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
              A
            </div>
            <div>
              <p className="text-xs font-medium text-foreground">Admin</p>
              <p className="text-xs text-muted-foreground">
                Forest Control
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {summaryCards.map((card) => {
            const Icon = card.icon
            return (
              <div
                key={card.title}
                className="metric-card group transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="mb-3 text-xs font-semibold uppercase text-muted-foreground">
                      {card.title}
                    </p>
                    <p className={`text-3xl font-bold ${card.color}`}>{card.value}</p>
                  </div>
                  <div className={`rounded-2xl border border-border/70 p-2.5 ${card.bg}`}>
                    <Icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                </div>
                <div className="mt-5 h-px bg-gradient-to-r from-primary/20 via-border to-transparent" />
              </div>
            )
          })}
        </div>

        <div className="panel-surface">
          <div className="panel-header">
            <div className="flex items-center gap-3">
              <div className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
              </div>
              <span className="text-sm font-semibold text-foreground">Live GPS Monitoring</span>
            </div>
            <Link href="/admin/live" className="subtle-button px-3 py-1.5 text-xs">
              Full View <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="h-64 bg-muted/30">
            <LiveMap tileStyle="topo" />
          </div>
        </div>

        <div className="panel-surface">
          <div className="panel-header">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/15 p-2 text-emerald-400 shadow-inner shadow-emerald-400/5">
                <Radio size={16} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">Today&apos;s Hiker Progress</h2>
                <p className="text-xs text-muted-foreground">Live movement status from today&apos;s GPS and checkpoint activity.</p>
              </div>
            </div>
            <div className="hidden items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400 sm:flex">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              {hikerProgress.length} active today
            </div>
          </div>

          <div className="table-shell">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60">
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                    Hiker
                  </th>
                  <th className="hidden px-6 py-3 text-left text-xs font-medium uppercase text-muted-foreground sm:table-cell">
                    Last Checkpoint
                  </th>
                  <th className="hidden px-6 py-3 text-left text-xs font-medium uppercase text-muted-foreground md:table-cell">
                    Checkpoint Time
                  </th>
                  <th className="hidden px-6 py-3 text-left text-xs font-medium uppercase text-muted-foreground lg:table-cell">
                    Last GPS
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                    Movement Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {hikerProgress.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                      No hiker GPS or checkpoint activity recorded for today.
                    </td>
                  </tr>
                )}
                {hikerProgress.map((hiker) => (
                  <tr key={hiker.hiker_id} className="transition-colors hover:bg-accent/40">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border/70 bg-muted text-xs font-bold text-muted-foreground">
                          {hiker.hiker_name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-foreground">{hiker.hiker_name}</span>
                      </div>
                    </td>
                    <td className="hidden px-6 py-4 sm:table-cell">
                      {hiker.checkpoint_name ? (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <MapPin size={12} className="text-emerald-500/60" />
                          <span>{hiker.checkpoint_name}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="hidden px-6 py-4 md:table-cell">
                      <span className="font-mono text-xs text-muted-foreground">
                        {hiker.checked_at
                          ? new Date(hiker.checked_at).toLocaleTimeString("en-MY", {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })
                          : "-"}
                      </span>
                    </td>
                    <td className="hidden px-6 py-4 lg:table-cell">
                      <span className="font-mono text-xs text-muted-foreground">
                        {hiker.last_gps_updated_at ? formatTimeAgo(hiker.last_gps_updated_at) : "-"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {hiker.status === "ON_TRACK" && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-400">
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          </span>
                          On Track
                        </span>
                      )}
                      {hiker.status === "DELAYED" && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                          Delayed
                        </span>
                      )}
                      {hiker.status === "NO_MOVEMENT" && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/20 bg-red-500/15 px-2.5 py-1 text-xs font-semibold text-red-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                          No Movement
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <audio ref={audioRef} src="/alarm.mp3" loop />

        <div className={`panel-surface ${alerts.length > 0 ? "border-red-500/25" : ""}`}>
          <div className="panel-header">
            <div className="flex items-center gap-3">
              {alerts.length > 0 ? (
                <>
                  <div className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-60" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-400" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">Emergency Alerts</span>
                  <span className="rounded-full border border-red-500/30 bg-red-500/20 px-2 py-0.5 text-xs font-bold text-red-400">
                    {alerts.length} pending
                  </span>
                </>
              ) : (
                <>
                  <BellOff className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-semibold text-muted-foreground">
                    Emergency Alerts
                  </span>
                </>
              )}
            </div>
            <Link href="/admin/emergency-alerts" className="subtle-button px-3 py-1.5 text-xs">
              View All <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="space-y-3 p-4">
            {alerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-10">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted"
                >
                  <BellOff className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  All clear - no active emergencies
                </p>
              </div>
            ) : (
              alerts.slice(0, 4).map((alert) => (
                <div
                  key={alert.id}
                  className={`flex flex-col gap-4 rounded-2xl border p-4 transition-all sm:flex-row sm:items-center sm:justify-between ${getEmergencyColor(alert.emergency_type)}`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="flex h-10 min-w-10 items-center justify-center rounded-2xl border border-border/60 bg-background/50 px-2 text-sm font-bold"
                    >
                      {getEmergencyIcon(alert.emergency_type)}
                    </div>
                    <div>
                      <div className="mb-0.5 flex items-center gap-2">
                        <p className="text-sm font-bold uppercase tracking-wide text-foreground">{alert.emergency_type}</p>
                        <span className="rounded bg-background/70 px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                          #{alert.id}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {alert.hikers?.name ?? "Unknown Hiker"}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatTimeAgo(alert.created_at)}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => acknowledgeAlert(alert.id)}
                    className="flex shrink-0 items-center justify-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-500 transition-all hover:border-emerald-400/45 hover:bg-emerald-500/20"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Acknowledge
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
