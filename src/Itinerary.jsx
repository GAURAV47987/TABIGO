import { useState } from "react";
import { Camera, MapPin, Utensils } from "lucide-react";
import { enumerateDates } from "./dates";
import { geocodeDestination } from "./geocode";
import { getEffectiveStops, getStopForDate } from "./stops";

const TYPE_ICON = {
  photo: <Camera size={14} style={{ color: "var(--stamp)" }} />,
  food: <Utensils size={14} style={{ color: "var(--text-secondary)" }} />,
};

function formatDay(dateStr, dayNumber) {
  const d = new Date(dateStr + "T00:00:00");
  const weekday = d.toLocaleDateString(undefined, { weekday: "short" });
  const monthDay = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `Day ${dayNumber} · ${weekday}, ${monthDay}`;
}

function ItemModal({ date, initial, onSave, onDelete, onClose }) {
  const [time, setTime] = useState(initial?.time || "");
  const [title, setTitle] = useState(initial?.title || "");
  const [notes, setNotes] = useState(initial?.notes || "");
  const [location, setLocation] = useState(initial?.location || "");
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    const trimmedLocation = location.trim();
    let lat = initial?.lat ?? null;
    let lng = initial?.lng ?? null;

    // Only re-geocode when the location text actually changed, so editing
    // just the time/notes on an already-pinned item doesn't cost a lookup.
    if (trimmedLocation !== (initial?.location || "")) {
      if (!trimmedLocation) {
        lat = null;
        lng = null;
      } else {
        setGeocoding(true);
        setGeocodeError("");
        try {
          const place = await geocodeDestination(trimmedLocation);
          lat = place.lat;
          lng = place.lng;
        } catch (err) {
          lat = null;
          lng = null;
          setGeocodeError("Couldn't find that place — saved without a map pin.");
        } finally {
          setGeocoding(false);
        }
      }
    }

    onSave({ id: initial?.id, date, time, title: title.trim(), notes: notes.trim(), location: trimmedLocation, lat, lng });
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center px-4 z-50" style={{ background: "rgba(0,0,0,0.4)" }}>
      <form
        onSubmit={submit}
        className="w-full max-w-sm p-6 rounded-2xl tg-card"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <h2 className="text-lg font-bold mb-4" style={{ color: "var(--text-primary)" }}>
          {initial ? "Edit plan" : "Add to itinerary"}
        </h2>

        <label className="block text-sm mb-1" style={{ color: "var(--text-tertiary)" }}>Time (optional)</label>
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="w-full mb-3 px-3 py-2 rounded-lg"
          style={{ border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text-body)" }}
        />

        <label className="block text-sm mb-1" style={{ color: "var(--text-tertiary)" }}>What's happening?</label>
        <input
          required
          autoFocus
          placeholder="e.g. Uluwatu temple sunset"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full mb-3 px-3 py-2 rounded-lg"
          style={{ border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text-body)" }}
        />

        <label className="block text-sm mb-1" style={{ color: "var(--text-tertiary)" }}>Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full mb-3 px-3 py-2 rounded-lg"
          style={{ border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text-body)" }}
        />

        <label className="block text-sm mb-1" style={{ color: "var(--text-tertiary)" }}>Location (optional — drops a pin on the Map)</label>
        <input
          placeholder="e.g. Uluwatu Temple, Bali"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="w-full mb-1 px-3 py-2 rounded-lg"
          style={{ border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text-body)" }}
        />
        {geocodeError && <p className="text-xs mb-3" style={{ color: "var(--stamp)" }}>{geocodeError}</p>}
        {!geocodeError && <div className="mb-3" />}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={geocoding}
            className="flex-1 py-2.5 rounded-lg font-semibold tg-btn"
            style={{ border: "1px solid var(--border)", color: "var(--text-body)", background: "var(--surface)" }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={geocoding}
            className="flex-1 py-2.5 rounded-lg font-semibold tg-btn tg-btn-primary"
            style={{ color: "var(--primary-text)" }}
          >
            {geocoding ? "Finding place…" : "Save"}
          </button>
        </div>

        {initial && (
          <button
            type="button"
            onClick={() => onDelete(initial.id)}
            className="w-full mt-3 text-sm underline"
            style={{ color: "var(--stamp)" }}
          >
            Delete
          </button>
        )}
      </form>
    </div>
  );
}

function SetDatesPrompt({ onSet }) {
  const [startDate, setStartDate] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!startDate) return;
    setBusy(true);
    await onSet(startDate);
    setBusy(false);
  };

  return (
    <form
      onSubmit={submit}
      className="p-4 rounded-2xl tg-card"
      style={{ background: "var(--surface)", border: "1px dashed var(--tape)" }}
    >
      <p className="font-semibold mb-1" style={{ color: "var(--text-primary)" }}>When are you going?</p>
      <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>
        Add a start date to build your day-by-day itinerary.
      </p>
      <input
        type="date"
        required
        value={startDate}
        onChange={(e) => setStartDate(e.target.value)}
        className="w-full mb-3 px-3 py-2 rounded-lg"
        style={{ border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text-body)" }}
      />
      <button
        type="submit"
        disabled={busy}
        className="w-full py-2.5 rounded-lg font-semibold tg-btn tg-btn-primary"
        style={{ color: "var(--primary-text)" }}
      >
        {busy ? "Saving…" : "Save dates"}
      </button>
    </form>
  );
}

function DayCard({ date, dayNumber, stopName, items, onAdd, onEdit }) {
  const sorted = [...items].sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99"));

  return (
    <div className="p-4 rounded-2xl mb-3 tg-card" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="font-semibold" style={{ color: "var(--text-primary)" }}>{formatDay(date, dayNumber)}</p>
          {stopName && <p className="text-xs" style={{ color: "var(--text-muted)" }}>{stopName}</p>}
        </div>
        <button onClick={() => onAdd(date)} className="text-sm underline" style={{ color: "var(--text-secondary)" }}>
          + Add
        </button>
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--text-faint)" }}>Nothing planned yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {sorted.map((item) => (
            <button
              key={item.id}
              onClick={() => onEdit(item)}
              className="text-left px-3 py-2 rounded-lg"
              style={{ background: "var(--bg)" }}
            >
              <p className="flex items-center gap-1.5" style={{ color: "var(--text-body)" }}>
                {TYPE_ICON[item.type]}
                {item.time && <span className="font-semibold mr-1">{item.time}</span>}
                {item.title}
                {item.lat != null && <MapPin size={12} style={{ color: "var(--text-muted)" }} />}
              </p>
              {item.notes && <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>{item.notes}</p>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ItineraryTab({ trip, onSave, onSetDates, aiSlot }) {
  const [modalDate, setModalDate] = useState(null);
  const [editingItem, setEditingItem] = useState(null);

  if (!trip.start_date) {
    return <SetDatesPrompt onSet={onSetDates} />;
  }

  const items = trip.itinerary || [];
  const days = enumerateDates(trip.start_date, trip.end_date);
  const stops = getEffectiveStops(trip);
  const showStopLabel = stops.length > 1;

  const closeModal = () => {
    setModalDate(null);
    setEditingItem(null);
  };

  const handleSave = (fields) => {
    let next;
    if (fields.id) {
      next = items.map((it) => (it.id === fields.id ? { ...it, ...fields } : it));
    } else {
      next = [...items, { ...fields, id: crypto.randomUUID() }];
    }
    onSave(next);
    closeModal();
  };

  const handleDelete = (id) => {
    onSave(items.filter((it) => it.id !== id));
    closeModal();
  };

  return (
    <div>
      {aiSlot}

      {days.map((date, i) => (
        <DayCard
          key={date}
          date={date}
          dayNumber={i + 1}
          stopName={showStopLabel ? getStopForDate(stops, date)?.name : null}
          items={items.filter((it) => it.date === date)}
          onAdd={(d) => setModalDate(d)}
          onEdit={(item) => {
            setModalDate(item.date);
            setEditingItem(item);
          }}
        />
      ))}

      {modalDate && (
        <ItemModal
          date={modalDate}
          initial={editingItem}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={closeModal}
        />
      )}
    </div>
  );
}
