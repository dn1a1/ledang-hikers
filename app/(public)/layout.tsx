import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ledang Hikers",
  description: "Hiker tracking and monitoring system",
};

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
