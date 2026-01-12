'use client'

import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import {
  Users,
  UserPlus,
  Search,
  Phone,
  Edit2,
  Trash2,
} from 'lucide-react'

// =====================
// Types
// =====================
type Hiker = {
  id: number
  created_at: string
  name: string
  ic: string
  phone: string
  emergency_contact: string | null
}


export default function Page() {
  const [hikers, setHikers] = useState<Hiker[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  // Form state
  const [name, setName] = useState('')
  const [ic, setIC] = useState('')
  const [phone, setPhone] = useState('')
  const [emergency, setEmergency] = useState('')

  // =====================
  // Fetch hikers
  // =====================
  const fetchHikers = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/hikers`)
      const data = await res.json()

      if (!res.ok) throw new Error(data.error)
      setHikers(data)
    } catch (error) {
      console.error(error)
      toast.error("Failed to fetch hikers")
    } finally {
      setIsLoading(false)
    }
  }

  // =====================
  // Add hiker
  // =====================
  const handleAddHiker = async () => {
    if (!name || !ic || !phone) {
      toast.warning("Please fill in all required fields")
      return
    }

    try {
      const res = await fetch(`/api/daftar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          ic,
          phone,
          emergency_contact: emergency,
        }),
      })

      const result = await res.json()
      if (!res.ok) throw new Error(result.error)

      toast.success("Hiker added successfully")

      setName('')
      setIC('')
      setPhone('')
      setEmergency('')
      fetchHikers()
    } catch (error) {
      console.error(error)
      toast.error("Failed to add hiker")
    }
  }

  // =====================
  // Filter
  // =====================
  const filteredHikers = hikers.filter(h => {
    const q = searchQuery.toLowerCase()
    return (
      h.name.toLowerCase().includes(q) ||
      h.ic.includes(q) ||
      h.phone.includes(q) ||
      h.emergency_contact?.includes(q)
    )
  })

  useEffect(() => {
    fetchHikers()
  }, [])

  return (
    <div className="min-h-screen bg-muted/40 p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>Hiker Management</CardTitle>
                <CardDescription>
                  Manage registered hikers
                </CardDescription>
              </div>
            </div>

            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Hiker
                </Button>
              </DialogTrigger>

              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Hiker</DialogTitle>
                  <DialogDescription>
                    Enter hiker details
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div>
                    <Label>Name *</Label>
                    <Input value={name} onChange={e => setName(e.target.value)} />
                  </div>
                  <div>
                    <Label>IC *</Label>
                    <Input value={ic} onChange={e => setIC(e.target.value)} />
                  </div>
                  <div>
                    <Label>Phone *</Label>
                    <Input value={phone} onChange={e => setPhone(e.target.value)} />
                  </div>
                  <div>
                    <Label>Emergency Contact</Label>
                    <Input value={emergency} onChange={e => setEmergency(e.target.value)} />
                  </div>
                </div>

                <DialogFooter>
                  <Button onClick={handleAddHiker} className="w-full">
                    Save
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
        </Card>

        {/* Search */}
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search hikers..."
                className="pl-10"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <Badge variant="outline">
              {filteredHikers.length} / {hikers.length}
            </Badge>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>IC</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Emergency</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredHikers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    No hikers found
                  </TableCell>
                </TableRow>
              ) : (
                filteredHikers.map((h, i) => (
                  <TableRow key={h.id}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell>{h.name}</TableCell>
                    <TableCell>{h.ic}</TableCell>
                    <TableCell className="flex items-center gap-2">
                      <Phone className="h-3 w-3" /> {h.phone}
                    </TableCell>
                    <TableCell>
                      {h.emergency_contact || (
                        <span className="text-muted-foreground italic">
                          Not provided
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="flex gap-2">
                      <Button size="icon" variant="outline">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="outline" className="text-red-500">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

      </div>
    </div>
  )
}
