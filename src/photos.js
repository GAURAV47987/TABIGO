import { getTopCityForCountry } from "./geonames";

const PEXELS_API_KEY = "33QnE4pMrw2lXIRjG66fts2QgkhFMYuvetXzZMXgfpgAFL8JV6l6W4Pn";

// A continent is too broad to search for one representative photo — skip
// it entirely rather than show a random, unrelated stock result.
const CONTINENTS = new Set(["europe", "asia", "africa", "north america", "south america", "oceania", "antarctica"]);

// In-memory only — the real, permanent cache is the trip's own photo_url
// column (see PlaceBanner in PlacePhoto.jsx). This just avoids duplicate
// in-flight requests within a single page session.
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

export async function getPlacePhoto(placeName) {
  if (!placeName) return null;
  if (cache.has(placeName)) return cache.get(placeName);

  const promise = (async () => {
    try {
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
    } catch (e) {
      return null;
    }
  })();

  cache.set(placeName, promise);
  return promise;
}
