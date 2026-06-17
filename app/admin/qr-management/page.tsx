"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "react-qr-code";
import {
  Activity,
  ArrowLeftRight,
  Calendar,
  Check,
  Copy,
  Download,
  Eye,
  PowerOff,
  Plus,
  QrCode,
  Radio,
  Scan,
  Shield,
  Users,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Guider = {
  id: string;
  name: string;
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

const typeStyles = {
  CHECKIN: "theme-chip-success",
  CHECKOUT: "theme-chip-warning",
} as const;

export default function QRManagementPage() {
  const today = new Date().toLocaleDateString("en-CA");
  const [date, setDate] = useState(today);
  const [guiderId, setGuiderId] = useState("");
  const [capacity, setCapacity] = useState("");
  const [qrValue, setQrValue] = useState("");
  const [qrList, setQrList] = useState<QRItem[]>([]);
  const [guiders, setGuiders] = useState<Guider[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState("preview");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [qrType, setQrType] = useState<"CHECKIN" | "CHECKOUT">("CHECKIN");
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    supabase
      .from("guiders")
      .select("id, name")
      .order("name")
      .then(({ data, error }) => {
        if (error) {
          console.error("LOAD GUIDERS ERROR:", error);
          return;
        }

        if (data) setGuiders(data);
      });
  }, []);

  useEffect(() => {
    supabase
      .from("qr_sessions")
      .select(`
        *,
        guider:guiders (
          id,
          name
        )
      `)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error("LOAD QR SESSIONS ERROR:", error);
          return;
        }

        if (data) {
          setQrList(
            (data as QRSessionRow[]).map((q) => ({
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

  useEffect(() => {
    const channel = supabase
      .channel("qr-sessions-realtime")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "qr_sessions" },
        (payload) => {
          const updated = payload.new as QRSessionRow;
          setQrList((prev) =>
            prev.map((item) =>
              item.id === updated.id
                ? {
                    ...item,
                    scanned_count: updated.current_count,
                    status: updated.status,
                    capacity: updated.capacity,
                    qr_type: updated.qr_type,
                    value: updated.qr_value,
                  }
                : item
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const selectedQr = useMemo(
    () => qrList.find((item) => item.value === qrValue) ?? null,
    [qrList, qrValue]
  );

  const activeSessions = qrList.filter((q) => q.status === "Active");
  const totalScanned = qrList.reduce((sum, q) => sum + (q.scanned_count || 0), 0);
  const totalCapacity = qrList.reduce((sum, q) => sum + q.capacity, 0);

  const handleGenerateQR = async () => {
    if (!date || !guiderId || !capacity) {
      alert("Please complete all fields");
      return;
    }

    if (date !== today) {
      alert("Date can only be today");
      return;
    }

    setIsGenerating(true);

    await supabase
      .from("qr_sessions")
      .update({ status: "Inactive" })
      .eq("guider_id", guiderId)
      .eq("status", "Active");

    const { data, error } = await supabase
      .from("qr_sessions")
      .insert({
        hiking_date: date,
        guider_id: guiderId,
        capacity: Number(capacity),
        current_count: 0,
        status: "Active",
        qr_type: qrType,
        qr_value: "",
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
      alert("Failed to create session");
      return;
    }

    const qrValueString = JSON.stringify({
      type: qrType === "CHECKIN" ? "LEDANG_CHECKIN" : "LEDANG_CHECKOUT",
      session_id: data.id,
    });

    await supabase.from("qr_sessions").update({ qr_value: qrValueString }).eq("id", data.id);

    setIsGenerating(false);
    setQrValue(qrValueString);
    setActiveTab("preview");
    setQrList((prev) => [
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
    setDate("");
    setGuiderId("");
    setCapacity("");
  };

  const handleToggleType = async (qr: QRItem) => {
    if (qr.status !== "Active") {
      alert("Session is not active");
      return;
    }

    const currentType = qr.qr_type ?? (qr.value.includes("CHECKIN") ? "CHECKIN" : "CHECKOUT");
    const newType = currentType === "CHECKIN" ? "CHECKOUT" : "CHECKIN";
    const newQrValue = JSON.stringify({
      type: newType === "CHECKIN" ? "LEDANG_CHECKIN" : "LEDANG_CHECKOUT",
      session_id: qr.id,
    });

    setTogglingId(qr.id);

    const { error } = await supabase
      .from("qr_sessions")
      .update({
        qr_type: newType,
        qr_value: newQrValue,
      })
      .eq("id", qr.id);

    setTogglingId(null);

    if (error) {
      alert("Failed to toggle QR type");
      return;
    }

    setQrList((prev) => prev.map((item) => (item.id === qr.id ? { ...item, qr_type: newType, value: newQrValue } : item)));

    if (qrValue === qr.value) setQrValue(newQrValue);
  };

  const handleDisplayQR = (qr: QRItem) => {
    if (qr.status !== "Active") {
      alert("This QR is not active");
      return;
    }

    setQrValue(qr.value);
    setActiveTab("preview");
  };

  const handleUnactiveQR = async (id: string) => {
    if (!window.confirm("Deactivate this QR session?")) return;

    await supabase.from("qr_sessions").update({ status: "Inactive" }).eq("id", id);

    setQrList((prev) => prev.map((item) => (item.id === id ? { ...item, status: "Inactive" } : item)));

    if (qrValue === qrList.find((item) => item.id === id)?.value) {
      setQrValue("");
    }
  };

  const handleCopyId = async (id: string) => {
    await navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyValue = async () => {
    if (!qrValue) return;
    await navigator.clipboard.writeText(qrValue);
  };

  const handleDownloadQr = () => {
    const svg = previewRef.current?.querySelector("svg");
    if (!svg || !selectedQr) return;

    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svg);
    const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selectedQr.guider?.name ?? "trailguard"}-${getQrType(selectedQr).toLowerCase()}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString("en-MY", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const getProgressColor = (scanned: number, cap: number) => {
    const pct = (scanned / cap) * 100;
    if (pct >= 100) return "theme-progress-danger";
    if (pct >= 80) return "theme-progress-warning";
    if (pct >= 50) return "theme-progress-warning";
    return "theme-progress-success";
  };

  const getQrType = (qr: QRItem) =>
    (qr.qr_type ?? (qr.value.includes("CHECKIN") ? "CHECKIN" : "CHECKOUT")) as "CHECKIN" | "CHECKOUT";

  const selectedGuider = guiders.find((guider) => guider.id === guiderId) ?? null;

  return (
    <div className="app-shell min-h-screen">
      <div className="mx-auto max-w-screen-xl space-y-6 px-4 py-6 sm:px-6">
        <section className="panel-surface">
          <div className="panel-header">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                <QrCode className="h-6 w-6" />
              </div>
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge className="border-primary/20 bg-primary/10 text-primary">Trailguard Live</Badge>
                  <Badge variant="outline">Gunung Ledang</Badge>
                </div>
                <h1 className="text-2xl font-bold text-foreground sm:text-3xl">QR Session Manager</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create, preview, and manage trail entry and exit QR sessions using the shared admin theme.
                </p>
              </div>
            </div>
            <div className="w-full rounded-xl border border-border bg-background/70 px-4 py-2 text-sm text-muted-foreground sm:w-auto">
              Last sync: {new Date().toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Active Sessions",
              value: activeSessions.length,
              icon: Activity,
              tone: "theme-text-success",
              chip: "theme-callout-success",
            },
            {
              label: "Total Sessions",
              value: qrList.length,
              icon: QrCode,
              tone: "text-primary",
              chip: "bg-primary/10",
            },
            {
              label: "Scanned",
              value: totalScanned,
              icon: Scan,
              tone: "theme-text-warning",
              chip: "theme-callout-warning",
            },
            {
              label: "Capacity",
              value: totalCapacity,
              icon: Users,
              tone: "theme-text-info",
              chip: "theme-callout-info",
            },
          ].map((card) => {
            const Icon = card.icon;

            return (
              <div key={card.label} className="metric-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase text-muted-foreground">{card.label}</p>
                    <p className={`mt-3 text-2xl font-bold sm:text-3xl ${card.tone}`}>{card.value}</p>
                  </div>
                  <div className={`rounded-2xl p-2.5 ${card.chip}`}>
                    <Icon className={`h-5 w-5 ${card.tone}`} />
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
          <section className="panel-surface">
            <div className="panel-header">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Create Session</h2>
                <p className="text-xs text-muted-foreground">Set up a new QR code for check-in or check-out.</p>
              </div>
              <Badge variant="outline" className={typeStyles[qrType]}>
                {qrType}
              </Badge>
            </div>

            <div className="space-y-5 p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Button
                  onClick={() => setQrType("CHECKIN")}
                  variant="outline"
                  className={`h-auto items-start justify-start rounded-2xl p-4 text-left whitespace-normal transition-colors ${
                    qrType === "CHECKIN"
                      ? "theme-callout-success"
                      : "border-border bg-card hover:bg-accent/50"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Radio className="theme-text-success h-4 w-4" />
                      Check-In
                    </div>
                    <p className="text-xs text-muted-foreground">Use this at trail entry to register arrivals.</p>
                  </div>
                </Button>

                <Button
                  onClick={() => setQrType("CHECKOUT")}
                  variant="outline"
                  className={`h-auto items-start justify-start rounded-2xl p-4 text-left whitespace-normal transition-colors ${
                    qrType === "CHECKOUT"
                      ? "theme-callout-warning"
                      : "border-border bg-card hover:bg-accent/50"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                      <ArrowLeftRight className="theme-text-warning h-4 w-4" />
                      Check-Out
                    </div>
                    <p className="text-xs text-muted-foreground">Use this at trail exit to record completed hikes.</p>
                  </div>
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="hiking-date">Hiking Date</Label>
                <Input
                  id="hiking-date"
                  type="date"
                  value={date}
                  min={today}
                  max={today}
                  onChange={(event) => setDate(event.target.value)}
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label>Assigned Guider</Label>
                <Select value={guiderId} onValueChange={setGuiderId}>
                  <SelectTrigger className="h-11 w-full">
                    <SelectValue placeholder="Select guider" />
                  </SelectTrigger>
                  <SelectContent>
                    {guiders.map((guider) => (
                      <SelectItem key={guider.id} value={guider.id}>
                        {guider.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="capacity">Participant Capacity</Label>
                <Input
                  id="capacity"
                  type="number"
                  min="1"
                  placeholder="e.g. 30"
                  value={capacity}
                  onChange={(event) => setCapacity(event.target.value)}
                  className="h-11"
                />
              </div>

              <div className="rounded-2xl border border-border bg-muted/35 p-4">
                <div className="mb-2 flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-medium text-foreground">Session Summary</span>
                  <span className="break-words text-muted-foreground">{selectedGuider?.name ?? "No guider selected"}</span>
                </div>
                <div className="grid grid-cols-1 gap-3 text-xs text-muted-foreground sm:grid-cols-2">
                  <div className="rounded-xl border border-border/60 bg-background/70 p-3">
                    <div className="mb-1 flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5" />
                      Date
                    </div>
                    <div className="font-medium text-foreground">{date ? formatDate(date) : "-"}</div>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-background/70 p-3">
                    <div className="mb-1 flex items-center gap-2">
                      <Users className="h-3.5 w-3.5" />
                      Capacity
                    </div>
                    <div className="font-medium text-foreground">{capacity || "-"}</div>
                  </div>
                </div>
              </div>

              <Button onClick={handleGenerateQR} disabled={isGenerating} className="h-11 w-full">
                <Plus className="h-4 w-4" />
                {isGenerating ? "Generating Session..." : "Generate QR Session"}
              </Button>
            </div>
          </section>

          <section className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="panel-surface overflow-hidden">
              <div className="panel-header">
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-foreground">Session Workspace</h2>
                  <p className="text-xs text-muted-foreground">Preview the active QR or browse all created sessions.</p>
                </div>
                <TabsList className="grid w-full grid-cols-2 sm:w-auto sm:min-w-[260px] sm:max-w-[320px]">
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                  <TabsTrigger value="sessions">Sessions</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="preview" className="m-0">
                {qrValue ? (
                  <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
                    <div className="flex min-w-0 flex-col items-center rounded-3xl border border-border bg-background/70 p-4 sm:p-6">
                      <div ref={previewRef} className="flex w-full justify-center rounded-3xl bg-white p-4 shadow-sm">
                        <QRCode value={qrValue} size={240} style={{ width: "100%", maxWidth: 240, height: "auto" }} />
                      </div>
                      <div className="mt-4 flex flex-wrap justify-center gap-2">
                        <Badge variant="outline" className={selectedQr ? typeStyles[getQrType(selectedQr)] : ""}>
                          {selectedQr ? getQrType(selectedQr) : "Session"}
                        </Badge>
                        {selectedQr && (
                          <Badge variant={selectedQr.status === "Active" ? "default" : "secondary"}>
                            {selectedQr.status}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="min-w-0 space-y-4">
                      <div className="rounded-2xl border border-border bg-card p-5">
                        <h3 className="break-words text-base font-semibold text-foreground">
                          {selectedQr?.guider?.name ?? "Selected Session"}
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {selectedQr
                            ? `Use this ${getQrType(selectedQr).toLowerCase()} code on ${formatDate(selectedQr.date)}.`
                            : "Preview details will appear here."}
                        </p>
                      </div>

                      {selectedQr && (
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="rounded-2xl border border-border bg-card p-4">
                            <p className="text-xs uppercase text-muted-foreground">Capacity</p>
                            <p className="mt-2 text-xl font-semibold text-foreground sm:text-2xl">
                              {selectedQr.scanned_count || 0}/{selectedQr.capacity}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-border bg-card p-4">
                            <p className="text-xs uppercase text-muted-foreground">Date</p>
                            <p className="mt-2 text-xl font-semibold text-foreground sm:text-2xl">{formatDate(selectedQr.date)}</p>
                          </div>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-3">
                        <Button onClick={handleDownloadQr} disabled={!qrValue}>
                          <Download className="h-4 w-4" />
                          Download SVG
                        </Button>
                        <Button variant="outline" onClick={handleCopyValue} disabled={!qrValue}>
                          <Copy className="h-4 w-4" />
                          Copy Value
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex min-h-[480px] flex-col items-center justify-center gap-4 p-8 text-center">
                    <div className="flex h-24 w-24 items-center justify-center rounded-3xl border border-dashed border-border bg-muted/30">
                      <QrCode className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">No QR Selected</h3>
                      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                        Generate a new session or open one from the sessions list to preview its QR code here.
                      </p>
                    </div>
                    <Button variant="outline" onClick={() => setActiveTab("sessions")}>
                      <Eye className="h-4 w-4" />
                      View Sessions
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="sessions" className="m-0">
                <div className="flex flex-col gap-2 border-b border-border/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold text-foreground">All QR Sessions</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {activeSessions.length} active · {qrList.length - activeSessions.length} inactive
                  </div>
                </div>

                <ScrollArea className="h-[560px]">
                  <div className="space-y-3 p-5">
                    {qrList.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 text-center">
                        <QrCode className="mb-4 h-10 w-10 text-muted-foreground" />
                        <p className="font-medium text-foreground">No sessions yet</p>
                        <p className="mt-1 text-sm text-muted-foreground">Generate your first QR session to get started.</p>
                      </div>
                    ) : (
                      qrList.map((qr) => {
                        const isActive = qr.status === "Active";
                        const type = getQrType(qr);
                        const scanPct = Math.min(100, Math.round(((qr.scanned_count || 0) / qr.capacity) * 100));

                        return (
                          <div
                            key={qr.id}
                            className={`rounded-2xl border p-4 transition-colors ${
                              isActive ? "border-primary/20 bg-primary/5" : "border-border bg-card"
                            }`}
                          >
                            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                              <div className="min-w-0 flex-1">
                                <div className="mb-2 flex flex-wrap items-center gap-2">
                                  <span className="max-w-full break-words text-sm font-semibold text-foreground">{qr.guider?.name || "-"}</span>
                                  <Badge variant="outline" className={typeStyles[type]}>
                                    {type}
                                  </Badge>
                                  <Badge variant={isActive ? "default" : "secondary"}>{qr.status}</Badge>
                                </div>

                                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {formatDate(qr.date)}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    {qr.scanned_count || 0}/{qr.capacity}
                                  </span>
                                </div>

                                <div className="mt-3">
                                  <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                                    <span>Capacity</span>
                                    <span>{scanPct}%</span>
                                  </div>
                                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                                    <div
                                      className={`h-full rounded-full transition-all ${getProgressColor(qr.scanned_count || 0, qr.capacity)}`}
                                      style={{ width: `${scanPct}%` }}
                                    />
                                  </div>
                                </div>
                              </div>

                                <div className="flex flex-wrap items-center gap-2">
                                  <Button variant="outline" size="sm" onClick={() => handleCopyId(qr.id)}>
                                    {copiedId === qr.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                                    {copiedId === qr.id ? "Copied" : "ID"}
                                </Button>

                                {isActive && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleToggleType(qr)}
                                    disabled={togglingId === qr.id}
                                  >
                                    <ArrowLeftRight className="h-3.5 w-3.5" />
                                    {togglingId === qr.id ? "Updating..." : type}
                                  </Button>
                                )}

                                <Button variant="outline" size="sm" onClick={() => handleDisplayQR(qr)}>
                                  <Eye className="h-3.5 w-3.5" />
                                  View
                                </Button>

                                {isActive && (
                                  <Button variant="destructive" size="sm" onClick={() => handleUnactiveQR(qr.id)}>
                                    <PowerOff className="h-3.5 w-3.5" />
                                    End
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </section>
        </div>
      </div>
    </div>
  );
}
