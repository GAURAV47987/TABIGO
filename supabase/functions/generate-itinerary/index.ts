// TABIGO: Gemini-backed AI itinerary generator.
//
// Deployed in Supabase as "rapid-function" (its actual route — see
// src/supabase.js) even though its display name is "generate-itinerary";
// the dashboard's creation template's slug stuck after renaming.
// Set a secret: Edge Functions -> Secrets -> GEMINI_API_KEY
// (from https://aistudio.google.com/apikey).

import { createClient } from "npm:@supabase/supabase-js@2";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-3.8-flash";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function buildPrompt(stops: { name: string; days: number }[]) {
  let day = 1;
  const stopLines = stops
    .map((s) => {
      const range = s.days > 1 ? `days ${day}-${day + s.days - 1}` : `day ${day}`;
      day += s.days;
      return `- ${s.name}: ${s.days} day(s) (${range})`;
    })
    .join("\n");
  const numDays = day - 1;

  return `You are a travel-planning assistant. This trip visits the following stops, IN THIS ORDER, on these exact days — do not add, remove, reorder, or substitute any stop:

${stopLines}

For EACH day, plan activities and food ONLY in that day's assigned stop (never a different city than the one listed for that day number). Include:
- 2-3 activities or sights spread across the day (morning/afternoon), each with a suggested time (24h "HH:MM")
- A lunch and a dinner recommendation, each naming an actual restaurant, dish, or food area in that day's stop where possible, with a suggested time

Across the ENTIRE trip, pick AT MOST ONE genuinely iconic "must-visit photo spot" (not one per day, not one per stop) — a specific named location or restaurant in one of the stops above, famous for its view or photo opportunity, with a note on the best time of day to go and why it's worth it. Place it on whichever day matches its stop. Only include it if one of the stops actually has a well-known iconic spot; otherwise omit it entirely.

Respond with ONLY valid JSON, no markdown, no commentary, in exactly this shape:
{"days":[{"day":1,"items":[{"time":"09:00","title":"...","notes":"...","type":"activity"}]}]}

Valid "type" values: "activity", "food", "photo". Keep "notes" to one short sentence (can be an empty string). Do not include days beyond ${numDays}.`;
}

function buildSuggestPrompt(destination: string) {
  return `You are a well-traveled local guide. Someone is planning a trip and has chosen "${destination}" as a stop. Suggest 6 genuinely worth-visiting places — towns, neighborhoods, or day-trip destinations — within or near ${destination} that a first-time visitor would want to consider adding to their route.

For each, give its real, specific name (something a map/search service would recognize) and one short, specific sentence on why it's worth visiting — not generic ("beautiful scenery") but a concrete reason (what you'd actually see or do there).

Respond with ONLY valid JSON, no markdown, no commentary, in exactly this shape:
{"places":[{"name":"...","reason":"..."}]}`;
}

async function callGemini(prompt: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.6 },
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini error ${res.status}: ${errText.slice(0, 300)}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Empty response from Gemini");
  return text;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY secret is not set");

    const authHeader = req.headers.get("Authorization") || "";
    const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();

    if (body.mode === "suggest_places") {
      const destination = String(body.destination || "").slice(0, 200);
      if (!destination) throw new Error("Missing destination");
      const raw = await callGemini(buildSuggestPrompt(destination));
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed.places)) throw new Error("Unexpected response shape");
      return new Response(JSON.stringify(parsed), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const stops = Array.isArray(body.stops)
      ? body.stops
          .map((s: any) => ({ name: String(s?.name || "").slice(0, 200), days: Math.max(1, Math.round(Number(s?.days) || 1)) }))
          .filter((s: any) => s.name)
      : [];
    if (!stops.length) throw new Error("Missing stops");

    const totalDays = stops.reduce((sum: number, s: any) => sum + s.days, 0);
    if (totalDays > 30) throw new Error("Trip too long for AI generation (max 30 days)");

    const raw = await callGemini(buildPrompt(stops));
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.days)) throw new Error("Unexpected response shape");

    return new Response(JSON.stringify(parsed), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
