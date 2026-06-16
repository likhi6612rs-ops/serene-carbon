import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Leaf, Car, UtensilsCrossed, Home, Lightbulb, TrendingDown } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  calculateFootprint,
  getReductionTips,
  sanitizeNumber,
  DAILY_GLOBAL_AVERAGE,
  type FootprintInput,
} from "@/lib/carbon";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lumen — Carbon Footprint Tracker" },
      {
        name: "description",
        content:
          "Track your daily carbon footprint across transport, food, and home energy. Get personalized tips to reduce your impact.",
      },
      { property: "og:title", content: "Lumen — Carbon Footprint Tracker" },
      {
        property: "og:description",
        content:
          "A calming, lavender-themed dashboard to measure and shrink your daily CO₂ emissions.",
      },
    ],
  }),
  component: Index,
});

const STORAGE_KEY = "lumen.history.v1";

interface HistoryEntry {
  date: string; // YYYY-MM-DD
  total: number;
  transport: number;
  food: number;
  energy: number;
}

function loadHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Sanitize stored data
    return parsed
      .filter((e) => e && typeof e.date === "string")
      .map((e) => ({
        date: String(e.date).slice(0, 10),
        total: sanitizeNumber(e.total),
        transport: sanitizeNumber(e.transport),
        food: sanitizeNumber(e.food),
        energy: sanitizeNumber(e.energy),
      }))
      .slice(-30);
  } catch {
    return [];
  }
}

function saveHistory(history: HistoryEntry[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(-30)));
  } catch {
    /* storage may be unavailable in private mode */
  }
}

function Index() {
  const [input, setInput] = useState<FootprintInput>({
    carKm: 10,
    publicTransportKm: 5,
    flightKm: 0,
    diet: "omnivore",
    electricityKwh: 8,
    gasKwh: 5,
  });
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const breakdown = useMemo(() => calculateFootprint(input), [input]);
  const tips = useMemo(() => getReductionTips(input, breakdown), [input, breakdown]);

  const setField = <K extends keyof FootprintInput>(key: K, value: FootprintInput[K]) =>
    setInput((prev) => ({ ...prev, [key]: value }));

  const logToday = () => {
    const today = new Date().toISOString().slice(0, 10);
    const next = [...history.filter((e) => e.date !== today), { date: today, ...breakdown }]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30);
    setHistory(next);
    saveHistory(next);
  };

  const vsAverage = breakdown.total - DAILY_GLOBAL_AVERAGE;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card/60 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-5">
          <div
            aria-hidden="true"
            className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground"
          >
            <Leaf className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Lumen</h1>
            <p className="text-xs text-muted-foreground">A gentle carbon footprint tracker</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <section aria-labelledby="form-heading" className="grid gap-6 lg:grid-cols-5">
          <form
            className="lg:col-span-3 rounded-2xl border border-border bg-card p-6 shadow-sm"
            onSubmit={(e) => {
              e.preventDefault();
              logToday();
            }}
          >
            <h2 id="form-heading" className="text-lg font-semibold">
              Today's activity
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter what you did today. Numbers update instantly.
            </p>

            <fieldset className="mt-6">
              <legend className="flex items-center gap-2 text-sm font-medium">
                <Car className="h-4 w-4 text-primary" aria-hidden="true" /> Transportation
              </legend>
              <div className="mt-3 grid gap-4 sm:grid-cols-3">
                <NumberField
                  label="Car (km)"
                  value={input.carKm}
                  onChange={(v) => setField("carKm", v)}
                />
                <NumberField
                  label="Public transport (km)"
                  value={input.publicTransportKm}
                  onChange={(v) => setField("publicTransportKm", v)}
                />
                <NumberField
                  label="Flights (km)"
                  value={input.flightKm}
                  onChange={(v) => setField("flightKm", v)}
                />
              </div>
            </fieldset>

            <fieldset className="mt-6">
              <legend className="flex items-center gap-2 text-sm font-medium">
                <UtensilsCrossed className="h-4 w-4 text-primary" aria-hidden="true" /> Food
              </legend>
              <div className="mt-3">
                <label htmlFor="diet" className="text-xs text-muted-foreground">
                  Today's diet
                </label>
                <select
                  id="diet"
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={input.diet}
                  onChange={(e) =>
                    setField("diet", e.target.value as FootprintInput["diet"])
                  }
                >
                  <option value="vegan">Vegan</option>
                  <option value="vegetarian">Vegetarian</option>
                  <option value="omnivore">Omnivore</option>
                  <option value="heavy-meat">Heavy meat</option>
                </select>
              </div>
            </fieldset>

            <fieldset className="mt-6">
              <legend className="flex items-center gap-2 text-sm font-medium">
                <Home className="h-4 w-4 text-primary" aria-hidden="true" /> Home energy
              </legend>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <NumberField
                  label="Electricity (kWh)"
                  value={input.electricityKwh}
                  onChange={(v) => setField("electricityKwh", v)}
                />
                <NumberField
                  label="Gas (kWh)"
                  value={input.gasKwh}
                  onChange={(v) => setField("gasKwh", v)}
                />
              </div>
            </fieldset>

            <button
              type="submit"
              className="mt-6 inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring"
            >
              Log today
            </button>
          </form>

          <aside
            aria-labelledby="result-heading"
            className="lg:col-span-2 rounded-2xl border border-border bg-gradient-to-br from-accent to-secondary p-6 shadow-sm"
          >
            <h2 id="result-heading" className="text-sm font-medium text-secondary-foreground">
              Today's footprint
            </h2>
            <p className="mt-2 text-5xl font-bold tracking-tight text-foreground">
              {breakdown.total}
              <span className="ml-1 text-base font-normal text-muted-foreground">kg CO₂e</span>
            </p>
            <p
              className="mt-2 inline-flex items-center gap-1 text-sm"
              aria-live="polite"
            >
              <TrendingDown
                className={`h-4 w-4 ${vsAverage <= 0 ? "text-primary" : "rotate-180 text-destructive"}`}
                aria-hidden="true"
              />
              <span className="text-muted-foreground">
                {vsAverage <= 0 ? "Below" : "Above"} global avg by{" "}
                {Math.abs(vsAverage).toFixed(1)} kg
              </span>
            </p>

            <dl className="mt-6 space-y-3">
              <Stat label="Transport" value={breakdown.transport} />
              <Stat label="Food" value={breakdown.food} />
              <Stat label="Energy" value={breakdown.energy} />
            </dl>
          </aside>
        </section>

        <section aria-labelledby="trend-heading" className="mt-8">
          <h2 id="trend-heading" className="text-lg font-semibold">
            Trend
          </h2>
          <p className="text-sm text-muted-foreground">
            Your daily totals over the last {history.length || 0} logged day(s).
          </p>
          <div className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="h-64 w-full">
              {history.length === 0 ? (
                <div className="grid h-full place-items-center text-sm text-muted-foreground">
                  Log today to start building your trend.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={12} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke="var(--primary)"
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </section>

        <section aria-labelledby="tips-heading" className="mt-8">
          <h2 id="tips-heading" className="flex items-center gap-2 text-lg font-semibold">
            <Lightbulb className="h-5 w-5 text-primary" aria-hidden="true" />
            Personalized tips
          </h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-3">
            {tips.map((tip, i) => (
              <li
                key={i}
                className="rounded-2xl border border-border bg-card p-4 text-sm leading-relaxed shadow-sm"
              >
                {tip}
              </li>
            ))}
          </ul>
        </section>

        <footer className="mt-12 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          Data stays on your device. No tracking, no accounts.
        </footer>
      </main>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <div>
      <label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        min={0}
        step="0.1"
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(sanitizeNumber(e.target.value))}
        className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium text-foreground">{value} kg</dd>
    </div>
  );
}
