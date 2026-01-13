'use client';

import React from 'react';
import Link from "next/link";

import {
  Mountain,
  QrCode,
  Users,
  MapPin,
  AlertTriangle,
  BarChart3,
  LogOut,
  User,
  Activity
} from 'lucide-react';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

export default function AdminDashboardPage() {
  const summaryCards = [
    { title: 'Active Hiking Sessions', value: 5, icon: Activity },
    { title: 'Registered Hikers', value: 124, icon: Users },
    { title: 'Active Guiders', value: 8, icon: User },
    { title: 'Emergency Alerts', value: 1, icon: AlertTriangle, danger: true },
  ];

  const activeGroups = [
    { id: 1, group: 'Ledang Summit A', guider: 'Ahmad R.', status: 'Active' },
    { id: 2, group: 'Ledang Summit B', guider: 'Nurul H.', status: 'Active' },
    { id: 3, group: 'Beginner Trail', guider: 'Sarah L.', status: 'Monitoring' },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      
      {/* SIDEBAR */}
      <aside className="w-64 border-r border-border bg-card px-4 py-6 hidden md:flex flex-col">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-primary/10 p-3 rounded-xl">
            <Mountain className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold">TRAILGUARD</h2>
            <p className="text-xs text-muted-foreground">Admin Panel</p>
          </div>
        </div>

        <nav className="flex flex-col gap-2 text-sm">
      

            <Button
              variant="ghost"
              className="justify-start gap-2"
              asChild
            >
              <Link href="/admin/qr-management">
                <QrCode className="h-4 w-4" />
                QR Management
              </Link>
            </Button>

          
       <Button
              variant="ghost"
              className="justify-start gap-2"
              asChild
            >
              <Link href="/admin/hikers">
                <QrCode className="h-4 w-4" />
                Participant Management
              </Link>
            </Button>



            <Button
              variant="ghost"
              className="justify-start gap-2"
              asChild
            >
              <Link href="/admin/live">
                <QrCode className="h-4 w-4" />
                Live Map Monitor
              </Link>
            </Button>



          <Button
              variant="ghost"
              className="justify-start gap-2"
              asChild
            >
              <Link href="/admin/checkpoints">
                <QrCode className="h-4 w-4" />
                Checkpoint Management
              </Link>
            </Button>

          
           <Button
              variant="ghost"
              className="justify-start gap-2"
              asChild
            >
              <Link href="/admin/emergency-alerts">
                <QrCode className="h-4 w-4" />
                Emergency Alerts
              </Link>
            </Button>

          <Button variant="ghost" className="justify-start gap-2">
            <BarChart3 className="h-4 w-4" /> Reports & Analytics
          </Button>
        </nav>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1">
        
        {/* TOP BAR */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>

          <div className="flex items-center gap-4">
            <Badge variant="outline">Admin</Badge>
            <Avatar>
              <AvatarFallback className="bg-primary/10 text-primary">A</AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* CONTENT */}
        <div className="p-6 space-y-8">

          {/* SUMMARY CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {summaryCards.map((card, index) => {
              const Icon = card.icon;
              return (
                <Card key={index} className="rounded-2xl">
                  <CardContent className="p-6 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{card.title}</p>
                      <p className="text-3xl font-bold mt-2">{card.value}</p>
                    </div>
                    <div className={`p-4 rounded-xl ${card.danger ? 'bg-destructive/10' : 'bg-primary/10'}`}>
                      <Icon className={`h-6 w-6 ${card.danger ? 'text-destructive' : 'text-primary'}`} />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* LIVE MAP PREVIEW */}
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Live GPS Monitoring</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
                Live Map Preview (Leaflet / Mapbox)
              </div>
            </CardContent>
          </Card>

          {/* ACTIVE GROUPS */}
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Active Hiking Groups</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {activeGroups.map(group => (
                <div
                  key={group.id}
                  className="flex items-center justify-between p-4 rounded-xl border border-border"
                >
                  <div>
                    <p className="font-medium">{group.group}</p>
                    <p className="text-sm text-muted-foreground">
                      Guider: {group.guider}
                    </p>
                  </div>
                  <Badge variant="outline">{group.status}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

        </div>
      </main>
    </div>
  );
}
