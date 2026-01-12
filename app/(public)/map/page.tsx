'use client'

import dynamic from 'next/dynamic'

const LedangMap = dynamic(
  () => import('./MapViewClient'),
  { ssr: false }
)

export default function MapPage() {
  return <LedangMap />
}
