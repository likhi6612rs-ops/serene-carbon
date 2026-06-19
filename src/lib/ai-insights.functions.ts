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

const InsightInput = z.object({
  messages: z.array(MessageSchema).min(1).max(20),
  footprint: FootprintSchema,
});

export const getInsight = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InsightInput.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      throw new Error("AI is not configured (missing LOVABLE_API_KEY).");
    }

    const system = `You are SERENE, a calm and encouraging carbon-reduction coach.
The user's logged daily footprint is roughly:
- Transport: ${data.footprint.transport.toFixed(1)} kg CO2e
- Food: ${data.footprint.food.toFixed(1)} kg CO2e
- Energy: ${data.footprint.energy.toFixed(1)} kg CO2e
- Total: ${data.footprint.total.toFixed(1)} kg CO2e

Reply briefly (under 120 words). Use plain text, no markdown headings.
Be specific, kind, and actionable. Prioritize the largest category.`;

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