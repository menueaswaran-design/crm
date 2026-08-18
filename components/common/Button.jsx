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
    "inline-flex items-center justify-center gap-2 font-medium rounded-md transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none whitespace-nowrap";

  const variants = {
    primary:
      "bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 focus-visible:ring-indigo-400",
    secondary:
      "bg-white text-slate-700 border border-slate-200 shadow-sm hover:bg-slate-50 hover:border-slate-300 focus-visible:ring-slate-400",
    danger:
      "bg-rose-600 text-white shadow-sm hover:bg-rose-700 focus-visible:ring-rose-500",
    success:
      "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 focus-visible:ring-emerald-500",
    ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
    outline: "border border-brand-300 text-brand-700 hover:bg-brand-50",
  };

  const sizes = {
    xs: "text-xs px-2.5 py-1.5",
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
