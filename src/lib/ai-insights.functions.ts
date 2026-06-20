import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Streamed AI insight chat for the SERENE dashboard.
 *
 * Calls Lovable AI Gateway (no user-provided key required) and returns
 * the assistant's full reply as plain text. The server function injects
 * the user's current footprint as system context so suggestions are
 * personalized.
 */

const FootprintSchema = z.object({
  transport: z.number(),
  food: z.number(),
  energy: z.number(),
  total: z.number(),
});

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(2000),
});

const HistoryEntrySchema = z.object({
  date: z.string().max(20),
  total: z.number(),
  transport: z.number(),
  food: z.number(),
  energy: z.number(),
});

const InsightInput = z.object({
  messages: z.array(MessageSchema).min(1).max(20),
  footprint: FootprintSchema,
  history: z.array(HistoryEntrySchema).max(60).optional(),
});

export const getInsight = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InsightInput.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      throw new Error("AI is not configured (missing LOVABLE_API_KEY).");
    }

    const history = data.history ?? [];
    const logged = history.filter((h) => h.total > 0);
    const avg = logged.length
      ? logged.reduce((a, h) => a + h.total, 0) / logged.length
      : data.footprint.total;
    const last7 = logged.slice(-7);
    const trendText = last7.length
      ? last7.map((h) => `${h.date}: ${h.total.toFixed(1)} kg`).join("; ")
      : "no logged history yet";

    const system = `You are SERENE, an empathetic lifestyle and sustainability coach.

PERSONA:
- Warm, supportive, non-judgmental.
- You care about the user's wellbeing first, the planet second.

USER CONTEXT (use only if relevant — don't recite it):
- Today's footprint: transport ${data.footprint.transport.toFixed(1)} kg, food ${data.footprint.food.toFixed(1)} kg, energy ${data.footprint.energy.toFixed(1)} kg, total ${data.footprint.total.toFixed(1)} kg CO2e.
- Logged days: ${logged.length}. Average daily total across logged days: ${avg.toFixed(1)} kg.
- Recent 7-day trend: ${trendText}.

RESPONSE RULES:
1. PRIORITIZE USER INTENT. If the user asks a general health or wellness question (e.g. "how to reduce belly fat", "better sleep", "energy levels"), answer it DIRECTLY first using evidence-based health information — do NOT lecture about carbon.
2. BRIDGE TECHNIQUE. After giving the helpful health answer, gently pivot in 1-2 sentences to how those same habits (plant-forward eating, active transport, less driving, lower thermostat) also lower their carbon footprint. Use a soft phrase like "Interestingly, ..." or "And as a bonus for the planet, ...".
3. SAFETY. If a health question is complex, serious, medical, mental-health, or involves symptoms/medication, tell the user kindly to consult a qualified healthcare professional before giving general lifestyle pointers.
4. CARBON-ONLY QUESTIONS. If the question is purely about emissions, footprint, or sustainability, skip the health step and give a specific, actionable tip based on their largest category or recent trend.
5. AVOID "zero-day" assumptions — if today's totals are zero, refer to their historical average or general baselines instead of saying "you have no impact".
6. Reply in under 140 words. Plain text. No markdown headings. Be specific and kind.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: system }, ...data.messages],
      }),
    });

    if (res.status === 429) {
      throw new Error("Rate limit reached. Please wait a moment and try again.");
    }
    if (res.status === 402) {
      throw new Error("AI credits exhausted for this workspace.");
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`AI request failed (${res.status}): ${text.slice(0, 200)}`);
    }

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const reply = json.choices?.[0]?.message?.content?.trim() ?? "";
    return { reply };
  });