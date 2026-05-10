import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

function normalizeBatteryLevel(value: unknown) {
  const numericValue =
    typeof value === 'number'
      ? value
      : (typeof value === 'string' ? Number(value) : NaN)
  if (!Number.isFinite(numericValue)) return null

  const percent = numericValue >= 0 && numericValue <= 1 ? numericValue * 100 : numericValue
  return Math.max(0, Math.min(100, Math.round(percent)))
}

export async function POST(req: Request) {
  try {
    const {
      hiker_id,
      latitude,
      longitude,
      battery_level,
      battery_status,
    } = await req.json()

    if (!hiker_id || latitude === null || latitude === undefined || longitude === null || longitude === undefined) {
      return NextResponse.json(
        { error: 'Missing fields' },
        { status: 400 }
      )
    }

    const batteryLevel = normalizeBatteryLevel(battery_level)
    const locationPayload = {
      hiker_id,
      latitude,
      longitude,
      battery_level: batteryLevel,
      battery_status:
        batteryLevel !== null
          ? (batteryLevel <= 20 ? 'LOW' : 'NORMAL')
          : (battery_status === 'LOW' || battery_status === 'NORMAL' ? battery_status : null),
      updated_at: new Date().toISOString(),
    }

    console.log('📍 location payload', locationPayload)
    console.log('🔋 battery level', batteryLevel)

    const { data, error } = await supabase
      .from('lokasi_pendaki')
      .upsert(locationPayload, { onConflict: 'hiker_id' })
      .select()

    if (error) {
      console.error('❌ Supabase/API update error', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    console.log('✅ Supabase/API update success')

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (err) {
    console.error('❌ API ERROR:', err)
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    )
  }
}
