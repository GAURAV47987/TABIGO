import { enumerateDates } from "./dates";

const forecastUrl = (lat, lng) =>
  `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto&forecast_days=16`;

const archiveUrl = (lat, lng, start, end) =>
  `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&start_date=${start}&end_date=${end}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`;

function shiftYears(dateStr, years) {
  const d = new Date(dateStr + "T00:00:00");
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().slice(0, 10);
}

function summarize(daily, wantedDates) {
  if (!daily?.time) return { avgHigh: null, avgLow: null, rainyDays: 0 };
  const idxs = daily.time
    .map((t, i) => (!wantedDates || wantedDates.includes(t) ? i : -1))
    .filter((i) => i >= 0);
  const pick = idxs.length ? idxs : daily.time.map((_, i) => i);
  const highs = pick.map((i) => daily.temperature_2m_max[i]).filter((v) => v != null);
  const lows = pick.map((i) => daily.temperature_2m_min[i]).filter((v) => v != null);
  const precs = pick.map((i) => daily.precipitation_sum[i]).filter((v) => v != null);
  const avg = (arr) => (arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : null);
  return { avgHigh: avg(highs), avgLow: avg(lows), rainyDays: precs.filter((p) => p > 1).length };
}

// Live forecast when the trip starts within Open-Meteo's 16-day horizon;
// otherwise approximates seasonal climate from the same calendar dates in
// the previous two years (both free, keyless Open-Meteo endpoints).
export async function getTripClimate(lat, lng, startDate, endDate) {
  const daysUntil = Math.ceil((new Date(startDate + "T00:00:00") - new Date()) / 86400000);

  if (daysUntil >= 0 && daysUntil <= 15) {
    const res = await fetch(forecastUrl(lat, lng));
    if (!res.ok) throw new Error("weather fetch failed");
    const data = await res.json();
    return { ...summarize(data.daily, enumerateDates(startDate, endDate)), source: "forecast" };
  }

  const samples = [];
  for (const years of [-1, -2]) {
    try {
      const res = await fetch(archiveUrl(lat, lng, shiftYears(startDate, years), shiftYears(endDate, years)));
      if (!res.ok) continue;
      const data = await res.json();
      samples.push(summarize(data.daily));
    } catch (e) {}
  }
  if (!samples.length) throw new Error("climate data unavailable");
  const avg = (key) => {
    const vals = samples.map((s) => s[key]).filter((v) => v != null);
    return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
  };
  return { avgHigh: avg("avgHigh"), avgLow: avg("avgLow"), rainyDays: avg("rainyDays"), source: "climate" };
}
