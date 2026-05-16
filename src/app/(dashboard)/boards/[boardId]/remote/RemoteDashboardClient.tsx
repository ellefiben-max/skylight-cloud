"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";

interface Relay {
  id: number;
  name: string;
  isLight: boolean;
  isFan: boolean;
  on: boolean;
  mode: number;
  modeLabel: string;
  wattage: number;
  overrideUntil: number;
  overrideActive: boolean;
  overrideText: string;
}

interface TimeInfo {
  valid: boolean;
  ntpSynced: boolean;
  dateText: string;
  timeText: string;
}

interface WifiInfo {
  apSSID: string;
  apIP: string;
  staIP: string;
  clients: number;
  apRunning: boolean;
  staConnected: boolean;
}

interface BoardStatus {
  relays?: Relay[];
  time?: TimeInfo;
  wifi?: WifiInfo;
  fw?: string;
  freeMem?: number;
  freePsram?: number;
  logCount?: number;
}

interface LogEntry {
  id: string;
  level: string;
  source: string;
  message: string;
  timestamp: string;
}

interface Props {
  boardId: string;
  deviceName: string;
  initialStatus: BoardStatus;
  initialOnline: boolean;
  initialLogs: LogEntry[];
}

const OVERRIDE_OPTIONS = [
  { label: "15 min", value: 15 },
  { label: "30 min", value: 30 },
  { label: "1 hour", value: 60 },
  { label: "2 hours", value: 120 },
  { label: "4 hours", value: 240 },
];

export function RemoteDashboardClient({
  boardId,
  deviceName,
  initialStatus,
  initialOnline,
  initialLogs,
}: Props) {
  const [status, setStatus] = useState<BoardStatus>(initialStatus);
  const [online, setOnline] = useState(initialOnline);
  const [logs, setLogs] = useState<LogEntry[]>(initialLogs);
  const [sending, setSending] = useState<Record<number, boolean>>({});
  const [overrideDurations, setOverrideDurations] = useState<Record<number, number>>({});
  const mountedRef = useRef(false);

  const sendCommand = useCallback(
    async (type: string, payload?: Record<string, unknown>) => {
      await fetch(`/api/user/boards/${boardId}/commands`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, payload: payload ?? {} }),
      });
    },
    [boardId]
  );

  // Keepalive: re-send remoteUi.start every 4 min to extend the board's push window.
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      sendCommand("remoteUi.start");
    }
    const id = setInterval(() => sendCommand("remoteUi.start"), 4 * 60 * 1000);
    return () => clearInterval(id);
  }, [sendCommand]);

  // Poll status every 500ms.
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`/api/user/boards/${boardId}/status`);
        if (!res.ok) return;
        const json = await res.json();
        const d = json.data;
        if (d.status) setStatus(d.status);
        setOnline(d.online ?? false);
        if (d.recentLogs) setLogs(d.recentLogs);
      } catch {}
    };
    const id = setInterval(poll, 500);
    return () => clearInterval(id);
  }, [boardId]);

  const setRelayMode = useCallback(
    async (relayId: number, mode: number, overrideMin?: number) => {
      // Optimistic update — reflect the new mode instantly without waiting for
      // the board to confirm via the next status push.
      setStatus((prev) => {
        if (!prev.relays) return prev;
        const modeLabels: Record<number, string> = { 0: "Auto", 1: "On", 2: "Override" };
        return {
          ...prev,
          relays: prev.relays.map((r) =>
            r.id === relayId
              ? { ...r, mode, modeLabel: modeLabels[mode] ?? r.modeLabel, overrideActive: mode === 2 }
              : r
          ),
        };
      });
      setSending((s) => ({ ...s, [relayId]: true }));
      const payload: Record<string, unknown> = { relayId, mode };
      if (overrideMin !== undefined) payload.override = overrideMin;
      await sendCommand("relay.setMode", payload);
      setSending((s) => ({ ...s, [relayId]: false }));
    },
    [sendCommand]
  );

  const relays = status.relays ?? [];
  const time = status.time;
  const wifi = status.wifi;

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          padding: "0.625rem 1.25rem",
          background: "var(--color-surface)",
          borderBottom: "1px solid var(--color-border)",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <Link
          href={`/boards/${boardId}`}
          style={{ color: "var(--color-text-muted)", fontSize: "0.875rem" }}
        >
          ← {deviceName}
        </Link>
        <span style={{ flex: 1 }} />
        <span
          className={`live-dot ${online ? "live" : "dead"}`}
          style={{ flexShrink: 0 }}
        />
        <span
          style={{
            fontSize: "0.875rem",
            color: online ? "var(--color-success)" : "var(--color-text-muted)",
          }}
        >
          {online ? "Live" : "Offline"}
        </span>
        <a
          href={`/api/user/boards/${boardId}/ui`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: "0.8125rem",
            color: "var(--color-text-faint)",
            marginLeft: "0.75rem",
          }}
        >
          Legacy UI ↗
        </a>
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          padding: "1.5rem",
          display: "grid",
          gap: "1.5rem",
          maxWidth: 1200,
          margin: "0 auto",
          width: "100%",
          alignContent: "start",
        }}
      >
        {/* Relay cards */}
        {relays.length > 0 && (
          <section>
            <h2 style={sectionLabel}>Relays</h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                gap: "0.875rem",
              }}
            >
              {relays.map((relay) => (
                <RelayCard
                  key={relay.id}
                  relay={relay}
                  busy={sending[relay.id] ?? false}
                  overrideDuration={overrideDurations[relay.id] ?? 30}
                  onOverrideDurationChange={(min) =>
                    setOverrideDurations((d) => ({ ...d, [relay.id]: min }))
                  }
                  onSetMode={(mode, dur) => setRelayMode(relay.id, mode, dur)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Info row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
            gap: "0.875rem",
          }}
        >
          {time && <ClockPanel time={time} />}
          {wifi && <WifiPanel wifi={wifi} />}
          <SystemPanel status={status} />
        </div>

        {/* Logs */}
        <section className="panel" style={{ padding: "1.25rem" }}>
          <h2
            style={{
              ...sectionLabel,
              marginBottom: "0.875rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            Recent Logs
            {status.logCount != null && (
              <span style={{ fontWeight: 400, color: "var(--color-text-faint)" }}>
                ({status.logCount} total)
              </span>
            )}
          </h2>
          {logs.length === 0 ? (
            <p style={{ color: "var(--color-text-faint)", fontSize: "0.875rem" }}>
              No logs yet.
            </p>
          ) : (
            <div
              style={{
                fontFamily: "monospace",
                fontSize: "0.8rem",
                display: "grid",
                gap: "1px",
                maxHeight: 380,
                overflowY: "auto",
              }}
            >
              {logs.map((l) => (
                <LogRow key={l.id} log={l} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// ── Relay card ───────────────────────────────────────────────────────────────

function RelayCard({
  relay,
  busy,
  overrideDuration,
  onOverrideDurationChange,
  onSetMode,
}: {
  relay: Relay;
  busy: boolean;
  overrideDuration: number;
  onOverrideDurationChange: (min: number) => void;
  onSetMode: (mode: number, overrideMin?: number) => void;
}) {
  return (
    <div className="panel" style={{ padding: "1.125rem" }}>
      {/* Header row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "0.5rem",
        }}
      >
        <span style={{ fontWeight: 600, fontSize: "0.9375rem" }}>{relay.name}</span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.35rem",
            padding: "0.2rem 0.55rem",
            borderRadius: 20,
            fontSize: "0.8rem",
            fontWeight: 700,
            letterSpacing: "0.04em",
            background: relay.on
              ? "var(--color-primary-dim)"
              : "var(--color-surface-3)",
            color: relay.on ? "var(--color-primary)" : "var(--color-text-muted)",
            border: `1px solid ${relay.on ? "var(--color-primary-border)" : "var(--color-border)"}`,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: relay.on ? "var(--color-primary)" : "var(--color-text-faint)",
              flexShrink: 0,
            }}
          />
          {relay.on ? "ON" : "OFF"}
        </span>
      </div>

      {/* Mode / override info */}
      <div
        style={{
          fontSize: "0.8125rem",
          color: "var(--color-text-muted)",
          marginBottom: "0.875rem",
          minHeight: "1.2em",
        }}
      >
        {relay.modeLabel}
        {relay.overrideActive && relay.overrideText && (
          <span style={{ color: "var(--color-warning)", marginLeft: "0.5rem" }}>
            · {relay.overrideText}
          </span>
        )}
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap", alignItems: "center" }}>
        <ModeBtn active={relay.mode === 0} disabled={busy} onClick={() => onSetMode(0)}>
          Auto
        </ModeBtn>
        <ModeBtn active={relay.mode === 1} disabled={busy} onClick={() => onSetMode(1)}>
          On
        </ModeBtn>
        <ModeBtn
          active={relay.mode === 2}
          disabled={busy}
          onClick={() => onSetMode(2, overrideDuration)}
        >
          Override
        </ModeBtn>
        <select
          value={overrideDuration}
          onChange={(e) => onOverrideDurationChange(Number(e.target.value))}
          style={{
            background: "var(--color-surface-3)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-sm)",
            color: "var(--color-text-muted)",
            fontSize: "0.75rem",
            padding: "0.25rem 0.375rem",
          }}
        >
          {OVERRIDE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function ModeBtn({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "0.3125rem 0.625rem",
        borderRadius: "var(--radius-sm)",
        fontSize: "0.8125rem",
        fontWeight: 500,
        background: active ? "var(--color-primary-dim)" : "var(--color-surface-3)",
        color: active ? "var(--color-primary)" : "var(--color-text-muted)",
        border: `1px solid ${active ? "var(--color-primary-border)" : "var(--color-border)"}`,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  );
}

// ── Info panels ──────────────────────────────────────────────────────────────

function ClockPanel({ time }: { time: TimeInfo }) {
  return (
    <div className="panel" style={{ padding: "1rem" }}>
      <div style={panelLabel}>Clock</div>
      <div
        style={{
          fontWeight: 700,
          fontSize: "1.375rem",
          letterSpacing: "-0.03em",
          fontVariantNumeric: "tabular-nums",
          color: time.valid ? "var(--color-text)" : "var(--color-text-muted)",
        }}
      >
        {time.timeText || "—"}
      </div>
      <div style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", marginTop: "0.25rem" }}>
        {time.dateText || ""}
      </div>
      <div
        style={{
          fontSize: "0.75rem",
          marginTop: "0.375rem",
          color: time.ntpSynced ? "var(--color-success)" : "var(--color-warning)",
        }}
      >
        {time.ntpSynced ? "NTP synced" : "No NTP sync"}
      </div>
    </div>
  );
}

function WifiPanel({ wifi }: { wifi: WifiInfo }) {
  return (
    <div className="panel" style={{ padding: "1rem" }}>
      <div style={panelLabel}>WiFi</div>
      <div style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "0.25rem" }}>
        {wifi.staConnected ? wifi.staIP || "Connected" : "Not connected"}
      </div>
      <div style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>
        AP: {wifi.apSSID}
      </div>
      {wifi.clients > 0 && (
        <div style={{ fontSize: "0.75rem", color: "var(--color-text-faint)", marginTop: "0.25rem" }}>
          {wifi.clients} local client{wifi.clients !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}

function SystemPanel({ status }: { status: BoardStatus }) {
  return (
    <div className="panel" style={{ padding: "1rem" }}>
      <div style={panelLabel}>System</div>
      <div style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "0.25rem" }}>
        {status.fw ? `fw ${status.fw}` : "—"}
      </div>
      {status.freeMem != null && (
        <div style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>
          Heap {(status.freeMem / 1024).toFixed(0)} KB
        </div>
      )}
      {status.freePsram != null && status.freePsram > 0 && (
        <div style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>
          PSRAM {(status.freePsram / 1024).toFixed(0)} KB
        </div>
      )}
    </div>
  );
}

// ── Log row ──────────────────────────────────────────────────────────────────

const LEVEL_COLOR: Record<string, string> = {
  error: "var(--color-error)",
  warn: "var(--color-warning)",
  debug: "var(--color-text-faint)",
};

function LogRow({ log }: { log: LogEntry }) {
  const ts = new Date(log.timestamp).toLocaleTimeString();
  const color = LEVEL_COLOR[log.level] ?? "var(--color-text-muted)";
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "72px 40px 68px 1fr",
        gap: "0.5rem",
        padding: "0.25rem 0.375rem",
        borderRadius: 4,
        background:
          log.level === "error" ? "var(--color-error-dim)" : "transparent",
      }}
    >
      <span style={{ color: "var(--color-text-faint)" }}>{ts}</span>
      <span
        style={{
          color,
          fontWeight: 700,
          fontSize: "0.7rem",
          textTransform: "uppercase",
          alignSelf: "center",
        }}
      >
        {log.level}
      </span>
      <span style={{ color: "var(--color-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {log.source}
      </span>
      <span style={{ wordBreak: "break-word" }}>{log.message}</span>
    </div>
  );
}

// ── Shared styles ────────────────────────────────────────────────────────────

const sectionLabel: React.CSSProperties = {
  fontSize: "0.72rem",
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  color: "var(--color-text-muted)",
  marginBottom: "0.75rem",
};

const panelLabel: React.CSSProperties = {
  fontSize: "0.72rem",
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  color: "var(--color-text-faint)",
  marginBottom: "0.5rem",
};
