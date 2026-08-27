"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Modal from "@/components/common/Modal";
import Button from "@/components/common/Button";
import { Input, Select, Textarea } from "@/components/common/Field";
import { postData, patchData, apiFetch } from "@/lib/client";
import { CLIENT_CATEGORIES } from "@/lib/utils";

const schema = z.object({
  name: z.string().min(2, "Client name must be at least 2 characters."),
  category: z.string().min(1, "Category is required."),
  pan: z.string().regex(/^[A-Za-z]{5}[0-9]{4}[A-Za-z]$/, "Invalid PAN format."),
  aadhaar: z.string().optional().or(z.literal("")),
  gstin: z
    .string()
    .regex(/^[0-9]{2}[A-Za-z]{5}[0-9]{4}[A-Za-z]{1}[1-9A-Za-z]{1}Z[0-9A-Za-z]{1}$/, "Invalid GSTIN format.")
    .optional()
    .or(z.literal("")),
  cin: z.string().optional().or(z.literal("")),
  email: z.string().email("Invalid email address."),
  phone: z.string().regex(/^(\+91[\s-]?)?[0]?[6-9]\d{9}$/, "Invalid Indian phone number."),
  address: z.string().min(1, "Address is required."),
  assignedStaff: z.string().optional().or(z.literal("")),
});

export default function ClientForm({ open, onClose, client, onSaved }) {
  const [staff, setStaff] = useState([]);
  const [serverError, setServerError] = useState("");
  const [nextSeq, setNextSeq] = useState("0001");

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (open && !client) {
      (async () => {
        try {
          const json = await apiFetch("/api/clients/code");
          setNextSeq(json.data?.next || "0001");
        } catch {
          setNextSeq("0001");
        }
      })();
    }
  }, [open, client]);

  const nameValue = client ? client.name : watch("name");
  const codePreview = client
    ? client.clientCode
    : `${(nameValue || "")
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w.charAt(0).toUpperCase())
        .join("") || "CL"}-${nextSeq}`;

  useEffect(() => {
    if (open) {
      setServerError("");
      reset(
        client
          ? {
              name: client.name,
              category: client.category,
              pan: client.pan,
              aadhaar: client.aadhaar || "",
              gstin: client.gstin || "",
              cin: client.cin || "",
              email: client.email,
              phone: client.phone,
              address: client.address,
              assignedStaff: client.assignedStaff?._id || client.assignedStaff || "",
            }
          : {
              name: "",
              category: "Individual",
              pan: "",
              aadhaar: "",
              gstin: "",
              cin: "",
              email: "",
              phone: "",
              address: "",
              assignedStaff: "",
            }
      );
    }
  }, [open, client, reset]);

  useEffect(() => {
    (async () => {
      try {
        const json = await apiFetch("/api/users");
        setStaff((json.data || []).filter((u) => u.role === "staff"));
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
      if (client) {
        await patchData(`/api/clients/${client._id}`, payload);
      } else {
        await postData("/api/clients", payload);
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
      title={client ? "Edit Client" : "Add New Client"}
      maxWidth="max-w-3xl"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button type="submit" form="client-form" loading={isSubmitting}>
            {isSubmitting ? "Saving..." : client ? "Save Changes" : "Add Client"}
          </Button>
        </div>
      }
    >
      {serverError && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-100 p-3 text-xs text-red-700">
          {serverError}
        </div>
      )}
      <form id="client-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Client ID (auto-generated)"
            value={codePreview}
            readOnly
            hint={client ? "Assigned when client was created." : "Created automatically and can't be changed."}
            className="bg-slate-50 text-slate-500 font-mono"
          />
          <Input label="Client Name" required placeholder="e.g. Amit Verma" error={errors.name?.message} {...register("name")} />
          <Select label="Category" required error={errors.category?.message} {...register("category")}>
            {CLIENT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <Input label="PAN" required placeholder="ABCDE1234F" error={errors.pan?.message} {...register("pan")} />
          <Input label="Aadhaar" placeholder="12 digit number" error={errors.aadhaar?.message} {...register("aadhaar")} />
          <Input label="GSTIN" placeholder="27ABCDE1234F1Z2" error={errors.gstin?.message} {...register("gstin")} />
          <Input label="CIN" placeholder="CIN (optional)" error={errors.cin?.message} {...register("cin")} />
          <Input label="Email" type="email" required placeholder="client@company.com" error={errors.email?.message} {...register("email")} />
          <Input label="Phone" required placeholder="+91 98765 43210" error={errors.phone?.message} {...register("phone")} />
          <Select label="Assigned Staff" error={errors.assignedStaff?.message} {...register("assignedStaff")}>
            <option value="">Unassigned</option>
            {staff.map((u) => (
              <option key={u._id} value={u._id}>
                {u.name}
              </option>
            ))}
          </Select>
          <div className="sm:col-span-2">
            <Textarea label="Address" required placeholder="Full address" error={errors.address?.message} {...register("address")} />
          </div>
        </div>
      </form>
    </Modal>
  );
}
