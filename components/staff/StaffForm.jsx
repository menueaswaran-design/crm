"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/common/Modal";
import Button from "@/components/common/Button";
import { Input, Select } from "@/components/common/Field";
import { postData, patchData } from "@/lib/client";

export default function StaffForm({ open, onClose, staff, onSaved }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("staff");
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setError("");
      setPassword("");
      if (staff) {
        setName(staff.name || "");
        setEmail(staff.email || "");
        setPhone(staff.phone || "");
        setRole(staff.role || "staff");
        setIsActive(staff.isActive !== false);
      } else {
        setName("");
        setEmail("");
        setPhone("");
        setRole("staff");
        setIsActive(true);
      }
    }
  }, [open, staff]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) return setError("Name is required.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError("Enter a valid email address.");
    if (!staff && (!password || password.length < 6)) {
      return setError("Password is required (min 6 characters).");
    }

    const payload = {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      role,
      isActive,
    };
    if (!staff) payload.password = password;

    setLoading(true);
    try {
      if (staff) {
        await patchData(`/api/users/${staff._id}`, payload);
      } else {
        await postData("/api/users", payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={staff ? "Edit Staff Member" : "Add Staff Member"}
      maxWidth="max-w-md"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button type="submit" form="staff-form" loading={loading}>
            {loading ? "Saving..." : staff ? "Save Changes" : "Add Staff"}
          </Button>
        </div>
      }
    >
      {error && (
        <div className="mb-4 rounded-lg bg-rose-50 border border-rose-100 p-3 text-xs text-rose-700">
          {error}
        </div>
      )}
      <form id="staff-form" onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Full Name"
          required
          placeholder="e.g. Rohan Gupta"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          label="Email"
          type="email"
          required
          placeholder="name@caoffice.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={!!staff}
        />
        {!staff && (
          <Input
            label="Password"
            type="password"
            required
            placeholder="Min 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            hint="Staff will use this email and password to sign in."
          />
        )}
        <Input
          label="Phone"
          placeholder="+91 98765 43210"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <Select label="Role" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="staff">Staff</option>
          <option value="admin">Admin</option>
        </Select>
        <div className="flex items-center justify-between rounded-lg bg-slate-50 border border-slate-200 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-slate-900">Active account</p>
            <p className="text-xs text-slate-500">Inactive members cannot access the CRM.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isActive}
            onClick={() => setIsActive((v) => !v)}
            className={`relative h-6 w-11 rounded-full transition-colors ${isActive ? "bg-brand-600" : "bg-slate-300"}`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                isActive ? "left-[22px]" : "left-0.5"
              }`}
            />
          </button>
        </div>
      </form>
    </Modal>
  );
}
