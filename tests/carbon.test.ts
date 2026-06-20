import { describe, expect, it } from "vitest";
import {
  calculateFootprint,
  getReductionTips,
  sanitizeNumber,
  getDailyTip,
  EMISSION_FACTORS,
  DAILY_TIPS,
} from "../src/lib/carbon";
import {
  searchFoods,
  estimateFoodFootprint,
  FOOD_DB,
} from "../src/lib/food-search";

describe("sanitizeNumber", () => {
  it("clamps NaN and negatives to 0", () => {
    expect(sanitizeNumber("abc")).toBe(0);
    expect(sanitizeNumber(-5)).toBe(0);
    expect(sanitizeNumber(undefined)).toBe(0);
  });
  it("passes through valid numbers", () => {
    expect(sanitizeNumber("12.5")).toBe(12.5);
    expect(sanitizeNumber(3)).toBe(3);
  });
});

describe("calculateFootprint", () => {
  it("returns zero for a zero day", () => {
    const out = calculateFootprint({
      carKm: 0, publicTransportKm: 0, flightKm: 0,
      diet: "vegan", electricityKwh: 0, gasKwh: 0,
    });
    expect(out.transport).toBe(0);
    expect(out.energy).toBe(0);
    expect(out.food).toBe(EMISSION_FACTORS.diet.vegan);
    expect(out.total).toBeCloseTo(EMISSION_FACTORS.diet.vegan, 2);
  });
  it("sums transport correctly", () => {
    const out = calculateFootprint({
      carKm: 10, publicTransportKm: 10, flightKm: 0,
      diet: "omnivore", electricityKwh: 0, gasKwh: 0,
    });
    expect(out.transport).toBeCloseTo(10 * 0.192 + 10 * 0.05, 2);
  });
  it("clamps malicious inputs", () => {
    const out = calculateFootprint({
      // @ts-expect-error – simulate raw user input
      carKm: "drop table", publicTransportKm: -99, flightKm: NaN,
      diet: "omnivore", electricityKwh: -1, gasKwh: 1e9,
    });
    expect(out.transport).toBe(0);
    expect(out.energy).toBeLessThanOrEqual(100_000 * EMISSION_FACTORS.gasKwh);
  });
});

describe("getReductionTips", () => {
  it("returns a positive message when footprint is already low", () => {
    const input = {
      carKm: 0, publicTransportKm: 0, flightKm: 0,
      diet: "vegan" as const, electricityKwh: 0, gasKwh: 0,
    };
    const tips = getReductionTips(input, calculateFootprint(input));
    expect(tips.length).toBeGreaterThan(0);
  });
});

describe("getDailyTip", () => {
  it("returns a deterministic, valid tip for the same date", () => {
    const d = new Date("2026-06-20T00:00:00Z");
    expect(getDailyTip(d)).toBe(getDailyTip(d));
    expect(DAILY_TIPS).toContain(getDailyTip(d));
  });
  it("rotates over time", () => {
    const tips = new Set<string>();
    for (let i = 0; i < DAILY_TIPS.length * 2; i++) {
      tips.add(getDailyTip(new Date(2026, 0, i + 1)));
    }
    expect(tips.size).toBe(DAILY_TIPS.length);
  });
});

describe("food search", () => {
  it("matches by keyword", () => {
    const r = searchFoods("burger");
    expect(r.some((f) => f.keywords.includes("burger"))).toBe(true);
  });
  it("returns empty for empty query", () => {
    expect(searchFoods("")).toEqual([]);
  });
  it("sums servings", () => {
    const beef = FOOD_DB.find((f) => f.name.startsWith("Beef"))!;
    const rice = FOOD_DB.find((f) => f.name.startsWith("Rice"))!;
    expect(estimateFoodFootprint([beef, rice])).toBeCloseTo(beef.kg + rice.kg, 2);
  });
});
