import type { ButtonHTMLAttributes, ReactNode } from "react";
import clsx from "clsx";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  loading?: boolean;
  children: ReactNode;
};

const baseClasses =
  "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "bg-blue-600 text-white hover:bg-blue-500",
  secondary: "bg-neutral-800 text-neutral-100 hover:bg-neutral-700",
  ghost: "bg-transparent hover:bg-neutral-900 text-neutral-200",
};

export function Button({ variant = "primary", loading, children, className, disabled, ...rest }: ButtonProps) {
  return (
    <button className={clsx(baseClasses, variants[variant], className)} disabled={disabled || loading} {...rest}>
      {loading && <span className="mr-2 h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />}
      {children}
    </button>
  );
}

export default Button;
