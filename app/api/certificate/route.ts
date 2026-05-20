import { NextResponse } from "next/server"
import { CertificateTemplateMissingError, generateCertificatePdf } from "@/lib/server/certificate-pdf"
import { sendCertificateEmail } from "@/lib/server/email"
import { createSupabaseAdminClient } from "@/lib/server/supabase-admin"

export const runtime = "nodejs"

type HikerRecord = {
  id: string | number
  name: string | null
  ic: string | null
  email: string
  created_at: string | null
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function normalizeEmail(email: unknown) {
  return typeof email === "string" ? email.trim().toLowerCase() : ""
}

function getHikerName(hiker: HikerRecord) {
  return hiker.name?.trim() || "Hiker"
}

function serverError(message: string, status = 500) {
  return NextResponse.json({ success: false, error: message }, { status })
}

export async function POST(req: Request) {
  let email = ""

  try {
    const body = await req.json()
    email = normalizeEmail(body?.email)
  } catch {
    return serverError("Invalid JSON request body", 400)
  }

  if (!EMAIL_PATTERN.test(email)) {
    return serverError("Invalid email format", 400)
  }

  try {
    const supabase = createSupabaseAdminClient()
        const { data: hikers, error } = await supabase
        .from("hikers")
        .select("id, name, ic, email, created_at")
        .eq("email", email)
        .order("created_at", { ascending: false })
        .limit(1)

      if (error) {
        console.error("Certificate hiker lookup failed:", error)
        return serverError("Failed to look up hiker", 500)
      }

      const hiker = hikers?.[0] as HikerRecord | undefined

    if (!hiker) {
      return serverError("Hiker not found", 404)
    }

    let certificate: Awaited<ReturnType<typeof generateCertificatePdf>>

    try {
      certificate = await generateCertificatePdf(hiker)
    } catch (error) {
      if (error instanceof CertificateTemplateMissingError) {
        console.error(error.message)
        return serverError("Certificate template image is missing", 500)
      }

      console.error("Certificate PDF generation failure:", error)
      return serverError("Failed to generate certificate PDF", 500)
    }

    try {
      await sendCertificateEmail({
        to: email,
        hikerName: getHikerName(hiker),
        pdfBuffer: certificate.pdfBuffer,
        serialNumber: certificate.details.serialNumber,
      })
    } catch (error) {
      console.error("Certificate SMTP failure:", error)
      return serverError("Failed to send certificate email", 502)
    }

    return NextResponse.json({
      success: true,
      message: "Certificate generated and emailed successfully",
      certificate: {
        serial_number: certificate.details.serialNumber,
        email,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"

    if (message.includes("Supabase admin environment")) {
      console.error(message)
      return serverError("Backend Supabase configuration is incomplete", 500)
    }

    console.error("Certificate API failure:", error)
    return serverError("Certificate generation failed", 500)
  }
}
