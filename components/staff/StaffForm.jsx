"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import Modal from "@/components/common/Modal";
import Button from "@/components/common/Button";
import { Input, Select } from "@/components/common/Field";
import { postData, patchData } from "@/lib/client";
import { NAV_PERMISSIONS, DEFAULT_STAFF_PERMISSIONS } from "@/lib/permissions";

export default function StaffForm({ open, onClose, staff, onSaved }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("staff");
  const [isActive, setIsActive] = useState(true);
  const [permissions, setPermissions] = useState(DEFAULT_STAFF_PERMISSIONS);
  const [dashboardFinancials, setDashboardFinancials] = useState(false);
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
        setDashboardFinancials(staff.dashboardFinancials === true);
        setPermissions(
          Array.isArray(staff.permissions) && staff.permissions.length > 0
            ? staff.permissions
            : [...DEFAULT_STAFF_PERMISSIONS]
        );
      } else {
        setName("");
        setEmail("");
        setPhone("");
        setRole("staff");
        setIsActive(true);
        setDashboardFinancials(false);
        setPermissions([...DEFAULT_STAFF_PERMISSIONS]);
      }
    }
  }, [open, staff]);

  const togglePermission = (key) => {
    setPermissions((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) return setError("Name is required.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError("Enter a valid email address.");
    if (!staff && (!password || password.length < 6)) {
      return setError("Password is required (min 6 characters).");
    }
    if (role === "staff" && permissions.length === 0) {
      return setError("Select at least one section the staff member can access.");
    }

    const payload = {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      role,
      isActive,
    };
    if (role === "staff") {
      payload.permissions = permissions;
      payload.dashboardFinancials = dashboardFinancials;
    }
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

        {role === "staff" && (
          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <div className="flex items-start gap-2.5 bg-slate-50 border-b border-slate-200 px-4 py-3">
              {permissions.includes("dashboard") ? (
                <ShieldAlert size={16} className="text-amber-500 mt-0.5 shrink-0" />
              ) : (
                <ShieldCheck size={16} className="text-emerald-600 mt-0.5 shrink-0" />
              )}
              <div>
                <p className="text-sm font-medium text-slate-900">Section access</p>
                <p className="text-xs text-slate-500">
                  Choose which navigation sections this staff member can open. The Dashboard shows revenue and firm-wide data — enable it only if needed.
                </p>
              </div>
            </div>
            <ul className="divide-y divide-slate-100">
              {NAV_PERMISSIONS.map((perm) => {
                const on = permissions.includes(perm.key);
                const risky = perm.key === "dashboard";
                return (
                  <li key={perm.key} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 flex items-center gap-1.5">
                        {perm.label}
                        {risky && (
                          <span className="text-[10px] font-semibold uppercase rounded-full px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200">
                            Sensitive
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-400 truncate">{perm.description}</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={on}
                      onClick={() => togglePermission(perm.key)}
                      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? "bg-brand-600" : "bg-slate-300"}`}
                      aria-label={`${on ? "Disable" : "Enable"} ${perm.label} access`}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                          on ? "left-[22px]" : "left-0.5"
                        }`}
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <p className="text-xs text-slate-500">{permissions.length} of {NAV_PERMISSIONS.length} sections enabled</p>
              <button
                type="button"
                onClick={() =>
                  setPermissions(permissions.length === NAV_PERMISSIONS.length ? [...DEFAULT_STAFF_PERMISSIONS] : NAV_PERMISSIONS.map((p) => p.key))
                }
                className="text-xs font-medium text-brand-700 hover:text-brand-800"
              >
                {permissions.length === NAV_PERMISSIONS.length ? "Reset to safe default" : "Select all"}
              </button>
            </div>
          </div>
        )}
        {role === "admin" && (
          <p className="text-xs text-slate-500 flex items-center gap-1.5">
            <ShieldCheck size={13} className="text-emerald-600" /> Admins always have full access to every section.
          </p>
        )}
      </form>
    </Modal>
  );
}
