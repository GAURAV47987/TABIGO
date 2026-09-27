// Free, no-key geocoding via OpenStreetMap's Nominatim — turns a typed
// destination like "Bali" into { name, lat, lng } so weather/maps/currency
// can work for any destination without a hardcoded city list.
export async function geocodeDestination(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error("Could not look up that destination");
  const results = await res.json();
  if (!results.length) throw new Error("Destination not found — try a more specific name");
  const { display_name, lat, lon } = results[0];
  return { name: display_name, lat: parseFloat(lat), lng: parseFloat(lon) };
}
