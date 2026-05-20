import nodemailer from "nodemailer"

type CertificateEmailPayload = {
  to: string
  hikerName: string
  pdfBuffer: Buffer
  serialNumber: string
}

function getRequiredEnv(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing environment variable: ${name}`)
  return value
}

export function createEmailTransporter() {
  const port = Number(getRequiredEnv("SMTP_PORT"))

  if (!Number.isFinite(port)) {
    throw new Error("SMTP_PORT must be a valid number")
  }

  return nodemailer.createTransport({
    host: getRequiredEnv("SMTP_HOST"),
    port,
    secure: port === 465,
    auth: {
      user: getRequiredEnv("SMTP_USER"),
      pass: getRequiredEnv("SMTP_PASS"),
    },
  })
}

export async function sendCertificateEmail({
  to,
  hikerName,
  pdfBuffer,
  serialNumber,
}: CertificateEmailPayload) {
  const transporter = createEmailTransporter()

  await transporter.sendMail({
    from: getRequiredEnv("SMTP_FROM"),
    to,
    subject: "Your TrailGuard Ledang Digital Certificate",
    text: [
      `Hi ${hikerName},`,
      "",
      "Congratulations on completing your Gunung Ledang hike.",
      "Your digital certificate is attached as a PDF.",
      "",
      `Certificate serial number: ${serialNumber}`,
    ].join("\n"),
    attachments: [
      {
        filename: `trailguard-ledang-certificate-${serialNumber}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  })
}
