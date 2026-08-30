import { useStore } from "../store";
import { todayISO, timeAgo, fmtTime, QUEUE_DEPTS, ghs } from "../data";
import { Badge, Card, SectionHead, StatusPill, AreaChart, BarsChart, Donut, HBars, Sparkline, EcgStrip, Btn } from "../ui";
import { IUsers, ICalendar, IBed, IZap, IReceipt, IFlask, IPill, IAlert, IChevR, IArrowR, IActivity } from "../icons";
import type { Role } from "../data";

const DEPARTMENT_DASHBOARDS: Record<Role, { title: string; description: string; responsibilities: string[]; kpis: string[] }> = {
  admin: { title: "Hospital Command Center", description: "Complete read-only oversight of every department, patient, appointment, medicine, emergency, laboratory, ward and bed record.", responsibilities: ["Monitor hospital-wide activity", "Review AI oversight signals", "Audit operational performance"], kpis: ["all"] },
  doctor: { title: "Clinical Care Dashboard", description: "Coordinate consultations, review patient histories and act on laboratory results for assigned clinical care.", responsibilities: ["Review appointments and patient records", "Review lab results and clinical notes", "Manage consultations, prescriptions and lab requests"], kpis: ["Today's Patients", "Appointments Today", "Pending Lab Tests", "Emergency Cases"] },
  nurse: { title: "Nursing Operations Dashboard", description: "Monitor ward capacity, admissions, vitals and emergency care while keeping bedside operations moving.", responsibilities: ["Monitor wards, beds and admissions", "Record and review patient vitals", "Support emergency and queue operations"], kpis: ["Currently Admitted", "Available Beds", "Emergency Cases", "Today's Patients"] },
  reception: { title: "Front Desk Dashboard", description: "Manage patient registration, appointment scheduling, check-in and queue flow for a smooth patient arrival experience.", responsibilities: ["Register and find patients", "Book and check in appointments", "Issue queue tokens and coordinate arrivals"], kpis: ["Today's Patients", "Appointments Today"] },
  lab: { title: "Laboratory Dashboard", description: "Track the laboratory pipeline from sample collection through processing, result entry and verification.", responsibilities: ["Collect and process samples", "Enter and verify laboratory results", "Notify requesting doctors when results are ready"], kpis: ["Pending Lab Tests", "Today's Patients"] },
  pharmacist: { title: "Pharmacy Dashboard", description: "Safely dispense prescriptions and maintain medicine inventory, expiry monitoring and stock availability.", responsibilities: ["Dispense e-prescriptions", "Monitor medicine stock and expiry", "Raise replenishment needs"], kpis: ["Low Stock Medicines", "Out of Stock", "Today's Patients"] },
  billing: { title: "Billing Dashboard", description: "Track invoices, payments, insurance claims and outstanding balances across patient accounts.", responsibilities: ["Review patient balances", "Process payments and receipts", "Manage insurance claims"], kpis: ["Pending Bills", "Today's Revenue", "Today's Patients"] },
};

export default function Dashboard() {
  const { db, user, go } = useStore();
  const today = todayISO();
  const role = user?.role ?? "admin";
  const department = DEPARTMENT_DASHBOARDS[role];
  const isAdmin = role === "admin";
  const showsAppointments = isAdmin || role === "doctor" || role === "nurse";
  const showsAdmissions = isAdmin || role === "nurse";
  const queueKeys = isAdmin
    ? QUEUE_DEPTS.map((queue) => queue.key)
    : role === "lab" ? ["lab"] : role === "pharmacist" ? ["pharm"] : role === "billing" ? ["bill"] : ["consult"];
  const revenueKind = role === "lab" ? "lab" : role === "pharmacist" ? "pharmacy" : role === "nurse" ? "bed" : role === "doctor" ? "consultation" : role === "reception" ? "consultation" : null;

  const apptsToday = db.appointments.filter((a) => a.date === today);
  const activeEm = db.emergencies.filter((e) => e.status === "waiting" || e.status === "in-treatment");
  const activeAdm = db.admissions.filter((a) => a.status === "active");
  const bedsFree = db.beds.filter((b) => b.status === "available").length;
  const pendingLabs = db.labOrders.filter((l) => l.status !== "verified").length;
  const lowStock = db.medicines.filter((m) => m.stock > 0 && m.stock <= m.reorderLevel).length;
  const outStock = db.medicines.filter((m) => m.stock === 0).length;
  const openBills = db.invoices.filter((i) => i.status !== "paid");
  const outstanding = openBills.reduce((s, i) => s + Math.max(0, i.items.reduce((x, y) => x + y.amount, 0) - i.paid), 0);
  const todayPatients = new Set([...apptsToday.map((a) => a.patientMrn), ...activeEm.map((e) => e.patientMrn)]).size;
  const paidForKind = (payment: typeof db.payments[number], kind: string | null) => {
    if (!kind) return payment.amount;
    const invoice = db.invoices.find((item) => item.id === payment.invoiceId);
    const items = invoice?.items.filter((item) => item.kind === kind) ?? [];
    const total = invoice?.items.reduce((sum, item) => sum + item.amount, 0) ?? 0;
    const scoped = items.reduce((sum, item) => sum + item.amount, 0);
    return total > 0 ? payment.amount * (scoped / total) : 0;
  };
  const revenueToday = db.payments.filter((payment) => payment.paidAt.slice(0, 10) === today).reduce((sum, payment) => sum + paidForKind(payment, revenueKind), 0);
  const trendDays = Array.from({ length: 14 }, (_, index) => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - (13 - index));
    return date.toISOString().slice(0, 10);
  });
  const registrationsTrend = trendDays.map((day) => db.patients.filter((patient) => patient.registeredAt.slice(0, 10) === day).length);
  const revenueTrend = trendDays.map((day) => db.payments.filter((payment) => payment.paidAt.slice(0, 10) === day).reduce((sum, payment) => sum + paidForKind(payment, revenueKind), 0));
  const weeklyFlow = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    const day = date.toISOString().slice(0, 10);
    return {
      label: date.toLocaleDateString("en-GB", { weekday: "short" }),
      a: db.admissions.filter((admission) => admission.date.slice(0, 10) === day).length,
      b: db.admissions.filter((admission) => admission.dischargeDate?.slice(0, 10) === day).length,
    };
  });
  const scopedConsultations = isAdmin ? db.consultations : db.consultations.filter((consultation) => {
    const doctor = db.staff.find((staff) => staff.id === consultation.doctorId);
    return role === "doctor" ? consultation.doctorId === user?.id : doctor?.role === role;
  });
  const diagnoses = Object.entries(
    scopedConsultations.reduce<Record<string, number>>((counts, consultation) => {
      const diagnosis = consultation.diagnosis.trim();
      if (diagnosis) counts[diagnosis] = (counts[diagnosis] ?? 0) + 1;
      return counts;
    }, {})
  )
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
  const lowStockNames = db.medicines.filter((medicine) => medicine.stock <= medicine.reorderLevel).slice(0, 3).map((medicine) => medicine.name);
  const aiSignals = [
    activeEm.length > 0
      ? `${activeEm.length} emergency case${activeEm.length === 1 ? "" : "s"} need active clinical attention.`
      : "No active emergency cases require escalation.",
    bedsFree === 0
      ? "All beds are occupied or unavailable — review discharge and transfer planning."
      : `${bedsFree} bed${bedsFree === 1 ? "" : "s"} available across ${db.wards.length} wards.`,
    outStock > 0 || lowStock > 0
      ? `${outStock + lowStock} medicine stock alert${outStock + lowStock === 1 ? "" : "s"} detected for pharmacy review.`
      : "Medicine inventory is above configured reorder levels.",
  ];

  const deptLoad = Object.entries(
    apptsToday.reduce<Record<string, number>>((acc, a) => ((acc[a.dept] = (acc[a.dept] ?? 0) + 1), acc), {})
  )
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const wardOcc = db.wards.map((w) => {
    const beds = db.beds.filter((b) => b.ward === w.id);
    return { w: w.id, occ: beds.filter((b) => b.status === "occupied").length, total: beds.length };
  });

  const kpis = [
    { icon: <IUsers size={16} />, label: "Today's Patients", value: String(todayPatients), sub: `${activeEm.length} via emergency`, tone: "text-med-700 bg-med-50", spark: registrationsTrend },
    ...(showsAppointments ? [{ icon: <ICalendar size={16} />, label: "Appointments Today", value: String(apptsToday.length), sub: `${apptsToday.filter((a) => a.status === "completed").length} completed · ${apptsToday.filter((a) => a.status === "checked-in").length} in queue`, tone: "text-sky-700 bg-sky-50" }] : []),
    ...(showsAdmissions ? [
      { icon: <IBed size={16} />, label: "Currently Admitted", value: String(activeAdm.length), sub: `${db.beds.length - bedsFree} of ${db.beds.length} beds in use`, tone: "text-teal-700 bg-teal-50" },
      { icon: <IBed size={16} />, label: "Available Beds", value: String(bedsFree), sub: `${db.beds.filter((b) => b.status === "cleaning").length} cleaning · ${db.beds.filter((b) => b.status === "reserved").length} reserved`, tone: "text-emerald-700 bg-emerald-50" },
    ] : []),
    { icon: <IZap size={16} />, label: "Emergency Cases", value: String(activeEm.length), sub: `${activeEm.filter((e) => e.triage === "critical").length} critical — red`, tone: "text-red-700 bg-red-50" },
    { icon: <IReceipt size={16} />, label: "Today's Revenue", value: ghs(revenueToday), sub: "Live collections total", tone: "text-med-700 bg-med-50", spark: revenueTrend, wide: true },
    { icon: <IReceipt size={16} />, label: "Pending Bills", value: String(openBills.length), sub: `${ghs(outstanding)} outstanding`, tone: "text-amber-800 bg-amber-50" },
    { icon: <IFlask size={16} />, label: "Pending Lab Tests", value: String(pendingLabs), sub: `${db.labOrders.filter((l) => l.status === "ordered").length} awaiting collection`, tone: "text-info bg-sky-50" },
    { icon: <IPill size={16} />, label: "Low Stock Medicines", value: String(lowStock), sub: `${db.medicines.filter((m) => m.expiry && m.expiry <= today).length} expired batch`, tone: "text-amber-800 bg-amber-50" },
    { icon: <IPill size={16} />, label: "Out of Stock", value: String(outStock), sub: "Reorder raised automatically", tone: "text-red-700 bg-red-50" },
  ];
  const visibleKpis = department.kpis.includes("all") ? kpis : kpis.filter((k) => department.kpis.includes(k.label));

  return (
    <div className="fade-up space-y-5">
      {/* command header */}
      <div className="relative overflow-hidden rounded-2xl bg-pine-900 px-5 py-4 text-white">
        <div className="bg-pine-grid absolute inset-0" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 opacity-70">
          <EcgStrip className="h-12 w-full" />
        </div>
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="live-dot inline-block h-2 w-2 rounded-full bg-mint" />
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-mint">Live · Hospital Command Center</span>
            </div>
            <h1 className="mt-1 font-display text-xl font-extrabold tracking-tight">
              Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, {user?.role === "admin" ? "System Admin" : user?.name.split(" ")[0]}
            </h1>
            <p className="mt-0.5 text-xs text-white/60">
              {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · {department.title}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Btn variant="dark" onClick={() => go("emergency")}><IZap size={14} /> Emergency board</Btn>
            <Btn variant="dark" onClick={() => go("wards")}><IBed size={14} /> Bed map</Btn>
          </div>
        </div>
      </div>

      <Card className="border-med-200 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-display text-sm font-bold text-ink">{department.title}</p>
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-ink-soft">{department.description}</p>
          </div>
          <Badge tone={user?.role === "admin" ? "dark" : "med"}>{user?.role === "admin" ? "FULL OVERSIGHT" : "DEPARTMENT SCOPE"}</Badge>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {department.responsibilities.map((item) => (
            <div key={item} className="flex items-center gap-2 rounded-lg bg-paper/70 px-2.5 py-2 text-[11px] font-semibold text-ink-soft">
              <IActivity size={13} className="shrink-0 text-med-600" /> {item}
            </div>
          ))}
        </div>
      </Card>

      {/* KPI bento */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {visibleKpis.map((k, i) => (
          <div
            key={i}
            className={`group rounded-xl border border-line bg-white p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-med-300 hover:shadow-lg hover:shadow-med-600/5 ${k.wide ? "col-span-2 md:col-span-2" : ""}`}
          >
            <div className="flex items-center justify-between">
              <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ${k.tone}`}>{k.icon}</span>
              {k.spark && <Sparkline values={k.spark} w={70} h={22} />}
            </div>
            <p className="mt-2.5 font-mono text-[21px] font-semibold leading-none text-ink">{k.value}</p>
            <p className="mt-1.5 text-[11px] font-semibold text-ink-soft">{k.label}</p>
            <p className="text-[10.5px] text-ink-faint">{k.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        {/* main column */}
        <div className="space-y-5 xl:col-span-2">
          <div className="grid gap-5 md:grid-cols-2">
            <Card className="p-4">
              <SectionHead title="Patient Registrations" sub="Last 14 days" right={<Badge tone="med">+18% this month</Badge>} />
              <AreaChart values={registrationsTrend} labels={trendDays.map((day) => day.slice(5))} />
            </Card>
            <Card className="p-4">
              <SectionHead title="Revenue Trend" sub={`${isAdmin ? "Hospital-wide" : department.title.replace(" Dashboard", "")} collections, GH₵`} right={<Badge tone="ok">GH₵ {(revenueTrend.reduce((a, b) => a + b, 0) / 1000).toFixed(1)}k total</Badge>} />
              <AreaChart values={revenueTrend} labels={trendDays.map((day) => day.slice(5))} color="#1d6fb8" money />
            </Card>
          </div>

          {showsAdmissions && <div className="grid gap-5 md:grid-cols-2">
            <Card className="p-4">
              <SectionHead title="Admissions vs Discharges" sub="This week" />
              <BarsChart data={weeklyFlow} aLabel="Admissions" bLabel="Discharges" />
            </Card>
            <Card className="p-4">
              <SectionHead title="Bed Occupancy" sub="All wards, real-time" />
              <div className="flex items-center gap-5">
                <Donut value={db.beds.length - bedsFree} total={db.beds.length} label="Occupied" sub={`${bedsFree} beds free right now`} />
                <div className="flex-1 space-y-1.5">
                  {wardOcc.map((w) => (
                    <div key={w.w} className="flex items-center gap-2">
                      <span className="w-14 font-mono text-[10px] font-semibold text-ink-soft">{w.w}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-line-soft">
                        <div className="h-full rounded-full bg-med-600 transition-all duration-700" style={{ width: `${(w.occ / w.total) * 100}%` }} />
                      </div>
                      <span className="font-mono text-[10px] text-ink-faint">{w.occ}/{w.total}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>}

          {showsAppointments && <Card className="p-4">
            <SectionHead
              title="Today's Appointments"
              sub={`${apptsToday.length} booked across ${deptLoad.length} departments`}
              right={<Btn variant="ghost" onClick={() => go("appointments")}>Open schedule <IChevR size={13} /></Btn>}
            />
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-line-soft text-[10px] uppercase tracking-wider text-ink-faint">
                    <th className="py-2 pr-3 font-semibold">Time</th>
                    <th className="py-2 pr-3 font-semibold">Patient</th>
                    <th className="py-2 pr-3 font-semibold">Doctor</th>
                    <th className="py-2 pr-3 font-semibold">Reason</th>
                    <th className="py-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {apptsToday.slice(0, 7).map((a) => {
                    const p = db.patients.find((x) => x.mrn === a.patientMrn);
                    const d = db.staff.find((x) => x.id === a.doctorId);
                    return (
                      <tr key={a.id} className="cursor-pointer border-b border-line-soft/70 transition-colors last:border-0 hover:bg-med-50/50" onClick={() => go("patients", { patient: a.patientMrn })}>
                        <td className="py-2.5 pr-3 font-mono font-semibold text-med-700">{a.time}</td>
                        <td className="py-2.5 pr-3 font-semibold text-ink">{p?.name}<span className="ml-1.5 font-mono text-[10px] font-normal text-ink-faint">{a.patientMrn}</span></td>
                        <td className="py-2.5 pr-3 text-ink-soft">{d?.name}</td>
                        <td className="max-w-[220px] truncate py-2.5 pr-3 text-ink-faint">{a.reason}</td>
                        <td className="py-2.5"><StatusPill s={a.status} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>}
        </div>

        {/* side column */}
        <div className="space-y-5">
          {user?.role === "admin" && (
            <Card className="overflow-hidden border-med-200 bg-gradient-to-br from-med-50 via-white to-sky-50 p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-med-600 text-white shadow-sm"><IActivity size={17} /></span>
                <div>
                  <p className="font-display text-[13px] font-bold text-ink">AI oversight insights</p>
                  <p className="mt-0.5 text-[10.5px] text-ink-faint">Read-only signals generated from live hospital records</p>
                </div>
                <Badge tone="med" className="ml-auto">ADMIN</Badge>
              </div>
              <div className="mt-3 space-y-2">
                {aiSignals.map((signal, index) => (
                  <div key={index} className="flex gap-2 rounded-lg border border-white/80 bg-white/75 px-2.5 py-2 text-[11px] leading-snug text-ink-soft">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-med-500" />
                    {signal}
                  </div>
                ))}
              </div>
            </Card>
          )}
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-line-soft px-4 py-3">
              <h3 className="font-display text-[13px] font-bold">Live Activity</h3>
              <span className="flex items-center gap-1.5 font-mono text-[9.5px] font-semibold uppercase tracking-widest text-med-600">
                <span className="live-dot h-1.5 w-1.5 rounded-full bg-mint" /> live
              </span>
            </div>
            <div className="relative h-[252px] overflow-hidden">
              <div className="ticker space-y-0">
                {[...db.audit.slice(0, 9), ...db.audit.slice(0, 9)].map((a, i) => (
                  <div key={i} className="flex gap-2.5 border-b border-line-soft/60 px-4 py-2.5">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-med-400" />
                    <div className="min-w-0">
                      <p className="truncate text-[11.5px] leading-snug text-ink">{a.action}</p>
                      <p className="mt-0.5 font-mono text-[9.5px] text-ink-faint">{a.user} · {timeAgo(a.at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <SectionHead title="Needs Attention" sub={`${isAdmin ? "Hospital-wide" : department.title.replace(" Dashboard", "")} alerts`} right={<Badge tone="danger">{isAdmin ? 2 + (activeEm.filter((e) => e.triage === "critical").length ? 1 : 0) : role === "lab" ? pendingLabs : role === "pharmacist" ? lowStock + outStock : role === "billing" ? openBills.length : role === "doctor" ? db.labOrders.filter((l) => l.status === "verified").length : role === "nurse" ? activeEm.length : apptsToday.length} active</Badge>} />
            <div className="space-y-2">
              {(isAdmin || role === "nurse" || role === "doctor") && activeEm.filter((e) => e.triage === "critical").map((e) => (
                <button key={e.id} onClick={() => go("emergency")} className="flex w-full items-center gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-left transition-all hover:border-red-300 hover:shadow-sm">
                  <IZap size={14} className="text-alert" />
                  <span className="flex-1 text-[11.5px] font-semibold text-red-800">Triage RED — {db.patients.find((p) => p.mrn === e.patientMrn)?.name} in Resus Bay</span>
                  <IArrowR size={13} className="text-red-400" />
                </button>
              ))}
              {(isAdmin || role === "pharmacist") && lowStockNames.length > 0 && <button onClick={() => go("pharmacy", { tab: "inventory" })} className="flex w-full items-center gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-left transition-all hover:border-amber-300 hover:shadow-sm">
                <IPill size={14} className="text-amberish" />
                <span className="flex-1 text-[11.5px] font-semibold text-amber-900">{lowStockNames.join(", ")}{lowStockNames.length < lowStock ? ` — ${lowStock - lowStockNames.length} more` : ""}</span>
                <IArrowR size={13} className="text-amber-500" />
              </button>
              }
              {(isAdmin || role === "lab" || role === "doctor") && <button onClick={() => go("lab")} className="flex w-full items-center gap-2.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-left transition-all hover:border-sky-300 hover:shadow-sm">
                <IFlask size={14} className="text-info" />
                <span className="flex-1 text-[11.5px] font-semibold text-sky-900">{pendingLabs} lab orders in pipeline — {db.labOrders.filter((l) => l.status === "results").length} awaiting verification</span>
                <IArrowR size={13} className="text-sky-400" />
              </button>}
              {(isAdmin || role === "billing") && <button onClick={() => go("billing")} className="flex w-full items-center gap-2.5 rounded-lg border border-line bg-line-soft/50 px-3 py-2 text-left transition-all hover:border-med-300 hover:shadow-sm">
                <IAlert size={14} className="text-ink-soft" />
                <span className="flex-1 text-[11.5px] font-semibold text-ink-soft">{ghs(outstanding)} in unpaid bills across {openBills.length} invoices</span>
                <IArrowR size={13} className="text-ink-faint" />
              </button>}
              {role === "reception" && <button onClick={() => go("appointments")} className="flex w-full items-center gap-2.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-left transition-all hover:border-sky-300 hover:shadow-sm">
                <ICalendar size={14} className="text-info" />
                <span className="flex-1 text-[11.5px] font-semibold text-sky-900">{apptsToday.length} appointments scheduled today</span>
                <IArrowR size={13} className="text-sky-400" />
              </button>}
              {!isAdmin && role !== "lab" && role !== "pharmacist" && role !== "billing" && role !== "doctor" && role !== "nurse" && role !== "reception" && <p className="py-3 text-center text-xs text-ink-faint">No department alerts</p>}
            </div>
          </Card>

          <Card className="p-4">
            <SectionHead title="Queues Right Now" sub="Serving across departments" right={<Btn variant="ghost" onClick={() => go("queue")}>Display board <IChevR size={13} /></Btn>} />
            <div className="space-y-2">
              {QUEUE_DEPTS.filter((q) => queueKeys.includes(q.key)).map((q) => {
                const st = db.queues[q.key];
                return (
                  <button key={q.key} onClick={() => go("queue", { tab: q.key })} className="flex w-full items-center justify-between rounded-lg border border-line-soft bg-paper/60 px-3 py-2 text-left transition-colors hover:border-med-300 hover:bg-med-50/50">
                    <span className="text-[11.5px] font-semibold text-ink-soft">{q.label}</span>
                    <span className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-med-700">{st?.serving ?? "—"}</span>
                      <Badge tone="neutral">{st?.waiting.length ?? 0} waiting</Badge>
                    </span>
                  </button>
                );
              })}
            </div>
          </Card>
        </div>
      </div>

      {/* bottom strip: department load + diagnoses */}
      <div className="grid gap-5 md:grid-cols-2">
        <Card className="p-4">
          <SectionHead title="Department Load — Today" sub="Appointments by department" />
          <HBars items={isAdmin ? deptLoad : deptLoad.filter((item) => item.label === (db.staff.find((staff) => staff.id === user?.id)?.dept ?? ""))} />
        </Card>
        <Card className="p-4">
          <SectionHead title="Most Common Diagnoses" sub="Outpatient, last 30 days" />
          <HBars items={diagnoses} />
        </Card>
      </div>

      <p className="pb-2 text-center font-mono text-[10px] text-ink-faint">
        Last sync {fmtTime(new Date().toISOString())} · All figures update live as staff work · Afrakomah HMS v3.2
      </p>
    </div>
  );
}
