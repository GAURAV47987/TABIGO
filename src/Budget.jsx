import { useMemo, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Plus, Printer, Wallet, X, Trash2 } from "lucide-react";
import { CATEGORIES, CATEGORY_COLOR_VAR, CURRENCIES, CURRENCY_SYMBOL, FX_STORAGE_KEY, FX_FALLBACK_RATES } from "./constants";
import { loadFromStorage } from "./storage";
import { Section } from "./ui";

export default function BudgetTab({ trip, onSave }) {
  const budget = trip.budget || [];
  const homeCurrency = trip.home_currency || "USD";
  const [showForm, setShowForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ description: "", amount: "", currency: homeCurrency, category: "Activities" });

  const openEdit = (expense) => {
    setForm({ description: expense.description, amount: String(expense.amount), currency: expense.currency, category: expense.category });
    setEditingId(expense.id);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
  };

  const rates = loadFromStorage(FX_STORAGE_KEY)?.rates || FX_FALLBACK_RATES;
  const toHome = (amt, currency) => {
    const usd = currency === "USD" ? amt : amt / (rates[currency] || 1);
    return homeCurrency === "USD" ? usd : usd * (rates[homeCurrency] || 1);
  };

  const totals = useMemo(() => {
    const t = {};
    budget.forEach((e) => {
      const amt = parseFloat(e.amount) || 0;
      t[e.currency] = (t[e.currency] || 0) + amt;
    });
    return t;
  }, [budget]);

  const categoryTotals = useMemo(() => {
    const t = {};
    budget.forEach((e) => {
      const amt = parseFloat(e.amount) || 0;
      t[e.category] = (t[e.category] || 0) + toHome(amt, e.currency);
    });
    return t;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [budget, homeCurrency]);

  const sortedCategories = useMemo(
    () => CATEGORIES.filter((c) => categoryTotals[c] > 0).sort((a, b) => categoryTotals[b] - categoryTotals[a]),
    [categoryTotals]
  );
  const maxCategoryTotal = Math.max(0, ...Object.values(categoryTotals));
  const totalHome = useMemo(() => Object.values(categoryTotals).reduce((sum, v) => sum + v, 0), [categoryTotals]);

  const submit = () => {
    if (!form.description || !form.amount) return;
    let next;
    if (editingId) {
      next = budget.map((e) => (e.id === editingId ? { ...e, ...form } : e));
    } else {
      next = [...budget, { ...form, id: crypto.randomUUID() }];
    }
    onSave(next);
    setForm({ description: "", amount: "", currency: form.currency, category: form.category });
    setEditingId(null);
    setShowForm(false);
  };

  const removeExpense = (id) => onSave(budget.filter((e) => e.id !== id));

  const visibleExpenses = useMemo(() => {
    const reversed = [...budget].reverse();
    return selectedCategory ? reversed.filter((e) => e.category === selectedCategory) : reversed;
  }, [budget, selectedCategory]);

  const exportPDF = () => {
    const doc = new jsPDF();
    const today = new Date().toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });

    doc.setFontSize(16);
    doc.text(`${trip.destination_name} — Budget Summary`, 14, 18);
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(`Generated ${today}`, 14, 24);

    doc.setFontSize(13);
    doc.setTextColor(0);
    doc.text(`Total: ${CURRENCY_SYMBOL[homeCurrency]}${totalHome.toLocaleString(undefined, { maximumFractionDigits: 0 })} ${homeCurrency} (approx.)`, 14, 34);

    autoTable(doc, {
      startY: 40,
      head: [["Currency", "Total"]],
      body: Object.entries(totals).map(([cur, amt]) => [cur, `${CURRENCY_SYMBOL[cur]}${amt.toLocaleString(undefined, { maximumFractionDigits: 2 })}`]),
      theme: "grid",
      styles: { fontSize: 9 },
      headStyles: { fillColor: [178, 58, 46] },
    });

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 8,
      head: [["Category", `Total (${homeCurrency})`]],
      body: sortedCategories.map((cat) => [cat, `${CURRENCY_SYMBOL[homeCurrency]}${categoryTotals[cat].toLocaleString(undefined, { maximumFractionDigits: 2 })}`]),
      theme: "grid",
      styles: { fontSize: 9 },
      headStyles: { fillColor: [178, 58, 46] },
    });

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 8,
      head: [["Description", "Category", "Amount"]],
      body: [...budget].reverse().map((e) => [e.description, e.category, `${CURRENCY_SYMBOL[e.currency]}${parseFloat(e.amount).toLocaleString()} ${e.currency}`]),
      theme: "grid",
      styles: { fontSize: 8 },
      headStyles: { fillColor: [178, 58, 46] },
    });

    doc.save(`${trip.destination_name.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-budget.pdf`);
  };

  return (
    <div>
      <button
        onClick={() => {
          setForm({ description: "", amount: "", currency: homeCurrency, category: "Activities" });
          setEditingId(null);
          setShowForm(true);
        }}
        className="w-full flex items-center justify-center gap-2 rounded-xl py-4 text-base font-bold mb-5"
        style={{ background: "var(--stamp)", color: "white" }}
      >
        <Plus size={20} strokeWidth={3} /> ADD EXPENSE
      </button>

      {Object.keys(totals).length > 0 && (
        <div className="rounded-2xl p-4 mb-2.5" style={{ background: "var(--stamp)", color: "white" }}>
          <div className="text-[11px] uppercase tracking-widest opacity-80">Total (≈ {homeCurrency})</div>
          <div className="text-3xl font-bold">{CURRENCY_SYMBOL[homeCurrency]}{totalHome.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          <div className="text-[11px] opacity-80 mt-0.5">Every currency below, converted at the latest rate</div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 mb-5">
        {Object.keys(totals).length === 0 && (
          <div className="col-span-2 rounded-xl p-4 text-sm text-center" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
            No expenses logged yet
          </div>
        )}
        {Object.entries(totals).map(([cur, amt]) => (
          <div key={cur} className="rounded-xl p-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>{cur} total</div>
            <div className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{CURRENCY_SYMBOL[cur]}{amt.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          </div>
        ))}
      </div>

      {budget.length > 0 && (
        <button
          onClick={exportPDF}
          className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium mb-5"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
        >
          <Printer size={16} /> Export as PDF
        </button>
      )}

      {sortedCategories.length > 0 && (
        <Section icon={<Wallet size={15} />} title={`By category (≈ ${homeCurrency})`} accent="var(--text-primary)">
          <div className="rounded-xl p-4 space-y-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            {sortedCategories.map((cat) => {
              const amt = categoryTotals[cat];
              const pct = maxCategoryTotal > 0 ? (amt / maxCategoryTotal) * 100 : 0;
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(active ? null : cat)}
                  className="w-full text-left rounded-lg -mx-1 px-1 py-0.5"
                  style={active ? { background: CATEGORY_COLOR_VAR[cat] + "18" } : undefined}
                >
                  <div className="flex items-baseline justify-between mb-1 gap-2">
                    <span className="text-sm" style={{ color: active ? CATEGORY_COLOR_VAR[cat] : "var(--text-tertiary)", fontWeight: active ? 600 : 400 }}>
                      {cat}
                    </span>
                    <span className="text-xs shrink-0" style={{ color: "var(--text-muted)" }}>
                      ≈{CURRENCY_SYMBOL[homeCurrency]}{amt.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                    <div className="h-full rounded-full transition-[width] duration-500 ease-out" style={{ width: `${pct}%`, background: CATEGORY_COLOR_VAR[cat] }} />
                  </div>
                </button>
              );
            })}
          </div>
        </Section>
      )}

      {selectedCategory && (
        <button
          onClick={() => setSelectedCategory(null)}
          className="flex items-center gap-1.5 mb-3 px-3 py-1.5 rounded-full text-xs font-medium border"
          style={{ borderColor: CATEGORY_COLOR_VAR[selectedCategory], color: CATEGORY_COLOR_VAR[selectedCategory], background: CATEGORY_COLOR_VAR[selectedCategory] + "14" }}
        >
          Showing: {selectedCategory} <X size={13} />
        </button>
      )}

      <div className="space-y-2">
        {visibleExpenses.map((e) => (
          <button
            key={e.id}
            onClick={() => openEdit(e)}
            className="w-full text-left rounded-xl px-3 py-2.5 flex items-center justify-between"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <div className="min-w-0">
              <div className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{e.description}</div>
              <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>{e.category}</div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-sm font-medium">{CURRENCY_SYMBOL[e.currency]}{parseFloat(e.amount).toLocaleString()}</span>
              <span
                role="button"
                aria-label={`Delete ${e.description}`}
                onClick={(evt) => {
                  evt.stopPropagation();
                  removeExpense(e.id);
                }}
                style={{ color: "var(--stamp)" }}
              >
                <Trash2 size={15} />
              </span>
            </div>
          </button>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 flex items-center justify-center px-4 z-50" style={{ background: "rgba(0,0,0,0.4)" }} onClick={closeForm}>
          <div
            className="w-full max-w-sm rounded-2xl p-5 space-y-3"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-lg" style={{ color: "var(--text-primary)" }}>{editingId ? "Edit expense" : "New expense"}</span>
              <button onClick={closeForm} style={{ color: "var(--text-tertiary)" }}>
                <X size={18} />
              </button>
            </div>

            <input
              placeholder="What was it for?"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
              style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-body)" }}
            />

            <div className="flex gap-2">
              <input
                type="number"
                inputMode="decimal"
                placeholder="Amount"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="flex-1 rounded-lg px-3 py-2.5 text-sm outline-none"
                style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-body)" }}
              />
              <select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className="rounded-lg px-2 text-sm outline-none"
                style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-body)" }}
              >
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
              style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-body)" }}
            >
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>

            <button
              onClick={submit}
              className="w-full rounded-lg py-2.5 text-sm font-medium mt-1"
              style={{ background: "var(--primary-bg)", color: "var(--primary-text)" }}
            >
              {editingId ? "Save changes" : "Add expense"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
