/** Ozdoby ze šatníku hry Louka Run.
 *
 *  Překlad `drawWear` z `js/gfx.js` (repozitář `TGeeeeq/loukarun`) do SVG,
 *  posazený podle řádku `osel` v tabulce `WEAR_AT`. Kreslí se **v souřadnicích
 *  hlavy** — střed hlavy je kolem [6, −6], oko na [6, −10], uši kolem y = −16
 *  a čumák míří do +x — takže komponenta patří dovnitř skupiny `.karel-head`
 *  v `KarelSvg` a s hlavou se hýbe.
 *
 *  Proč to stojí za to: ozdoby se v hře kupují za mince a Karel v nich na webu
 *  je ta nejtišší možná upoutávka na sbírku. Ozdoba se proto váže na hlášku,
 *  ne na náhodu — náhodné střídání vypadá jako porucha, vázané jako pointa.
 */

/** Klíče odpovídají `id` v tabulce `ITEMS` v `js/data.js`. */
export type KarelWearKind = "hat" | "cap" | "bell" | "shades" | "bowtie" | "winter" | "crown";

/** Řádek `osel` z `WEAR_AT` — kam se která ozdoba v souřadnicích hlavy posadí. */
const AT: Record<KarelWearKind, [number, number]> = {
  hat: [4, -26],
  cap: [4, -25],
  winter: [4, -26],
  crown: [4, -25],
  shades: [6, -10.5],
  bell: [-3, 11],
  bowtie: [-2, 10],
};

/** Karlův slaměný klobouk — trofej za jeho tři osobní úkoly. */
function Hat() {
  return (
    <>
      <ellipse rx={21} ry={5.5} fill="#e8c579" />
      <ellipse cy={-7} rx={11} ry={8} fill="#f2d694" />
      <rect x={-11} y={-4.5} width={22} height={3.5} fill="#b8703a" />
      <path d="M-16 0.5 H16" stroke="#d0a755" strokeWidth="1" fill="none" />
    </>
  );
}

/** Kšiltovka — kšilt míří dopředu (+x), dozadu ji nikdo z nich nenosí. */
function Cap() {
  return (
    <>
      <path d="M16 0.4 A10 3.4 0 0 1 -4 0.4 Z" fill="#c8443a" />
      <path d="M-11.5 0.6 A11.5 9 0 0 1 11.5 0.6 Z" fill="#e2564a" />
      <circle cy={-8.4} r={1.7} fill="#f7f2e6" />
      <rect x={-11.5} y={-0.6} width={23} height={1.6} fill="rgba(0,0,0,0.16)" />
    </>
  );
}

function Winter() {
  return (
    <>
      <path d="M-11 1.2 A11 10.5 0 0 1 11 1.2 Z" fill="#3f7fb0" />
      <circle cy={-12.8} r={3.6} fill="#f7f4ea" />
      <ellipse cy={1} rx={12.5} ry={3.4} fill="#f3ede0" />
      <ellipse cy={2.4} rx={12.5} ry={2} fill="rgba(0,0,0,0.08)" />
    </>
  );
}

function Crown() {
  return (
    <>
      <path d="M-10 2.4 V-6 L-5 -1.4 L0 -8.4 L5 -1.4 L10 -6 V2.4 Z" fill="#f0c33c" />
      <rect x={-10} y={0.2} width={20} height={2.6} fill="#d9a521" />
      <circle cy={-6.4} r={1.5} fill="#e0567f" />
      <circle cx={-7.4} cy={-4.2} r={1.5} fill="#5aa9e6" />
      <circle cx={7.4} cy={-4.2} r={1.5} fill="#7ac95e" />
    </>
  );
}

/** Postava je z profilu, takže čočka je jedna a nožička mizí pod uchem. */
function Shades() {
  return (
    <>
      <rect x={5.2} y={-1.9} width={5.6} height={1.9} fill="#2b2f36" />
      <ellipse rx={6.2} ry={4.8} fill="#2b2f36" transform="rotate(6.876)" />
      <ellipse cx={-1.8} cy={-1.7} rx={2.2} ry={1.3} fill="rgba(255,255,255,0.32)" transform="rotate(17.189 -1.8 -1.7)" />
      <path d="M-5.4 -1.2 L-13 -3.4" stroke="#2b2f36" strokeWidth="1.7" fill="none" strokeLinecap="round" />
    </>
  );
}

/** Obojek leží NAPŘÍČ krkem, rolnička visí na jeho předním, nejnižším konci —
 *  kdyby padala od středu, vypadá to, že se vedle pásku vznáší zvlášť. */
function Bell() {
  return (
    <>
      <path d="M-9 -5 L7 4" stroke="#8b4a2f" strokeWidth="4.4" fill="none" strokeLinecap="round" />
      <path d="M-8.5 -6.2 L6.5 2.8" stroke="rgba(255,255,255,0.18)" strokeWidth="1.2" fill="none" />
      <circle cx={7.4} cy={7.8} r={3.9} fill="#eec24a" />
      <rect x={5.6} y={9} width={3.6} height={1.7} fill="#c8992c" />
      <circle cx={6.2} cy={6.3} r={1.2} fill="rgba(255,255,255,0.55)" />
    </>
  );
}

function Bowtie() {
  return (
    <>
      <ellipse cx={-4.6} cy={-1.2} rx={4.8} ry={3.4} fill="#c8443a" transform="rotate(-20.054 -4.6 -1.2)" />
      <ellipse cx={4.6} cy={1.2} rx={4.8} ry={3.4} fill="#c8443a" transform="rotate(-20.054 4.6 1.2)" />
      <ellipse rx={2.4} ry={2.9} fill="#9e3229" transform="rotate(-20.054)" />
    </>
  );
}

const SHAPES: Record<KarelWearKind, () => React.JSX.Element> = {
  hat: Hat,
  cap: Cap,
  winter: Winter,
  crown: Crown,
  shades: Shades,
  bell: Bell,
  bowtie: Bowtie,
};

export function KarelWear({ kind }: { kind: KarelWearKind }) {
  const Shape = SHAPES[kind];
  const [x, y] = AT[kind];
  return (
    <g transform={`translate(${x} ${y})`}>
      <Shape />
    </g>
  );
}
