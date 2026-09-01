"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Modal from "@/components/common/Modal";
import Button from "@/components/common/Button";
import { Input, Select, Textarea } from "@/components/common/Field";
import ClientSearchPicker from "@/components/clients/ClientSearchPicker";
import { postData, patchData, apiFetch } from "@/lib/client";
import { COMPLIANCE_TYPES, COMPLIANCE_CATEGORIES } from "@/lib/utils";

const schema = z.object({
  clientId: z.string().min(1, "Client is required."),
  type: z.string().min(1, "Compliance type is required."),
  category: z.string().min(1, "Category is required."),
  period: z.string().min(1, "Period is required."),
  financialYear: z.string().min(1, "Financial year is required."),
  dueDate: z.string().min(1, "Due date is required."),
  assignedStaff: z.string().optional().or(z.literal("")),
  description: z.string().optional().or(z.literal("")),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  recurrence: z.enum(["NONE", "MONTHLY", "QUARTERLY", "ANNUAL"]).default("NONE"),
});

export default function ComplianceForm({ open, onClose, record, onSaved }) {
  const [staff, setStaff] = useState([]);
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (open) {
      setServerError("");
      reset(
        record
          ? {
              clientId: record.clientId?._id || record.clientId,
              type: record.type,
              category: record.category || "GST",
              period: record.period || "",
              financialYear: record.financialYear || `FY ${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
              dueDate: record.dueDate ? new Date(record.dueDate).toISOString().slice(0, 10) : "",
              assignedStaff: record.assignedStaff?._id || record.assignedStaff || "",
              description: record.description || "",
              priority: record.priority || "MEDIUM",
              recurrence: record.recurrence || "NONE",
            }
          : {
              clientId: "",
              type: "GSTR-3B",
              category: "GST",
              period: "",
              financialYear: `FY ${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
              dueDate: "",
              assignedStaff: "",
              description: "",
              priority: "MEDIUM",
              recurrence: "NONE",
            }
      );
    }
  }, [open, record, reset]);

  useEffect(() => {
    (async () => {
      try {
        const u = await apiFetch("/api/users");
        setStaff((u.data || []).filter((s) => s.role !== "admin"));
      } catch {
        // ignore
      }
    })();
  }, []);

  const onSubmit = async (values) => {
    setServerError("");
    try {
      const payload = {
        ...values,
        assignedStaff: values.assignedStaff || null,
      };
      if (record) {
        await patchData(`/api/compliance/${record._id}`, payload);
      } else {
        await postData("/api/compliance", payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      setServerError(err.message);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={record ? "Edit Compliance" : "Add Compliance"}
      maxWidth="max-w-3xl"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button type="submit" form="compliance-form" loading={isSubmitting}>
            {isSubmitting ? "Saving..." : record ? "Save Changes" : "Add Compliance"}
          </Button>
        </div>
      }
    >
      {serverError && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-100 p-3 text-xs text-red-700">
          {serverError}
        </div>
      )}
      <form id="compliance-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <ClientSearchPicker
            value={watch("clientId")}
            onChange={(id) => setValue("clientId", id, { shouldValidate: true })}
            selectedClient={record?.clientId}
            error={errors.clientId?.message}
            required
          />
          <Select label="Compliance Type" required error={errors.type?.message} {...register("type")}>
            {COMPLIANCE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
          <Select label="Category" required error={errors.category?.message} {...register("category")}>
            {COMPLIANCE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <Input label="Period" required placeholder="e.g. Jan 2026" error={errors.period?.message} {...register("period")} />
          <Input label="Financial Year" required placeholder="FY 2025-26" error={errors.financialYear?.message} {...register("financialYear")} />
          <Input label="Due Date" type="date" required error={errors.dueDate?.message} {...register("dueDate")} />
          <Select label="Assigned Staff" error={errors.assignedStaff?.message} {...register("assignedStaff")}>
            <option value="">Unassigned</option>
            {staff.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </Select>
          <Select label="Priority" error={errors.priority?.message} {...register("priority")}>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </Select>
          <Select label="Repeats" error={errors.recurrence?.message} {...register("recurrence")}>
            <option value="NONE">One-time</option>
            <option value="MONTHLY">Monthly (next auto-created)</option>
            <option value="QUARTERLY">Quarterly (next auto-created)</option>
            <option value="ANNUAL">Annual (next auto-created)</option>
          </Select>
          <div className="sm:col-span-2">
            <Textarea label="Description" placeholder="Optional notes" error={errors.description?.message} {...register("description")} />
          </div>
        </div>
      </form>
    </Modal>
  );
}
