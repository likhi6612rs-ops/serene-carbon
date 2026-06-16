/**
 * Carbon footprint calculation library.
 *
 * All emission factors are expressed in kilograms of CO2-equivalent (kg CO2e).
 * Sources (approximate, averaged):
 *  - Transport: UK DEFRA 2023 (passenger.km factors)
 *  - Food: Our World in Data (Poore & Nemecek 2018, per kg / per serving)
 *  - Energy: EPA eGRID + EIA residential averages
 *
 * The module is pure (no I/O, no DOM) so it is trivially unit-testable.
 */

export interface FootprintInput {
  /** Daily kilometres driven in a petrol/diesel car. */
  carKm: number;
  /** Daily kilometres on public transport (bus/train averaged). */
  publicTransportKm: number;
  /** Short-haul flight kilometres averaged over the day. */
  flightKm: number;
  /** Diet type for the day. */
  diet: "vegan" | "vegetarian" | "omnivore" | "heavy-meat";
  /** Household electricity used today (kWh). */
  electricityKwh: number;
  /** Natural gas used today (kWh equivalent). */
  gasKwh: number;
}

export interface FootprintBreakdown {
  transport: number;
  food: number;
  energy: number;
  total: number;
}

/** Emission factors in kg CO2e per unit. Exported for testing. */
export const EMISSION_FACTORS = {
  carKm: 0.192,
  publicTransportKm: 0.05,
  flightKm: 0.255,
  diet: {
    vegan: 1.5,
    vegetarian: 2.5,
    omnivore: 5.0,
    "heavy-meat": 7.2,
  },
  electricityKwh: 0.4,
  gasKwh: 0.2,
} as const;

/** Clamp a numeric input to a safe non-negative range. Sanitises user input. */
export function sanitizeNumber(value: unknown, max = 100_000): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, max);
}

/**
 * Calculate the daily carbon footprint from user inputs.
 * Returns a breakdown by category plus the total, all in kg CO2e.
 */
export function calculateFootprint(input: FootprintInput): FootprintBreakdown {
  const transport =
    sanitizeNumber(input.carKm) * EMISSION_FACTORS.carKm +
    sanitizeNumber(input.publicTransportKm) * EMISSION_FACTORS.publicTransportKm +
    sanitizeNumber(input.flightKm) * EMISSION_FACTORS.flightKm;

  const food = EMISSION_FACTORS.diet[input.diet] ?? EMISSION_FACTORS.diet.omnivore;

  const energy =
    sanitizeNumber(input.electricityKwh) * EMISSION_FACTORS.electricityKwh +
    sanitizeNumber(input.gasKwh) * EMISSION_FACTORS.gasKwh;

  const total = transport + food + energy;

  return {
    transport: round(transport),
    food: round(food),
    energy: round(energy),
    total: round(total),
  };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Generate up to 3 personalized, actionable reduction tips based on which
 * category dominates the user's footprint.
 */
export function getReductionTips(
  input: FootprintInput,
  breakdown: FootprintBreakdown,
): string[] {
  const tips: Array<{ score: number; text: string }> = [];

  if (input.carKm > 10) {
    tips.push({
      score: input.carKm * EMISSION_FACTORS.carKm,
      text: `Replace ${Math.round(input.carKm / 2)} km of car travel with cycling or public transport to save up to ${round((input.carKm / 2) * (EMISSION_FACTORS.carKm - EMISSION_FACTORS.publicTransportKm))} kg CO₂e per day.`,
    });
  }
  if (input.flightKm > 0) {
    tips.push({
      score: input.flightKm * EMISSION_FACTORS.flightKm,
      text: "Consider trains over short-haul flights — they emit roughly 5× less CO₂ per kilometre.",
    });
  }
  if (input.diet === "heavy-meat" || input.diet === "omnivore") {
    const saving = round(
      EMISSION_FACTORS.diet[input.diet] - EMISSION_FACTORS.diet.vegetarian,
    );
    tips.push({
      score: saving,
      text: `Swap one meat meal for a plant-based option to cut about ${saving} kg CO₂e from today's food footprint.`,
    });
  }
  if (input.electricityKwh > 8) {
    tips.push({
      score: input.electricityKwh * EMISSION_FACTORS.electricityKwh,
      text: "Switch to LED bulbs and unplug idle electronics — typical households cut 15-20% of electricity use this way.",
    });
  }
  if (input.gasKwh > 10) {
    tips.push({
      score: input.gasKwh * EMISSION_FACTORS.gasKwh,
      text: "Lower your thermostat by 1 °C — it can reduce heating emissions by up to 10%.",
    });
  }

  // Fallback generic tip if footprint is already low
  if (tips.length === 0) {
    tips.push({
      score: 0,
      text: "Great job — your footprint is below average. Keep tracking to stay consistent!",
    });
  }

  // Return the top 3 highest-impact tips
  return tips
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((t) => t.text);
}

/** Global average daily footprint (~13.4 kg CO2e/day per person). */
export const DAILY_GLOBAL_AVERAGE = 13.4;