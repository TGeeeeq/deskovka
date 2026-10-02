import type { HelperWho } from "../types";

export type EventCard = {
  id: string;
  who: HelperWho;
  name: string;
  /** Pomocníka (Tomáš, Maruška, Tony) jde nechat v záloze. */
  helper: boolean;
  text: string;
  flavor: string;
};

export const WHO_NAME: Record<HelperWho, string> = {
  tomas: "Tomáš",
  maruska: "Maruška",
  tony: "Tony",
  louka: "Louka",
};

export const EVENTS: EventCard[] = [
  { id: "E1", who: "tomas", helper: true, name: "Strůjce všeho", text: "+3 Práce na vyložený projekt.", flavor: "Tomáš staví i věci, o kterých ještě neví." },
  { id: "E2", who: "tomas", helper: true, name: "Kolečko", text: "Kolečko na tvé pole. Kdo ho veze, unese +3. Po odevzdání na Seníku se vrací do Dílny.", flavor: "Nechal kolečko u sadu. Zase. …Kolečko podalo protest." },
  { id: "E3", who: "tomas", helper: true, name: "Příkopy za seno", text: "Každé zvíře +1 Tráva.", flavor: "Obec dala seno za posekané příkopy. …Karel nabídl, že je dojí. Odmítli." },
  { id: "E4", who: "tomas", helper: true, name: "Zavírá vrata", text: "Zavře vrata (kromě Karlových). Každé zvíře má v příštím tahu pohyb +1.", flavor: "Zavřel za Avalou potřetí. …Avala si myslí, že je to hra." },
  { id: "E5", who: "tomas", helper: true, name: "Opravuje plot", text: "Všechny Potřeby +1 kolo.", flavor: "Prkno do ohrady. Zase. …Yakul o tom nic neví." },
  { id: "E6", who: "maruska", helper: true, name: "Suší bylinky", text: "2 Bylinky (tvoje nebo ze Zahrádky) → 1 Sušené bylinky rovnou do spíže.", flavor: "Bylinky visí v kuchyni. …Karel na ně dosáhne. Ví to jen on." },
  { id: "E7", who: "maruska", helper: true, name: "Vede zásoby", text: "Až 3 výrobky od zvířat rovnou do spíže.", flavor: "Maruška vede tabulku. Karel v ní má kolonku mrkev. …Zatím prázdnou." },
  { id: "E8", who: "maruska", helper: true, name: "Zpracuje úrodu", text: "2 Ovoce ze sadu nebo alejí → 1 Křížaly do spíže.", flavor: "Křížaly na zimu. …Některé se zimy nedožijí. Flíček." },
  { id: "E9", who: "maruska", helper: true, name: "Žádost o grant", text: "+2 Práce na projekt (na Solár +4).", flavor: "Formulář na dvanáct stran. …Karel jednu okousal. Prošlo to." },
  { id: "E10", who: "tony", helper: true, name: "Čerpadlo", text: "Solár a studna +3 Vody (po Studni +5).", flavor: "Tony zapnul čerpadlo. …Karel zapnul uši." },
  { id: "E11", who: "tony", helper: true, name: "Aplikace", text: "Prohlédni 3 karty počasí a seřaď je.", flavor: "Aplikace hlásí déšť. Karel to ví taky. …Uši se neseknou." },
  { id: "E12", who: "tony", helper: true, name: "Solární sušička", text: "Toto kolo se Křížaly i Bylinky suší v jakémkoli počasí.", flavor: "Slunce uložené na později. …Karel by tak uložil mrkev." },
  { id: "E13", who: "louka", helper: false, name: "Kohout Julek", text: "Každé zvíře smí v tomto kole popojít o 1 pole (Květa o 2).", flavor: "Julek kokrhá ve čtyři. Ne že musí. …Protože může." },
  { id: "E14", who: "louka", helper: false, name: "Brigáda", text: "Každé zvíře na stanici smí v tomto kole udělat akci síly 1 navíc.", flavor: "Dobrovolníci přijeli. …Karel je zaúčal. Do ničeho." },
  { id: "E15", who: "louka", helper: false, name: "Sbírka na seno", text: "+2 Sena do spíže.", flavor: "Lidé poslali na seno. …Karel by poděkoval osobně. Hýkáním." },
  { id: "E16", who: "louka", helper: false, name: "Zažít Louku", text: "Každé zvíře +1 srdíčko.", flavor: "Návštěva drbala všechny. …Karla dvakrát. Zařídil si to." },
  { id: "E17", who: "louka", helper: false, name: "Myši v Seníku", text: "−1 Seno ze spíže (neplatí s Romanem nebo Pelíšky pro kočky).", flavor: "Myši. …Kočky měly zrovna poradu." },
  { id: "E18", who: "louka", helper: false, name: "Procházka se zvířaty", text: "Každé zvíře smí v tomto kole přejít na Bránu a dostat srdíčko.", flavor: "Procházka. Karel jde první. …Ví, kam se jde. Většinou." },
];

export const EVENT_BY_ID = Object.fromEntries(EVENTS.map((c) => [c.id, c])) as Record<string, EventCard>;
export const RESERVE_MAX = 2;
