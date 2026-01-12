import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { session_id } = await req.json()

    if (!session_id) {
      return NextResponse.json(
        { message: 'Missing session_id' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('qr_sessions')
      .select('id, guider_id, status')
      .eq('id', session_id)
      .eq('status', 'Active')
      .single()

    if (error || !data) {
      return NextResponse.json(
        { message: 'QR tidak aktif atau telah tamat' },
        { status: 400 }
      )
    }

    return NextResponse.json({ data })
  } catch (err) {
    console.error('❌ QR RESOLVE ERROR:', err)
    return NextResponse.json(
      { message: 'Server error' },
      { status: 500 }
    )
  }
}
