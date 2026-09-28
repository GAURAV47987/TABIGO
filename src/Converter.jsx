import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, RefreshCw, Wallet } from "lucide-react";
import { CURRENCIES, CURRENCY_SYMBOL, FX_STORAGE_KEY, FX_FALLBACK_RATES, FX_API_URLS } from "./constants";
import { loadFromStorage, saveToStorage } from "./storage";
import { Section } from "./ui";

export default function ConverterTab({ homeCurrency }) {
  const cached = loadFromStorage(FX_STORAGE_KEY);
  const [amount, setAmount] = useState("100");
  const [from, setFrom] = useState(homeCurrency);
  const [to, setTo] = useState(homeCurrency === "EUR" ? "USD" : "EUR");
  const [rates, setRates] = useState(cached?.rates || FX_FALLBACK_RATES);
  const [updatedAt, setUpdatedAt] = useState(cached?.date || null);
  const [status, setStatus] = useState("loading");
  const [errorDetail, setErrorDetail] = useState(null);

  const fetchRates = useCallback(async () => {
    setStatus("loading");
    setErrorDetail(null);
    const attempts = [];
    for (const url of FX_API_URLS) {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const usd = data.usd || {};
        const newRates = { USD: 1 };
        CURRENCIES.forEach((c) => {
          if (c === "USD") return;
          const v = usd[c.toLowerCase()];
          if (v) newRates[c] = v;
        });
        if (Object.keys(newRates).length < CURRENCIES.length - 5) {
          throw new Error("unexpected response shape");
        }
        const date = data.date || new Date().toISOString().slice(0, 10);
        setRates(newRates);
        setUpdatedAt(date);
        saveToStorage(FX_STORAGE_KEY, { rates: newRates, date });
        setStatus("live");
        return;
      } catch (e) {
        attempts.push(e?.message || String(e));
      }
    }
    setErrorDetail(attempts.join(" / "));
    setStatus(updatedAt ? "cached" : "offline");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { fetchRates(); }, [fetchRates]);

  const converted = useMemo(() => {
    const amt = parseFloat(amount) || 0;
    const inUsd = from === "USD" ? amt : amt / (rates[from] || 1);
    return to === "USD" ? inUsd : inUsd * (rates[to] || 1);
  }, [amount, from, to, rates]);

  const swap = () => {
    setFrom(to);
    setTo(from);
  };

  const quickAmounts = [10, 20, 50, 100];
  const otherCurrencies = CURRENCIES.filter((c) => c !== homeCurrency);

  const statusText = {
    loading: "Fetching latest rates…",
    live: `Live rates as of ${updatedAt}.`,
    cached: `Offline — showing rates last updated ${updatedAt}.`,
    offline: "Offline — showing approximate rates.",
  }[status];

  return (
    <div>
      <p className="text-sm mb-1" style={{ color: "var(--text-secondary)" }}>{statusText}</p>
      {errorDetail && <p className="text-[11px] mb-5" style={{ color: "var(--stamp)" }}>Fetch failed: {errorDetail}</p>}
      {!errorDetail && <div className="mb-4" />}

      <div className="rounded-2xl p-4 mb-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="text-[10px] uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Amount</label>
            <input
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-lg px-3 py-2.5 text-lg outline-none mt-1"
              style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-body)" }}
            />
          </div>
          <select
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg px-2 py-2.5 text-sm outline-none"
            style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-body)" }}
          >
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="flex justify-center my-1">
          <button onClick={swap} aria-label="Swap currencies" className="rounded-full p-2 mt-1" style={{ background: "var(--primary-bg)", color: "var(--primary-text)" }}>
            <ArrowLeftRight size={14} />
          </button>
        </div>

        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="text-[10px] uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Converted</label>
            <div className="w-full rounded-lg px-3 py-2.5 text-lg font-bold mt-1" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-body)" }}>
              {CURRENCY_SYMBOL[to]}{converted.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
          </div>
          <select
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-lg px-2 py-2.5 text-sm outline-none"
            style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-body)" }}
          >
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <button
          onClick={fetchRates}
          disabled={status === "loading"}
          className="flex items-center gap-1.5 text-xs mt-3 mx-auto"
          style={{ color: "var(--text-muted)" }}
        >
          <RefreshCw size={12} className={status === "loading" ? "animate-spin" : ""} />
          Refresh rates
        </button>
      </div>

      <Section icon={<Wallet size={15} />} title={`Quick reference (→ ${homeCurrency})`} accent="var(--text-primary)">
        <div className="space-y-2">
          {otherCurrencies.slice(0, 8).map((cur) => (
            <div key={cur} className="rounded-xl p-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>{cur}</div>
              <div className="grid grid-cols-4 gap-2">
                {quickAmounts.map((amt) => {
                  const inUsd = cur === "USD" ? amt : amt / (rates[cur] || 1);
                  const inHome = homeCurrency === "USD" ? inUsd : inUsd * (rates[homeCurrency] || 1);
                  return (
                    <div key={amt} className="text-center">
                      <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>{CURRENCY_SYMBOL[cur]}{amt}</div>
                      <div className="text-sm font-medium">{CURRENCY_SYMBOL[homeCurrency]}{inHome.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
