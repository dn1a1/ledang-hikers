"use client"

import type { CSSProperties, ReactNode } from "react"
import { usePathname } from "next/navigation"

import AdminSidebar from "@/components/admin/AdminSidebar"
import { EmergencyAlertsProvider } from "@/components/admin/EmergencyAlertsProvider"
import { getAdminPageMeta } from "@/components/admin/page-meta"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"

type AdminLayoutProps = {
  children: ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname()
  const currentPage = getAdminPageMeta(pathname)

  return (
    <EmergencyAlertsProvider>
      <SidebarProvider
        defaultOpen
        className="app-shell min-h-screen font-sans"
        style={
          {
            "--sidebar-width": "18rem",
            "--sidebar-width-mobile": "18rem",
          } as CSSProperties
        }
      >
        <AdminSidebar />
        <SidebarInset className="min-w-0 bg-transparent">
          <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border/70 bg-background/80 px-4 backdrop-blur sm:px-6">
            <SidebarTrigger className="size-9 rounded-xl border border-border bg-card shadow-sm" />
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-semibold text-foreground">
                {currentPage.title}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {currentPage.description}
              </span>
            </div>
          </div>
          <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </EmergencyAlertsProvider>
  )
}
