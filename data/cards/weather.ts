import type { Bag, SeasonId, StationId, WeatherIcon } from "../types";

/** Zvraty počasí. Engine je zná jménem, karta je jen skládá. */
export type WeatherMod =
  | { k: "giftRange"; n: number }
  | { k: "chooseIcon"; icons: WeatherIcon[] }
  | { k: "compostNoWater" }
  | { k: "gatherBonus"; station: StationId; n: number }
  | { k: "restBonus"; n: number }
  | { k: "moveMod"; n: number }
  | { k: "moveMax"; n: number; flicekBonus?: boolean; heavyOnly?: boolean }
  | { k: "craftDouble"; recipe: "seno" }
  | { k: "endRemove"; station: StationId; n: number }
  | { k: "peekNext" }
  | { k: "waterHerbs" }
  | { k: "endHeart"; stations: StationId[] }
  | { k: "soak" }
  | { k: "branches"; spaces: number[] }
  | { k: "storm" }
  | { k: "drought" }
  | { k: "remove"; station: StationId; n: number | "all"; keep?: number }
  | { k: "closeGates" }
  | { k: "jointHeart" }
  | { k: "compostLeaves" }
  | { k: "giftsSameSpace" }
  | { k: "drawEvent" }
  | { k: "noDrying" }
  | { k: "shortenAutumn" }
  | { k: "frostCherries" }
  | { k: "molt" };

export type WeatherCard = {
  id: string;
  season: SeasonId;
  harsh: boolean;
  name: string;
  icon: WeatherIcon;
  refill: Partial<Record<StationId, Bag>>;
  mods: WeatherMod[];
  /** Ikona 📜 — vyloží se nová Potřeba. */
  need?: boolean;
  /** Vždy v letním balíčku (ochrana proti nedostatku sena). */
  always?: boolean;
  text: string;
  flavor: string;
};

export const WEATHER: WeatherCard[] = [
  // --- Jaro (úroveň 1) ---
  { id: "J1", season: "jaro", harsh: false, name: "Jarní sluníčko", icon: "slunce", refill: { louka: { trava: 2 }, zahradka: { bylinky: 1 }, potok: { prouti: 1 } }, mods: [{ k: "giftRange", n: 2 }], text: "Dary smí jít komukoli do 2 polí.", flavor: "Slunce svítí. Karel stojí ve stínu. …Ze zásady." },
  { id: "J2", season: "jaro", harsh: false, name: "Aprílové přeháňky", icon: "dest", refill: { potok: { voda: 2 }, louka: { trava: 2 } }, mods: [{ k: "chooseIcon", icons: ["slunce", "dest"] }], text: "Každý si po hodu zvolí, jestli mu svítí, nebo prší.", flavor: "Prší. Nesvítí. Svítí. …Karel to nekomentuje." },
  { id: "J3", season: "jaro", harsh: false, name: "Teplý deštík", icon: "dest", need: true, refill: { louka: { trava: 3 }, potok: { voda: 2 }, zahradka: { bylinky: 1 } }, mods: [{ k: "compostNoWater" }], text: "Kompost se dělá bez Vody.", flavor: "Flíček objevil kaluž. …Kaluž objevila Flíčka." },
  { id: "J4", season: "jaro", harsh: false, name: "Řez vrby", icon: "polojasno", refill: { potok: { prouti: 3 } }, mods: [{ k: "gatherBonus", station: "potok", n: 1 }], text: "Sbírání u Potoka má sílu +1.", flavor: "Vrba to zvládne. …Dorůstá rychleji než Karlova trpělivost." },
  { id: "J5", season: "jaro", harsh: false, name: "Línání", icon: "polojasno", need: true, refill: { louka: { trava: 2 } }, mods: [{ k: "molt" }], text: "Yakul pouští srst: 1 Vlna jemu, jinak na Maringotku.", flavor: "Yakul pouští srst sám. Nůžky nikdy neviděl. …A vidět nechce." },
  { id: "J6", season: "jaro", harsh: false, name: "Ranní rosa", icon: "polojasno", refill: { louka: { trava: 2 }, zahradka: { bylinky: 2 } }, mods: [{ k: "restBonus", n: 1 }], text: "Odpočinek dává srdíčko navíc.", flavor: "Karel rosu ochutnal. Voda. …Nic moc." },
  { id: "JD1", season: "jaro", harsh: true, name: "Pozdní mráz", icon: "mraz", refill: {}, mods: [{ k: "remove", station: "zahradka", n: "all", keep: 1 }, { k: "moveMod", n: -1 }, { k: "frostCherries" }], text: "Zahrádce zůstane 1 Bylinka (fóliovník). Pohyb −1. Třešně v létě o 1 méně.", flavor: "Kvetoucí třešně zmrzly. Karel to komentovat nebude. …Nic." },
  { id: "JD2", season: "jaro", harsh: true, name: "Rozbahněná cesta", icon: "dest", need: true, refill: { potok: { voda: 2 } }, mods: [{ k: "moveMax", n: 3, flicekBonus: true }], text: "Pohyb nejvýš 3. Karla to nebrzdí, Flíček má +1.", flavor: "Bláto. Flíček je šťastný. …Ostatní mají boty. Teda nemají." },
  // --- Léto (úroveň 2) ---
  { id: "L1", season: "leto", harsh: false, always: true, name: "Senoseč", icon: "slunce", refill: { louka: { trava: 3 } }, mods: [{ k: "craftDouble", recipe: "seno" }], text: "Kdo dělá seno, udělá o 1 víc.", flavor: "Ideální na seno, říkají meteorologové. …A Karel. Hlavně Karel." },
  { id: "L2", season: "leto", harsh: false, name: "Třešně dozrály", icon: "slunce", need: true, refill: { tresne: { ovoce: 3 }, louka: { trava: 1 } }, mods: [{ k: "endRemove", station: "tresne", n: 1 }], text: "Kosi: na konci kola zmizí 1 Ovoce z Třešní.", flavor: "Kosi byli první. …Kosi jsou vždycky první." },
  { id: "L3", season: "leto", harsh: false, name: "Hrom v dálce", icon: "polojasno", refill: { louka: { trava: 2 }, potok: { voda: 1 } }, mods: [{ k: "peekNext" }], text: "Další karta počasí je vidět předem.", flavor: "Avala hrom slyšela. …Hrom ji ještě ne." },
  { id: "L4", season: "leto", harsh: false, name: "Vedro", icon: "slunce", need: true, refill: { zahradka: { bylinky: 2 }, sad: { ovoce: 1 } }, mods: [{ k: "waterHerbs" }, { k: "endHeart", stations: ["potok", "maringotka"] }], text: "Bylinky jen po zalití (1 Voda). Kdo skončí u Potoka nebo v Maringotce, +1 srdíčko.", flavor: "Vedro. Flíček je v bahně. …Je to wellness." },
  { id: "L5", season: "leto", harsh: false, name: "Dlouhý den", icon: "slunce", refill: { louka: { trava: 2 }, sad: { ovoce: 1 }, zahradka: { bylinky: 1 } }, mods: [{ k: "moveMod", n: 1 }], text: "Pohyb +1.", flavor: "Nejdelší den v roce. Karel ho prospal. …Taky výkon." },
  { id: "L6", season: "leto", harsh: false, name: "Letní deštík", icon: "dest", need: true, refill: { potok: { voda: 2 }, louka: { trava: 2 }, zahradka: { bylinky: 1 } }, mods: [{ k: "compostNoWater" }], text: "Kompost se dělá bez Vody.", flavor: "Prší na seno. …Seno je naštěstí ještě tráva." },
  { id: "LD1", season: "leto", harsh: true, name: "Bouřka", icon: "bourka", refill: { potok: { voda: 3 } }, mods: [{ k: "soak" }, { k: "branches", spaces: [10, 24] }, { k: "storm" }], text: "Seno mimo Seník a Maringotku zmokne. Větve na polích 10 a 24.", flavor: "Yakul se postavil mezi bouřku a ostatní. Nikdo ho neprosil. …Bouřka taky ne." },
  { id: "LD2", season: "leto", harsh: true, name: "Sucho", icon: "slunce", refill: { potok: { voda: -2 } }, mods: [{ k: "drought" }], text: "Louka letos neroste. Příští letní karta dá jen půlku Trávy. Studna sucho ruší.", flavor: "Tráva hnědne. Karel taky. …Ale ten je takový odjakživa." },
  { id: "LD3", season: "leto", harsh: true, name: "Krupobití", icon: "bourka", refill: {}, mods: [{ k: "remove", station: "sad", n: 2 }, { k: "remove", station: "tresne", n: 2 }, { k: "remove", station: "zahradka", n: 1 }, { k: "closeGates" }, { k: "storm" }], text: "Sad −2, Třešně −2, Zahrádka −1. Vrata se zavřou.", flavor: "Kroupy velké jako hrách. Karel je přepočítal. …Bylo jich hodně." },
  // --- Podzim (úroveň 3) ---
  { id: "P1", season: "podzim", harsh: false, name: "Babí léto", icon: "slunce", refill: { sad: { ovoce: 2 }, svestky: { ovoce: 2 }, louka: { trava: 1 } }, mods: [{ k: "jointHeart" }], text: "Společný úkol dá srdíčko navíc.", flavor: "Karel nosí pavučinu na uchu. …Záměrně." },
  { id: "P2", season: "podzim", harsh: false, name: "Švestky padají", icon: "polojasno", need: true, refill: { svestky: { ovoce: 3 } }, mods: [{ k: "gatherBonus", station: "svestky", n: 1 }], text: "Sbírání ve Švestkové aleji má sílu +1.", flavor: "Švestky padají. …Flíček je chytá. Rypákem." },
  { id: "P3", season: "podzim", harsh: false, name: "Jablka", icon: "polojasno", refill: { sad: { ovoce: 3 } }, mods: [{ k: "compostLeaves" }], text: "Do Kompostu smí 1 Hnůj nahradit 1 Tráva (listí).", flavor: "Jablko spadlo. Newton by něco vymyslel. …Flíček ho snědl." },
  { id: "P4", season: "podzim", harsh: false, name: "Podzimní déšť", icon: "dest", need: true, refill: { potok: { voda: 2, prouti: 1 }, louka: { trava: 1 } }, mods: [{ k: "moveMax", n: 5 }], text: "Pohyb nejvýš 5.", flavor: "Karel stojí pod přístřeškem a kouká do deště. …Filozof bez honoráře." },
  { id: "P5", season: "podzim", harsh: false, name: "Vítr", icon: "vitr", refill: { potok: { prouti: 2 } }, mods: [{ k: "closeGates" }, { k: "branches", spaces: [16] }], text: "Vrata se zavřou. Větev na poli 16.", flavor: "Vítr zabouchl vrata. Avala je otevřela. Tomáš zavřel. …Vítr to vzdal." },
  { id: "P6", season: "podzim", harsh: false, name: "Mlhavé ráno", icon: "polojasno", need: true, refill: { louka: { trava: 1 }, sad: { ovoce: 1 }, zahradka: { bylinky: 1 } }, mods: [{ k: "giftsSameSpace" }, { k: "drawEvent" }], text: "Dary jen na stejném poli. Táhni Událost.", flavor: "Karel v mlze přesně ví, kde je. …Nepřizná, že neví." },
  { id: "PD1", season: "podzim", harsh: true, name: "První mrazík", icon: "mraz", refill: {}, mods: [{ k: "remove", station: "sad", n: "all" }, { k: "remove", station: "tresne", n: "all" }, { k: "remove", station: "svestky", n: "all" }, { k: "remove", station: "zahradka", n: "all", keep: 1 }, { k: "moveMod", n: -1 }], text: "Ovoce z alejí a sadu je pryč. Zahrádce zůstane 1 Bylinka. Pohyb −1.", flavor: "Mráz přišel bez ohlášení. …Karel se ohlašuje na tři kilometry." },
  { id: "PD2", season: "podzim", harsh: true, name: "Plískanice", icon: "dest", refill: {}, mods: [{ k: "noDrying" }, { k: "closeGates" }, { k: "moveMax", n: 3, heavyOnly: true }], text: "Nic neschne. Vrata se zavřou. Kdo nese 4 a víc, má pohyb nejvýš 3.", flavor: "Prší vodorovně. …To umí jen listopad." },
  { id: "PD3", season: "podzim", harsh: true, name: "Brzká zima", icon: "mraz", refill: { louka: { trava: 1 } }, mods: [{ k: "shortenAutumn" }], text: "Na konci kola se zahodí další podzimní karta — podzim je o kolo kratší.", flavor: "Zima přišla dřív. Neohlásila se. …Karel by si to nedovolil." },
];

export const WEATHER_BY_ID = Object.fromEntries(WEATHER.map((c) => [c.id, c])) as Record<string, WeatherCard>;

export const WEATHER_ICON_NAME: Record<WeatherIcon, string> = {
  slunce: "Slunce",
  polojasno: "Polojasno",
  dest: "Déšť",
  bourka: "Bouřka",
  vitr: "Vítr",
  mraz: "Mráz",
};
