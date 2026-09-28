const cache = new Map();

// Wikipedia's opensearch finds the right page title for a loosely-typed
// name (e.g. "Bali" or "Paris, France"), then the summary endpoint's
// thumbnail/originalimage gives a real photo. Both are free and keyless —
// no developer account needed, unlike Unsplash/Pexels.
async function resolveWikipediaTitle(query) {
  const url = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=1&namespace=0&format=json&origin=*`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  return data?.[1]?.[0] || null;
}

export async function getPlacePhoto(placeName) {
  if (!placeName) return null;
  if (cache.has(placeName)) return cache.get(placeName);

  const promise = (async () => {
    try {
      const title = (await resolveWikipediaTitle(placeName)) || placeName;
      const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`);
      if (!res.ok) throw new Error("no summary");
      const data = await res.json();
      return data?.originalimage?.source || data?.thumbnail?.source || null;
    } catch (e) {
      return null;
    }
  })();

  cache.set(placeName, promise);
  return promise;
}
