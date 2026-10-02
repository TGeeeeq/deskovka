import { Fragment, useEffect, useState, type ReactNode } from "react";
import { marked } from "marked";
import { ANIMAL_IDS } from "@data/animals";
import { EVENTS } from "@data/cards/events";
import { FACTS } from "@data/cards/facts";
import { NEEDS } from "@data/cards/needs";
import { PROJECTS } from "@data/cards/projects";
import { WEATHER } from "@data/cards/weather";
import { ITEMS, PRODUCTS, RESOURCES } from "@data/items";
import { AnimalBoardView, CardBack, EventCardView, FactCardView, NeedCardView, ProjectCardView, WeatherCardView } from "@art/cards/Cards";
import { Board } from "@art/board/Board";
import { AnimalSvg } from "@art/karel/AnimalSvg";
import { HeartIcon, WeatherGlyph, shapePath } from "@art/icons/Icons";
import { renderToStaticMarkup } from "react-dom/server";
import type { WeatherIcon } from "@data/types";
import rules from "../../docs/PRAVIDLA.md?raw";
import quick from "../../docs/RYCHLY-START.md?raw";
import aid from "../../docs/KARTA-POMOCI.md?raw";
import { A4, BLEED, CARD, MINI, chunk, gridOrigin } from "./layout";

type Deck = { id: string; name: string; back: "weather" | "need" | "event" | "project" | "fact"; cards: ReactNode[]; mini?: boolean };

const P = { print: true } as const;
const PB = { print: true, bleed: true } as const;

function decks(bleed: boolean): Deck[] {
  const m = bleed ? PB : P;
  return [
    { id: "pocasi", name: "Počasí", back: "weather", cards: WEATHER.map((c) => <WeatherCardView key={c.id} id={c.id} mode={m} />) },
    { id: "potreby", name: "Potřeby", back: "need", cards: NEEDS.map((c) => <NeedCardView key={c.id} id={c.id} mode={m} />) },
    { id: "udalosti", name: "Události", back: "event", cards: EVENTS.map((c) => <EventCardView key={c.id} id={c.id} mode={m} />) },
    { id: "projekty", name: "Projekty", back: "project", cards: PROJECTS.map((c) => <ProjectCardView key={c.id} id={c.id} mode={m} />) },
    { id: "fakty", name: "Věděli jste", back: "fact", mini: true, cards: FACTS.map((_, i) => <FactCardView key={i} index={i} mode={m} />) },
  ];
}

/** Nastaví velikost tiskové stránky. */
function PageSize({ w, h, margin = "0" }: { w: number; h: number; margin?: string }) {
  return <style>{`@page { size: ${w}mm ${h}mm; margin: ${margin}; } html,body{margin:0}`}</style>;
}

function Page({ w, h, children, style }: { w: number; h: number; children: ReactNode; style?: React.CSSProperties }) {
  return (
    <section className="pr-page" style={{ width: `${w}mm`, height: `${h}mm`, ...style }}>
      {children}
    </section>
  );
}

/** Ořezové značky kolem mřížky karet (jen v okraji, ne přes karty). */
function CropMarks({ cols, rows, cw, ch, x0, y0 }: { cols: number; rows: number; cw: number; ch: number; x0: number; y0: number }) {
  const out: ReactNode[] = [];
  const L = 6;
  for (let c = 0; c <= cols; c++) {
    const x = x0 + c * cw;
    out.push(<div key={`t${c}`} className="pr-crop" style={{ left: `${x - 0.1}mm`, top: `${y0 - L - 1}mm`, width: "0.2mm", height: `${L}mm` }} />);
    out.push(<div key={`b${c}`} className="pr-crop" style={{ left: `${x - 0.1}mm`, top: `${y0 + rows * ch + 1}mm`, width: "0.2mm", height: `${L}mm` }} />);
  }
  for (let r = 0; r <= rows; r++) {
    const y = y0 + r * ch;
    out.push(<div key={`l${r}`} className="pr-crop" style={{ top: `${y - 0.1}mm`, left: `${x0 - L - 1}mm`, height: "0.2mm", width: `${L}mm` }} />);
    out.push(<div key={`r${r}`} className="pr-crop" style={{ top: `${y - 0.1}mm`, left: `${x0 + cols * cw + 1}mm`, height: "0.2mm", width: `${L}mm` }} />);
  }
  return <>{out}</>;
}

function Ruler() {
  return (
    <div style={{ position: "absolute", left: "12mm", top: "4mm", display: "flex", alignItems: "center", gap: "2mm", font: "6.5pt 'Plus Jakarta Sans'" }}>
      <div style={{ width: "50mm", height: "2.4mm", borderLeft: "0.25mm solid #000", borderRight: "0.25mm solid #000", borderBottom: "0.25mm solid #000" }} />
      <span>Tento proužek musí měřit přesně 50 mm. Tiskni na 100 % (bez „přizpůsobit stránce“).</span>
    </div>
  );
}

/** PnP: A4, karty na sebe bez mezer, ruby zrcadlené pro oboustranný tisk po dlouhé hraně. */
function PnP({ withBacks }: { withBacks: boolean }) {
  const pages: ReactNode[] = [];
  let total = 0;
  const all = decks(false);
  const sheets: { deck: Deck; cards: ReactNode[]; back: boolean }[] = [];
  for (const d of all) {
    const g = d.mini ? MINI : CARD;
    const per = g.cols * g.rows;
    for (const part of chunk(d.cards, per)) {
      sheets.push({ deck: d, cards: part, back: false });
      if (withBacks) sheets.push({ deck: d, cards: part, back: true });
    }
  }
  total = sheets.length;
  sheets.forEach((sh, i) => {
    const g = sh.deck.mini ? MINI : CARD;
    const { x0, y0 } = gridOrigin(g);
    pages.push(
      <Page key={i} w={A4.w} h={A4.h}>
        <Ruler />
        <CropMarks cols={g.cols} rows={g.rows} cw={g.w} ch={g.h} x0={x0} y0={y0} />
        {sh.cards.map((card, k) => {
          const col = k % g.cols;
          const row = Math.floor(k / g.cols);
          const c = sh.back ? g.cols - 1 - col : col;
          return (
            <div key={k} style={{ position: "absolute", left: `${x0 + c * g.w}mm`, top: `${y0 + row * g.h}mm` }}>
              {sh.back ? <CardBack kind={sh.deck.back} mode={P} /> : card}
            </div>
          );
        })}
        <div className="pr-foot">
          Než přijde zima · {sh.deck.name} · {sh.back ? "RUBY (otoč po dlouhé hraně)" : "líce"} · list {i + 1}/{total} · Nech mě růst z.s. · jen pro hraní na Louce
        </div>
      </Page>,
    );
  });
  return (
    <>
      <PageSize w={A4.w} h={A4.h} />
      {pages}
    </>
  );
}

/** Jedna karta na stranu se spadávkou — pro tiskárnu. */
function CardsBleed({ deck }: { deck: string }) {
  const d = decks(true).find((x) => x.id === deck)!;
  const w = (d.mini ? 44 : 63) + 2 * BLEED;
  const h = (d.mini ? 68 : 88) + 2 * BLEED;
  return (
    <>
      <PageSize w={w} h={h} />
      {d.cards.map((c, i) => (
        <Page key={i} w={w} h={h}>
          {c}
        </Page>
      ))}
      <Page w={w} h={h}>
        <CardBack kind={d.back} mode={PB} />
      </Page>
    </>
  );
}

function AnimalBoards({ bleed }: { bleed: boolean }) {
  if (bleed)
    return (
      <>
        <PageSize w={111} h={154} />
        {ANIMAL_IDS.map((id) => (
          <Page key={id} w={111} h={154}>
            <AnimalBoardView id={id} mode={PB} />
          </Page>
        ))}
      </>
    );
  return (
    <>
      <PageSize w={A4.h} h={A4.w} />
      {chunk(ANIMAL_IDS, 2).map((pair, i) => (
        <Page key={i} w={A4.h} h={A4.w}>
          <CropMarks cols={2} rows={1} cw={105} ch={148} x0={(A4.h - 210) / 2} y0={(A4.w - 148) / 2} />
          {pair.map((id, k) => (
            <div key={id} style={{ position: "absolute", left: `${(A4.h - 210) / 2 + k * 105}mm`, top: `${(A4.w - 148) / 2}mm` }}>
              <AnimalBoardView id={id} mode={P} />
            </div>
          ))}
          <div className="pr-foot">Tabulky zvířat · list {i + 1}/3 · tiskni na 100 %</div>
        </Page>
      ))}
    </>
  );
}

/** Celá deska 506×506 mm se spadávkou (velkoformát), nebo 4 dlaždice A3. */
function BoardPrint({ tiles }: { tiles: boolean }) {
  const board = (vb: string, w: number, h: number) => (
    <svg viewBox={vb} width={`${w}mm`} height={`${h}mm`} style={{ display: "block" }}>
      <rect x={-10} y={-10} width={520} height={520} fill="#e2cc93" />
      <Board />
    </svg>
  );
  if (!tiles)
    return (
      <>
        <PageSize w={506} h={506} />
        <Page w={506} h={506}>
          {board("-3 -3 506 506", 506, 506)}
        </Page>
      </>
    );
  const Q = 250;
  const O = 3;
  const quads = [
    [0, 0, "1 · vlevo nahoře"],
    [Q, 0, "2 · vpravo nahoře"],
    [0, Q, "3 · vlevo dole"],
    [Q, Q, "4 · vpravo dole"],
  ] as const;
  const W = Q + 2 * O;
  const x0 = (297 - W) / 2;
  const y0 = 40;
  return (
    <>
      <PageSize w={297} h={420} />
      {quads.map(([qx, qy, label]) => (
        <Page key={label} w={297} h={420}>
          <div style={{ position: "absolute", left: `${x0}mm`, top: `${y0}mm` }}>{board(`${qx - O} ${qy - O} ${W} ${W}`, W, W)}</div>
          <CropMarks cols={1} rows={1} cw={Q} ch={Q} x0={x0 + O} y0={y0 + O} />
          <div style={{ position: "absolute", left: `${x0}mm`, top: `${y0 + W + 10}mm`, width: `${W}mm`, font: "9pt 'Plus Jakarta Sans'", color: "#3d3326" }}>
            <b style={{ fontFamily: "Fraunces", fontSize: "14pt" }}>Deska — dlaždice {label}</b>
            <br />
            Ořízni podle značek na 250 × 250 mm a nalep na lepenku 2 mm. Dlaždice spoj knihařskou páskou s mezerou 1–2 mm (pant pro skládání). Tiskni na 100 %.
          </div>
          <Ruler />
        </Page>
      ))}
    </>
  );
}

/** Papírové žetony — tvar = řez. Počty podle data/items.ts. */
function Tokens() {
  type T = { key: string; node: ReactNode };
  const list: T[] = [];
  const shape = (d: string, fill: string, ink: string, extra?: ReactNode) => (
    <svg viewBox="-12.5 -12.5 25 25" width="15mm" height="15mm">
      <path d={d} fill={fill} stroke={ink} strokeWidth={0.8} fillRule="evenodd" />
      {extra}
    </svg>
  );
  for (const id of [...RESOURCES, ...PRODUCTS]) {
    const it = ITEMS[id];
    for (let i = 0; i < it.tokens; i++)
      list.push({ key: `${id}${i}`, node: shape(shapePath(it.shape, 11), it.color, it.ink, it.kind === "product" ? <path d={shapePath(it.shape, 8)} fill="none" stroke="#fff" strokeOpacity={0.6} strokeWidth={0.7} fillRule="evenodd" /> : undefined) });
  }
  for (let i = 0; i < 30; i++) list.push({ key: `h${i}`, node: <div style={{ width: "15mm", height: "15mm", display: "grid", placeItems: "center" }}><HeartIcon size={52} /></div> });
  const label = (k: string, text: string, bg: string, n: number, fg = "#fff") => {
    for (let i = 0; i < n; i++)
      list.push({
        key: `${k}${i}`,
        node: (
          <div style={{ width: "15mm", height: "15mm", borderRadius: "2mm", background: bg, color: fg, display: "grid", placeItems: "center", textAlign: "center", font: "600 5.6pt 'Plus Jakarta Sans'", lineHeight: 1.05, padding: "0.8mm", boxSizing: "border-box", border: "0.3mm solid #3d3326" }}>
            {text}
          </div>
        ),
      });
  };
  label("w", "Práce", "#8a6a3e", 20);
  label("g", "Vrata ⇄ otevřená / zavřená", "#c9a766", 2, "#2a2418");
  label("lk", "Karlova závora", "#2d5a3d", 2);
  label("br", "Větve", "#5a3c28", 3);
  label("t", "Lhůta", "#b85c3c", 3);
  label("ph", "Pomohl/a jsem", "#6b8e6e", 4);
  label("sv", "Sousedská výpomoc", "#a4422c", 8);
  label("op", "Opylovači (expert)", "#e0b23c", 3, "#2a2418");
  label("vy", "Vyčerpání (expert)", "#7a7060", 12);
  label("po", "Pohnojeno (expert)", "#4a3a28", 3);
  label("kl", "Šéfovský klobouk", "#e8c579", 1, "#2a2418");
  label("ko", "Kolečko", "#8a6a3e", 1);
  label("hu", "Husy", "#f7f3ea", 1, "#2a2418");
  label("lu", "Lucinka", "#f2ede2", 1, "#2a2418");
  label("ro", "Kolo", "#2d5a3d", 1);
  const per = 11 * 16;
  const pages = chunk(list, per);
  return (
    <>
      <PageSize w={A4.w} h={A4.h} />
      {pages.map((pg, pi) => (
        <Page key={pi} w={A4.w} h={A4.h}>
          <Ruler />
          <div style={{ position: "absolute", left: "17.5mm", top: "14mm", display: "grid", gridTemplateColumns: "repeat(11, 16mm)", gridAutoRows: "16mm", placeItems: "center" }}>
            {pg.map((t) => (
              <Fragment key={t.key}>{t.node}</Fragment>
            ))}
          </div>
          <div className="pr-foot">Žetony · list {pi + 1}/{pages.length} · vystřihni podle obrysu, nebo nalep na 1,5 mm lepenku · lze nahradit 3D tiskem (docs/3D.md)</div>
        </Page>
      ))}
    </>
  );
}

const ICON_OF: Record<string, WeatherIcon> = { "☀": "slunce", "⛅": "polojasno", "🌧": "dest", "⛈": "bourka", "💨": "vitr", "❄": "mraz" };
const ICON_SVG = Object.fromEntries(
  Object.entries(ICON_OF).map(([ch, id]) => [ch, renderToStaticMarkup(<WeatherGlyph icon={id} size={13} />).replace("<svg", '<svg style="vertical-align:-3px"')]),
);
/** Markdown → HTML; emoji počasí nahradí kreslené ikony (tiskový Chromium nemá barevná emoji). */
function mdHtml(md: string) {
  let h = marked.parse(md, { async: false }) as string;
  for (const [ch, svg] of Object.entries(ICON_SVG)) h = h.split(ch).join(svg);
  h = h.split("📜").join('<b style="color:#b85c3c">[+ Potřeba]</b>');
  return { __html: h };
}

function Rulebook() {
  const html = mdHtml;
  return (
    <>
      <style>{`@page { size: 148mm 210mm; margin: 13mm 12mm 15mm; } @page :first { margin: 0 } html,body{margin:0;background:#fff}`}</style>
      <section style={{ width: "148mm", height: "210mm", background: "#2d5a3d", color: "#f7f2e7", position: "relative", breakAfter: "page", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: "10mm", border: "0.4mm solid rgba(240,232,146,.6)", borderRadius: "4mm" }} />
        <div style={{ position: "absolute", top: "26mm", left: 0, right: 0, textAlign: "center" }}>
          <div style={{ font: "700 7pt 'Plus Jakarta Sans'", letterSpacing: "0.3em", color: "#f0e892" }}>KOOPERATIVNÍ HRA Z LOUKY</div>
          <div style={{ font: "700 34pt Fraunces", marginTop: "4mm", lineHeight: 1 }}>Než přijde zima</div>
          <div style={{ font: "9pt 'Plus Jakarta Sans'", marginTop: "4mm", opacity: 0.9 }}>Pravidla · 1–4 hráči · 8–100+ let · 30–45 minut</div>
        </div>
        <div style={{ position: "absolute", bottom: "40mm", left: "12mm", right: "12mm", display: "flex", justifyContent: "center", alignItems: "flex-end", gap: "1mm" }}>
          {ANIMAL_IDS.map((id) => (
            <div key={id} style={{ width: "20mm", height: "17mm" }}>
              <AnimalSvg id={id} className="" />
            </div>
          ))}
        </div>
        <div style={{ position: "absolute", bottom: "20mm", left: 0, right: 0, textAlign: "center", font: "8pt 'Plus Jakarta Sans'" }}>Nech mě růst z.s. · nechmerust.org · Vlkaneč</div>
      </section>
      <article className="rb" dangerouslySetInnerHTML={html(rules)} />
      <article className="rb" style={{ breakBefore: "page" }} dangerouslySetInnerHTML={html(quick)} />
    </>
  );
}

function PlayerAid() {
  return (
    <>
      <style>{`@page { size: 210mm 297mm; margin: 9mm; } html,body{margin:0;background:#fff} .rb.aid h1{font-size:15pt;column-span:all} .rb.aid h2{font-size:10.5pt;margin:2.5mm 0 1mm} .rb.aid table{font-size:6.8pt}`}</style>
      {[0, 1, 2, 3].map((i) => (
        <article key={i} className="rb aid" style={{ breakAfter: i < 3 ? "page" : "auto", fontSize: "7.3pt", columns: 2, columnGap: "7mm" }} dangerouslySetInnerHTML={mdHtml(aid)} />
      ))}
    </>
  );
}

const ROUTES: { id: string; name: string; note: string; el: () => ReactNode }[] = [
  { id: "pnp", name: "Karty — PnP A4 (líce + ruby)", note: "Domácí tisk na 300 g/m² matný karton, oboustranně po dlouhé hraně. 9 karet na list.", el: () => <PnP withBacks /> },
  { id: "pnp-lice", name: "Karty — PnP A4 jen líce", note: "Když tiskárna neumí oboustranně: líce vytiskni, ruby nech jednobarevné v obalech.", el: () => <PnP withBacks={false} /> },
  ...["pocasi", "potreby", "udalosti", "projekty", "fakty"].map((d) => ({ id: `karty-${d}`, name: `Karty se spadávkou — ${d}`, note: "Pro tiskárnu: 1 karta na stranu, 3 mm spadávka.", el: () => <CardsBleed deck={d} /> })),
  { id: "zvirata", name: "Tabulky zvířat A6 (2 na A4 na šířku)", note: "Domácí tisk, karton.", el: () => <AnimalBoards bleed={false} /> },
  { id: "zvirata-spadavka", name: "Tabulky zvířat A6 se spadávkou", note: "Pro tiskárnu.", el: () => <AnimalBoards bleed /> },
  { id: "deska", name: "Deska 506×506 mm se spadávkou", note: "Velkoformátový tisk (copy shop / JerryLabs).", el: () => <BoardPrint tiles={false} /> },
  { id: "deska-a3", name: "Deska — 4 dlaždice A3", note: "Doma nebo v copy shopu, nalepit na 2 mm lepenku.", el: () => <BoardPrint tiles /> },
  { id: "zetony", name: "Žetony (papírové)", note: "Nebo 3D tisk — docs/3D.md.", el: () => <Tokens /> },
  { id: "pravidla", name: "Pravidla A5", note: "160 g/m² papír, sešitová vazba (booklet A4 vyrobí skript).", el: () => <Rulebook /> },
  { id: "karta-pomoci", name: "Karta pomoci A4 ×4", note: "Jedna pro každého hráče, oboustranně nebo jednostranně.", el: () => <PlayerAid /> },
];
export const PRINT_ROUTES = ROUTES.map((r) => r.id);

export function PrintApp() {
  const [hash, setHash] = useState(() => location.hash.slice(1));
  useEffect(() => {
    document.body.classList.add("pr-body");
    const h = () => setHash(location.hash.slice(1));
    window.addEventListener("hashchange", h);
    return () => window.removeEventListener("hashchange", h);
  }, []);
  const r = ROUTES.find((x) => x.id === hash);
  if (r) return <>{r.el()}</>;
  return (
    <main className="mx-auto max-w-3xl bg-cream p-8 font-sans">
      <h1 className="text-4xl font-bold text-moss-deep">Než přijde zima — tisk</h1>
      <p className="mt-2">Hotová PDF vyrobí <code>npm run print</code> do <code>out/print/</code>. Tady je náhled každé tiskové sady. Podrobný postup je v <code>docs/TISK.md</code>.</p>
      <ul className="mt-6 flex flex-col gap-3">
        {ROUTES.map((x) => (
          <li key={x.id} className="rounded-[14px] bg-surface p-4 shadow-soft">
            <a className="text-lg font-semibold text-moss underline" href={`#${x.id}`}>
              {x.name}
            </a>
            <div className="text-sm text-text-muted">{x.note}</div>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-sm text-text-muted">První vydání je jen pro hraní na Louce, ne k prodeji. Prodej nebo darování vyžaduje bezpečnostní posouzení hračky (EN 71) a značku CE.</p>
    </main>
  );
}
