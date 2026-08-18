"use client";

import { useCallback, useEffect, useState } from "react";
import { Upload, Search } from "lucide-react";
import { getList, deleteData, buildQuery } from "@/lib/client";
import { useDebounce } from "@/hooks/useDebounce";
import DocumentCard from "@/components/documents/DocumentCard";
import UploadDocumentModal from "@/components/documents/UploadDocumentModal";
import Pagination from "@/components/common/Pagination";
import EmptyState from "@/components/common/EmptyState";
import { SkeletonCards } from "@/components/common/Loading";
import Button from "@/components/common/Button";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { DOCUMENT_CATEGORIES } from "@/lib/utils";

export default function DocumentsPage() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const debouncedSearch = useDebounce(search, 400);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteDoc, setDeleteDoc] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, pagination } = await getList(
        `/api/documents${buildQuery({ search: debouncedSearch, category, page, limit: 12 })}`
      );
      setDocs(data);
      setTotal(pagination.total || 0);
      setTotalPages(pagination.totalPages || 1);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, category, page]);

  useEffect(() => {
    load();
  }, [load]);

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

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900">Documents</h1>
          <p className="text-sm text-slate-500 mt-0.5">Client files and uploads</p>
        </div>
        <Button size="sm" onClick={() => setUploadOpen(true)}>
          <Upload size={15} /> Upload
        </Button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative flex-1 min-w-0 sm:min-w-56">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by file name..."
            className="input-base pl-9"
          />
        </div>
        <select
          value={category}
          onChange={(e) => { setCategory(e.target.value); setPage(1); }}
          className="input-base w-full sm:w-auto sm:min-w-40 cursor-pointer"
        >
          <option value="">All Categories</option>
          {DOCUMENT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <p className="text-sm text-slate-500 sm:ml-auto">{total} files</p>
      </div>

      {loading ? (
        <SkeletonCards count={6} />
      ) : docs.length === 0 ? (
        <EmptyState
          title="No documents found"
          description="Upload client documents to organize them securely."
          action={<Button onClick={() => setUploadOpen(true)}><Upload size={16} /> Upload Document</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {docs.map((d) => (
            <DocumentCard
              key={d._id}
              doc={d}
              onDelete={setDeleteDoc}
            />
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      <UploadDocumentModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploaded={load}
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
