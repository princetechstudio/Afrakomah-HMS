import { useState } from "react";
import { useStore } from "../store";
import { ROLE_META } from "../data";
import type { Role } from "../data";
import { Badge, Btn, Field, Input, Modal, Select } from "../ui";
import { IAlert, IList, IUser } from "../icons";

export default function ProvisionAccountModal({ onClose }: { onClose: () => void }) {
  const { createAccount } = useStore();
  const [f, setF] = useState({ name: "", password: "", role: "doctor" as Role, dept: "", title: "", phone: "" });
  const [err, setErr] = useState<string | null>(null);
  const set = (k: string, v: string) => setF((x) => ({ ...x, [k]: v }));

  const submit = () => {
    if (!f.name.trim()) { setErr("A full name is required."); return; }
    if (f.password.length < 4) { setErr("Password must be at least 4 characters."); return; }
    createAccount({ name: f.name, role: f.role, password: f.password, dept: f.dept || undefined, title: f.title || undefined, phone: f.phone || undefined });
    onClose();
  };

  return (
    <Modal title="Create Staff Account" sub="Provision a secure sign-in and role-specific workspace" onClose={onClose} w="max-w-lg"
      footer={<><Btn variant="ghost" onClick={onClose}>Cancel</Btn><Btn onClick={submit}><IUser size={13} /> Create account</Btn></>}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Full name *" className="col-span-2"><Input value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Dr. Ama Owusu" autoFocus /></Field>
        <Field label="Password *"><Input type="password" value={f.password} onChange={(e) => set("password", e.target.value)} placeholder="At least 4 characters" /></Field>
        <Field label="Role *"><Select value={f.role} onChange={(e) => set("role", e.target.value as Role)}>{(Object.keys(ROLE_META) as Role[]).map((r) => <option key={r} value={r}>{ROLE_META[r].label}</option>)}</Select></Field>
        <Field label="Department"><Input value={f.dept} onChange={(e) => set("dept", e.target.value)} placeholder="e.g. Paediatrics" /></Field>
        <Field label="Job title"><Input value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Staff Nurse" /></Field>
        <Field label="Phone"><Input value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="024 …" /></Field>
      </div>
      {err && <p className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-semibold leading-snug text-red-800"><IAlert size={14} className="mt-0.5 shrink-0" /> {err}</p>}
      <p className="mt-3 rounded-lg bg-paper/70 px-3 py-2 text-[10.5px] leading-relaxed text-ink-faint"><IList size={12} className="mr-1 inline" /> The worker will sign in using their staff ID and password. Administrators provision staff accounts here, while administrator workspaces provide read-only operational oversight and AI insights.</p>
    </Modal>
  );
}
