export type AdminPageMeta = {
  title: string
  description: string
}

export const adminPageMetaByPath: Record<string, AdminPageMeta> = {
  "/admin": {
    title: "Dashboard",
    description: "Admin overview, live activity, and emergency monitoring.",
  },
  "/admin/checkpoints": {
    title: "Checkpoints",
    description: "Manage checkpoint locations and monitor checkpoint activity.",
  },
  "/admin/emergency-alerts": {
    title: "Emergency Alerts",
    description: "Review and manage incoming emergency alerts from hikers.",
  },
  "/admin/guiders": {
    title: "Guiders",
    description: "Manage guider records and operational details.",
  },
  "/admin/hikers": {
    title: "Participants",
    description: "Manage participant records and hiking registrations.",
  },
  "/admin/live": {
    title: "Live Monitor",
    description: "Track active hikers and guiders in real time.",
  },
  "/admin/profile": {
    title: "Profile",
    description: "View and update your admin account details.",
  },
  "/admin/qr-management": {
    title: "QR Management",
    description: "Generate and manage QR access for hiking sessions.",
  },
  "/admin/reports": {
    title: "Reports",
    description: "Review analytics, summaries, and operational reports.",
  },
}

export function getAdminPageMeta(pathname: string): AdminPageMeta {
  const normalizedPath =
    pathname !== "/" && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname

  return adminPageMetaByPath[normalizedPath] ?? {
    title: "Admin Console",
    description: "Manage Trail Guard administrative tools and monitoring.",
  }
}

export function getAdminDocumentTitle(pathname: string) {
  const { title } = getAdminPageMeta(pathname)
  return `${title} | Ledang Hikers Admin`
}
