"use client";

import * as XLSX from "xlsx";
import { getList, buildQuery } from "@/lib/client";

/**
 * Downloads a CSV file from `headers` (array of strings) and `rows`
 * (array of arrays matching the header order).
 */
export function downloadCSV({ filename, headers, rows }) {
  const csv = [headers, ...rows]
    .map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, `${filename}-${new Date().toISOString().slice(0, 10)}.csv`);
}

/**
 * Downloads an .xlsx workbook with a single sheet built from `rows`
 * (array of object literals; keys become the column headers).
 */
export function downloadExcel({ filename, sheetName, rows }) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/**
 * Fetches every record matching `params` by walking all pages of the API,
 * so exports cover the full (filtered) dataset rather than the current page.
 */
export async function fetchAllList(path, params, pageSize = 100) {
  const { data, pagination } = await getList(`${path}${buildQuery({ ...params, limit: pageSize })}`);
  const all = [...data];
  const pages = pagination?.totalPages || 1;
  for (let p = 2; p <= pages; p++) {
    const { data: batch } = await getList(`${path}${buildQuery({ ...params, limit: pageSize, page: p })}`);
    all.push(...batch);
  }
  return all;
}

function triggerDownload(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}