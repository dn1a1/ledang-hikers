"use client"

import { useEffect, useRef, useState } from "react"
import { supabase } from "@/lib/supabase"
import {
  User,
  UserPlus,
  Shield,
  Camera,
  Search,
  Filter,
  Users,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Phone,
  FileText,
  AlertCircle,
  BadgeCheck,
} from "lucide-react"
import Image from "next/image"

/* =======================
   TYPES
======================= */
type Hiker = {
  id: number
  name: string
  ic: string
  phone: string
  emergency_contact: string
}

type Guider = {
  id: number
  user_id: number
  name: string
  phone: string
  age: number
  experience: string
  photo_url: string | null
  mgp_number: string | null // 👈 tambah
}

/* =======================
   MAIN PAGE
======================= */
export default function ParticipantManagementPage() {
  const [activeRole, setActiveRole] = useState<"hiker" | "guider">("hiker")

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Participant Management
            </h1>
            <p className="text-gray-600 mt-1">
              Gunung Ledang National Park • Manage Hikers & Guiders
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="px-4 py-2 bg-gradient-to-r from-emerald-50 to-cyan-50 border border-emerald-200 rounded-lg">
              <span className="text-sm font-medium text-emerald-800">
                Switch Role View
              </span>
            </div>
          </div>
        </div>

        {/* ROLE SWITCHER */}
        <div className="flex gap-3">
          <button
            onClick={() => setActiveRole("hiker")}
            className={`px-6 py-3 rounded-xl font-medium transition-all ${
              activeRole === "hiker"
                ? "bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-lg shadow-emerald-100"
                : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Hikers
            </div>
          </button>

          <button
            onClick={() => setActiveRole("guider")}
            className={`px-6 py-3 rounded-xl font-medium transition-all ${
              activeRole === "guider"
                ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-100"
                : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Guiders
            </div>
          </button>
        </div>

        {/* DYNAMIC CONTENT */}
        {activeRole === "hiker" ? <HikerSection /> : <GuiderSection />}
      </div>
    </div>
  )
}

/* =========================================================
   HIKER SECTION
========================================================= */
function HikerSection() {
  const [hikers, setHikers] = useState<Hiker[]>([])
  const [filteredHikers, setFilteredHikers] = useState<Hiker[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(8)

  const [name, setName] = useState("")
  const [ic, setIc] = useState("")
  const [phone, setPhone] = useState("")
  const [emergency, setEmergency] = useState("")
  const [editingId, setEditingId] = useState<number | null>(null)

  const fetchHikers = async () => {
    const { data } = await supabase.from("hikers").select("*")
    setHikers(data || [])
    setFilteredHikers(data || [])
  }

  useEffect(() => { fetchHikers() }, [])

  useEffect(() => {
    if (!searchTerm) {
      setFilteredHikers(hikers)
    } else {
      const term = searchTerm.toLowerCase()
      setFilteredHikers(hikers.filter(h =>
        h.name.toLowerCase().includes(term) ||
        h.ic.includes(term) ||
        h.phone.includes(term)
      ))
    }
    setCurrentPage(1)
  }, [searchTerm, hikers])

  const totalPages = Math.ceil(filteredHikers.length / itemsPerPage)
  const currentHikers = filteredHikers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const submitHiker = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (editingId) {
      await supabase.from("hikers").update({ name, ic, phone, emergency_contact: emergency }).eq("id", editingId)
    } else {
      await supabase.from("hikers").insert({ name, ic, phone, emergency_contact: emergency })
    }
    setEditingId(null)
    setName(""); setIc(""); setPhone(""); setEmergency("")
    fetchHikers()
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              {editingId ? <><Edit className="w-5 h-5 text-amber-600" />Edit Hiker</> : <><UserPlus className="w-5 h-5 text-emerald-600" />Add New Hiker</>}
            </h2>
            {editingId && (
              <button onClick={() => { setEditingId(null); setName(""); setIc(""); setPhone(""); setEmergency("") }} className="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
            )}
          </div>

          <form onSubmit={submitHiker} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
              <input type="text" placeholder="Enter hiker's full name" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition text-black" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">IC Number</label>
              <input type="text" placeholder="e.g., 900101-01-1234" value={ic} onChange={(e) => setIc(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition text-black" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
              <input type="tel" placeholder="e.g., 012-3456789" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition text-black" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">Emergency Contact <AlertCircle className="w-4 h-4 text-amber-600" /></label>
              <input type="text" placeholder="Name & contact number" value={emergency} onChange={(e) => setEmergency(e.target.value)} className="w-full px-4 py-2.5 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition text-black" required />
            </div>
            <button type="submit" className={`w-full py-3 rounded-lg font-medium text-white transition ${editingId ? "bg-amber-600 hover:bg-amber-700" : "bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700"}`}>
              {editingId ? "Update Hiker" : "Add Hiker"}
            </button>
          </form>
        </div>

        <div className="mt-6 bg-gradient-to-r from-emerald-50 to-cyan-50 border border-emerald-100 rounded-xl p-6">
          <h3 className="font-medium text-emerald-800 mb-4 flex items-center gap-2"><Users className="w-5 h-5" />Hiker Statistics</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-white rounded-lg shadow-sm">
              <div className="text-2xl font-bold text-emerald-700">{hikers.length}</div>
              <div className="text-xs text-gray-600 mt-1">Total Hikers</div>
            </div>
            <div className="text-center p-3 bg-white rounded-lg shadow-sm">
              <div className="text-2xl font-bold text-blue-600">{filteredHikers.length}</div>
              <div className="text-xs text-gray-600 mt-1">Filtered</div>
            </div>
          </div>
        </div>
      </div>

      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h3 className="font-medium text-gray-900 flex items-center gap-2"><Filter className="w-5 h-5" />Filter Hikers</h3>
            <div className="text-sm text-gray-600">Showing {currentHikers.length} of {filteredHikers.length} hikers</div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input type="text" placeholder="Search by name, IC, or phone..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-medium text-gray-900">Hiker Records</h3>
                <p className="text-sm text-gray-600 mt-1">Manage hiker information and emergency contacts</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"><ChevronLeft className="w-4 h-4" /></button>
                <span className="px-3 py-1.5 text-sm text-gray-700">Page {currentPage} of {totalPages}</span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hiker Details</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact Information</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {currentHikers.map((hiker) => (
                  <tr key={hiker.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{hiker.name}</div>
                      <div className="text-sm text-gray-500 mt-1 flex items-center gap-2"><FileText className="w-4 h-4" />{hiker.ic}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-gray-900"><Phone className="w-4 h-4" />{hiker.phone}</div>
                        <div className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded"><AlertCircle className="w-3 h-3 inline mr-1" />{hiker.emergency_contact}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => { setEditingId(hiker.id); setName(hiker.name); setIc(hiker.ic); setPhone(hiker.phone); setEmergency(hiker.emergency_contact) }} className="px-3 py-1.5 text-sm bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg transition flex items-center gap-1"><Edit className="w-4 h-4" />Edit</button>
                        <button onClick={() => supabase.from("hikers").delete().eq("id", hiker.id).then(fetchHikers)} className="px-3 py-1.5 text-sm bg-red-50 text-red-700 hover:bg-red-100 rounded-lg transition flex items-center gap-1"><Trash2 className="w-4 h-4" />Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {currentHikers.length === 0 && (
              <div className="p-12 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-full mb-4"><Users className="w-6 h-6 text-gray-400" /></div>
                <h3 className="font-medium text-gray-900 mb-2">No hikers found</h3>
                <p className="text-gray-600 max-w-sm mx-auto">{searchTerm ? "Try adjusting your search term" : "Add your first hiker using the form"}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* =========================================================
   GUIDER SECTION
========================================================= */
function GuiderSection() {
  const [guiders, setGuiders] = useState<Guider[]>([])
  const [filteredGuiders, setFilteredGuiders] = useState<Guider[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(8)

  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [age, setAge] = useState("")
  const [experience, setExperience] = useState("")
  const [mgpNumber, setMgpNumber] = useState("")
  const [photo, setPhoto] = useState<File | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const photoInputRef = useRef<HTMLInputElement | null>(null)

  const fetchGuiders = async () => {
    const { data, error } = await supabase.from("guiders").select("*")
    if (error) {
      console.error("FETCH GUIDERS ERROR:", error)
      return
    }
    setGuiders(data || [])
    setFilteredGuiders(data || [])
  }

  useEffect(() => {
    fetchGuiders()
  }, [])

  useEffect(() => {
    if (!searchTerm) {
      setFilteredGuiders(guiders)
    } else {
      const term = searchTerm.toLowerCase()
      setFilteredGuiders(
        guiders.filter(
          (g) =>
            g.name.toLowerCase().includes(term) ||
            g.phone.includes(term) ||
            g.experience.toLowerCase().includes(term) ||
            (g.mgp_number && g.mgp_number.toLowerCase().includes(term))
        )
      )
    }
    setCurrentPage(1)
  }, [searchTerm, guiders])

  const totalPages = Math.ceil(filteredGuiders.length / itemsPerPage)
  const currentGuiders = filteredGuiders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const resetForm = () => {
    setEditingId(null)
    setUsername("")
    setPassword("")
    setName("")
    setPhone("")
    setAge("")
    setExperience("")
    setMgpNumber("")
    setPhoto(null)
    if (photoInputRef.current) {
      photoInputRef.current.value = ""
    }
  }

  const submitGuider = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const selectedPhoto = form.elements.namedItem("photo") as HTMLInputElement | null
    const newPhoto = selectedPhoto?.files?.[0] || photo

    console.log("SUBMIT GUIDER TRIGGERED")
    console.log("EDITING ID:", editingId)

    if (editingId) {
      const updateData: Partial<Guider> = {
        name,
        phone,
        age: Number(age),
        experience,
        mgp_number: mgpNumber,
      }

      if (newPhoto) {
        const fileExt = newPhoto.name.split(".").pop() || "jpg"
        const filePath = `guider-${editingId}-${Date.now()}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from("guiders-photo")
          .upload(filePath, newPhoto, {
            upsert: true,
            contentType: newPhoto.type,
          })

        if (uploadError) {
          console.error("UPLOAD ERROR:", uploadError)
          alert("Upload image failed. Try update without changing photo first.")
          return
        }

        const { data } = supabase.storage
          .from("guiders-photo")
          .getPublicUrl(filePath)

        console.log("NEW GUIDER PHOTO PUBLIC URL:", data.publicUrl)
        updateData.photo_url = data.publicUrl
      }

      const { error } = await supabase
        .from("guiders")
        .update(updateData)
        .eq("id", editingId)

      if (error) {
        console.error("UPDATE GUIDER ERROR:", error)
        alert("Update guider failed")
        return
      }

      alert("Guider updated successfully")
      resetForm()
      fetchGuiders()
      return
    }

    const { data: user, error: userErr } = await supabase
      .from("users")
      .insert({ username, password, role: "guider" })
      .select()
      .single()

    if (userErr || !user) {
      console.error("CREATE USER ERROR:", userErr)
      alert("Create user failed")
      return
    }

    let photoUrl: string | null = null

    if (photo) {
      const fileExt = photo.name.split(".").pop()
      const filePath = `guider-${user.id}-${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from("guiders-photo")
        .upload(filePath, photo, {
          upsert: true,
          contentType: photo.type,
        })

      if (uploadError) {
        console.error("UPLOAD ERROR:", uploadError)
        alert("Upload image failed")
        return
      }

      const { data } = supabase.storage
        .from("guiders-photo")
        .getPublicUrl(filePath)

      photoUrl = data.publicUrl
    }

    const { error: guiderErr } = await supabase.from("guiders").insert({
      user_id: user.id,
      name,
      phone,
      age: Number(age),
      experience,
      mgp_number: mgpNumber,
      photo_url: photoUrl,
    })

    if (guiderErr) {
      console.error("CREATE GUIDER ERROR:", guiderErr)
      alert("Create guider failed")
      return
    }

    alert("Guider created successfully")
    resetForm()
    fetchGuiders()
  }

  const deleteGuider = async (id: number) => {
    const confirmDelete = confirm("Are you sure you want to delete this guider?")
    if (!confirmDelete) return

    const { error } = await supabase.from("guiders").delete().eq("id", id)

    if (error) {
      console.error("DELETE GUIDER ERROR:", error)
      alert("Delete guider failed")
      return
    }

    fetchGuiders()
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              {editingId ? (
                <>
                  <Edit className="w-5 h-5 text-amber-600" />
                  Edit Guider
                </>
              ) : (
                <>
                  <Shield className="w-5 h-5 text-blue-600" />
                  Register New Guider
                </>
              )}
            </h2>

            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            )}
          </div>

          <form onSubmit={submitGuider} className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                Login Credentials
              </h4>

              <input
                type="text"
                placeholder={editingId ? "Username cannot be edited here" : "Username"}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={!!editingId}
                required={!editingId}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-black mb-3 disabled:bg-gray-100"
              />

              <input
                type="password"
                placeholder={editingId ? "Password cannot be edited here" : "Password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={!!editingId}
                required={!editingId}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-black disabled:bg-gray-100"
              />
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                Personal Information
              </h4>

              <input
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-black mb-3"
                required
              />

              <input
                placeholder="Phone Number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-black mb-3"
                required
              />

              <input
                placeholder="Age"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-black mb-3"
                required
              />

              <input
                placeholder="Experience (years)"
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-black mb-3"
                required
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <BadgeCheck className="w-4 h-4 text-emerald-600" />
                  MGP Number
                </label>

                <input
                  placeholder="e.g., MGP-2024-001"
                  value={mgpNumber}
                  onChange={(e) => setMgpNumber(e.target.value)}
                  className="w-full px-4 py-2.5 border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition text-black"
                  required
                />
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Camera className="w-4 h-4" />
                Profile Photo
              </label>

              <input
                type="file"
                name="photo"
                ref={photoInputRef}
                accept="image/*"
                onChange={(e) => setPhoto(e.target.files?.[0] || null)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />

              {editingId && (
                <p className="text-xs text-gray-500 mt-2">
                  Leave empty if you do not want to change the photo.
                </p>
              )}
            </div>

            <button
              type="submit"
              className={`w-full py-3 rounded-lg font-medium text-white transition ${
                editingId
                  ? "bg-amber-600 hover:bg-amber-700"
                  : "bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
              }`}
            >
              {editingId ? "Update Guider" : "Create Guider Account"}
            </button>
          </form>
        </div>

        <div className="mt-6 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-100 rounded-xl p-6">
          <h3 className="font-medium text-blue-800 mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Guider Statistics
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-white rounded-lg shadow-sm">
              <div className="text-2xl font-bold text-blue-700">
                {guiders.length}
              </div>
              <div className="text-xs text-gray-600 mt-1">Total Guiders</div>
            </div>

            <div className="text-center p-3 bg-white rounded-lg shadow-sm">
              <div className="text-2xl font-bold text-amber-600">
                {Math.round(
                  guiders.reduce((sum, g) => sum + (g.age || 0), 0) /
                    (guiders.length || 1)
                )}
              </div>
              <div className="text-xs text-gray-600 mt-1">Avg. Age</div>
            </div>
          </div>
        </div>
      </div>

      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h3 className="font-medium text-gray-900 flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filter Guiders
            </h3>

            <div className="text-sm text-gray-600">
              Showing {currentGuiders.length} of {filteredGuiders.length} guiders
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />

            <input
              type="text"
              placeholder="Search by name, phone, experience, or MGP..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-medium text-gray-900">Guider Directory</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Professional mountain guides with experience
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="px-3 py-1.5 text-sm text-gray-700">
                  Page {currentPage} of {totalPages || 1}
                </span>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Guider Profile
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact & Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Experience
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    MGP Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {currentGuiders.map((guider) => (
                  <tr key={guider.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          {guider.photo_url ? (
                          <Image
                              src={guider.photo_url}
                              alt={guider.name}
                              width={48}
                              height={48}
                              unoptimized
                              className="rounded-full object-cover border-2 border-blue-100"
                              />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center border-2 border-blue-200">
                              <User className="w-6 h-6 text-blue-600" />
                            </div>
                          )}

                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-600 rounded-full border-2 border-white flex items-center justify-center">
                            <Shield className="w-3 h-3 text-white" />
                          </div>
                        </div>

                        <div>
                          <div className="font-medium text-gray-900">
                            {guider.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            Age: {guider.age}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-gray-900">
                          <Phone className="w-4 h-4" />
                          {guider.phone}
                        </div>
                        <div className="text-xs text-gray-500">
                          ID: {guider.user_id}
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                        {guider.experience}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      {guider.mgp_number ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-emerald-100 text-emerald-800">
                          <BadgeCheck className="w-3.5 h-3.5" />
                          {guider.mgp_number}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400 italic">
                          Not assigned
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(guider.id)
                            setUsername("")
                            setPassword("")
                            setName(guider.name)
                            setPhone(guider.phone)
                            setAge(String(guider.age))
                            setExperience(guider.experience)
                            setMgpNumber(guider.mgp_number || "")
                            setPhoto(null)
                            if (photoInputRef.current) {
                              photoInputRef.current.value = ""
                            }
                            window.scrollTo({ top: 0, behavior: "smooth" })
                          }}
                          className="px-3 py-1.5 text-sm bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg transition flex items-center gap-1"
                        >
                          <Edit className="w-4 h-4" />
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => deleteGuider(guider.id)}
                          className="px-3 py-1.5 text-sm bg-red-50 text-red-700 hover:bg-red-100 rounded-lg transition flex items-center gap-1"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {currentGuiders.length === 0 && (
              <div className="p-12 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-full mb-4">
                  <Shield className="w-6 h-6 text-gray-400" />
                </div>

                <h3 className="font-medium text-gray-900 mb-2">
                  No guiders found
                </h3>

                <p className="text-gray-600 max-w-sm mx-auto">
                  {searchTerm
                    ? "Try adjusting your search term"
                    : "Register your first guider"}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
