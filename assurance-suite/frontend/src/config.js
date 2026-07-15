import {
  ShieldCheck, Building2, FileSearch, ClipboardCheck, ScrollText, UserCog, Eye,
} from "lucide-react";

export const C = {
  ink: "#1F2421",
  paper: "#F8F7F2",
  line: "#E4E0D6",
  seal: "#8C2F39",
  slate: "#445267",
  forest: "#2F5233",
  amber: "#B4711F",
  plum: "#5B4A72",
  umber: "#6E4A2E",
};

export const MODULES = {
  audits: {
    label: "Internal audit", code: "IA", icon: ShieldCheck, accent: C.seal,
    fields: [
      { key: "title", label: "Audit title", type: "text" },
      { key: "area", label: "Audit area", type: "text" },
      { key: "type", label: "Type", type: "select", options: ["Financial", "Operational", "Compliance", "IT"] },
      { key: "riskRating", label: "Risk rating", type: "select", options: ["High", "Medium", "Low"] },
      { key: "status", label: "Status", type: "select", options: ["Planned", "Fieldwork", "Reporting", "Closed"] },
      { key: "leadAuditor", label: "Lead auditor", type: "text" },
      { key: "startDate", label: "Start date", type: "date" },
      { key: "endDate", label: "End date", type: "date" },
    ],
    columns: ["title", "area", "riskRating", "status", "endDate"],
    hasTrustCenter: true,
  },
  vendors: {
    label: "TPRM", code: "TP", icon: Building2, accent: C.slate,
    fields: [
      { key: "name", label: "Vendor name", type: "text" },
      { key: "tier", label: "Tier", type: "select", options: ["Critical", "High", "Medium", "Low"] },
      { key: "category", label: "Category", type: "text" },
      { key: "owner", label: "Business owner", type: "text" },
      { key: "inherentRisk", label: "Inherent risk", type: "select", options: ["High", "Medium", "Low"] },
      { key: "residualRisk", label: "Residual risk", type: "select", options: ["High", "Medium", "Low"] },
      { key: "contractEnd", label: "Contract end", type: "date" },
      { key: "monitoringStatus", label: "Monitoring status", type: "select", options: ["Active", "Alert", "Under review", "Offboarded"] },
    ],
    columns: ["name", "tier", "inherentRisk", "residualRisk", "monitoringStatus"],
    hasTrustCenter: true,
  },
  engagements: {
    label: "External audit", code: "EA", icon: FileSearch, accent: C.umber,
    fields: [
      { key: "auditFirm", label: "Audit firm", type: "text" },
      { key: "type", label: "Type", type: "select", options: ["Financial", "SOX", "Regulatory"] },
      { key: "period", label: "Period covered", type: "text" },
      { key: "status", label: "Status", type: "select", options: ["Planning", "Fieldwork", "Reporting", "Closed"] },
      { key: "leadPartner", label: "Lead partner", type: "text" },
      { key: "startDate", label: "Start date", type: "date" },
      { key: "endDate", label: "End date", type: "date" },
    ],
    columns: ["auditFirm", "type", "period", "status", "endDate"],
    hasTrustCenter: false, // intentionally excluded
  },
  controls: {
    label: "Control testing", code: "CT", icon: ClipboardCheck, accent: C.forest,
    fields: [
      { key: "name", label: "Control name", type: "text" },
      { key: "process", label: "Linked process", type: "text" },
      { key: "type", label: "Type", type: "select", options: ["Preventive", "Detective"] },
      { key: "automation", label: "Automation", type: "select", options: ["Manual", "Automated", "IT-dependent"] },
      { key: "frequency", label: "Frequency", type: "select", options: ["Daily", "Weekly", "Monthly", "Quarterly", "Annual"] },
      { key: "owner", label: "Control owner", type: "text" },
    ],
    columns: ["name", "process", "type", "frequency", "owner"],
    hasTrustCenter: true,
  },
  policies: {
    label: "Policy management", code: "PM", icon: ScrollText, accent: C.plum,
    fields: [
      { key: "title", label: "Policy title", type: "text" },
      { key: "category", label: "Category", type: "text" },
      { key: "owner", label: "Owner", type: "text" },
      { key: "version", label: "Version", type: "text" },
      { key: "effectiveDate", label: "Effective date", type: "date" },
      { key: "reviewDate", label: "Next review date", type: "date" },
      { key: "status", label: "Status", type: "select", options: ["Draft", "In review", "Approved", "Published"] },
    ],
    columns: ["title", "category", "version", "status", "reviewDate"],
    hasTrustCenter: true,
  },
};

export const RISK_FIELDS = [
  { key: "inherentRisk", label: "Inherent risk", type: "select", options: ["High", "Medium", "Low"] },
  { key: "residualRisk", label: "Residual risk", type: "select", options: ["High", "Medium", "Low"] },
  { key: "controlEffectiveness", label: "Control effectiveness", type: "select", options: ["Effective", "Partially effective", "Ineffective"] },
  { key: "notes", label: "Notes", type: "textarea" },
];
export const REPORT_FIELDS = [
  { key: "opinion", label: "Overall opinion", type: "select", options: ["Satisfactory", "Needs improvement", "Unsatisfactory"] },
  { key: "status", label: "Report status", type: "select", options: ["Draft", "Reviewed", "Approved", "Issued"] },
  { key: "summary", label: "Executive summary", type: "textarea" },
];
export const FINDING_FIELDS = [
  { key: "title", label: "Finding", type: "text" },
  { key: "severity", label: "Severity", type: "select", options: ["Critical", "High", "Medium", "Low"] },
  { key: "owner", label: "Owner", type: "text" },
  { key: "dueDate", label: "Due date", type: "date" },
  { key: "status", label: "Status", type: "select", options: ["Open", "In progress", "Overdue", "Closed"] },
];
export const DD_FIELDS = [
  { key: "document", label: "Document", type: "text" },
  { key: "status", label: "Status", type: "select", options: ["Received", "Pending", "Expired"] },
  { key: "expiryDate", label: "Expiry date", type: "date" },
];
export const ASSESS_FIELDS = [
  { key: "domain", label: "Risk domain", type: "select", options: ["Cyber", "Financial", "Operational", "Compliance", "Reputational"] },
  { key: "score", label: "Score", type: "text" },
  { key: "assessedBy", label: "Assessed by", type: "text" },
  { key: "date", label: "Date", type: "date" },
];
export const PBC_FIELDS = [
  { key: "item", label: "Requested item", type: "text" },
  { key: "dueDate", label: "Due date", type: "date" },
  { key: "status", label: "Status", type: "select", options: ["Requested", "Received", "Overdue"] },
  { key: "uploadedBy", label: "Uploaded by", type: "text" },
];
export const QUERY_FIELDS = [
  { key: "question", label: "Auditor question", type: "text" },
  { key: "response", label: "Response", type: "text" },
  { key: "status", label: "Status", type: "select", options: ["Open", "Resolved"] },
];
export const TEST_FIELDS = [
  { key: "period", label: "Test period", type: "text" },
  { key: "sampleSize", label: "Sample size", type: "text" },
  { key: "result", label: "Result", type: "select", options: ["Effective", "Ineffective", "Exception noted"] },
  { key: "exceptions", label: "Exceptions", type: "text" },
  { key: "tester", label: "Tester", type: "text" },
  { key: "date", label: "Date", type: "date" },
];
export const ATTEST_FIELDS = [
  { key: "name", label: "Name", type: "text" },
  { key: "acknowledged", label: "Acknowledged", type: "select", options: ["Yes", "No"] },
  { key: "date", label: "Date", type: "date" },
];

export const ROLES = {
  admin: { label: "Administrator", desc: "Full access to every module and record.", icon: UserCog, modules: ["audits", "vendors", "engagements", "controls", "policies"], readOnly: false },
  internal_auditor: { label: "Internal auditor", desc: "Plans and runs internal audits: risk assessment, evidence, and findings.", icon: MODULES.audits.icon, modules: ["audits"], readOnly: false },
  tprm_analyst: { label: "TPRM analyst", desc: "Manages the vendor register and third-party trust center connections.", icon: MODULES.vendors.icon, modules: ["vendors"], readOnly: false },
  external_liaison: { label: "External audit liaison", desc: "Coordinates PBC requests and the query log with external auditors.", icon: MODULES.engagements.icon, modules: ["engagements"], readOnly: false },
  control_owner: { label: "Control owner", desc: "Runs and records control tests for owned processes.", icon: MODULES.controls.icon, modules: ["controls"], readOnly: false },
  policy_manager: { label: "Policy manager", desc: "Owns policy versions, review cycles, and attestations.", icon: MODULES.policies.icon, modules: ["policies"], readOnly: false },
  executive_viewer: { label: "Executive viewer", desc: "Read-only view across the whole program, for reporting and oversight.", icon: Eye, modules: ["audits", "vendors", "engagements", "controls", "policies"], readOnly: true },
};

export const hexA = (hex, a) => hex + a;

export function statusHex(v) {
  const s = String(v || "").toLowerCase();
  if (["closed", "approved", "published", "effective", "received", "resolved", "reviewed", "active", "yes", "issued", "current"].includes(s)) return C.forest;
  if (["overdue", "critical", "ineffective", "unsatisfactory", "expired", "alert"].includes(s)) return C.seal;
  if (["in progress", "fieldwork", "reporting", "under review", "in review", "exception noted", "needs improvement", "partially effective"].includes(s)) return C.amber;
  return C.slate;
}

export const emptyFromFields = (fields) => Object.fromEntries(fields.map((f) => [f.key, ""]));
