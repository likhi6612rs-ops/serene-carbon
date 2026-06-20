import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shield, Users, Activity, Loader2, ArrowLeft } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { adminGetOverview } from "@/lib/footprints.functions";
import { supabase } from "@/integrations/supabase/client";

const ADMIN_EMAIL = "likhi6612rs@gmail.com";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — SERENE" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

interface Overview {
  totalUsers: number;
  totalEntries: number;
  avgTotal: number;
  profiles: { id: string; email: string | null; created_at: string }[];
  footprints: {
    user_id: string;
    date: string;
    transport: number;
    food: number;
    energy: number;
    total: number;
    created_at: string;
  }[];
}

function AdminPage() {
  const navigate = useNavigate();
  const fetchOverview = useServerFn(adminGetOverview);
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const email = u.user?.email?.toLowerCase() ?? "";
      if (email !== ADMIN_EMAIL) {
        if (!cancelled) {
          setAuthorized(false);
          setLoading(false);
        }
        return;
      }
      if (!cancelled) setAuthorized(true);
      try {
        const res = await fetchOverview();
        if (!cancelled) setData(res as Overview);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchOverview]);

  if (authorized === false) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-4">
        <div className="max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <Shield className="mx-auto h-10 w-10 text-destructive" aria-hidden="true" />
          <h1 className="mt-3 text-xl font-semibold text-foreground">Access denied</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            The admin dashboard is restricted to authorized accounts only.
          </p>
          <button
            onClick={() => navigate({ to: "/dashboard" })}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <ArrowLeft className="h-4 w-4" /> Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card/60 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-5">
          <div
            aria-hidden="true"
            className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground"
          >
            <Shield className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-semibold tracking-[0.2em] uppercase">SERENE Admin</h1>
            <p className="text-xs text-muted-foreground">Live registration &amp; footprint data</p>
          </div>
          <button
            onClick={() => navigate({ to: "/dashboard" })}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-accent"
          >
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {loading && (
          <div className="flex items-center gap-2 text-muted-foreground" role="status">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading admin data…
          </div>
        )}
        {error && (
          <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        {data && (
          <>
            <section className="grid gap-4 sm:grid-cols-3" aria-label="Summary metrics">
              <Card icon={<Users className="h-5 w-5" />} label="Registered users" value={data.totalUsers} />
              <Card icon={<Activity className="h-5 w-5" />} label="Footprint entries" value={data.totalEntries} />
              <Card
                icon={<Activity className="h-5 w-5" />}
                label="Avg daily total (kg CO₂e)"
                value={data.avgTotal.toFixed(2)}
              />
            </section>

            <section className="mt-8" aria-labelledby="users-heading">
              <h2 id="users-heading" className="text-lg font-semibold">
                Recent users
              </h2>
              <div className="mt-3 overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-left text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2">Email</th>
                      <th className="px-4 py-2">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.profiles.map((p) => (
                      <tr key={p.id} className="border-t border-border">
                        <td className="px-4 py-2">{p.email ?? <em className="text-muted-foreground">unknown</em>}</td>
                        <td className="px-4 py-2 text-muted-foreground">
                          {new Date(p.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                    {data.profiles.length === 0 && (
                      <tr><td colSpan={2} className="px-4 py-6 text-center text-muted-foreground">No users yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="mt-8" aria-labelledby="entries-heading">
              <h2 id="entries-heading" className="text-lg font-semibold">
                Recent footprint entries
              </h2>
              <div className="mt-3 overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-left text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2">User</th>
                      <th className="px-4 py-2">Date</th>
                      <th className="px-4 py-2">Transport</th>
                      <th className="px-4 py-2">Food</th>
                      <th className="px-4 py-2">Energy</th>
                      <th className="px-4 py-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.footprints.map((f, i) => {
                      const email = data.profiles.find((p) => p.id === f.user_id)?.email ?? f.user_id.slice(0, 8);
                      return (
                        <tr key={i} className="border-t border-border">
                          <td className="px-4 py-2">{email}</td>
                          <td className="px-4 py-2">{f.date}</td>
                          <td className="px-4 py-2">{Number(f.transport).toFixed(2)}</td>
                          <td className="px-4 py-2">{Number(f.food).toFixed(2)}</td>
                          <td className="px-4 py-2">{Number(f.energy).toFixed(2)}</td>
                          <td className="px-4 py-2 font-medium">{Number(f.total).toFixed(2)}</td>
                        </tr>
                      );
                    })}
                    {data.footprints.length === 0 && (
                      <tr><td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">No entries yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function Card({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <p className="mt-2 text-3xl font-semibold text-foreground">{value}</p>
    </div>
  );
}
