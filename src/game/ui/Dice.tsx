import { motion } from "motion/react";
import { useReducedMotion } from "../useMedia";

const PIPS: Record<number, [number, number][]> = {
  1: [[0, 0]],
  2: [[-1, -1], [1, 1]],
  3: [[-1, -1], [0, 0], [1, 1]],
  4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
  5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
  6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
};

export function Die({ value, rollKey, size = 56, tone = "plain", label }: { value: number; rollKey: number; size?: number; tone?: "plain" | "move" | "str"; label?: string }) {
  const reduced = useReducedMotion();
  const fill = tone === "move" ? "#e7f0e3" : tone === "str" ? "#f8e7cf" : "#fffaf0";
  const ring = tone === "move" ? "#2d5a3d" : tone === "str" ? "#b85c3c" : "#3d3326";
  return (
    <motion.div
      key={rollKey}
      initial={reduced ? false : { rotate: -200, scale: 0.6, y: -18 }}
      animate={{ rotate: 0, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 220, damping: 14 }}
      className="inline-grid place-items-center"
      style={{ width: size, height: size }}
      aria-label={label ?? `Kostka: ${value}`}
      role="img"
    >
      <svg viewBox="-12 -12 24 24" width={size} height={size}>
        <rect x={-10.5} y={-10.5} width={21} height={21} rx={4.5} fill={fill} stroke={ring} strokeWidth={1.4} />
        <rect x={-9} y={-9} width={18} height={6} rx={3} fill="#fff" opacity={0.45} />
        {PIPS[value]?.map(([x, y], i) => (
          <circle key={i} cx={x * 5.2} cy={y * 5.2} r={2.05} fill={value === 6 ? "#9a3b25" : "#2a2418"} />
        ))}
      </svg>
    </motion.div>
  );
}
