import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { Toaster } from 'sonner'

import { ThemeProvider } from "@/components/theme-provider";

// =====================
// Font setup
// =====================
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
});

// =====================
// Metadata
// =====================
export const metadata: Metadata = {
  title: "Ledang Hikers",
  description: "Hiker tracking and monitoring system",
};

// =====================
// Root Layout
// =====================
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${poppins.variable} antialiased`}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <Toaster richColors />
        {children}
      </ThemeProvider>
    </div>
  );
}