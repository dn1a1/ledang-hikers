"use client"

import { useEffect, useRef, useState } from "react"
import { supabase } from "@/lib/supabase"
import {
  ArrowLeft,
  Bell,
  BellOff,
  MapPin,
  User,
  Clock,
  AlertTriangle,
  CheckCircle,
  Navigation,
  Volume2,
  VolumeX,
  UserCheck,
  Activity,
  Radio,
  Satellite,
  Shield,
  Phone,
  RefreshCw,
  Siren,
  ChevronRight,
  Zap,
} from "lucide-react"

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

type EmergencyAlertPayload = Omit<EmergencyAlert, "hikers"> & {
  hikers?: Hiker | null
}

/* ── helper: time-ago ── */
function formatTimeAgo(dateString: string) {
  const diff = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000)
  if (diff < 60) return "Just now"
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

/* ── helper: emergency meta ── */
function getEmergencyMeta(type: string) {
  switch (type.toLowerCase()) {
    case "critical":
      return { color: "#ef4444", bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.35)", label: "CRITICAL", icon: "🆘", badge: "var(--red)" }
    case "medical":
      return { color: "#f97316", bg: "rgba(249,115,22,0.12)", border: "rgba(249,115,22,0.35)", label: "MEDICAL", icon: "🏥", badge: "var(--orange)" }
    case "injury":
      return { color: "#f59e0b", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.35)", label: "INJURY", icon: "🤕", badge: "var(--amber)" }
    case "lost":
      return { color: "#3b82f6", bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.35)", label: "LOST", icon: "🧭", badge: "var(--blue)" }
    default:
      return { color: "#ef4444", bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.35)", label: type.toUpperCase(), icon: "🚨", badge: "var(--red)" }
  }
}

export default function EmergencyAlertsPage() {
  const [alerts, setAlerts] = useState<EmergencyAlert[]>([])
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [now, setNow] = useState(new Date())

  const audioRef = useRef<HTMLAudioElement | null>(null)

  /* tick clock */
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

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

          const alert: EmergencyAlert = { ...newAlert, hikers: hiker }

          setAlerts((prev) => {
            if (prev.some((a) => a.id === alert.id)) return prev
            return [alert, ...prev]
          })

          if (soundEnabled && alert.status === "NEW") {
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
        .select(`*, hikers (id, name)`)
        .eq("status", "NEW")
        .order("created_at", { ascending: false })

      if (error) {
        console.error("FETCH ERROR:", error)
        return
      }
      if (data) setAlerts(data)
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
      .update({ status: "ACKNOWLEDGED", acknowledged_at: new Date().toISOString() })
      .eq("id", id)

    if (error) {
      console.error("ACK ERROR:", error)
      alert("Gagal acknowledge emergency")
      return
    }

    setAlerts((prev) => prev.filter((a) => a.id !== id))

    if (audioRef.current && alerts.length <= 1) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
  }

  const hasAlerts = alerts.length > 0

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=DM+Sans:wght@300;400;500;600;700&display=swap');

        :root {
          --red: #ef4444;
          --red-dim: rgba(239,68,68,0.15);
          --orange: #f97316;
          --amber: #f59e0b;
          --amber-dim: rgba(245,158,11,0.12);
          --blue: #3b82f6;
          --green: #22c55e;
          --green-forest: #166534;
          --green-muted: #15803d;

          --bg: #0b0f0d;
          --surface: #111914;
          --surface-2: #161d18;
          --surface-3: #1c2620;
          --border: rgba(255,255,255,0.07);
          --border-active: rgba(255,255,255,0.12);

          --text: #f0f4f1;
          --text-muted: #7a9080;
          --text-dim: #4a5e52;

          --mono: 'Space Mono', monospace;
          --sans: 'DM Sans', sans-serif;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .tg-root {
          font-family: var(--sans);
          background: var(--bg);
          color: var(--text);
          min-height: 100vh;
        }

        /* ── SCANLINE texture ── */
        .tg-root::before {
          content: '';
          position: fixed;
          inset: 0;
          background: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0,0,0,0.06) 2px,
            rgba(0,0,0,0.06) 4px
          );
          pointer-events: none;
          z-index: 0;
        }

        /* ── TOPBAR ── */
        .tg-topbar {
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(11,15,13,0.92);
          backdrop-filter: blur(16px);
          border-bottom: 1px solid var(--border);
        }

        .tg-topbar-inner {
          max-width: 1440px;
          margin: 0 auto;
          padding: 0 24px;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .tg-back {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--text-muted);
          text-decoration: none;
          font-size: 13px;
          font-weight: 500;
          letter-spacing: 0.02em;
          transition: color 0.15s;
          padding: 6px 10px;
          border-radius: 6px;
          border: 1px solid transparent;
        }
        .tg-back:hover {
          color: var(--text);
          border-color: var(--border-active);
          background: var(--surface-2);
        }

        .tg-brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .tg-brand-logo {
          width: 32px;
          height: 32px;
          background: linear-gradient(135deg, #166534, #15803d);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
        }

        .tg-brand-name {
          font-family: var(--mono);
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0.12em;
          color: var(--text);
        }

        .tg-brand-sub {
          font-size: 10px;
          letter-spacing: 0.08em;
          color: var(--text-dim);
          font-family: var(--mono);
          text-transform: uppercase;
        }

        .tg-topbar-right {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .tg-live-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          font-family: var(--mono);
          font-size: 11px;
          color: var(--green);
          background: rgba(34,197,94,0.08);
          border: 1px solid rgba(34,197,94,0.2);
          padding: 4px 10px;
          border-radius: 20px;
          letter-spacing: 0.06em;
        }

        .tg-live-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--green);
          animation: pulse-dot 1.5s ease infinite;
        }

        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.7); }
        }

        .tg-clock {
          font-family: var(--mono);
          font-size: 12px;
          color: var(--text-muted);
          letter-spacing: 0.04em;
        }

        .tg-sound-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 7px 14px;
          border-radius: 8px;
          border: 1px solid;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.15s;
          font-family: var(--sans);
        }

        .tg-sound-btn.on {
          background: rgba(34,197,94,0.1);
          border-color: rgba(34,197,94,0.3);
          color: var(--green);
        }
        .tg-sound-btn.on:hover {
          background: rgba(34,197,94,0.18);
        }
        .tg-sound-btn.off {
          background: var(--surface-2);
          border-color: var(--border);
          color: var(--text-muted);
        }
        .tg-sound-btn.off:hover {
          border-color: var(--border-active);
          color: var(--text);
        }

        /* ── MAIN ── */
        .tg-main {
          max-width: 1440px;
          margin: 0 auto;
          padding: 32px 24px 64px;
          position: relative;
          z-index: 1;
        }

        /* ── PAGE HEADER ── */
        .tg-page-header {
          margin-bottom: 32px;
        }

        .tg-page-header-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
        }

        .tg-incident-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-family: var(--mono);
          font-size: 10px;
          letter-spacing: 0.1em;
          color: var(--text-dim);
          text-transform: uppercase;
          margin-bottom: 10px;
        }

        .tg-page-title {
          font-size: 28px;
          font-weight: 700;
          letter-spacing: -0.01em;
          line-height: 1.1;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .tg-title-alert-chip {
          font-size: 11px;
          font-family: var(--mono);
          letter-spacing: 0.08em;
          background: var(--red-dim);
          color: var(--red);
          border: 1px solid rgba(239,68,68,0.3);
          padding: 4px 10px;
          border-radius: 4px;
          font-weight: 700;
          vertical-align: middle;
        }

        .tg-page-subtitle {
          margin-top: 6px;
          font-size: 13px;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .tg-page-subtitle span {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .tg-header-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .tg-refresh-btn {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 8px 16px;
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--text-muted);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
          font-family: var(--sans);
        }
        .tg-refresh-btn:hover:not(:disabled) {
          background: var(--surface-3);
          border-color: var(--border-active);
          color: var(--text);
        }
        .tg-refresh-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .spin { animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── STAT CARDS ── */
        .tg-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 32px;
        }

        @media (max-width: 900px) {
          .tg-stats { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 500px) {
          .tg-stats { grid-template-columns: 1fr; }
        }

        .tg-stat-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          transition: border-color 0.2s;
          position: relative;
          overflow: hidden;
        }

        .tg-stat-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 2px;
          background: var(--accent-color, transparent);
          border-radius: 12px 12px 0 0;
        }

        .tg-stat-card:hover {
          border-color: var(--border-active);
        }

        .tg-stat-icon {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .tg-stat-label {
          font-size: 11px;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          color: var(--text-dim);
          font-weight: 600;
          margin-bottom: 4px;
        }

        .tg-stat-value {
          font-family: var(--mono);
          font-size: 24px;
          font-weight: 700;
          line-height: 1;
          margin-bottom: 4px;
        }

        .tg-stat-note {
          font-size: 11px;
          color: var(--text-dim);
        }

        /* ── SECTION HEADER ── */
        .tg-section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        .tg-section-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--text-muted);
          font-family: var(--mono);
        }

        .tg-section-count {
          font-size: 11px;
          padding: 2px 8px;
          border-radius: 4px;
          font-family: var(--mono);
        }

        /* ── EMPTY STATE ── */
        .tg-empty {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 64px 32px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .tg-empty-icon {
          width: 72px;
          height: 72px;
          border-radius: 18px;
          background: var(--surface-2);
          border: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 4px;
        }

        .tg-empty-title {
          font-size: 18px;
          font-weight: 700;
          color: var(--text);
        }

        .tg-empty-sub {
          font-size: 13px;
          color: var(--text-muted);
          max-width: 360px;
          line-height: 1.6;
        }

        /* ── ALERT CARD ── */
        .tg-alert-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .tg-alert-card {
          background: var(--surface);
          border-radius: 14px;
          border: 1px solid;
          overflow: hidden;
          transition: all 0.2s;
          position: relative;
        }

        .tg-alert-card:hover {
          transform: translateY(-1px);
        }

        .tg-alert-card-accent {
          position: absolute;
          left: 0; top: 0; bottom: 0;
          width: 4px;
          border-radius: 14px 0 0 14px;
        }

        .tg-alert-inner {
          padding: 20px 20px 20px 28px;
          display: flex;
          gap: 20px;
          align-items: flex-start;
          flex-wrap: wrap;
        }

        @media (max-width: 768px) {
          .tg-alert-inner { flex-direction: column; }
        }

        .tg-alert-icon-col {
          flex-shrink: 0;
        }

        .tg-alert-type-icon {
          width: 52px;
          height: 52px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          border: 1px solid;
          position: relative;
        }

        .tg-alert-pulse {
          position: absolute;
          inset: -4px;
          border-radius: 16px;
          border: 1px solid;
          animation: ring-pulse 2s ease-out infinite;
        }

        @keyframes ring-pulse {
          0% { opacity: 0.6; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.25); }
        }

        .tg-alert-info {
          flex: 1;
          min-width: 0;
        }

        .tg-alert-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 14px;
          align-items: center;
        }

        .tg-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          font-weight: 700;
          font-family: var(--mono);
          letter-spacing: 0.06em;
          padding: 4px 10px;
          border-radius: 5px;
          border: 1px solid;
          text-transform: uppercase;
        }

        .tg-alert-id {
          font-family: var(--mono);
          font-size: 11px;
          color: var(--text-dim);
          margin-left: auto;
        }

        .tg-alert-meta-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 10px;
          margin-bottom: 14px;
        }

        .tg-meta-item {
          display: flex;
          align-items: center;
          gap: 10px;
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 10px 12px;
        }

        .tg-meta-icon {
          width: 32px;
          height: 32px;
          border-radius: 7px;
          background: var(--surface-3);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .tg-meta-label {
          font-size: 10px;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          color: var(--text-dim);
          font-weight: 600;
          margin-bottom: 3px;
        }

        .tg-meta-value {
          font-size: 13px;
          font-weight: 600;
          color: var(--text);
          font-family: var(--mono);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .tg-meta-sub {
          font-size: 11px;
          color: var(--text-muted);
          font-family: var(--sans);
          font-weight: 400;
        }

        .tg-alert-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
        }

        .tg-btn-navigate {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 9px 18px;
          background: rgba(59,130,246,0.1);
          border: 1px solid rgba(59,130,246,0.3);
          color: #60a5fa;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          cursor: pointer;
          font-family: var(--sans);
          transition: all 0.15s;
        }
        .tg-btn-navigate:hover {
          background: rgba(59,130,246,0.18);
          border-color: rgba(59,130,246,0.5);
          color: #93c5fd;
        }

        /* ── ACTION PANEL ── */
        .tg-action-panel {
          flex-shrink: 0;
          width: 240px;
          background: var(--surface-2);
          border-left: 1px solid var(--border);
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          align-self: stretch;
        }

        @media (max-width: 900px) {
          .tg-alert-inner-wrap { flex-direction: column !important; }
          .tg-action-panel {
            width: 100%;
            border-left: none;
            border-top: 1px solid var(--border);
          }
        }

        .tg-action-panel-title {
          font-size: 10px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text-dim);
          font-weight: 700;
          font-family: var(--mono);
        }

        .tg-action-panel-desc {
          font-size: 12px;
          color: var(--text-muted);
          line-height: 1.5;
        }

        .tg-btn-ack {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 12px 20px;
          background: linear-gradient(135deg, #166534, #15803d);
          border: 1px solid rgba(34,197,94,0.25);
          color: #fff;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          cursor: pointer;
          font-family: var(--sans);
          transition: all 0.15s;
          box-shadow: 0 4px 16px rgba(22,101,52,0.3);
        }
        .tg-btn-ack:hover {
          background: linear-gradient(135deg, #15803d, #16a34a);
          box-shadow: 0 6px 20px rgba(22,101,52,0.45);
          transform: translateY(-1px);
        }
        .tg-btn-ack:active {
          transform: translateY(0);
        }

        .tg-alert-id-small {
          font-family: var(--mono);
          font-size: 10px;
          color: var(--text-dim);
          text-align: center;
          letter-spacing: 0.05em;
        }

        /* ── LOADING ── */
        .tg-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 64px 32px;
          gap: 16px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
        }

        .tg-spinner {
          width: 40px;
          height: 40px;
          border: 2px solid var(--border);
          border-top-color: var(--red);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        /* ── FOOTER ── */
        .tg-footer {
          margin-top: 40px;
          padding-top: 24px;
          border-top: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }

        .tg-footer-status {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
        }

        .tg-footer-status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .tg-footer-right {
          display: flex;
          align-items: center;
          gap: 16px;
          font-size: 12px;
          color: var(--text-dim);
          font-family: var(--mono);
        }

        .tg-footer-chip {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        /* ── SIREN BAR (when alerts active) ── */
        .tg-siren-bar {
          background: linear-gradient(90deg, rgba(239,68,68,0.08), rgba(239,68,68,0.14), rgba(239,68,68,0.08));
          border-top: 1px solid rgba(239,68,68,0.25);
          border-bottom: 1px solid rgba(239,68,68,0.25);
          padding: 10px 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          font-family: var(--mono);
          font-size: 12px;
          color: var(--red);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          font-weight: 700;
          animation: siren-flash 2s ease infinite;
        }

        @keyframes siren-flash {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        .tg-coord {
          font-family: var(--mono);
          font-size: 12px;
          color: var(--text-muted);
          display: block;
          margin-top: 2px;
        }
      `}</style>

      <div className="tg-root">
        {/* ── SIREN BAR ── */}
        {hasAlerts && (
          <div className="tg-siren-bar">
            <AlertTriangle size={14} />
            {alerts.length} active emergency{alerts.length !== 1 ? "ies" : ""} — immediate attention required
            <AlertTriangle size={14} />
          </div>
        )}

        {/* ── TOPBAR ── */}
        <header className="tg-topbar">
          <div className="tg-topbar-inner">
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <a href="/home" className="tg-back">
                <ArrowLeft size={15} />
                Back
              </a>
              <div style={{ width: 1, height: 24, background: "var(--border)" }} />
              <div className="tg-brand">
                <div className="tg-brand-logo">🏔️</div>
                <div>
                  <div className="tg-brand-name">TRAILGUARD</div>
                  <div className="tg-brand-sub">Gunung Ledang · SAR</div>
                </div>
              </div>
            </div>

            <div className="tg-topbar-right">
              <div className="tg-live-pill">
                <div className="tg-live-dot" />
                LIVE
              </div>
              <div className="tg-clock">
                {now.toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </div>
              <button
                className={`tg-sound-btn ${soundEnabled ? "on" : "off"}`}
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
              >
                {soundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
                {soundEnabled ? "Alarm ON" : "Alarm OFF"}
              </button>
            </div>
          </div>
        </header>

        {/* ── MAIN CONTENT ── */}
        <main className="tg-main">

          {/* ── PAGE HEADER ── */}
          <div className="tg-page-header">
            <div className="tg-page-header-top">
              <div>
                <div className="tg-incident-badge">
                  <Shield size={11} />
                  Emergency Operations Center
                  <ChevronRight size={11} />
                  Incident Monitor
                </div>
                <h1 className="tg-page-title">
                  Emergency Alerts
                  {hasAlerts && (
                    <span className="tg-title-alert-chip">
                      {alerts.length} ACTIVE
                    </span>
                  )}
                </h1>
                <div className="tg-page-subtitle">
                  <span><Satellite size={12} style={{ color: "var(--blue)" }} />Real-time hiker tracking</span>
                  <span><Radio size={12} style={{ color: "var(--green)" }} />Supabase live channel</span>
                  <span><MapPin size={12} style={{ color: "var(--amber)" }} />Gunung Ledang, Johor</span>
                </div>
              </div>
              <div className="tg-header-actions">
                <button
                  className="tg-refresh-btn"
                  onClick={fetchAlerts}
                  disabled={isLoading}
                >
                  <RefreshCw size={13} className={isLoading ? "spin" : ""} />
                  {isLoading ? "Refreshing…" : "Refresh"}
                </button>
              </div>
            </div>
          </div>

          {/* ── STAT CARDS ── */}
          <div className="tg-stats">
            {/* Active Alerts */}
            <div
              className="tg-stat-card"
              style={{
                "--accent-color": hasAlerts ? "var(--red)" : "var(--green)",
                borderColor: hasAlerts ? "rgba(239,68,68,0.25)" : "var(--border)",
              } as React.CSSProperties}
            >
              <div
                className="tg-stat-icon"
                style={{
                  background: hasAlerts ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)",
                }}
              >
                <Bell size={20} color={hasAlerts ? "var(--red)" : "var(--green)"} />
              </div>
              <div>
                <div className="tg-stat-label">Active Alerts</div>
                <div className="tg-stat-value" style={{ color: hasAlerts ? "var(--red)" : "var(--green)" }}>
                  {alerts.length}
                </div>
                <div className="tg-stat-note">{hasAlerts ? "Require response" : "All clear"}</div>
              </div>
            </div>

            {/* Hikers tracked */}
            <div className="tg-stat-card" style={{ "--accent-color": "var(--blue)" } as React.CSSProperties}>
              <div className="tg-stat-icon" style={{ background: "rgba(59,130,246,0.1)" }}>
                <UserCheck size={20} color="var(--blue)" />
              </div>
              <div>
                <div className="tg-stat-label">Hikers in Distress</div>
                <div className="tg-stat-value" style={{ color: "var(--blue)" }}>
                  {new Set(alerts.map((a) => a.hiker_id)).size}
                </div>
                <div className="tg-stat-note">Unique individuals</div>
              </div>
            </div>

            {/* Latest */}
            <div className="tg-stat-card" style={{ "--accent-color": "var(--amber)" } as React.CSSProperties}>
              <div className="tg-stat-icon" style={{ background: "var(--amber-dim)" }}>
                <Clock size={20} color="var(--amber)" />
              </div>
              <div>
                <div className="tg-stat-label">Latest Alert</div>
                <div className="tg-stat-value" style={{ color: "var(--amber)", fontSize: 18 }}>
                  {alerts.length > 0
                    ? new Date(alerts[0].created_at).toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" })
                    : "—"}
                </div>
                <div className="tg-stat-note">
                  {alerts.length > 0 ? formatTimeAgo(alerts[0].created_at) : "No recent alerts"}
                </div>
              </div>
            </div>

            {/* System */}
            <div className="tg-stat-card" style={{ "--accent-color": "rgba(34,197,94,0.5)" } as React.CSSProperties}>
              <div className="tg-stat-icon" style={{ background: "rgba(34,197,94,0.08)" }}>
                <Activity size={20} color="var(--green)" />
              </div>
              <div>
                <div className="tg-stat-label">System</div>
                <div className="tg-stat-value" style={{ color: "var(--green)", fontSize: 16 }}>
                  {soundEnabled ? "ACTIVE" : "MUTED"}
                </div>
                <div className="tg-stat-note">Alarm {soundEnabled ? "enabled" : "silenced"}</div>
              </div>
            </div>
          </div>

          {/* ── ALERTS SECTION ── */}
          <div className="tg-section-header">
            <div className="tg-section-title">
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: hasAlerts ? "var(--red)" : "var(--green)",
                  animation: hasAlerts ? "pulse-dot 1.5s ease infinite" : "none",
                }}
              />
              Active Emergencies
              {hasAlerts && (
                <span
                  className="tg-section-count"
                  style={{
                    background: "var(--red-dim)",
                    color: "var(--red)",
                    border: "1px solid rgba(239,68,68,0.3)",
                  }}
                >
                  {alerts.length} pending
                </span>
              )}
            </div>
          </div>

          <div className="tg-alert-list">
            {isLoading ? (
              <div className="tg-loading">
                <div className="tg-spinner" />
                <div style={{ fontFamily: "var(--mono)", fontSize: 13, color: "var(--text-muted)", letterSpacing: "0.06em" }}>
                  LOADING EMERGENCY DATA…
                </div>
              </div>
            ) : !hasAlerts ? (
              <div className="tg-empty">
                <div className="tg-empty-icon">
                  <BellOff size={32} color="var(--text-dim)" />
                </div>
                <div className="tg-empty-title">All Systems Clear</div>
                <div className="tg-empty-sub">
                  No active emergency alerts. Monitoring systems are fully operational and tracking all registered hikers on Gunung Ledang.
                </div>
              </div>
            ) : (
              alerts.map((alert) => {
                const meta = getEmergencyMeta(alert.emergency_type)
                return (
                  <div
                    key={alert.id}
                    className="tg-alert-card"
                    style={{
                      borderColor: meta.border,
                      background: `linear-gradient(135deg, var(--surface), var(--surface-2))`,
                    }}
                  >
                    {/* left accent bar */}
                    <div className="tg-alert-card-accent" style={{ background: meta.color }} />

                    <div
                      className="tg-alert-inner-wrap"
                      style={{ display: "flex", alignItems: "stretch" }}
                    >
                      {/* ── LEFT: Alert Info ── */}
                      <div className="tg-alert-inner" style={{ flex: 1 }}>
                        <div className="tg-alert-icon-col">
                          <div
                            className="tg-alert-type-icon"
                            style={{
                              background: meta.bg,
                              borderColor: meta.border,
                            }}
                          >
                            {meta.icon}
                            <div
                              className="tg-alert-pulse"
                              style={{ borderColor: meta.color }}
                            />
                          </div>
                        </div>

                        <div className="tg-alert-info">
                          {/* Badges Row */}
                          <div className="tg-alert-badges">
                            <span
                              className="tg-badge"
                              style={{
                                color: meta.color,
                                borderColor: meta.border,
                                background: meta.bg,
                              }}
                            >
                              <Zap size={10} />
                              {meta.label}
                            </span>

                            <span
                              className="tg-badge"
                              style={{
                                color: "var(--amber)",
                                borderColor: "rgba(245,158,11,0.3)",
                                background: "rgba(245,158,11,0.08)",
                              }}
                            >
                              {alert.status}
                            </span>

                            <span
                              className="tg-badge"
                              style={{
                                color: "var(--blue)",
                                borderColor: "rgba(59,130,246,0.25)",
                                background: "rgba(59,130,246,0.08)",
                              }}
                            >
                              <User size={9} />
                              {alert.hikers?.name ?? "Unknown Hiker"}
                            </span>

                            <span className="tg-alert-id">#{alert.id}</span>
                          </div>

                          {/* Meta Grid */}
                          <div className="tg-alert-meta-grid">
                            {/* Time */}
                            <div className="tg-meta-item">
                              <div className="tg-meta-icon">
                                <Clock size={14} color="var(--text-dim)" />
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <div className="tg-meta-label">Alert Time</div>
                                <div className="tg-meta-value">
                                  {new Date(alert.created_at).toLocaleTimeString("en-MY", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </div>
                                <div className="tg-meta-sub">{formatTimeAgo(alert.created_at)}</div>
                              </div>
                            </div>

                            {/* Location */}
                            {alert.latitude !== null && alert.longitude !== null && (
                              <div className="tg-meta-item">
                                <div className="tg-meta-icon">
                                  <MapPin size={14} color="var(--text-dim)" />
                                </div>
                                <div style={{ minWidth: 0 }}>
                                  <div className="tg-meta-label">GPS Coordinates</div>
                                  <div className="tg-meta-value">
                                    {alert.latitude.toFixed(4)}°N
                                  </div>
                                  <div className="tg-meta-sub">
                                    {alert.longitude.toFixed(4)}°E
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Hiker ID */}
                            <div className="tg-meta-item">
                              <div className="tg-meta-icon">
                                <User size={14} color="var(--text-dim)" />
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <div className="tg-meta-label">Hiker ID</div>
                                <div className="tg-meta-value">
                                  {alert.hiker_id ? `HKR-${String(alert.hiker_id).padStart(4, "0")}` : "Unknown"}
                                </div>
                                <div className="tg-meta-sub">{alert.hikers?.name ?? "No name"}</div>
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="tg-alert-actions">
                            {alert.latitude !== null && alert.longitude !== null && (
                              <button
                                className="tg-btn-navigate"
                                onClick={() => openGoogleMaps(alert.latitude!, alert.longitude!)}
                              >
                                <Navigation size={13} />
                                Navigate to Location
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* ── RIGHT: Action Panel ── */}
                      <div className="tg-action-panel">
                        <div className="tg-action-panel-title">
                          <Shield size={10} style={{ display: "inline", marginRight: 5 }} />
                          Response Action
                        </div>
                        <div className="tg-action-panel-desc">
                          Acknowledge to confirm receipt of this alert and stop the alarm. Hiker will be marked as responded.
                        </div>

                        <button
                          className="tg-btn-ack"
                          onClick={() => acknowledgeAlert(alert.id)}
                        >
                          <CheckCircle size={15} />
                          Acknowledge Alert
                        </button>

                        <div className="tg-alert-id-small">
                          Alert ID: #TG-{String(alert.id).padStart(5, "0")}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* ── FOOTER ── */}
          <div className="tg-footer">
            <div className="tg-footer-status">
              <div
                className="tg-footer-status-dot"
                style={{
                  background: hasAlerts ? "var(--red)" : "var(--green)",
                  animation: hasAlerts ? "pulse-dot 1.5s ease infinite" : "none",
                  boxShadow: hasAlerts ? "0 0 6px var(--red)" : "0 0 6px var(--green)",
                }}
              />
              <div>
                <div style={{ fontSize: 13, color: "var(--text)", fontWeight: 500 }}>
                  {hasAlerts
                    ? `${alerts.length} active emergency${alerts.length !== 1 ? "ies" : ""} requiring attention`
                    : "All systems operational — no active alerts"}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2 }}>
                  Last updated:{" "}
                  {now.toLocaleTimeString("en-MY", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </div>
              </div>
            </div>

            <div className="tg-footer-right">
              <div className="tg-footer-chip">
                <div className="tg-live-dot" />
                Live connection
              </div>
              <span style={{ color: "var(--border)" }}>|</span>
              <span>Control Center v2.0</span>
              <span style={{ color: "var(--border)" }}>|</span>
              <span>Gunung Ledang, Johor</span>
            </div>
          </div>
        </main>
      </div>

      <audio ref={audioRef} src="/alarm.mp3" loop />
    </>
  )
}