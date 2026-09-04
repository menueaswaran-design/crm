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

const schema = z.object({
  title: z.string().min(2, "Task title must be at least 2 characters."),
  description: z.string().min(1, "Description is required."),
  clientId: z.string().min(1, "Client is required."),
  assignedTo: z.string().optional().or(z.literal("")),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
  dueDate: z.string().min(1, "Due date is required."),
});

export default function TaskForm({ open, onClose, task, onSaved }) {
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
        task
          ? {
              title: task.title,
              description: task.description,
              clientId: task.clientId?._id || task.clientId || "",
              assignedTo: task.assignedTo?._id || task.assignedTo || "",
              priority: task.priority,
              dueDate: task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : "",
            }
          : {
              title: "",
              description: "",
              clientId: "",
              assignedTo: "",
              priority: "MEDIUM",
              dueDate: "",
            }
      );
    }
  }, [open, task, reset]);

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
        assignedTo: values.assignedTo || null,
      };
      if (task) {
        await patchData(`/api/tasks/${task._id}`, payload);
      } else {
        await postData("/api/tasks", payload);
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
      title={task ? "Edit Task" : "Create Task"}
      maxWidth="max-w-2xl"
      footer={
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3">
          <Button variant="secondary" onClick={onClose} type="button" className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button type="submit" form="task-form" loading={isSubmitting} className="w-full sm:w-auto">
            {isSubmitting ? "Creating..." : task ? "Save Changes" : "Create Task"}
          </Button>
        </div>
      }
    >
      {serverError && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-100 p-3 text-xs text-red-700">
          {serverError}
        </div>
      )}
      <form id="task-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Input label="Task Title" required placeholder="e.g. Prepare GSTR-3B for Tech Solutions" error={errors.title?.message} {...register("title")} />
          </div>
          <div className="sm:col-span-2">
            <Textarea label="Description" required placeholder="Describe the task" error={errors.description?.message} {...register("description")} />
          </div>
          <ClientSearchPicker
            value={watch("clientId")}
            onChange={(id) => setValue("clientId", id, { shouldValidate: true })}
            selectedClient={task?.clientId}
            error={errors.clientId?.message}
            required
          />
          <Select label="Assign To" error={errors.assignedTo?.message} {...register("assignedTo")}>
            <option value="">Unassigned</option>
            {staff.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </Select>
          <Select label="Priority" required error={errors.priority?.message} {...register("priority")}>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </Select>
          <Input label="Due Date" type="date" required error={errors.dueDate?.message} {...register("dueDate")} />
        </div>
      </form>
    </Modal>
  );
}
