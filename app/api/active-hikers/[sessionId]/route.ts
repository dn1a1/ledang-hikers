import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET(
  req: Request,
  context: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await context.params

  if (!sessionId) {
    return NextResponse.json(
      { error: 'Missing sessionId' },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('declarations')
    .select('hiker_id, hikers(name)')
    .eq('session_id', sessionId)

  if (error) {
    console.error('❌ ACTIVE HIKERS ERROR:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ data })
}
