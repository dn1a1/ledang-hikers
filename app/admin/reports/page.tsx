"use client";

import type { ComponentType, CSSProperties, ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Users,
  UserCheck,
  UserX,
  AlertTriangle,
  CheckCircle,
  Activity,
  Shield,
  TrendingUp,
  RefreshCw,
  Download,
  Calendar,
  Filter,
  MapPin,
  Clock,
} from "lucide-react";

type DateRange = "today" | "week" | "month" | "all";
type IconComponent = ComponentType<{ size?: number; className?: string; style?: CSSProperties }>;

interface KPIData {
  totalHikers: number;
  totalCheckins: number;
  totalCheckouts: number;
  completionRate: number;
  totalEmergencies: number;
  activeEmergencies: number;
  resolvedEmergencies: number;
  totalGuiders: number;
}

interface EmergencyRow {
  id: string;
  hiker_name: string;
  emergency_type: string | null;
  status: string | null;
  created_at: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface TrendPoint {
  date: string;
  count: number;
}

interface CheckpointStat {
  name: string;
  hikers: number;
  latest: string | null;
}

interface GuiderStat {
  id: string;
  name: string;
  total_sessions: number;
  total_hikers: number;
  last_active: string | null;
}

interface SessionRow {
  id: string;
  qr_type: string | null;
  guider_name: string;
  created_at: string | null;
  status: string | null;
  total_hikers: number;
}

interface SessionOptionRow {
  id: string | null;
  created_at: string | null;
}

interface GuiderOptionRow {
  id: string | null;
  name: string | null;
}

interface DeclarationStatusRow {
  status: string | null;
  checkout_at?: string | null;
  checked_out?: boolean | null;
}

interface EmergencyStatusRow {
  status: string | null;
  created_at: string | null;
}

interface EmergencyRawRow extends EmergencyStatusRow {
  id: string | null;
  hiker_id: string | null;
  emergency_type: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface HikerNameRow {
  id: string | null;
  name: string | null;
}

interface CheckpointLogRow {
  checkpoint_id: string | null;
  hiker_id: string | null;
  created_at: string | null;
}

interface CheckpointRow {
  id: string | null;
  name: string | null;
}

interface GuiderRow {
  id: string | null;
  name: string | null;
}

interface QrSessionRow {
  id: string | null;
  qr_type?: string | null;
  guider_id: string | null;
  created_at: string | null;
  status: string | null;
}

interface LokasiPendakiRow {
  hiker_id: string | null;
  guider_id: string | null;
  session_id: string | null;
}

interface PieLabelProps {
  name?: string | number;
  percent?: number;
}

function getDateFilter(range: DateRange): string | null {
  const now = new Date();
  if (range === "today") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return start.toISOString();
  }
  if (range === "week") {
    const start = new Date(now);
    start.setDate(now.getDate() - 7);
    return start.toISOString();
  }
  if (range === "month") {
    const start = new Date(now);
    start.setMonth(now.getMonth() - 1);
    return start.toISOString();
  }
  return null;
}

function groupByDate(rows: Array<{ created_at: string | null | undefined }>): TrendPoint[] {
  const map: Record<string, number> = {};
  for (const row of rows) {
    if (!row?.created_at) continue;
    const date = row.created_at.slice(0, 10);
    map[date] = (map[date] ?? 0) + 1;
  }
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));
}

function fmt(val: string | null | undefined): string {
  if (!val) return "-";
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? val : d.toLocaleString("en-MY", { dateStyle: "medium", timeStyle: "short" });
}

function fmtDate(val: string | null | undefined): string {
  if (!val) return "-";
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? val : d.toLocaleDateString("en-MY", { dateStyle: "medium" });
}

function isFiniteNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function formatCoord(value: number | null): string {
  return isFiniteNumber(value) ? value.toFixed(5) : "-";
}

function formatPieLabel({ name, percent }: PieLabelProps): string {
  const safeName = String(name ?? "Unknown");
  const safePercent = Number.isFinite(percent) ? percent ?? 0 : 0;
  return `${safeName} ${(safePercent * 100).toFixed(0)}%`;
}

function safeCount(value: number | null): number {
  return Number.isFinite(value) ? value ?? 0 : 0;
}

const COLORS = ["#22c55e", "#f97316", "#ef4444", "#3b82f6", "#a855f7", "#eab308"];

const STATUS_COLOR: Record<string, string> = {
  active: "#ef4444",
  open: "#ef4444",
  pending: "#f97316",
  resolved: "#22c55e",
  closed: "#22c55e",
  acknowledged: "#3b82f6",
};

function KPICard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  loading,
}: {
  icon: IconComponent;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  loading: boolean;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl bg-white border border-slate-100 shadow-sm p-5 flex flex-col gap-3"
      style={{ borderLeft: `4px solid ${color}` }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">{label}</span>
        <span className="p-2 rounded-xl" style={{ background: `${color}18` }}>
          <Icon size={16} style={{ color }} />
        </span>
      </div>
      {loading ? (
        <div className="h-8 w-20 rounded-lg bg-slate-100 animate-pulse" />
      ) : (
        <span className="text-3xl font-black tracking-tight text-slate-800">{value}</span>
      )}
      {sub && <span className="text-xs text-slate-400">{sub}</span>}
    </div>
  );
}

function SectionCard({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-50">
        <h3 className="text-sm font-bold text-slate-700 tracking-wide uppercase">{title}</h3>
        {action}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  const s = (status ?? "unknown").toLowerCase();
  const color = STATUS_COLOR[s] ?? "#94a3b8";
  return (
    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold" style={{ background: `${color}18`, color }}>
      {status ?? "Unknown"}
    </span>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-slate-300 gap-2">
      <Activity size={32} />
      <p className="text-sm">{message}</p>
    </div>
  );
}

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState<DateRange>("month");
  const [sessionFilter, setSessionFilter] = useState<string>("all");
  const [guiderFilter, setGuiderFilter] = useState<string>("all");

  const [sessionOptions, setSessionOptions] = useState<{ id: string; label: string }[]>([]);
  const [guiderOptions, setGuiderOptions] = useState<{ id: string; name: string }[]>([]);

  const [kpi, setKpi] = useState<KPIData | null>(null);
  const [emergencyRows, setEmergencyRows] = useState<EmergencyRow[]>([]);
  const [emergencyByStatus, setEmergencyByStatus] = useState<{ name: string; value: number }[]>([]);
  const [emergencyTrend, setEmergencyTrend] = useState<TrendPoint[]>([]);
  const [hikingTrend, setHikingTrend] = useState<TrendPoint[]>([]);
  const [checkpointStats, setCheckpointStats] = useState<CheckpointStat[]>([]);
  const [guiderStats, setGuiderStats] = useState<GuiderStat[]>([]);
  const [sessionRows, setSessionRows] = useState<SessionRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadOptions() {
      const [{ data: sessions, error: sessionsError }, { data: guiders, error: guidersError }] = await Promise.all([
        supabase.from("qr_sessions").select("id, qr_type, created_at").order("created_at", { ascending: false }).limit(100),
        supabase.from("guiders").select("id, name"),
      ]);

      if (sessionsError) console.error("qr_sessions options error:", sessionsError);
      if (guidersError) console.error("guiders options error:", guidersError);
      if (!mounted) return;

      const safeSessions = (sessions ?? []) as SessionOptionRow[];
      const safeGuiders = (guiders ?? []) as GuiderOptionRow[];

      setSessionOptions(
        safeSessions
          .filter((s): s is SessionOptionRow & { id: string } => Boolean(s?.id))
          .map((s) => ({
            id: s.id,
            label: `Session ${String(s.id).slice(0, 8)} - ${fmtDate(s.created_at)}`,
          }))
      );
      setGuiderOptions(
        safeGuiders
          .filter((g): g is GuiderOptionRow & { id: string } => Boolean(g?.id))
          .map((g) => ({ id: g.id, name: g.name ?? "Unknown" }))
      );
    }

    void loadOptions();

    return () => {
      mounted = false;
    };
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const since = getDateFilter(dateRange);

      const [
        hikersCountResponse,
        checkinsCountResponse,
        emergenciesCountResponse,
        guidersCountResponse,
        emergencyAllResponse,
        declarationsResponse,
      ] = await Promise.all([
        supabase.from("hikers").select("*", { count: "exact", head: true }),
        since
          ? supabase.from("declarations").select("*", { count: "exact", head: true }).gte("created_at", since)
          : supabase.from("declarations").select("*", { count: "exact", head: true }),
        since
          ? supabase.from("emergency_alerts").select("*", { count: "exact", head: true }).gte("created_at", since)
          : supabase.from("emergency_alerts").select("*", { count: "exact", head: true }),
        supabase.from("guiders").select("*", { count: "exact", head: true }),
        since
          ? supabase.from("emergency_alerts").select("status, created_at").gte("created_at", since)
          : supabase.from("emergency_alerts").select("status, created_at"),
        since
          ? supabase.from("declarations").select("status, checkout_at, checked_out").gte("created_at", since)
          : supabase.from("declarations").select("status, checkout_at, checked_out"),
      ]);

      if (hikersCountResponse.error) console.error("hikers count error:", hikersCountResponse.error);
      if (checkinsCountResponse.error) console.error("declarations count error:", checkinsCountResponse.error);
      if (emergenciesCountResponse.error) console.error("emergency_alerts count error:", emergenciesCountResponse.error);
      if (guidersCountResponse.error) console.error("guiders count error:", guidersCountResponse.error);
      if (emergencyAllResponse.error) console.error("emergency_alerts stats error:", emergencyAllResponse.error);
      if (declarationsResponse.error) console.error("declarations stats error:", declarationsResponse.error);

      const emergencyAll = (emergencyAllResponse.data ?? []) as EmergencyStatusRow[];
      const declarations = (declarationsResponse.data ?? []) as DeclarationStatusRow[];

      let totalCheckouts = 0;
      for (const d of declarations) {
        const hasCheckout =
          d?.checkout_at != null ||
          d?.checked_out === true ||
          (typeof d?.status === "string" && ["checked_out", "completed", "done"].includes(d.status.toLowerCase()));
        if (hasCheckout) totalCheckouts++;
      }

      const activeEmergencies = emergencyAll.filter((e) =>
        ["active", "open", "pending"].includes((e?.status ?? "").toLowerCase())
      ).length;
      const resolvedEmergencies = emergencyAll.filter((e) =>
        ["resolved", "closed", "acknowledged"].includes((e?.status ?? "").toLowerCase())
      ).length;

      const totalCheckins = safeCount(checkinsCountResponse.count);
      const completionRate = totalCheckins > 0 ? Math.round((totalCheckouts / totalCheckins) * 100) : 0;

      setKpi({
        totalHikers: safeCount(hikersCountResponse.count),
        totalCheckins,
        totalCheckouts,
        completionRate: Number.isFinite(completionRate) ? completionRate : 0,
        totalEmergencies: safeCount(emergenciesCountResponse.count),
        activeEmergencies,
        resolvedEmergencies,
        totalGuiders: safeCount(guidersCountResponse.count),
      });

      const statusMap: Record<string, number> = {};
      for (const e of emergencyAll) {
        const s = e?.status ?? "Unknown";
        statusMap[s] = (statusMap[s] ?? 0) + 1;
      }
      setEmergencyByStatus(Object.entries(statusMap).map(([name, value]) => ({ name, value })));
      setEmergencyTrend(groupByDate(emergencyAll));

      const emergencyQuery = supabase
        .from("emergency_alerts")
        .select("id, hiker_id, emergency_type, status, created_at, latitude, longitude");
      const { data: emergencyData, error: eErr } = await (since ? emergencyQuery.gte("created_at", since) : emergencyQuery)
        .order("created_at", { ascending: false })
        .limit(50);
      if (eErr) console.error("emergency_alerts error:", eErr);

      const emergencyRaw = (emergencyData ?? []) as EmergencyRawRow[];
      if (emergencyRaw.length > 0) {
        const hikerIds = [...new Set(emergencyRaw.map((e) => e?.hiker_id).filter((id): id is string => Boolean(id)))];
        const { data: hikerNameData, error: hikerNameError } =
          hikerIds.length > 0
            ? await supabase.from("hikers").select("id, name").in("id", hikerIds)
            : { data: [] as HikerNameRow[], error: null };
        if (hikerNameError) console.error("hikers lookup error:", hikerNameError);

        const hikerNames = (hikerNameData ?? []) as HikerNameRow[];
        const nameMap: Record<string, string> = {};
        for (const h of hikerNames) {
          if (h?.id) nameMap[h.id] = h.name ?? "-";
        }

        setEmergencyRows(
          emergencyRaw.map((e, index) => ({
            id: e?.id ?? `emergency-${index}`,
            hiker_name: e?.hiker_id ? nameMap[e.hiker_id] ?? "Unknown" : "Unknown",
            emergency_type: e?.emergency_type ?? null,
            status: e?.status ?? null,
            created_at: e?.created_at ?? null,
            latitude: isFiniteNumber(e?.latitude) ? e.latitude : null,
            longitude: isFiniteNumber(e?.longitude) ? e.longitude : null,
          }))
        );
      } else {
        setEmergencyRows([]);
      }

      const declarationsQuery = supabase.from("declarations").select("created_at");
      const { data: declData, error: dErr } = await (since ? declarationsQuery.gte("created_at", since) : declarationsQuery).order(
        "created_at",
        { ascending: true }
      );
      if (dErr) console.error("declarations error:", dErr);
      setHikingTrend(groupByDate((declData ?? []) as Array<{ created_at: string | null }>));

      const { data: checkpointLogs, error: clErr } = await supabase
        .from("checkpoint_logs")
        .select("checkpoint_id, hiker_id, created_at");
      if (clErr) console.error("checkpoint_logs error:", clErr);

      const { data: checkpoints, error: cpErr } = await supabase.from("checkpoints").select("id, name");
      if (cpErr) console.error("checkpoints error:", cpErr);

      const cpMap: Record<string, string> = {};
      for (const cp of (checkpoints ?? []) as CheckpointRow[]) {
        if (cp?.id) cpMap[cp.id] = cp.name ?? cp.id;
      }

      const cpStats: Record<string, { hikers: Set<string>; latest: string | null }> = {};
      for (const log of (checkpointLogs ?? []) as CheckpointLogRow[]) {
        const checkpointId = log?.checkpoint_id;
        if (!checkpointId) continue;
        if (!cpStats[checkpointId]) cpStats[checkpointId] = { hikers: new Set(), latest: null };
        if (log?.hiker_id) cpStats[checkpointId].hikers.add(log.hiker_id);
        if (log?.created_at) {
          const curr = cpStats[checkpointId].latest;
          if (!curr || log.created_at > curr) cpStats[checkpointId].latest = log.created_at;
        }
      }
      setCheckpointStats(
        Object.entries(cpStats)
          .map(([id, stat]) => ({
            name: cpMap[id] ?? `CP-${id.slice(0, 6)}`,
            hikers: stat.hikers.size,
            latest: stat.latest,
          }))
          .sort((a, b) => b.hikers - a.hikers)
      );

      const { data: guidersData, error: gErr } = await supabase.from("guiders").select("id, name, user_id");
      if (gErr) console.error("guiders error:", gErr);

      const { data: qrSessions, error: qErr } = await supabase.from("qr_sessions").select("id, guider_id, created_at, status");
      if (qErr) console.error("qr_sessions error:", qErr);

      const { data: lokasiData, error: lErr } = await supabase.from("lokasi_pendaki").select("hiker_id, guider_id, session_id");
      if (lErr) console.error("lokasi_pendaki error:", lErr);

      const guiders = (guidersData ?? []) as GuiderRow[];
      const allQrSessions = (qrSessions ?? []) as QrSessionRow[];
      const lokasiRows = (lokasiData ?? []) as LokasiPendakiRow[];
      const guiderPerf: Record<string, { name: string; sessions: Set<string>; hikers: Set<string>; last_active: string | null }> = {};

      for (const g of guiders) {
        if (!g?.id) continue;
        guiderPerf[g.id] = { name: g.name ?? "Unknown", sessions: new Set(), hikers: new Set(), last_active: null };
      }
      for (const s of allQrSessions) {
        if (!s?.guider_id || !guiderPerf[s.guider_id]) continue;
        if (s.id) guiderPerf[s.guider_id].sessions.add(s.id);
        if (s.created_at) {
          const curr = guiderPerf[s.guider_id].last_active;
          if (!curr || s.created_at > curr) guiderPerf[s.guider_id].last_active = s.created_at;
        }
      }
      for (const l of lokasiRows) {
        if (!l?.guider_id || !guiderPerf[l.guider_id]) continue;
        if (l.hiker_id) guiderPerf[l.guider_id].hikers.add(l.hiker_id);
      }
      setGuiderStats(
        Object.entries(guiderPerf)
          .map(([id, g]) => ({
            id,
            name: g.name,
            total_sessions: g.sessions.size,
            total_hikers: g.hikers.size,
            last_active: g.last_active,
          }))
          .sort((a, b) => b.total_sessions - a.total_sessions)
      );

      const guiderNameMap: Record<string, string> = {};
      for (const g of guiders) {
        if (g?.id) guiderNameMap[g.id] = g.name ?? "Unknown";
      }

      const hikerCountPerSession: Record<string, number> = {};
      for (const l of lokasiRows) {
        if (!l?.session_id) continue;
        hikerCountPerSession[l.session_id] = (hikerCountPerSession[l.session_id] ?? 0) + 1;
      }

      let sessionsQuery = supabase.from("qr_sessions").select("id, qr_type, guider_id, created_at, status");
      if (since) sessionsQuery = sessionsQuery.gte("created_at", since);
      if (guiderFilter !== "all") sessionsQuery = sessionsQuery.eq("guider_id", guiderFilter);
      if (sessionFilter !== "all") sessionsQuery = sessionsQuery.eq("id", sessionFilter);

      const { data: sessionsRawData, error: sErr } = await sessionsQuery.order("created_at", { ascending: false }).limit(50);
      if (sErr) console.error("qr_sessions error:", sErr);

      const sessionsRaw = (sessionsRawData ?? []) as QrSessionRow[];
      setSessionRows(
        sessionsRaw.map((s, index) => ({
          id: s?.id ?? `session-${index}`,
          qr_type: s?.qr_type ?? null,
          guider_name: s?.guider_id ? guiderNameMap[s.guider_id] ?? "Unknown" : "Unknown",
          created_at: s?.created_at ?? null,
          status: s?.status ?? null,
          total_hikers: s?.id ? hikerCountPerSession[s.id] ?? 0 : 0,
        }))
      );
    } catch (err) {
      console.error("Reports page error:", err);
      setError("Failed to load report data. Check console for details.");
    } finally {
      setLoading(false);
    }
  }, [dateRange, guiderFilter, sessionFilter]);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  const dateOptions: { label: string; value: DateRange }[] = [
    { label: "Today", value: "today" },
    { label: "This Week", value: "week" },
    { label: "This Month", value: "month" },
    { label: "All Time", value: "all" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <div className="bg-white border-b border-slate-100 px-6 py-6">
        <div className="max-w-screen-xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <TrendingUp className="text-emerald-500" size={24} />
                Reports &amp; Analytics
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Review hiking activities, emergency statistics, checkpoint progress, and safety performance.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchAll}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
              >
                <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                Refresh
              </button>
              <button
                onClick={() => {
                  console.log("Export Report clicked - placeholder");
                  alert("Export Report feature coming soon.");
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-emerald-500 hover:bg-emerald-600 text-white transition-colors"
              >
                <Download size={14} />
                Export Report
              </button>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
              {dateOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setDateRange(opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    dateRange === opt.value ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-1.5">
              <Filter size={12} className="text-slate-400" />
              <select
                value={sessionFilter}
                onChange={(e) => setSessionFilter(e.target.value)}
                className="text-xs text-slate-600 bg-transparent outline-none cursor-pointer max-w-[160px]"
              >
                <option value="all">All Sessions</option>
                {sessionOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-1.5">
              <Users size={12} className="text-slate-400" />
              <select
                value={guiderFilter}
                onChange={(e) => setGuiderFilter(e.target.value)}
                className="text-xs text-slate-600 bg-transparent outline-none cursor-pointer max-w-[160px]"
              >
                <option value="all">All Guiders</option>
                {guiderOptions.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-8 space-y-8">
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 flex items-center gap-2">
            <AlertTriangle size={16} />
            {error}
          </div>
        )}

        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Overview</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <KPICard icon={Users} label="Total Hikers" value={kpi?.totalHikers ?? "-"} color="#22c55e" loading={loading} />
            <KPICard icon={UserCheck} label="Total Check-ins" value={kpi?.totalCheckins ?? "-"} color="#3b82f6" loading={loading} />
            <KPICard icon={UserX} label="Total Checkouts" value={kpi?.totalCheckouts ?? "-"} color="#a855f7" loading={loading} />
            <KPICard
              icon={CheckCircle}
              label="Completion Rate"
              value={loading ? "-" : `${kpi?.completionRate ?? 0}%`}
              color="#06b6d4"
              loading={loading}
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
            <KPICard icon={AlertTriangle} label="Total Emergencies" value={kpi?.totalEmergencies ?? "-"} color="#ef4444" loading={loading} />
            <KPICard icon={Activity} label="Active Emergencies" value={kpi?.activeEmergencies ?? "-"} color="#f97316" loading={loading} />
            <KPICard icon={Shield} label="Resolved Emergencies" value={kpi?.resolvedEmergencies ?? "-"} color="#10b981" loading={loading} />
            <KPICard icon={Users} label="Total Guiders" value={kpi?.totalGuiders ?? "-"} color="#8b5cf6" loading={loading} />
          </div>
        </section>

        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Emergency Analysis</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SectionCard title="Emergency by Status">
              {emergencyByStatus.length === 0 ? (
                <EmptyState message="No emergency data" />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={emergencyByStatus}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      dataKey="value"
                      nameKey="name"
                      label={formatPieLabel}
                      labelLine={false}
                    >
                      {emergencyByStatus.map((entry, i) => (
                        <Cell key={entry.name} fill={STATUS_COLOR[entry.name.toLowerCase()] ?? COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </SectionCard>

            <SectionCard title="Emergency Trend">
              {emergencyTrend.length === 0 ? (
                <EmptyState message="No emergency trend data" />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={emergencyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="#ef4444" strokeWidth={2} dot={false} name="Emergencies" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </SectionCard>
          </div>

          <div className="mt-6">
            <SectionCard title="Emergency Cases">
              {emergencyRows.length === 0 ? (
                <EmptyState message="No emergency cases" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left border-b border-slate-100">
                        {["Hiker", "Type", "Status", "Date / Time", "Lat", "Long"].map((h) => (
                          <th key={h} className="pb-3 pr-4 text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {emergencyRows.map((row) => (
                        <tr key={row.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                          <td className="py-3 pr-4 font-medium text-slate-700 whitespace-nowrap">{row.hiker_name}</td>
                          <td className="py-3 pr-4 text-slate-500 whitespace-nowrap">{row.emergency_type ?? "-"}</td>
                          <td className="py-3 pr-4">
                            <StatusBadge status={row.status} />
                          </td>
                          <td className="py-3 pr-4 text-slate-500 whitespace-nowrap text-xs">{fmt(row.created_at)}</td>
                          <td className="py-3 pr-4 text-slate-400 text-xs font-mono">{formatCoord(row.latitude)}</td>
                          <td className="py-3 text-slate-400 text-xs font-mono">{formatCoord(row.longitude)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>
          </div>
        </section>

        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Hiking Activity</h2>
          <SectionCard title="Check-in Trend">
            {hikingTrend.length === 0 ? (
              <EmptyState message="No activity data" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={hikingTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#22c55e" radius={[4, 4, 0, 0]} name="Check-ins" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </SectionCard>
        </section>

        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Checkpoint Analytics</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SectionCard title="Hikers Reached Per Checkpoint">
              {checkpointStats.length === 0 ? (
                <EmptyState message="No checkpoint data" />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={checkpointStats} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                    <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 11, fill: "#64748b" }} />
                    <Tooltip />
                    <Bar dataKey="hikers" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Hikers" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </SectionCard>

            <SectionCard title="Checkpoint Details">
              {checkpointStats.length === 0 ? (
                <EmptyState message="No checkpoint data" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left border-b border-slate-100">
                        {["Checkpoint", "Hikers Reached", "Latest Check-in"].map((h) => (
                          <th key={h} className="pb-3 pr-4 text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {checkpointStats.map((cp) => (
                        <tr key={cp.name} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                          <td className="py-3 pr-4 font-medium text-slate-700">
                            <span className="flex items-center gap-1.5">
                              <MapPin size={12} className="text-blue-400" />
                              {cp.name}
                            </span>
                          </td>
                          <td className="py-3 pr-4">
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-xs font-bold">{cp.hikers}</span>
                          </td>
                          <td className="py-3 text-slate-400 text-xs">
                            <span className="flex items-center gap-1">
                              <Clock size={10} />
                              {fmt(cp.latest)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>
          </div>
        </section>

        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Guider Performance</h2>
          <SectionCard title="Guider Performance Report">
            {guiderStats.length === 0 ? (
              <EmptyState message="No guider data" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b border-slate-100">
                      {["Guider", "Total Sessions", "Total Hikers", "Last Active"].map((h) => (
                        <th key={h} className="pb-3 pr-4 text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {guiderStats.map((g) => (
                      <tr key={g.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                        <td className="py-3 pr-4 font-semibold text-slate-700">{g.name}</td>
                        <td className="py-3 pr-4">
                          <span className="px-2 py-0.5 bg-purple-50 text-purple-600 rounded-full text-xs font-bold">{g.total_sessions}</span>
                        </td>
                        <td className="py-3 pr-4">
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold">{g.total_hikers}</span>
                        </td>
                        <td className="py-3 text-slate-400 text-xs">
                          <span className="flex items-center gap-1">
                            <Calendar size={10} />
                            {fmt(g.last_active)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </section>

        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Session Reports</h2>
          <SectionCard title="QR Sessions">
            {sessionRows.length === 0 ? (
              <EmptyState message="No session data" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b border-slate-100">
                      {["Session ID", "QR Type", "Guider", "Created", "Status", "Hikers"].map((h) => (
                        <th key={h} className="pb-3 pr-4 text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sessionRows.map((s) => (
                      <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                        <td className="py-3 pr-4 font-mono text-xs text-slate-500">{String(s.id).slice(0, 12)}...</td>
                        <td className="py-3 pr-4 text-slate-600">{s.qr_type ?? "-"}</td>
                        <td className="py-3 pr-4 text-slate-700 font-medium">{s.guider_name}</td>
                        <td className="py-3 pr-4 text-slate-400 text-xs whitespace-nowrap">{fmtDate(s.created_at)}</td>
                        <td className="py-3 pr-4">
                          <StatusBadge status={s.status} />
                        </td>
                        <td className="py-3">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs font-bold">{s.total_hikers}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </section>
      </div>
    </div>
  );
}
