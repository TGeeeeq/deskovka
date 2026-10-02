import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { motion, useMotionValueEvent, useScroll } from "motion/react";
import { ANIMAL_DEFS, ANIMAL_IDS } from "@data/animals";
import type { AnimalId } from "@data/types";
import { Board } from "@art/board/Board";
import { spaceXY } from "@art/board/geometry";
import { AnimalSvg } from "@art/karel/AnimalSvg";
import { viewBoxAttr } from "@art/karel/anatomy";
import { EventCardView, NeedCardView, ProjectCardView, WeatherCardView, AnimalBoardView, FactCardView } from "@art/cards/Cards";
import { ItemIcon, Marker, StarIcon, WeatherGlyph } from "@art/icons/Icons";
import { T } from "./copy";
import { LiveDemo } from "./LiveDemo";

const Hero3D = lazy(() => import("./Hero3D"));
const BASE = import.meta.env.BASE_URL;
const PHOTO: Record<AnimalId, string> = { karel: "karel1", pogo: "pogo2", avala: "avala8", kveta: "kveta7", flicek: "flicek1", yakul: "yakul9" };

function useCanWebGL() {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    try {
      const c = document.createElement("canvas");
      const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
      setOk(!reduced && !!(c.getContext("webgl2") || c.getContext("webgl")));
    } catch {
      setOk(false);
    }
  }, []);
  return ok;
}

function Section({ id, children, className = "", dark }: { id?: string; children: ReactNode; className?: string; dark?: boolean }) {
  return (
    <section id={id} className={`relative px-5 py-24 md:px-10 md:py-32 ${dark ? "bg-moss-deep text-cream" : ""} ${className}`}>
      <div className="mx-auto max-w-6xl">{children}</div>
    </section>
  );
}

function Kicker({ children, light }: { children: ReactNode; light?: boolean }) {
  return <div className={`mb-4 text-xs font-bold uppercase tracking-[0.28em] ${light ? "text-accent" : "text-terracotta"}`}>{children}</div>;
}

function Reveal({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.div>
  );
}

function Nav() {
  const [solid, setSolid] = useState(false);
  useEffect(() => {
    const h = () => setSolid(window.scrollY > 40);
    h();
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);
  const links: [string, string][] = [
    ["#hra", T.nav.hra],
    ["#louka", T.nav.louka],
    ["#ukazka", T.nav.demo],
    ["#vydani", T.nav.vydani],
    ["#kontakt", T.nav.kontakt],
  ];
  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition ${solid ? "bg-cream/92 shadow-soft backdrop-blur" : ""}`}>
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3 md:px-10" aria-label="Hlavní">
        <a href="#top" className="font-serif text-lg font-bold text-moss-deep">
          Než přijde zima
        </a>
        <div className="hidden items-center gap-6 text-sm font-semibold md:flex">
          {links.map(([h, l]) => (
            <a key={h} href={h} className="text-ink/80 hover:text-moss">
              {l}
            </a>
          ))}
        </div>
        <a href={BASE} className="rounded-full bg-moss px-4 py-2 text-sm font-semibold text-cream shadow-soft hover:bg-moss-deep">
          {T.nav.hrat} →
        </a>
      </nav>
    </header>
  );
}

/** Statický plakát: funguje bez WebGL, bez JS animací, s omezeným pohybem. */
function Poster() {
  return (
    <div className="absolute inset-0 grid place-items-center">
      <div className="relative w-[min(78vw,600px)] drop-shadow-[0_40px_60px_rgba(31,61,42,.35)]" style={{ transform: "perspective(1400px) rotateX(38deg) rotateZ(-8deg)" }}>
        <Board className="w-full rounded-[6px]" />
      </div>
      <div className="absolute bottom-[8%] flex max-w-full flex-wrap items-end justify-center gap-1 px-2 md:gap-3">
        {ANIMAL_IDS.map((id, i) => (
          <div key={id} className="h-12 w-14 md:h-24 md:w-28 karel-bob" style={{ animationDelay: `${i * 0.18}s` }}>
            <AnimalSvg id={id} className="h-full w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

function Hero() {
  const gl = useCanWebGL();
  const [ready, setReady] = useState(false);
  return (
    <section id="top" className="relative min-h-[100svh] overflow-hidden bg-[radial-gradient(ellipse_at_60%_35%,#f6ebcd_0%,#ead7a4_55%,#d4b97e_100%)]">
      <div className="absolute inset-x-0 top-12 h-[50svh] md:inset-y-0 md:left-[40%] md:top-0 md:h-auto">
        <div className={`absolute inset-0 transition-opacity duration-700 ${ready ? "opacity-0" : "opacity-100"}`}>
          <Poster />
        </div>
        {gl ? (
          <Suspense fallback={null}>
            <div className={`absolute inset-0 transition-opacity duration-1000 ${ready ? "opacity-100" : "opacity-0"}`}>
              <Hero3D onReady={() => setReady(true)} />
            </div>
          </Suspense>
        ) : null}
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-cream to-transparent" />
      <div className="pointer-events-none relative mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-end px-5 pb-16 pt-[54svh] md:justify-center md:px-10 md:pb-20 md:pt-28">
        <div className="pointer-events-auto max-w-xl">
          <div className="hero-in text-xs font-bold uppercase tracking-[0.28em] text-terracotta">{T.hero.kicker}</div>
          <h1 className="hero-in mt-4 text-5xl font-bold leading-[0.95] text-moss-deep sm:text-6xl md:text-8xl" style={{ animationDelay: "80ms" }}>
            {T.hero.title}
          </h1>
          <p className="hero-in mt-6 text-lg leading-relaxed text-text md:text-xl" style={{ animationDelay: "160ms" }}>
            {T.hero.lead}
          </p>
          <div className="hero-in mt-8 flex flex-wrap gap-3" style={{ animationDelay: "240ms" }}>
            <a href={BASE} className="rounded-full bg-moss px-6 py-4 font-semibold text-cream shadow-lift hover:bg-moss-deep">
              {T.hero.play}
            </a>
            <a href="#vydani" className="rounded-full border-2 border-moss px-6 py-4 font-semibold text-moss hover:bg-moss hover:text-cream">
              {T.hero.support}
            </a>
          </div>
          <ul className="hero-in mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-moss-muted" style={{ animationDelay: "320ms" }}>
            {T.hero.meta.map((m) => (
              <li key={m}>· {m}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function Pillars() {
  return (
    <Section id="hra">
      <Reveal>
        <Kicker>Hra</Kicker>
        <h2 className="max-w-3xl text-4xl font-bold leading-tight text-moss-deep md:text-6xl">{T.pillars.title}</h2>
      </Reveal>
      <div className="mt-14 grid gap-6 md:grid-cols-3">
        {T.pillars.items.map((p, i) => (
          <Reveal key={p.k} delay={i * 0.1}>
            <div className="h-full rounded-[22px] border border-border bg-surface p-7 shadow-soft">
              <div className="mb-5 text-5xl font-bold text-amber">0{i + 1}</div>
              <h3 className="text-2xl font-bold text-moss-deep">{p.k}</h3>
              <p className="mt-3 leading-relaxed text-text">{p.t}</p>
            </div>
          </Reveal>
        ))}
      </div>
      <Reveal>
        <figure className="mt-16 flex items-center gap-5">
          <div className="h-24 w-28 shrink-0">
            <AnimalSvg id="karel" wear="hat" className="h-full w-full" />
          </div>
          <blockquote className="font-serif text-2xl italic text-text md:text-3xl">„{T.pillars.quip}“</blockquote>
        </figure>
      </Reveal>
    </Section>
  );
}

const SEASON_TINT = ["rgba(140,190,90,.10)", "rgba(240,190,70,.12)", "rgba(200,110,40,.16)", "rgba(220,235,245,.55)"];

/** Scroll-story: deska stojí, roční období se střídají, zvířata jdou po pěšině. */
function ScrollStory() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const [p, setP] = useState(0);
  useMotionValueEvent(scrollYProgress, "change", (v) => setP(v));
  const steps = T.story.steps;
  const step = Math.min(steps.length - 1, Math.floor(p * steps.length));
  const season = Math.min(3, Math.floor(p * 4));
  const walkers: AnimalId[] = ["karel", "pogo", "avala", "flicek"];
  const flakes = useMemo(() => Array.from({ length: 40 }, (_, i) => ({ x: (i * 37) % 100, d: (i * 13) % 7, s: 4 + (i % 5) })), []);
  return (
    <div ref={ref} id="louka" className="relative" style={{ height: `${steps.length * 90 + 60}vh` }}>
      <div className="sticky top-0 flex h-[100svh] items-center overflow-hidden">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-8 px-5 md:grid-cols-[1fr_1.1fr] md:px-10">
          <div className="order-2 md:order-1">
            <Kicker>{T.story.title}</Kicker>
            <div className="mb-6 flex gap-2" aria-hidden>
              {["Jaro", "Léto", "Podzim", "Zima"].map((s, i) => (
                <span key={s} className={`rounded-full px-3 py-1 text-sm font-semibold transition ${season === i ? "bg-moss text-cream" : "bg-sand/60 text-ink/60"}`}>
                  {s}
                </span>
              ))}
            </div>
            <motion.div key={step} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
              <h2 className="text-4xl font-bold leading-tight text-moss-deep md:text-5xl">{steps[step].h}</h2>
              <p className="mt-4 max-w-md text-lg leading-relaxed">{steps[step].t}</p>
            </motion.div>
            <div className="mt-8 h-1.5 w-full max-w-md overflow-hidden rounded-full bg-sand">
              <div className="h-full bg-moss" style={{ width: `${Math.round(p * 100)}%` }} />
            </div>
          </div>
          <div className="relative order-1 mx-auto w-[min(88vw,560px)] md:order-2">
            <div className="relative overflow-hidden rounded-[10px] shadow-lift">
              <Board className="block w-full" season={(["jaro", "leto", "podzim", "podzim"] as const)[season]} round={1 + (Math.floor(p * 12) % 3)} rounds={3}>
                {walkers.map((id, i) => {
                  const pos = (p * 58 + i * 7) % 30;
                  const a = spaceXY(1 + Math.floor(pos));
                  const b = spaceXY(1 + ((Math.floor(pos) + 1) % 30));
                  const f = pos - Math.floor(pos);
                  const x = a.x + (b.x - a.x) * f;
                  const y = a.y + (b.y - a.y) * f;
                  return (
                    <g key={id} transform={`translate(${x} ${y}) scale(1.4)`}>
                      <svg x={-12.5} y={-19.5} width={25} height={21.5} viewBox={viewBoxAttr} overflow="visible">
                        <g transform={x > 250 ? "translate(24 0) scale(-1 1)" : undefined}>
                          <AnimalSvg id={id} className="" />
                        </g>
                      </svg>
                    </g>
                  );
                })}
              </Board>
              <div className="pointer-events-none absolute inset-0 transition-colors duration-700" style={{ background: SEASON_TINT[season] }} />
              {season === 3 ? (
                <div className="pointer-events-none absolute inset-0" aria-hidden>
                  {flakes.map((f, i) => (
                    <span key={i} className="nz-flake absolute rounded-full bg-white" style={{ left: `${f.x}%`, width: f.s, height: f.s, animationDelay: `${f.d * 0.6}s` }} />
                  ))}
                </div>
              ) : null}
            </div>
            <div className="absolute -right-3 -top-6 hidden rotate-6 md:block">
              {step <= 1 ? <WeatherCardView id="J1" mode={{ u: 2.4 }} /> : step <= 3 ? <WeatherCardView id="L1" mode={{ u: 2.4 }} /> : step === 4 ? <WeatherCardView id="LD1" mode={{ u: 2.4 }} /> : <WeatherCardView id="PD1" mode={{ u: 2.4 }} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Animals() {
  return (
    <Section className="bg-surface-alt">
      <Reveal>
        <Kicker>Obyvatelé</Kicker>
        <h2 className="text-4xl font-bold text-moss-deep md:text-6xl">{T.animals.title}</h2>
        <p className="mt-4 max-w-2xl text-lg">{T.animals.lead}</p>
      </Reveal>
      <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {ANIMAL_IDS.map((id, i) => {
          const d = ANIMAL_DEFS[id];
          return (
            <Reveal key={id} delay={(i % 3) * 0.08}>
              <article className="group h-full overflow-hidden rounded-[22px] bg-surface shadow-soft">
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img src={`${BASE}prezentace/foto/${PHOTO[id]}.webp`} alt={`${d.name}, ${d.species} z Louky`} width={800} height={600} loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                  <div className="absolute bottom-3 right-3 h-20 w-24 rounded-[14px] bg-cream/90 p-1 shadow-soft">
                    <AnimalSvg id={id} className="h-full w-full" />
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-2">
                    <Marker id={id} size={26} />
                    <h3 className="text-2xl font-bold">{d.name}</h3>
                    <span className="text-sm text-text-muted">{d.species}</span>
                  </div>
                  <div className="mt-3 text-sm font-bold uppercase tracking-wider text-moss">{d.power.name}</div>
                  <p className="mt-1 leading-relaxed">{d.power.text}</p>
                  <p className="mt-4 font-serif italic text-text-muted">„{d.quote}“</p>
                </div>
              </article>
            </Reveal>
          );
        })}
      </div>
    </Section>
  );
}

function Demo() {
  return (
    <Section id="ukazka" dark>
      <Reveal>
        <Kicker light>Živá ukázka</Kicker>
        <h2 className="text-4xl font-bold md:text-6xl">{T.demo.title}</h2>
        <p className="mt-4 max-w-2xl text-lg opacity-90">{T.demo.lead}</p>
      </Reveal>
      <div className="mt-12">
        <LiveDemo />
      </div>
      <div className="mt-10">
        <a href={BASE} className="inline-block rounded-full bg-accent px-6 py-4 font-semibold text-ink shadow-lift">
          {T.demo.cta} →
        </a>
      </div>
    </Section>
  );
}

function Box() {
  return (
    <Section>
      <Reveal>
        <Kicker>Komponenty</Kicker>
        <h2 className="text-4xl font-bold text-moss-deep md:text-6xl">{T.box.title}</h2>
        <p className="mt-4 max-w-2xl text-lg">{T.box.lead}</p>
      </Reveal>
      <div className="relative mt-16 flex h-[340px] items-center justify-center md:h-[420px]" aria-label="Ukázka karet">
        {[
          <WeatherCardView key="w" id="L1" mode={{ u: 3.4 }} />,
          <NeedCardView key="n" id="N1" mode={{ u: 3.4 }} />,
          <AnimalBoardView key="a" id="karel" mode={{ u: 2.05 }} />,
          <EventCardView key="e" id="E2" mode={{ u: 3.4 }} />,
          <ProjectCardView key="p" id="hotel" mode={{ u: 3.4 }} />,
        ].map((c, i) => (
          <motion.div
            key={i}
            className="absolute"
            initial={{ rotate: 0, x: 0, opacity: 0 }}
            whileInView={{ rotate: (i - 2) * 9, x: (i - 2) * (typeof window !== "undefined" && window.innerWidth < 640 ? 46 : 120), y: Math.abs(i - 2) * 14, opacity: 1 }}
            viewport={{ once: true, margin: "-120px" }}
            transition={{ type: "spring", stiffness: 80, damping: 14, delay: i * 0.06 }}
            style={{ zIndex: 10 - Math.abs(i - 2) }}
          >
            {c}
          </motion.div>
        ))}
      </div>
      <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {T.box.items.map((it) => (
          <Reveal key={it.t}>
            <div className="rounded-[22px] border border-border p-6">
              <div className="font-serif text-5xl font-bold text-moss">{it.n}</div>
              <div className="mt-1 text-lg font-bold">{it.t}</div>
              <div className="mt-2 text-sm text-text-muted">{it.d}</div>
            </div>
          </Reveal>
        ))}
      </div>
      <div className="mt-8 flex flex-wrap items-center gap-3 rounded-[22px] bg-accent/40 p-5">
        <div className="flex gap-1">
          {(["trava", "ovoce", "voda", "prouti", "bylinky", "hnuj", "vlna", "seno", "kompost", "susene", "krizaly", "pelisek"] as const).map((i) => (
            <ItemIcon key={i} id={i} size={26} />
          ))}
        </div>
        <p className="text-[15px] font-medium">{T.box.first}</p>
      </div>
    </Section>
  );
}

function Impact() {
  return (
    <Section className="bg-surface-alt">
      <div className="grid gap-14 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <Reveal>
            <Kicker>Dopad</Kicker>
            <h2 className="text-4xl font-bold text-moss-deep md:text-6xl">{T.impact.title}</h2>
          </Reveal>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {T.impact.learn.map((l, i) => (
              <Reveal key={l.h} delay={i * 0.06}>
                <div className="h-full rounded-[22px] bg-surface p-5 shadow-soft">
                  <div className="mb-2">{[<WeatherGlyph key={0} icon="slunce" size={34} />, <ItemIcon key={1} id="kompost" size={30} />, <ItemIcon key={2} id="trava" size={30} />, <ItemIcon key={3} id="voda" size={30} />][i]}</div>
                  <h3 className="text-xl font-bold">{l.h}</h3>
                  <p className="mt-1 text-[15px]">{l.t}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <Reveal>
            <img src={`${BASE}prezentace/foto/walk1.webp`} alt="Procházka se zvířaty na Louce" width={1440} height={1918} loading="lazy" className="aspect-[4/3] w-full rounded-[22px] object-cover shadow-soft" />
          </Reveal>
          <div className="grid grid-cols-2 gap-4">
            {T.impact.facts.map((f) => (
              <div key={f.l} className="rounded-[22px] bg-surface p-5 shadow-soft">
                <div className={`font-serif text-4xl font-bold ${f.v === "doplníme" ? "text-text-muted" : "text-moss"}`}>{f.v}</div>
                <div className="mt-1 font-semibold">{f.l}</div>
                <div className="text-sm text-text-muted">{f.n}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}

/** Rozpětí ceny za kus — vodorovné pruhy, osa od nuly. */
function RangeChart() {
  const max = 700;
  const rows = T.plan.scenarios;
  const W = 520;
  const x = (v: number) => 120 + (v / max) * (W - 140);
  return (
    <svg viewBox={`0 0 ${W} ${rows.length * 56 + 40}`} className="w-full" role="img" aria-label="Odhad výrobní ceny za kus podle nákladu">
      {[0, 200, 400, 600].map((t) => (
        <g key={t}>
          <line x1={x(t)} x2={x(t)} y1={10} y2={rows.length * 56 + 14} stroke="#e6e1d3" />
          <text x={x(t)} y={rows.length * 56 + 32} textAnchor="middle" fontSize={12} fill="#5a6660">
            {t} Kč
          </text>
        </g>
      ))}
      {rows.map((r, i) => (
        <g key={r.n} transform={`translate(0 ${20 + i * 56})`}>
          <text x={0} y={18} fontSize={15} fontWeight={700} fill="#1f3d2a" fontFamily="Fraunces, serif">
            {r.n.toLocaleString("cs-CZ")} ks
          </text>
          <rect x={x(r.unit[0])} y={4} width={x(r.unit[1]) - x(r.unit[0])} height={20} rx={10} fill="#2d5a3d" />
          {r.unit[1] > 450 ? (
            <text x={x(r.unit[0]) - 8} y={19} fontSize={13} fill="#2a3530" textAnchor="end">
              {r.unit[0]}–{r.unit[1]} Kč
            </text>
          ) : (
            <text x={x(r.unit[1]) + 8} y={19} fontSize={13} fill="#2a3530">
              {r.unit[0]}–{r.unit[1]} Kč
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

function Plan() {
  return (
    <Section id="vydani">
      <Reveal>
        <Kicker>Vydání</Kicker>
        <h2 className="text-4xl font-bold text-moss-deep md:text-6xl">{T.plan.title}</h2>
        <p className="mt-4 max-w-3xl text-lg">{T.plan.lead}</p>
      </Reveal>
      <div className="mt-12 grid gap-8 lg:grid-cols-[1.2fr_1fr]">
        <div className="overflow-x-auto rounded-[22px] border border-border bg-surface shadow-soft">
          <table className="w-full min-w-[520px] text-left">
            <thead className="bg-surface-alt text-sm">
              <tr>
                <th className="p-4">Náklad</th>
                <th className="p-4">Výroba / kus</th>
                <th className="p-4">Cíl sbírky</th>
                <th className="p-4">Cena hry</th>
              </tr>
            </thead>
            <tbody>
              {T.plan.scenarios.map((s) => (
                <tr key={s.n} className="border-t border-border">
                  <td className="p-4">
                    <div className="font-serif text-2xl font-bold text-moss">{s.n.toLocaleString("cs-CZ")}</div>
                    <div className="text-xs text-text-muted">{s.who}</div>
                  </td>
                  <td className="whitespace-nowrap p-4 font-semibold">
                    {s.unit[0]}–{s.unit[1]} Kč
                  </td>
                  <td className="whitespace-nowrap p-4 font-semibold">
                    {s.goal[0].toLocaleString("cs-CZ")}–{s.goal[1].toLocaleString("cs-CZ")} tis. Kč
                  </td>
                  <td className="whitespace-nowrap p-4">{s.price}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="border-t border-border p-4 text-sm text-text-muted">
            <b>Odhad.</b> {T.plan.note}
          </p>
        </div>
        <div className="flex flex-col gap-4">
          <div className="rounded-[22px] bg-surface p-5 shadow-soft">
            <div className="mb-2 text-sm font-bold uppercase tracking-wider text-text-muted">Výroba za kus (odhad)</div>
            <RangeChart />
          </div>
          <div className="rounded-[22px] bg-accent/40 p-5 text-[15px]">
            <p>{T.plan.fees}</p>
            <p className="mt-2">{T.plan.ce}</p>
          </div>
        </div>
      </div>
      <div className="mt-20">
        <h3 className="text-3xl font-bold text-moss-deep">{T.roadmap.title}</h3>
        <ol className="mt-8 grid gap-4 md:grid-cols-5">
          {T.roadmap.items.map((r, i) => (
            <Reveal key={r.t} delay={i * 0.06}>
              <li className={`h-full rounded-[22px] p-5 ${r.done ? "bg-moss text-cream" : "border border-border bg-surface"}`}>
                <div className={`text-sm font-bold ${r.done ? "text-accent" : "text-terracotta"}`}>{r.d}</div>
                <div className="mt-2 font-semibold leading-snug">{r.t}</div>
                <div className={`mt-3 text-xs uppercase tracking-wider ${r.done ? "opacity-80" : "text-text-muted"}`}>{r.s}</div>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </Section>
  );
}

function Team() {
  return (
    <Section id="kontakt" dark className="overflow-hidden">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <div>
          <Kicker light>Tým</Kicker>
          <h2 className="text-4xl font-bold md:text-6xl">{T.team.title}</h2>
          <p className="mt-4 text-lg opacity-90">{T.team.org}</p>
          <ul className="mt-8 grid gap-3">
            {T.team.people.map((p) => (
              <li key={p.n} className="flex items-baseline gap-3 border-b border-cream/15 pb-3">
                <span className="font-serif text-2xl font-bold">{p.n}</span>
                <span className="opacity-80">{p.r}</span>
              </li>
            ))}
          </ul>
          <div className="mt-10 flex flex-wrap gap-3">
            <a href={`mailto:${T.team.contact}?subject=${encodeURIComponent("Než přijde zima — chci být u toho")}`} className="rounded-full bg-accent px-6 py-4 font-semibold text-ink shadow-lift">
              {T.team.cta}
            </a>
            <a href="https://nechmerust.org" target="_blank" rel="noreferrer" className="rounded-full border-2 border-cream/60 px-6 py-4 font-semibold">
              {T.team.web} ↗
            </a>
          </div>
          <p className="mt-4 text-sm opacity-75">{T.team.contact}</p>
        </div>
        <div className="relative">
          <img src={`${BASE}prezentace/foto/louka19.webp`} alt="Krávy na Louce za podzimního rána" width={1500} height={998} loading="lazy" className="aspect-[4/3] w-full rounded-[22px] object-cover" />
          <div className="absolute -bottom-6 -left-4 rotate-[-5deg]">
            <FactCardView index={23} mode={{ u: 3.2 }} />
          </div>
        </div>
      </div>
    </Section>
  );
}

export function Presentation() {
  return (
    <div className="bg-cream text-ink">
      <a href="#hra" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded focus:bg-surface focus:p-2">
        Přeskočit na obsah
      </a>
      <Nav />
      <main>
        <Hero />
        <Pillars />
        <ScrollStory />
        <Animals />
        <Demo />
        <Box />
        <Impact />
        <Plan />
        <Team />
      </main>
      <footer className="bg-ink px-5 py-8 text-center text-sm text-cream/70">
        <div className="mb-2 flex items-center justify-center gap-1">
          <StarIcon size={14} /> <span className="font-serif text-cream">Než přijde zima</span>
        </div>
        {T.footer}
      </footer>
    </div>
  );
}
