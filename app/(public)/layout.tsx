import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "../globals.css";

import { ThemeProvider } from "@/components/theme-provider";
import Navbar from "@/components/navbar";

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
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${poppins.variable} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Navbar/>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
