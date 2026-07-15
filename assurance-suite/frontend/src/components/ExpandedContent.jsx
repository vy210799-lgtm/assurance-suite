import { api } from "../api";
import { ObjectEditor, ListEditor } from "./Editors";
import { EvidenceSection } from "./EvidenceSection";
import { TrustCenterSection } from "./TrustCenterSection";
import {
  RISK_FIELDS, REPORT_FIELDS, FINDING_FIELDS, DD_FIELDS, ASSESS_FIELDS,
  PBC_FIELDS, QUERY_FIELDS, TEST_FIELDS, ATTEST_FIELDS, MODULES,
} from "../config";

// Builds add/update/remove handlers for a nested list resource that lives
// under a parent record. Each call hits the API and hands the freshly
// re-serialized parent record back to the caller.
function listHandlers(createPath, itemBase, onRecordUpdate) {
  return {
    onAdd: async (draft) => onRecordUpdate(await api.post(createPath, draft)),
    onUpdate: async (id, patch) => onRecordUpdate(await api.put(`${itemBase}/${id}`, patch)),
    onRemove: async (id) => onRecordUpdate(await api.delete(`${itemBase}/${id}`)),
  };
}

export function ExpandedContent({ moduleKey, record, onRecordUpdate, readOnly }) {
  const trustCenter = MODULES[moduleKey].hasTrustCenter && (
    <TrustCenterSection moduleKey={moduleKey} recordId={record.id} trustCenter={record.trustCenter} onChange={onRecordUpdate} readOnly={readOnly} />
  );

  if (moduleKey === "audits") {
    const findings = listHandlers(`/audits/${record.id}/findings`, "/findings", onRecordUpdate);
    return (
      <>
        <ObjectEditor title="Risk assessment" value={record.riskAssessment} fields={RISK_FIELDS} readOnly={readOnly}
          onChange={async (v) => onRecordUpdate(await api.put(`/audits/${record.id}/risk-assessment`, v))} />
        <EvidenceSection auditId={record.id} items={record.evidence} onRecordUpdate={onRecordUpdate} readOnly={readOnly} />
        <ListEditor title="Findings" items={record.findings} fields={FINDING_FIELDS} readOnly={readOnly} {...findings} />
        <ObjectEditor title="Audit report" value={record.report} fields={REPORT_FIELDS} readOnly={readOnly}
          onChange={async (v) => onRecordUpdate(await api.put(`/audits/${record.id}/report`, v))} />
        {trustCenter}
      </>
    );
  }
  if (moduleKey === "vendors") {
    const dd = listHandlers(`/vendors/${record.id}/due-diligence`, "/due-diligence", onRecordUpdate);
    const assess = listHandlers(`/vendors/${record.id}/assessments`, "/assessments", onRecordUpdate);
    return (
      <>
        <ListEditor title="Due diligence documents" items={record.dueDiligence} fields={DD_FIELDS} readOnly={readOnly} {...dd} />
        <ListEditor title="Risk domain assessments" items={record.assessments} fields={ASSESS_FIELDS} readOnly={readOnly} {...assess} />
        {trustCenter}
      </>
    );
  }
  if (moduleKey === "engagements") {
    const pbc = listHandlers(`/engagements/${record.id}/pbc`, "/pbc", onRecordUpdate);
    const query = listHandlers(`/engagements/${record.id}/query-log`, "/query-log", onRecordUpdate);
    return (
      <>
        <ListEditor title="PBC / document requests" items={record.pbc} fields={PBC_FIELDS} readOnly={readOnly} {...pbc} />
        <ListEditor title="Query log" items={record.queryLog} fields={QUERY_FIELDS} readOnly={readOnly} {...query} />
      </>
    );
  }
  if (moduleKey === "controls") {
    const tests = listHandlers(`/controls/${record.id}/tests`, "/tests", onRecordUpdate);
    return (
      <>
        <ListEditor title="Test results" items={record.tests} fields={TEST_FIELDS} readOnly={readOnly} {...tests} />
        {trustCenter}
      </>
    );
  }
  if (moduleKey === "policies") {
    const attest = listHandlers(`/policies/${record.id}/attestations`, "/attestations", onRecordUpdate);
    return (
      <>
        <ListEditor title="Attestations" items={record.attestations} fields={ATTEST_FIELDS} readOnly={readOnly} {...attest} />
        {trustCenter}
      </>
    );
  }
  return null;
}
