import type { ButtonHTMLAttributes, ReactNode } from "react";
import { play } from "../audio";

type Tone = "primary" | "secondary" | "ghost" | "danger" | "accent";

const TONES: Record<Tone, string> = {
  primary: "bg-moss text-cream hover:bg-moss-deep shadow-soft",
  secondary: "bg-surface text-ink border border-border hover:border-moss-soft",
  ghost: "bg-transparent text-ink hover:bg-sand/60",
  danger: "bg-terracotta text-cream hover:brightness-95",
  accent: "bg-accent text-ink hover:brightness-95 shadow-soft",
};

export function Btn({ tone = "secondary", className = "", children, big, onClick, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone; big?: boolean; children: ReactNode }) {
  return (
    <button
      {...rest}
      onClick={(e) => {
        play("click");
        onClick?.(e);
      }}
      className={`inline-flex items-center justify-center gap-2 rounded-[14px] font-semibold transition disabled:opacity-45 ${big ? "min-h-14 px-5 text-lg" : "min-h-12 px-4 text-[15px]"} ${TONES[tone]} ${className}`}
    >
      {children}
    </button>
  );
}
