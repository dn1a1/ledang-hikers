"use client"

import { useEffect, useRef, useState } from "react"
import { supabase } from "@/lib/supabase"
import { ArrowLeft, Bell, BellOff, MapPin, User, Clock, AlertTriangle, CheckCircle, Navigation, Volume2, VolumeX, UserCheck, Activity, Radio, Satellite } from "lucide-react"

type Hiker = {
  id: number
  name: string
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

export default function EmergencyAlertsPage() {
  const [alerts, setAlerts] = useState<EmergencyAlert[]>([])
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [isLoading, setIsLoading] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)

  /* 🔓 LOAD SOUND SETTING */
  useEffect(() => {
    const savedSound = localStorage.getItem("soundEnabled")
    if (savedSound === null || savedSound === "true") {
      setSoundEnabled(true)
    } else {
      setSoundEnabled(false)
    }
  }, [])

  /* 🔄 INITIAL LOAD */
  useEffect(() => {
    fetchAlerts()
  }, [])

  /* 🔴 REALTIME INSERT */
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
          const newAlert = payload.new as any
          
          // Fetch hiker data for the new alert
          if (newAlert.hiker_id) {
            const { data: hikerData } = await supabase
              .from("hikers")
              .select("id, name")
              .eq("id", newAlert.hiker_id)
              .single()
            
            newAlert.hikers = hikerData
          }
          
          setAlerts(prev => {
            if (prev.some(a => a.id === newAlert.id)) return prev
            return [newAlert, ...prev]
          })

          if (soundEnabled && newAlert.status === "NEW") {
            if (audioRef.current) {
              audioRef.current.currentTime = 0
              audioRef.current.play().catch(() => {})
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [soundEnabled])

  /* 📥 FETCH ALERTS */
  async function fetchAlerts() {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from("emergency_alerts")
        .select(`
          *,
          hikers (
            id,
            name
          )
        `)
        .eq("status", "NEW")
        .order("created_at", { ascending: false })

      if (error) {
        console.error("FETCH ERROR:", error)
        return
      }

      if (data) {
        setAlerts(data)
      }
      
    } catch (error) {
      console.error("Unexpected error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  /* 🗺️ OPEN GOOGLE MAPS */
  function openGoogleMaps(lat: number, lng: number) {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
    window.open(url, "_blank")
  }

  /* ✅ ACKNOWLEDGE ALERT */
  async function acknowledgeAlert(id: number) {
    const { error } = await supabase
      .from("emergency_alerts")
      .update({
        status: "ACKNOWLEDGED",
        acknowledged_at: new Date().toISOString(),
      })
      .eq("id", id)

    if (error) {
      console.error("ACK ERROR:", error)
      alert("Gagal acknowledge emergency")
      return
    }

    setAlerts(prev => prev.filter(a => a.id !== id))

    if (audioRef.current && alerts.length <= 1) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
  }

  const getEmergencyColor = (type: string) => {
    switch(type.toLowerCase()) {
      case 'critical': return 'from-red-500 to-red-600'
      case 'medical': return 'from-orange-500 to-orange-600'
      case 'injury': return 'from-amber-500 to-amber-600'
      case 'lost': return 'from-blue-500 to-blue-600'
      default: return 'from-red-500 to-red-600'
    }
  }

  const getEmergencyBadgeColor = (type: string) => {
    switch(type.toLowerCase()) {
      case 'critical': return 'bg-gradient-to-r from-red-500 to-red-600'
      case 'medical': return 'bg-gradient-to-r from-orange-500 to-orange-600'
      case 'injury': return 'bg-gradient-to-r from-amber-500 to-amber-600'
      case 'lost': return 'bg-gradient-to-r from-blue-500 to-blue-600'
      default: return 'bg-gradient-to-r from-red-500 to-red-600'
    }
  }

  const getEmergencyIcon = (type: string) => {
    switch(type.toLowerCase()) {
      case 'critical': return '🆘'
      case 'medical': return '🏥'
      case 'injury': return '🤕'
      case 'lost': return '🧭'
      default: return '🚨'
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) return 'Just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`
    return `${Math.floor(diffInSeconds / 86400)} days ago`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white p-4 md:p-6">
      {/* Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-red-500/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl translate-x-1/3 translate-y-1/3"></div>
      </div>

      {/* Header */}
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <a 
              href="/home" 
              className="inline-flex items-center gap-2 text-gray-300 hover:text-white transition-colors bg-gray-800/50 hover:bg-gray-700/50 p-3 rounded-xl backdrop-blur-sm"
            >
              <ArrowLeft className="w-5 h-5" />
            </a>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-red-400 via-orange-400 to-red-400 bg-clip-text text-transparent">
                Emergency Alert
              </h1>
              <p className="text-gray-400 flex items-center gap-2">
                <Radio className="w-4 h-4 text-green-400 animate-pulse" />
                <Satellite className="w-4 h-4 text-blue-400 ml-2" />
              </p>
            </div>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={() => {
              const newState = !soundEnabled
              setSoundEnabled(newState)
              localStorage.setItem("soundEnabled", newState.toString())
              if (newState) {
                audioRef.current?.play().catch(() => {})
              } else {
                audioRef.current?.pause()
              }
            }}
            className={`flex items-center gap-3 px-5 py-3 rounded-xl font-semibold transition-all backdrop-blur-sm ${
              soundEnabled 
                ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg shadow-green-500/20' 
                : 'bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700'
            }`}
          >
            {soundEnabled ? (
              <>
                <Volume2 className="w-5 h-5" />
                <span>Alarm ON</span>
              </>
            ) : (
              <>
                <VolumeX className="w-5 h-5" />
                <span>Alarm OFF</span>
              </>
            )}
          </button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl p-5 border border-gray-700/50 hover:border-red-500/30 transition-all group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Active Alerts</p>
                <p className="text-3xl font-bold text-red-400">{alerts.length}</p>
                <p className="text-xs text-gray-500 mt-1">{alerts.length === 0 ? 'All clear' : 'Require attention'}</p>
              </div>
              <div className="p-3 bg-red-500/10 rounded-xl group-hover:scale-110 transition-transform">
                <Bell className="w-7 h-7 text-red-400" />
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl p-5 border border-gray-700/50 hover:border-blue-500/30 transition-all group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Hikers Tracked</p>
                <p className="text-3xl font-bold text-blue-400">
                  {new Set(alerts.map(a => a.hiker_id)).size}
                </p>
                <p className="text-xs text-gray-500 mt-1">Unique individuals</p>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-xl group-hover:scale-110 transition-transform">
                <UserCheck className="w-7 h-7 text-blue-400" />
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl p-5 border border-gray-700/50 hover:border-orange-500/30 transition-all group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Response Time</p>
                <p className="text-3xl font-bold text-orange-400">
                  {alerts.length > 0 ? formatTimeAgo(alerts[0].created_at).split(' ')[0] : '0'}
                </p>
                <p className="text-xs text-gray-500 mt-1">Latest alert</p>
              </div>
              <div className="p-3 bg-orange-500/10 rounded-xl group-hover:scale-110 transition-transform">
                <Activity className="w-7 h-7 text-orange-400" />
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl p-5 border border-gray-700/50 hover:border-green-500/30 transition-all group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">System Status</p>
                <p className="text-3xl font-bold text-green-400">
                  {soundEnabled ? 'ACTIVE' : 'MUTED'}
                </p>
                <p className="text-xs text-gray-500 mt-1">Live monitoring</p>
              </div>
              <div className="p-3 bg-green-500/10 rounded-xl group-hover:scale-110 transition-transform">
                {soundEnabled ? (
                  <Volume2 className="w-7 h-7 text-green-400" />
                ) : (
                  <VolumeX className="w-7 h-7 text-gray-400" />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <audio ref={audioRef} src="/alarm.mp3" loop />

      {/* Main Content */}
      <div className="relative z-10">
        {/* Header Bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${alerts.length > 0 ? 'bg-red-500/20 animate-pulse' : 'bg-gray-800/50'}`}>
              <AlertTriangle className={`w-5 h-5 ${alerts.length > 0 ? 'text-red-400' : 'text-gray-400'}`} />
            </div>
            <h2 className="text-xl font-bold">
              Active Emergencies
              {alerts.length > 0 && (
                <span className="ml-2 text-sm font-normal text-gray-400">
                  ({alerts.length} pending)
                </span>
              )}
            </h2>
          </div>
          
          <button
            onClick={fetchAlerts}
            disabled={isLoading}
            className="text-sm text-gray-300 hover:text-white bg-gray-800/50 hover:bg-gray-700/50 px-4 py-2 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                Refreshing...
              </>
            ) : (
              'Refresh'
            )}
          </button>
        </div>

        {/* Alerts Container */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 bg-gray-800/20 rounded-2xl border border-gray-700/30">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mb-4"></div>
              <p className="text-gray-400">Loading emergency data...</p>
            </div>
          ) : alerts.length === 0 ? (
            <div className="text-center py-16 bg-gray-800/20 rounded-2xl border border-gray-700/30">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl flex items-center justify-center border border-gray-700/50">
                <BellOff className="w-10 h-10 text-gray-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-300 mb-2">All Systems Clear</h3>
              <p className="text-gray-500 max-w-md mx-auto">
                No active emergency alerts detected. Monitoring systems are operational and ready.
              </p>
            </div>
          ) : (
            alerts.map(alert => (
              <div
                key={alert.id}
                className={`group bg-gradient-to-r from-gray-800/40 via-gray-900/40 to-gray-800/40 backdrop-blur-sm rounded-2xl p-6 border shadow-xl hover:shadow-2xl transition-all duration-300 ${
                  alerts.length > 0 ? 'animate-pulse border-red-500/30' : 'border-gray-700/50'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                  {/* Left Section - Alert Info */}
                  <div className="flex-1">
                    <div className="flex items-start gap-4">
                      {/* Emergency Icon */}
                      <div className={`bg-gradient-to-br ${getEmergencyColor(alert.emergency_type)} w-14 h-14 rounded-xl flex items-center justify-center text-2xl shadow-lg`}>
                        {getEmergencyIcon(alert.emergency_type)}
                      </div>
                      
                      {/* Alert Details */}
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <span className={`${getEmergencyBadgeColor(alert.emergency_type)} text-white px-3 py-1.5 rounded-full text-xs font-bold`}>
                            {alert.emergency_type.toUpperCase()}
                          </span>
                          <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-gray-700/50 text-gray-300">
                            STATUS: {alert.status}
                          </span>
                          <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {alert.hikers?.name || 'Unknown Hiker'}
                          </span>
                        </div>
                        
                        {/* Time and Location */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
                          <div className="flex items-center gap-3 p-3 bg-gray-800/30 rounded-lg">
                            <div className="p-2 bg-gray-700/50 rounded">
                              <Clock className="w-4 h-4 text-gray-400" />
                            </div>
                            <div>
                              <p className="text-sm text-gray-400">Alert Time</p>
                              <p className="font-medium">
                                {new Date(alert.created_at).toLocaleTimeString('en-MY', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                                <span className="text-gray-500 text-sm ml-2">
                                  ({formatTimeAgo(alert.created_at)})
                                </span>
                              </p>
                            </div>
                          </div>
                          
                          {alert.latitude !== null && alert.longitude !== null && (
                            <div className="flex items-center gap-3 p-3 bg-gray-800/30 rounded-lg">
                              <div className="p-2 bg-gray-700/50 rounded">
                                <MapPin className="w-4 h-4 text-gray-400" />
                              </div>
                              <div>
                                <p className="text-sm text-gray-400">Last Known Location</p>
                                <p className="font-medium font-mono">
                                  {alert.latitude.toFixed(5)}, {alert.longitude.toFixed(5)}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Location Action */}
                        {alert.latitude !== null && alert.longitude !== null && (
                          <button
                            onClick={() => openGoogleMaps(alert.latitude!, alert.longitude!)}
                            className="mt-4 inline-flex items-center gap-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-5 py-2.5 rounded-lg font-semibold transition-all shadow-lg shadow-blue-500/20"
                          >
                            <Navigation className="w-4 h-4" />
                            Navigate to Location
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Section - Actions */}
                  <div className="lg:w-64 xl:w-72 flex flex-col gap-4">
                    <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl p-4 border border-gray-700/30">
                      <h4 className="font-semibold text-sm text-gray-300 mb-2">Emergency Response</h4>
                      <p className="text-xs text-gray-400 mb-4">
                        Acknowledge this alert to confirm receipt and stop the alarm system.
                      </p>
                      
                      <button
                        onClick={() => acknowledgeAlert(alert.id)}
                        className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-green-500/20 group-hover:scale-[1.02]"
                      >
                        <CheckCircle className="w-5 h-5" />
                        ACKNOWLEDGE ALERT
                      </button>
                      
                      <div className="mt-3 text-center">
                        <p className="text-[10px] text-gray-500">
                          Alert ID: #{alert.id}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Status */}
        <div className="mt-8 pt-6 border-t border-gray-800/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${alerts.length > 0 ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></div>
              <div>
                <p className="text-sm text-gray-300">
                  {alerts.length > 0 
                    ? `${alerts.length} active emergency${alerts.length !== 1 ? 's' : ''} requiring attention`
                    : 'All systems operational'
                  }
                </p>
                <p className="text-xs text-gray-500">
                  Last updated: {new Date().toLocaleTimeString('en-MY', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Live connection</span>
              </div>
              <span className="text-gray-600">•</span>
              <span>Control Center v2.0</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}