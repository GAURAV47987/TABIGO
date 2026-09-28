export const CATEGORIES = ["Flights", "Accommodation", "Food", "Activities", "Transport", "Shopping", "Other"];

export const CATEGORY_COLOR_VAR = {
  Flights: "var(--cat-flights)",
  Accommodation: "var(--cat-accommodation)",
  Food: "var(--cat-food)",
  Activities: "var(--cat-activities)",
  Transport: "var(--cat-transport)",
  Shopping: "var(--cat-shopping)",
  Other: "var(--cat-other)",
};

// A broad-enough set of major world currencies to cover most destinations,
// not just Europe. Anyone can still log an expense in any of these
// regardless of the trip's home currency.
export const CURRENCIES = [
  "USD", "EUR", "GBP", "AUD", "CAD", "NZD", "CHF",
  "INR", "JPY", "CNY", "SGD", "THB", "IDR", "VND", "MYR", "PHP", "KRW",
  "HUF", "CZK", "TRY", "MXN", "BRL", "ZAR", "AED", "EGP",
];

export const CURRENCY_SYMBOL = {
  USD: "$", EUR: "€", GBP: "£", AUD: "$", CAD: "$", NZD: "$", CHF: "Fr",
  INR: "₹", JPY: "¥", CNY: "¥", SGD: "$", THB: "฿", IDR: "Rp", VND: "₫", MYR: "RM", PHP: "₱", KRW: "₩",
  HUF: "Ft", CZK: "Kč", TRY: "₺", MXN: "$", BRL: "R$", ZAR: "R", AED: "د.إ", EGP: "E£",
};

// Rough, static fallback (1 USD = ...), used only until a live fetch
// succeeds or as an offline fallback.
export const FX_FALLBACK_RATES = {
  USD: 1, EUR: 0.92, GBP: 0.78, AUD: 1.53, CAD: 1.36, NZD: 1.66, CHF: 0.88,
  INR: 84, JPY: 152, CNY: 7.2, SGD: 1.34, THB: 34, IDR: 15800, VND: 25400, MYR: 4.5, PHP: 57, KRW: 1380,
  HUF: 362, CZK: 23, TRY: 34, MXN: 17, BRL: 5.1, ZAR: 18, AED: 3.67, EGP: 49,
};

export const FX_STORAGE_KEY = "tabigo-fx-rates";
// CDN-backed mirrors of the same free, keyless dataset, base = USD.
export const FX_API_URLS = [
  "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json",
  "https://latest.currency-api.pages.dev/v1/currencies/usd.json",
];

// Builds a packing list shaped by the trip's actual climate (avgHigh in °C,
// rainyDays across the trip) instead of one fixed list for every
// destination. `climate` is null while it's still loading or unavailable,
// in which case clothing falls back to a generic "check the forecast" item.
export function buildPackingCategories(climate) {
  const clothingItems = ["Comfortable walking shoes", "Sleepwear", "Underwear & socks"];

  if (!climate || climate.avgHigh == null) {
    clothingItems.push("Weather-appropriate outfits (forecast unavailable)");
  } else if (climate.avgHigh >= 27) {
    clothingItems.push("Light, breathable clothing", "Shorts", "Swimwear", "Sun hat", "Sunglasses", "Sandals");
  } else if (climate.avgHigh >= 18) {
    clothingItems.push("Light layers", "A light jacket for evenings", "Sunglasses");
  } else if (climate.avgHigh >= 10) {
    clothingItems.push("Warm layers", "A proper jacket", "Long pants", "Closed-toe shoes");
  } else {
    clothingItems.push("Heavy coat", "Thermal base layers", "Gloves & beanie", "Scarf", "Waterproof boots");
  }
  if (climate?.rainyDays > 0) {
    clothingItems.push("Rain jacket / compact umbrella");
  }

  return [
    {
      id: "documents",
      title: "Documents & money",
      items: [
        "Passport",
        "Visa / entry documents (if required)",
        "Travel insurance details",
        "Flight & accommodation confirmations",
        "Local currency / cards",
        "Copies of important documents (digital + physical)",
      ],
    },
    {
      id: "electronics",
      title: "Electronics",
      items: ["Phone + charger", "Power bank", "Universal travel adapter", "Headphones", "Camera (optional)"],
    },
    {
      id: "toiletries",
      title: "Toiletries",
      items: [
        "Toothbrush & toothpaste",
        "Deodorant",
        climate?.avgHigh >= 20 ? "Sunscreen" : "Moisturizer (dry/cold air)",
        "Basic medication / first-aid",
        "Any prescription medication",
      ],
    },
    { id: "clothing", title: "Clothing", items: clothingItems },
    {
      id: "extras",
      title: "Extras",
      items: ["Reusable water bottle", "Day bag / backpack", "Snacks for transit", "Entertainment for the journey"],
    },
  ];
}
