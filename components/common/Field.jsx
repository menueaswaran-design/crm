import { AlertCircle, Info, ChevronDown } from "lucide-react";

export default function Field({
  label,
  error,
  required,
  children,
  hint,
  className = "",
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className="label-base">
          {label}
          {required && <span className="text-rose-500"> *</span>}
        </label>
      )}
      {children}
      {error && (
        <p className="flex items-center gap-1 text-xs font-medium text-rose-600">
          <AlertCircle size={13} /> {error}
        </p>
      )}
      {!error && hint && (
        <p className="flex items-center gap-1 text-xs text-slate-400">
          <Info size={12} /> {hint}
        </p>
      )}
    </div>
  );
}

export function Input({ label, error, required, hint, className = "", ...props }) {
  return (
    <Field label={label} error={error} required={required} hint={hint}>
      <input
        className={`input-base ${error ? "input-error" : ""} ${className}`}
        {...props}
      />
    </Field>
  );
}

export function Textarea({ label, error, required, hint, className = "", ...props }) {
  return (
    <Field label={label} error={error} required={required} hint={hint}>
      <textarea
        className={`input-base ${error ? "input-error" : ""} ${className}`}
        rows={props.rows || 3}
        {...props}
      />
    </Field>
  );
}

export function Select({ label, error, required, hint, children, className = "", ...props }) {
  return (
    <Field label={label} error={error} required={required} hint={hint}>
      <div className="relative">
        <select
          className={`input-base ${error ? "input-error" : ""} cursor-pointer appearance-none pr-10 ${className}`}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          size={16}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
      </div>
    </Field>
  );
}
