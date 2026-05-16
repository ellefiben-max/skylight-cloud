export const ALLOWED_COMMAND_TYPES = new Set([
  "relay.setMode",
  "schedule.lights",
  "schedule.fans",
  "cloud.update",
  "settings.update",
  "log.clear",
  "time.set",
  "rtc.ack",
  "ui.sync",
  "remoteUi.start",
  "system.reboot",
]);

export const BLOCKED_COMMAND_TYPES = new Set(["system.factoryReset"]);
