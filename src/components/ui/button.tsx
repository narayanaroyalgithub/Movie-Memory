import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "ghost";

const styles: Record<Variant, string> = {
  primary: "bg-cobalt text-white hover:bg-cobalt-dark disabled:bg-ink-faint",
  ghost: "border border-ink/20 text-ink hover:bg-ink/5 disabled:text-ink-faint disabled:hover:bg-transparent",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed ${styles[variant]} ${className}`}
    />
  );
}
