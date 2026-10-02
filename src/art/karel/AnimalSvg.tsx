/** Zvířata z Louka Run jako SVG — jedna komponenta pro všech šest.
 *
 *  Geometrie i barvy se berou z `lib/karel/anatomy.ts`, tedy ze stejných čísel,
 *  jakými je kreslí hra (`drawCharacter` v `js/gfx.js`). Nekreslí se tu nic
 *  „od oka": co je tady navíc proti hře, je **portovatelné do canvasu** —
 *  obrys, odlesk na hřbetě, stín na zemi a tvarovaná ouška. Proto jsou to
 *  oblouky a kvadratické křivky, ne filtry a masky.
 *
 *  Mrkání, stříhání ušima, ocas, chůzi a pózy hlavy řeší třídy z `karel.css`.
 */

import "./karel.css";
import { KarelWear, type KarelWearKind } from "./KarelWear";
import {
  ANIMALS,
  BUILD,
  LEGS,
  PATTERNS,
  shade,
  viewBoxAttr,
  type AnimalColors,
  type AnimalId,
  type Species,
} from "./anatomy";

const rad = (r: number) => (r * 180) / Math.PI;

/** Kruhový oblouk jako `path` — přesný protějšek `ctx.arc()`, takže se dá
 *  do hry opsat beze změny. */
function arcPath(cx: number, cy: number, r: number, a0: number, a1: number) {
  const p = (a: number) => `${(cx + Math.cos(a) * r).toFixed(2)} ${(cy + Math.sin(a) * r).toFixed(2)}`;
  const large = Math.abs(a1 - a0) > Math.PI ? 1 : 0;
  return `M${p(a0)} A${r} ${r} 0 ${large} ${a1 > a0 ? 1 : 0} ${p(a1)}`;
}

/** Ouško osla a muflona: kapka, ne elipsa. Elipsa je tupá na obou koncích
 *  a právě špička dělá z osla osla. */
function earPath(rx: number, ry: number) {
  return `M0 ${ry} C ${-rx} ${ry * 0.55} ${-rx * 0.95} ${-ry * 0.55} 0 ${-ry}
          C ${rx * 0.95} ${-ry * 0.55} ${rx} ${ry * 0.55} 0 ${ry} Z`;
}

function Leg({
  x,
  pair,
  c,
  build,
  fill,
}: {
  x: number;
  pair: "a" | "b";
  c: AnimalColors;
  build: (typeof BUILD)[Species];
  /** Výplň nohy — svislý přechod, ať noha nepůsobí jako tmavá chůda
   *  přilepená k světlejšímu trupu. */
  fill: string;
}) {
  const w = build.legRX * 2;
  return (
    <g className={`karel-leg karel-leg-${pair}`}>
      <rect x={x - build.legRX} y={build.legY} width={w} height={build.legLen} rx={build.legRX} fill={fill} />
      {/* kopýtko a nad ním světlejší hrana — bez ní kopyto splývá s nohou */}
      <rect x={x - 5.5} y={build.legY + build.legLen - 7} width={11} height={8} rx={3} fill={c.hoof} />
      <rect
        x={x - 5}
        y={build.legY + build.legLen - 7}
        width={10}
        height={1.6}
        rx={0.8}
        fill={shade(c.hoof, 0.09)}
      />
    </g>
  );
}

/** Kyčel — kousek stehna, který NEROTUJE a zacelí spáru mezi trupem a nohou.
 *  Bez něj vypadaly nohy jako čtyři samostatné chůdy postavené pod elipsu.
 *  Kreslí se ve stejném pořadí jako noha, takže vzdálený pár zůstává vzadu. */
function Hip({ x, c, build, far }: { x: number; c: AnimalColors; build: (typeof BUILD)[Species]; far: boolean }) {
  const base = c.legs ?? c.body;
  return (
    <ellipse
      cx={x}
      cy={build.legY + 1}
      rx={build.legRX + 2.2}
      ry={7}
      fill={far ? shade(base, -0.08) : base}
    />
  );
}

export function AnimalSvg({
  id,
  className,
  wear,
  /** Stín na zemi. Vypíná se tam, kde postava nestojí na ploše (letáčky, ikony). */
  shadow = true,
}: {
  id: AnimalId;
  className?: string;
  wear?: KarelWearKind;
  shadow?: boolean;
}) {
  const a = ANIMALS[id];
  const c = a.colors;
  const s: Species = a.species;
  const b = BUILD[s];
  const gid = `anml-${id}`;
  /** Obrys. Nízký kontrast schválně: má oddělit tvary, ne obkreslit omalovánku. */
  const line = shade(c.body, -0.16);
  const legBase = c.legs ?? c.body;

  return (
    <svg viewBox={viewBoxAttr} className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${gid}-body`} gradientUnits="userSpaceOnUse" x1="0" y1={b.bodyY - b.bodyRY - 2} x2="0" y2={b.bodyY + b.bodyRY + 2}>
          <stop offset="0" stopColor={shade(c.body, 0.07)} />
          <stop offset="1" stopColor={shade(c.body, -0.07)} />
        </linearGradient>
        <linearGradient id={`${gid}-leg`} gradientUnits="userSpaceOnUse" x1="0" y1={BUILD[s].legY} x2="0" y2={BUILD[s].legY + BUILD[s].legLen}>
          <stop offset="0" stopColor={shade(legBase, 0.06)} />
          <stop offset="1" stopColor={shade(legBase, -0.05)} />
        </linearGradient>
        <linearGradient id={`${gid}-leg-far`} gradientUnits="userSpaceOnUse" x1="0" y1={BUILD[s].legY} x2="0" y2={BUILD[s].legY + BUILD[s].legLen}>
          <stop offset="0" stopColor={shade(legBase, -0.03)} />
          <stop offset="1" stopColor={shade(legBase, -0.12)} />
        </linearGradient>
        <radialGradient id={`${gid}-belly`}>
          <stop offset="0" stopColor={c.belly} stopOpacity="1" />
          <stop offset="0.62" stopColor={c.belly} stopOpacity="0.92" />
          <stop offset="1" stopColor={c.belly} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${gid}-shadow`}>
          <stop offset="0" stopColor="#2f2a24" stopOpacity="0.32" />
          <stop offset="1" stopColor="#2f2a24" stopOpacity="0" />
        </radialGradient>
        <clipPath id={`${gid}-body-clip`}>
          <ellipse cx={0} cy={b.bodyY} rx={b.bodyRX} ry={b.bodyRY} />
        </clipPath>
      </defs>

      {/* --- stín na zemi --- kopyta stojí na y = +9 */}
      {shadow ? <ellipse cx={4} cy={10} rx={b.bodyRX + 6} ry={7} fill={`url(#${gid}-shadow)`} /> : null}

      {/* --- vzdálený pár nohou (za tělem) --- */}
      {LEGS.filter((l) => l.far).map((l, i) => (
        <g key={i}>
          <Hip x={l.x} c={c} build={b} far />
          <Leg x={l.x} pair={i === 0 ? "a" : "b"} c={c} build={b} fill={`url(#${gid}-leg-far)`} />
        </g>
      ))}

      {/* --- ocas --- */}
      <g className="karel-tail">
        <g transform={`translate(${b.tail[0]} ${b.tail[1]}) rotate(${rad(0.5)})`}>
          {s === "prase" ? (
            <path
              d={`${arcPath(0, -4, 5, 0, Math.PI * 1.5)} ${arcPath(4, -10, 4, Math.PI, Math.PI * 2.6)}`}
              stroke={c.body}
              strokeWidth="5"
              fill="none"
              strokeLinecap="round"
            />
          ) : s === "ovce" ? (
            <circle cx={0} cy={0} r={8} fill={c.mane} />
          ) : (
            <>
              <path d="M0 -6 Q-10 8 -6 22" stroke={c.body} strokeWidth="6" fill="none" strokeLinecap="round" />
              <ellipse cx={-6} cy={24} rx={6} ry={9} fill={c.mane} transform={`rotate(${rad(-0.2)} -6 24)`} />
            </>
          )}
        </g>
      </g>

      {/* --- trup --- */}
      <ellipse cx={0} cy={b.bodyY} rx={b.bodyRX} ry={b.bodyRY} fill={`url(#${gid}-body)`} />
      {/* bříško se do trupu vpíjí, nesedí na něm jako záplata */}
      <ellipse cx={b.belly[0]} cy={b.belly[1]} rx={b.belly[2]} ry={b.belly[3]} fill={`url(#${gid}-belly)`} />

      {/* fleky srsti — oříznuté na trup, ať nikam nepřečuhují */}
      {c.pattern && c.spots ? (
        <g clipPath={`url(#${gid}-body-clip)`} fill={c.spots}>
          {PATTERNS[c.pattern].map((sp, i) => (
            <ellipse key={i} cx={sp.x} cy={sp.y} rx={sp.rx} ry={sp.ry} transform={`rotate(${rad(sp.rot)} ${sp.x} ${sp.y})`} />
          ))}
        </g>
      ) : null}

      {/* odlesk na hřbetě — jediná věc, která z ploché elipsy udělá objem */}
      <path
        d={`M${-b.bodyRX * 0.74} ${b.bodyY - b.bodyRY * 0.5} Q0 ${b.bodyY - b.bodyRY * 1.12} ${b.bodyRX * 0.68} ${b.bodyY - b.bodyRY * 0.56}`}
        stroke={shade(c.body, 0.13)}
        strokeWidth="3.4"
        strokeLinecap="round"
        fill="none"
        opacity="0.55"
        clipPath={`url(#${gid}-body-clip)`}
      />
      <ellipse cx={0} cy={b.bodyY} rx={b.bodyRX} ry={b.bodyRY} fill="none" stroke={line} strokeWidth="1.2" opacity="0.45" />

      {/* Vlna až NAD obrysem a odleskem. Kdyby se kreslila dřív, vedla by
          přes ni šedá elipsa obrysu — u ovce je vlna sama siluetou. */}
      {s === "ovce" ? (
        <g>
          {Array.from({ length: 10 }, (_, i) => {
            const ang = (i / 10) * Math.PI * 2;
            return (
              <circle
                key={i}
                cx={Math.cos(ang) * 36}
                cy={-40 + Math.sin(ang) * 19}
                r={13}
                fill={i % 2 ? shade(c.body, 0.04) : shade(c.body, -0.03)}
              />
            );
          })}
        </g>
      ) : null}

      {/* oslí hříva podél hřbetu — s vroubky, ne hladká elipsa */}
      {s === "osel" ? (
        <g transform={`rotate(${rad(-0.05)} 6 ${b.bodyY - b.bodyRY + 3})`} fill={c.mane}>
          <ellipse cx={6} cy={b.bodyY - b.bodyRY + 3} rx={26} ry={5.5} />
          {[-16, -8, 0, 8, 16].map((dx) => (
            <path
              key={dx}
              d={`M${6 + dx - 3.4} ${b.bodyY - b.bodyRY + 2} Q${6 + dx} ${b.bodyY - b.bodyRY - 5.5} ${6 + dx + 3.4} ${b.bodyY - b.bodyRY + 2} Z`}
            />
          ))}
        </g>
      ) : null}

      {/* --- bližší pár nohou (přes tělo) --- */}
      {LEGS.filter((l) => !l.far).map((l, i) => (
        <g key={i}>
          <Hip x={l.x} c={c} build={b} far={false} />
          <Leg x={l.x} pair={i === 0 ? "b" : "a"} c={c} build={b} fill={`url(#${gid}-leg)`} />
        </g>
      ))}

      {/* --- krk a hlava ---
          Vnější `g` drží statické posazení, vnitřní nese třídu, kterou animuje
          CSS: `transform` z CSS by atribut `transform` přebil, takže nesmí
          sedět na témže prvku. */}
      <g transform={`translate(${b.head[0]} ${b.head[1]})`}>
        <g className="karel-head">
          {b.neck ? (
            <ellipse
              cx={b.neck[0]}
              cy={b.neck[1]}
              rx={b.neck[2]}
              ry={b.neck[3]}
              fill={c.body}
              transform={`rotate(${rad(b.neck[4])} ${b.neck[0]} ${b.neck[1]})`}
            />
          ) : null}
          {s === "osel" ? (
            <ellipse cx={-14} cy={0} rx={8} ry={18} fill={c.mane} transform={`rotate(${rad(0.5)} -14 0)`} />
          ) : null}

          <ellipse
            cx={6}
            cy={-6}
            rx={18}
            ry={15}
            fill={s === "ovce" ? c.muzzle : c.body}
            transform={`rotate(${rad(0.15)} 6 -6)`}
          />
          {/* odlesk na čele */}
          <path
            d="M-5 -14 Q6 -22 17 -13"
            stroke={shade(s === "ovce" ? c.muzzle : c.body, 0.12)}
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
            opacity="0.5"
          />

          {s === "ovce" ? (
            <g fill={c.body}>
              <circle cx={-4} cy={-16} r={9} />
              <circle cx={5} cy={-19} r={8} />
              <circle cx={13} cy={-15} r={7} />
            </g>
          ) : null}

          {/* čumák / rypáček */}
          {s === "prase" ? (
            <g>
              {c.spots ? <ellipse cx={-3} cy={-13} rx={6} ry={5} fill={c.spots} transform={`rotate(${rad(0.3)} -3 -13)`} /> : null}
              <ellipse cx={22} cy={-4} rx={8} ry={7} fill={c.muzzle} />
              <ellipse cx={22} cy={-4} rx={8} ry={7} fill="none" stroke={shade(c.muzzle, -0.12)} strokeWidth="1.1" />
              <ellipse cx={24} cy={-4} rx={2.2} ry={3} fill={shade(c.muzzle, -0.15)} />
              <ellipse cx={19} cy={-4} rx={2.2} ry={3} fill={shade(c.muzzle, -0.15)} />
            </g>
          ) : (
            <g>
              <ellipse cx={16} cy={-1} rx={11} ry={9} fill={c.muzzle} transform={`rotate(${rad(0.15)} 16 -1)`} />
              {/* stín tam, kde čumák dosedá na hlavu */}
              <path
                d="M7 -7 Q9 2 13 7"
                stroke={shade(c.muzzle, -0.1)}
                strokeWidth="2.2"
                strokeLinecap="round"
                fill="none"
                opacity="0.6"
              />
              <ellipse cx={20} cy={-4} rx={2} ry={2.6} fill={shade(c.muzzle, -0.25)} transform={`rotate(${rad(0.3)} 20 -4)`} />
              {s === "kráva" ? (
                <ellipse cx={14} cy={-3} rx={2} ry={2.6} fill={shade(c.muzzle, -0.25)} transform={`rotate(${rad(0.1)} 14 -3)`} />
              ) : null}
            </g>
          )}

          {/* pusa — úsměv */}
          <path d={arcPath(16, 1, 5, 0.2, Math.PI * 0.7)} stroke={shade(c.muzzle, -0.35)} strokeWidth="1.8" fill="none" strokeLinecap="round" />

          {/* oko */}
          {c.eyePatch ? <ellipse cx={6} cy={-10} rx={7.5} ry={9} fill={c.eyePatch} transform={`rotate(${rad(0.1)} 6 -10)`} /> : null}
          {c.eyeRing ? <ellipse cx={6} cy={-10} rx={6.5} ry={7.5} fill={c.eyeRing} /> : null}
          <ellipse cx={6} cy={-10} rx={3.2} ry={4} fill="#2d2620" />
          <circle cx={7} cy={-11.5} r={1.3} fill="#ffffff" />
          <circle cx={4.9} cy={-8.2} r={0.7} fill="#ffffff" opacity="0.55" />
          <g transform="translate(6 -10)">
            <ellipse className="karel-eyelid" rx={c.eyeRing ? 6.7 : 4.7} ry={c.eyeRing ? 7.7 : 4.4} fill={c.eyePatch || (s === "ovce" ? c.muzzle : c.body)} />
          </g>

          {/* uši / rohy */}
          {s === "osel" ? (
            [
              { dx: -2, rot: -0.35, cls: "karel-ear-l" },
              { dx: 6, rot: 0.25, cls: "karel-ear-r" },
            ].map((e) => (
              <g key={e.cls} transform={`translate(${e.dx} -16) rotate(${rad(e.rot)})`}>
                <g className={e.cls}>
                  <path d={earPath(6, 17)} transform="translate(0 -16)" fill={c.ear} />
                  <path d={earPath(3, 11)} transform="translate(0 -14)" fill={c.earIn} />
                </g>
              </g>
            ))
          ) : s === "muflon" ? (
            <g>
              <g transform="translate(-2 -13)">
                <path d={arcPath(-4, -2, 12, -0.4, Math.PI * 1.25)} stroke={shade(c.horns ?? "#c7ad85", -0.14)} strokeWidth="11" fill="none" strokeLinecap="round" />
                <path d={arcPath(-4, -2, 12, -0.4, Math.PI * 1.25)} stroke={c.horns} strokeWidth="8.5" fill="none" strokeLinecap="round" />
                {/* příčné hřebeny — podle nich se rohu věří, že je z rohoviny */}
                {[0.05, 0.42, 0.79, 1.16, 1.53, 1.9, 2.27].map((a, i) => (
                  <path
                    key={i}
                    d={`M${(-4 + Math.cos(a) * 7.6).toFixed(2)} ${(-2 + Math.sin(a) * 7.6).toFixed(2)} L${(-4 + Math.cos(a) * 16).toFixed(2)} ${(-2 + Math.sin(a) * 16).toFixed(2)}`}
                    stroke={shade(c.horns ?? "#c7ad85", -0.1)}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    opacity="0.75"
                  />
                ))}
                <path d={arcPath(-4, -2, 14.6, 0, Math.PI * 1.1)} stroke={shade(c.horns ?? "#c7ad85", 0.09)} strokeWidth="1.8" fill="none" strokeLinecap="round" opacity="0.8" />
              </g>
              <ellipse cx={-8} cy={-10} rx={6} ry={4} fill={c.ear} transform={`rotate(${rad(-0.4)} -8 -10)`} />
            </g>
          ) : s === "kráva" ? (
            <g>
              {!c.noHorns ? (
                <g transform="translate(0 -16)" stroke="#e8dcc8" strokeWidth="5" fill="none" strokeLinecap="round">
                  <path d="M-4 0 Q-9 -8 -6 -12" />
                  <path d="M8 -1 Q13 -9 10 -13" />
                </g>
              ) : null}
              <g fill={c.forelock || shade(c.body, 0.04)}>
                <ellipse cx={2} cy={-16} rx={8} ry={5} />
                {c.forelock ? (
                  <>
                    <ellipse cx={-3} cy={-13} rx={3} ry={4.5} transform={`rotate(${rad(-0.3)} -3 -13)`} />
                    <ellipse cx={3} cy={-12.5} rx={3} ry={5} transform={`rotate(${rad(0.1)} 3 -12.5)`} />
                    <ellipse cx={8} cy={-13} rx={2.6} ry={4} transform={`rotate(${rad(0.4)} 8 -13)`} />
                  </>
                ) : null}
              </g>
              <g className="karel-ear-l">
                <ellipse cx={-10} cy={-12} rx={8} ry={5} fill={c.ear} transform={`rotate(${rad(-0.5)} -10 -12)`} />
                <ellipse cx={-11} cy={-12} rx={4} ry={2.6} fill={c.earIn} transform={`rotate(${rad(-0.5)} -11 -12)`} />
              </g>
            </g>
          ) : s === "ovce" ? (
            <g fill={c.ear}>
              <ellipse className="karel-ear-l" cx={-8} cy={-10} rx={7} ry={4} transform={`rotate(${rad(-0.6)} -8 -10)`} />
              <ellipse className="karel-ear-r" cx={14} cy={-13} rx={6} ry={3.6} transform={`rotate(${rad(0.5)} 14 -13)`} />
            </g>
          ) : (
            [
              { dx: -2, rot: -0.5, cls: "karel-ear-l" },
              { dx: 10, rot: 0.3, cls: "karel-ear-r" },
            ].map((e) => (
              <g key={e.cls} transform={`translate(${e.dx} -14) rotate(${rad(e.rot)})`}>
                <g className={e.cls}>
                  <path d="M-6 2 L6 2 L0 -12 Z" fill={c.ear} />
                  <path d="M-3 1 L3 1 L0 -7 Z" fill={c.earIn} />
                </g>
              </g>
            ))
          )}

          {/* ozdoba ze šatníku až nakonec, ať klobouk sedí na hlavě a ne pod ní */}
          {wear ? <KarelWear kind={wear} /> : null}
        </g>
      </g>
    </svg>
  );
}
