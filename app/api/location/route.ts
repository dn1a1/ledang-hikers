import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { hiker_id, latitude, longitude } = await req.json()

    if (!hiker_id || !latitude || !longitude) {
      return NextResponse.json(
        { error: 'Missing fields' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('lokasi_pendaki')
      .upsert(
        {
          hiker_id,
          latitude,
          longitude,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'hiker_id' }
      )
      .select()

    if (error) {
      console.error('❌ SUPABASE ERROR:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

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
