import { useRef, type PointerEvent, type ReactNode } from "react";
import { COLLECT_CARDS, RARITY, SHOWCASE, STATS, type Rarity } from "@data/collect";
import { NEEDS } from "@data/cards/needs";
import { AnimalBoardView, CardBack, EventCardView, FactCardView, NeedCardView, ProjectCardView, WeatherCardView } from "@art/cards/Cards";
import { CollectBack, CollectCardView, RarityMark } from "@art/collect/CollectCard";
import { useReducedMotion } from "@game/useMedia";

/** Náklon a odlesk podle ukazatele (myš i prst). Jen obrazovka — v tisku je holo fólie. */
function Tilt({ children, rarity }: { children: ReactNode; rarity?: Rarity }) {
  const ref = useRef<HTMLDivElement>(null);
  const still = useReducedMotion();
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || still) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.setProperty("--mx", `${(x * 100).toFixed(1)}%`);
    el.style.setProperty("--my", `${(y * 100).toFixed(1)}%`);
    el.style.setProperty("--ry", `${((x - 0.5) * 18).toFixed(2)}deg`);
    el.style.setProperty("--rx", `${((0.5 - y) * 18).toFixed(2)}deg`);
    el.style.setProperty("--on", "1");
  };
  const leave = () => {
    const el = ref.current;
    if (!el) return;
    for (const k of ["--mx", "--my", "--rx", "--ry", "--on"]) el.style.removeProperty(k);
  };
  return (
    <div ref={ref} className={`tilt ${still ? "tilt-still" : ""}`} data-rarity={rarity} onPointerMove={move} onPointerLeave={leave} onPointerCancel={leave}>
      {children}
    </div>
  );
}

function Section({ kicker, title, children, note }: { kicker: string; title: string; children: ReactNode; note?: ReactNode }) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-8">
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#b85c3c]">{kicker}</p>
      <h2 className="mt-1 font-serif text-3xl font-bold text-[#1f3d2a] sm:text-4xl" style={{ fontFamily: "Fraunces, serif" }}>
        {title}
      </h2>
      {note ? <div className="mt-2 max-w-2xl text-[15px] leading-relaxed text-[#3d3326]">{note}</div> : null}
      <div className="mt-6 flex flex-wrap items-start justify-center gap-6 sm:justify-start">{children}</div>
    </section>
  );
}

function Label({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <figcaption className="mt-2 text-center text-sm text-[#3d3326]">
      <b>{children}</b>
      {sub ? <div className="text-xs opacity-75">{sub}</div> : null}
    </figcaption>
  );
}

export function CollectApp() {
  const quartet = COLLECT_CARDS.filter((c) => c.animal === "karel");
  const need = NEEDS[0].id;
  return (
    <main className="min-h-svh bg-[#f4ecd6] pb-16 text-[#2a2418]">
      <header className="bg-[#1f3d2a] px-4 py-12 text-[#fffaf0] sm:px-8">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#f0e892]">Než přijde zima · náhled karet</p>
          <h1 className="mt-2 text-5xl font-bold leading-none sm:text-6xl" style={{ fontFamily: "Fraunces, serif" }}>
            Karty z Louky
          </h1>
          <p className="mt-4 max-w-2xl text-[16px] leading-relaxed opacity-90">
            Nahoře karty deskové hry, jak jsou dnes v tiskovém PDF. Dole prototyp sběratelských karet: kvarteto a přebíjení se zvířaty z Louky,
            s vzácnými, holo a legendárními verzemi. Najeď nebo přejeď prstem po kartě.
          </p>
        </div>
      </header>

      <Section kicker="Desková hra" title="Herní karty dnes" note="Poker 63×88 mm, jeden vzhled pro všechny druhy: barevný pruh, rámeček, pravidlo, Karlova hláška dole.">
        {[
          { el: <WeatherCardView id="LD1" />, label: "Počasí", sub: "drsné, léto" },
          { el: <NeedCardView id={need} />, label: "Potřeba" },
          { el: <EventCardView id="E2" />, label: "Pomocník", sub: "Tomáš" },
          { el: <ProjectCardView id="hotel" />, label: "Projekt Louky" },
          { el: <FactCardView index={0} />, label: "Věděli jste?", sub: "mini 44×68" },
          { el: <CardBack kind="weather" />, label: "Rub" },
        ].map((x) => (
          <figure key={x.label}>
            {x.el}
            <Label sub={x.sub}>{x.label}</Label>
          </figure>
        ))}
        <figure>
          <AnimalBoardView id="karel" mode={{ u: 2.6 }} />
          <Label sub="A6, zmenšeno">Tabulka zvířete</Label>
        </figure>
      </Section>

      <Section
        kicker="Sběratelské karty · prototyp"
        title="Kvarteto: Karel ve čtyřech ročních obdobích"
        note={
          <>
            Skupina = zvíře (1 Karel, 2 Pogo … 6 Yakul, 7–8 čekají na další zvířata), písmeno = roční období. Kód je vlevo nahoře, aby byl vidět i
            ve vějíři v ruce. Pět vlastností na přebíjení: {STATS.map((s) => s.name).join(", ")}. Čísla jsou návrh, ne fakta.
          </>
        }
      >
        {quartet.map((c) => (
          <figure key={c.id}>
            <Tilt>
              <CollectCardView print={{ card: c.id, rarity: "bezna" }} />
            </Tilt>
            <Label>{c.id}</Label>
          </figure>
        ))}
      </Section>

      <Section
        kicker="Jedna karta, čtyři vzácnosti"
        title="Stejná čísla, jiné zpracování"
        note="Vzácnost nemění hodnoty. Holo nebo legendární Karel 1D se dá zamíchat do balíčku místo běžného a hraje se stejně. Sbírá se pro radost a pro příběh, odkud karta je (razítko z akce)."
      >
        {SHOWCASE.map((p, i) => (
          <figure key={i}>
            <Tilt rarity={p.rarity}>
              <CollectCardView print={p} />
            </Tilt>
            <Label sub={RARITY[p.rarity].how}>
              {p.card} · {RARITY[p.rarity].name}
            </Label>
          </figure>
        ))}
        <figure>
          <CollectBack />
          <Label>Rub</Label>
        </figure>
      </Section>

      <section className="mx-auto max-w-6xl px-4 sm:px-8">
        <h2 className="text-2xl font-bold text-[#1f3d2a]" style={{ fontFamily: "Fraunces, serif" }}>
          Jak se která karta získá
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {(Object.keys(RARITY) as Rarity[]).map((r) => (
            <li key={r} className="flex items-center gap-3 rounded-xl bg-[#fffaf0] p-4 shadow-sm">
              <RarityMark rarity={r} className="h-8 w-8 flex-none" />
              <div>
                <b>{RARITY[r].name}</b>
                <div className="text-sm opacity-80">{RARITY[r].how}</div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
