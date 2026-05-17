import mqtt, { type MqttClient } from "mqtt";
import { prisma } from "./db";

const DEFAULT_MQTT_PORT = 8883;
const LOG_MAX_RETAIN = 5000;

type GlobalMqtt = typeof globalThis & {
  skylightMqttClient?: MqttClient;
  skylightMqttStarting?: Promise<MqttClient | null>;
};

type MqttDeviceConfig = {
  enabled: boolean;
  host: string;
  port: number;
  username: string;
  password: string;
  tls: boolean;
  topicPrefix: string;
};

type CommandPayload = {
  id: string;
  type: string;
  payload: unknown;
};

const globalForMqtt = globalThis as GlobalMqtt;

function cleanTopicPart(value: string | undefined, fallback: string) {
  const cleaned = (value ?? "").trim().replace(/^\/+|\/+$/g, "");
  return cleaned.length > 0 ? cleaned : fallback;
}

function getUrlConfig() {
  const raw = process.env.MQTT_URL || process.env.EMQX_MQTT_URL || "";
  if (!raw) return null;
  try {
    const url = new URL(raw);
    const tls = url.protocol === "mqtts:" || url.protocol === "wss:";
    return {
      brokerUrl: raw,
      host: url.hostname,
      port: url.port ? Number(url.port) : DEFAULT_MQTT_PORT,
      tls,
    };
  } catch {
    return null;
  }
}

export function getMqttDeviceConfig(): MqttDeviceConfig {
  const urlConfig = getUrlConfig();
  const host = process.env.MQTT_HOST || process.env.EMQX_MQTT_HOST || urlConfig?.host || "";
  const port = Number(process.env.MQTT_PORT || process.env.EMQX_MQTT_PORT || urlConfig?.port || DEFAULT_MQTT_PORT);
  const username = process.env.MQTT_USERNAME || process.env.EMQX_MQTT_USERNAME || "";
  const password = process.env.MQTT_PASSWORD || process.env.EMQX_MQTT_PASSWORD || "";
  const tlsEnv = process.env.MQTT_TLS || process.env.EMQX_MQTT_TLS;
  const tls = tlsEnv ? tlsEnv !== "false" && tlsEnv !== "0" : (urlConfig?.tls ?? true);
  const topicPrefix = cleanTopicPart(process.env.MQTT_TOPIC_PREFIX || process.env.EMQX_MQTT_TOPIC_PREFIX, "skylight");
  const caCert = (process.env.MQTT_CA_CERT || process.env.EMQX_MQTT_CA_CERT || "").replace(/\\n/g, "\n");

  return {
    enabled: host.length > 0 && username.length > 0 && password.length > 0,
    host,
    port,
    username,
    password,
    tls,
    topicPrefix,
  };
}

function getBrokerUrl() {
  const urlConfig = getUrlConfig();
  if (urlConfig?.brokerUrl) return urlConfig.brokerUrl;
  const cfg = getMqttDeviceConfig();
  if (!cfg.enabled) return null;
  return `${cfg.tls ? "mqtts" : "mqtt"}://${cfg.host}:${cfg.port}`;
}

function commandTopic(boardId: string) {
  return `${getMqttDeviceConfig().topicPrefix}/${boardId}/command`;
}

function subscriptionTopic(kind: string) {
  return `${getMqttDeviceConfig().topicPrefix}/+/${kind}`;
}

function parseJson(payload: Buffer) {
  try {
    return JSON.parse(payload.toString("utf8"));
  } catch {
    return null;
  }
}

async function handleStatus(boardExternalId: string, payload: Buffer) {
  const body = parseJson(payload);
  if (!body || typeof body !== "object") return;
  const statusJson = "statusJson" in body ? (body as { statusJson: unknown }).statusJson : body;
  await prisma.board.update({
    where: { boardId: boardExternalId },
    data: { statusJson: JSON.stringify(statusJson), lastSeenAt: new Date() },
  }).catch(() => {});
}

async function handleAck(boardExternalId: string, payload: Buffer) {
  const body = parseJson(payload) as { commandId?: unknown; success?: unknown; reason?: unknown } | null;
  if (!body || typeof body.commandId !== "string" || typeof body.success !== "boolean") return;

  const board = await prisma.board.findUnique({ where: { boardId: boardExternalId }, select: { id: true } });
  if (!board) return;

  await prisma.boardCommand.updateMany({
    where: {
      id: body.commandId,
      boardId: board.id,
      status: { notIn: ["acked", "failed"] },
    },
    data: body.success
      ? { status: "acked", ackedAt: new Date() }
      : { status: "failed", failedAt: new Date(), failureReason: typeof body.reason === "string" ? body.reason.slice(0, 256) : "device error" },
  });
}

async function handleLogs(boardExternalId: string, payload: Buffer) {
  const body = parseJson(payload) as { logs?: unknown } | unknown[] | null;
  const rows = Array.isArray(body) ? body : Array.isArray((body as { logs?: unknown } | null)?.logs) ? (body as { logs: unknown[] }).logs : [];
  if (rows.length === 0) return;

  const board = await prisma.board.findUnique({ where: { boardId: boardExternalId }, select: { id: true } });
  if (!board) return;

  const now = new Date();
  const entries = rows.slice(0, 200).flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const r = row as Record<string, unknown>;
    const message = typeof r.message === "string" ? r.message.slice(0, 2048) : "";
    if (!message) return [];
    const level = ["debug", "info", "warn", "error"].includes(String(r.level)) ? String(r.level) : "info";
    return [{
      boardId: board.id,
      timestamp: typeof r.timestamp === "string" ? new Date(r.timestamp) : now,
      source: typeof r.source === "string" ? r.source.slice(0, 64) : "device",
      level,
      message,
    }];
  });

  if (entries.length === 0) return;
  await prisma.boardLog.createMany({ data: entries });

  const count = await prisma.boardLog.count({ where: { boardId: board.id } });
  if (count > LOG_MAX_RETAIN) {
    const oldest = await prisma.boardLog.findMany({
      where: { boardId: board.id },
      orderBy: { timestamp: "asc" },
      take: count - LOG_MAX_RETAIN,
      select: { id: true },
    });
    await prisma.boardLog.deleteMany({ where: { id: { in: oldest.map((r) => r.id) } } });
  }
}

async function handleMqttMessage(topic: string, payload: Buffer) {
  const parts = topic.split("/");
  if (parts.length !== 3) return;
  const [prefix, boardExternalId, kind] = parts;
  if (prefix !== getMqttDeviceConfig().topicPrefix || !boardExternalId) return;

  if (kind === "status") await handleStatus(boardExternalId, payload);
  if (kind === "ack") await handleAck(boardExternalId, payload);
  if (kind === "logs") await handleLogs(boardExternalId, payload);
}

export async function ensureMqttStarted(): Promise<MqttClient | null> {
  const cfg = getMqttDeviceConfig();
  const brokerUrl = getBrokerUrl();
  if (!cfg.enabled || !brokerUrl) return null;

  if (globalForMqtt.skylightMqttClient) return globalForMqtt.skylightMqttClient;
  if (globalForMqtt.skylightMqttStarting) return globalForMqtt.skylightMqttStarting;

  globalForMqtt.skylightMqttStarting = new Promise<MqttClient | null>((resolve) => {
    const client = mqtt.connect(brokerUrl, {
      username: cfg.username,
      password: cfg.password,
      clientId: `skylight-cloud-${Math.random().toString(16).slice(2)}`,
      clean: true,
      keepalive: 30,
      reconnectPeriod: 2000,
      connectTimeout: 8000,
    });

    client.on("connect", () => {
      client.subscribe([subscriptionTopic("status"), subscriptionTopic("ack"), subscriptionTopic("logs")], { qos: 1 }, (err) => {
        if (err) console.error("[MQTT] subscribe failed", err);
      });
    });
    client.on("message", (topic, payload) => {
      handleMqttMessage(topic, payload).catch((err) => console.error("[MQTT] message handler failed", err));
    });
    client.on("error", (err) => console.error("[MQTT] client error", err.message));

    globalForMqtt.skylightMqttClient = client;
    resolve(client);
  }).finally(() => {
    globalForMqtt.skylightMqttStarting = undefined;
  });

  return globalForMqtt.skylightMqttStarting;
}

function waitForConnected(client: MqttClient, timeoutMs = 1000): Promise<boolean> {
  if (client.connected) return Promise.resolve(true);
  return new Promise((resolve) => {
    const timer = setTimeout(() => finish(false), timeoutMs);
    const finish = (ok: boolean) => {
      clearTimeout(timer);
      client.off("connect", onConnect);
      client.off("error", onError);
      resolve(ok);
    };
    const onConnect = () => finish(true);
    const onError = () => finish(false);
    client.once("connect", onConnect);
    client.once("error", onError);
  });
}
export async function publishMqttCommand(boardExternalId: string, command: CommandPayload): Promise<boolean> {
  const client = await ensureMqttStarted();
  if (!client) return false;
  return new Promise((resolve) => {
    client.publish(commandTopic(boardExternalId), JSON.stringify(command), { qos: 1 }, (err) => {
      if (err) console.error("[MQTT] command publish failed", err);
      resolve(!err);
    });
  });
}