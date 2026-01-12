'use client';

import React, { useEffect, useState } from 'react';
import {
  Plus, Calendar, Users, User, QrCode, Eye, PowerOff, Clock,
  Scan, Download, Copy, Check, Sparkles
} from 'lucide-react';
import QRCode from 'react-qr-code';

import { supabase } from '@/lib/supabase';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';

/* ================= TYPES ================= */
type Guider = {
  id: string;
  name: string;
  avatar_color: string;
};

type QRItem = {
  id: string;
  guider_name: string;
  date: string;
  capacity: number;
  status: string;
  value: string;
  scanned_count?: number;
};

type QRSessionRow = {
  id: string;
  hiking_date: string;
  capacity: number;
  status: string;
  qr_value: string;
  current_count: number;
  guiders: {
    name: string;
  }[] | null;
};


/* ================= COMPONENT ================= */
export default function QRManagementPage() {
  const [date, setDate] = useState('');
  const [guiderId, setGuiderId] = useState('');
  const [capacity, setCapacity] = useState('');
  const [qrValue, setQrValue] = useState('');
  const [qrList, setQrList] = useState<QRItem[]>([]);
  const [guiders, setGuiders] = useState<Guider[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('create');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [qrType, setQrType] = useState<'CHECKIN' | 'CHECKOUT'>('CHECKIN');

  /* ================= LOAD GUIDERS ================= */
  useEffect(() => {
    supabase
      .from('guiders')
      .select('id, name')
      .order('name')
      .then(({ data }) => {
        if (data) {
          setGuiders(
            data.map((g, i) => ({
              ...g,
              avatar_color: [
                'from-purple-500 to-pink-500',
                'from-blue-500 to-cyan-500',
                'from-green-500 to-emerald-500',
                'from-orange-500 to-red-500',
                'from-violet-500 to-purple-500',
              ][i % 5],
            }))
          );
        }
      });
  }, []);

  /* ================= LOAD QR SESSIONS ================= */
  useEffect(() => {
    supabase
      .from('qr_sessions')
      .select(`
        id,
        hiking_date,
        capacity,
        status,
        qr_value,
        current_count,
        guiders!fk_guider ( name )
      `)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
  if (data) {
    setQrList(
      (data as QRSessionRow[]).map(q => ({
        id: q.id,
        guider_name: q.guiders?.[0]?.name ?? '—',
        date: q.hiking_date,
        capacity: q.capacity,
        status: q.status,
        value: q.qr_value,
        scanned_count: q.current_count || 0,
      }))
    );
  }
});

  }, []);

  /* ================= GENERATE QR (FIXED – REAL WORLD) ================= */
  const handleGenerateQR = async () => {
    if (!date || !guiderId || !capacity) {
      alert('Please complete all fields');
      return;
    }

    setIsGenerating(true);

    // 🔴 STEP 1: Deactivate ALL old sessions for this guider
    await supabase
      .from('qr_sessions')
      .update({ status: 'Inactive' })
      .eq('guider_id', guiderId)
      .eq('status', 'Active');

    // 🟢 STEP 2: Create new session
                    const { data, error } = await supabase
                    .from('qr_sessions')
                    .insert({
                      hiking_date: date,
                      guider_id: guiderId,
                      capacity: Number(capacity),
                      current_count: 0,
                      status: 'Active',
                      qr_type: qrType, // 🔥 TAMBAH NI
                      qr_value: '',
                    })        //qr checkin/checkout 6/1/2026

      .select(`
        id,
        hiking_date,
        capacity,
        status,
        current_count,
        guiders!fk_guider ( name )
      `)
      .single<QRSessionRow>();

    if (error || !data) {
      setIsGenerating(false);
      alert('Failed to create session');
      return;
    }

    // 🟢 STEP 3: QR MUST USE session_id
            const qrValueString = JSON.stringify({
            type: qrType === 'CHECKIN' ? 'LEDANG_CHECKIN' : 'LEDANG_CHECKOUT',
            session_id: data.id,
          }); //checkout 6/1/2025

    await supabase
      .from('qr_sessions')
      .update({ qr_value: qrValueString })
      .eq('id', data.id);

    setIsGenerating(false);

    // 🟢 STEP 4: Update UI
    setQrValue(qrValueString);
    setActiveTab('preview');

    setQrList(prev => [
      {
        id: data.id,
        guider_name: data.guiders?.[0]?.name ?? '—',
        date: data.hiking_date,
        capacity: data.capacity,
        status: data.status,
        value: qrValueString,
        scanned_count: data.current_count || 0,
      },
      ...prev,
    ]);

    setDate('');
    setGuiderId('');
    setCapacity('');
  };

  /* ================= DISPLAY QR ================= */
  const handleDisplayQR = (qr: QRItem) => {
    if (qr.status !== 'Active') {
      alert('QR ini tidak aktif');
      return;
    }
    setQrValue(qr.value);
    setActiveTab('preview');
  };

  /* ================= UNACTIVE QR ================= */
  const handleUnactiveQR = async (id: string) => {
    if (!window.confirm('Deactivate this QR session?')) return;

    await supabase
      .from('qr_sessions')
      .update({ status: 'Inactive' })
      .eq('id', id);

    setQrList(prev =>
      prev.map(q => (q.id === id ? { ...q, status: 'Inactive' } : q))
    );

    if (qrValue === qrList.find(q => q.id === id)?.value) {
      setQrValue('');
    }
  };

  /* ================= COPY ID ================= */
  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  /* ================= HELPERS ================= */
  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const getProgressColor = (s: number, c: number) => {
    const p = (s / c) * 100;
    if (p >= 100) return 'bg-red-500';
    if (p >= 80) return 'bg-orange-500';
    if (p >= 50) return 'bg-yellow-500';
    return 'bg-green-500';
  };
  /* ================= UI ================= */
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4 md:p-6">
      
      {/* ANIMATED BACKGROUND ELEMENTS */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"></div>
      </div>

      {/* MAIN CONTENT */}
      <div className="relative z-10 max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 shadow-lg">
              <QrCode className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              QR Session Manager
            </h1>
            <Sparkles className="h-5 w-5 text-yellow-400" />
          </div>
          <p className="text-gray-400">Create and manage hiking QR sessions with ease</p>
        </div>

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT SIDEBAR - FORM */}
          <div className="lg:col-span-1 space-y-6">
            {/* CREATE CARD */}
            <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700 shadow-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400">
                    <Plus className="h-4 w-4 text-white" />
                  </div>
                  Create New Session
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Generate a unique QR for hiking
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* DATE INPUT */}
                <div className="space-y-3">
                  <Label className="text-gray-300 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-400" />
                    Hiking Date
                  </Label>
                  <Input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="bg-gray-900/50 border-gray-700 text-white placeholder:text-gray-500 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* GUIDER SELECT */}
                <div className="space-y-3">
                  <Label className="text-gray-300 flex items-center gap-2">
                    <User className="h-4 w-4 text-purple-400" />
                    Select Guider
                  </Label>
                  <Select value={guiderId} onValueChange={setGuiderId}>
                    <SelectTrigger className="bg-gray-900/50 border-gray-700 text-white">
                      <SelectValue placeholder="Choose guider" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      {guiders.map(g => (
                        <SelectItem 
                          key={g.id} 
                          value={g.id}
                          className="text-white hover:bg-gray-700 focus:bg-gray-700"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${g.avatar_color}`}></div>
                            {g.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* CAPACITY INPUT */}
                <div className="space-y-3">
                  <Label className="text-gray-300 flex items-center gap-2">
                    <Users className="h-4 w-4 text-green-400" />
                    Group Capacity
                  </Label>
                  <Input
                    type="number"
                    placeholder="Max participants"
                    value={capacity}
                    onChange={e => setCapacity(e.target.value)}
                    className="bg-gray-900/50 border-gray-700 text-white placeholder:text-gray-500"
                    min="1"
                  />
                </div>
                                      <div className="space-y-3">
                  <Label className="text-gray-300 flex items-center gap-2">
                    <Scan className="h-4 w-4 text-yellow-400" />
                    QR Purpose
                  </Label>
                  <Select value={qrType}onValueChange={(v: 'CHECKIN' | 'CHECKOUT') => setQrType(v)}>
                    <SelectTrigger className="bg-gray-900/50 border-gray-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="CHECKIN">Check-in</SelectItem>
                      <SelectItem value="CHECKOUT">Check-out</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* GENERATE BUTTON */}
                <Button
                  onClick={handleGenerateQR}
                  disabled={!date || !guiderId || !capacity || isGenerating}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 h-12 text-base font-semibold"
                >
                  {isGenerating ? (
                    <>
                      <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      Creating Session...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate QR Session
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* STATS CARD */}
            <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700 shadow-2xl">
              <CardHeader>
                <CardTitle className="text-white">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-gradient-to-br from-blue-900/30 to-blue-900/10 border border-blue-800/30">
                    <div className="text-2xl font-bold text-white">
                      {qrList.filter(q => q.status === 'Active').length}
                    </div>
                    <div className="text-sm text-blue-300">Active Sessions</div>
                  </div>
                  <div className="p-4 rounded-xl bg-gradient-to-br from-purple-900/30 to-purple-900/10 border border-purple-800/30">
                    <div className="text-2xl font-bold text-white">
                      {qrList.reduce((sum, q) => sum + q.capacity, 0)}
                    </div>
                    <div className="text-sm text-purple-300">Total Capacity</div>
                  </div>
                </div>
                <div className="pt-4 border-t border-gray-700">
                  <div className="text-sm text-gray-400">
                    Last updated: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT CONTENT */}
          <div className="lg:col-span-2">
            {/* TABS */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-gray-800/50 border-gray-700 p-1">
                <TabsTrigger 
                  value="preview" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-cyan-500 data-[state=active]:text-white"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  QR Preview
                </TabsTrigger>
                <TabsTrigger 
                  value="sessions"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-500 data-[state=active]:text-white"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  All Sessions
                </TabsTrigger>
              </TabsList>

              {/* QR PREVIEW TAB */}
              <TabsContent value="preview" className="mt-4">
                <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700 shadow-2xl">
                  <CardContent className="p-8">
                    {qrValue ? (
                      <div className="flex flex-col items-center justify-center space-y-6">
                        <div className="p-6 bg-white rounded-2xl shadow-2xl">
                          <QRCode 
                            value={qrValue} 
                            size={220}
                            bgColor="#ffffff"
                            fgColor="#1e293b"
                            level="H"
                          />
                        </div>
                        <div className="text-center space-y-4">
                          <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-1.5 text-sm">
                            <Scan className="h-3 w-3 mr-1.5" />
                            Ready to Scan
                          </Badge>
                          <p className="text-gray-400 text-sm max-w-md">
                            Scan this QR code at the hiking checkpoint to validate participant entry.
                            Valid for the specified date only.
                          </p>
                          <div className="flex gap-3">
                            <Button variant="outline" className="border-gray-600 text-gray-300">
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </Button>
                            <Button variant="outline" className="border-gray-600 text-gray-300">
                              <Copy className="h-4 w-4 mr-2" />
                              Copy Value
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12 space-y-6">
                        <div className="relative mx-auto w-48 h-48">
                          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-full blur-xl"></div>
                          <div className="relative w-full h-full bg-gray-900/50 rounded-2xl border-2 border-dashed border-gray-700 flex flex-col items-center justify-center">
                            <QrCode className="h-16 w-16 text-gray-600 mb-4" />
                            <p className="text-gray-500 font-medium">No QR Selected</p>
                            <p className="text-sm text-gray-600 mt-2">
                              Create or select a session to preview QR
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* SESSIONS TAB */}
              <TabsContent value="sessions" className="mt-4">
                <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700 shadow-2xl">
                  <CardContent className="p-0">
                    <ScrollArea className="h-[600px]">
                      <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {qrList.map(qr => (
                            <div
                              key={qr.id}
                              className="group relative bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700 rounded-xl p-5 hover:border-blue-500/50 hover:shadow-lg transition-all duration-300"
                            >
                              {/* STATUS INDICATOR */}
                              <div className={`absolute top-4 right-4 w-3 h-3 rounded-full ${
                                qr.status === 'Active' 
                                  ? 'bg-green-500 animate-pulse' 
                                  : 'bg-gray-500'
                              }`}></div>

                              {/* HEADER */}
                              <div className="flex items-start gap-4 mb-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600/20 to-cyan-500/20 flex items-center justify-center">
                                  <QrCode className="h-6 w-6 text-blue-400" />
                                </div>
                                <div className="flex-1">
                                  <h3 className="font-semibold text-white">{qr.guider_name}</h3>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Calendar className="h-3 w-3 text-gray-400" />
                                    <span className="text-sm text-gray-400">{formatDate(qr.date)}</span>
                                  </div>
                                </div>
                              </div>

                              {/* CAPACITY BAR */}
                              <div className="mb-4">
                                <div className="flex justify-between text-sm mb-1">
                                  <span className="text-gray-400">
                                    <Users className="h-3 w-3 inline mr-1" />
                                    {qr.scanned_count || 0}/{qr.capacity} scanned
                                  </span>
                                  <span className="text-gray-300">
                                    {Math.round(((qr.scanned_count || 0) / qr.capacity) * 100)}%
                                  </span>
                                </div>
                                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full ${getProgressColor(qr.scanned_count || 0, qr.capacity)} transition-all duration-500`}
                                    style={{ width: `${Math.min(100, ((qr.scanned_count || 0) / qr.capacity) * 100)}%` }}
                                  ></div>
                                </div>
                              </div>

                              {/* ACTIONS */}
                              <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleCopyId(qr.id)}
                                  className="text-xs text-gray-400 hover:text-white"
                                >
                                  {copiedId === qr.id ? (
                                    <Check className="h-3 w-3 mr-1" />
                                  ) : (
                                    <Copy className="h-3 w-3 mr-1" />
                                  )}
                                  {copiedId === qr.id ? 'Copied!' : 'Copy ID'}
                                </Button>
                                
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => handleDisplayQR(qr)}
                                    className="bg-gradient-to-r from-blue-600/20 to-blue-600/10 hover:from-blue-600/30 hover:to-blue-600/20 text-blue-400 border border-blue-500/30"
                                  >
                                    <Eye className="h-3 w-3 mr-1" />
                                    View
                                  </Button>
                                  
                                  {qr.status === 'Active' && (
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => handleUnactiveQR(qr.id)}
                                      className="bg-gradient-to-r from-red-600/20 to-red-600/10 hover:from-red-600/30 hover:to-red-600/20 text-red-400 border border-red-500/30"
                                    >
                                      <PowerOff className="h-3 w-3 mr-1" />
                                      End
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* FOOTER NOTE */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Each QR session is encrypted and can only be activated once per participant.</p>
        </div>
      </div>
    </div>
  );
}