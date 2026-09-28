const PEXELS_API_KEY = "33QnE4pMrw2lXIRjG66fts2QgkhFMYuvetXzZMXgfpgAFL8JV6l6W4Pn";

// In-memory only — the real, permanent cache is the trip's own photo_url
// column (see PlaceBanner in PlacePhoto.jsx). This just avoids duplicate
// in-flight requests within a single page session.
const cache = new Map();

export async function getPlacePhoto(placeName) {
  if (!placeName) return null;
  if (cache.has(placeName)) return cache.get(placeName);

  const promise = (async () => {
    try {
      const res = await fetch(
        `https://api.pexels.com/v1/search?query=${encodeURIComponent(placeName + " travel")}&per_page=1&orientation=landscape`,
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
