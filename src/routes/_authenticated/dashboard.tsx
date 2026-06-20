import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Leaf,
  Car,
  UtensilsCrossed,
  Home,
  Lightbulb,
  TrendingDown,
  LogOut,
  Plus,
  X,
  Shield,
  Sparkles,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { useServerFn } from "@tanstack/react-start";
import {
  calculateFootprint,
  getReductionTips,
  sanitizeNumber,
  getDailyTip,
  DAILY_GLOBAL_AVERAGE,
  type FootprintInput,
} from "@/lib/carbon";
import {
  FOOD_DB,
  searchFoods,
  estimateFoodFootprint,
  DEFAULT_FOOD_KG,
  type FoodEstimate,
} from "@/lib/food-search";
import { supabase } from "@/integrations/supabase/client";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { InsightChat, type InsightHistoryEntry } from "@/components/insight-chat";
import {
  upsertFootprint,
  listMyFootprints,
} from "@/lib/footprints.functions";

const ADMIN_EMAIL = "likhi6612rs@gmail.com";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — SERENE" },
      { name: "description", content: "Your daily SERENE carbon dashboard." },
    ],
  }),
  component: Dashboard,
});

// Petrol: ~2.31 kg CO2e per liter burned (DEFRA).
const PETROL_KG_PER_LITER = 2.31;

interface ExtendedInput extends FootprintInput {
  monthlyElectricityKwh: number;
  monthlyPetrolLiters: number;
}

function Dashboard() {
  const navigate = useNavigate();
  const upsert = useServerFn(upsertFootprint);
  const listFn = useServerFn(listMyFootprints);

  const [input, setInput] = useState<ExtendedInput>({
    carKm: 10,
    publicTransportKm: 5,
    flightKm: 0,
    diet: "omnivore", // kept as fallback; foods override when present
    electricityKwh: 8,
    gasKwh: 5,
    monthlyElectricityKwh: 0,
    monthlyPetrolLiters: 0,
  });
  const [foods, setFoods] = useState<FoodEstimate[]>([]);
  const [foodQuery, setFoodQuery] = useState("");
  const [history, setHistory] = useState<InsightHistoryEntry[]>([]);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // Load user + history
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!cancelled) setUserEmail(u.user?.email ?? null);
      try {
        const res = await listFn();
        if (!cancelled) {
          setHistory(
            (res.entries ?? []).map((e) => ({
              date: e.date,
              total: Number(e.total),
              transport: Number(e.transport),
              food: Number(e.food),
              energy: Number(e.energy),
            })),
          );
        }
      } catch {
        /* network/auth race — ignore, show empty trend */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [listFn]);

  // Derive daily electricity from monthly bill when provided.
  const electricityKwh = useMemo(() => {
    return input.monthlyElectricityKwh > 0
      ? Math.round((input.monthlyElectricityKwh / 30) * 100) / 100
      : input.electricityKwh;
  }, [input.electricityKwh, input.monthlyElectricityKwh]);

  // Derive daily petrol kg CO2e from monthly liters.
  const petrolKgDaily = useMemo(() => {
    return input.monthlyPetrolLiters > 0
      ? Math.round((input.monthlyPetrolLiters * PETROL_KG_PER_LITER / 30) * 100) / 100
      : 0;
  }, [input.monthlyPetrolLiters]);

  const breakdown = useMemo(() => {
    const base = calculateFootprint({
      ...input,
      electricityKwh,
    });
    // If user logged foods, override food category with smart-search sum.
    const food = foods.length > 0 ? estimateFoodFootprint(foods) : base.food;
    const transport = Math.round((base.transport + petrolKgDaily) * 100) / 100;
    const total = Math.round((transport + food + base.energy) * 100) / 100;
    return { transport, food, energy: base.energy, total };
  }, [input, electricityKwh, foods, petrolKgDaily]);

  const tips = useMemo(() => getReductionTips(input, breakdown), [input, breakdown]);
  const dailyTip = useMemo(() => getDailyTip(), []);
  const suggestions = useMemo(() => searchFoods(foodQuery), [foodQuery]);

  const setField = <K extends keyof ExtendedInput>(key: K, value: ExtendedInput[K]) =>
    setInput((prev) => ({ ...prev, [key]: value }));

  const logToday = async () => {
    setSaving(true);
    setSaveMsg(null);
    const today = new Date().toISOString().slice(0, 10);
    try {
      await upsert({ data: { date: today, ...breakdown } });
      const next = [
        ...history.filter((e) => e.date !== today),
        { date: today, ...breakdown },
      ]
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-60);
      setHistory(next);
      setSaveMsg("Saved!");
    } catch (err) {
      setSaveMsg(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(null), 2500);
    }
  };

  const addFood = (f: FoodEstimate) => {
    setFoods((prev) => [...prev, f]);
    setFoodQuery("");
  };
  const addCustomFood = () => {
    const q = foodQuery.trim();
    if (!q) return;
    addFood({ name: q, kg: DEFAULT_FOOD_KG, keywords: [q.toLowerCase()] });
  };

  const vsAverage = breakdown.total - DAILY_GLOBAL_AVERAGE;
  const isAdmin = (userEmail ?? "").toLowerCase() === ADMIN_EMAIL;

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

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
          <div className="flex-1">
            <h1 className="text-xl font-semibold tracking-[0.2em] uppercase">SERENE</h1>
            <p className="text-xs text-muted-foreground">A calming carbon footprint tracker</p>
          </div>
          {isAdmin && (
            <Link
              to="/admin"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-accent"
              aria-label="Admin dashboard"
            >
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Admin</span>
            </Link>
          )}
          <ThemeSwitcher />
          <button
            onClick={handleSignOut}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {/* Daily rotating tip */}
        <div
          className="mb-6 flex items-start gap-3 rounded-2xl border border-border bg-gradient-to-br from-accent/60 to-secondary/60 p-4 text-sm shadow-sm"
          role="note"
          aria-label="Tip of the day"
        >
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <div>
            <p className="font-medium text-foreground">Tip of the day</p>
            <p className="mt-0.5 text-foreground/90">{dailyTip}</p>
          </div>
        </div>

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
                <NumberField label="Car (km)" value={input.carKm} onChange={(v) => setField("carKm", v)} />
                <NumberField
                  label="Public transport (km)"
                  value={input.publicTransportKm}
                  onChange={(v) => setField("publicTransportKm", v)}
                />
                <NumberField label="Flights (km)" value={input.flightKm} onChange={(v) => setField("flightKm", v)} />
              </div>
              <div className="mt-3">
                <NumberField
                  label="Petrol used this month (liters) — auto-converted to daily"
                  value={input.monthlyPetrolLiters}
                  onChange={(v) => setField("monthlyPetrolLiters", v)}
                />
                {input.monthlyPetrolLiters > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    ≈ {petrolKgDaily} kg CO₂e / day added to transport.
                  </p>
                )}
              </div>
            </fieldset>

            <fieldset className="mt-6">
              <legend className="flex items-center gap-2 text-sm font-medium">
                <UtensilsCrossed className="h-4 w-4 text-primary" aria-hidden="true" /> Food
              </legend>
              <p className="mt-1 text-xs text-muted-foreground">
                Search what you ate today. Each item adds its estimated CO₂e.
              </p>
              <div className="relative mt-3">
                <label htmlFor="food-search" className="sr-only">
                  Search food
                </label>
                <input
                  id="food-search"
                  type="text"
                  value={foodQuery}
                  onChange={(e) => setFoodQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (suggestions[0]) addFood(suggestions[0]);
                      else addCustomFood();
                    }
                  }}
                  placeholder="e.g. chicken, rice, latte…"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  list="food-list"
                />
                <datalist id="food-list">
                  {FOOD_DB.map((f) => (
                    <option key={f.name} value={f.name} />
                  ))}
                </datalist>
                {foodQuery && suggestions.length > 0 && (
                  <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-border bg-popover shadow-lg">
                    {suggestions.map((f) => (
                      <li key={f.name}>
                        <button
                          type="button"
                          onClick={() => addFood(f)}
                          className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent"
                        >
                          <span>{f.name}</span>
                          <span className="text-xs text-muted-foreground">{f.kg} kg CO₂e</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {foods.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-2" aria-label="Logged foods today">
                  {foods.map((f, i) => (
                    <li
                      key={`${f.name}-${i}`}
                      className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs text-accent-foreground"
                    >
                      <span>{f.name} · {f.kg} kg</span>
                      <button
                        type="button"
                        onClick={() => setFoods((prev) => prev.filter((_, j) => j !== i))}
                        aria-label={`Remove ${f.name}`}
                        className="rounded-full p-0.5 hover:bg-foreground/10"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {foods.length === 0 && (
                <div className="mt-3">
                  <label htmlFor="diet" className="text-xs text-muted-foreground">
                    Or pick today's overall diet
                  </label>
                  <select
                    id="diet"
                    className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    value={input.diet}
                    onChange={(e) => setField("diet", e.target.value as FootprintInput["diet"])}
                  >
                    <option value="vegan">Vegan</option>
                    <option value="vegetarian">Vegetarian</option>
                    <option value="omnivore">Omnivore</option>
                    <option value="heavy-meat">Heavy meat</option>
                  </select>
                </div>
              )}
              {foodQuery && suggestions.length === 0 && (
                <button
                  type="button"
                  onClick={addCustomFood}
                  className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <Plus className="h-3 w-3" /> Add "{foodQuery}" as a custom item
                </button>
              )}
            </fieldset>

            <fieldset className="mt-6">
              <legend className="flex items-center gap-2 text-sm font-medium">
                <Home className="h-4 w-4 text-primary" aria-hidden="true" /> Home energy
              </legend>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <NumberField
                  label="Electricity (kWh / day)"
                  value={input.electricityKwh}
                  onChange={(v) => setField("electricityKwh", v)}
                  disabled={input.monthlyElectricityKwh > 0}
                />
                <NumberField label="Gas (kWh / day)" value={input.gasKwh} onChange={(v) => setField("gasKwh", v)} />
              </div>
              <div className="mt-3">
                <NumberField
                  label="Monthly electricity bill (kWh) — auto-converted to daily"
                  value={input.monthlyElectricityKwh}
                  onChange={(v) => setField("monthlyElectricityKwh", v)}
                />
                {input.monthlyElectricityKwh > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    ≈ {electricityKwh} kWh / day (overrides the daily field).
                  </p>
                )}
              </div>
            </fieldset>

            <div className="mt-6 flex items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {saving ? "Saving…" : "Log today"}
              </button>
              {saveMsg && (
                <p role="status" className="text-xs text-muted-foreground">
                  {saveMsg}
                </p>
              )}
            </div>
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
            <p className="mt-2 inline-flex items-center gap-1 text-sm" aria-live="polite">
              <TrendingDown
                className={`h-4 w-4 ${vsAverage <= 0 ? "text-primary" : "rotate-180 text-destructive"}`}
                aria-hidden="true"
              />
              <span className="text-muted-foreground">
                {vsAverage <= 0 ? "Below" : "Above"} global avg by {Math.abs(vsAverage).toFixed(1)} kg
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

        <section className="mt-8 grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3" aria-labelledby="tips-heading">
            <h2 id="tips-heading" className="flex items-center gap-2 text-lg font-semibold">
              <Lightbulb className="h-5 w-5 text-primary" aria-hidden="true" />
              Personalized tips
            </h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {tips.map((tip, i) => (
                <li
                  key={i}
                  className="rounded-2xl border border-border bg-card p-4 text-sm leading-relaxed shadow-sm"
                >
                  {tip}
                </li>
              ))}
            </ul>
          </div>
          <div className="lg:col-span-2">
            <InsightChat footprint={breakdown} history={history} />
          </div>
        </section>

        <footer className="mt-12 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          SERENE · Data synced securely to your account. AI insights via Lovable AI.
        </footer>
      </main>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  // Local string state so the user can clear the field and the placeholder "0"
  // disappears on focus instead of forcing them to delete it.
  const [text, setText] = useState<string>(value === 0 ? "" : String(value));

  // Sync from outside changes (e.g. derived auto-fill).
  useEffect(() => {
    setText(value === 0 ? "" : String(value));
  }, [value]);

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
        placeholder="0"
        disabled={disabled}
        value={text}
        onFocus={(e) => {
          if (e.target.value === "0") {
            setText("");
            onChange(0);
          }
        }}
        onChange={(e) => {
          const raw = e.target.value;
          setText(raw);
          onChange(sanitizeNumber(raw));
        }}
        onBlur={() => {
          if (text === "") {
            setText("");
            onChange(0);
          }
        }}
        className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
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
