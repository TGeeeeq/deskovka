export type AnimalId = "karel" | "pogo" | "avala" | "flicek" | "yakul" | "kveta";

export type ResourceId = "trava" | "ovoce" | "voda" | "prouti" | "bylinky" | "hnuj" | "vlna";
export type ProductId = "seno" | "kompost" | "susene" | "krizaly" | "pelisek";
export type ItemId = ResourceId | ProductId;
export type Bag = Partial<Record<ItemId, number>>;

export type SeasonId = "jaro" | "leto" | "podzim";
export type WeatherIcon = "slunce" | "polojasno" | "dest" | "bourka" | "vitr" | "mraz";

export type StationId =
  | "brana"
  | "senik"
  | "kompost"
  | "louka"
  | "tresne"
  | "sad"
  | "svestky"
  | "potok"
  | "zahradka"
  | "solar"
  | "dilna"
  | "maringotka";

export type ShapeId =
  | "triangle"
  | "circle"
  | "drop"
  | "bar"
  | "leaf"
  | "hexagon"
  | "cloud"
  | "square"
  | "diamond"
  | "ring"
  | "arch"
  | "star"
  | "pentagon";

export type ItemDef = {
  id: ItemId;
  kind: "resource" | "product";
  name: string;
  plural: string;
  shape: ShapeId;
  color: string;
  ink: string;
  /** Počet žetonů v krabici (fyzická hra). */
  tokens: number;
  fact?: string;
};

export type SpaceKind = "station" | "event" | "path";

export type SpaceDef = {
  /** 1–30, pořadí na smyčce po směru hodinových ručiček. */
  n: number;
  kind: SpaceKind;
  station?: StationId;
  /** Střed pole v mm na desce 500×500. */
  x: number;
  y: number;
};

export type GateId = "sad" | "maringotka";
export type ShortcutDef = {
  id: GateId | "potok";
  name: string;
  a: number;
  b: number;
  /** Vrata se otevírají; skok přes potok jen pro vybraná zvířata. */
  gate: boolean;
  only?: AnimalId[];
};

export type RecipeId = "seno" | "susene" | "krizaly" | "kompost" | "pelisek";
export type RecipeDef = {
  id: RecipeId;
  product: ProductId;
  inputs: Bag;
  stations: StationId[];
  /** Povolené počasí; prázdné = jakékoli. */
  weather: WeatherIcon[];
  note: string;
};

export type StationDef = {
  id: StationId;
  space: number;
  name: string;
  short: string;
  /** Co se tu dá sbírat. */
  gather: ResourceId[];
  recipes: RecipeId[];
  start: Bag;
  /** Ikona a text pro hráče. */
  hint: string;
  who?: string;
};

export type AnimalDef = {
  id: AnimalId;
  name: string;
  species: string;
  /** Rod pro skloňování v textech. */
  fem: boolean;
  marker: { shape: ShapeId; ring: string; numeral: number };
  cargo: number;
  power: { name: string; text: string };
  quirk: { name: string; text: string };
  second: { name: string; text: string };
  wish: { name: string; text: string };
  quote: string;
  friend: AnimalId;
  sound: string;
  start: number;
};

export type HelperWho = "tomas" | "maruska" | "tony" | "louka";
