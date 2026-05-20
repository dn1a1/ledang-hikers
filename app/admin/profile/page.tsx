"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Calendar,
  KeyRound,
  Save,
  Shield,
  UserCircle2,
  UserRound,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase"

type StoredUser = {
  id: string
  username: string
  role: string
}

type UserRow = {
  id: string
  username: string
  role: string
  created_at: string | null
}

function formatRole(role: string) {
  return `${role.charAt(0).toUpperCase()}${role.slice(1)}`
}

function formatDate(value: string | null) {
  if (!value) return "-"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleString("en-MY", {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

export default function ProfilePage() {
  const [sessionUser, setSessionUser] = useState<StoredUser | null>(null)
  const [userRecord, setUserRecord] = useState<UserRow | null>(null)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [statusMessage, setStatusMessage] = useState("")
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    async function loadProfile() {
      setIsLoading(true)
      setErrorMessage("")

      try {
        const stored = localStorage.getItem("user")
        if (!stored) {
          setErrorMessage("No active user session found.")
          setIsLoading(false)
          return
        }

        const parsed = JSON.parse(stored) as StoredUser
        setSessionUser(parsed)

        const { data, error } = await supabase
          .from("users")
          .select("id, username, role, created_at")
          .eq("id", parsed.id)
          .single<UserRow>()

        if (error || !data) {
          setErrorMessage("Unable to load profile details.")
          setIsLoading(false)
          return
        }

        setUserRecord(data)
        setUsername(data.username)
      } catch (error) {
        console.error("profile load error:", error)
        setErrorMessage("Unable to load profile details.")
      } finally {
        setIsLoading(false)
      }
    }

    void loadProfile()
  }, [])

  const roleLabel = useMemo(() => {
    if (userRecord?.role) return formatRole(userRecord.role)
    if (sessionUser?.role) return formatRole(sessionUser.role)
    return "-"
  }, [sessionUser, userRecord])

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!sessionUser) return

    setIsSaving(true)
    setStatusMessage("")
    setErrorMessage("")

    const updates: { username?: string; password?: string } = {}

    if (username.trim() && username.trim() !== userRecord?.username) {
      updates.username = username.trim()
    }

    if (password.trim()) {
      updates.password = password
    }

    if (Object.keys(updates).length === 0) {
      setStatusMessage("No changes to save.")
      setIsSaving(false)
      return
    }

    const { data, error } = await supabase
      .from("users")
      .update(updates)
      .eq("id", sessionUser.id)
      .select("id, username, role, created_at")
      .single<UserRow>()

    setIsSaving(false)

    if (error || !data) {
      console.error("profile update error:", error)
      setErrorMessage("Failed to update profile.")
      return
    }

    setUserRecord(data)
    setPassword("")
    setStatusMessage("Profile updated successfully.")
    localStorage.setItem(
      "user",
      JSON.stringify({
        id: data.id,
        username: data.username,
        role: data.role,
      })
    )
    setSessionUser({
      id: data.id,
      username: data.username,
      role: data.role,
    })
  }

  return (
    <div className="app-shell min-h-screen p-4 md:p-6">
      <div className="mx-auto max-w-screen-xl space-y-6">
        <section className="panel-surface">
          <div className="panel-header">
            <div className="flex items-start gap-4">
              <div className="theme-icon-chip theme-icon-chip-info">
                <UserCircle2 className="h-6 w-6" />
              </div>
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge variant="outline">Account</Badge>
                  <Badge className="bg-primary/10 text-primary hover:bg-primary/10">Profile Settings</Badge>
                </div>
                <h1 className="text-2xl font-bold text-foreground sm:text-3xl">User Profile</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Review your account details and update your login credentials.
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
          <section className="space-y-6">
            <div className="panel-surface">
              <div className="panel-header">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Account Summary</h2>
                  <p className="text-xs text-muted-foreground">Current session and role information.</p>
                </div>
              </div>

              <div className="space-y-4 p-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                    <UserRound className="h-7 w-7" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-base font-semibold text-foreground">
                      {userRecord?.username ?? sessionUser?.username ?? "Unknown User"}
                    </div>
                    <div className="mt-1">
                      <Badge variant="outline" className="theme-chip-info">
                        <Shield className="h-3 w-3" />
                        {roleLabel}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3">
                  <InfoCard
                    icon={<UserRound className="h-4 w-4" />}
                    label="User ID"
                    value={userRecord?.id ?? sessionUser?.id ?? "-"}
                    mono
                  />
                  <InfoCard
                    icon={<Calendar className="h-4 w-4" />}
                    label="Created At"
                    value={formatDate(userRecord?.created_at ?? null)}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="panel-surface">
            <div className="panel-header">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Edit Profile</h2>
                <p className="text-xs text-muted-foreground">Update your username and password for this account.</p>
              </div>
            </div>

            <div className="p-5">
              {isLoading ? (
                <div className="rounded-2xl border border-border/70 bg-muted/30 p-6 text-sm text-muted-foreground">
                  Loading profile...
                </div>
              ) : errorMessage && !userRecord ? (
                <div className="theme-callout theme-callout-danger">
                  <p className="theme-text-danger text-sm">{errorMessage}</p>
                </div>
              ) : (
                <form onSubmit={handleSave} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="profile-username">Username</Label>
                    <Input
                      id="profile-username"
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      className="h-11"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="profile-password">New Password</Label>
                    <Input
                      id="profile-password"
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="h-11"
                      placeholder="Leave blank to keep current password"
                    />
                  </div>

                  {errorMessage && userRecord && (
                    <div className="theme-callout theme-callout-danger">
                      <p className="theme-text-danger text-sm">{errorMessage}</p>
                    </div>
                  )}

                  {statusMessage && (
                    <div className="theme-callout theme-callout-success">
                      <p className="theme-text-success text-sm">{statusMessage}</p>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3">
                    <Button type="submit" className="h-11" disabled={isSaving}>
                      <Save className="h-4 w-4" />
                      {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11"
                      onClick={() => {
                        setUsername(userRecord?.username ?? sessionUser?.username ?? "")
                        setPassword("")
                        setStatusMessage("")
                        setErrorMessage("")
                      }}
                    >
                      <KeyRound className="h-4 w-4" />
                      Reset
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

function InfoCard({
  icon,
  label,
  value,
  mono = false,
}: {
  icon: React.ReactNode
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className={`mt-1 break-words text-sm text-foreground ${mono ? "font-mono" : ""}`}>{value}</p>
        </div>
      </div>
    </div>
  )
}
