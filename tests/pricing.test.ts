import { describe, it, expect } from "vitest";
import { unitPriceForBoardCount, monthlyTotalCents } from "@/lib/pricing";

describe("unitPriceForBoardCount", () => {
  it("returns 0 for 0 boards", () => {
    expect(unitPriceForBoardCount(0)).toBe(0);
  });

  it("returns 1000 for 1 board", () => {
    expect(unitPriceForBoardCount(1)).toBe(1000);
  });

  it("returns 1000 for 4 boards", () => {
    expect(unitPriceForBoardCount(4)).toBe(1000);
  });

  it("returns 800 for 5 boards", () => {
    expect(unitPriceForBoardCount(5)).toBe(800);
  });

  it("returns 800 for 20 boards", () => {
    expect(unitPriceForBoardCount(20)).toBe(800);
  });

  it("returns 700 for 21 boards", () => {
    expect(unitPriceForBoardCount(21)).toBe(700);
  });

  it("returns 700 for 100 boards", () => {
    expect(unitPriceForBoardCount(100)).toBe(700);
  });
});

describe("monthlyTotalCents", () => {
  it("1 board = $10", () => expect(monthlyTotalCents(1)).toBe(1000));
  it("4 boards = $40", () => expect(monthlyTotalCents(4)).toBe(4000));
  it("5 boards = $40", () => expect(monthlyTotalCents(5)).toBe(4000));
  it("20 boards = $160", () => expect(monthlyTotalCents(20)).toBe(16000));
  it("21 boards = $147", () => expect(monthlyTotalCents(21)).toBe(14700));
});
