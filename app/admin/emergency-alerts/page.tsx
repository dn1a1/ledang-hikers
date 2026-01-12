"use client"

import { useEffect, useRef, useState } from "react"
import { supabase } from "@/lib/supabase"

type EmergencyAlert = {
  id: number
  hiker_id: number
  emergency_type: string
  status: string
  created_at: string
  acknowledged_at: string | null
  latitude: number | null
  longitude: number | null
}

export default function EmergencyAlertsPage() {
  const [alerts, setAlerts] = useState<EmergencyAlert[]>([])
  const [soundEnabled, setSoundEnabled] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)

  /* 🔓 LOAD SOUND SETTING */
  useEffect(() => {
    if (localStorage.getItem("soundEnabled") === "true") {
      setSoundEnabled(true)
    }
  }, [])

  /* 🔄 INITIAL LOAD */
  useEffect(() => {
    fetchAlerts()
  }, [])

  /* 🔴 REALTIME INSERT — INSTANT UPDATE */
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
        (payload) => {
          const newAlert = payload.new as EmergencyAlert

          // ❌ Elak duplicate
          setAlerts(prev => {
            if (prev.some(a => a.id === newAlert.id)) return prev
            return [newAlert, ...prev]
          })

          // 🔊 MAIN FIX — bunyi dipaksa bila emergency BARU masuk
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

  async function fetchAlerts() {
    const { data } = await supabase
      .from("emergency_alerts")
      .select("*")
      .order("created_at", { ascending: false })

    if (data) {
      setAlerts(data)
    }
  }

  async function acknowledgeAlert(id: number) {
    await supabase
      .from("emergency_alerts")
      .update({
        status: "ACKNOWLEDGED",
        acknowledged_at: new Date().toISOString(),
      })
      .eq("id", id)

    // 🔄 Update UI terus
    setAlerts(prev =>
      prev.map(a =>
        a.id === id ? { ...a, status: "ACKNOWLEDGED" } : a
      )
    )

    // 🔇 Stop bunyi jika tiada emergency NEW
    if (
      audioRef.current &&
      !alerts.some(a => a.status === "NEW" && a.id !== id)
    ) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-red-600 mb-4">
        🚨 Emergency Alerts
      </h1>

      {!soundEnabled && (
        <button
          onClick={() => {
            setSoundEnabled(true)
            localStorage.setItem("soundEnabled", "true")
            audioRef.current?.play().catch(() => {})
          }}
          className="mb-4 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-semibold"
        >
          🔊 Enable Alarm Sound
        </button>
      )}

      <audio ref={audioRef} src="/alarm.mp3" loop />

      {alerts.length === 0 && (
        <p className="text-gray-500">No emergency alerts.</p>
      )}

      {alerts.map(alert => (
        <div
          key={alert.id}
          className={`mb-4 rounded-lg p-4 border-l-4 ${
            alert.status === "NEW"
              ? "bg-red-50 border-red-600 animate-pulse"
              : "bg-gray-50 border-gray-400"
          }`}
        >
          <p><b>Hiker ID:</b> {alert.hiker_id}</p>
          <p><b>Type:</b> {alert.emergency_type}</p>
          <p><b>Status:</b> {alert.status}</p>

          {alert.latitude && alert.longitude && (
            <p className="text-sm text-gray-600">
              📍 {alert.latitude.toFixed(5)}, {alert.longitude.toFixed(5)}
            </p>
          )}

          <p className="text-sm text-gray-500">
            {new Date(alert.created_at).toLocaleString()}
          </p>

          {alert.status === "NEW" && (
            <button
              onClick={() => acknowledgeAlert(alert.id)}
              className="mt-3 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-semibold"
            >
              TERIMA
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
