import { describe, it, expect } from "vitest";
import {
  calculateFootprint,
  getReductionTips,
  sanitizeNumber,
  EMISSION_FACTORS,
} from "../src/lib/carbon";

describe("sanitizeNumber", () => {
  it("returns 0 for negative, NaN, or non-numeric input", () => {
    expect(sanitizeNumber(-5)).toBe(0);
    expect(sanitizeNumber("abc")).toBe(0);
    expect(sanitizeNumber(NaN)).toBe(0);
    expect(sanitizeNumber(undefined)).toBe(0);
  });

  it("clamps absurdly large values", () => {
    expect(sanitizeNumber(1e9, 1000)).toBe(1000);
  });

  it("passes valid numbers through", () => {
    expect(sanitizeNumber(42)).toBe(42);
    expect(sanitizeNumber("3.5")).toBe(3.5);
  });
});

describe("calculateFootprint", () => {
  it("returns 0 transport/energy and only food for empty input", () => {
    const r = calculateFootprint({
      carKm: 0,
      publicTransportKm: 0,
      flightKm: 0,
      diet: "vegan",
      electricityKwh: 0,
      gasKwh: 0,
    });
    expect(r.transport).toBe(0);
    expect(r.energy).toBe(0);
    expect(r.food).toBe(EMISSION_FACTORS.diet.vegan);
    expect(r.total).toBe(EMISSION_FACTORS.diet.vegan);
  });

  it("computes a known typical day correctly", () => {
    const r = calculateFootprint({
      carKm: 20,
      publicTransportKm: 0,
      flightKm: 0,
      diet: "omnivore",
      electricityKwh: 10,
      gasKwh: 5,
    });
    // 20*0.192 + 5.0 + 10*0.4 + 5*0.2 = 3.84 + 5 + 4 + 1 = 13.84
    expect(r.transport).toBeCloseTo(3.84, 2);
    expect(r.food).toBe(5);
    expect(r.energy).toBeCloseTo(5, 2);
    expect(r.total).toBeCloseTo(13.84, 2);
  });

  it("sanitises malicious / negative input", () => {
    const r = calculateFootprint({
      carKm: -100,
      publicTransportKm: Number.NaN,
      flightKm: 0,
      diet: "vegan",
      electricityKwh: 0,
      gasKwh: 0,
    });
    expect(r.transport).toBe(0);
  });
});

describe("getReductionTips", () => {
  it("returns at most 3 tips", () => {
    const input = {
      carKm: 50,
      publicTransportKm: 0,
      flightKm: 100,
      diet: "heavy-meat" as const,
      electricityKwh: 20,
      gasKwh: 30,
    };
    const tips = getReductionTips(input, calculateFootprint(input));
    expect(tips.length).toBeLessThanOrEqual(3);
    expect(tips.length).toBeGreaterThan(0);
  });

  it("returns a positive message for low footprints", () => {
    const input = {
      carKm: 0,
      publicTransportKm: 0,
      flightKm: 0,
      diet: "vegan" as const,
      electricityKwh: 0,
      gasKwh: 0,
    };
    const tips = getReductionTips(input, calculateFootprint(input));
    expect(tips[0]).toMatch(/Great job/i);
  });
});