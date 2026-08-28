import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { emptyDB, nowISO, todayISO, ROLE_META, WARD_META } from "./data";
import type { DB, InvoiceItem, Notif, Role, Staff, ViewId } from "./data";
import { loadRelational, saveRelational } from "./relationalStore";
import { supabase } from "./supabase";

/* ============================================================
  Afrakomah HMS — local store
   Everything lives on this device (localStorage). No network,
   no external database, no auth service: sign-in is role-based
   and the roster of staff accounts is managed in Settings.
   ============================================================ */

export interface Nav {
  view: ViewId;
  patient?: string;
  tab?: string;
}

export interface ToastMsg {
  id: number;
  text: string;
  tone: "ok" | "warn" | "danger" | "info";
}

interface MutateOpts {
  audit?: string;
  notify?: { text: string; icon: Notif["icon"]; roles: Role[] };
}

export interface NewAccount {
  name: string;
  password: string;
  role: Role;
  dept?: string;
  title?: string;
  phone?: string;
  staffId?: string;
}

interface StoreShape {
  db: DB;
  user: Staff | null;
  login: (name: string, role: Role, password: string, existingId?: string) => void;
  logout: () => void;
  mutate: (fn: (d: DB) => void, opts?: MutateOpts) => void;
  createAccount: (a: NewAccount) => void;
  toast: (text: string, tone?: ToastMsg["tone"]) => void;
  toasts: ToastMsg[];
  dismissToast: (id: number) => void;
  nav: Nav;
  go: (view: ViewId, params?: Partial<Omit<Nav, "view">>) => void;
}

const Ctx = createContext<StoreShape>(null!);
export const useStore = () => useContext(Ctx);

const USER_KEY = "afrakomah-user";
async function saveRemote(db: DB) {
  await saveRelational(db);
}

async function loadRemote() {
  return loadRelational();
}

/** v4 → v5: adds live ward configs (beds were previously fixed at seed time). */
function migrateV4(d: DB): DB {
  return {
    ...d,
    v: 5,
    wards: (Object.keys(WARD_META) as (keyof typeof WARD_META)[]).map((w) => ({
      id: w,
      name: WARD_META[w].name.replace(/^Ward [A-Z] — /, ""),
      daily: WARD_META[w].daily,
    })),
  };
}

const HOME: Record<Role, ViewId> = {
  admin: "dashboard", doctor: "patients", nurse: "wards", reception: "patients",
  lab: "lab", pharmacist: "pharmacy", billing: "billing",
};

let toastSeq = 1;
let auditSeq = Date.now() % 100000;
let notifSeq = Date.now() % 100000;

export function StoreProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<DB>(emptyDB);
  const [user, setUser] = useState<Staff | null>(null);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [nav, setNav] = useState<Nav>({ view: "dashboard" });

  useEffect(() => {
    localStorage.removeItem("medicore-db-v5");
    localStorage.removeItem("medicore-db-v4");
    void loadRemote().then((remote) => { dbRef.current = remote; setDb(remote); }).catch((error: Error) => toast(`Supabase connection failed: ${error.message}`, "danger"));
  }, []);

  const dbRef = useRef(db);
  const userRef = useRef(user);
  userRef.current = user;

  /* Restore the signed-in workstation after the staff roster has loaded. */
  useEffect(() => {
    try {
      if (userRef.current) return;
      const id = localStorage.getItem(USER_KEY);
      if (!id) return;
      const s = dbRef.current.staff.find((x) => x.id === id);
      if (s && s.active) {
        setUser(s);
        setNav({ view: HOME[s.role] });
      }
    } catch {
      /* no stored session */
    }
  }, [db.staff]);

  const toast = useCallback((text: string, tone: ToastMsg["tone"] = "ok") => {
    const id = toastSeq++;
    setToasts((t) => [...t.slice(-3), { id, text, tone }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);
  const dismissToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const mutate = useCallback((fn: (d: DB) => void, opts?: MutateOpts) => {
    const u = userRef.current;
    const prev = dbRef.current;
    const next = structuredClone(prev);
    fn(next);
    if (opts?.audit && u) {
      next.audit.unshift({ id: `AU-${auditSeq++}`, at: nowISO(), user: u.name, role: u.role, action: opts.audit });
      next.audit = next.audit.slice(0, 120);
    }
    if (opts?.notify) {
      next.notifications.unshift({
        id: `N-${notifSeq++}`, at: nowISO(), icon: opts.notify.icon,
        text: opts.notify.text, read: false, roles: opts.notify.roles,
      });
      next.notifications = next.notifications.slice(0, 60);
    }
    dbRef.current = next;
    setDb(next);
    void saveRemote(next).catch((error: Error) => toast(`Could not save to Supabase: ${error.message}`, "danger"));
  }, []);

  /* ---------- staff-ID sign-in with server-side password verification ---------- */
  const login = useCallback(
    (name: string, role: Role, password: string, existingId?: string) => {
      void (async () => {
        try {
          const staffId = (existingId ?? name).trim().toUpperCase();
          const { data, error } = await supabase.rpc("verify_staff_login", { p_staff_id: staffId, p_password: password });
          if (error) { toast(`Sign-in failed: ${error.message}`, "danger"); return; }
          const row = Array.isArray(data) ? data[0] : data;
          if (!row || row.role !== role) { toast("Invalid staff ID, role, or password", "danger"); return; }
          const staff: Staff = { id: row.staff_id, name: row.full_name, role: row.role, dept: row.department, title: row.job_title, phone: row.phone, status: "on-duty", active: row.active, schedule: ["Mon", "Tue", "Wed", "Thu", "Fri"] };
          mutate((d) => { const current = d.staff.find((s) => s.id === staff.id); if (current) Object.assign(current, staff); else d.staff.push(staff); }, { audit: `${staff.name} signed in to the ${ROLE_META[role].label} workspace` });
          setUser(staff);
          localStorage.setItem(USER_KEY, staff.id);
          setNav({ view: HOME[role] });
          toast(`Welcome, ${staff.name} — ${ROLE_META[role].label} workspace`, "ok");
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          toast(`Sign-in failed: ${message}`, "danger");
        }
      })();
    },
    [mutate, toast]
  );

  const logout = useCallback(() => {
    mutate(() => {}, { audit: `${userRef.current?.name ?? "Staff"} signed out` });
    setUser(null);
    setNav({ view: "dashboard" });
    try {
      localStorage.removeItem(USER_KEY);
    } catch {
      /* ignore */
    }
  }, [mutate]);

  /* ---------- staff account provisioning (Reception) ---------- */
  const createAccount = useCallback(
    (a: NewAccount) => {
      if (userRef.current?.role !== "reception") {
        toast("Only reception can create staff accounts", "danger");
        return;
      }
      void (async () => {
        const id = a.staffId ?? nid("S", dbRef.current.staff.map((s) => s.id));
        const { data, error } = await supabase.rpc("create_staff_account", { p_staff_id: id, p_full_name: a.name.trim(), p_password: a.password, p_role: a.role, p_department: a.dept ?? ROLE_META[a.role].label, p_job_title: a.title ?? ROLE_META[a.role].label, p_phone: a.phone ?? "" });
        if (error) { toast(`Could not create account: ${error.message}`, "danger"); return; }
        const row = Array.isArray(data) ? data[0] : data;
        if (!row) { toast("Could not create account", "danger"); return; }
        mutate((d) => d.staff.push({ id: row.staff_id, name: row.full_name, role: row.role, dept: row.department, title: row.job_title, phone: row.phone, status: "off-duty", schedule: ["Mon", "Tue", "Wed", "Thu", "Fri"], active: row.active }), { audit: `Created ${ROLE_META[a.role].label} account for ${a.name}`, notify: { text: `New staff account: ${a.name} — ${ROLE_META[a.role].label}`, icon: "alert", roles: ["admin"] } });
        toast(`${a.name} added as ${ROLE_META[a.role].label}`, "ok");
      })();
    },
    [mutate, toast]
  );

  const go = useCallback((view: ViewId, params?: Partial<Omit<Nav, "view">>) => {
    setNav({ view, ...params });
    window.scrollTo({ top: 0 });
  }, []);

  const value = useMemo(
    () => ({ db, user, login, logout, mutate, createAccount, toast, toasts, dismissToast, nav, go }),
    [db, user, login, logout, mutate, createAccount, toast, toasts, dismissToast, nav, go]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/* ---------------- shared domain helpers ---------------- */

export function nid(prefix: string, ids: string[]) {
  const max = ids.reduce((m, id) => {
    const n = parseInt(id.split("-").pop() || "0", 10);
    return Number.isFinite(n) ? Math.max(m, n) : m;
  }, 0);
  return `${prefix}-${max + 1}`;
}

/** Adds a line item to the patient's open invoice today (creates one if needed). */
export function charge(d: DB, mrn: string, item: InvoiceItem) {
  let inv = d.invoices.find((i) => i.patientMrn === mrn && i.status !== "paid" && i.date === todayISO());
  if (!inv) {
    inv = { id: nid("INV", d.invoices.map((i) => i.id)), patientMrn: mrn, date: todayISO(), items: [], paid: 0, status: "unpaid" };
    d.invoices.unshift(inv);
  }
  inv.items.push(item);
}

export const invTotal = (items: InvoiceItem[]) => items.reduce((s, i) => s + i.amount, 0);
export const invBalance = (inv: { items: InvoiceItem[]; paid: number }) =>
  Math.max(0, invTotal(inv.items) - inv.paid);

export const invoiceStatus = (inv: { items: InvoiceItem[]; paid: number }): "unpaid" | "partial" | "paid" => {
  const t = invTotal(inv.items);
  if (inv.paid <= 0) return "unpaid";
  return inv.paid >= t - 0.001 ? "paid" : "partial";
};
