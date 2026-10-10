"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Upload, Search, Download, Users, Files } from "lucide-react";
import { getList, deleteData, buildQuery } from "@/lib/client";
import { useDebounce } from "@/hooks/useDebounce";
import { downloadCSV, downloadExcel, fetchAllList } from "@/lib/export";
import { formatBytes, formatDate, getErrorMessage, DOCUMENT_CATEGORIES } from "@/lib/utils";
import DocumentCard from "@/components/documents/DocumentCard";
import ClientDocumentCard from "@/components/documents/ClientDocumentCard";
import UploadDocumentModal from "@/components/documents/UploadDocumentModal";
import ClientSearchPicker from "@/components/clients/ClientSearchPicker";
import Pagination from "@/components/common/Pagination";
import EmptyState from "@/components/common/EmptyState";
import { SkeletonCards } from "@/components/common/Loading";
import Button from "@/components/common/Button";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import ErrorBanner from "@/components/common/ErrorBanner";

const CLIENTS_PER_PAGE = 8;
const FILES_PER_PAGE = 12;

export default function DocumentsPage() {
  return (
    <Suspense fallback={<SkeletonCards count={6} />}>
      <DocumentsContent />
    </Suspense>
  );
}

function DocumentsContent() {
  const searchParams = useSearchParams();
  const [view, setView] = useState("clients");

  const [groups, setGroups] = useState([]);
  const [docs, setDocs] = useState([]);
  const [totals, setTotals] = useState({ clients: 0, files: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [clientId, setClientId] = useState(() => searchParams.get("clientId") || "");
  const debouncedSearch = useDebounce(search, 400);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadTarget, setUploadTarget] = useState(null);
  const [deleteDoc, setDeleteDoc] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [exporting, setExporting] = useState(null);

  const grouped = view === "clients";

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (grouped) {
        const json = await getList(
          `/api/documents/grouped${buildQuery({
            search: debouncedSearch,
            category,
            clientId,
            page,
            limit: CLIENTS_PER_PAGE,
          })}`
        );
        setGroups(json.data || []);
        setTotals(json.totals || { clients: 0, files: 0 });
        setTotalPages(json.pagination?.totalPages || 1);
      } else {
        const { data, pagination } = await getList(
          `/api/documents${buildQuery({
            search: debouncedSearch,
            category,
            clientId,
            page,
            limit: FILES_PER_PAGE,
          })}`
        );
        setDocs(data);
        setTotals({ clients: 0, files: pagination.total || 0 });
        setTotalPages(pagination.totalPages || 1);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [grouped, debouncedSearch, category, clientId, page]);

  useEffect(() => {
    load();
  }, [load]);

  const switchView = (next) => {
    setView(next);
    setPage(1);
  };

  const openUpload = (group) => {
    setUploadTarget(group || null);
    setUploadOpen(true);
  };

  const confirmDelete = async (doc) => {
    setDeleteLoading(true);
    try {
      await deleteData(`/api/documents/${doc._id}`);
      setDeleteDoc(null);
      load();
    } finally {
      setDeleteLoading(false);
    }
  };

  const hasFilters = !!(debouncedSearch || category || clientId);
  const empty = grouped ? groups.length === 0 : docs.length === 0;

  const subtitle = grouped
    ? loading
      ? "Client files and uploads"
      : `${totals.clients} client${totals.clients === 1 ? "" : "s"} · ${totals.files.toLocaleString("en-IN")} file${
          totals.files === 1 ? "" : "s"
        }`
    : loading
      ? "Client files and uploads"
      : `${totals.files.toLocaleString("en-IN")} file${totals.files === 1 ? "" : "s"} found`;

  const handleExport = async (format) => {
    if (exporting) return;
    setExporting(format);
    try {
      const all = await fetchAllList("/api/documents", {
        search: debouncedSearch,
        category,
        clientId,
      });
      if (format === "csv") {
        downloadCSV({
          filename: "documents",
          headers: ["Name", "Client", "Category", "Format", "Size", "Uploaded By", "Uploaded At"],
          rows: all.map((d) => [
            d.name,
            d.clientId?.name || "",
            d.category || "",
            d.format || "",
            formatBytes(d.size),
            d.uploadedBy?.name || "",
            formatDate(d.uploadedAt),
          ]),
        });
      } else {
        downloadExcel({
          filename: "documents",
          sheetName: "Documents",
          rows: all.map((d) => ({
            Name: d.name,
            Client: d.clientId?.name || "",
            Category: d.category || "",
            Format: d.format || "",
            Size: formatBytes(d.size),
            "Uploaded By": d.uploadedBy?.name || "",
            "Uploaded At": formatDate(d.uploadedAt),
          })),
        });
      }
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="page-title">Documents</h1>
          <p className="page-subtitle mt-1">{subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="flex gap-1 overflow-hidden rounded-lg border border-hairline bg-canvas p-1"
            role="group"
            aria-label="View format"
          >
            <button
              type="button"
              onClick={() => switchView("clients")}
              title="Group by client"
              aria-pressed={grouped}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all duration-150 ${
                grouped
                  ? "bg-white text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.07)]"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <Users size={15} /> <span className="hidden sm:inline">By Client</span>
            </button>
            <button
              type="button"
              onClick={() => switchView("files")}
              title="All files"
              aria-pressed={!grouped}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all duration-150 ${
                !grouped
                  ? "bg-white text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.07)]"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <Files size={15} /> <span className="hidden sm:inline">All Files</span>
            </button>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleExport("csv")}
            loading={exporting === "csv"}
            disabled={!!exporting}
          >
            <Download size={15} /> CSV
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleExport("excel")}
            loading={exporting === "excel"}
            disabled={!!exporting}
          >
            <Download size={15} /> Excel
          </Button>
          <Button size="sm" onClick={() => openUpload(null)}>
            <Upload size={15} /> Upload
          </Button>
        </div>
      </div>

      {error && <ErrorBanner message={error} onRetry={load} />}

      <div className="surface-bar flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative flex-1 min-w-0 sm:min-w-56">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={grouped ? "Search client, code, PAN or file name..." : "Search by file name..."}
            className="input-base input-search"
          />
        </div>
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(1);
          }}
          className="input-base w-full sm:w-auto sm:min-w-40 cursor-pointer"
        >
          <option value="">All Categories</option>
          {DOCUMENT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <div className="w-full sm:w-auto sm:min-w-64">
          <ClientSearchPicker
            label=""
            value={clientId}
            onChange={(v) => {
              setClientId(v);
              setPage(1);
            }}
          />
        </div>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("");
              setCategory("");
              setClientId("");
              setPage(1);
            }}
          >
            Clear
          </Button>
        )}
      </div>

      {loading ? (
        <SkeletonCards count={6} />
      ) : empty ? (
        <EmptyState
          variant={hasFilters ? "search" : "unavailable"}
          title={hasFilters ? "No documents match your filters" : "No documents yet"}
          description={
            hasFilters
              ? "Try a different keyword, category or client."
              : grouped
                ? "Once you upload files for a client, all of their documents will appear grouped on one card."
                : "Upload files to organize them securely against a client."
          }
          action={
            hasFilters ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setCategory("");
                  setClientId("");
                  setPage(1);
                }}
              >
                Clear filters
              </Button>
            ) : (
              <Button onClick={() => openUpload(null)}>
                <Upload size={16} /> Upload Document
              </Button>
            )
          }
        />
      ) : grouped ? (
        <div className="space-y-3">
          {groups.map((g) => (
            <ClientDocumentCard
              key={g._id}
              group={g}
              onDelete={setDeleteDoc}
              onUpload={openUpload}
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {docs.map((d) => (
            <DocumentCard key={d._id} doc={d} onDelete={setDeleteDoc} />
          ))}
        </div>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        total={grouped ? totals.clients : totals.files}
        onChange={setPage}
      />

      <UploadDocumentModal
        open={uploadOpen}
        onClose={() => {
          setUploadOpen(false);
          setUploadTarget(null);
        }}
        onUploaded={load}
        clientId={uploadTarget?._id || ""}
        client={uploadTarget}
        lockClient={!!uploadTarget}
      />

      <ConfirmDialog
        open={!!deleteDoc}
        title="Delete Document"
        message={`Are you sure you want to delete "${deleteDoc?.name}"?`}
        onConfirm={() => confirmDelete(deleteDoc)}
        onCancel={() => setDeleteDoc(null)}
        loading={deleteLoading}
      />
    </div>
  );
}
