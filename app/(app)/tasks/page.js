"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { Plus, Download } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { getList, deleteData, buildQuery } from "@/lib/client";
import { downloadCSV, downloadExcel, fetchAllList } from "@/lib/export";
import { useAuth } from "@/context/AuthContext";
import TaskCard from "@/components/tasks/TaskCard";
import TaskForm from "@/components/tasks/TaskForm";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import Pagination from "@/components/common/Pagination";
import EmptyState from "@/components/common/EmptyState";
import { SkeletonCards } from "@/components/common/Loading";
import Button from "@/components/common/Button";
import ErrorBanner from "@/components/common/ErrorBanner";
import { formatDate, getErrorMessage } from "@/lib/utils";

const STATUSES = ["All Status", "Pending", "In Progress", "Completed", "Overdue"];
const PRIORITIES = ["All Priority", "Low", "Medium", "High"];

function statusFromParam(status) {
  if (!status) return "All Status";
  const label = status
    .split("_")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
  return STATUSES.includes(label) ? label : "All Status";
}

function TasksPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const searchParams = useSearchParams();

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState(() => statusFromParam(searchParams.get("status")));
  const [priority, setPriority] = useState("All Priority");
  const [assigned, setAssigned] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [exporting, setExporting] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data, pagination } = await getList(
        `/api/tasks${buildQuery({
          status,
          priority,
          assigned: isAdmin ? assigned : "",
          page,
          limit: 12,
        })}`
      );
      setTasks(data);
      setTotal(pagination.total || 0);
      setTotalPages(pagination.totalPages || 1);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [status, priority, assigned, page, isAdmin]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSaved = () => {
    setFormOpen(false);
    setEditing(null);
    load();
  };

  const handleExport = async (format) => {
    if (exporting) return;
    setExporting(format);
    try {
      const all = await fetchAllList("/api/tasks", {
        status,
        priority,
        assigned: isAdmin ? assigned : "",
      });
      if (format === "csv") {
        downloadCSV({
          filename: "tasks",
          headers: ["Title", "Client", "Assigned To", "Priority", "Status", "Due Date"],
          rows: all.map((t) => [
            t.title,
            t.clientId?.name || "",
            t.assignedTo?.name || "",
            t.priority || "",
            t.derivedStatus || t.status || "",
            formatDate(t.dueDate),
          ]),
        });
      } else {
        downloadExcel({
          filename: "tasks",
          sheetName: "Tasks",
          rows: all.map((t) => ({
            Title: t.title,
            Client: t.clientId?.name || "",
            "Assigned To": t.assignedTo?.name || "",
            Priority: t.priority || "",
            Status: t.derivedStatus || t.status || "",
            "Due Date": formatDate(t.dueDate),
          })),
        });
      }
    } finally {
      setExporting(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await deleteData(`/api/tasks/${deleting._id}`);
      setDeleting(null);
      load();
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900">Tasks</h1>
          <p className="text-sm text-slate-500 mt-0.5">{total} tasks</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => handleExport("csv")} loading={exporting === "csv"} disabled={!!exporting}>
            <Download size={15} /> <span className="hidden sm:inline">CSV</span>
          </Button>
          <Button variant="secondary" size="sm" onClick={() => handleExport("excel")} loading={exporting === "excel"} disabled={!!exporting}>
            <Download size={15} /> <span className="hidden sm:inline">Excel</span>
          </Button>
          <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus size={15} /> <span className="hidden sm:inline">Create Task</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:items-center gap-2">
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="input-base w-full sm:w-auto sm:min-w-40 cursor-pointer"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={priority}
          onChange={(e) => { setPriority(e.target.value); setPage(1); }}
          className="input-base w-full sm:w-auto sm:min-w-40 cursor-pointer"
        >
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        {isAdmin && (
          <select
            value={assigned}
            onChange={(e) => { setAssigned(e.target.value); setPage(1); }}
            className="col-span-2 sm:col-span-1 input-base w-full sm:w-auto sm:min-w-40 cursor-pointer"
          >
            <option value="">All Assignments</option>
            <option value="assigned">Assigned</option>
            <option value="unassigned">Unassigned</option>
          </select>
        )}
      </div>

      {error && <ErrorBanner message={error} onRetry={load} />}

      {loading ? (
        <SkeletonCards count={6} />
      ) : tasks.length === 0 ? (
        <EmptyState
          variant="unavailable"
          title="No tasks found"
          description={
            assigned === "unassigned"
              ? "No unassigned tasks match your filters."
              : "No tasks match your current filters. Create one to assign work to your team."
          }
          action={<Button onClick={() => setFormOpen(true)}><Plus size={15} /> Create Task</Button>}
        />
      ) : (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
          {tasks.map((t) => (
            <TaskCard
              key={t._id}
              task={t}
              onEdit={setEditing}
              onDelete={setDeleting}
              onStatusChange={load}
            />
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      <TaskForm
        open={formOpen || !!editing}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        task={editing}
        onSaved={handleSaved}
      />

      <ConfirmDialog
        open={!!deleting}
        title="Delete Task"
        message={`Are you sure you want to delete "${deleting?.title}"?`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
        loading={deleteLoading}
      />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="card p-6 text-sm text-slate-400">Loading tasks...</div>}>
      <TasksPage />
    </Suspense>
  );
}
