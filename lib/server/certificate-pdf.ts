import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { PDFDocument, StandardFonts, rgb } from "pdf-lib"

export type CertificateHiker = {
  id: string | number
  name: string | null
  ic: string | null
  email: string
  created_at: string | null
}

export type CertificateDetails = {
  name: string
  ic: string
  email: string
  route: string
  hikingDate: string
  serialNumber: string
}

export class CertificateTemplateMissingError extends Error {
  constructor(templatePath: string) {
    super(`Certificate template image not found: ${templatePath}`)
    this.name = "CertificateTemplateMissingError"
  }
}

const TEMPLATE_PATH = path.join(process.cwd(), "public", "certificates", "ledang-template.png")
const CERTIFICATE_ROUTE = "Gunung Ledang Trail"

function formatHikingDate(value: string) {
  const parsedDate = new Date(value)

  if (Number.isNaN(parsedDate.getTime())) {
    return value
  }

  return parsedDate.toLocaleDateString("en-MY", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

function sanitizeSerialPart(value: string | number) {
  return String(value).replace(/[^a-zA-Z0-9]/g, "").toUpperCase()
}

export function buildCertificateDetails(hiker: CertificateHiker): CertificateDetails {
  const name = hiker.name?.trim() || "Unnamed Hiker"
  const ic = hiker.ic?.trim() || "-"
  const email = hiker.email.trim().toLowerCase()
  const hikingDate = hiker.created_at ? formatHikingDate(hiker.created_at) : "Date unavailable"
  const year = new Date().getFullYear()
  const serialNumber = `TG-LDG-${year}-${sanitizeSerialPart(hiker.id).padStart(6, "0")}`

  return {
    name,
    ic,
    email,
    route: CERTIFICATE_ROUTE,
    hikingDate,
    serialNumber,
  }
}

function drawCenteredText(
  page: import("pdf-lib").PDFPage,
  text: string,
  y: number,
  size: number,
  font: import("pdf-lib").PDFFont,
  color = rgb(0.12, 0.2, 0.16)
) {
  const { width } = page.getSize()
  const textWidth = font.widthOfTextAtSize(text, size)
  page.drawText(text, {
    x: Math.max(40, (width - textWidth) / 2),
    y,
    size,
    font,
    color,
  })
}

export async function generateCertificatePdf(hiker: CertificateHiker) {
  if (!existsSync(TEMPLATE_PATH)) {
    throw new CertificateTemplateMissingError(TEMPLATE_PATH)
  }

  const details = buildCertificateDetails(hiker)
  const templateBytes = readFileSync(TEMPLATE_PATH)
  const pdfDoc = await PDFDocument.create()
  const templateImage = await pdfDoc.embedPng(templateBytes)
  const page = pdfDoc.addPage([templateImage.width, templateImage.height])
  const { width, height } = page.getSize()
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  page.drawImage(templateImage, {
    x: 0,
    y: 0,
    width,
    height,
  })

 drawCenteredText(page, details.name, height * 0.48, 38, boldFont)

drawCenteredText(
  page,
  `${details.ic}`,
  height * 0.445,
  17,
  regularFont,
  rgb(0.18, 0.27, 0.22)
)

drawCenteredText(
  page,
  `${details.route}`,
  height * 0.333,
  17,
  regularFont,
  rgb(0.18, 0.27, 0.22)
)

drawCenteredText(
  page,
   `${details.hikingDate}`,
  height * 0.273,
  17,
  regularFont,
  rgb(0.18, 0.27, 0.22)
)



  const pdfBytes = await pdfDoc.save()

  return {
    pdfBuffer: Buffer.from(pdfBytes),
    details,
  }
}
