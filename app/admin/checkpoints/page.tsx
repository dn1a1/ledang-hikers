"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

/* =======================
   TYPES
======================= */

type Checkpoint = {
  id: number
  name: string
  latitude: number
  longitude: number
  radius_m: number
  order_no: number
  active: boolean
}

type HikerProgress = {
  hiker_id: number
  hiker_name: string
  checkpoint_name: string | null
  checked_at: string | null
  status: "ON_TRACK" | "DELAYED" | "NO_MOVEMENT"
}

/* =======================
   COMPONENT
======================= */

export default function CheckpointManagementPage() {
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([])
  const [hikerProgress, setHikerProgress] = useState<HikerProgress[]>([])

  const [form, setForm] = useState<Omit<Checkpoint, "id">>({
    name: "",
    latitude: 0,
    longitude: 0,
    radius_m: 50,
    order_no: 1,
    active: true,
  })

  /* =======================
     LOAD INITIAL DATA
  ======================= */

  useEffect(() => {
    loadCheckpoints()
    loadHikerProgress()
  }, [])

  /* =======================
     🔴 REAL-TIME LISTENER
     (TAMBAH SAHAJA)
  ======================= */

  useEffect(() => {
    const channel = supabase
      .channel("checkpoint-live-monitoring")

      // GPS update (movement)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "lokasi_pendaki",
        },
        () => {
          loadHikerProgress()
        }
      )

      // Checkpoint reached
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "checkpoint_logs",
        },
        () => {
          loadHikerProgress()
        }
      )

      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  /* =======================
     EXISTING FUNCTIONS
     (UNCHANGED)
  ======================= */

  async function loadCheckpoints() {
    const { data } = await supabase
      .from("checkpoints")
      .select("*")
      .order("order_no")

    if (data) setCheckpoints(data)
  }

  async function addCheckpoint() {
    const { error } = await supabase
      .from("checkpoints")
      .insert(form)

    if (error) {
      alert("Gagal tambah checkpoint")
      console.error(error)
      return
    }

    setForm({
      name: "",
      latitude: 0,
      longitude: 0,
      radius_m: 50,
      order_no: 1,
      active: true,
    })

    loadCheckpoints()
  }

  async function deleteCheckpoint(id: number) {
    if (!confirm("Padam checkpoint ini?")) return

    await supabase
      .from("checkpoints")
      .delete()
      .eq("id", id)

    loadCheckpoints()
  }

  async function toggleActive(id: number, active: boolean) {
    await supabase
      .from("checkpoints")
      .update({ active: !active })
      .eq("id", id)

    loadCheckpoints()
  }

  /* =======================
     LIVE HIKER PROGRESS
     (USING lokasi_pendaki)
  ======================= */

  async function loadHikerProgress() {
    const { data: gpsData } = await supabase
      .from("lokasi_pendaki")
      .select("hiker_id, updated_at")
      .order("updated_at", { ascending: false })

    if (!gpsData) return

    const latestGps = new Map<number, string>()
    gpsData.forEach((g: any) => {
      if (!latestGps.has(g.hiker_id)) {
        latestGps.set(g.hiker_id, g.updated_at)
      }
    })

    const { data: hikers } = await supabase
      .from("hikers")
      .select(`
        id,
        name,
        checkpoint_logs (
          checked_at,
          checkpoints ( name )
        )
      `)

    if (!hikers) return

    const now = Date.now()

    const progress: HikerProgress[] = hikers.map((hiker: any) => {
      const lastGpsTime = latestGps.get(hiker.id)
      let status: HikerProgress["status"] = "NO_MOVEMENT"

      if (lastGpsTime) {
        const diffMin =
          (now - new Date(lastGpsTime).getTime()) / 60000

        if (diffMin < 5) status = "ON_TRACK"
        else if (diffMin < 15) status = "DELAYED"
        else status = "NO_MOVEMENT"
      }

      const lastCheckpoint = hiker.checkpoint_logs?.[0]

      return {
        hiker_id: hiker.id,
        hiker_name: hiker.name,
        checkpoint_name:
          lastCheckpoint?.checkpoints?.name ?? null,
        checked_at: lastCheckpoint?.checked_at ?? null,
        status,
      }
    })

    setHikerProgress(progress)
  }

  /* =======================
     UI
  ======================= */

  return (
    <div className="p-6 space-y-10">
      <h1 className="text-2xl font-bold">
        📍 Checkpoint Management
      </h1>

      {/* ADD CHECKPOINT */}
      <div className="grid grid-cols-2 gap-3">
        <input
          placeholder="Checkpoint Name"
          value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })}
          className="border p-2 rounded"
        />
        <input
          type="number"
          placeholder="Order"
          value={form.order_no}
          onChange={e =>
            setForm({ ...form, order_no: Number(e.target.value) })
          }
          className="border p-2 rounded"
        />
        <input
          type="number"
          placeholder="Latitude"
          value={form.latitude}
          onChange={e =>
            setForm({ ...form, latitude: Number(e.target.value) })
          }
          className="border p-2 rounded"
        />
        <input
          type="number"
          placeholder="Longitude"
          value={form.longitude}
          onChange={e =>
            setForm({ ...form, longitude: Number(e.target.value) })
          }
          className="border p-2 rounded"
        />
        <input
          type="number"
          placeholder="Radius (meter)"
          value={form.radius_m}
          onChange={e =>
            setForm({ ...form, radius_m: Number(e.target.value) })
          }
          className="border p-2 rounded"
        />

        <button
          onClick={addCheckpoint}
          className="col-span-2 bg-blue-600 text-white p-2 rounded"
        >
          ➕ Tambah Checkpoint
        </button>
      </div>

      {/* CHECKPOINT LIST */}
      <table className="w-full border">
        <thead className="bg-gray-100">
          <tr>
            <th className="border p-2">Order</th>
            <th className="border p-2">Name</th>
            <th className="border p-2">Radius</th>
            <th className="border p-2">Status</th>
            <th className="border p-2">Action</th>
          </tr>
        </thead>
        <tbody>
          {checkpoints.map(cp => (
            <tr key={cp.id}>
              <td className="border p-2">{cp.order_no}</td>
              <td className="border p-2">{cp.name}</td>
              <td className="border p-2">{cp.radius_m} m</td>
              <td className="border p-2">
                {cp.active ? "Active" : "Inactive"}
              </td>
              <td className="border p-2 space-x-2">
                <button
                  onClick={() => toggleActive(cp.id, cp.active)}
                  className="bg-yellow-500 text-white px-2 py-1 rounded"
                >
                  Toggle
                </button>
                <button
                  onClick={() => deleteCheckpoint(cp.id)}
                  className="bg-red-600 text-white px-2 py-1 rounded"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* LIVE HIKER PROGRESS */}
      <div>
        <h2 className="text-xl font-bold mb-3">
          🧍‍♂️ Live Hiker Progress
        </h2>

        <table className="w-full border">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-2">Hiker</th>
              <th className="border p-2">Last Checkpoint</th>
              <th className="border p-2">Checkpoint Time</th>
              <th className="border p-2">Movement Status</th>
            </tr>
          </thead>
          <tbody>
            {hikerProgress.map(h => (
              <tr key={h.hiker_id}>
                <td className="border p-2">{h.hiker_name}</td>
                <td className="border p-2">
                  {h.checkpoint_name ?? "-"}
                </td>
                <td className="border p-2">
                  {h.checked_at
                    ? new Date(h.checked_at).toLocaleTimeString()
                    : "-"}
                </td>
                <td className="border p-2 font-semibold">
                  {h.status === "ON_TRACK" && "🟢 On Track"}
                  {h.status === "DELAYED" && "🟡 Delayed"}
                  {h.status === "NO_MOVEMENT" && "🔴 No Movement"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
