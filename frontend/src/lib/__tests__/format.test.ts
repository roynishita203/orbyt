import { describe, expect, it } from "vitest";
import {
  formatAmount,
  formatDuration,
  formatTimestamp,
  parseAmount,
  shortenAddress,
} from "../format";

describe("formatAmount", () => {
  it("formats a whole-number amount with no fractional part", () => {
    expect(formatAmount(100_0000000n)).toBe("100");
  });

  it("formats a fractional amount, trimming trailing zeros", () => {
    expect(formatAmount(15_5000000n)).toBe("15.5");
  });

  it("formats a sub-unit amount with leading zero padding", () => {
    expect(formatAmount(1n)).toBe("0.0000001");
  });

  it("formats zero", () => {
    expect(formatAmount(0n)).toBe("0");
  });
});

describe("parseAmount", () => {
  it("parses a whole number into stroops", () => {
    expect(parseAmount("100")).toBe(100_0000000n);
  });

  it("parses a fractional amount into stroops", () => {
    expect(parseAmount("15.5")).toBe(15_5000000n);
  });

  it("parses a partial fraction, padding to 7 decimals", () => {
    expect(parseAmount("1.1")).toBe(1_1000000n);
  });

  it("round-trips through formatAmount", () => {
    const amount = 42_1234567n;
    expect(parseAmount(formatAmount(amount))).toBe(amount);
  });
});

describe("formatDuration", () => {
  it("formats whole days", () => {
    expect(formatDuration(2_592_000n)).toBe("30d");
  });

  it("formats whole hours", () => {
    expect(formatDuration(7200n)).toBe("2h");
  });

  it("formats whole minutes", () => {
    expect(formatDuration(120n)).toBe("2m");
  });

  it("falls back to raw seconds when not a clean unit", () => {
    expect(formatDuration(90n)).toBe("90s");
  });
});

describe("formatTimestamp", () => {
  it("formats a unix-seconds timestamp as a locale date string", () => {
    const result = formatTimestamp(0n);
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("shortenAddress", () => {
  it("leaves short strings untouched", () => {
    expect(shortenAddress("GABC")).toBe("GABC");
  });

  it("shortens long addresses to a head...tail form", () => {
    const address = "GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890";
    expect(shortenAddress(address)).toBe("GABCD…67890");
  });
});
