// Pre-built trip templates for the Home tab — researched routes with the
// same level of specificity as a real, lived-in itinerary (named
// neighborhoods, actual transit routes with durations/fares, timing
// logic), not a generic AI-generated day plan. Day numbers are 1-indexed
// across the whole trip; applying a template asks for a start date once,
// then maps each day number to a real calendar date the same way the AI
// itinerary generator does.
//
// Item shape matches the app's own itinerary items: { time, title, notes,
// type }. type is "activity" | "food" | "photo" — at most one "photo" per
// template, the single most iconic photo-op of the trip.

export const TRIP_TEMPLATES = [
  {
    id: "japan-classic",
    name: "Japan: Tokyo, Kyoto & Osaka",
    tagline: "The classic first-timer's route — modern Tokyo, ancient Kyoto, and Osaka's food scene.",
    stops: [
      { name: "Tokyo", lat: 35.6762, lng: 139.6503, days: 4 },
      { name: "Kyoto", lat: 35.0116, lng: 135.7681, days: 3 },
      { name: "Osaka", lat: 34.6937, lng: 135.5023, days: 3 },
    ],
    days: [
      {
        day: 1,
        items: [
          { time: "", title: "Land in Tokyo, get an IC card", notes: "Grab a Suica or Pasmo card at the airport for trains/buses/convenience stores. From Narita, the N'EX train runs to Tokyo Station in ~1hr (¥3,250). From Haneda, the monorail or Keikyu Line reaches the city in 30–40 min for under ¥700.", type: "activity" },
          { time: "", title: "Check in — Shinjuku or Shibuya area", notes: "Either makes a good base: well-connected by the JR Yamanote loop line to everywhere else on this trip.", type: "activity" },
          { time: "19:00", title: "Omoide Yokocho (Memory Lane)", notes: "Tiny smoke-filled yakitori alleys tucked behind Shinjuku Station's west exit — order skewers and a beer, standing room mostly.", type: "food" },
          { time: "21:00", title: "Golden Gai for a nightcap", notes: "A few hundred tiny bars packed into six narrow alleys near Shinjuku — pick one with an open seat, most sit 5–10 people.", type: "activity" },
        ],
      },
      {
        day: 2,
        items: [
          { time: "09:00", title: "Senso-ji Temple & Nakamise Street", notes: "Tokyo's oldest temple, in Asakusa — go early to beat the crowds. Nakamise-dori's stalls leading up to it sell snacks and souvenirs.", type: "activity" },
          { time: "11:30", title: "Tokyo Skytree (optional)", notes: "Visible from Asakusa — go up if the weather's clear, otherwise the view from street level framed by old Tokyo rooftops is its own reward.", type: "activity" },
          { time: "13:00", title: "Ameya-Yokocho market, Ueno", notes: "A loud, cheap street market under the train tracks — good for a street-food lunch before Ueno Park.", type: "food" },
          { time: "14:30", title: "Ueno Park + Tokyo National Museum", notes: "Japan's oldest and largest museum, covering samurai armor to Buddhist art — easily 2 hours.", type: "activity" },
          { time: "18:00", title: "Akihabara", notes: "Tokyo's electronics and anime district — multi-floor arcades, retro game shops, maid cafés if you're curious.", type: "activity" },
        ],
      },
      {
        day: 3,
        items: [
          { time: "10:00", title: "Shibuya Crossing & Hachiko statue", notes: "The world's busiest pedestrian crossing — best viewed from the Starbucks second floor or Shibuya Sky above.", type: "activity" },
          { time: "11:30", title: "Harajuku: Takeshita Street + Meiji Shrine", notes: "Takeshita-dori is youth fashion chaos; a two-minute walk away, Meiji Shrine's forested approach is dead quiet by contrast.", type: "activity" },
          { time: "14:00", title: "Omotesando", notes: "Tokyo's tree-lined architecture and flagship-store boulevard — a calmer contrast to Harajuku and Shibuya either side of it.", type: "activity" },
          { time: "17:30", title: "Shibuya Sky at sunset", notes: "Open-air rooftop observation deck, 229m up — book a timed ticket in advance for sunset, it sells out.", type: "photo" },
          { time: "19:30", title: "Ichiran Ramen, Shibuya", notes: "Famous solo-booth tonkotsu ramen chain — order from a vending machine, customize your bowl on a paper form, eat in a private booth.", type: "food" },
        ],
      },
      {
        day: 4,
        items: [
          { time: "08:00", title: "Tsukiji Outer Market", notes: "The old fish market's outer stalls are still very much alive — fresh sushi, tamagoyaki skewers, and grilled seafood for breakfast.", type: "food" },
          { time: "11:00", title: "teamLab Planets or teamLab Borderless", notes: "Two separate immersive digital-art museums, both currently open — Planets (Toyosu) is barefoot and walk-through-water, 75–90 min; Borderless (Azabudai Hills) is a mapless wandering maze of light and projection, 2–3 hours. Pick one, or do both if the day allows.", type: "activity" },
          { time: "16:00", title: "Odaiba (optional)", notes: "Artificial bay island — Rainbow Bridge views and a life-size Gundam statue outside DiverCity, if there's time before packing.", type: "activity" },
          { time: "", title: "Pack for an early Shinkansen", notes: "Tomorrow's bullet train to Kyoto leaves in the morning — an early night helps.", type: "activity" },
        ],
      },
      {
        day: 5,
        items: [
          { time: "09:00", title: "Shinkansen to Kyoto", notes: "Nozomi bullet train, Tokyo → Kyoto, ~2h15m, around ¥14,170 for a reserved seat. Sit on the right-hand side (seats D/E) for a chance at a Mt. Fuji view about 40 minutes in, on a clear day.", type: "activity" },
          { time: "12:00", title: "Check in — Gion or Higashiyama area", notes: "Staying in this old-town district puts you in walking distance of tomorrow's sights and tonight's.", type: "activity" },
          { time: "14:00", title: "Kiyomizu-dera Temple", notes: "Famous wooden stage jutting out over the hillside — walk up through Sannenzaka and Ninenzaka, two beautifully preserved sloped streets of old shops.", type: "activity" },
          { time: "19:00", title: "Gion district walk + Pontocho Alley dinner", notes: "Kyoto's geisha district — early evening is your best chance of spotting a geiko or maiko hurrying to an appointment. Pontocho, a narrow riverside alley, is full of restaurants with seating overlooking the Kamo River.", type: "food" },
        ],
      },
      {
        day: 6,
        items: [
          { time: "06:30", title: "Fushimi Inari Shrine at sunrise", notes: "Thousands of vermillion torii gates climbing the mountainside — Japan's single most iconic photo, and genuinely peaceful if you arrive before 7am, before the tour groups.", type: "photo" },
          { time: "10:30", title: "Travel to Arashiyama", notes: "JR Sagano Line from Kyoto Station, ~15 minutes.", type: "activity" },
          { time: "11:00", title: "Arashiyama Bamboo Grove", notes: "A short, dense corridor of towering bamboo — best early, before the crowds build.", type: "activity" },
          { time: "12:00", title: "Tenryu-ji Temple & Togetsukyo Bridge", notes: "A UNESCO-listed Zen garden, then the river bridge just beyond it for a riverside lunch spot.", type: "activity" },
          { time: "18:30", title: "Nishiki Market, dinner", notes: "\"Kyoto's Kitchen\" — a narrow covered arcade of 100+ food stalls, from fresh yuba to skewered octopus. Graze your way down it for dinner.", type: "food" },
        ],
      },
      {
        day: 7,
        items: [
          { time: "09:30", title: "Kinkaku-ji (Golden Pavilion)", notes: "A gold leaf-covered temple reflected in its own pond — one of Kyoto's most photographed sights, so go right at opening.", type: "activity" },
          { time: "11:00", title: "Ryoan-ji Zen rock garden", notes: "A short ride from Kinkaku-ji — Japan's most famous rock garden, 15 stones arranged so you can never see all of them at once from any single point.", type: "activity" },
          { time: "13:30", title: "Nijo Castle", notes: "Former shogun residence with famous \"nightingale floors\" that chirp underfoot, built deliberately to warn of intruders.", type: "activity" },
          { time: "16:00", title: "Philosopher's Path", notes: "A quiet canal-side walking path connecting several temples — especially scenic under cherry blossoms (spring) or maple leaves (autumn).", type: "activity" },
          { time: "19:00", title: "Final Kyoto dinner — izakaya or kaiseki", notes: "An izakaya for casual small plates, or splurge on a multi-course kaiseki meal for a proper send-off from Kyoto.", type: "food" },
        ],
      },
      {
        day: 8,
        items: [
          { time: "10:00", title: "JR Special Rapid to Osaka", notes: "Direct from Kyoto Station to Osaka Station, ~28 minutes, ¥580 — trains run every 15 minutes, no need to book ahead.", type: "activity" },
          { time: "11:30", title: "Check in — Namba/Dotonbori area", notes: "Puts you right in the middle of Osaka's best street food and nightlife.", type: "activity" },
          { time: "13:00", title: "Dotonbori canal walk", notes: "Neon signs, the giant Glico Running Man billboard, and canal-side crowds — the postcard image of Osaka.", type: "activity" },
          { time: "14:00", title: "Street food crawl: takoyaki, okonomiyaki, kushikatsu", notes: "Takoyaki (octopus balls) at a Dotonbori stall, okonomiyaki (savory pancake) at a sit-down grill, kushikatsu (fried skewers) — the 'no double-dipping the sauce' rule is taken seriously here.", type: "food" },
          { time: "17:00", title: "Shinsaibashi shopping arcade", notes: "A long covered shopping street a few minutes from Dotonbori — department stores, boutiques, and discount drugstores.", type: "activity" },
        ],
      },
      {
        day: 9,
        items: [
          { time: "09:30", title: "Osaka Castle", notes: "Rebuilt in concrete but still imposing, set in a large park — the moat and stone walls are the most impressive part.", type: "activity" },
          { time: "12:00", title: "Kuromon Ichiba Market", notes: "\"Osaka's Kitchen\" — a covered market street of fresh seafood, wagyu skewers, and fruit stalls, most of it eaten standing right there.", type: "food" },
          { time: "16:00", title: "Umeda Sky Building, Floating Garden Observatory", notes: "Two towers connected by an open-air rooftop walkway — time it for sunset over the city.", type: "activity" },
          { time: "19:30", title: "America-mura or back to Dotonbori", notes: "Osaka's youth-culture district (vintage shops, street art) for a different nightlife scene than Dotonbori, or just go back for round two.", type: "activity" },
        ],
      },
      {
        day: 10,
        items: [
          { time: "09:00", title: "Day trip to Nara", notes: "JR or Kintetsu line from Osaka, 45 min–1hr. Home to the famous bowing deer and the Great Buddha.", type: "activity" },
          { time: "10:00", title: "Nara Park — feed the deer", notes: "Over a thousand tame deer roam freely — buy a stack of \"shika senbei\" crackers from a vendor and they'll bow for food.", type: "activity" },
          { time: "11:30", title: "Todai-ji Temple", notes: "One of the world's largest wooden buildings, housing a 15-meter bronze Great Buddha statue.", type: "activity" },
          { time: "", title: "Return to Osaka for departure", notes: "Kansai International Airport is well connected from Osaka by direct train (Nankai or JR Haruka, ~45 min from the city).", type: "activity" },
        ],
      },
    ],
  },
];
