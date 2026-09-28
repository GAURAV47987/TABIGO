// TABIGO: Gemini-backed AI itinerary generator.
//
// Deployed in Supabase as "rapid-function" (its actual route — see
// src/supabase.js) even though its display name is "generate-itinerary";
// the dashboard's creation template's slug stuck after renaming.
// Set a secret: Edge Functions -> Secrets -> GEMINI_API_KEY
// (from https://aistudio.google.com/apikey).

import { createClient } from "npm:@supabase/supabase-js@2";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-2.5-flash";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function buildPrompt(destinationName: string, numDays: number) {
  return `You are a travel-planning assistant. Create a day-by-day itinerary for a trip to ${destinationName}, lasting ${numDays} day(s).

For each day, include:
- 2-3 activities or sights spread across the day (morning/afternoon), each with a suggested time (24h "HH:MM")
- A lunch and a dinner recommendation, each naming an actual restaurant, dish, or food area where possible, with a suggested time
- At most ONE genuinely iconic "must-visit photo spot" across the ENTIRE trip (not one per day) — a specific named location or restaurant famous for its view or photo opportunity, with a note on the best time of day to go and why it's worth it. Place it on whichever day makes the most geographic sense. Only include it at all if the destination actually has a well-known iconic spot; otherwise omit it.

Respond with ONLY valid JSON, no markdown, no commentary, in exactly this shape:
{"days":[{"day":1,"items":[{"time":"09:00","title":"...","notes":"...","type":"activity"}]}]}

Valid "type" values: "activity", "food", "photo". Keep "notes" to one short sentence (can be an empty string). Do not include days beyond ${numDays}.`;
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
    const destinationName = String(body.destinationName || "").slice(0, 200);
    const startDate = String(body.startDate || "");
    const endDate = String(body.endDate || "");
    if (!destinationName || !startDate || !endDate) throw new Error("Missing destination or dates");

    const numDays = Math.max(1, Math.round((Number(new Date(endDate)) - Number(new Date(startDate))) / 86400000) + 1);
    if (numDays > 30) throw new Error("Trip too long for AI generation (max 30 days)");

    const raw = await callGemini(buildPrompt(destinationName, numDays));
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
