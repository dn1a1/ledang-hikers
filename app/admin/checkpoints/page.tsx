"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Activity,
  MapPin,
  Mountain,
  Plus,
  Shield,
  ToggleLeft,
  ToggleRight,
  Trash2,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { supabase } from "@/lib/supabase"

type Checkpoint = {
  id: number
  name: string
  latitude: number
  longitude: number
  radius_m: number
  order_no: number
  active: boolean
}

export default function CheckpointManagementPage() {
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([])
  const [isSaving, setIsSaving] = useState(false)

  const [form, setForm] = useState<Omit<Checkpoint, "id">>({
    name: "",
    latitude: 0,
    longitude: 0,
    radius_m: 50,
    order_no: 1,
    active: true,
  })

  useEffect(() => {
    loadCheckpoints()
  }, [])

  async function loadCheckpoints() {
    const { data, error } = await supabase.from("checkpoints").select("*").order("order_no")

    if (error) {
      console.error("checkpoints error:", error)
      return
    }

    setCheckpoints(data ?? [])
  }

  async function addCheckpoint(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)

    const { error } = await supabase.from("checkpoints").insert(form)

    setIsSaving(false)

    if (error) {
      alert("Gagal tambah checkpoint")
      console.error("add checkpoint error:", error)
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

    const { error } = await supabase.from("checkpoints").delete().eq("id", id)

    if (error) {
      console.error("delete checkpoint error:", error)
      alert("Gagal padam checkpoint")
      return
    }

    loadCheckpoints()
  }

  async function toggleActive(id: number, active: boolean) {
    const { error } = await supabase.from("checkpoints").update({ active: !active }).eq("id", id)

    if (error) {
      console.error("toggle checkpoint error:", error)
      alert("Gagal kemaskini checkpoint")
      return
    }

    loadCheckpoints()
  }

  const totalCheckpoints = checkpoints.length
  const activeCheckpoints = checkpoints.filter((checkpoint) => checkpoint.active).length
  const inactiveCheckpoints = totalCheckpoints - activeCheckpoints
  const averageRadius = useMemo(() => {
    if (checkpoints.length === 0) return 0
    return Math.round(
      checkpoints.reduce((total, checkpoint) => total + checkpoint.radius_m, 0) / checkpoints.length
    )
  }, [checkpoints])

  return (
    <div className="app-shell min-h-screen p-4 md:p-6">
      <div className="mx-auto max-w-screen-xl space-y-6">
        <section className="panel-surface">
          <div className="panel-header">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                <MapPin className="h-6 w-6" />
              </div>
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge variant="outline">Gunung Ledang</Badge>
                  <Badge className="bg-primary/10 text-primary hover:bg-primary/10">Waypoint Control</Badge>
                </div>
                <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Checkpoint Management</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Manage trail waypoints, route order, geofence radius, and active checkpoint status.
                </p>
              </div>
            </div>

            <div className="theme-callout theme-callout-success text-sm">
              <div className="theme-text-success flex items-center gap-2 font-medium">
                <span className="theme-dot-success size-2 rounded-full" />
                Registry Online
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Checkpoint sync and trail registry are available.</p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={<MapPin className="h-5 w-5" />}
            label="Total Checkpoints"
            value={totalCheckpoints}
            tone="text-primary"
          />
          <MetricCard
            icon={<Shield className="h-5 w-5" />}
            label="Active"
            value={activeCheckpoints}
            tone="theme-text-success"
          />
          <MetricCard
            icon={<Activity className="h-5 w-5" />}
            label="Inactive"
            value={inactiveCheckpoints}
            tone="theme-text-warning"
          />
          <MetricCard
            icon={<Mountain className="h-5 w-5" />}
            label="Average Radius"
            value={`${averageRadius}m`}
            tone="theme-text-info"
          />
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
          <section className="panel-surface">
            <div className="panel-header">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Add New Checkpoint</h2>
                <p className="text-xs text-muted-foreground">
                  Create a new waypoint with coordinates, route sequence, and radius.
                </p>
              </div>
              <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary">
                Route Setup
              </Badge>
            </div>

            <form onSubmit={addCheckpoint} className="space-y-4 p-5">
              <div className="space-y-2">
                <Label htmlFor="checkpoint-name">Checkpoint Name</Label>
                <Input
                  id="checkpoint-name"
                  placeholder="e.g. Kem Botak"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="checkpoint-order">Route Order</Label>
                  <Input
                    id="checkpoint-order"
                    type="number"
                    min={1}
                    value={form.order_no}
                    onChange={(event) => setForm({ ...form, order_no: Number(event.target.value) })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="checkpoint-radius">Radius (meter)</Label>
                  <Input
                    id="checkpoint-radius"
                    type="number"
                    min={1}
                    value={form.radius_m}
                    onChange={(event) => setForm({ ...form, radius_m: Number(event.target.value) })}
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="checkpoint-latitude">Latitude</Label>
                  <Input
                    id="checkpoint-latitude"
                    type="number"
                    step="any"
                    value={form.latitude}
                    onChange={(event) => setForm({ ...form, latitude: Number(event.target.value) })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="checkpoint-longitude">Longitude</Label>
                  <Input
                    id="checkpoint-longitude"
                    type="number"
                    step="any"
                    value={form.longitude}
                    onChange={(event) => setForm({ ...form, longitude: Number(event.target.value) })}
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isSaving}>
                <Plus className="h-4 w-4" />
                {isSaving ? "Saving..." : "Tambah Checkpoint"}
              </Button>
            </form>
          </section>

          <section className="panel-surface overflow-hidden">
            <div className="panel-header">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Checkpoint Registry</h2>
                <p className="text-xs text-muted-foreground">
                  All trail waypoints in route order, including status and geofence details.
                </p>
              </div>
              <div className="text-sm text-muted-foreground">
                {checkpoints.length} {checkpoints.length === 1 ? "checkpoint" : "checkpoints"}
              </div>
            </div>

            {checkpoints.length === 0 ? (
              <EmptyState
                icon={<MapPin className="h-6 w-6 text-muted-foreground" />}
                title="No checkpoints defined"
                description="Create the first checkpoint to start building the trail route."
              />
            ) : (
              <div className="table-shell">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/60">
                      <TableHead className="px-6 text-xs font-semibold uppercase text-muted-foreground">Order</TableHead>
                      <TableHead className="px-6 text-xs font-semibold uppercase text-muted-foreground">Checkpoint</TableHead>
                      <TableHead className="hidden px-6 text-xs font-semibold uppercase text-muted-foreground md:table-cell">
                        Coordinates
                      </TableHead>
                      <TableHead className="hidden px-6 text-xs font-semibold uppercase text-muted-foreground sm:table-cell">
                        Radius
                      </TableHead>
                      <TableHead className="px-6 text-xs font-semibold uppercase text-muted-foreground">Status</TableHead>
                      <TableHead className="px-6 text-xs font-semibold uppercase text-muted-foreground">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {checkpoints.map((checkpoint) => (
                      <TableRow key={checkpoint.id} className="border-border/50 hover:bg-accent/30">
                        <TableCell className="px-6 py-4 align-top">
                          <Badge variant="outline" className="font-mono">
                            {checkpoint.order_no}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-6 py-4 align-top">
                          <div className="space-y-1">
                            <div className="font-medium text-foreground">{checkpoint.name}</div>
                            <div className="text-xs text-muted-foreground md:hidden">
                              {checkpoint.latitude.toFixed(4)}, {checkpoint.longitude.toFixed(4)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden px-6 py-4 align-top md:table-cell">
                          <span className="font-mono text-xs text-muted-foreground">
                            {checkpoint.latitude.toFixed(4)}, {checkpoint.longitude.toFixed(4)}
                          </span>
                        </TableCell>
                        <TableCell className="hidden px-6 py-4 align-top sm:table-cell">
                          <span className="text-sm text-muted-foreground">{checkpoint.radius_m} m</span>
                        </TableCell>
                        <TableCell className="px-6 py-4 align-top">
                          {checkpoint.active ? (
                            <Badge className="theme-chip-success hover:bg-emerald-500/10">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              Inactive
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="px-6 py-4 align-top">
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => toggleActive(checkpoint.id, checkpoint.active)}
                            >
                              {checkpoint.active ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                              {checkpoint.active ? "Deactivate" : "Activate"}
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteCheckpoint(checkpoint.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

function MetricCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  tone: string
}) {
  return (
    <div className="metric-card">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-muted text-primary">
          {icon}
        </div>
        <div>
          <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
          <p className={`mt-1 text-2xl font-semibold ${tone}`}>{value}</p>
        </div>
      </div>
    </div>
  )
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">{icon}</div>
      <h3 className="font-medium text-foreground">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
