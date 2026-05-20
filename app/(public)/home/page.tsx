'use client'

import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  Users,
  AlertTriangle,
  User,
  Activity,
  CheckCircle,
  Bell,
  BellOff,
  Clock,
  ChevronRight,
} from 'lucide-react'

import AdminLayout from '@/components/admin/AdminLayout'
import LiveMap from '@/components/LiveMap'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'

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

type EmergencyAlertPayload = Omit<EmergencyAlert, 'hikers'> & {
  hikers?: Hiker | null
}

export default function HomePage() {
  const [alerts, setAlerts] = useState<EmergencyAlert[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)

  async function fetchAlerts() {
    const { data, error } = await supabase
      .from('emergency_alerts')
      .select(`*, hikers (id, name, email)`)
      .eq('status', 'NEW')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('FETCH ERROR:', error)
      return
    }

    if (data) setAlerts(data)
  }

  useEffect(() => {
    fetchAlerts()
    const channel = supabase
      .channel('home-emergency-alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'emergency_alerts',
        },
        async (payload) => {
          const newAlert = payload.new as EmergencyAlertPayload
          let hiker: Hiker | null = newAlert.hikers ?? null

          if (newAlert.hiker_id) {
            const { data: hikerData, error: hikerError } = await supabase
              .from('hikers')
              .select('id, name, email')
              .eq('id', newAlert.hiker_id)
              .single()

            if (hikerError) {
              console.error('FETCH HIKER ERROR:', hikerError)
            } else {
              hiker = hikerData
            }
          }

          const alert: EmergencyAlert = {
            ...newAlert,
            hikers: hiker,
          }

          setAlerts((prev) => {
            if (prev.some((item) => item.id === alert.id)) return prev
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

  async function acknowledgeAlert(id: number) {
    const { error } = await supabase
      .from('emergency_alerts')
      .update({ status: 'ACKNOWLEDGED', acknowledged_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      console.error('ACK ERROR:', error)
      return
    }

    setAlerts((prev) => prev.filter((item) => item.id !== id))
    if (alerts.length <= 1 && audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
  }

  const getEmergencyIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'critical':
        return 'SOS'
      case 'medical':
        return 'MED'
      case 'injury':
        return 'INJ'
      case 'lost':
        return 'LOST'
      default:
        return '!'
    }
  }

  const getEmergencyColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'critical':
        return 'theme-text-danger theme-callout theme-callout-danger'
      case 'medical':
        return 'theme-text-warning theme-callout theme-callout-warning'
      case 'injury':
        return 'theme-text-warning theme-callout theme-callout-warning'
      case 'lost':
        return 'theme-text-info theme-callout theme-callout-info'
      default:
        return 'theme-text-danger theme-callout theme-callout-danger'
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const diff = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000)
    if (diff < 60) return 'Just now'
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`
    return `${Math.floor(diff / 3600)} hrs ago`
  }

  const summaryCards = [
    { title: 'Active Sessions', value: 5, icon: Activity, color: 'theme-text-success', bg: 'theme-callout-success', border: 'border-emerald-500/20' },
    { title: 'Registered Hikers', value: 124, icon: Users, color: 'theme-text-info', bg: 'theme-callout-info', border: 'border-primary/20' },
    { title: 'Active Guiders', value: 8, icon: User, color: 'theme-text-info', bg: 'theme-callout-info', border: 'border-primary/20' },
    { title: 'Emergency Alerts', value: alerts.length, icon: AlertTriangle, color: alerts.length > 0 ? 'theme-text-danger' : 'theme-text-muted', bg: alerts.length > 0 ? 'theme-callout-danger' : 'bg-muted', border: alerts.length > 0 ? 'border-red-500/20' : 'border-border' },
  ]

  return (
    <AdminLayout>
      <main className="app-shell flex flex-1 flex-col overflow-hidden">
        <header className="flex shrink-0 flex-col gap-4 border-b border-border/70 bg-background/70 px-4 py-4 backdrop-blur sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Home Overview</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {new Date().toLocaleDateString('en-MY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {alerts.length > 0 && (
              <Badge className="theme-chip-danger gap-2 hover:bg-red-500/10">
                <Bell className="h-3 w-3 animate-pulse" />
                {alerts.length} Alert{alerts.length > 1 ? 's' : ''}
              </Badge>
            )}
            <div className="flex items-center gap-2.5 border-l border-border pl-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                A
              </div>
              <div>
                <p className="text-xs font-medium text-foreground">Admin</p>
                <p className="text-xs text-muted-foreground">Forest Control</p>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {summaryCards.map((card) => {
              const Icon = card.icon
              return (
                <Card key={card.title} className={`metric-card gap-0 py-0 ${card.bg} ${card.border}`}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="mb-3 text-xs font-medium text-muted-foreground">{card.title}</p>
                        <p className={`text-3xl font-bold ${card.color}`}>{card.value}</p>
                      </div>
                      <div className={`rounded-xl border border-border/60 p-2 ${card.bg}`}>
                        <Icon className={`h-5 w-5 ${card.color}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <div className="panel-surface">
            <div className="panel-header">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                <span className="text-sm font-semibold text-foreground">Live GPS Monitoring</span>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/admin/live">
                  Full View <ChevronRight className="h-3 w-3" />
                </Link>
              </Button>
            </div>
            <div className="h-64">
              <LiveMap />
            </div>
          </div>

          <audio ref={audioRef} src="/alarm.mp3" loop />

          <div className={`panel-surface ${alerts.length > 0 ? 'border-red-500/25' : ''}`}>
            <div className="panel-header">
              <div className="flex items-center gap-3">
                {alerts.length > 0 ? (
                  <>
                    <div className="theme-dot-danger h-2 w-2 animate-pulse rounded-full" />
                    <span className="text-sm font-semibold text-foreground">Emergency Alerts</span>
                    <span className="theme-chip theme-chip-danger font-bold">
                      {alerts.length} pending
                    </span>
                  </>
                ) : (
                  <>
                    <BellOff className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-semibold text-muted-foreground">Emergency Alerts</span>
                  </>
                )}
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/admin/emergency-alerts">
                  View All <ChevronRight className="h-3 w-3" />
                </Link>
              </Button>
            </div>

            <div className="space-y-3 p-4">
              {alerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-10">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
                    <BellOff className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">All clear - no active emergencies</p>
                </div>
              ) : (
                alerts.slice(0, 4).map((alert) => (
                  <div
                    key={alert.id}
                    className={`flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${getEmergencyColor(alert.emergency_type)}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background/60 text-sm font-bold">
                        {getEmergencyIcon(alert.emergency_type)}
                      </div>
                      <div>
                        <div className="mb-0.5 flex items-center gap-2">
                          <p className="text-sm font-bold uppercase tracking-wide text-foreground">
                            {alert.emergency_type}
                          </p>
                          <span className="rounded bg-background/70 px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                            #{alert.id}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {alert.hikers?.name ?? 'Unknown Hiker'}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatTimeAgo(alert.created_at)}
                        </p>
                      </div>
                    </div>

                    <Button
                      onClick={() => acknowledgeAlert(alert.id)}
                      variant="outline"
                      className="theme-chip-success shrink-0 hover:bg-emerald-500/20"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Acknowledge
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </AdminLayout>
  )
}
