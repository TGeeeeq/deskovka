import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ANIMAL_DEFS, ANIMAL_IDS } from "@data/animals";
import { DIFFICULTIES, type DifficultyId, type StormTime } from "@data/rules";
import type { AnimalId } from "@data/types";
import { AnimalSvg } from "@art/karel/AnimalSvg";
import { Marker } from "@art/icons/Icons";
import type { Action } from "@engine/types";
import { unlockAudioOnce } from "./audio";
import { GameScreen } from "./GameScreen";
import { clearSaved, importGame, loadSaved, type Setup } from "./session";
import { Btn } from "./ui/Btn";

type Screen = { k: "menu" } | { k: "setup" } | { k: "game"; setup: Setup; resume?: Action[]; id: number };

export function App() {
  const [screen, setScreen] = useState<Screen>({ k: "menu" });
  const [saved, setSaved] = useState(() => loadSaved());

  useEffect(() => {
    unlockAudioOnce();
    const m = location.hash.match(/^#hra=(.+)$/);
    if (m)
      void importGame(m[1]).then((g) => {
        if (g) setScreen({ k: "game", setup: { cfg: g.cfg, bots: g.bots ?? [] }, resume: g.actions, id: Date.now() });
        history.replaceState(null, "", location.pathname);
      });
  }, []);

  if (screen.k === "game")
    return (
      <GameScreen
        key={screen.id}
        setup={screen.setup}
        resume={screen.resume}
        onExit={() => setScreen({ k: "setup" })}
        onTitle={() => {
          setSaved(loadSaved());
          setScreen({ k: "menu" });
        }}
      />
    );
  if (screen.k === "setup") return <SetupScreen onBack={() => setScreen({ k: "menu" })} onStart={(setup) => setScreen({ k: "game", setup, id: Date.now() })} />;
  return (
    <Menu
      saved={!!saved}
      onContinue={() => saved && setScreen({ k: "game", setup: { cfg: saved.cfg, bots: saved.bots ?? [] }, resume: saved.actions, id: Date.now() })}
      onNew={() => setScreen({ k: "setup" })}
      onDemo={() =>
        setScreen({
          k: "game",
          id: Date.now(),
          setup: { cfg: { animals: ["karel", "pogo", "flicek", "yakul"], difficulty: "normalni", storm: true, stormTime: 60, expert: false, seed: `demo-${Date.now()}` }, bots: ["karel", "pogo", "flicek", "yakul"] },
        })
      }
    />
  );
}

function Menu({ saved, onContinue, onNew, onDemo }: { saved: boolean; onContinue: () => void; onNew: () => void; onDemo: () => void }) {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-[radial-gradient(ellipse_at_50%_30%,#f6ebcd_0%,#ead7a4_70%,#d9c08a_100%)]">
      <div className="mx-auto flex min-h-dvh max-w-5xl flex-col items-center justify-center gap-8 px-4 py-10 text-center">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="text-sm font-bold uppercase tracking-[0.28em] text-moss-muted">Kooperativní hra z Louky</div>
          <h1 className="mt-3 text-6xl font-bold leading-none text-moss-deep md:text-8xl">Než přijde zima</h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-text">Šest skutečných zvířat z azylu Nech mě růst chystá seno, pelíšky a bylinky. Protivník je jen počasí. Hrajete všichni spolu.</p>
        </motion.div>
        <div className="flex flex-wrap items-end justify-center gap-1 md:gap-3" aria-hidden>
          {ANIMAL_IDS.map((id, i) => (
            <motion.div key={id} initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 + i * 0.1, type: "spring", stiffness: 140 }} className="h-20 w-24 md:h-28 md:w-32">
              <AnimalSvg id={id} className="h-full w-full karel-bob" />
            </motion.div>
          ))}
        </div>
        <div className="flex w-full max-w-sm flex-col gap-3">
          {saved ? (
            <Btn tone="primary" big onClick={onContinue}>
              Pokračovat v rozehrané hře
            </Btn>
          ) : null}
          <Btn tone={saved ? "secondary" : "primary"} big onClick={onNew}>
            Nová hra
          </Btn>
          <Btn big onClick={onDemo}>
            Podívat se, jak hrají boti
          </Btn>
          <div className="mt-2 flex justify-center gap-4 text-sm font-semibold text-moss">
            <a href="prezentace/" className="underline">
              O projektu
            </a>
            <a href="tisk/" className="underline">
              Tisková verze
            </a>
          </div>
        </div>
        <p className="text-xs text-text-muted">Prototyp v0.1 · Nech mě růst z.s. · hra se ukládá jen v tomto zařízení</p>
      </div>
    </div>
  );
}

function SetupScreen({ onBack, onStart }: { onBack: () => void; onStart: (s: Setup) => void }) {
  const [picked, setPicked] = useState<AnimalId[]>(["karel", "pogo", "avala", "flicek"]);
  const [bots, setBots] = useState<AnimalId[]>([]);
  const [humans, setHumans] = useState(4);
  const [difficulty, setDifficulty] = useState<DifficultyId>("normalni");
  const [storm, setStorm] = useState(true);
  const [stormTime, setStormTime] = useState<StormTime>(60);
  const [expert, setExpert] = useState(false);

  const toggle = (id: AnimalId) => {
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= 4 ? p : [...p, id]));
    setBots((b) => b.filter((x) => x !== id));
  };
  const ok = picked.length >= 2 && picked.length <= 4;

  return (
    <div className="min-h-dvh bg-cream px-4 py-6">
      <div className="mx-auto max-w-5xl">
        <button className="text-sm font-semibold text-moss underline" onClick={onBack}>
          ← Zpět
        </button>
        <h1 className="mt-2 text-4xl font-bold text-moss-deep">Kdo jde na Louku?</h1>
        <p className="mt-1 text-text-muted">Vyber 2–4 zvířata. Sólo hráč ovládá dvě. Každé zvíře může hrát člověk, nebo bot.</p>

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3">
          {ANIMAL_IDS.map((id) => {
            const d = ANIMAL_DEFS[id];
            const on = picked.includes(id);
            return (
              <div key={id} className={`rounded-[22px] border-2 p-3 transition ${on ? "border-moss bg-surface shadow-soft" : "border-transparent bg-surface-alt opacity-80"}`}>
                <button className="w-full text-left" onClick={() => toggle(id)} aria-pressed={on}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Marker id={id} size={26} />
                      <span className="text-xl font-bold">{d.name}</span>
                    </div>
                    <span className="text-sm text-text-muted">{d.species}</span>
                  </div>
                  <div className="mt-1 h-20">
                    <AnimalSvg id={id} className="h-full w-full" />
                  </div>
                  <div className="mt-1 text-sm font-semibold text-moss">{d.power.name}</div>
                  <div className="text-sm leading-snug">{d.power.text}</div>
                </button>
                {on ? (
                  <div className="mt-2 flex gap-1 rounded-full bg-surface-alt p-1 text-sm font-semibold">
                    {(["člověk", "bot"] as const).map((k) => {
                      const isBot = bots.includes(id);
                      const active = (k === "bot") === isBot;
                      return (
                        <button key={k} className={`min-h-9 flex-1 rounded-full ${active ? "bg-moss text-cream" : ""}`} onClick={() => setBots((b) => (k === "bot" ? [...b.filter((x) => x !== id), id] : b.filter((x) => x !== id)))}>
                          {k}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <fieldset className="rounded-[22px] bg-surface p-4 shadow-soft">
            <legend className="px-1 font-bold">Obtížnost</legend>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(DIFFICULTIES) as DifficultyId[]).map((d) => (
                <button key={d} className={`min-h-12 rounded-[14px] border font-semibold ${difficulty === d ? "border-moss bg-moss text-cream" : "border-border"}`} onClick={() => setDifficulty(d)}>
                  {DIFFICULTIES[d].name}
                </button>
              ))}
            </div>
            <label className="mt-3 flex items-center justify-between gap-2">
              <span>Kolik vás u stolu sedí?</span>
              <select className="min-h-11 rounded-[10px] border border-border px-2" value={humans} onChange={(e) => setHumans(+e.target.value)}>
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            {humans === 1 ? <p className="mt-1 text-sm text-text-muted">Sólo: každé zvíře začíná se srdíčkem.</p> : null}
          </fieldset>
          <fieldset className="rounded-[22px] bg-surface p-4 shadow-soft">
            <legend className="px-1 font-bold">Moduly</legend>
            <label className="flex min-h-11 items-center gap-3">
              <input type="checkbox" className="h-5 w-5 accent-[#2d5a3d]" checked={storm} onChange={(e) => setStorm(e.target.checked)} />
              <span>
                <b>Bouřkový modul</b> — při bouřce se hraje naráz a mluví se jen zvířecími zvuky
              </span>
            </label>
            {storm ? (
              <div className="ml-8 flex gap-2">
                {([60, 90, 0] as StormTime[]).map((t) => (
                  <button key={t} className={`min-h-10 rounded-full border px-3 text-sm font-semibold ${stormTime === t ? "border-moss bg-moss text-cream" : "border-border"}`} onClick={() => setStormTime(t)}>
                    {t ? `${t} s` : "bez času"}
                  </button>
                ))}
              </div>
            ) : null}
            <label className="mt-2 flex min-h-11 items-center gap-3">
              <input type="checkbox" className="h-5 w-5 accent-[#2d5a3d]" checked={expert} onChange={(e) => setExpert(e.target.checked)} />
              <span>
                <b>Expertní modul</b> — vyčerpání stanic, pásové sečení, hnojení
              </span>
            </label>
          </fieldset>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Btn
            tone="primary"
            big
            disabled={!ok}
            onClick={() => {
              clearSaved();
              onStart({ cfg: { animals: picked, difficulty, storm, stormTime, expert, humans, seed: `${Date.now().toString(36)}-${Math.floor(performance.now())}` }, bots });
            }}
          >
            Jdeme na Louku →
          </Btn>
          {!ok ? <span className="text-sm text-terracotta">Vyber 2 až 4 zvířata.</span> : null}
        </div>
      </div>
    </div>
  );
}
