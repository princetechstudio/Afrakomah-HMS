/* ============================================================
  Afrakomah HMS — data model, catalogs and helpers
   ============================================================ */

export type Role =
  | "admin"
  | "doctor"
  | "nurse"
  | "reception"
  | "lab"
  | "pharmacist"
  | "billing";

export type ViewId =
  | "dashboard"
  | "patients"
  | "appointments"
  | "queue"
  | "doctors"
  | "wards"
  | "lab"
  | "pharmacy"
  | "inventory"
  | "emergency"
  | "billing"
  | "insurance"
  | "staff"
  | "reports"
  | "notifications"
  | "settings";

export interface Staff {
  id: string;
  name: string;
  password?: string;
  role: Role;
  dept: string;
  title: string;
  phone: string;
  status: "on-duty" | "off-duty" | "on-leave";
  room?: string;
  specialty?: string;
  schedule: string[];
  active: boolean;
  email?: string;
}

export interface Patient {
  mrn: string;
  nationalId: string;
  name: string;
  dob: string;
  gender: "Male" | "Female";
  phone: string;
  address: string;
  bloodGroup: string;
  allergies: string[];
  insurance: { provider: string; memberNo: string; type: string; expiry: string } | null;
  nextOfKin: { name: string; phone: string; relation: string };
  history: string[];
  medications: string[];
  registeredAt: string;
  status: "outpatient" | "admitted" | "emergency" | "discharged";
  financiallyClearedAt?: string;
  financiallyClearedBy?: string;
}

export type ApptStatus =
  | "scheduled"
  | "checked-in"
  | "in-consultation"
  | "completed"
  | "cancelled";

export interface Appointment {
  id: string;
  patientMrn: string;
  doctorId: string;
  dept: string;
  date: string;
  time: string;
  type: "General" | "Follow-up" | "Specialist" | "Procedure";
  reason: string;
  status: ApptStatus;
  queueNo?: string;
}

export interface Vitals {
  temp: number;
  bpSys: number;
  bpDia: number;
  pulse: number;
  resp: number;
  spo2: number;
  weight?: number;
  height?: number;
  takenAt: string;
  by: string;
}

export interface PatientVitals {
  patientMrn: string;
  v: Vitals;
}

export interface LabResultRow {
  marker: string;
  value: string;
  unit: string;
  ref: string;
  flag: "H" | "L" | "P" | "-";
}

export type LabStatus = "ordered" | "collected" | "processing" | "results" | "verified";

export interface LabOrder {
  id: string;
  patientMrn: string;
  doctorId: string;
  test: string;
  priority: "routine" | "urgent" | "stat";
  orderedAt: string;
  status: LabStatus;
  price: number;
  results?: LabResultRow[];
  verifiedBy?: string;
  verifiedAt?: string;
  note?: string;
}

export interface RxItem {
  medId: string;
  name: string;
  qty: number;
  dose: string;
  freq: string;
  duration: string;
  unitPrice: number;
}

export interface RxOrder {
  id: string;
  patientMrn: string;
  doctorId: string;
  date: string;
  status: "pending" | "dispensed";
  items: RxItem[];
  dispensedBy?: string;
  dispensedAt?: string;
}

export interface Medicine {
  id: string;
  name: string;
  category: string;
  batch: string;
  supplier: string;
  stock: number;
  unit: string;
  buyPrice: number;
  sellPrice: number;
  expiry: string;
  location: string;
  reorderLevel: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  stock: number;
  unit: string;
  reorderLevel: number;
  location: string;
  lastRestocked: string;
}

export interface InvoiceItem {
  desc: string;
  amount: number;
  kind: "consultation" | "lab" | "pharmacy" | "bed" | "procedure" | "other";
}

export interface Invoice {
  id: string;
  patientMrn: string;
  date: string;
  items: InvoiceItem[];
  paid: number;
  method?: string;
  status: "unpaid" | "partial" | "paid";
}

export interface WardConfig {
  id: string;
  name: string;
  daily: number;
}

export interface Bed {
  id: string;
  ward: string;
  status: "available" | "occupied" | "cleaning" | "reserved";
  patientMrn?: string;
}

export interface Admission {
  id: string;
  patientMrn: string;
  bedId: string;
  doctorId: string;
  date: string;
  diagnosis: string;
  status: "active" | "discharged";
  dischargeDate?: string;
  dailyCharge: number;
  notes: { at: string; by: string; text: string }[];
}

export interface MaternityRecord {
  id: string;
  motherMrn: string;
  createdAt: string;
  gravida: string;
  parity: string;
  lmp: string;
  edd: string;
  investigations: { bloodGroup: string; hiv: string; hbsag: string; vdrl: string; urine: string; hb: string };
  deliveryDate: string;
  deliveryOutcome: string;
  deliveryMode: string;
  maternalCondition: string;
  maternalDischargeDate: string;
  breastfeedingStarted: string;
  postpartumNotes: string;
  babySex: string;
  numberOfBabies: string;
  birthWeight: string;
  length: string;
  headCircumference: string;
  apgar1: string;
  apgar5: string;
  resuscitation: string;
  complications: string;
  immunizations: { vitaminK: string; bcg: string; hepatitisB: string; oralPolio: string };
  babyConditionAtDischarge: string;
  nurseNotes: { at: string; by: string; text: string }[];
}

export type TriageLevel = "critical" | "urgent" | "moderate" | "stable";

export interface EmergencyCase {
  id: string;
  patientMrn: string;
  arrival: string;
  triage: TriageLevel;
  symptoms: string;
  vitals?: Partial<Vitals>;
  doctorId?: string;
  status: "waiting" | "in-treatment" | "admitted" | "discharged";
  disposition?: string;
}

export interface Claim {
  id: string;
  patientMrn: string;
  provider: string;
  invoiceId: string;
  amount: number;
  date: string;
  status: "pending" | "submitted" | "approved" | "rejected" | "paid";
}

export interface Consultation {
  id: string;
  patientMrn: string;
  doctorId: string;
  date: string;
  complaint: string;
  symptoms: string[];
  vitals: Vitals;
  examination: string;
  diagnosis: string;
  treatment: string;
  notes: string;
  followUp?: string;
  rxId?: string;
  labIds: string[];
}

export interface Notif {
  id: string;
  at: string;
  icon: "appt" | "lab" | "rx" | "stock" | "bed" | "bill" | "claim" | "alert" | "vitals";
  text: string;
  read: boolean;
  roles: Role[];
}

export interface AuditEntry {
  id: string;
  at: string;
  user: string;
  role: Role;
  action: string;
}

export interface QueueState {
  serving: string | null;
  waiting: string[];
  seq: number;
}

export interface DB {
  v: number;
  patients: Patient[];
  staff: Staff[];
  appointments: Appointment[];
  consultations: Consultation[];
  labOrders: LabOrder[];
  rxOrders: RxOrder[];
  medicines: Medicine[];
  inventory: InventoryItem[];
  invoices: Invoice[];
  wards: WardConfig[];
  beds: Bed[];
  admissions: Admission[];
  maternityRecords: MaternityRecord[];
  emergencies: EmergencyCase[];
  claims: Claim[];
  notifications: Notif[];
  audit: AuditEntry[];
  queues: Record<string, QueueState>;
  vitalsLog: PatientVitals[];
  trends: { registrations: number[]; revenue: number[]; labels: string[] };
}

export const ROLES: Role[] = ["admin", "doctor", "nurse", "reception", "lab", "pharmacist", "billing"];

/* ---------------- helpers ---------------- */

export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const dISO = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const nowISO = () => new Date().toISOString();

export const fmtDate = (iso: string) => {
  const d = new Date(iso.length === 10 ? iso + "T12:00:00" : iso);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

export const fmtShort = (iso: string) => {
  const d = new Date(iso.length === 10 ? iso + "T12:00:00" : iso);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
};

export const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

export const timeAgo = (iso: string) => {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

export const minsSince = (iso: string) =>
  Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));

export const ghs = (n: number) =>
  "GH₵ " + n.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const ageFrom = (dob: string) => {
  const b = new Date(dob);
  const t = new Date();
  let a = t.getFullYear() - b.getFullYear();
  if (t.getMonth() < b.getMonth() || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) a--;
  return a;
};

export const initials = (name: string) =>
  name
    .replace(/^(Dr\.|Prof\.|Mr\.|Mrs\.|Ms\.|Nurse)\s+/i, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");

export const hoursAgoISO = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();

export const atToday = (hh: number, mm = 0) => {
  const d = new Date();
  d.setHours(hh, mm, 0, 0);
  return d.toISOString();
};

/* ---------------- catalogs ---------------- */

export const ROLE_META: Record<Role, { label: string; blurb: string }> = {
  admin: { label: "Administrator", blurb: "Full system control" },
  doctor: { label: "Doctor", blurb: "Consultations & records" },
  nurse: { label: "Nurse", blurb: "Wards & vitals" },
  reception: { label: "Receptionist", blurb: "Registration & booking" },
  lab: { label: "Lab Technician", blurb: "Samples & results" },
  pharmacist: { label: "Pharmacist", blurb: "Dispensing & stock" },
  billing: { label: "Billing Officer", blurb: "Invoices & claims" },
};

export const LAB_CATALOG: Record<
  string,
  { name: string; price: number; markers: { marker: string; unit: string; ref: string; min: number; max: number; qual?: boolean }[] }
> = {
  CBC: {
    name: "Full Blood Count (FBC)",
    price: 100,
    markers: [
      { marker: "WBC", unit: "×10⁹/L", ref: "4.0 – 11.0", min: 4, max: 11 },
      { marker: "RBC", unit: "×10¹²/L", ref: "4.5 – 5.9", min: 4.5, max: 5.9 },
      { marker: "Hemoglobin", unit: "g/dL", ref: "13.0 – 17.0", min: 13, max: 17 },
      { marker: "Hematocrit", unit: "%", ref: "40 – 52", min: 40, max: 52 },
      { marker: "Platelets", unit: "×10⁹/L", ref: "150 – 450", min: 150, max: 450 },
    ],
  },
  RBS: {
    name: "Random Blood Sugar",
    price: 30,
    markers: [{ marker: "Glucose (random)", unit: "mmol/L", ref: "3.9 – 7.8", min: 3.9, max: 7.8 }],
  },
  MP: {
    name: "Blood Film for Malaria Parasites (BF for MPS)",
    price: 50,
    markers: [{ marker: "Malaria Parasite", unit: "", ref: "Negative", min: 0, max: 0, qual: true }],
  },
  UA: {
    name: "Urine Routine Examination (Urine R/E)",
    price: 50,
    markers: [
      { marker: "Colour", unit: "", ref: "Straw yellow", min: 0, max: 0, qual: true },
      { marker: "Appearance", unit: "", ref: "Clear", min: 0, max: 0, qual: true },
      { marker: "pH", unit: "", ref: "4.5 – 8.0", min: 4.5, max: 8 },
      { marker: "Specific gravity", unit: "", ref: "1.005 – 1.030", min: 1.005, max: 1.03 },
      { marker: "Leukocytes", unit: "", ref: "Negative", min: 0, max: 0, qual: true },
      { marker: "Bilirubin", unit: "", ref: "Negative", min: 0, max: 0, qual: true },
      { marker: "Urobilinogen", unit: "", ref: "Normal", min: 0, max: 0, qual: true },
      { marker: "Blood", unit: "", ref: "Negative", min: 0, max: 0, qual: true },
      { marker: "Nitrite", unit: "", ref: "Negative", min: 0, max: 0, qual: true },
      { marker: "Protein", unit: "", ref: "Negative", min: 0, max: 0, qual: true },
      { marker: "Glucose", unit: "", ref: "Negative", min: 0, max: 0, qual: true },
      { marker: "Ketones", unit: "", ref: "Negative", min: 0, max: 0, qual: true },
      { marker: "Epithelial cells", unit: "/HPF", ref: "0 – 5", min: 0, max: 5 },
      { marker: "Pus cells", unit: "/HPF", ref: "0 – 5", min: 0, max: 5 },
      { marker: "Crystals", unit: "/HPF", ref: "None seen", min: 0, max: 0, qual: true },
      { marker: "Casts", unit: "/LPF", ref: "None seen", min: 0, max: 0, qual: true },
      { marker: "Yeast cells", unit: "", ref: "None seen", min: 0, max: 0, qual: true },
      { marker: "Bacteria", unit: "/HPF", ref: "None seen", min: 0, max: 0, qual: true },
    ],
  },
  LFT: {
    name: "Liver Function Test",
    price: 250,
    markers: [
      { marker: "Total Protein", unit: "g/dL", ref: "6.6 – 8.3", min: 6.6, max: 8.3 },
      { marker: "Albumin", unit: "g/dL", ref: "3.5 – 5.2", min: 3.5, max: 5.2 },
      { marker: "ALT", unit: "U/L", ref: "7 – 56", min: 7, max: 56 },
      { marker: "AST", unit: "U/L", ref: "10 – 40", min: 10, max: 40 },
      { marker: "Alkaline phosphatase", unit: "U/L", ref: "25 – 147", min: 25, max: 147 },
      { marker: "Total Bilirubin", unit: "µmol/L", ref: "3 – 21", min: 3, max: 21 },
      { marker: "Direct Bilirubin", unit: "mg/dL", ref: "0.0 – 0.5", min: 0, max: 0.5 },
      { marker: "Gamma GT", unit: "U/L", ref: "10 – 50", min: 10, max: 50 },
    ],
  },
  RFT: {
    name: "Kidney Function Test",
    price: 250,
    markers: [
      { marker: "Sodium", unit: "mmol/L", ref: "135 – 155", min: 135, max: 155 },
      { marker: "Potassium", unit: "mmol/L", ref: "3.2 – 5.7", min: 3.2, max: 5.7 },
      { marker: "Chloride", unit: "mmol/L", ref: "95 – 115", min: 95, max: 115 },
      { marker: "Urea", unit: "mg/dL", ref: "10 – 50", min: 10, max: 50 },
      { marker: "Creatinine", unit: "mg/dL", ref: "0.7 – 1.5", min: 0.7, max: 1.5 },
    ],
  },
  LIPID: {
    name: "Lipid Profile",
    price: 150,
    markers: [
      { marker: "Total Cholesterol", unit: "mmol/L", ref: "< 5.2", min: 0, max: 5.2 },
      { marker: "LDL", unit: "mmol/L", ref: "< 3.4", min: 0, max: 3.4 },
      { marker: "HDL", unit: "mmol/L", ref: "> 1.0", min: 1, max: 99 },
      { marker: "Triglycerides", unit: "mmol/L", ref: "< 1.7", min: 0, max: 1.7 },
    ],
  },
  FBS: {
    name: "Fasting Blood Sugar",
    price: 30,
    markers: [{ marker: "Glucose (fasting)", unit: "mmol/L", ref: "3.9 – 5.5", min: 3.9, max: 5.5 }],
  },
  HBA1C: {
    name: "Glycated Haemoglobin (HbA1c)",
    price: 100,
    markers: [{ marker: "HbA1c", unit: "%", ref: "4.0 – 5.6", min: 4, max: 5.6 }],
  },
  ESR: {
    name: "Erythrocyte Sedimentation Rate",
    price: 50,
    markers: [{ marker: "ESR", unit: "mm/hr", ref: "0 – 20", min: 0, max: 20 }],
  },
  CRP: {
    name: "C-Reactive Protein",
    price: 80,
    markers: [{ marker: "CRP", unit: "mg/L", ref: "0 – 5", min: 0, max: 5 }],
  },
  ELECTROLYTES: {
    name: "Electrolytes (Na, K, Cl, HCO3)",
    price: 140,
    markers: [
      { marker: "Sodium", unit: "mmol/L", ref: "135 – 145", min: 135, max: 145 },
      { marker: "Potassium", unit: "mmol/L", ref: "3.5 – 5.1", min: 3.5, max: 5.1 },
      { marker: "Chloride", unit: "mmol/L", ref: "98 – 107", min: 98, max: 107 },
      { marker: "Bicarbonate", unit: "mmol/L", ref: "22 – 29", min: 22, max: 29 },
    ],
  },
  CALCIUM: {
    name: "Serum Calcium",
    price: 55,
    markers: [{ marker: "Calcium", unit: "mmol/L", ref: "2.15 – 2.55", min: 2.15, max: 2.55 }],
  },
  MAGNESIUM: {
    name: "Serum Magnesium",
    price: 55,
    markers: [{ marker: "Magnesium", unit: "mmol/L", ref: "0.7 – 1.0", min: 0.7, max: 1 }],
  },
  URIC_ACID: {
    name: "Uric Acid",
    price: 60,
    markers: [{ marker: "Uric acid", unit: "mmol/L", ref: "0.18 – 0.42", min: 0.18, max: 0.42 }],
  },
  TSH: {
    name: "Thyroid Stimulating Hormone (TSH)",
    price: 120,
    markers: [{ marker: "TSH", unit: "mIU/L", ref: "0.4 – 4.0", min: 0.4, max: 4 }],
  },
  FT4: {
    name: "Free Thyroxine (FT4)",
    price: 120,
    markers: [{ marker: "Free T4", unit: "pmol/L", ref: "10 – 22", min: 10, max: 22 }],
  },
  PSA: {
    name: "Prostate Specific Antigen (PSA)",
    price: 150,
    markers: [{ marker: "PSA", unit: "ng/mL", ref: "0 – 4", min: 0, max: 4 }],
  },
  HIV: {
    name: "HIV 1 & 2 Screening",
    price: 60,
    markers: [{ marker: "HIV antibody/antigen", unit: "", ref: "Non-reactive", min: 0, max: 0, qual: true }],
  },
  HBSAG: {
    name: "Hepatitis B Surface Antigen",
    price: 60,
    markers: [{ marker: "HBsAg", unit: "", ref: "Non-reactive", min: 0, max: 0, qual: true }],
  },
  HCV: {
    name: "Hepatitis C Antibody",
    price: 60,
    markers: [{ marker: "HCV antibody", unit: "", ref: "Non-reactive", min: 0, max: 0, qual: true }],
  },
  VDRL: {
    name: "Syphilis Screen (VDRL/RPR)",
    price: 55,
    markers: [{ marker: "VDRL/RPR", unit: "", ref: "Non-reactive", min: 0, max: 0, qual: true }],
  },
  PREGNANCY: {
    name: "Pregnancy Test (hCG)",
    price: 35,
    markers: [{ marker: "hCG", unit: "", ref: "Negative", min: 0, max: 0, qual: true }],
  },
  BLOOD_GROUP: {
    name: "Blood Group and Rhesus Factor",
    price: 40,
    markers: [{ marker: "ABO/Rhesus group", unit: "", ref: "A/B/AB/O; Rh + or -", min: 0, max: 0, qual: true }],
  },
  WIDAL: {
    name: "Widal Test",
    price: 55,
    markers: [{ marker: "Salmonella agglutination", unit: "", ref: "Non-reactive", min: 0, max: 0, qual: true }],
  },
  URINE_CULTURE: {
    name: "Urine Culture and Sensitivity",
    price: 120,
    markers: [{ marker: "Culture result", unit: "", ref: "No significant growth", min: 0, max: 0, qual: true }],
  },
  STOOL: {
    name: "Stool Routine Examination",
    price: 50,
    markers: [{ marker: "Microscopy", unit: "", ref: "No ova, cysts or parasites", min: 0, max: 0, qual: true }],
  },
  BLOOD_CULTURE: {
    name: "Blood Culture and Sensitivity",
    price: 180,
    markers: [{ marker: "Culture result", unit: "", ref: "No growth", min: 0, max: 0, qual: true }],
  },
  PTINR: {
    name: "Prothrombin Time / INR",
    price: 100,
    markers: [
      { marker: "Prothrombin time", unit: "sec", ref: "11 – 14", min: 11, max: 14 },
      { marker: "INR", unit: "ratio", ref: "0.8 – 1.2", min: 0.8, max: 1.2 },
    ],
  },
  MALARIA_RDT: {
    name: "Malaria Rapid Diagnostic Test (RDT)",
    price: 40,
    markers: [{ marker: "Malaria antigen", unit: "", ref: "Negative", min: 0, max: 0, qual: true }],
  },
  SICKLING: {
    name: "Sickling Test",
    price: 50,
    markers: [{ marker: "Sickling screen", unit: "", ref: "Negative", min: 0, max: 0, qual: true }],
  },
  SPT: {
    name: "Skin Prick Test (SPT)",
    price: 40,
    markers: [{ marker: "Allergen reaction", unit: "", ref: "No significant reaction", min: 0, max: 0, qual: true }],
  },
  ANC_ROUTINE: {
    name: "Antenatal Care Routine Laboratory Panel",
    price: 250,
    markers: [
      { marker: "Blood group / Rhesus", unit: "", ref: "A/B/AB/O; Rh + or -", min: 0, max: 0, qual: true },
      { marker: "Haemoglobin", unit: "g/dL", ref: "12.0 – 16.0", min: 12, max: 16 },
      { marker: "Urine routine examination", unit: "", ref: "Normal", min: 0, max: 0, qual: true },
      { marker: "HIV screen", unit: "", ref: "Non-reactive", min: 0, max: 0, qual: true },
      { marker: "HBsAg", unit: "", ref: "Non-reactive", min: 0, max: 0, qual: true },
      { marker: "VDRL", unit: "", ref: "Non-reactive", min: 0, max: 0, qual: true },
    ],
  },
  H_PYLORI: {
    name: "H. pylori Test",
    price: 100,
    markers: [{ marker: "H. pylori", unit: "", ref: "Negative", min: 0, max: 0, qual: true }],
  },
  HVS: {
    name: "High Vaginal Swab (HVS)",
    price: 70,
    markers: [{ marker: "Microscopy / culture", unit: "", ref: "No significant growth", min: 0, max: 0, qual: true }],
  },
  UPT: {
    name: "Urine Pregnancy Test (UPT)",
    price: 35,
    markers: [{ marker: "Urine hCG", unit: "", ref: "Negative", min: 0, max: 0, qual: true }],
  },
  RETRO: {
    name: "Retroviral Screening",
    price: 50,
    markers: [{ marker: "Retroviral screen", unit: "", ref: "Non-reactive", min: 0, max: 0, qual: true }],
  },
  G6PD: {
    name: "G6PD Screening",
    price: 70,
    markers: [{ marker: "G6PD activity", unit: "U/g Hb", ref: "Normal", min: 5, max: 20 }],
  },
  HB: {
    name: "Haemoglobin Estimation",
    price: 45,
    markers: [{ marker: "Haemoglobin", unit: "g/dL", ref: "12.0 – 17.0", min: 12, max: 17 }],
  },
};

export const LAB_GROUPS: [string, string[]][] = [
  ["Haematology", ["CBC", "HB", "ESR", "SICKLING", "G6PD"]],
  ["Clinical Chemistry", ["RBS", "FBS", "HBA1C", "RFT", "LFT", "ELECTROLYTES", "CALCIUM", "MAGNESIUM", "URIC_ACID", "LIPID"]],
  ["Microbiology", ["MP", "MALARIA_RDT", "UA", "URINE_CULTURE", "STOOL", "BLOOD_CULTURE", "HVS"]],
  ["Serology and Screening", ["WIDAL", "HIV", "RETRO", "HBSAG", "HCV", "VDRL", "H_PYLORI", "PREGNANCY", "UPT", "BLOOD_GROUP", "SPT"]],
  ["Antenatal and Coagulation", ["ANC_ROUTINE", "PTINR", "TSH", "FT4", "PSA"]],
];

export const COMMON_DIAGNOSES = [
  "Uncomplicated Malaria (B54)",
  "Essential Hypertension (I10)",
  "Type 2 Diabetes Mellitus (E11)",
  "Acute Upper Respiratory Infection (J06)",
  "Urinary Tract Infection (N39.0)",
  "Peptic Ulcer Disease (K27)",
  "Asthma (J45)",
  "Pneumonia (J18)",
  "Anaemia (D64)",
  "Gastroenteritis (A09)",
  "Cellulitis (L03)",
  "Pregnancy — Antenatal Care (Z34)",
];

export const SYMPTOMS = [
  "Fever",
  "Headache",
  "Cough",
  "Fatigue",
  "Nausea",
  "Chills",
  "Chest pain",
  "Abdominal pain",
  "Dizziness",
  "Sore throat",
  "Body aches",
  "Vomiting",
  "Diarrhoea",
  "Rash",
];

export const FREQS = ["Once daily", "Twice daily", "Three times daily", "Four times daily", "At bedtime", "As needed"];

export const WARD_META: Record<string, { name: string; daily: number }> = {
  A: { name: "Ward A — General Male", daily: 180 },
  B: { name: "Ward B — General Female", daily: 180 },
  C: { name: "Ward C — Paediatrics", daily: 150 },
  D: { name: "Ward D — Maternity", daily: 200 },
  E: { name: "Ward E — Labour Ward", daily: 220 },
};

/** Resolves a ward's live config, with a graceful fallback for legacy ids. */
export const wardOf = (wards: WardConfig[], id: string): WardConfig =>
  wards.find((w) => w.id === id) ?? { id, name: WARD_META[id]?.name ?? `Ward ${id}`, daily: WARD_META[id]?.daily ?? 180 };

/** Suggests the next free bed number in a ward, e.g. A-07. */
export const nextBedNo = (wardId: string, beds: Bed[]) => {
  const max = beds
    .filter((b) => b.ward === wardId)
    .reduce((m, b) => {
      const n = parseInt(b.id.split("-").pop() || "0", 10);
      return Number.isFinite(n) ? Math.max(m, n) : m;
    }, 0);
  return `${wardId}-${String(max + 1).padStart(2, "0")}`;
};

export const QUEUE_DEPTS = [
  { key: "consult", label: "General Consultation", prefix: "A", room: "Consultation Room 3", icon: "stetho" },
  { key: "lab", label: "Laboratory", prefix: "L", room: "Sample Room 1", icon: "flask" },
  { key: "pharm", label: "Pharmacy", prefix: "PH", room: "Dispensing Window 2", icon: "pill" },
  { key: "bill", label: "Billing & Cashier", prefix: "B", room: "Cashier Counter 1", icon: "receipt" },
] as const;

/* ---------------- fresh database ---------------- */

/**
 * Builds a clean, empty hospital database. Beds and queue counters
 * are structural (the physical ward layout), not data — everything
 * clinical, financial and staffing starts empty and fills up as the
 * hospital works.
 */
export function emptyDB(): DB {
  const wards: WardConfig[] = (Object.keys(WARD_META) as (keyof typeof WARD_META)[]).map((w) => ({
    id: w,
    name: WARD_META[w].name.replace(/^Ward [A-Z] — /, ""),
    daily: WARD_META[w].daily,
  }));

  const beds: Bed[] = [];
  wards.forEach((w) => {
    for (let i = 1; i <= 6; i++) {
      beds.push({ id: `${w.id}-${String(i).padStart(2, "0")}`, ward: w.id, status: "available" });
    }
  });

  const queues: Record<string, QueueState> = {};
  QUEUE_DEPTS.forEach((q) => {
    queues[q.key] = { serving: null, waiting: [], seq: 0 };
  });

  return {
    v: 5,
    patients: [],
    staff: [],
    appointments: [],
    consultations: [],
    labOrders: [],
    rxOrders: [],
    medicines: [],
    inventory: [],
    invoices: [],
    wards,
    beds,
    admissions: [],
    maternityRecords: [],
    emergencies: [],
    claims: [],
    notifications: [],
    audit: [],
    queues,
    vitalsLog: [],
    trends: {
      registrations: Array.from({ length: 14 }, () => 0),
      revenue: Array.from({ length: 14 }, () => 0),
      labels: Array.from({ length: 14 }, (_, i) => fmtShort(dISO(i - 13))),
    },
  };
}

export function demoDB(): DB {
  const db = emptyDB();
  const created = nowISO();
  const doctor: Staff = { id: "S-01", name: "Dr. Ama Mensah", password: "demo1234", role: "doctor", dept: "Internal Medicine", title: "Medical Officer", phone: "024 555 0101", status: "on-duty", specialty: "Internal Medicine", room: "Consultation Room 3", schedule: ["Mon", "Tue", "Wed", "Thu", "Fri"], active: true };
  const nurse: Staff = { id: "S-02", name: "Nurse Efua Asare", password: "demo1234", role: "nurse", dept: "Nursing", title: "Staff Nurse", phone: "024 555 0102", status: "on-duty", schedule: ["Mon", "Tue", "Wed", "Thu", "Fri"], active: true };
  const lab: Staff = { id: "S-03", name: "Kofi Owusu", password: "demo1234", role: "lab", dept: "Laboratory", title: "Lab Technician", phone: "024 555 0103", status: "on-duty", schedule: ["Mon", "Tue", "Wed", "Thu", "Fri"], active: true };
  const pharmacist: Staff = { id: "S-04", name: "Akosua Boateng", password: "demo1234", role: "pharmacist", dept: "Pharmacy", title: "Pharmacist", phone: "024 555 0104", status: "on-duty", schedule: ["Mon", "Tue", "Wed", "Thu", "Fri"], active: true };
  const admin: Staff = { id: "S-05", name: "System Administrator", password: "1234", role: "admin", dept: "Administration", title: "Administrator", phone: "024 555 0105", status: "on-duty", schedule: ["Mon", "Tue", "Wed", "Thu", "Fri"], active: true };
  const patient: Patient = { mrn: "P-1001", nationalId: "GHA- DEMO-001", name: "Adwoa Asante", dob: "1992-06-14", gender: "Female", phone: "024 111 2233", address: "Kumasi, Ghana", bloodGroup: "O+", allergies: ["Penicillin"], insurance: { provider: "NHIS", memberNo: "NH-1001", type: "Informal Sector", expiry: dISO(180) }, nextOfKin: { name: "Kojo Asante", phone: "024 333 4455", relation: "Spouse" }, history: ["Uncomplicated malaria"], medications: [], registeredAt: created, status: "admitted" };
  const labOrder: LabOrder = { id: "LAB-1001", patientMrn: patient.mrn, doctorId: doctor.id, test: "CBC", priority: "routine", orderedAt: created, status: "ordered", price: LAB_CATALOG.CBC.price };
  const rx: RxOrder = { id: "RX-1001", patientMrn: patient.mrn, doctorId: doctor.id, date: created, status: "pending", items: [{ medId: "M-01", name: "Artemether/Lumefantrine 20/120mg", qty: 24, dose: "4 tablets", freq: "Twice daily", duration: "3 days", unitPrice: 45 }] };
  const admission: Admission = { id: "ADM-1001", patientMrn: patient.mrn, bedId: "E-01", doctorId: doctor.id, date: created, diagnosis: "Antenatal observation", status: "active", dailyCharge: 220, notes: [{ at: created, by: nurse.name, text: "Patient comfortable. Baseline observations recorded." }] };
  const maternity: MaternityRecord = { id: "MAT-1001", motherMrn: patient.mrn, createdAt: created, gravida: "2", parity: "1", lmp: "2026-01-08", edd: "2026-10-15", investigations: { bloodGroup: "O positive", hiv: "Non-reactive", hbsag: "Non-reactive", vdrl: "Non-reactive", urine: "Normal", hb: "12.4" }, deliveryDate: "", deliveryOutcome: "Live birth", deliveryMode: "Spontaneous vaginal delivery", maternalCondition: "Stable", maternalDischargeDate: "", breastfeedingStarted: "", postpartumNotes: "", babySex: "Female", numberOfBabies: "1", birthWeight: "", length: "", headCircumference: "", apgar1: "", apgar5: "", resuscitation: "No", complications: "", immunizations: { vitaminK: "", bcg: "", hepatitisB: "", oralPolio: "" }, babyConditionAtDischarge: "Normal", nurseNotes: [{ at: created, by: nurse.name, text: "Antenatal review completed; mother and baby plan discussed." }] };
  db.staff = [admin, doctor, nurse, lab, pharmacist];
  db.patients = [patient];
  db.medicines = [
    { id: "M-01", name: "Artemether/Lumefantrine 20/120mg", category: "Antimalarial", batch: "AL-2026-01", supplier: "Demo Medical Supply", stock: 120, unit: "tabs", buyPrice: 30, sellPrice: 45, expiry: dISO(300), location: "Shelf A1", reorderLevel: 30 },
    { id: "M-02", name: "Paracetamol 500mg", category: "Analgesic", batch: "PCM-2026-02", supplier: "Demo Medical Supply", stock: 300, unit: "tabs", buyPrice: 0.8, sellPrice: 1.5, expiry: dISO(420), location: "Shelf A2", reorderLevel: 60 },
    { id: "M-03", name: "Amoxicillin 500mg", category: "Antibiotic", batch: "AMX-2026-01", supplier: "Demo Medical Supply", stock: 96, unit: "caps", buyPrice: 2.5, sellPrice: 4, expiry: dISO(260), location: "Shelf B1", reorderLevel: 30 },
    { id: "M-04", name: "Metronidazole 400mg", category: "Antibiotic", batch: "MTZ-2026-03", supplier: "Demo Medical Supply", stock: 84, unit: "tabs", buyPrice: 1.5, sellPrice: 2.5, expiry: dISO(330), location: "Shelf B2", reorderLevel: 24 },
    { id: "M-05", name: "Amlodipine 5mg", category: "Antihypertensive", batch: "AML-2026-01", supplier: "Demo Medical Supply", stock: 75, unit: "tabs", buyPrice: 1.8, sellPrice: 3, expiry: dISO(500), location: "Shelf C1", reorderLevel: 20 },
    { id: "M-06", name: "Omeprazole 20mg", category: "Gastrointestinal", batch: "OMP-2026-02", supplier: "Demo Medical Supply", stock: 60, unit: "caps", buyPrice: 2, sellPrice: 3.5, expiry: dISO(380), location: "Shelf C2", reorderLevel: 18 },
    { id: "M-07", name: "Oral Rehydration Salts", category: "Fluid Replacement", batch: "ORS-2026-04", supplier: "Demo Medical Supply", stock: 140, unit: "sachets", buyPrice: 1.5, sellPrice: 2.5, expiry: dISO(240), location: "Shelf D1", reorderLevel: 30 },
    { id: "M-08", name: "Ferrous Sulphate + Folic Acid", category: "Antenatal", batch: "IFA-2026-01", supplier: "Demo Medical Supply", stock: 110, unit: "tabs", buyPrice: 1.2, sellPrice: 2, expiry: dISO(450), location: "Shelf E1", reorderLevel: 25 },
    { id: "M-09", name: "Normal Saline 0.9% 500mL", category: "IV Fluid", batch: "NS-2026-02", supplier: "Demo Medical Supply", stock: 40, unit: "bags", buyPrice: 8, sellPrice: 12, expiry: dISO(180), location: "IV Store", reorderLevel: 12 },
  ];
  db.labOrders = [labOrder];
  db.rxOrders = [rx];
  db.admissions = [admission];
  db.maternityRecords = [maternity];
  db.beds.find((b) => b.id === "E-01")!.status = "occupied";
  db.beds.find((b) => b.id === "E-01")!.patientMrn = patient.mrn;
  db.consultations = [{ id: "CON-1001", patientMrn: patient.mrn, doctorId: doctor.id, date: created, complaint: "Fever and general weakness", symptoms: ["Fever", "Fatigue"], vitals: { temp: 38.1, bpSys: 128, bpDia: 82, pulse: 92, resp: 18, spo2: 97, takenAt: created, by: nurse.name }, examination: "Alert and responsive.", diagnosis: "Uncomplicated Malaria (B54)", treatment: "Antimalarial treatment and fluids", notes: "Review after laboratory results.", labIds: [labOrder.id], rxId: rx.id }];
  db.vitalsLog = [{ patientMrn: patient.mrn, v: { temp: 38.1, bpSys: 128, bpDia: 82, pulse: 92, resp: 18, spo2: 97, takenAt: created, by: nurse.name } }];
  db.notifications = [{ id: "N-1001", at: created, icon: "lab", text: "New CBC order for Adwoa Asante", read: false, roles: ["admin", "lab", "doctor"] }];
  db.audit = [{ id: "AU-1001", at: created, user: admin.name, role: admin.role, action: "Loaded Afrakomah HMS demonstration records" }];
  return db;
}
