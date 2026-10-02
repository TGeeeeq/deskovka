import type { Bag, StationId } from "../types";

export type NeedReq =
  | { k: "deliver"; station: StationId; items: Bag; together?: boolean }
  | { k: "care"; station: StationId }
  | { k: "rest"; station: StationId; withOther?: boolean }
  | { k: "escort"; from: StationId; to: StationId }
  | { k: "avoid"; station: StationId }
  | { k: "geese"; items: Bag };

export type NeedReward =
  | { k: "hearts"; n: number; both?: boolean; karelBonus?: boolean }
  | { k: "station"; station: StationId; items: Bag }
  | { k: "extendNeeds"; n: number }
  | { k: "star" }
  | { k: "openGate" }
  | { k: "scoutHelpers"; n: number }
  | { k: "romanGuard" }
  | { k: "maringotkaHearts" }
  | { k: "discardNextEvent" }
  | { k: "work"; n: number }
  | { k: "allHearts"; n: number }
  | { k: "weatherImmune" }
  | { k: "items"; items: Bag };

export type NeedCard = {
  id: string;
  who: string;
  name: string;
  req: NeedReq;
  deadline: number;
  rewards: NeedReward[];
  text: string;
  reward: string;
  flavor: string;
  /** Postava, kterou karta ukazuje (fotka/kresba). */
  portrait: string;
};

export const NEEDS: NeedCard[] = [
  { id: "N1", who: "Princezna", portrait: "princezna", name: "Slintavá potopa", req: { k: "deliver", station: "senik", items: { ovoce: 2 } }, deadline: 2, rewards: [{ k: "hearts", n: 2 }], text: "Přines 2 Ovoce na Seník.", reward: "2 srdíčka", flavor: "Princezna je dáma. Do prvního zakručení v břiše. …Pak je to povodeň." },
  { id: "N2", who: "Princezna", portrait: "princezna", name: "Bahenní lázeň", req: { k: "deliver", station: "kompost", items: { voda: 2 } }, deadline: 2, rewards: [{ k: "station", station: "kompost", items: { hnuj: 2 } }, { k: "hearts", n: 1 }], text: "Přines 2 Vody ke Kompostu.", reward: "Kompost +2 Hnůj, 1 srdíčko", flavor: "Prase se nepotí. …Princezna tomu říká péče o pleť." },
  { id: "N3", who: "Princezna", portrait: "princezna", name: "Vyčesat štětiny", req: { k: "care", station: "senik" }, deadline: 3, rewards: [{ k: "hearts", n: 2, both: true }], text: "Na Seníku akce síly 4 (jen ve dvou).", reward: "Obě zvířata 2 srdíčka", flavor: "Noblesa vyžaduje údržbu. …Hlavně kartáč." },
  { id: "N4", who: "Riky", portrait: "riky", name: "Prázdná miska", req: { k: "deliver", station: "brana", items: { voda: 1 } }, deadline: 2, rewards: [{ k: "extendNeeds", n: 1 }], text: "Přines 1 Vodu k Bráně.", reward: "Ostatní Potřeby +1 kolo", flavor: "Riky hlídá celou louku. …Žízeň nehlídá nikdo." },
  { id: "N5", who: "Riky", portrait: "riky", name: "Pelíšek pro hlídače", req: { k: "deliver", station: "brana", items: { pelisek: 1 } }, deadline: 4, rewards: [{ k: "hearts", n: 3 }, { k: "star" }], text: "Přines 1 Pelíšek k Bráně.", reward: "3 srdíčka a ★", flavor: "Hlídá i ve spánku. …Hlavně ve spánku." },
  { id: "N6", who: "Lucinka", portrait: "lucinka", name: "Průzkumnice", req: { k: "escort", from: "potok", to: "maringotka" }, deadline: 3, rewards: [{ k: "hearts", n: 2 }, { k: "station", station: "louka", items: { trava: 2 } }], text: "Vyzvedni Lucinku u Potoka a doprovoď ji k Maringotce (zabírá 1 místo).", reward: "2 srdíčka, Louka +2 Tráva", flavor: "Celý život neviděla jinou ovci. …Teď chce vidět všechno ostatní." },
  { id: "N7", who: "Emil a Amálka", portrait: "emil-amalka", name: "Nehnou se od sebe", req: { k: "deliver", station: "maringotka", items: { seno: 2 }, together: true }, deadline: 3, rewards: [{ k: "hearts", n: 2, both: true }], text: "2 Sena k Maringotce, přinesou je dvě zvířata spolu.", reward: "Obě zvířata 2 srdíčka", flavor: "Žerou spolu, spí spolu, mlčí spolu. …Zbytek louky by se mohl učit." },
  { id: "N8", who: "Tonička", portrait: "tonicka", name: "Nejdřív si to prohlédne", req: { k: "deliver", station: "brana", items: { prouti: 1, trava: 1 } }, deadline: 3, rewards: [{ k: "hearts", n: 1, karelBonus: true }, { k: "openGate" }], text: "Přines 1 Proutí a 1 Trávu k Bráně.", reward: "1 srdíčko (Karel +1), otevři vrata", flavor: "Žlab prohlížela tři dny. …Karel ho schválil hned. Byl v něm oves." },
  { id: "N9", who: "Elvíra", portrait: "elvira", name: "U plotu nic nezmešká", req: { k: "deliver", station: "brana", items: { bylinky: 1 } }, deadline: 2, rewards: [{ k: "scoutHelpers", n: 3 }], text: "Přines 1 Bylinku k Bráně.", reward: "Z 3 Událostí si nech Pomocníka", flavor: "O návštěvě ví dřív než návštěva. …Avala to bere osobně." },
  { id: "N10", who: "Tonička a Elvíra", portrait: "oslice", name: "Suchá kopyta", req: { k: "deliver", station: "senik", items: { seno: 1, prouti: 1 } }, deadline: 3, rewards: [{ k: "hearts", n: 2, karelBonus: true }], text: "Přines 1 Seno a 1 Proutí na Seník.", reward: "2 srdíčka (Karel +1)", flavor: "Oslí kopyto je stavěné na poušť. …Vlkaneč poušť není." },
  { id: "N11", who: "Roman", portrait: "roman", name: "Kocour na hlídce", req: { k: "deliver", station: "senik", items: { vlna: 1 } }, deadline: 3, rewards: [{ k: "romanGuard" }, { k: "hearts", n: 1 }], text: "Přines 1 Vlnu na Seník.", reward: "První ztráta Sena ze spíže se ruší. 1 srdíčko", flavor: "Nejsvalnatější kocour na světě hlídá seno. …Myši to respektují. Většinou." },
  { id: "N12", who: "Patricie", portrait: "patricie", name: "Šanta pro pěvkyni", req: { k: "deliver", station: "maringotka", items: { bylinky: 1 } }, deadline: 2, rewards: [{ k: "maringotkaHearts" }, { k: "discardNextEvent" }], text: "Přines 1 Bylinku k Maringotce.", reward: "Zvířata v Maringotce +1 srdíčko. Příští Událost smíte zahodit.", flavor: "Mňouká. Ne že by něco chtěla. …Pro jistotu." },
  { id: "N13", who: "Hanička", portrait: "hanicka", name: "Samotářka v dílně", req: { k: "avoid", station: "dilna" }, deadline: 2, rewards: [{ k: "work", n: 2 }, { k: "items", items: { prouti: 1 } }, { k: "allHearts", n: 1 }], text: "Do konce příštího kola nikdo neskončí tah v Dílně.", reward: "+2 Práce, 1 Proutí, všem srdíčko", flavor: "Tři nohy, jedno pravidlo. …Nechte ji být." },
  { id: "N14", who: "Husy", portrait: "husy", name: "Šéf louky", req: { k: "deliver", station: "potok", items: { trava: 1, voda: 1 }, together: true }, deadline: 3, rewards: [{ k: "station", station: "potok", items: { voda: 2, prouti: 1 } }, { k: "hearts", n: 1, both: true }], text: "Ve dvou u Potoka: 1 Tráva + 1 Voda. Do té doby se u Potoka sbírá se silou −1.", reward: "Potok +2 Voda +1 Proutí, obě zvířata srdíčko", flavor: "Husy nejsou zlé. …Jen vědí, čí je louka." },
  { id: "N15", who: "Husy", portrait: "husy", name: "Inspekce", req: { k: "geese", items: { trava: 1 } }, deadline: 3, rewards: [{ k: "hearts", n: 1 }, { k: "items", items: { voda: 1 } }], text: "Přines 1 Trávu na pole s husami. Husy jdou z Dílny a po kole o 2 pole proti hodinám.", reward: "1 srdíčko a 1 Voda", flavor: "Obchůzka. …Karel ji dělá taky, s přestávkami." },
  { id: "N16", who: "Kesu", portrait: "kesu", name: "Zenová lekce", req: { k: "rest", station: "maringotka" }, deadline: 2, rewards: [{ k: "hearts", n: 1 }, { k: "weatherImmune" }], text: "Odpočiň si v Maringotce.", reward: "+1 srdíčko navíc a příští kolo tě počasí nebrzdí", flavor: "Kesu povely plní. …Až bude mít čas a náladu." },
  { id: "N17", who: "Kočky", portrait: "kocky", name: "Jeden pelíšek pro tři", req: { k: "deliver", station: "maringotka", items: { pelisek: 1 } }, deadline: 4, rewards: [{ k: "star" }, { k: "hearts", n: 1 }], text: "Přines 1 Pelíšek k Maringotce.", reward: "★ a 1 srdíčko", flavor: "Roman, Patricie a Hanička se dohodli. …Do prvního zívnutí." },
  { id: "N18", who: "Emil", portrait: "emil", name: "Bezrohý (už)", req: { k: "rest", station: "maringotka", withOther: true }, deadline: 2, rewards: [{ k: "hearts", n: 1, both: true }, { k: "station", station: "maringotka", items: { vlna: 1 } }], text: "Odpočiň si v Maringotce s dalším zvířetem.", reward: "Obě +1 srdíčko, Maringotka +1 Vlna", flavor: "O rohy přišel. …O kamarádku ne." },
];

export const NEED_BY_ID = Object.fromEntries(NEEDS.map((c) => [c.id, c])) as Record<string, NeedCard>;
export const NEED_SLOTS = 3;
