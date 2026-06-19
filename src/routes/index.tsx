import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Leaf } from "lucide-react";
import { DottedSurface } from "@/components/ui/dotted-surface";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SERENE — Carbon Footprint Tracker" },
      {
        name: "description",
        content:
          "SERENE is a calming carbon footprint tracker with AI-powered reduction insights.",
      },
    ],
  }),
  component: SplashPage,
});

function SplashPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const start = performance.now();
    (async () => {
      const { data } = await supabase.auth.getSession();
      // Hold splash for at least 2s for the brand animation to land.
      const elapsed = performance.now() - start;
      const wait = Math.max(0, 2000 - elapsed);
      setTimeout(() => {
        if (cancelled) return;
        navigate({
          to: data.session ? "/dashboard" : "/auth",
          replace: true,
        });
      }, wait);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <DottedSurface />
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mb-6 grid h-16 w-16 place-items-center rounded-2xl bg-primary/90 text-primary-foreground shadow-lg backdrop-blur"
          aria-hidden="true"
        >
          <Leaf className="h-8 w-8" />
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 20, letterSpacing: "0.4em" }}
          animate={{ opacity: 1, y: 0, letterSpacing: "0.25em" }}
          transition={{ duration: 1.1, ease: "easeOut" }}
          className="bg-gradient-to-br from-foreground to-primary bg-clip-text text-5xl font-extralight uppercase tracking-[0.25em] text-transparent sm:text-7xl"
        >
          SERENE
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: ready ? 1 : 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="mt-4 max-w-md text-sm text-muted-foreground"
        >
          A calmer way to track and shrink your carbon footprint.
        </motion.p>
      </div>
    </main>
  );
}