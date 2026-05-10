import { supabase } from "@/lib/supabase"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const {
      name,
      ic,
      phone,
      emergency_contact,
      session_id,
      age,
      address,
      medical_condition,
      medical_condition_other,
      emergency_name,
      emergency_phone,
      emergency_relationship,
    } = body

    const missingFields: string[] = []

    if (!name) missingFields.push("name")
    if (!ic) missingFields.push("ic")
    if (!phone) missingFields.push("phone")
    if (!session_id) missingFields.push("session_id")
    if (!age) missingFields.push("age")
    if (!address) missingFields.push("address")
    if (!medical_condition) missingFields.push("medical_condition")
    if (!emergency_name) missingFields.push("emergency_name")
    if (!emergency_phone) missingFields.push("emergency_phone")
    if (!emergency_relationship) missingFields.push("emergency_relationship")

    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: "Missing required fields", missing: missingFields },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from("hikers")
      .insert([
        {
          name,
          ic,
          phone,
          emergency_contact: emergency_contact ?? emergency_phone,
          age: Number(age),
          address,
          medical_condition,
          medical_condition_other:
            medical_condition === "Lain-lain"
              ? medical_condition_other ?? null
              : null,
          emergency_name,
          emergency_phone,
          emergency_relationship,
        },
      ])
      .select()

    if (error || !data?.[0]) {
      return NextResponse.json(
        { error: error?.message || "Gagal daftar hiker" },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        message: "Registration successful",
        data,
      },
      { status: 200 }
    )
  } catch (err) {
    console.error(err)

    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}