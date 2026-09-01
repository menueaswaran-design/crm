"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import Field from "@/components/common/Field";
import { apiFetch } from "@/lib/client";
import { useDebounce } from "@/hooks/useDebounce";

function clientLabel(client) {
  if (!client) return "";
  const code = client.clientCode ? ` (${client.clientCode})` : "";
  return `${client.name || "Client"}${code}`;
}

/**
 * Searchable client picker — loads clients on demand instead of a fixed dropdown.
 */
export default function ClientSearchPicker({
  value,
  onChange,
  selectedClient,
  label = "Client",
  error,
  required,
  disabled,
  hint,
}) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debouncedQuery = useDebounce(query, 300);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!value) {
      setSelected(null);
      return;
    }
    if (selectedClient && String(selectedClient._id || selectedClient) === String(value)) {
      const client =
        typeof selectedClient === "object"
          ? selectedClient
          : { _id: value, name: String(selectedClient) };
      setSelected(client);
      return;
    }
    if (selected && String(selected._id) === String(value)) return;

    let cancelled = false;
    (async () => {
      try {
        const json = await apiFetch(`/api/clients/${value}`);
        if (!cancelled && json.data?.client) {
          setSelected(json.data.client);
        }
      } catch {
        if (!cancelled) {
          setSelected({ _id: value, name: "Selected client" });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [value, selectedClient, selected]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const params = new URLSearchParams({ limit: "20" });
        if (debouncedQuery.trim()) params.set("search", debouncedQuery.trim());
        const json = await apiFetch(`/api/clients?${params}`);
        if (!cancelled) {
          setOptions(json.data || []);
        }
      } catch {
        if (!cancelled) setOptions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, open]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (client) => {
    setSelected(client);
    onChange?.(client._id);
    setQuery("");
    setOpen(false);
  };

  const handleClear = () => {
    setSelected(null);
    onChange?.("");
    setQuery("");
    setOpen(false);
  };

  return (
    <Field label={label} error={error} required={required} hint={hint}>
      <div ref={containerRef} className="relative">
        {selected ? (
          <div className="input-base flex items-center justify-between gap-2 pr-2">
            <span className="truncate text-sm text-slate-900">{clientLabel(selected)}</span>
            {!disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Clear client"
              >
                <X size={14} />
              </button>
            )}
          </div>
        ) : (
          <div className="relative">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={query}
              disabled={disabled}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              placeholder="Search by name, PAN, GSTIN, phone..."
              className={`input-base pl-9 ${error ? "input-error" : ""}`}
            />
          </div>
        )}

        {open && !selected && !disabled && (
          <div className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
            {loading ? (
              <p className="px-3 py-2.5 text-xs text-slate-500">Searching...</p>
            ) : options.length === 0 ? (
              <p className="px-3 py-2.5 text-xs text-slate-500">
                {debouncedQuery.trim() ? "No clients found." : "Type to search clients."}
              </p>
            ) : (
              options.map((client) => (
                <button
                  key={client._id}
                  type="button"
                  onClick={() => handleSelect(client)}
                  className="flex w-full flex-col items-start px-3 py-2.5 text-left text-sm hover:bg-slate-50"
                >
                  <span className="font-medium text-slate-900">{client.name}</span>
                  <span className="text-xs text-slate-500">
                    {[client.clientCode, client.pan, client.gstin].filter(Boolean).join(" · ") || "—"}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </Field>
  );
}
