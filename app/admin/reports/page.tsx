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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
  checked_at: string | null;
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

function hasSupabaseErrorDetails(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const candidate = error as {
    message?: unknown;
    code?: unknown;
    details?: unknown;
    hint?: unknown;
  };

  return [candidate.message, candidate.code, candidate.details, candidate.hint].some(
    (value) => typeof value === "string" && value.trim().length > 0
  );
}

function logQueryWarning(label: string, error: unknown) {
  if (hasSupabaseErrorDetails(error)) {
    console.warn(`${label}:`, error);
  }
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
      className="metric-card relative flex flex-col gap-3 overflow-hidden"
      style={{ borderLeft: `4px solid ${color}` }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase text-muted-foreground">{label}</span>
        <span className="p-2 rounded-xl" style={{ background: `${color}18` }}>
          <Icon size={16} style={{ color }} />
        </span>
      </div>
      {loading ? (
        <div className="h-8 w-20 animate-pulse rounded-lg bg-muted" />
      ) : (
        <span className="text-3xl font-black tracking-tight text-foreground">{value}</span>
      )}
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  );
}

function SectionCard({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="panel-surface">
      <div className="panel-header px-6">
        <h3 className="text-sm font-bold uppercase text-foreground">{title}</h3>
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
    <Badge variant="outline" className="text-xs font-semibold" style={{ background: `${color}18`, color, borderColor: `${color}40` }}>
      {status ?? "Unknown"}
    </Badge>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
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
          ? supabase.from("declarations").select("status").gte("created_at", since)
          : supabase.from("declarations").select("status"),
      ]);

      logQueryWarning("hikers count error", hikersCountResponse.error);
      logQueryWarning("declarations count error", checkinsCountResponse.error);
      logQueryWarning("emergency_alerts count error", emergenciesCountResponse.error);
      logQueryWarning("guiders count error", guidersCountResponse.error);
      logQueryWarning("emergency_alerts stats error", emergencyAllResponse.error);
      logQueryWarning("declarations stats error", declarationsResponse.error);

      const emergencyAll = (emergencyAllResponse.data ?? []) as EmergencyStatusRow[];
      const declarations = (declarationsResponse.data ?? []) as DeclarationStatusRow[];

      let totalCheckouts = 0;
      for (const d of declarations) {
        const hasCheckout =
          typeof d?.status === "string" && ["checked_out", "completed", "done"].includes(d.status.toLowerCase());
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
      logQueryWarning("emergency_alerts error", eErr);

      const emergencyRaw = (emergencyData ?? []) as EmergencyRawRow[];
      if (emergencyRaw.length > 0) {
        const hikerIds = [...new Set(emergencyRaw.map((e) => e?.hiker_id).filter((id): id is string => Boolean(id)))];
      const { data: hikerNameData, error: hikerNameError } =
          hikerIds.length > 0
            ? await supabase.from("hikers").select("id, name").in("id", hikerIds)
            : { data: [] as HikerNameRow[], error: null };
        logQueryWarning("hikers lookup error", hikerNameError);

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
      logQueryWarning("declarations error", dErr);
      setHikingTrend(groupByDate((declData ?? []) as Array<{ created_at: string | null }>));

      const { data: checkpointLogs, error: clErr } = await supabase
        .from("checkpoint_logs")
        .select("checkpoint_id, hiker_id, checked_at");
      logQueryWarning("checkpoint_logs error", clErr);

      const { data: checkpoints, error: cpErr } = await supabase.from("checkpoints").select("id, name");
      logQueryWarning("checkpoints error", cpErr);

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
        if (log?.checked_at) {
          const curr = cpStats[checkpointId].latest;
          if (!curr || log.checked_at > curr) cpStats[checkpointId].latest = log.checked_at;
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
      logQueryWarning("guiders error", gErr);

      const { data: qrSessions, error: qErr } = await supabase.from("qr_sessions").select("id, guider_id, created_at, status");
      logQueryWarning("qr_sessions error", qErr);

      const { data: lokasiData, error: lErr } = await supabase.from("lokasi_pendaki").select("hiker_id, guider_id, session_id");
      logQueryWarning("lokasi_pendaki error", lErr);

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
      logQueryWarning("qr_sessions error", sErr);

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
    <div className="app-shell min-h-screen font-sans">
      <div className="border-b border-border/70 bg-background/70 px-4 py-6 backdrop-blur sm:px-6">
        <div className="mx-auto max-w-screen-xl">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-foreground">
                <TrendingUp className="text-primary" size={24} />
                Reports &amp; Analytics
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Review hiking activities, emergency statistics, checkpoint progress, and safety performance.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={fetchAll} variant="outline" size="sm">
                <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                Refresh
              </Button>
              <Button
                onClick={() => {
                  console.log("Export Report clicked - placeholder");
                  alert("Export Report feature coming soon.");
                }}
                size="sm"
              >
                <Download size={14} />
                Export Report
              </Button>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
            <div className="flex w-full items-center gap-1 rounded-xl border border-border bg-muted/60 p-1 sm:w-auto">
              {dateOptions.map((opt) => (
                <Button
                  key={opt.value}
                  onClick={() => setDateRange(opt.value)}
                  variant={dateRange === opt.value ? "secondary" : "ghost"}
                  size="sm"
                  className="flex-1 sm:flex-none"
                >
                  {opt.label}
                </Button>
              ))}
            </div>

            <div className="flex w-full items-center gap-1.5 sm:w-auto">
              <Filter size={12} className="text-muted-foreground" />
              <Select value={sessionFilter} onValueChange={setSessionFilter}>
                <SelectTrigger className="w-full sm:w-[240px]">
                  <SelectValue placeholder="All Sessions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sessions</SelectItem>
                  {sessionOptions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex w-full items-center gap-1.5 sm:w-auto">
              <Users size={12} className="text-muted-foreground" />
              <Select value={guiderFilter} onValueChange={setGuiderFilter}>
                <SelectTrigger className="w-full sm:w-[220px]">
                  <SelectValue placeholder="All Guiders" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Guiders</SelectItem>
                  {guiderOptions.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-screen-xl space-y-8 px-4 py-8 sm:px-6">
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertTriangle size={16} />
            {error}
          </div>
        )}

        <section>
          <h2 className="mb-4 text-xs font-bold uppercase text-muted-foreground">Overview</h2>
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
          <h2 className="mb-4 text-xs font-bold uppercase text-muted-foreground">Emergency Analysis</h2>
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
                <div className="table-shell">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border/60">
                        {["Hiker", "Type", "Status", "Date / Time", "Lat", "Long"].map((h) => (
                          <TableHead key={h} className="px-4 text-xs font-semibold uppercase text-muted-foreground">
                            {h}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {emergencyRows.map((row) => (
                        <TableRow key={row.id} className="border-border/40 hover:bg-accent/40">
                          <TableCell className="px-4 py-3 font-medium text-foreground">{row.hiker_name}</TableCell>
                          <TableCell className="px-4 py-3 text-muted-foreground">{row.emergency_type ?? "-"}</TableCell>
                          <TableCell className="px-4 py-3">
                            <StatusBadge status={row.status} />
                          </TableCell>
                          <TableCell className="px-4 py-3 text-xs text-muted-foreground">{fmt(row.created_at)}</TableCell>
                          <TableCell className="px-4 py-3 font-mono text-xs text-muted-foreground">{formatCoord(row.latitude)}</TableCell>
                          <TableCell className="px-4 py-3 font-mono text-xs text-muted-foreground">{formatCoord(row.longitude)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </SectionCard>
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-xs font-bold uppercase text-muted-foreground">Hiking Activity</h2>
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
          <h2 className="mb-4 text-xs font-bold uppercase text-muted-foreground">Checkpoint Analytics</h2>
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
                <div className="table-shell">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border/60">
                        {["Checkpoint", "Hikers Reached", "Latest Check-in"].map((h) => (
                          <TableHead key={h} className="px-4 text-xs font-semibold uppercase text-muted-foreground">
                            {h}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {checkpointStats.map((cp) => (
                        <TableRow key={cp.name} className="border-border/40 hover:bg-accent/40">
                          <TableCell className="px-4 py-3 font-medium text-foreground">
                            <span className="flex items-center gap-1.5">
                              <MapPin size={12} className="text-blue-400" />
                              {cp.name}
                            </span>
                          </TableCell>
                          <TableCell className="px-4 py-3">
                            <Badge variant="outline" className="theme-chip-info">
                              {cp.hikers}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-4 py-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock size={10} />
                              {fmt(cp.latest)}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </SectionCard>
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-xs font-bold uppercase text-muted-foreground">Guider Performance</h2>
          <SectionCard title="Guider Performance Report">
            {guiderStats.length === 0 ? (
              <EmptyState message="No guider data" />
            ) : (
              <div className="table-shell">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/60">
                      {["Guider", "Total Sessions", "Total Hikers", "Last Active"].map((h) => (
                        <TableHead key={h} className="px-4 text-xs font-semibold uppercase text-muted-foreground">
                          {h}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {guiderStats.map((g) => (
                      <TableRow key={g.id} className="border-border/40 hover:bg-accent/40">
                        <TableCell className="px-4 py-3 font-semibold text-foreground">{g.name}</TableCell>
                        <TableCell className="px-4 py-3">
                          <Badge variant="outline" className="theme-chip-neutral">
                            {g.total_sessions}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <Badge variant="outline" className="theme-chip-success">
                            {g.total_hikers}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar size={10} />
                            {fmt(g.last_active)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </SectionCard>
        </section>

        <section>
          <h2 className="mb-4 text-xs font-bold uppercase text-muted-foreground">Session Reports</h2>
          <SectionCard title="QR Sessions">
            {sessionRows.length === 0 ? (
              <EmptyState message="No session data" />
            ) : (
              <div className="table-shell">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/60">
                      {["Session ID", "QR Type", "Guider", "Created", "Status", "Hikers"].map((h) => (
                        <TableHead key={h} className="px-4 text-xs font-semibold uppercase text-muted-foreground">
                          {h}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessionRows.map((s) => (
                      <TableRow key={s.id} className="border-border/40 hover:bg-accent/40">
                        <TableCell className="px-4 py-3 font-mono text-xs text-muted-foreground">{String(s.id).slice(0, 12)}...</TableCell>
                        <TableCell className="px-4 py-3 text-muted-foreground">{s.qr_type ?? "-"}</TableCell>
                        <TableCell className="px-4 py-3 font-medium text-foreground">{s.guider_name}</TableCell>
                        <TableCell className="px-4 py-3 text-xs text-muted-foreground">{fmtDate(s.created_at)}</TableCell>
                        <TableCell className="px-4 py-3">
                          <StatusBadge status={s.status} />
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <Badge variant="outline" className="theme-chip-neutral">
                            {s.total_hikers}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </SectionCard>
        </section>
      </div>
    </div>
  );
}
