import { useState } from "react";
import { enumerateDates } from "./dates";

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

  const submit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({ id: initial?.id, date, time, title: title.trim(), notes: notes.trim() });
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center px-4 z-50" style={{ background: "rgba(0,0,0,0.4)" }}>
      <form
        onSubmit={submit}
        className="w-full max-w-sm p-6 rounded-2xl"
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
          className="w-full mb-4 px-3 py-2 rounded-lg"
          style={{ border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text-body)" }}
        />

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg font-semibold"
            style={{ border: "1px solid var(--border)", color: "var(--text-body)" }}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 py-2.5 rounded-lg font-semibold"
            style={{ background: "var(--primary-bg)", color: "var(--primary-text)" }}
          >
            Save
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

function DayCard({ date, dayNumber, items, onAdd, onEdit }) {
  const sorted = [...items].sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99"));

  return (
    <div className="p-4 rounded-2xl mb-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between mb-2">
        <p className="font-semibold" style={{ color: "var(--text-primary)" }}>{formatDay(date, dayNumber)}</p>
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
              <p style={{ color: "var(--text-body)" }}>
                {item.time && <span className="font-semibold mr-2">{item.time}</span>}
                {item.title}
              </p>
              {item.notes && <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>{item.notes}</p>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ItineraryTab({ trip, onSave, aiSlot }) {
  const [modalDate, setModalDate] = useState(null);
  const [editingItem, setEditingItem] = useState(null);

  const items = trip.itinerary || [];
  const days = enumerateDates(trip.start_date, trip.end_date);

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
