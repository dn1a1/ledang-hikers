import type { Metadata } from "next";
import { Poppins } from "next/font/google";

import { ThemeProvider } from "@/components/theme-provider";
// 👆 buang baris import Navbar

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "Ledang Hikers",
  description: "Hiker tracking and monitoring system",
};

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
          {/* 👆 buang <Navbar/> dari sini */}
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}