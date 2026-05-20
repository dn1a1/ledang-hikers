import { getAdminDocumentTitle, getAdminPageMeta } from "@/components/admin/page-meta"

export default function Head() {
  const pathname = "/admin/guiders"
  const meta = getAdminPageMeta(pathname)

  return (
    <>
      <title>{getAdminDocumentTitle(pathname)}</title>
      <meta name="description" content={meta.description} />
    </>
  )
}
