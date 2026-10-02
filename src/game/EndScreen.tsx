import { motion } from "motion/react";
import { ANIMAL_DEFS } from "@data/animals";
import { FACTS } from "@data/cards/facts";
import { TIER_TEXT } from "@data/rules";
import { FactCardView } from "@art/cards/Cards";
import { StarIcon } from "@art/icons/Icons";
import { AnimalSvg } from "@art/karel/AnimalSvg";
import type { GameState } from "@engine/types";
import { Btn } from "./ui/Btn";
import type { Setup } from "./session";

export function EndScreen({ s, onAgain, onTitle }: { s: GameState; setup: Setup; onAgain: () => void; onTitle: () => void }) {
  const r = s.result!;
  const tier = TIER_TEXT[r.tier];
  const fact = Math.abs(s.totalRound * 7 + r.stars) % FACTS.length;
  const bg = r.tier === "hojna" ? "from-[#f6ead0] to-[#e6efe4]" : r.tier === "dobra" ? "from-[#f3ecdc] to-[#e8eef2]" : "from-[#eef0f2] to-[#f3ecdc]";
  return (
    <div className={`min-h-dvh bg-gradient-to-b ${bg} px-4 py-8`}>
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-6">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center">
          <div className="text-sm font-bold uppercase tracking-[0.2em] text-moss-muted">Zima je tady</div>
          <h1 className="mt-2 text-5xl font-bold text-moss-deep md:text-6xl">{tier.name}</h1>
          <div className="mt-3 flex items-center justify-center gap-2 text-3xl font-bold">
            {r.stars} <StarIcon size={34} />
          </div>
          <p className="mx-auto mt-3 max-w-xl font-serif text-xl italic text-text">{tier.flavor}</p>
        </motion.div>

        <div className="flex flex-wrap items-end justify-center gap-2">
          {s.seat.map((id, i) => (
            <motion.div key={id} initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 + i * 0.12 }} className="flex flex-col items-center">
              <div className="h-24 w-28">
                <AnimalSvg id={id} wear={r.tier === "hubena" ? "winter" : r.tier === "hojna" ? "crown" : "hat"} className="h-full w-full" />
              </div>
              <div className="text-sm font-semibold">{ANIMAL_DEFS[id].name}</div>
            </motion.div>
          ))}
        </div>

        <div className="grid w-full gap-6 md:grid-cols-[1fr_auto]">
          <section className="rounded-[22px] bg-surface p-5 shadow-soft">
            <h2 className="mb-3 text-2xl font-bold text-moss-deep">Jak jsme na tom</h2>
            <ul className="divide-y divide-border">
              {r.lines.map((l, i) => (
                <li key={i} className="flex items-center justify-between py-2">
                  <span>{l.label}</span>
                  <span className={`font-bold tabular-nums ${l.stars < 0 ? "text-terracotta" : l.stars ? "text-moss" : "text-text-muted"}`}>
                    {l.stars > 0 ? "+" : ""}
                    {l.stars} ★
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-text-muted">
              Splněné Potřeby: {s.stats.needsDone} · společné úkoly: {s.stats.joint} · odemčené schopnosti: {s.stats.unlocks} · zmoklé seno: {s.stats.soaked}
            </p>
          </section>
          <div className="flex flex-col items-center gap-2">
            <FactCardView index={fact} mode={{ u: 4.4 }} />
            <span className="text-sm text-text-muted">Věděli jste?</span>
          </div>
        </div>

        <section className="w-full rounded-[22px] bg-moss p-5 text-cream shadow-soft">
          <h2 className="text-xl font-bold">Hra je o skutečné Louce</h2>
          <p className="mt-1 opacity-90">Karel, Pogo, Avala, Květa, Flíček a Yakul opravdu žijí v azylu Nech mě růst ve Vlkanči. Seno na zimu tam taky opravdu chystáme.</p>
          <a className="mt-3 inline-block font-semibold text-accent underline" href="https://nechmerust.org" target="_blank" rel="noreferrer">
            nechmerust.org →
          </a>
        </section>

        <div className="flex flex-wrap justify-center gap-3">
          <Btn tone="primary" big onClick={onAgain}>
            Hrát znovu
          </Btn>
          <Btn big onClick={onTitle}>
            Do menu
          </Btn>
        </div>
      </div>
    </div>
  );
}
