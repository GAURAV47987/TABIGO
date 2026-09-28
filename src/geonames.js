const GEONAMES_USERNAME = "gaurav07";

// Lowercase country name -> ISO 3166-1 alpha-2 code. Lets typing a whole
// country ("Japan") show its biggest cities instead of a literal-text
// search that wouldn't match any single place called "Japan".
const COUNTRY_CODES = {
  afghanistan: "AF", albania: "AL", algeria: "DZ", andorra: "AD", angola: "AO",
  argentina: "AR", armenia: "AM", australia: "AU", austria: "AT", azerbaijan: "AZ",
  bahamas: "BS", bahrain: "BH", bangladesh: "BD", barbados: "BB", belarus: "BY",
  belgium: "BE", belize: "BZ", benin: "BJ", bhutan: "BT", bolivia: "BO",
  "bosnia and herzegovina": "BA", botswana: "BW", brazil: "BR", brunei: "BN",
  bulgaria: "BG", "burkina faso": "BF", burundi: "BI", cambodia: "KH",
  cameroon: "CM", canada: "CA", "cape verde": "CV", "central african republic": "CF",
  chad: "TD", chile: "CL", china: "CN", colombia: "CO", comoros: "KM",
  congo: "CG", "costa rica": "CR", croatia: "HR", cuba: "CU", cyprus: "CY",
  czechia: "CZ", "czech republic": "CZ", denmark: "DK", djibouti: "DJ",
  dominica: "DM", "dominican republic": "DO", ecuador: "EC", egypt: "EG",
  "el salvador": "SV", "equatorial guinea": "GQ", eritrea: "ER", estonia: "EE",
  eswatini: "SZ", ethiopia: "ET", fiji: "FJ", finland: "FI", france: "FR",
  gabon: "GA", gambia: "GM", georgia: "GE", germany: "DE", ghana: "GH",
  greece: "GR", grenada: "GD", guatemala: "GT", guinea: "GN", "guinea-bissau": "GW",
  guyana: "GY", haiti: "HT", honduras: "HN", hungary: "HU", iceland: "IS",
  india: "IN", indonesia: "ID", iran: "IR", iraq: "IQ", ireland: "IE",
  israel: "IL", italy: "IT", jamaica: "JM", japan: "JP", jordan: "JO",
  kazakhstan: "KZ", kenya: "KE", kiribati: "KI", kosovo: "XK", kuwait: "KW",
  kyrgyzstan: "KG", laos: "LA", latvia: "LV", lebanon: "LB", lesotho: "LS",
  liberia: "LR", libya: "LY", liechtenstein: "LI", lithuania: "LT",
  luxembourg: "LU", madagascar: "MG", malawi: "MW", malaysia: "MY",
  maldives: "MV", mali: "ML", malta: "MT", mauritania: "MR", mauritius: "MU",
  mexico: "MX", moldova: "MD", monaco: "MC", mongolia: "MN", montenegro: "ME",
  morocco: "MA", mozambique: "MZ", myanmar: "MM", namibia: "NA", nauru: "NR",
  nepal: "NP", netherlands: "NL", "new zealand": "NZ", nicaragua: "NI",
  niger: "NE", nigeria: "NG", "north korea": "KP", "north macedonia": "MK",
  norway: "NO", oman: "OM", pakistan: "PK", palau: "PW", panama: "PA",
  "papua new guinea": "PG", paraguay: "PY", peru: "PE", philippines: "PH",
  poland: "PL", portugal: "PT", qatar: "QA", romania: "RO", russia: "RU",
  rwanda: "RW", "saudi arabia": "SA", senegal: "SN", serbia: "RS",
  seychelles: "SC", "sierra leone": "SL", singapore: "SG", slovakia: "SK",
  slovenia: "SI", "solomon islands": "SB", somalia: "SO", "south africa": "ZA",
  "south korea": "KR", "south sudan": "SS", spain: "ES", "sri lanka": "LK",
  sudan: "SD", suriname: "SR", sweden: "SE", switzerland: "CH", syria: "SY",
  taiwan: "TW", tajikistan: "TJ", tanzania: "TZ", thailand: "TH", togo: "TG",
  tonga: "TO", "trinidad and tobago": "TT", tunisia: "TN", turkey: "TR",
  turkmenistan: "TM", tuvalu: "TV", uganda: "UG", ukraine: "UA",
  "united arab emirates": "AE", uae: "AE", "united kingdom": "GB", uk: "GB",
  "united states": "US", usa: "US", "united states of america": "US",
  uruguay: "UY", uzbekistan: "UZ", vanuatu: "VU", "vatican city": "VA",
  venezuela: "VE", vietnam: "VN", yemen: "YE", zambia: "ZM", zimbabwe: "ZW",
};

function matchCountryCode(query) {
  return COUNTRY_CODES[query.trim().toLowerCase()] || null;
}

// Uses secure.geonames.org (not the http:// one) since the app is served
// over HTTPS and browsers block mixed-content requests.
async function geonamesFetch(params) {
  const url = `https://secure.geonames.org/searchJSON?${params}&username=${GEONAMES_USERNAME}`;
  const res = await fetch(url);
  let data;
  try {
    data = await res.json();
  } catch (e) {
    throw new Error(`Place search failed (HTTP ${res.status})`);
  }
  // GeoNames puts account/rate-limit errors in the JSON body even on a
  // 200 response, so check that before falling back to the HTTP status.
  if (data.status) throw new Error(data.status.message || "Place search failed");
  if (!res.ok) throw new Error(`Place search failed (HTTP ${res.status})`);
  return data.geonames || [];
}

function toResult(g) {
  const isRegion = (g.fcode || "").startsWith("ADM");
  const label = isRegion
    ? [g.name, g.countryName].filter(Boolean).join(", ")
    : [g.name, g.adminName1, g.countryName].filter(Boolean).join(", ");
  return { name: g.name, label, lat: parseFloat(g.lat), lng: parseFloat(g.lng) };
}

export async function searchPlaces(query) {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const countryCode = matchCountryCode(trimmed);

  if (countryCode) {
    // Browsing a whole country: show its biggest cities AND every one of
    // its states/regions. States are fetched with a high maxRows (every
    // country has a small, bounded number of them) rather than sorted-and-
    // cut-off by population, because a famous-but-small state like Goa
    // would otherwise be pushed out by India's much larger states.
    const [cities, regions] = await Promise.all([
      geonamesFetch(`country=${countryCode}&featureClass=P&orderby=population&maxRows=12`),
      geonamesFetch(`country=${countryCode}&featureClass=A&featureCode=ADM1&orderby=population&maxRows=50`),
    ]);
    return [...regions.map(toResult), ...cities.map(toResult)];
  }

  // Typing a specific place name: search across cities, regions, and
  // natural/tourist landmarks (bays, mountains, parks, historic sites) —
  // not just populated places — so "Ha Long Bay" or "Sa Pa" can match
  // even though a city-only search would exclude them entirely.
  const results = await geonamesFetch(
    `name_startsWith=${encodeURIComponent(trimmed)}&featureClass=P&featureClass=A&featureClass=H&featureClass=L&featureClass=S&featureClass=T&maxRows=10&orderby=relevance`
  );
  return results.map(toResult);
}

// For picking a decent photo-search term for a whole country ("Vietnam")
// instead of the country name itself, which reads as too generic/broad
// to reliably match a recognizable travel photo.
export async function getTopCityForCountry(name) {
  const code = matchCountryCode(name);
  if (!code) return null;
  try {
    const cities = await geonamesFetch(`country=${code}&featureClass=P&orderby=population&maxRows=1`);
    return cities[0]?.name || null;
  } catch (e) {
    return null;
  }
}
