'use client';

import React, { useEffect, useState } from 'react';
import {
  Plus, Calendar, Users, User, QrCode, Eye, PowerOff, Clock,
  Scan, Download, Copy, Check, Sparkles, ArrowLeftRight,
  Shield, Mountain, Activity, AlertTriangle, CheckCircle2,
  Radio, Compass, TreePine, ChevronRight, Zap, BarChart3
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
  guider?: {
    id: number;
    name: string;
  } | null;
  date: string;
  capacity: number;
  status: string;
  value: string;
  scanned_count?: number;
  qr_type?: string;
};

type QRSessionRow = {
  id: string;
  hiking_date: string;
  capacity: number;
  status: string;
  qr_value: string;
  current_count: number;
  qr_type: string;
  guider?: {
    id: number;
    name: string;
  } | null;
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
  const [togglingId, setTogglingId] = useState<string | null>(null);

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
                'from-emerald-500 to-teal-500',
                'from-green-500 to-emerald-500',
                'from-teal-500 to-cyan-500',
                'from-amber-500 to-orange-500',
                'from-lime-500 to-green-500',
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
        *,
        guider:guiders (
          id,
          name
        )
      `)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error('LOAD QR SESSIONS ERROR:', error);
          return;
        }

        if (data) {
          setQrList(
            (data as QRSessionRow[]).map(q => ({
              id: q.id,
              guider: q.guider ?? null,
              date: q.hiking_date,
              capacity: q.capacity,
              status: q.status,
              value: q.qr_value,
              scanned_count: q.current_count || 0,
              qr_type: q.qr_type,
            }))
          );
        }
      });
  }, []);

  /* ================= GENERATE QR ================= */
  const handleGenerateQR = async () => {
    if (!date || !guiderId || !capacity) {
      alert('Please complete all fields');
      return;
    }

    setIsGenerating(true);

    await supabase
      .from('qr_sessions')
      .update({ status: 'Inactive' })
      .eq('guider_id', guiderId)
      .eq('status', 'Active');

    const { data, error } = await supabase
      .from('qr_sessions')
      .insert({
        hiking_date: date,
        guider_id: guiderId,
        capacity: Number(capacity),
        current_count: 0,
        status: 'Active',
        qr_type: qrType,
        qr_value: '',
      })
      .select(`
        *,
        guider:guiders (
          id,
          name
        )
      `)
      .single<QRSessionRow>();

    if (error || !data) {
      setIsGenerating(false);
      alert('Failed to create session');
      return;
    }

    const qrValueString = JSON.stringify({
      type: qrType === 'CHECKIN' ? 'LEDANG_CHECKIN' : 'LEDANG_CHECKOUT',
      session_id: data.id,
    });

    await supabase
      .from('qr_sessions')
      .update({ qr_value: qrValueString })
      .eq('id', data.id);

    setIsGenerating(false);

    setQrValue(qrValueString);
    setActiveTab('preview');

    setQrList(prev => [
      {
        id: data.id,
        guider: data.guider ?? null,
        date: data.hiking_date,
        capacity: data.capacity,
        status: data.status,
        value: qrValueString,
        scanned_count: data.current_count || 0,
        qr_type: data.qr_type,
      },
      ...prev,
    ]);

    setDate('');
    setGuiderId('');
    setCapacity('');
  };

  /* ================= TOGGLE CHECKIN/CHECKOUT ================= */
  const handleToggleType = async (qr: QRItem) => {
    if (qr.status !== 'Active') {
      alert('Session tidak aktif');
      return;
    }

    const currentType = qr.qr_type ?? (qr.value.includes('CHECKIN') ? 'CHECKIN' : 'CHECKOUT');
    const newType = currentType === 'CHECKIN' ? 'CHECKOUT' : 'CHECKIN';

    const newQrValue = JSON.stringify({
      type: newType === 'CHECKIN' ? 'LEDANG_CHECKIN' : 'LEDANG_CHECKOUT',
      session_id: qr.id,
    });

    setTogglingId(qr.id);

    const { error } = await supabase
      .from('qr_sessions')
      .update({
        qr_type: newType,
        qr_value: newQrValue,
      })
      .eq('id', qr.id);

    setTogglingId(null);

    if (error) {
      alert('Gagal toggle QR type');
      return;
    }

    setQrList(prev =>
      prev.map(q =>
        q.id === qr.id
          ? { ...q, qr_type: newType, value: newQrValue }
          : q
      )
    );

    if (qrValue === qr.value) {
      setQrValue(newQrValue);
    }
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
    if (p >= 80) return 'bg-amber-500';
    if (p >= 50) return 'bg-yellow-500';
    return 'bg-emerald-500';
  };

  const activeSessions = qrList.filter(q => q.status === 'Active');
  const totalScanned = qrList.reduce((sum, q) => sum + (q.scanned_count || 0), 0);
  const totalCapacity = qrList.reduce((sum, q) => sum + q.capacity, 0);

  /* ================= UI ================= */
  return (
    <div
      className="min-h-screen"
      style={{
        background: 'linear-gradient(135deg, #0a1a0f 0%, #0d2016 30%, #112218 60%, #0e1d14 100%)',
        fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
      }}
    >
      {/* TEXTURE OVERLAY */}
      <div
        className="fixed inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23166534' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* AMBIENT GLOW BLOBS */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #16a34a 0%, transparent 70%)', filter: 'blur(60px)' }}
        />
        <div
          className="absolute bottom-0 -left-32 w-80 h-80 rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #15803d 0%, transparent 70%)', filter: 'blur(50px)' }}
        />
        <div
          className="absolute top-1/2 right-1/4 w-64 h-64 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #d97706 0%, transparent 70%)', filter: 'blur(80px)' }}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">

        {/* ══════════════════════════════════════════════
            SECTION 1 — PAGE HEADER
        ══════════════════════════════════════════════ */}
        <div className="mb-8">
          {/* Top strip */}
          <div className="flex items-center gap-2 mb-4">
            <div
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-widest uppercase"
              style={{ background: 'rgba(22,163,74,0.15)', border: '1px solid rgba(22,163,74,0.3)', color: '#4ade80' }}
            >
              <Radio className="h-3 w-3 animate-pulse" />
              TRAILGUARD LIVE
            </div>
            <div
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#9ca3af' }}
            >
              <Mountain className="h-3 w-3" />
              Gunung Ledang Command
            </div>
          </div>

          {/* Title row */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-4 mb-2">
                <div
                  className="relative p-3 rounded-2xl"
                  style={{
                    background: 'linear-gradient(135deg, #15803d, #16a34a)',
                    boxShadow: '0 0 30px rgba(22,163,74,0.4), inset 0 1px 0 rgba(255,255,255,0.15)',
                  }}
                >
                  <QrCode className="h-7 w-7 text-white" />
                  <div
                    className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 animate-pulse"
                    style={{ boxShadow: '0 0 6px #4ade80' }}
                  />
                </div>
                <div>
                  <h1
                    className="text-3xl md:text-4xl font-bold leading-none"
                    style={{
                      background: 'linear-gradient(135deg, #f0fdf4 20%, #86efac 60%, #4ade80 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      letterSpacing: '-0.02em',
                    }}
                  >
                    QR Session Manager
                  </h1>
                  <p className="text-sm mt-1" style={{ color: '#6b7280' }}>
                    Hiking checkpoint access control · Gunung Ledang
                  </p>
                </div>
              </div>
            </div>

            {/* Time display */}
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#9ca3af',
              }}
            >
              <Clock className="h-4 w-4 text-emerald-400" />
              <span>Last sync: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>

          {/* Divider */}
          <div className="mt-6 h-px" style={{ background: 'linear-gradient(90deg, rgba(22,163,74,0.4) 0%, rgba(22,163,74,0.1) 50%, transparent 100%)' }} />
        </div>

        {/* ══════════════════════════════════════════════
            SECTION 2 — STATUS SUMMARY CARDS
        ══════════════════════════════════════════════ */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
          {/* Active Sessions */}
          <div
            className="relative rounded-2xl p-4 md:p-5 overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(22,163,74,0.18) 0%, rgba(15,118,54,0.08) 100%)',
              border: '1px solid rgba(22,163,74,0.3)',
              boxShadow: '0 4px 24px rgba(22,163,74,0.08)',
            }}
          >
            <div className="absolute top-0 right-0 w-20 h-20 rounded-bl-full opacity-10" style={{ background: '#16a34a' }} />
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg" style={{ background: 'rgba(22,163,74,0.2)' }}>
                <Activity className="h-3.5 w-3.5 text-emerald-400" />
              </div>
              <span className="text-xs font-medium uppercase tracking-wider" style={{ color: '#6b7280' }}>Active</span>
            </div>
            <div className="text-3xl font-bold text-white mb-1">{activeSessions.length}</div>
            <div className="text-xs" style={{ color: '#4ade80' }}>
              {activeSessions.length > 0 ? '● Live sessions' : '○ No active sessions'}
            </div>
          </div>

          {/* Total Sessions */}
          <div
            className="relative rounded-2xl p-4 md:p-5 overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(15,23,42,0.8) 0%, rgba(30,41,59,0.4) 100%)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div className="absolute top-0 right-0 w-20 h-20 rounded-bl-full opacity-5" style={{ background: '#e2e8f0' }} />
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <QrCode className="h-3.5 w-3.5 text-slate-400" />
              </div>
              <span className="text-xs font-medium uppercase tracking-wider" style={{ color: '#6b7280' }}>Total QR</span>
            </div>
            <div className="text-3xl font-bold text-white mb-1">{qrList.length}</div>
            <div className="text-xs" style={{ color: '#6b7280' }}>All time sessions</div>
          </div>

          {/* Total Scanned */}
          <div
            className="relative rounded-2xl p-4 md:p-5 overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(180,83,9,0.06) 100%)',
              border: '1px solid rgba(245,158,11,0.2)',
            }}
          >
            <div className="absolute top-0 right-0 w-20 h-20 rounded-bl-full opacity-10" style={{ background: '#d97706' }} />
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg" style={{ background: 'rgba(245,158,11,0.15)' }}>
                <Scan className="h-3.5 w-3.5 text-amber-400" />
              </div>
              <span className="text-xs font-medium uppercase tracking-wider" style={{ color: '#6b7280' }}>Scanned</span>
            </div>
            <div className="text-3xl font-bold text-white mb-1">{totalScanned}</div>
            <div className="text-xs" style={{ color: '#f59e0b' }}>Participants scanned</div>
          </div>

          {/* Total Capacity */}
          <div
            className="relative rounded-2xl p-4 md:p-5 overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(59,130,246,0.12) 0%, rgba(37,99,235,0.06) 100%)',
              border: '1px solid rgba(59,130,246,0.2)',
            }}
          >
            <div className="absolute top-0 right-0 w-20 h-20 rounded-bl-full opacity-10" style={{ background: '#3b82f6' }} />
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg" style={{ background: 'rgba(59,130,246,0.15)' }}>
                <Users className="h-3.5 w-3.5 text-blue-400" />
              </div>
              <span className="text-xs font-medium uppercase tracking-wider" style={{ color: '#6b7280' }}>Capacity</span>
            </div>
            <div className="text-3xl font-bold text-white mb-1">{totalCapacity}</div>
            <div className="text-xs" style={{ color: '#60a5fa' }}>Total slots registered</div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════
            MAIN GRID — Form + Tabs
        ══════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* ════════════════════════════
              LEFT — SECTION 3: QR GENERATION
          ════════════════════════════ */}
          <div className="lg:col-span-4 space-y-5">

            {/* Generate Card */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: 'rgba(10,26,15,0.8)',
                border: '1px solid rgba(22,163,74,0.2)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
              }}
            >
              {/* Card Header */}
              <div
                className="px-6 py-5 flex items-center gap-3"
                style={{
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  background: 'linear-gradient(135deg, rgba(22,163,74,0.1) 0%, transparent 100%)',
                }}
              >
                <div
                  className="p-2 rounded-xl"
                  style={{
                    background: 'linear-gradient(135deg, #15803d, #16a34a)',
                    boxShadow: '0 0 16px rgba(22,163,74,0.3)',
                  }}
                >
                  <Plus className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-white text-base">Generate QR Session</h2>
                  <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>Deploy a new checkpoint QR</p>
                </div>
              </div>

              {/* Form Body */}
              <div className="px-6 py-5 space-y-5">

                {/* Hiking Date */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider" style={{ color: '#6b7280' }}>
                    <Calendar className="h-3.5 w-3.5 text-emerald-500" />
                    Hiking Date
                  </label>
                  <Input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="h-11 rounded-xl text-white placeholder:text-gray-600 focus-visible:ring-emerald-500/50 focus-visible:ring-2"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      colorScheme: 'dark',
                    }}
                  />
                </div>

                {/* Guider */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider" style={{ color: '#6b7280' }}>
                    <Compass className="h-3.5 w-3.5 text-emerald-500" />
                    Trail Guide
                  </label>
                  <Select value={guiderId} onValueChange={setGuiderId}>
                    <SelectTrigger
                      className="h-11 rounded-xl text-white focus:ring-emerald-500/50"
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                      }}
                    >
                      <SelectValue placeholder="Assign a guide" />
                    </SelectTrigger>
                    <SelectContent
                      style={{ background: '#0f2418', border: '1px solid rgba(22,163,74,0.2)' }}
                    >
                      {guiders.map(g => (
                        <SelectItem
                          key={g.id}
                          value={g.id}
                          className="text-white hover:bg-emerald-900/30 focus:bg-emerald-900/30 cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-6 h-6 rounded-full bg-gradient-to-br ${g.avatar_color} flex items-center justify-center`}
                            >
                              <span className="text-white text-xs font-bold">{g.name[0]}</span>
                            </div>
                            {g.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Capacity */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider" style={{ color: '#6b7280' }}>
                    <Users className="h-3.5 w-3.5 text-emerald-500" />
                    Group Capacity
                  </label>
                  <Input
                    type="number"
                    placeholder="Max participants"
                    value={capacity}
                    onChange={e => setCapacity(e.target.value)}
                    className="h-11 rounded-xl text-white placeholder:text-gray-600 focus-visible:ring-emerald-500/50 focus-visible:ring-2"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}
                    min="1"
                  />
                </div>

                {/* QR Type */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider" style={{ color: '#6b7280' }}>
                    <Shield className="h-3.5 w-3.5 text-emerald-500" />
                    QR Purpose
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setQrType('CHECKIN')}
                      className="relative flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all duration-200"
                      style={{
                        background: qrType === 'CHECKIN'
                          ? 'linear-gradient(135deg, rgba(22,163,74,0.3), rgba(16,185,129,0.15))'
                          : 'rgba(255,255,255,0.04)',
                        border: qrType === 'CHECKIN'
                          ? '1px solid rgba(22,163,74,0.5)'
                          : '1px solid rgba(255,255,255,0.08)',
                        boxShadow: qrType === 'CHECKIN' ? '0 0 12px rgba(22,163,74,0.15)' : 'none',
                      }}
                    >
                      <CheckCircle2
                        className="h-5 w-5"
                        style={{ color: qrType === 'CHECKIN' ? '#4ade80' : '#6b7280' }}
                      />
                      <span
                        className="text-xs font-bold"
                        style={{ color: qrType === 'CHECKIN' ? '#4ade80' : '#6b7280' }}
                      >
                        CHECK-IN
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setQrType('CHECKOUT')}
                      className="relative flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all duration-200"
                      style={{
                        background: qrType === 'CHECKOUT'
                          ? 'linear-gradient(135deg, rgba(245,158,11,0.25), rgba(217,119,6,0.12))'
                          : 'rgba(255,255,255,0.04)',
                        border: qrType === 'CHECKOUT'
                          ? '1px solid rgba(245,158,11,0.4)'
                          : '1px solid rgba(255,255,255,0.08)',
                        boxShadow: qrType === 'CHECKOUT' ? '0 0 12px rgba(245,158,11,0.12)' : 'none',
                      }}
                    >
                      <AlertTriangle
                        className="h-5 w-5"
                        style={{ color: qrType === 'CHECKOUT' ? '#fbbf24' : '#6b7280' }}
                      />
                      <span
                        className="text-xs font-bold"
                        style={{ color: qrType === 'CHECKOUT' ? '#fbbf24' : '#6b7280' }}
                      >
                        CHECK-OUT
                      </span>
                    </button>
                  </div>
                </div>

                {/* Generate Button */}
                <button
                  onClick={handleGenerateQR}
                  disabled={!date || !guiderId || !capacity || isGenerating}
                  className="w-full relative h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed overflow-hidden group"
                  style={{
                    background: 'linear-gradient(135deg, #15803d 0%, #16a34a 50%, #22c55e 100%)',
                    boxShadow: '0 4px 20px rgba(22,163,74,0.35), inset 0 1px 0 rgba(255,255,255,0.1)',
                    color: 'white',
                  }}
                >
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: 'rgba(255,255,255,0.08)' }}
                  />
                  {isGenerating ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Deploying Session...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4" />
                      Deploy QR Session
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Mission Overview mini card */}
            <div
              className="rounded-2xl p-5"
              style={{
                background: 'rgba(10,26,15,0.8)',
                border: '1px solid rgba(255,255,255,0.06)',
                backdropFilter: 'blur(20px)',
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-emerald-400" />
                  Operational Overview
                </h3>
                <span className="text-xs" style={{ color: '#6b7280' }}>Live</span>
              </div>

              <div className="space-y-3">
                {[
                  {
                    label: 'Check-In Sessions',
                    count: qrList.filter(q => (q.qr_type ?? 'CHECKIN') === 'CHECKIN').length,
                    color: '#4ade80',
                    bg: 'rgba(22,163,74,0.1)',
                  },
                  {
                    label: 'Check-Out Sessions',
                    count: qrList.filter(q => (q.qr_type ?? '') === 'CHECKOUT').length,
                    color: '#fbbf24',
                    bg: 'rgba(245,158,11,0.1)',
                  },
                  {
                    label: 'Inactive Sessions',
                    count: qrList.filter(q => q.status === 'Inactive').length,
                    color: '#6b7280',
                    bg: 'rgba(107,114,128,0.1)',
                  },
                ].map(item => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                    style={{ background: item.bg, border: `1px solid ${item.color}20` }}
                  >
                    <span className="text-xs font-medium" style={{ color: '#9ca3af' }}>{item.label}</span>
                    <span className="text-sm font-bold" style={{ color: item.color }}>{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ════════════════════════════
              RIGHT — TABS (Preview + Sessions)
          ════════════════════════════ */}
          <div className="lg:col-span-8">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">

              {/* Tab Nav */}
              <div
                className="flex gap-1 p-1 rounded-2xl mb-4"
                style={{
                  background: 'rgba(10,26,15,0.8)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                {[
                  { value: 'preview', label: 'QR Preview', icon: Eye },
                  { value: 'sessions', label: 'All Sessions', icon: Clock },
                ].map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.value;
                  return (
                    <button
                      key={tab.value}
                      onClick={() => setActiveTab(tab.value)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-200"
                      style={{
                        background: isActive
                          ? 'linear-gradient(135deg, #15803d, #16a34a)'
                          : 'transparent',
                        color: isActive ? 'white' : '#6b7280',
                        boxShadow: isActive ? '0 2px 12px rgba(22,163,74,0.3)' : 'none',
                      }}
                    >
                      <Icon className="h-4 w-4" />
                      {tab.label}
                      {tab.value === 'sessions' && qrList.length > 0 && (
                        <span
                          className="px-1.5 py-0.5 rounded-full text-xs font-bold"
                          style={{
                            background: isActive ? 'rgba(255,255,255,0.2)' : 'rgba(22,163,74,0.2)',
                            color: isActive ? 'white' : '#4ade80',
                          }}
                        >
                          {qrList.length}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* ─── QR PREVIEW TAB ─── */}
              <TabsContent value="preview" className="mt-0">
                <div
                  className="rounded-2xl overflow-hidden"
                  style={{
                    background: 'rgba(10,26,15,0.8)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    backdropFilter: 'blur(20px)',
                    minHeight: '520px',
                  }}
                >
                  {qrValue ? (
                    <div className="p-8 flex flex-col items-center justify-center gap-6">
                      {/* Mode Badge */}
                      <div
                        className="flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold"
                        style={
                          qrValue.includes('CHECKIN')
                            ? {
                                background: 'linear-gradient(135deg, rgba(22,163,74,0.25), rgba(16,185,129,0.15))',
                                border: '1px solid rgba(22,163,74,0.4)',
                                color: '#4ade80',
                                boxShadow: '0 0 20px rgba(22,163,74,0.15)',
                              }
                            : {
                                background: 'linear-gradient(135deg, rgba(245,158,11,0.25), rgba(217,119,6,0.15))',
                                border: '1px solid rgba(245,158,11,0.4)',
                                color: '#fbbf24',
                                boxShadow: '0 0 20px rgba(245,158,11,0.12)',
                              }
                        }
                      >
                        {qrValue.includes('CHECKIN') ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <AlertTriangle className="h-4 w-4" />
                        )}
                        {qrValue.includes('CHECKIN') ? 'CHECK-IN Mode — Active' : 'CHECK-OUT Mode — Active'}
                      </div>

                      {/* QR Code Frame */}
                      <div className="relative">
                        <div
                          className="absolute inset-0 rounded-3xl"
                          style={{
                            background: qrValue.includes('CHECKIN')
                              ? 'rgba(22,163,74,0.15)'
                              : 'rgba(245,158,11,0.12)',
                            filter: 'blur(20px)',
                            transform: 'scale(1.1)',
                          }}
                        />
                        <div
                          className="relative p-6 rounded-2xl"
                          style={{
                            background: 'white',
                            boxShadow: qrValue.includes('CHECKIN')
                              ? '0 8px 40px rgba(22,163,74,0.25), 0 0 0 1px rgba(22,163,74,0.2)'
                              : '0 8px 40px rgba(245,158,11,0.2), 0 0 0 1px rgba(245,158,11,0.2)',
                          }}
                        >
                          <QRCode
                            value={qrValue}
                            size={220}
                            bgColor="#ffffff"
                            fgColor="#0d2016"
                            level="H"
                          />
                        </div>

                        {/* Corner decorators */}
                        {['top-0 left-0', 'top-0 right-0', 'bottom-0 left-0', 'bottom-0 right-0'].map((pos, i) => (
                          <div
                            key={i}
                            className={`absolute ${pos} w-6 h-6`}
                            style={{
                              background: qrValue.includes('CHECKIN') ? '#16a34a' : '#d97706',
                              borderRadius: i === 0 ? '6px 0 0 0' : i === 1 ? '0 6px 0 0' : i === 2 ? '0 0 0 6px' : '0 0 6px 0',
                              opacity: 0.6,
                            }}
                          />
                        ))}
                      </div>

                      {/* Instructions */}
                      <div
                        className="text-center max-w-sm px-4 py-3 rounded-xl"
                        style={{
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.06)',
                        }}
                      >
                        <p className="text-sm leading-relaxed" style={{ color: '#9ca3af' }}>
                          Display this QR at the {qrValue.includes('CHECKIN') ? 'trail entry' : 'trail exit'} checkpoint.
                          Valid for the assigned hiking date only.
                        </p>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-3">
                        <button
                          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 hover:opacity-80"
                          style={{
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: '#d1d5db',
                          }}
                        >
                          <Download className="h-4 w-4" />
                          Download
                        </button>
                        <button
                          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 hover:opacity-80"
                          style={{
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: '#d1d5db',
                          }}
                        >
                          <Copy className="h-4 w-4" />
                          Copy Value
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Empty State */
                    <div className="flex flex-col items-center justify-center h-full min-h-[480px] p-8">
                      <div className="relative mb-8">
                        <div
                          className="w-36 h-36 rounded-3xl flex flex-col items-center justify-center"
                          style={{
                            background: 'rgba(255,255,255,0.03)',
                            border: '2px dashed rgba(255,255,255,0.1)',
                          }}
                        >
                          <QrCode className="h-14 w-14 mb-2" style={{ color: '#374151' }} />
                          <TreePine className="h-6 w-6" style={{ color: '#1f4a28' }} />
                        </div>
                        <div
                          className="absolute -inset-4 rounded-3xl opacity-20"
                          style={{
                            background: 'radial-gradient(circle, rgba(22,163,74,0.3) 0%, transparent 70%)',
                            filter: 'blur(10px)',
                          }}
                        />
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-2">No QR Selected</h3>
                      <p className="text-sm text-center max-w-xs" style={{ color: '#6b7280' }}>
                        Generate a new session from the form, or select an active session from the Sessions tab to preview its QR code.
                      </p>
                      <button
                        onClick={() => setActiveTab('sessions')}
                        className="mt-5 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                        style={{
                          background: 'rgba(22,163,74,0.1)',
                          border: '1px solid rgba(22,163,74,0.2)',
                          color: '#4ade80',
                        }}
                      >
                        View Sessions <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* ─── SESSIONS TAB ─── */}
              <TabsContent value="sessions" className="mt-0">
                <div
                  className="rounded-2xl overflow-hidden"
                  style={{
                    background: 'rgba(10,26,15,0.8)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    backdropFilter: 'blur(20px)',
                  }}
                >
                  {/* Sessions Header */}
                  <div
                    className="px-6 py-4 flex items-center justify-between"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                  >
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-emerald-400" />
                      <span className="text-sm font-semibold text-white">All QR Sessions</span>
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-bold"
                        style={{ background: 'rgba(22,163,74,0.15)', color: '#4ade80' }}
                      >
                        {qrList.length}
                      </span>
                    </div>
                    <div className="text-xs" style={{ color: '#6b7280' }}>
                      {activeSessions.length} active · {qrList.length - activeSessions.length} inactive
                    </div>
                  </div>

                  <ScrollArea className="h-[520px]">
                    <div className="p-5 space-y-3">
                      {qrList.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                          <Mountain className="h-12 w-12 mb-4" style={{ color: '#1f4a28' }} />
                          <p className="text-white font-medium mb-1">No sessions yet</p>
                          <p className="text-sm" style={{ color: '#6b7280' }}>Generate your first QR session to get started</p>
                        </div>
                      ) : (
                        qrList.map(qr => {
                          const isActive = qr.status === 'Active';
                          const type = qr.qr_type ?? (qr.value.includes('CHECKIN') ? 'CHECKIN' : 'CHECKOUT');
                          const scanPct = Math.min(100, Math.round(((qr.scanned_count || 0) / qr.capacity) * 100));
                          const isNearFull = scanPct >= 80;

                          return (
                            <div
                              key={qr.id}
                              className="group relative rounded-xl p-4 transition-all duration-200"
                              style={{
                                background: isActive
                                  ? 'linear-gradient(135deg, rgba(22,163,74,0.06) 0%, rgba(15,30,20,0.8) 100%)'
                                  : 'rgba(255,255,255,0.02)',
                                border: isActive
                                  ? '1px solid rgba(22,163,74,0.2)'
                                  : '1px solid rgba(255,255,255,0.06)',
                              }}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center gap-4">

                                {/* Left: Guide info */}
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  {/* Status dot + QR icon */}
                                  <div className="relative flex-shrink-0">
                                    <div
                                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                                      style={{
                                        background: isActive
                                          ? 'linear-gradient(135deg, rgba(22,163,74,0.25), rgba(16,185,129,0.1))'
                                          : 'rgba(255,255,255,0.05)',
                                        border: isActive
                                          ? '1px solid rgba(22,163,74,0.3)'
                                          : '1px solid rgba(255,255,255,0.06)',
                                      }}
                                    >
                                      <QrCode
                                        className="h-5 w-5"
                                        style={{ color: isActive ? '#4ade80' : '#4b5563' }}
                                      />
                                    </div>
                                    <div
                                      className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full ${isActive ? 'animate-pulse' : ''}`}
                                      style={{
                                        background: isActive ? '#4ade80' : '#374151',
                                        boxShadow: isActive ? '0 0 6px #4ade80' : 'none',
                                      }}
                                    />
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-semibold text-white truncate">
                                        {qr.guider?.name || '—'}
                                      </span>
                                      {/* Type badge */}
                                      <span
                                        className="px-2 py-0.5 rounded-md text-xs font-bold flex-shrink-0"
                                        style={
                                          type === 'CHECKIN'
                                            ? {
                                                background: 'rgba(22,163,74,0.15)',
                                                border: '1px solid rgba(22,163,74,0.25)',
                                                color: '#4ade80',
                                              }
                                            : {
                                                background: 'rgba(245,158,11,0.12)',
                                                border: '1px solid rgba(245,158,11,0.25)',
                                                color: '#fbbf24',
                                              }
                                        }
                                      >
                                        {type === 'CHECKIN' ? '↓ IN' : '↑ OUT'}
                                      </span>
                                      {/* Status badge */}
                                      {!isActive && (
                                        <span
                                          className="px-2 py-0.5 rounded-md text-xs font-medium flex-shrink-0"
                                          style={{
                                            background: 'rgba(75,85,99,0.2)',
                                            border: '1px solid rgba(75,85,99,0.3)',
                                            color: '#6b7280',
                                          }}
                                        >
                                          Inactive
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-3 mt-1">
                                      <span className="text-xs flex items-center gap-1" style={{ color: '#6b7280' }}>
                                        <Calendar className="h-3 w-3" />
                                        {formatDate(qr.date)}
                                      </span>
                                      <span className="text-xs flex items-center gap-1" style={{ color: '#6b7280' }}>
                                        <Users className="h-3 w-3" />
                                        {qr.scanned_count || 0}/{qr.capacity}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Right: Progress + Actions */}
                                <div className="flex flex-col gap-2 sm:min-w-[200px]">
                                  {/* Progress bar */}
                                  <div>
                                    <div className="flex justify-between items-center mb-1">
                                      <span className="text-xs" style={{ color: '#6b7280' }}>Capacity</span>
                                      <span
                                        className="text-xs font-bold"
                                        style={{ color: isNearFull ? '#fb923c' : '#9ca3af' }}
                                      >
                                        {scanPct}%
                                      </span>
                                    </div>
                                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                                      <div
                                        className={`h-full rounded-full transition-all duration-500 ${getProgressColor(qr.scanned_count || 0, qr.capacity)}`}
                                        style={{ width: `${scanPct}%` }}
                                      />
                                    </div>
                                  </div>

                                  {/* Action buttons */}
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {/* Copy ID */}
                                    <button
                                      onClick={() => handleCopyId(qr.id)}
                                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 hover:opacity-80"
                                      style={{
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        color: '#9ca3af',
                                      }}
                                    >
                                      {copiedId === qr.id ? (
                                        <Check className="h-3 w-3 text-emerald-400" />
                                      ) : (
                                        <Copy className="h-3 w-3" />
                                      )}
                                      {copiedId === qr.id ? 'Copied' : 'ID'}
                                    </button>

                                    {/* Toggle type */}
                                    {isActive && (
                                      <button
                                        onClick={() => handleToggleType(qr)}
                                        disabled={togglingId === qr.id}
                                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 hover:opacity-80 disabled:opacity-50"
                                        style={
                                          type === 'CHECKIN'
                                            ? {
                                                background: 'rgba(22,163,74,0.12)',
                                                border: '1px solid rgba(22,163,74,0.2)',
                                                color: '#4ade80',
                                              }
                                            : {
                                                background: 'rgba(245,158,11,0.1)',
                                                border: '1px solid rgba(245,158,11,0.2)',
                                                color: '#fbbf24',
                                              }
                                        }
                                      >
                                        {togglingId === qr.id ? (
                                          <div className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
                                        ) : (
                                          <ArrowLeftRight className="h-3 w-3" />
                                        )}
                                        {type}
                                      </button>
                                    )}

                                    {/* View QR */}
                                    <button
                                      onClick={() => handleDisplayQR(qr)}
                                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 hover:opacity-80"
                                      style={{
                                        background: 'rgba(59,130,246,0.12)',
                                        border: '1px solid rgba(59,130,246,0.2)',
                                        color: '#60a5fa',
                                      }}
                                    >
                                      <Eye className="h-3 w-3" />
                                      View
                                    </button>

                                    {/* Deactivate */}
                                    {isActive && (
                                      <button
                                        onClick={() => handleUnactiveQR(qr.id)}
                                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 hover:opacity-80"
                                        style={{
                                          background: 'rgba(239,68,68,0.1)',
                                          border: '1px solid rgba(239,68,68,0.2)',
                                          color: '#f87171',
                                        }}
                                      >
                                        <PowerOff className="h-3 w-3" />
                                        End
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </TabsContent>

            </Tabs>
          </div>
        </div>

        {/* FOOTER */}
        <div
          className="mt-8 pt-5 flex flex-col sm:flex-row items-center justify-between gap-3"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
        >
          <div className="flex items-center gap-2 text-xs" style={{ color: '#4b5563' }}>
            <Shield className="h-3.5 w-3.5 text-emerald-700" />
            <span>Each QR session is encrypted and single-use per participant.</span>
          </div>
          <div className="flex items-center gap-2 text-xs" style={{ color: '#374151' }}>
            <TreePine className="h-3.5 w-3.5" />
            <span>TRAILGUARD · Gunung Ledang Safety Command</span>
          </div>
        </div>

      </div>
    </div>
  );
}