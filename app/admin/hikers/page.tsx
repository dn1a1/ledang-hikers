"use client"

import { useEffect, useRef, useState } from "react"
import { supabase } from "@/lib/supabase"
import {
  AlertCircle,
  BadgeCheck,
  Camera,
  ChevronLeft,
  ChevronRight,
  Edit,
  Eye,
  FileText,
  LoaderCircle,
  Mail,
  Phone,
  Search,
  Shield,
  Trash2,
  User,
  UserPlus,
  Users,
} from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type Hiker = {
  id: number
  name: string
  ic: string
  phone: string
  email: string
  emergency_contact: string
  age?: number | null
  address?: string | null
  medical_condition?: string | null
  medical_condition_other?: string | null
  emergency_name?: string | null
  emergency_phone?: string | null
  emergency_relationship?: string | null
}

type DeclarationItem = {
  id?: number
  item_type?: string | null
  entry_quantity?: number | string | null
  quantity?: number | string | null
  type?: string | null
}

type DeclarationData = {
  id?: number
  hiker_id?: number | string
  hikers?: Hiker | Hiker[] | null
  declaration_items?: DeclarationItem[] | null
}

type Guider = {
  id: number
  user_id: number
  name: string
  phone: string
  age: number
  experience: string
  photo_url: string | null
  mgp_number: string | null
}

const ITEMS_PER_PAGE = 8

export default function ParticipantManagementPage() {
  const [activeRole, setActiveRole] = useState<"hiker" | "guider">("hiker")

  return (
    <div className="app-shell min-h-screen p-4 md:p-6">
      <div className="mx-auto max-w-screen-xl space-y-6">
        <section className="panel-surface">
          <div className="panel-header">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                {activeRole === "hiker" ? <Users className="h-6 w-6" /> : <Shield className="h-6 w-6" />}
              </div>
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge variant="outline">Gunung Ledang</Badge>
                  <Badge className="bg-primary/10 text-primary hover:bg-primary/10">Admin Directory</Badge>
                </div>
                <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Participant Management</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Manage hikers and guiders using the shared admin theme and responsive data tools.
                </p>
              </div>
            </div>

            <div className="flex w-full max-w-sm gap-2 rounded-2xl border border-border bg-muted/50 p-1">
              <RoleSwitchButton
                active={activeRole === "hiker"}
                icon={<Users className="h-4 w-4" />}
                label="Hikers"
                onClick={() => setActiveRole("hiker")}
              />
              <RoleSwitchButton
                active={activeRole === "guider"}
                icon={<Shield className="h-4 w-4" />}
                label="Guiders"
                onClick={() => setActiveRole("guider")}
              />
            </div>
          </div>
        </section>

        {activeRole === "hiker" ? <HikerSection /> : <GuiderSection />}
      </div>
    </div>
  )
}

function SectionMetric({
  label,
  value,
  tone,
}: {
  label: string
  value: string | number
  tone: string
}) {
  return (
    <div className="metric-card">
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${tone}`}>{value}</p>
    </div>
  )
}

function RoleSwitchButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean
  icon: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <Button
      onClick={onClick}
      variant={active ? "secondary" : "ghost"}
      className={`flex-1 ${active ? "text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
    >
      <span className="flex items-center justify-center gap-2">
        {icon}
        {label}
      </span>
    </Button>
  )
}

function SectionPager({
  currentPage,
  totalPages,
  onPrev,
  onNext,
}: {
  currentPage: number
  totalPages: number
  onPrev: () => void
  onNext: () => void
}) {
  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={onPrev} disabled={currentPage === 1}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="min-w-28 text-center text-sm text-muted-foreground">
        Page {totalPages === 0 ? 0 : currentPage} of {totalPages || 0}
      </span>
      <Button variant="outline" size="sm" onClick={onNext} disabled={currentPage >= totalPages}>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}

function HikerSection() {
  const [hikers, setHikers] = useState<Hiker[]>([])
  const [filteredHikers, setFilteredHikers] = useState<Hiker[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedHikerId, setSelectedHikerId] = useState<string | null>(null)
  const [isDeclarationOpen, setIsDeclarationOpen] = useState(false)
  const [declarationData, setDeclarationData] = useState<DeclarationData | null>(null)
  const [loadingDeclaration, setLoadingDeclaration] = useState(false)

  const [name, setName] = useState("")
  const [ic, setIc] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [emergency, setEmergency] = useState("")
  const [editingId, setEditingId] = useState<number | null>(null)

  const fetchHikers = async () => {
    const { data, error } = await supabase.from("hikers").select("*").order("created_at", { ascending: false })
    if (error) {
      console.error("FETCH HIKERS ERROR:", error)
      return
    }

    setHikers(data || [])
    setFilteredHikers(data || [])
  }

  useEffect(() => {
    fetchHikers()
  }, [])

  useEffect(() => {
    if (!searchTerm) {
      setFilteredHikers(hikers)
    } else {
      const term = searchTerm.toLowerCase()
      setFilteredHikers(
        hikers.filter((hiker) =>
          hiker.name.toLowerCase().includes(term) ||
          hiker.ic.includes(term) ||
          hiker.phone.includes(term) ||
          (hiker.email || "").toLowerCase().includes(term)
        )
      )
    }
    setCurrentPage(1)
  }, [searchTerm, hikers])

  const totalPages = Math.ceil(filteredHikers.length / ITEMS_PER_PAGE)
  const currentHikers = filteredHikers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  const resetForm = () => {
    setEditingId(null)
    setName("")
    setIc("")
    setPhone("")
    setEmail("")
    setEmergency("")
  }

  const handleViewDeclaration = async (hikerId: string | number) => {
    setSelectedHikerId(String(hikerId))
    setIsDeclarationOpen(true)
    setLoadingDeclaration(true)
    setDeclarationData(null)

    const { data, error } = await supabase
      .from("declarations")
      .select(`
        *,
        hikers (*),
        declaration_items (*)
      `)
      .eq("hiker_id", hikerId)
      .single()

    if (!error) {
      setDeclarationData(data)
    } else if (error.code !== "PGRST116") {
      console.error("FETCH DECLARATION ERROR:", error)
    }

    setLoadingDeclaration(false)
  }

  const handleDeclarationOpenChange = (open: boolean) => {
    setIsDeclarationOpen(open)
    if (!open) {
      setSelectedHikerId(null)
      setDeclarationData(null)
      setLoadingDeclaration(false)
    }
  }

  const declarationRecord = declarationData?.hikers
  const declarationHiker = Array.isArray(declarationRecord) ? declarationRecord[0] : declarationRecord
  const declarationItems = Array.isArray(declarationData?.declaration_items)
    ? declarationData?.declaration_items ?? []
    : []
  const hasMedicalCondition = Boolean(
    declarationHiker?.medical_condition && declarationHiker.medical_condition !== "Tiada"
  )

  const deleteHiker = async (id: number) => {
    const confirmDelete = confirm("Are you sure you want to delete this hiker?")
    if (!confirmDelete) return

    const { error } = await supabase.from("hikers").delete().eq("id", id)
    if (error) {
      console.error("DELETE HIKER ERROR:", error)
      alert("Delete hiker failed")
      return
    }

    fetchHikers()
  }

  const submitHiker = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalizedEmail = email.trim().toLowerCase()
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    if (!emailPattern.test(normalizedEmail)) {
      alert("Please enter a valid email address")
      return
    }

    if (editingId) {
      await supabase
        .from("hikers")
        .update({ name, ic, phone, email: normalizedEmail, emergency_contact: emergency })
        .eq("id", editingId)
    } else {
      await supabase
        .from("hikers")
        .insert({ name, ic, phone, email: normalizedEmail, emergency_contact: emergency })
    }

    resetForm()
    fetchHikers()
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
      <section className="space-y-6">
        <div className="panel-surface">
          <div className="panel-header">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                {editingId ? "Edit Hiker" : "Add New Hiker"}
              </h2>
              <p className="text-xs text-muted-foreground">Maintain hiker identity, contact, and emergency information.</p>
            </div>
            {editingId && (
              <Button type="button" variant="ghost" size="sm" onClick={resetForm}>
                Cancel
              </Button>
            )}
          </div>

          <form onSubmit={submitHiker} className="space-y-4 p-5">
            <div className="space-y-2">
              <Label htmlFor="hiker-name">Full Name</Label>
              <Input id="hiker-name" value={name} onChange={(event) => setName(event.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hiker-ic">IC Number</Label>
              <Input id="hiker-ic" value={ic} onChange={(event) => setIc(event.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hiker-phone">Phone Number</Label>
              <Input id="hiker-phone" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hiker-email">Email Address</Label>
              <Input id="hiker-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hiker-emergency" className="flex items-center gap-2">
                Emergency Contact
                <AlertCircle className="h-4 w-4 text-amber-500" />
              </Label>
              <Input
                id="hiker-emergency"
                value={emergency}
                onChange={(event) => setEmergency(event.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full">
              {editingId ? <Edit className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
              {editingId ? "Update Hiker" : "Add Hiker"}
            </Button>
          </form>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <SectionMetric label="Total Hikers" value={hikers.length} tone="text-primary" />
          <SectionMetric label="Filtered Results" value={filteredHikers.length} tone="theme-text-info" />
        </div>
      </section>

      <section className="space-y-6">
        <div className="panel-surface">
          <div className="panel-header">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Filter Hikers</h3>
              <p className="text-xs text-muted-foreground">Search by name, IC, phone, or email.</p>
            </div>
            <div className="text-sm text-muted-foreground">
              Showing {currentHikers.length} of {filteredHikers.length}
            </div>
          </div>
          <div className="p-5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search hikers..."
                className="pl-10"
              />
            </div>
          </div>
        </div>

        <div className="panel-surface overflow-hidden">
          <div className="panel-header">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Hiker Records</h3>
              <p className="text-xs text-muted-foreground">Manage identity, contact details, and emergency contacts.</p>
            </div>
            <SectionPager
              currentPage={currentPage}
              totalPages={totalPages}
              onPrev={() => setCurrentPage((page) => Math.max(1, page - 1))}
              onNext={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            />
          </div>

          {currentHikers.length === 0 ? (
            <EmptyState
              icon={<Users className="h-6 w-6 text-muted-foreground" />}
              title="No hikers found"
              description={searchTerm ? "Try adjusting your search term." : "Add your first hiker using the form."}
            />
          ) : (
            <div className="table-shell">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/60">
                    <TableHead className="px-6 text-xs font-semibold uppercase text-muted-foreground">Hiker</TableHead>
                    <TableHead className="px-6 text-xs font-semibold uppercase text-muted-foreground">Contact</TableHead>
                    <TableHead className="px-6 text-xs font-semibold uppercase text-muted-foreground">Emergency</TableHead>
                    <TableHead className="px-6 text-xs font-semibold uppercase text-muted-foreground">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentHikers.map((hiker) => (
                    <TableRow key={hiker.id} className="border-border/50 hover:bg-accent/30">
                      <TableCell className="px-6 py-4 align-top">
                        <div className="space-y-1">
                          <div className="font-medium text-foreground">{hiker.name}</div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <FileText className="h-4 w-4" />
                            {hiker.ic}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4 align-top">
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2 text-foreground">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            {hiker.phone}
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Mail className="h-4 w-4" />
                            {hiker.email || "No email"}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4 align-top">
                        <Badge variant="outline" className="theme-chip-warning">
                          <AlertCircle className="h-3 w-3" />
                          {hiker.emergency_contact}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-6 py-4 align-top">
                        <div className="flex min-w-[180px] flex-col gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full justify-start"
                            onClick={() => {
                              setEditingId(hiker.id)
                              setName(hiker.name)
                              setIc(hiker.ic)
                              setPhone(hiker.phone)
                              setEmail(hiker.email || "")
                              setEmergency(hiker.emergency_contact)
                              window.scrollTo({ top: 0, behavior: "smooth" })
                            }}
                          >
                            <Edit className="h-4 w-4" />
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full justify-start"
                            onClick={() => handleViewDeclaration(hiker.id)}
                          >
                            <Eye className="h-4 w-4" />
                            View Declaration
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="w-full justify-start"
                            onClick={() => deleteHiker(hiker.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </section>

      <Dialog open={isDeclarationOpen} onOpenChange={handleDeclarationOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-hidden p-0 sm:max-w-4xl">
          <DialogHeader className="border-b px-6 py-5 text-left">
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              View Declaration
            </DialogTitle>
            <DialogDescription>
              Review the full hiker declaration form, emergency details, and submitted item entries.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[calc(90vh-88px)] overflow-y-auto px-6 py-5">
            {loadingDeclaration ? (
              <div className="flex min-h-56 flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
                <LoaderCircle className="h-6 w-6 animate-spin text-primary" />
                <span>Loading declaration...</span>
              </div>
            ) : !declarationData || !declarationHiker ? (
              <EmptyState
                icon={<FileText className="h-6 w-6 text-muted-foreground" />}
                title="No declaration submitted"
                description="This hiker does not have a declaration record yet."
              />
            ) : (
              <div className="space-y-5">
                <Card className="gap-0">
                  <CardHeader className="pb-4">
                    <CardTitle>Personal Information</CardTitle>
                    <CardDescription>Core identity and contact information submitted by the hiker.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 sm:grid-cols-2">
                    <DeclarationField label="Name" value={declarationHiker.name} />
                    <DeclarationField label="IC" value={declarationHiker.ic} />
                    <DeclarationField label="Phone" value={declarationHiker.phone} />
                    <DeclarationField label="Email" value={declarationHiker.email} />
                    <DeclarationField label="Age" value={declarationHiker.age} />
                    <DeclarationField label="Address" value={declarationHiker.address} className="sm:col-span-2" />
                  </CardContent>
                </Card>

                <Card className="gap-0">
                  <CardHeader className="pb-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <div>
                        <CardTitle>Medical Information</CardTitle>
                        <CardDescription>Health declarations to help the admin team assess safety needs.</CardDescription>
                      </div>
                      {hasMedicalCondition && (
                        <Badge variant="destructive" className="gap-1.5">
                          <AlertCircle className="h-3.5 w-3.5" />
                          Medical Condition
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="grid gap-4 sm:grid-cols-2">
                    <DeclarationField label="Medical Condition" value={declarationHiker.medical_condition} />
                    <DeclarationField
                      label="Medical Condition Other"
                      value={declarationHiker.medical_condition_other}
                    />
                  </CardContent>
                </Card>

                <Card className="gap-0">
                  <CardHeader className="pb-4">
                    <CardTitle>Emergency Contact</CardTitle>
                    <CardDescription>Primary contact details for urgent communication.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 sm:grid-cols-3">
                    <DeclarationField label="Emergency Name" value={declarationHiker.emergency_name} />
                    <DeclarationField label="Emergency Phone" value={declarationHiker.emergency_phone} />
                    <DeclarationField
                      label="Emergency Relationship"
                      value={declarationHiker.emergency_relationship}
                    />
                  </CardContent>
                </Card>

                <Separator />

                <Card className="gap-0">
                  <CardHeader className="pb-4">
                    <CardTitle>Declaration Items</CardTitle>
                    <CardDescription>Submitted inventory or entry items linked to this declaration.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {declarationItems.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
                        No declaration items submitted.
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-lg border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Item Type</TableHead>
                              <TableHead>Entry Quantity</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {declarationItems.map((item, index) => (
                              <TableRow key={item.id ?? `${selectedHikerId}-${index}`}>
                                <TableCell>{item.item_type || item.type || "Not provided"}</TableCell>
                                <TableCell>{item.entry_quantity ?? item.quantity ?? "-"}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function GuiderSection() {
  const [guiders, setGuiders] = useState<Guider[]>([])
  const [filteredGuiders, setFilteredGuiders] = useState<Guider[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)

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
    const { data, error } = await supabase.from("guiders").select("*").order("name")
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
          (guider) =>
            guider.name.toLowerCase().includes(term) ||
            guider.phone.includes(term) ||
            guider.experience.toLowerCase().includes(term) ||
            (guider.mgp_number && guider.mgp_number.toLowerCase().includes(term))
        )
      )
    }
    setCurrentPage(1)
  }, [searchTerm, guiders])

  const totalPages = Math.ceil(filteredGuiders.length / ITEMS_PER_PAGE)
  const currentGuiders = filteredGuiders.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

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

  const submitGuider = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const selectedPhoto = form.elements.namedItem("photo") as HTMLInputElement | null
    const newPhoto = selectedPhoto?.files?.[0] || photo

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

        const { data } = supabase.storage.from("guiders-photo").getPublicUrl(filePath)
        updateData.photo_url = data.publicUrl
      }

      const { error } = await supabase.from("guiders").update(updateData).eq("id", editingId)
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

      const { data } = supabase.storage.from("guiders-photo").getPublicUrl(filePath)
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

  const averageAge = Math.round(guiders.reduce((sum, guider) => sum + (guider.age || 0), 0) / (guiders.length || 1))

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
      <section className="space-y-6">
        <div className="panel-surface">
          <div className="panel-header">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                {editingId ? "Edit Guider" : "Register New Guider"}
              </h2>
              <p className="text-xs text-muted-foreground">Create guider accounts, certifications, and profile records.</p>
            </div>
            {editingId && (
              <Button type="button" variant="ghost" size="sm" onClick={resetForm}>
                Cancel
              </Button>
            )}
          </div>

          <form onSubmit={submitGuider} className="space-y-5 p-5">
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-foreground">Login Credentials</p>
                <p className="text-xs text-muted-foreground">Used only when creating a new guider account.</p>
              </div>
              <Input
                placeholder={editingId ? "Username cannot be edited here" : "Username"}
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                disabled={!!editingId}
                required={!editingId}
              />
              <Input
                type="password"
                placeholder={editingId ? "Password cannot be edited here" : "Password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={!!editingId}
                required={!editingId}
              />
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-foreground">Personal Information</p>
                <p className="text-xs text-muted-foreground">Profile details shown in the guider directory.</p>
              </div>

              <Input placeholder="Full Name" value={name} onChange={(event) => setName(event.target.value)} required />
              <Input placeholder="Phone Number" value={phone} onChange={(event) => setPhone(event.target.value)} required />
              <Input placeholder="Age" value={age} onChange={(event) => setAge(event.target.value)} required />
              <Input
                placeholder="Experience (years)"
                value={experience}
                onChange={(event) => setExperience(event.target.value)}
                required
              />

              <div className="space-y-2">
                <Label htmlFor="mgp-number" className="flex items-center gap-2">
                  <BadgeCheck className="theme-text-success h-4 w-4" />
                  MGP Number
                </Label>
                <Input
                  id="mgp-number"
                  placeholder="e.g. MGP-2024-001"
                  value={mgpNumber}
                  onChange={(event) => setMgpNumber(event.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="guider-photo" className="flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Profile Photo
              </Label>
              <Input
                id="guider-photo"
                type="file"
                name="photo"
                ref={photoInputRef}
                accept="image/*"
                onChange={(event) => setPhoto(event.target.files?.[0] || null)}
              />
              {editingId && <p className="text-xs text-muted-foreground">Leave empty if you do not want to change the photo.</p>}
            </div>

            <Button type="submit" className="w-full">
              {editingId ? <Edit className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
              {editingId ? "Update Guider" : "Create Guider Account"}
            </Button>
          </form>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <SectionMetric label="Total Guiders" value={guiders.length} tone="text-primary" />
          <SectionMetric label="Average Age" value={averageAge} tone="theme-text-warning" />
        </div>
      </section>

      <section className="space-y-6">
        <div className="panel-surface">
          <div className="panel-header">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Filter Guiders</h3>
              <p className="text-xs text-muted-foreground">Search by name, phone, experience, or MGP number.</p>
            </div>
            <div className="text-sm text-muted-foreground">
              Showing {currentGuiders.length} of {filteredGuiders.length}
            </div>
          </div>
          <div className="p-5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search guiders..."
                className="pl-10"
              />
            </div>
          </div>
        </div>

        <div className="panel-surface overflow-hidden">
          <div className="panel-header">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Guider Directory</h3>
              <p className="text-xs text-muted-foreground">Professional mountain guides, certifications, and contact records.</p>
            </div>
            <SectionPager
              currentPage={currentPage}
              totalPages={totalPages}
              onPrev={() => setCurrentPage((page) => Math.max(1, page - 1))}
              onNext={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            />
          </div>

          {currentGuiders.length === 0 ? (
            <EmptyState
              icon={<Shield className="h-6 w-6 text-muted-foreground" />}
              title="No guiders found"
              description={searchTerm ? "Try adjusting your search term." : "Register your first guider account."}
            />
          ) : (
            <div className="table-shell">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/60">
                    <TableHead className="px-6 text-xs font-semibold uppercase text-muted-foreground">Guider</TableHead>
                    <TableHead className="px-6 text-xs font-semibold uppercase text-muted-foreground">Contact</TableHead>
                    <TableHead className="px-6 text-xs font-semibold uppercase text-muted-foreground">Experience</TableHead>
                    <TableHead className="px-6 text-xs font-semibold uppercase text-muted-foreground">MGP</TableHead>
                    <TableHead className="px-6 text-xs font-semibold uppercase text-muted-foreground">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentGuiders.map((guider) => (
                    <TableRow key={guider.id} className="border-border/50 hover:bg-accent/30">
                      <TableCell className="px-6 py-4 align-top">
                        <div className="flex items-center gap-3">
                          <Avatar className="size-12 border border-border">
                            <AvatarImage src={guider.photo_url || undefined} alt={guider.name} />
                            <AvatarFallback>
                              <User className="h-5 w-5 text-muted-foreground" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="space-y-1">
                            <div className="font-medium text-foreground">{guider.name}</div>
                            <div className="text-sm text-muted-foreground">Age: {guider.age}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4 align-top">
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2 text-foreground">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            {guider.phone}
                          </div>
                          <div className="text-muted-foreground">User ID: {guider.user_id}</div>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4 align-top">
                        <Badge variant="outline" className="theme-chip-info">
                          {guider.experience}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-6 py-4 align-top">
                        {guider.mgp_number ? (
                          <Badge variant="outline" className="theme-chip-success">
                            <BadgeCheck className="h-3 w-3" />
                            {guider.mgp_number}
                          </Badge>
                        ) : (
                          <span className="text-sm italic text-muted-foreground">Not assigned</span>
                        )}
                      </TableCell>
                      <TableCell className="px-6 py-4 align-top">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
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
                          >
                            <Edit className="h-4 w-4" />
                            Edit
                          </Button>
                          <Button type="button" variant="destructive" size="sm" onClick={() => deleteGuider(guider.id)}>
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">{icon}</div>
      <h3 className="font-medium text-foreground">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

function DeclarationField({
  label,
  value,
  className = "",
}: {
  label: string
  value: string | number | null | undefined
  className?: string
}) {
  return (
    <div className={`rounded-xl border bg-muted/20 p-4 ${className}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm text-foreground">{value || "Not provided"}</p>
    </div>
  )
}
