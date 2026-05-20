import { supabase } from "@/lib/supabase"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    console.log("REGISTER BODY:", body)

    const {
      name,
      ic,
      phone,
      email,
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

    console.log("EMAIL RECEIVED:", email)

    const normalizedEmail = String(email ?? "").trim().toLowerCase()
    console.log("NORMALIZED EMAIL:", normalizedEmail)

    const missingFields: string[] = []

    if (!name) missingFields.push("name")
    if (!ic) missingFields.push("ic")
    if (!phone) missingFields.push("phone")
    if (!normalizedEmail) missingFields.push("email")
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

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    if (!emailPattern.test(normalizedEmail)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      )
    }

    const { data: hiker, error: hikerError } = await supabase
      .from("hikers")
      .insert({
        name,
        ic,
        phone,
        email: normalizedEmail,
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
      })
      .select("id, name, email")
      .single()

    if (hikerError || !hiker) {
      console.error("HIKER INSERT ERROR:", hikerError)
      return NextResponse.json(
        { error: hikerError?.message || "Gagal daftar hiker" },
        { status: 400 }
      )
    }

    console.log("INSERTED HIKER:", hiker)

    const { error: declarationError } = await supabase
      .from("declarations")
      .insert({
        hiker_id: hiker.id,
        session_id,
      })

    if (declarationError) {
      console.error("DECLARATION INSERT ERROR:", declarationError)

      await supabase.from("hikers").delete().eq("id", hiker.id)

      return NextResponse.json(
        { error: declarationError.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        message: "Registration successful",
        data: [hiker],
      },
      { status: 200 }
    )
  } catch (err) {
    console.error("API DAFTAR ERROR:", err)

    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
