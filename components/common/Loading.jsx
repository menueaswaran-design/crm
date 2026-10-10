import { Loader2 } from "lucide-react";

export default function Loading({ label = "Loading..." }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3 animate-fade-in">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-hairline bg-canvas">
        <Loader2 size={17} className="animate-spin text-brand-600" />
      </div>
      <span className="text-[13px]">{label}</span>
    </div>
  );
}

export function SkeletonCards({ count = 3 }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card p-5 space-y-3.5">
          <div className="flex items-center gap-3">
            <div className="skeleton h-9 w-9 rounded-lg" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-3.5 w-2/3" />
              <div className="skeleton h-3 w-1/3" />
            </div>
          </div>
          <div className="skeleton h-3 w-full" />
          <div className="skeleton h-3 w-4/5" />
          <div className="skeleton h-8 w-24 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonRows({ count = 5 }) {
  return (
    <div className="card divide-y divide-hairline overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-4 flex items-center gap-4">
          <div className="skeleton h-9 w-9 rounded-lg" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-3 w-1/3" />
            <div className="skeleton h-3 w-2/3" />
          </div>
          <div className="skeleton h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}
