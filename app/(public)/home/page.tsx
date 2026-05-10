'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from "next/link";

import {
  Mountain,
  QrCode,
  Users,
  AlertTriangle,
  BarChart3,
  User,
  Activity,
  CheckCircle,
  Bell,
  BellOff,
  Clock,
  Shield,
  ChevronRight,
  MapPin,
} from 'lucide-react';

import LiveMap from "@/components/LiveMap";
import { supabase } from "@/lib/supabase";

type Hiker = { id: number; name: string }

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

const navItems = [
  { href: '/admin/qr-management', label: 'QR Management', icon: QrCode },
  { href: '/admin/hikers', label: 'Participant Management', icon: Users },
  { href: '/admin/live', label: 'Live Map Monitor', icon: MapPin },
  { href: '/admin/checkpoints', label: 'Checkpoint Management', icon: Shield },
  { href: '/admin/emergency-alerts', label: 'Emergency Alerts', icon: AlertTriangle },
  { href: '/admin/reports', label: 'Reports & Analytics', icon: BarChart3 },
]

export default function AdminDashboardPage() {

  const [alerts, setAlerts] = useState<EmergencyAlert[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)

  async function fetchAlerts() {
    const { data, error } = await supabase
      .from("emergency_alerts")
      .select(`*, hikers (id, name)`)
      .eq("status", "NEW")
      .order("created_at", { ascending: false })
    if (error) { console.error("FETCH ERROR:", error); return }
    if (data) setAlerts(data)
  }

  useEffect(() => {
    fetchAlerts()
    const channel = supabase
      .channel("emergency-alerts-admin")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "emergency_alerts",
      }, async (payload) => {
        const newAlert = payload.new as EmergencyAlertPayload
        let hiker: Hiker | null = newAlert.hikers ?? null

        if (newAlert.hiker_id) {
          const { data: hikerData, error: hikerError } = await supabase
            .from("hikers")
            .select("id, name")
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

        setAlerts(prev => {
          if (prev.some(a => a.id === alert.id)) return prev
          return [alert, ...prev]
        })
        if (audioRef.current) {
          audioRef.current.currentTime = 0
          audioRef.current.play().catch(() => {})
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  async function acknowledgeAlert(id: number) {
    const { error } = await supabase
      .from("emergency_alerts")
      .update({ status: "ACKNOWLEDGED", acknowledged_at: new Date().toISOString() })
      .eq("id", id)
    if (error) { console.error("ACK ERROR:", error); return }
    setAlerts(prev => prev.filter(a => a.id !== id))
    if (alerts.length <= 1 && audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
  }

  const getEmergencyIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'critical': return '🆘'
      case 'medical': return '🏥'
      case 'injury': return '🤕'
      case 'lost': return '🧭'
      default: return '🚨'
    }
  }

  const getEmergencyColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'critical': return 'text-red-400 bg-red-500/10 border-red-500/30'
      case 'medical': return 'text-orange-400 bg-orange-500/10 border-orange-500/30'
      case 'injury': return 'text-amber-400 bg-amber-500/10 border-amber-500/30'
      case 'lost': return 'text-blue-400 bg-blue-500/10 border-blue-500/30'
      default: return 'text-red-400 bg-red-500/10 border-red-500/30'
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const diff = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000)
    if (diff < 60) return 'Just now'
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`
    return `${Math.floor(diff / 3600)} hrs ago`
  }

  const summaryCards = [
    { title: 'Active Sessions', value: 5, icon: Activity, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    { title: 'Registered Hikers', value: 124, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
    { title: 'Active Guiders', value: 8, icon: User, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
    { title: 'Emergency Alerts', value: alerts.length, icon: AlertTriangle, color: alerts.length > 0 ? 'text-red-400' : 'text-slate-400', bg: alerts.length > 0 ? 'bg-red-500/10' : 'bg-slate-500/10', border: alerts.length > 0 ? 'border-red-500/20' : 'border-slate-500/20' },
  ]

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg, #0a0f0d 0%, #0d1410 50%, #0a0f0d 100%)', fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── SIDEBAR ── */}
      <aside className="w-64 hidden md:flex flex-col border-r" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>

        {/* Logo */}
        <div className="px-5 py-6 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
              <Mountain className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold tracking-widest text-white" style={{ letterSpacing: '0.15em' }}>TRAILGUARD</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Forest Admin Panel</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isAlert = item.label === 'Emergency Alerts'
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm transition-all group"
                style={{ color: 'rgba(255,255,255,0.5)' }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'
                  ;(e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.9)'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = 'transparent'
                  ;(e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)'
                }}
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span>{item.label}</span>
                </div>
                {isAlert && alerts.length > 0 && (
                  <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-red-500 text-white">{alerts.length}</span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* System status */}
        <div className="px-5 py-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>System Online</span>
          </div>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main className="flex-1 flex flex-col overflow-hidden">

        {/* Top Bar */}
        <header className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
          <div>
            <h1 className="text-lg font-semibold text-white">Admin Dashboard</h1>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {new Date().toLocaleDateString('en-MY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {alerts.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-red-500/10 border border-red-500/30 text-red-400">
                <Bell className="h-3 w-3 animate-pulse" />
                {alerts.length} Alert{alerts.length > 1 ? 's' : ''}
              </div>
            )}
            <div className="flex items-center gap-2.5 pl-3 border-l" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                A
              </div>
              <div>
                <p className="text-xs font-medium text-white">Admin</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Forest Control</p>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {summaryCards.map((card, i) => {
              const Icon = card.icon
              return (
                <div key={i} className={`rounded-2xl border p-5 ${card.bg} ${card.border}`} style={{ borderWidth: '1px' }}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>{card.title}</p>
                      <p className={`text-3xl font-bold ${card.color}`}>{card.value}</p>
                    </div>
                    <div className={`p-2 rounded-xl ${card.bg}`}>
                      <Icon className={`h-5 w-5 ${card.color}`} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Live Map */}
          <div className="rounded-2xl overflow-hidden border" style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-sm font-semibold text-white">Live GPS Monitoring</span>
              </div>
              <Link href="/admin/live" className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-colors" style={{ color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.04)' }}>
                Full View <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="h-64">
              <LiveMap />
            </div>
          </div>

          {/* Emergency Alerts */}
          <audio ref={audioRef} src="/alarm.mp3" loop />

          <div className="rounded-2xl border overflow-hidden" style={{ borderColor: alerts.length > 0 ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>

            {/* Alert Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-3">
                {alerts.length > 0 ? (
                  <>
                    <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                    <span className="text-sm font-semibold text-white">Emergency Alerts</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                      {alerts.length} pending
                    </span>
                  </>
                ) : (
                  <>
                    <BellOff className="h-4 w-4" style={{ color: 'rgba(255,255,255,0.3)' }} />
                    <span className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.6)' }}>Emergency Alerts</span>
                  </>
                )}
              </div>
              <Link href="/admin/emergency-alerts" className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-colors" style={{ color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.04)' }}>
                View All <ChevronRight className="h-3 w-3" />
              </Link>
            </div>

            {/* Alert List */}
            <div className="p-4 space-y-3">
              {alerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <BellOff className="h-6 w-6" style={{ color: 'rgba(255,255,255,0.2)' }} />
                  </div>
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>All clear — no active emergencies</p>
                </div>
              ) : (
                alerts.slice(0, 4).map(alert => (
                  <div
                    key={alert.id}
                    className={`flex items-center justify-between p-4 rounded-xl border ${getEmergencyColor(alert.emergency_type)}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        {getEmergencyIcon(alert.emergency_type)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-bold text-white uppercase tracking-wide">
                            {alert.emergency_type}
                          </p>
                          <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-white/10 text-white/60">
                            #{alert.id}
                          </span>
                        </div>
                        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
                          {alert.hikers?.name ?? 'Unknown Hiker'}
                        </p>
                        <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                          <Clock className="h-3 w-3" />
                          {formatTimeAgo(alert.created_at)}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => acknowledgeAlert(alert.id)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors flex-shrink-0"
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
      </main>
    </div>
  )
}
