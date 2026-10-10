import { Loader2 } from "lucide-react";

export default function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  className = "",
  disabled,
  type = "button",
  fullWidth,
  ...props
}) {
  const base =
    "inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none disabled:active:translate-y-0 whitespace-nowrap select-none";

  const variants = {
    primary:
      "bg-brand-600 text-white shadow-[0_1px_2px_rgba(79,70,229,0.28)] hover:bg-brand-700 focus-visible:ring-brand-400 active:bg-brand-700",
    secondary:
      "bg-white text-slate-700 border border-hairline shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:bg-slate-50 hover:border-hairline-strong focus-visible:ring-slate-400",
    danger:
      "bg-rose-600 text-white shadow-[0_1px_2px_rgba(225,29,72,0.26)] hover:bg-rose-700 focus-visible:ring-rose-400 active:bg-rose-700",
    success:
      "bg-emerald-600 text-white shadow-[0_1px_2px_rgba(5,150,105,0.26)] hover:bg-emerald-700 focus-visible:ring-emerald-400 active:bg-emerald-700",
    ghost:
      "text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-slate-400",
    outline:
      "border border-brand-200 bg-brand-50/50 text-brand-700 hover:bg-brand-50 hover:border-brand-300 focus-visible:ring-brand-400",
    /* Very quiet action for row-level / tertiary controls */
    subtle:
      "text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus-visible:ring-slate-400",
  };

  const sizes = {
    xs: "text-xs px-2.5 py-1.5 rounded-md",
    sm: "text-xs px-3 py-2",
    md: "text-sm px-4 py-2.5",
    lg: "text-sm px-5 py-3",
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${sizes[size]} ${fullWidth ? "w-full" : ""} ${className}`}
      {...props}
    >
      {loading && <Loader2 size={15} className="animate-spin" />}
      {children}
    </button>
  );
}
