import { getTopCityForCountry } from "./geonames";
import { getCachedPlacePhoto, cachePlacePhoto } from "./supabase";

const PEXELS_API_KEY = "33QnE4pMrw2lXIRjG66fts2QgkhFMYuvetXzZMXgfpgAFL8JV6l6W4Pn";

// A continent is too broad to search for one representative photo — skip
// it entirely rather than show a random, unrelated stock result.
const CONTINENTS = new Set(["europe", "asia", "africa", "north america", "south america", "oceania", "antarctica"]);

// In-memory only — avoids duplicate in-flight requests within a single
// page session. The real, shared cache is the place_photos table (any
// trip, any user) layered under the trip's own permanent photo_url.
const cache = new Map();

// A whole country's name ("Vietnam") reads as too generic to reliably
// match a recognizable travel photo — redirect to its biggest city
// ("Ho Chi Minh City") instead, which searches far better.
async function resolveSearchTerm(placeName) {
  const lower = placeName.trim().toLowerCase();
  if (CONTINENTS.has(lower)) return null;
  const topCity = await getTopCityForCountry(placeName);
  return topCity || placeName;
}

async function fetchFromPexels(placeName) {
  const term = await resolveSearchTerm(placeName);
  if (!term) return null;
  const res = await fetch(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(term + " travel")}&per_page=1&orientation=landscape`,
    { headers: { Authorization: PEXELS_API_KEY } }
  );
  if (!res.ok) throw new Error(`Pexels error ${res.status}`);
  const data = await res.json();
  const photo = data?.photos?.[0];
  return photo?.src?.large || photo?.src?.medium || null;
}

export async function getPlacePhoto(placeName) {
  if (!placeName) return null;
  const key = placeName.trim().toLowerCase();
  if (cache.has(key)) return cache.get(key);

  const promise = (async () => {
    // A photo resolved for anyone's trip is reused for every trip asking
    // for the same place name from here on, instead of every new trip
    // paying its own GeoNames + Pexels lookup — this is what keeps photo
    // lookups fast as more people use the app, rather than slower.
    try {
      const shared = await getCachedPlacePhoto(key);
      if (shared !== undefined) return shared || null;
    } catch (e) {
      // Shared cache unreachable — fall through to a live lookup.
    }

    let found = null;
    try {
      found = await fetchFromPexels(placeName);
    } catch (e) {
      found = null;
    }
    cachePlacePhoto(key, found || "").catch(() => {});
    return found;
  })();

  cache.set(key, promise);
  return promise;
}
