import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const { name, ic, phone, emergency_contact } = body

    // simple validation (optional tapi cantik)
    if (!name || !ic || !phone || !emergency_contact) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('hikers')
      .insert([
        {
          name,
          ic,
          phone,
          emergency_contact,
        }
      ])
      .select() // supaya return id

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { message: 'Registration successful', data },
      { status: 200 }
    )
  } catch (err) {
    console.error(err)

    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    )
  }
}
