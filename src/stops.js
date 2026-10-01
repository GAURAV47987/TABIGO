function addDays(dateStr, n) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

// Turns [{name, lat, lng, days}] into dated stops, sequenced back-to-back
// starting at startDate (stop 1 gets days 1..N, stop 2 picks up right
// after, etc). With no startDate yet, stops keep their names/days but no
// dates — the trip can still be created and dated later.
export function buildDatedStops(rawStops, startDate) {
  if (!startDate) {
    return rawStops.map((s) => ({ id: crypto.randomUUID(), name: s.name, lat: s.lat, lng: s.lng, days: s.days, startDate: null, endDate: null }));
  }
  let cursor = startDate;
  return rawStops.map((s) => {
    const stopStart = cursor;
    const stopEnd = addDays(cursor, s.days - 1);
    cursor = addDays(stopEnd, 1);
    return { id: crypto.randomUUID(), name: s.name, lat: s.lat, lng: s.lng, days: s.days, startDate: stopStart, endDate: stopEnd };
  });
}

// Returns a trip's stops, or — for trips created before multi-stop support
// existed — a single synthetic stop built from its original single
// destination fields, so every caller can treat every trip uniformly.
export function getEffectiveStops(trip) {
  if (trip.stops?.length) return trip.stops;
  return [
    {
      id: "single",
      name: trip.destination_name,
      lat: trip.destination_lat,
      lng: trip.destination_lng,
      days: null,
      startDate: trip.start_date,
      endDate: trip.end_date,
    },
  ];
}

export function getStopForDate(stops, date) {
  return stops.find((s) => date >= s.startDate && date <= s.endDate) || null;
}
