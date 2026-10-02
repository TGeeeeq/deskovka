import { ANIMAL_DEFS } from "@data/animals";
import { RECIPES, SHORTCUTS, SPACES, STATIONS } from "@data/board";
import { EVENT_BY_ID } from "@data/cards/events";
import { NEED_BY_ID } from "@data/cards/needs";
import { PROJECT_BY_ID } from "@data/cards/projects";
import { WEATHER_BY_ID } from "@data/cards/weather";
import { ITEMS } from "@data/items";
import { SEASON_NAME, TIER_TEXT } from "@data/rules";
import type { AnimalId, Bag, ItemId } from "@data/types";
import type { Action, GameEvent, GameState } from "@engine/types";

export const nm = (id: AnimalId) => ANIMAL_DEFS[id].name;

export function bagText(b: Bag) {
  return (Object.entries(b) as [ItemId, number][])
    .filter(([, n]) => n)
    .map(([k, n]) => `${n}× ${ITEMS[k].name}`)
    .join(", ");
}

export function spaceName(n: number) {
  const sp = SPACES[n - 1];
  if (sp.station) return STATIONS[sp.station].name;
  return sp.kind === "event" ? `pole ${n} (Událost)` : `pole ${n}`;
}

/** Popisek akce pro tlačítko. */
export function actionLabel(_s: GameState, a: Action): string {
  switch (a.t) {
    case "gather":
      return `Sbírej ${bagText(a.take)}${a.strip !== undefined ? ` (pruh ${"ABC"[a.strip]})` : ""}`;
    case "gatherCraft":
      return `Posbírej ${bagText(a.take)} a zpracuj na ${ITEMS[RECIPES[a.recipe].product].name}`;
    case "craft":
      return `Zpracuj na ${ITEMS[RECIPES[a.recipe].product].name}`;
    case "work":
      return `Pracuj na projektu ${PROJECT_BY_ID[a.project].name}`;
    case "rest":
      return "Odpočiň si v Maringotce";
    case "openGate":
      return `Otevři ${SHORTCUTS.find((x) => x.id === a.gate)!.name.toLowerCase()}`;
    case "scout":
      return "Vyhlížej od Brány (Událost)";
    case "edge":
      return "Okraj louky: +1 Tráva";
    case "care":
      return "Vyčesat Princeznu (síla 4)";
    case "clearBranch":
      return "Odklidit větve (+1 Proutí)";
    case "skipAction":
      return "Bez akce";
    case "help":
      return `Zavolat na pomoc: ${nm(a.helper)}`;
    case "deliver":
      return "Odevzdat výrobky do Zimní spíže";
    case "fulfill":
      return `Splnit Potřebu: ${NEED_BY_ID[a.need].name}`;
    case "contribute":
      return `Přinést na ${PROJECT_BY_ID[a.project].name}: ${a.n}× ${ITEMS[a.item].name}`;
    case "payReserve":
      return `Zaplatit ${PROJECT_BY_ID[a.project].name} kartou ${EVENT_BY_ID[a.card].name}`;
    case "unlock":
      return `Odemknout ${nm(a.animal)}: ${ANIMAL_DEFS[a.animal].second.name}`;
    case "pickWheelbarrow":
      return "Vzít Kolečko (+3 náklad)";
    case "dropWheelbarrow":
      return "Nechat tu Kolečko";
    case "pickLucinka":
      return "Vzít Lucinku na procházku";
    case "fridge":
      return "Lednice v kůlně: +1 Ovoce";
    case "walk":
      return `${nm(a.animal)}: procházka na Bránu (+♥)`;
    case "brigada":
      return `Brigáda: ${nm(a.animal)} +1 ${ITEMS[a.item].name}`;
    case "playReserve":
      return `Zahrát ze zálohy: ${EVENT_BY_ID[a.card].name}`;
    case "fertilize":
      return `Pohnojit ${STATIONS[a.station].short} kompostem`;
    case "endTurn":
      return "Konec tahu";
    case "grunt":
      return a.kind === "food" ? "Flíček chrochtá na jídlo: síla +1" : a.kind === "scratch" ? `Flíček chrochtá na drbání: ${a.target ? nm(a.target) : ""} +♥` : "Flíček chrochtá naléhavě (hod štěstí)";
    case "hykani":
      return `Karel hýká na ${nm(a.target)} (přijde o 2 pole blíž)`;
    case "freeStep":
      return `Kohout Julek: ${nm(a.animal)} popojde na ${spaceName(a.to)}`;
    case "giveHeart":
      return `${nm(a.from)} dává srdíčko: ${nm(a.to)}`;
    default:
      return a.t;
  }
}

/** Řádek do historie. */
export function eventText(_s: GameState, e: GameEvent): string | null {
  switch (e.e) {
    case "round":
      return `— ${SEASON_NAME[e.season]}, kolo ${e.round} —`;
    case "season":
      return `Začíná ${SEASON_NAME[e.season].toLowerCase()}.`;
    case "weather":
      return `Počasí: ${WEATHER_BY_ID[e.card].name}.`;
    case "dice":
      return `${nm(e.animal)} hází ${e.dice.join(" a ")}.`;
    case "moved":
      return `${nm(e.animal)} jde na ${spaceName(e.path[e.path.length - 1])}.`;
    case "gained":
      return e.animal ? `${nm(e.animal)} +${e.n} ${ITEMS[e.item].name}.` : null;
    case "crafted":
      return `${nm(e.animal)} vyrábí ${e.n}× ${ITEMS[e.product].name}.`;
    case "delivered":
      return `${nm(e.animal)} odevzdává do spíže: ${bagText(e.items)}.`;
    case "hearts":
      return e.n > 0 ? `${nm(e.animal)} +${e.n} ♥` : null;
    case "joint":
      return `${nm(e.a)} a ${nm(e.b)} pracují spolu.`;
    case "event":
      return `Událost: ${EVENT_BY_ID[e.card].name}.`;
    case "need":
      return e.status === "new" ? `Nová Potřeba: ${NEED_BY_ID[e.card].who} — ${NEED_BY_ID[e.card].name}.` : e.status === "done" ? `Splněno: ${NEED_BY_ID[e.card].name}!` : `Nestihli jsme: ${NEED_BY_ID[e.card].name}. Pomohli sousedi.`;
    case "project":
      return e.status === "done" ? `Hotovo: ${PROJECT_BY_ID[e.card].name}!` : null;
    case "soak":
      return `${nm(e.animal)}: zmoklo ${e.n} Sena.`;
    case "storm":
      return e.status === "start" ? "Bouřka! Rychle schovat seno." : "Bouřka přešla.";
    case "gate":
      return e.open ? "Vrata jsou otevřená." : "Vrata se zavřela.";
    case "unlock":
      return `${nm(e.animal)} odemyká: ${ANIMAL_DEFS[e.animal].second.name}.`;
    case "info":
      return e.text;
    case "over":
      return `${TIER_TEXT[e.result.tier].name} — ${e.result.stars} ★`;
  }
  return null;
}
