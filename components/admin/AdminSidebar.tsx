"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Activity,
  AlertTriangle,
  BarChart3,
  ChevronUp,
  LogOut,
  MapPin,
  Mountain,
  QrCode,
  Shield,
  UserCircle2,
  Users,
} from "lucide-react"

import { useEmergencyAlerts } from "@/components/admin/EmergencyAlertsProvider"
import { ModeToggle } from "@/components/mode-toggle"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"

type StoredUser = {
  id: string
  username: string
  role: string
}

const navItems = [
  { href: "/admin", label: "Dashboard", icon: Activity },
  { href: "/admin/qr-management", label: "QR Management", icon: QrCode },
  { href: "/admin/hikers", label: "Participants", icon: Users },
  { href: "/admin/live", label: "Live Monitor", icon: MapPin },
  { href: "/admin/checkpoints", label: "Checkpoints", icon: Shield },
  { href: "/admin/emergency-alerts", label: "Emergency Alerts", icon: AlertTriangle },
  { href: "/admin/reports", label: "Reports", icon: BarChart3 },
]

function isActivePath(pathname: string, href: string) {
  if (href === "/admin") return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}

export default function AdminSidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const { alertCount } = useEmergencyAlerts()
  const [user, setUser] = useState<StoredUser | null>(null)
  const { isMobile } = useSidebar()

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user")
      if (!stored) return
      setUser(JSON.parse(stored) as StoredUser)
    } catch (error) {
      console.error("Failed to read user session:", error)
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem("user")
    router.push("/auth/login")
  }

  const userInitial = user?.username?.charAt(0).toUpperCase() ?? "A"
  const userRole = user?.role ? `${user.role.charAt(0).toUpperCase()}${user.role.slice(1)}` : "Admin"

  return (
    <Sidebar variant="inset" collapsible="icon" className="border-r-0">
      <SidebarHeader className="border-b border-sidebar-border/70 px-3 py-4">
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
          <SidebarMenu className="min-w-0 flex-1">
            <SidebarMenuItem>
              <SidebarMenuButton asChild size="lg" tooltip="Trailguard Admin">
                <Link href="/admin" className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-sidebar-primary/12 text-sidebar-primary ring-1 ring-sidebar-primary/10">
                    <Mountain className="h-5 w-5" />
                  </div>
                  <div className="grid min-w-0 flex-1 text-left group-data-[collapsible=icon]:hidden">
                    <span className="truncate text-sm font-semibold tracking-normal text-sidebar-foreground">
                      Ledang Hikers
                    </span>
                    <span className="truncate text-xs text-sidebar-foreground/65">
                      Admin Console
                    </span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>

          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-sidebar-border/70 bg-sidebar-accent/40 group-data-[collapsible=icon]:hidden">
            <ModeToggle />
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const Icon = item.icon
                const active = isActivePath(pathname, item.href)

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
                      <Link href={item.href}>
                        <Icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                    {item.href === "/admin/emergency-alerts" && alertCount > 0 && (
                      <SidebarMenuBadge>{alertCount}</SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/70 p-3">
        <div className="flex items-center gap-2 rounded-xl px-2 py-1 text-xs text-sidebar-foreground/70 group-data-[collapsible=icon]:justify-center">
          <span className="h-2 w-2 animate-pulse rounded-full bg-sidebar-primary" />
          <span className="group-data-[collapsible=icon]:hidden">System Online</span>
        </div>

        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  tooltip="User menu"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg border border-sidebar-border/70">
                    <AvatarFallback className="rounded-lg bg-sidebar-primary/15 text-sm font-semibold text-sidebar-primary">
                      {userInitial}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid min-w-0 flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                    <span className="truncate font-medium text-sidebar-foreground">
                      {user?.username || "admin"}
                    </span>
                    <span className="truncate text-xs text-sidebar-foreground/65">
                      {userRole}
                    </span>
                  </div>
                  <ChevronUp className="ml-auto h-4 w-4 group-data-[collapsible=icon]:hidden" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                side={isMobile ? "bottom" : "right"}
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded-lg border border-border">
                      <AvatarFallback className="rounded-lg bg-primary/15 text-sm font-semibold text-primary">
                        {userInitial}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-medium">{user?.username || "admin"}</span>
                      <span className="truncate text-xs text-muted-foreground">{userRole}</span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem asChild>
                    <Link href="/admin/profile">
                      <UserCircle2 />
                      Account
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Shield />
                    {userRole}
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={handleLogout}>
                  <LogOut />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
