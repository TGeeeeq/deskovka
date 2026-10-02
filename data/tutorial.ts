/** Karlův průvodce první hrou. Tipy se ukážou jednou, když nastane jejich
 *  situace. Karel radí, neprosí, a nikdy se nesměje cizímu neúspěchu. */
export type TipId =
  | "welcome"
  | "roll"
  | "assign"
  | "move"
  | "act"
  | "help"
  | "senik"
  | "rain"
  | "need"
  | "event"
  | "storm"
  | "hearts"
  | "unlock"
  | "season"
  | "kveta"
  | "end";

export const TIPS: Record<TipId, { title: string; text: string; quip?: string }> = {
  welcome: {
    title: "Vítej na Louce",
    text: "Hrajete všichni spolu. Do konce podzimu naplňte Zimní spíž uprostřed desky: seno, pelíšky, bylinky, křížaly a kompost.",
    quip: "Zima přijde tak jako tak. …Otázka je jen, jestli připravená bude ona, nebo my.",
  },
  roll: { title: "Hoď dvěma kostkami", text: "Jedna kostka určí, kam dojdeš. Druhá, jak moc toho na místě uděláš." },
  assign: {
    title: "Která je která",
    text: "Vyber, kterou kostkou jdeš. Ta druhá je síla: 1–2 = 1, 3–4 = 2, 5–6 = 3. Za srdíčko smíš jednu přehodit.",
    quip: "Malá kostka na chůzi, velká na práci. …Nebo obráceně. Proto se o tom nehádáme, ale přemýšlíme.",
  },
  move: { title: "Kam to bude?", text: "Klepni na zvýrazněné pole. Jdeš jedním směrem, zkratka stojí 2 kroky. Na poli s otazníkem čeká Událost." },
  act: { title: "Akce na místě", text: "Na stanici sbírej, zpracuj nebo pracuj na projektu. Výrobky (seno, pelíšky…) pak dones na Seník." },
  help: {
    title: "Ve dvou se to lépe táhne",
    text: "Stojí-li s tebou jiné zvíře, zavolej ho na pomoc: síla stoupne o stupeň a oba dostanete srdíčko.",
    quip: "Stojím vedle. …To je taky práce.",
  },
  senik: { title: "Seník a Zimní spíž", text: "Výrobky se odloží samy, i když Seníkem jen projdeš. Suroviny tam můžeš uložit pro ostatní." },
  rain: { title: "Prší", text: "Seno ani bylinky v dešti neschnou. Kompost je teď ale zadarmo bez vody — a potok se plní.", quip: "Déšť není problém. …Problém je seno, které zrovna neleží pod střechou." },
  need: { title: "Někdo něco potřebuje", text: "Potřeby mají lhůtu v kolech. Splněná dá odměnu, za každé dvě splněné je hvězda." },
  event: { title: "Událost", text: "Tomáš, Maruška a Tony pomáhají. Kartu pomocníka si smíte nechat v záloze na později." },
  storm: {
    title: "Bouřka!",
    text: "Hoďte všichni najednou a běžte schovat seno na Seník nebo do Maringotky. Mluvit se nesmí — jen zvířecí zvuky!",
    quip: "Íá. …To znamená ‚běž‘. Nebo ‚mrkev‘. Záleží na tónu.",
  },
  hearts: { title: "Srdíčka", text: "Srdíčko = přehoz kostky. Tři srdíčka odemknou druhou schopnost zvířete." },
  unlock: { title: "Druhá schopnost", text: "Zvíře se třemi srdíčky si může odemknout druhou schopnost. Napoprvé to stojí za to." },
  season: { title: "Nové období", text: "V létě se stříhá vlna na pelíšky, na podzim se sklízí ovoce. Po podzimu přijde zima." },
  kveta: { title: "Květa vyráží dřív", text: "Než začnou tahy, Květa popojde o 0–2 pole. Hraje vždycky poslední.", quip: "Nespěchá. …A stejně tam bude první." },
  end: { title: "Zima je tady", text: "Spočítejte hvězdy: řádky spíže, projekty, přání zvířat a srdíčka." },
};
