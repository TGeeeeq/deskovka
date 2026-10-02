import type { Bag, StationId } from "../types";

export type ProjectCard = {
  id: string;
  name: string;
  station: StationId;
  materials: Bag;
  work: number;
  /** Aspoň jedna akce Práce musí mít sílu 4 (jen ve dvou). */
  needsJoint?: boolean;
  /** Místo materiálu jde odhodit Tonyho kartu nebo 1 Křížaly. */
  altCost?: "tonyOrKrizaly";
  stars: number;
  bonus: string;
  flavor: string;
  fact: string;
};

export const PROJECTS: ProjectCard[] = [
  { id: "studna", name: "Dokopat studnu", station: "solar", materials: {}, work: 7, needsJoint: true, stars: 2, bonus: "U Solára se Voda bere bez omezení. Sucho a Vedro neplatí.", flavor: "Kopali jsme. Kopali. …Karel dozoroval.", fact: "Na Louce se studna opravdu kope — voda z ní má zalévat zahrádku." },
  { id: "hotel", name: "Hmyzí hotel", station: "dilna", materials: { prouti: 3, trava: 1 }, work: 3, stars: 2, bonus: "Kdykoli počasí přidá Ovoce do Sadu nebo Třešní, +1 navíc.", flavor: "Hotel pro včely. …Karel chtěl apartmá. Nevešel se.", fact: "Samotářské včely opylují ovocné stromy a bydlí v dutých stoncích." },
  { id: "jezci", name: "Úkryt pro ježky", station: "kompost", materials: { prouti: 2, seno: 1 }, work: 2, stars: 3, bonus: "Žádný bonus do hry, ale ★★★ na konci.", flavor: "Ježek přespí zimu. …Nikdo se ho neptal, jestli chce. Chce.", fact: "Ježek zimuje v hromadě listí a větví — uklizená zahrada ho nechá bez domova." },
  { id: "kocky", name: "Pelíšky pro kočky", station: "maringotka", materials: { vlna: 2, prouti: 1 }, work: 3, stars: 2, bonus: "Myši už neškodí. Odpočinek dává srdíčko navíc.", flavor: "Tři kočky, tři pelíšky. …Spí v jednom.", fact: "Kočky na Louce hlídají seník před myšmi — a samy si vybírají, kde budou spát." },
  { id: "solar", name: "Víc solárních panelů", station: "solar", materials: {}, work: 6, needsJoint: true, altCost: "tonyOrKrizaly", stars: 2, bonus: "Křížaly se suší v jakémkoli počasí, Bylinky smí schnout i tady.", flavor: "Slunce zadarmo. …Seno bohužel ne.", fact: "Louka má vlastní solární panely — elektřina na čerpadlo i na světlo." },
  { id: "spirala", name: "Bylinková spirála", station: "zahradka", materials: { kompost: 2, bylinky: 1 }, work: 3, stars: 2, bonus: "Kdykoli počasí přidá Bylinky, +1 navíc. Zahrádka unese 8 Bylinek.", flavor: "Spirála. Bylinky rostou do kruhu. …Karel chodí rovně.", fact: "Bylinková spirála dává na malém kousku suché i vlhké místo — každé bylince to její." },
];

export const PROJECT_BY_ID = Object.fromEntries(PROJECTS.map((c) => [c.id, c])) as Record<string, ProjectCard>;
export const PROJECT_SLOTS = 3;
