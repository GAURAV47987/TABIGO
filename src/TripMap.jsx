import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Plus, Trash2 } from "lucide-react";
import { geocodeDestination } from "./geocode";
import { getEffectiveStops } from "./stops";

function pinIcon(color) {
  return L.divIcon({
    className: "",
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.45);"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

export default function TripMap({ trip, onSave }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const pins = trip.map_pins || [];
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const stops = getEffectiveStops(trip);

  useEffect(() => {
    if (!containerRef.current || !trip.destination_lat) return;

    const map = L.map(containerRef.current, {
      center: [trip.destination_lat, trip.destination_lng],
      zoom: stops.length > 1 ? 5 : 12,
      scrollWheelZoom: false,
    });
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    requestAnimationFrame(() => map.invalidateSize());

    if (stops.length > 1) {
      stops.forEach((stop, i) => {
        L.marker([stop.lat, stop.lng], { icon: pinIcon("#B23A2E") })
          .addTo(map)
          .bindPopup(`<strong>${i + 1}. ${stop.name}</strong><br>${stop.days} day(s)`);
      });
      L.polyline(stops.map((s) => [s.lat, s.lng]), { color: "#B23A2E", weight: 2, dashArray: "6 6" }).addTo(map);
      map.fitBounds(stops.map((s) => [s.lat, s.lng]), { padding: [30, 30] });
    } else {
      L.marker([trip.destination_lat, trip.destination_lng], { icon: pinIcon("#B23A2E") })
        .addTo(map)
        .bindPopup(`<strong>${trip.destination_name}</strong>`);
    }

    pins.forEach((pin) => {
      L.marker([pin.lat, pin.lng], { icon: pinIcon("#2C5F7C") }).addTo(map).bindPopup(`<strong>${pin.name}</strong>`);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip.destination_lat, trip.destination_lng, stops.length, pins.length]);

  const addPin = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const place = await geocodeDestination(name);
      onSave([...pins, { id: crypto.randomUUID(), name, lat: place.lat, lng: place.lng }]);
      setName("");
      setShowAdd(false);
    } catch (err) {
      setError(err.message || "Could not find that place");
    } finally {
      setBusy(false);
    }
  };

  const removePin = (id) => onSave(pins.filter((p) => p.id !== id));

  return (
    <div>
      <div ref={containerRef} className="relative isolate w-full h-72 rounded-xl overflow-hidden mb-3 tg-card" style={{ border: "1px solid var(--border)" }} />

      <button
        onClick={() => setShowAdd(true)}
        className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium mb-4 tg-btn"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
      >
        <Plus size={16} /> Add a place to the map
      </button>

      {pins.length > 0 && (
        <div className="space-y-2">
          {pins.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-lg px-3 py-2 tg-card" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <span className="text-sm" style={{ color: "var(--text-body)" }}>{p.name}</span>
              <span role="button" onClick={() => removePin(p.id)} style={{ color: "var(--stamp)" }}>
                <Trash2 size={15} />
              </span>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 flex items-center justify-center px-4 z-50" style={{ background: "rgba(0,0,0,0.4)" }}>
          <form onSubmit={addPin} className="w-full max-w-sm p-6 rounded-2xl tg-card" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <h2 className="text-lg font-bold mb-4" style={{ color: "var(--text-primary)" }}>Add a place</h2>
            <input
              required
              autoFocus
              placeholder="e.g. Uluwatu Temple"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full mb-3 px-3 py-2 rounded-lg"
              style={{ border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text-body)" }}
            />
            {error && <p className="text-sm mb-3" style={{ color: "var(--stamp)" }}>{error}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-2.5 rounded-lg font-semibold tg-btn" style={{ border: "1px solid var(--border)", color: "var(--text-body)", background: "var(--surface)" }}>
                Cancel
              </button>
              <button type="submit" disabled={busy} className="flex-1 py-2.5 rounded-lg font-semibold tg-btn tg-btn-primary" style={{ color: "var(--primary-text)" }}>
                {busy ? "Finding…" : "Add pin"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
