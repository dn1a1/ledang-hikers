"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"

import { supabase } from "@/lib/supabase"

type EmergencyAlertsContextValue = {
  alertCount: number
  refreshAlertCount: () => Promise<void>
}

type EmergencyAlertRow = {
  status?: string | null
}

const EmergencyAlertsContext = createContext<EmergencyAlertsContextValue | null>(null)

export function EmergencyAlertsProvider({ children }: { children: ReactNode }) {
  const [alertCount, setAlertCount] = useState(0)

  const refreshAlertCount = useCallback(async () => {
    const { count, error } = await supabase
      .from("emergency_alerts")
      .select("id", { count: "exact", head: true })
      .eq("status", "NEW")

    if (error) {
      console.error("ALERT COUNT ERROR:", error)
      return
    }

    setAlertCount(count ?? 0)
  }, [])

  useEffect(() => {
    void refreshAlertCount()

    const channel = supabase
      .channel("emergency-alert-count-sidebar")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "emergency_alerts",
        },
        (payload) => {
          const alert = payload.new as EmergencyAlertRow

          if (alert.status === "NEW") {
            setAlertCount((current) => current + 1)
          }

          void refreshAlertCount()
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "emergency_alerts",
        },
        () => {
          void refreshAlertCount()
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "emergency_alerts",
        },
        () => {
          void refreshAlertCount()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [refreshAlertCount])

  const value = useMemo(
    () => ({
      alertCount,
      refreshAlertCount,
    }),
    [alertCount, refreshAlertCount]
  )

  return <EmergencyAlertsContext.Provider value={value}>{children}</EmergencyAlertsContext.Provider>
}

export function useEmergencyAlerts() {
  const context = useContext(EmergencyAlertsContext)

  if (!context) {
    throw new Error("useEmergencyAlerts must be used within EmergencyAlertsProvider")
  }

  return context
}
