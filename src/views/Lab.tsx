import { useState } from "react";
import { useStore, nid, charge } from "../store";
import { LAB_CATALOG, LAB_GROUPS, fmtDate, fmtTime, timeAgo, ghs, nowISO } from "../data";
import type { LabOrder, LabStatus } from "../data";
import { Badge, Btn, Card, Field, Input, Modal, Select, StatusPill, Tabs, Empty, Avatar } from "../ui";
import { IFlask, ICheck, IPlus, IPrinter, IEye, ISyringe, IChevR } from "../icons";

const PRIORITY_TONE: Record<string, "neutral" | "warn" | "danger"> = { routine: "neutral", urgent: "warn", stat: "danger" };
const PIPELINE: LabStatus[] = ["ordered", "collected", "processing", "results", "verified"];

export default function LabView() {
  const { db, user, mutate, toast, go } = useStore();
  const [tab, setTab] = useState("all");
  const [enterFor, setEnterFor] = useState<LabOrder | null>(null);
  const [reportFor, setReportFor] = useState<LabOrder | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [expandedResults, setExpandedResults] = useState<string | null>(null);

  const canWork = user?.role === "lab";

  const advance = (o: LabOrder, to: LabStatus) => {
    const p = db.patients.find((x) => x.mrn === o.patientMrn);
    mutate(
      (d) => {
        d.labOrders.find((x) => x.id === o.id)!.status = to;
      },
      { audit: `Lab ${o.id} (${LAB_CATALOG[o.test].name}, ${p?.name}) moved to ${to}` }
    );
    toast(`${o.id} → ${to}`, "ok");
  };

  const verify = (o: LabOrder) => {
    const p = db.patients.find((x) => x.mrn === o.patientMrn);
    const doc = db.staff.find((s) => s.id === o.doctorId);
    mutate(
      (d) => {
        const l = d.labOrders.find((x) => x.id === o.id)!;
        l.status = "verified";
        l.verifiedBy = user?.name ?? "Lab";
        l.verifiedAt = nowISO();
      },
      {
        audit: `Verified ${LAB_CATALOG[o.test].name} results for ${p?.name} (${o.id})`,
        notify: { text: `Lab results verified: ${LAB_CATALOG[o.test].name} for ${p?.name} — ${doc?.name} notified automatically`, icon: "lab", roles: ["doctor", "admin"] },
      }
    );
    toast(`Results verified — ${doc?.name ?? "doctor"} notified automatically`, "ok");
  };

  const filtered = db.labOrders.filter((o) => tab === "all" || o.status === tab);
  const counts = (s: string) => db.labOrders.filter((o) => o.status === s).length;

  return (
    <div className="fade-up space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-lg font-extrabold text-ink">Laboratory</h1>
          <p className="text-xs text-ink-faint">Doctor orders → sample → processing → results → verification → doctor notified</p>
        </div>
      </div>

      {/* pipeline strip */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {PIPELINE.map((s, i) => (
          <div key={s} className={`rounded-xl border p-3 transition-all ${tab === s ? "border-med-400 bg-med-50" : "border-line bg-white hover:border-med-200"}`}>
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-ink-faint">{i + 1} · {s}</span>
              <StatusPill s={s} />
            </div>
            <p className="mt-1 font-mono text-2xl font-bold text-ink">{counts(s)}</p>
          </div>
        ))}
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        items={[{ k: "all", label: "All orders", count: db.labOrders.length }, ...PIPELINE.map((s) => ({ k: s, label: s, count: counts(s) }))]}
      />

      <Card className="overflow-x-auto p-4">
        <table className="w-full min-w-[820px] text-left text-xs">
          <thead>
            <tr className="border-b border-line text-[10px] uppercase tracking-wider text-ink-faint">
              <th className="py-2.5 pr-3 font-semibold">Order</th>
              <th className="py-2.5 pr-3 font-semibold">Patient</th>
              <th className="py-2.5 pr-3 font-semibold">Test</th>
              <th className="py-2.5 pr-3 font-semibold">Priority</th>
              <th className="py-2.5 pr-3 font-semibold">Requested by</th>
              <th className="py-2.5 pr-3 font-semibold">Ordered</th>
              <th className="py-2.5 pr-3 font-semibold">Status</th>
              <th className="py-2.5 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => {
              const p = db.patients.find((x) => x.mrn === o.patientMrn);
              const doc = db.staff.find((s) => s.id === o.doctorId);
              const hasResults = (o.results?.length ?? 0) > 0;
              return (
                <>
                <tr key={o.id} className="border-b border-line-soft/70 transition-colors last:border-0 hover:bg-med-50/40">
                  <td className="py-2.5 pr-3 font-mono font-bold text-med-700">{o.id}</td>
                  <td className="py-2.5 pr-3">
                    <button onClick={() => go("patients", { patient: o.patientMrn })} className="flex items-center gap-2 text-left">
                      <Avatar name={p?.name ?? "?"} size={26} />
                      <span><span className="block font-semibold text-ink hover:text-med-700">{p?.name}</span><span className="font-mono text-[9.5px] text-ink-faint">{o.patientMrn}</span></span>
                    </button>
                  </td>
                  <td className="py-2.5 pr-3"><span className="font-semibold text-ink">{LAB_CATALOG[o.test]?.name}</span><span className="ml-1.5 font-mono text-[10px] text-ink-faint">{ghs(o.price)}</span></td>
                  <td className="py-2.5 pr-3"><Badge tone={PRIORITY_TONE[o.priority]}>{o.priority.toUpperCase()}</Badge></td>
                  <td className="py-2.5 pr-3 text-ink-soft">{doc?.name}</td>
                  <td className="py-2.5 pr-3 font-mono text-ink-faint">{timeAgo(o.orderedAt)}</td>
                  <td className="py-2.5 pr-3"><StatusPill s={o.status} /></td>
                  <td className="py-2.5">
                    <div className="flex gap-1.5">
                      {canWork && o.status === "ordered" && <Btn variant="soft" size="xs" onClick={() => advance(o, "collected")}><ISyringe size={12} /> Collect</Btn>}
                      {canWork && o.status === "collected" && <Btn variant="soft" size="xs" onClick={() => advance(o, "processing")}><IFlask size={12} /> Process</Btn>}
                      {canWork && o.status === "processing" && <Btn size="xs" onClick={() => setEnterFor(o)}>Enter results</Btn>}
                      {canWork && o.status === "results" && <Btn size="xs" onClick={() => verify(o)}><ICheck size={12} /> Verify</Btn>}
                      {(hasResults || o.status === "results" || o.status === "verified") ? <Btn variant={expandedResults === o.id ? "soft" : "outline"} size="xs" onClick={() => setExpandedResults((current) => current === o.id ? null : o.id)}><IEye size={12} /> {expandedResults === o.id ? "Hide results" : "View results"}</Btn> : <span className="px-2 text-[10px] text-ink-faint">Awaiting results</span>}
                    </div>
                  </td>
                </tr>
                {expandedResults === o.id && hasResults && (
                  <tr className="border-b border-line-soft/70 bg-med-50/30">
                    <td colSpan={8} className="px-3 py-3">
                      <div className="rounded-lg border border-med-200 bg-white p-3">
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                          <p className="text-[11px] font-bold text-ink">Result values for doctor review</p>
                          <Btn variant="ghost" size="xs" onClick={() => setReportFor(o)}><IEye size={12} /> Open printable report</Btn>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {o.results!.map((result) => (
                            <div key={result.marker} className="rounded-md bg-paper/70 px-2.5 py-2">
                              <p className="text-[10px] font-semibold text-ink-faint">{result.marker}</p>
                              <p className={`font-mono text-sm font-bold ${result.flag === "H" || result.flag === "P" ? "text-alert" : result.flag === "L" ? "text-info" : "text-ink"}`}>{result.value} <span className="text-[10px] font-normal text-ink-faint">{result.unit}</span></p>
                              <p className="font-mono text-[9px] text-ink-faint">Reference: {result.ref}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
                </>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="py-8"><Empty icon={<IFlask size={24} />} title="No orders in this stage" /></div>}
      </Card>

      {enterFor && <ResultsModal order={enterFor} onClose={() => setEnterFor(null)} />}
      {reportFor && <ReportModal order={reportFor} onClose={() => setReportFor(null)} />}
      {showNew && <NewOrderModal onClose={() => setShowNew(false)} />}
    </div>
  );
}

/* ---------- result entry ---------- */

function ResultsModal({ order, onClose }: { order: LabOrder; onClose: () => void }) {
  const { db, user, mutate, toast } = useStore();
  const cat = LAB_CATALOG[order.test] ?? {
    name: order.test,
    price: order.price,
    markers: (order.results ?? []).map((result) => ({
      marker: result.marker,
      unit: result.unit,
      ref: result.ref,
      min: 0,
      max: 0,
      qual: true,
    })),
  };
  const p = db.patients.find((x) => x.mrn === order.patientMrn);
  const [vals, setVals] = useState<Record<string, string>>({});

  const save = () => {
    mutate(
      (d) => {
        const l = d.labOrders.find((x) => x.id === order.id)!;
        l.status = "verified";
        l.verifiedBy = user?.name ?? "Lab";
        l.verifiedAt = nowISO();
        l.results = cat.markers.map((m) => {
          const raw = (vals[m.marker] ?? "").trim();
          if (m.qual) {
            const positive = /pos|\+/i.test(raw);
            return { marker: m.marker, value: raw || "Negative", unit: m.unit, ref: m.ref, flag: positive ? ("P" as const) : ("-" as const) };
          }
          const v = parseFloat(raw);
          const flag = Number.isNaN(v) ? "-" : v < m.min ? ("L" as const) : v > m.max ? ("H" as const) : ("-" as const);
          return { marker: m.marker, value: Number.isNaN(v) ? raw || "—" : String(v), unit: m.unit, ref: m.ref, flag };
        });
      },
      { audit: `Entered and verified ${cat.name} results for ${p?.name} (${order.id})`, notify: { text: `Verified lab results sent to the requesting doctor: ${cat.name} for ${p?.name}`, icon: "lab", roles: ["doctor", "admin"] } }
    );
    toast("Results entered and verified — requesting doctor notified", "ok");
    onClose();
  };

  return (
    <Modal title={`Enter Results — ${cat.name}`} sub={`${order.id} · ${p?.name} (${order.patientMrn}) · H/L flags computed automatically against reference ranges`} onClose={onClose} w="max-w-lg"
      footer={<><Btn variant="ghost" onClick={onClose}>Cancel</Btn><Btn onClick={save}><ICheck size={14} /> Save results</Btn></>}>
      <div className="space-y-2">
        {cat.markers.map((m) => (
          <div key={m.marker} className="grid grid-cols-[1fr_110px_1fr] items-center gap-2 rounded-lg border border-line-soft bg-paper/50 px-3 py-2">
            <div>
              <p className="text-xs font-semibold text-ink">{m.marker}</p>
              <p className="font-mono text-[9.5px] text-ink-faint">Ref: {m.ref} {m.unit}</p>
            </div>
            <Input
              value={vals[m.marker] ?? ""}
              onChange={(e) => setVals((x) => ({ ...x, [m.marker]: e.target.value }))}
              placeholder={m.qual ? "Negative" : "0.0"}
              className="py-1.5 font-mono text-xs"
            />
            <span className="text-[10px] text-ink-faint">{m.qual ? "Type Positive / Negative" : m.unit || "—"}</span>
          </div>
        ))}
      </div>
    </Modal>
  );
}

/* ---------- printable report ---------- */

export function ReportModal({ order, onClose }: { order: LabOrder; onClose: () => void }) {
  const { db } = useStore();
  const cat = LAB_CATALOG[order.test] ?? {
    name: order.test,
    markers: (order.results ?? []).map((result) => ({
      marker: result.marker,
      unit: result.unit,
      ref: result.ref,
      min: 0,
      max: 0,
    })),
  };
  const p = db.patients.find((x) => x.mrn === order.patientMrn);
  const doc = db.staff.find((s) => s.id === order.doctorId);

  return (
    <Modal title="Laboratory Report" sub={`${order.id} · generated by Afrakomah HMS`} onClose={onClose} w="max-w-2xl" printable
      footer={<>
        <Btn variant="ghost" onClick={onClose}>Close</Btn>
        <Btn onClick={() => window.print()}><IPrinter size={14} /> Print report</Btn>
      </>}>
      <div className="rounded-lg border border-line p-5 text-xs">
        <div className="flex items-start justify-between border-b-2 border-pine-900 pb-3">
          <div>
            <p className="font-display text-base font-extrabold text-pine-900">Afrakomah General Hospital</p>
            <p className="text-[10px] text-ink-faint">14 Independence Ave, Accra · +233 30 555 0100 · lab@afrakomah.gh</p>
          </div>
          <div className="text-right">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-med-700">Laboratory Report</p>
            <p className="font-mono text-[10px] text-ink-faint">{order.id} · {fmtDate(order.orderedAt)} {fmtTime(order.orderedAt)}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 border-b border-line py-3 sm:grid-cols-4">
          <div><p className="text-[9px] uppercase tracking-wide text-ink-faint">Patient</p><p className="font-bold text-ink">{p?.name}</p></div>
          <div><p className="text-[9px] uppercase tracking-wide text-ink-faint">MRN</p><p className="font-mono font-bold text-ink">{order.patientMrn}</p></div>
          <div><p className="text-[9px] uppercase tracking-wide text-ink-faint">Requesting doctor</p><p className="font-semibold text-ink">{doc?.name}</p></div>
          <div><p className="text-[9px] uppercase tracking-wide text-ink-faint">Verified</p><p className="font-semibold text-ink">{order.verifiedBy} · {order.verifiedAt ? fmtDate(order.verifiedAt) : "—"}</p></div>
        </div>
        <p className="py-2.5 font-display text-[13px] font-bold text-ink">{cat.name} <span className="ml-2 font-mono text-[10px] font-normal text-ink-faint">Priority: {order.priority}</span></p>
        <table className="w-full text-left">
          <thead>
            <tr className="border-y border-line bg-paper/80 text-[9px] uppercase tracking-wider text-ink-faint">
              <th className="py-1.5 pr-3 font-semibold">Analyte</th>
              <th className="py-1.5 pr-3 font-semibold">Result</th>
              <th className="py-1.5 pr-3 font-semibold">Unit</th>
              <th className="py-1.5 pr-3 font-semibold">Reference range</th>
              <th className="py-1.5 font-semibold">Flag</th>
            </tr>
          </thead>
          <tbody>
            {(order.results ?? []).map((r) => (
              <tr key={r.marker} className="border-b border-line-soft/60">
                <td className="py-2 pr-3 font-semibold text-ink">{r.marker}</td>
                <td className={`py-2 pr-3 font-mono font-bold ${r.flag === "H" || r.flag === "P" ? "text-alert" : r.flag === "L" ? "text-info" : "text-ink"}`}>{r.value}</td>
                <td className="py-2 pr-3 text-ink-faint">{r.unit}</td>
                <td className="py-2 pr-3 font-mono text-ink-soft">{r.ref}</td>
                <td className="py-2">{r.flag !== "-" ? <Badge tone={r.flag === "L" ? "info" : "danger"}>{r.flag === "P" ? "Positive" : r.flag === "H" ? "High" : "Low"}</Badge> : <span className="text-ink-faint">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 rounded-md bg-paper/80 px-3 py-2 text-[10px] leading-relaxed text-ink-soft">
          H = High · L = Low · P = Positive. Results relate only to the sample tested. Please correlate clinically.
          Electronic signature applied — {order.verifiedBy}, Senior Lab Technician.
        </p>
        <div className="mt-4 flex items-end justify-between">
          <div>
            <p className="w-44 border-t border-ink pt-1 text-[9px] text-ink-faint">{order.verifiedBy} — {fmtDate(order.verifiedAt ?? order.orderedAt)}</p>
          </div>
          <p className="font-mono text-[9px] text-ink-faint">Afrakomah HMS · document {order.id}-R1</p>
        </div>
      </div>
    </Modal>
  );
}

/* ---------- new order ---------- */

function NewOrderModal({ onClose }: { onClose: () => void }) {
  const { db, mutate, toast } = useStore();
  const [patientMrn, setPatientMrn] = useState(db.patients[0]?.mrn ?? "");
  const [test, setTest] = useState("CBC");
  const [priority, setPriority] = useState<"routine" | "urgent" | "stat">("routine");
  const doctors = db.staff.filter((s) => s.role === "doctor");
  const [doctorId, setDoctorId] = useState(doctors[0]?.id ?? "");

  const save = () => {
    const p = db.patients.find((x) => x.mrn === patientMrn);
    mutate(
      (d) => {
        const id = nid("LAB", d.labOrders.map((l) => l.id));
        d.labOrders.unshift({ id, patientMrn, doctorId, test, priority, orderedAt: nowISO(), status: "ordered", price: LAB_CATALOG[test].price });
        charge(d, patientMrn, { desc: `Lab: ${LAB_CATALOG[test].name}`, amount: LAB_CATALOG[test].price, kind: "lab" });
      },
      { audit: `Created lab order ${LAB_CATALOG[test].name} for ${p?.name}`, notify: { text: `New lab order: ${LAB_CATALOG[test].name} for ${p?.name}`, icon: "lab", roles: ["lab", "admin", "doctor"] } }
    );
    toast(`Order created — ${ghs(LAB_CATALOG[test].price)} added to ${p?.name}'s bill`, "ok");
    onClose();
  };

  return (
    <Modal title="New Laboratory Order" sub="Charge is added to the patient's invoice automatically" onClose={onClose} w="max-w-md"
      footer={<><Btn variant="ghost" onClick={onClose}>Cancel</Btn><Btn onClick={save}><IPlus size={14} /> Create order</Btn></>}>
      <div className="space-y-3">
        <Field label="Patient">
          <Select value={patientMrn} onChange={(e) => setPatientMrn(e.target.value)}>
            {db.patients.map((p) => <option key={p.mrn} value={p.mrn}>{p.name} — {p.mrn}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Test">
            <Select value={test} onChange={(e) => setTest(e.target.value)}>
              {LAB_GROUPS.map(([group, keys]) => <optgroup key={group} label={group}>{keys.map((k) => <option key={k} value={k}>{LAB_CATALOG[k].name} · {ghs(LAB_CATALOG[k].price)}</option>)}</optgroup>)}
            </Select>
          </Field>
          <Field label="Priority">
            <Select value={priority} onChange={(e) => setPriority(e.target.value as typeof priority)}>
              <option value="routine">Routine</option><option value="urgent">Urgent</option><option value="stat">STAT</option>
            </Select>
          </Field>
        </div>
        <Field label="Requesting doctor">
          <Select value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
            {doctors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
        </Field>
        <p className="flex items-center gap-1.5 text-[11px] text-ink-faint"><IChevR size={11} /> Walk-in order — results will notify the requesting doctor on verification.</p>
      </div>
    </Modal>
  );
}
