import { describe, it, expect } from "vitest";
import { ALLOWED_COMMAND_TYPES, BLOCKED_COMMAND_TYPES } from "@/lib/command-types";

describe("command-types", () => {
  it("allows relay.setMode", () => {
    expect(ALLOWED_COMMAND_TYPES.has("relay.setMode")).toBe(true);
  });

  it("allows system.reboot", () => {
    expect(ALLOWED_COMMAND_TYPES.has("system.reboot")).toBe(true);
  });

  it("blocks system.factoryReset", () => {
    expect(BLOCKED_COMMAND_TYPES.has("system.factoryReset")).toBe(true);
    expect(ALLOWED_COMMAND_TYPES.has("system.factoryReset")).toBe(false);
  });

  it("rejects unknown command types", () => {
    expect(ALLOWED_COMMAND_TYPES.has("arbitrary.shell.exec")).toBe(false);
    expect(ALLOWED_COMMAND_TYPES.has("rm -rf")).toBe(false);
  });

  it("contains all required command types from spec", () => {
    const required = [
      "relay.setMode",
      "schedule.lights",
      "schedule.fans",
      "cloud.update",
      "settings.update",
      "log.clear",
      "time.set",
      "rtc.ack",
      "system.reboot",
    ];
    for (const t of required) {
      expect(ALLOWED_COMMAND_TYPES.has(t), `Expected ${t} to be allowed`).toBe(true);
    }
  });
});
