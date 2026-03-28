# Compliance Check Report: Quebec Loi 25 & Federal LPRPDE
> Date: 2026-03-27
> Scope: WorkOn platform (Backend, Frontend, GHL, Stripe, N8N)
> Status: PARTIALLY COMPLIANT -- Action items identified

---

## 1. Executive Summary

WorkOn collects and processes personal information from workers and clients in Quebec. Two primary privacy laws apply:

1. **Loi 25** (Quebec) -- An Act to modernize legislative provisions as regards the protection of personal information. Phased implementation: Phase 1 (Sept 2022), Phase 2 (Sept 2023), Phase 3 (Sept 2024). All phases are now in effect.

2. **LPRPDE** (Federal) -- Personal Information Protection and Electronic Documents Act. Applies to commercial activities across Canada.

**Current overall compliance: PARTIAL.** Core technical controls (encryption, access control, consent guard) are in place. Key gaps are in governance, documentation, and user-facing transparency.

---

## 2. Data Inventory

### Personal Information Collected

| Data Category | Data Elements | Source | Storage | Sensitivity |
|--------------|---------------|--------|---------|-------------|
| Worker Identity | Name, phone, email, city | GHL form -> Backend | PostgreSQL (Railway) | MEDIUM |
| Worker Profile | Services, availability, rate, experience, vehicle, bio | GHL form -> Backend | PostgreSQL | LOW |
| Worker Attribution | gclid, fbclid, ttclid, UTM params | Form metadata | PostgreSQL | LOW |
| Client Identity | Name, phone, email, city, address | GHL form -> Backend | PostgreSQL | MEDIUM |
| Client Business | Company name (if applicable), type | GHL form | PostgreSQL + GHL | LOW |
| Mission Details | Service type, description, address, date, budget | GHL form -> Backend | PostgreSQL | MEDIUM |
| Payment Data | Transaction amounts, payment status | Stripe | Stripe (PCI compliant) | HIGH |
| Authentication | Password hash, JWT tokens, device IDs | Backend auth | PostgreSQL | HIGH |
| Reviews | Rating, text content | Backend | PostgreSQL | LOW |
| Messages | Chat content between users | Backend | PostgreSQL | MEDIUM |
| Location | Mission addresses, worker cities | Forms | PostgreSQL | MEDIUM |

### Data Processors (Third Parties)

| Processor | Data Shared | Purpose | DPA Status |
|-----------|------------|---------|------------|
| Railway | All backend data (hosting) | Infrastructure | NEEDS REVIEW |
| Stripe | Payment data, names, emails | Payment processing | PCI DSS compliant, DPA available |
| GoHighLevel | Contact info, mission data | CRM + automation | NEEDS DPA |
| N8N (Railway) | Webhook payloads (transient) | Workflow automation | Self-hosted, same Railway |
| Notion | Worker/client/mission summaries | Operational DB | NEEDS DPA |

---

## 3. Loi 25 Compliance Assessment

### Phase 1 Requirements (In Effect Since Sept 2022)

| Requirement | Status | Details |
|-------------|--------|---------|
| Designate person responsible for personal information protection | NOT DONE | Must designate and publish contact info |
| Report confidentiality incidents to CAI (Commission d'acces a l'information) | NOT DONE | No incident reporting procedure exists |
| Report incidents to affected persons if serious risk | NOT DONE | No notification template/procedure |
| Mandatory incident register | NOT DONE | Need to create and maintain |

### Phase 2 Requirements (In Effect Since Sept 2023)

| Requirement | Status | Details |
|-------------|--------|---------|
| Privacy policy published and accessible | NOT DONE | No privacy policy on any platform |
| Consent must be obtained clearly and free | PARTIAL | Consent guard exists in backend, but no user-facing consent screen in forms |
| Right of access to personal information | PARTIAL | Admin module exists but no self-serve portal |
| Right to rectification | PARTIAL | Profile editing exists for authenticated users |
| Right to data portability | NOT DONE | No export function |
| Privacy Impact Assessment (PIA) for high-risk processing | NOT DONE | Required for profiling, geolocation |
| Consent for using data beyond original purpose | NOT DONE | Attribution tracking (UTM, ad pixels) needs explicit consent |
| Anonymization/destruction when purpose fulfilled | NOT DONE | No data retention or deletion policy |
| Transparency about automated decision-making | NOT APPLICABLE | No automated decisions currently |
| Consent for disclosing to third parties | NOT DONE | GHL, Notion, Stripe data sharing not disclosed |

### Phase 3 Requirements (In Effect Since Sept 2024)

| Requirement | Status | Details |
|-------------|--------|---------|
| Right to deindexation (right to be forgotten) | NOT DONE | No deletion mechanism for user data |
| Data portability in structured format | NOT DONE | No data export API |
| Consent rules for minors (under 14) | NOT APPLICABLE | Platform is for adult workers/clients |

---

## 4. LPRPDE Compliance Assessment

LPRPDE is based on 10 Fair Information Principles (Schedule 1).

| Principle | Status | Assessment |
|-----------|--------|------------|
| 1. Accountability | PARTIAL | No designated privacy officer. Technical controls exist. |
| 2. Identifying Purposes | PARTIAL | Data collected for clear operational purposes, but not communicated to users |
| 3. Consent | PARTIAL | Backend consent guard active, but GHL forms lack explicit consent language |
| 4. Limiting Collection | OK | Only collecting data needed for platform operation |
| 5. Limiting Use, Disclosure, Retention | PARTIAL | No retention policy. Attribution data (pixels) needs consent. |
| 6. Accuracy | OK | Users can update profiles. Data sourced from user input. |
| 7. Safeguards | OK | Encryption (bcrypt, JWT, HTTPS), access controls, Prisma parameterized queries |
| 8. Openness | NOT DONE | No published privacy policy or data practices documentation |
| 9. Individual Access | PARTIAL | Auth users can view own data, but no formal request process |
| 10. Challenging Compliance | NOT DONE | No complaint mechanism published |

---

## 5. Technical Controls Assessment

### Data Protection Controls

| Control | Status | Implementation |
|---------|--------|----------------|
| Encryption at rest | OK | Railway PostgreSQL encrypted storage |
| Encryption in transit | OK | HTTPS/TLS for all endpoints |
| Password hashing | OK | bcrypt, 12 salt rounds |
| JWT token security | OK | HS256, refresh rotation, expiry |
| Input validation | OK | class-validator on all DTOs |
| SQL injection protection | OK | Prisma parameterized queries |
| XSS protection | OK | Helmet security headers |
| CORS | OK | Configured allowed origins |
| Rate limiting | OK | NestJS throttler |
| Consent guard | OK | Middleware checks consent before data access |
| Audit logging | PARTIAL | Module exists, not comprehensively applied |
| Data minimization | OK | DTOs limit data exposure per endpoint |
| Role-based access | OK | JWT guards with role checks |

### Data Breach Detection

| Capability | Status |
|-----------|--------|
| Intrusion detection | NOT CONFIGURED |
| Anomaly detection (unusual access patterns) | NOT CONFIGURED |
| Failed login monitoring | PARTIAL (logs only) |
| Database access logging | RAILWAY DEFAULT |
| Webhook signature verification | OK (Stripe) |

---

## 6. Gap Analysis & Action Items

### CRITICAL (Must Fix Before Public Launch)

| # | Gap | Requirement | Action | Effort |
|---|-----|-------------|--------|--------|
| C1 | No privacy policy | Loi 25 Phase 2 | Draft and publish bilingual privacy policy on workon.ca | 4-8 hours |
| C2 | No person responsible designated | Loi 25 Phase 1 | Designate founder as responsible person, publish contact | 1 hour |
| C3 | No incident register | Loi 25 Phase 1 | Create incident register template and procedure | 2 hours |
| C4 | No breach notification procedure | Loi 25 Phase 1 + LPRPDE | Document breach response SOP with CAI notification template | 4 hours |
| C5 | GHL forms lack consent language | Loi 25 Phase 2 | Add consent checkbox + privacy link to all GHL forms | 2 hours |

### HIGH PRIORITY (Fix Within 30 Days)

| # | Gap | Requirement | Action | Effort |
|---|-----|-------------|--------|--------|
| H1 | No data retention policy | Loi 25 + LPRPDE | Define retention periods per data category, implement automatic purge | 8 hours |
| H2 | No data portability | Loi 25 Phase 3 | Build data export endpoint (JSON/CSV) for user data | 8-16 hours |
| H3 | No right to deletion | Loi 25 Phase 3 | Build account deletion flow (anonymize, not hard-delete) | 8-16 hours |
| H4 | No PIA completed | Loi 25 Phase 2 | Complete Privacy Impact Assessment for platform | 16 hours |
| H5 | Third-party DPAs missing | Loi 25 + LPRPDE | Obtain/review Data Processing Agreements from Railway, GHL, Notion | 4 hours |
| H6 | Attribution tracking consent | Loi 25 Phase 2 | Implement cookie/tracking consent banner on Next.js | 4 hours |

### MEDIUM PRIORITY (Fix Within 90 Days)

| # | Gap | Action | Effort |
|---|-----|--------|--------|
| M1 | Comprehensive audit logging | Extend audit module to log all data access/modification | 16 hours |
| M2 | Self-serve data access portal | Allow users to download their data without admin intervention | 16 hours |
| M3 | Complaint mechanism | Create a privacy complaint form and response procedure | 4 hours |
| M4 | Staff privacy training | Document privacy handling procedures for anyone with data access | 4 hours |
| M5 | Annual privacy review | Schedule and document annual privacy program review | 2 hours |

---

## 7. Privacy Policy Requirements

The privacy policy (action C1) must include at minimum:

1. **Identity** of the person responsible for personal information
2. **Categories** of personal information collected
3. **Purposes** for which information is collected
4. **Means** of collection (forms, automatic, third party)
5. **Rights** of individuals (access, rectification, portability, deletion)
6. **How to exercise** rights (contact information, process)
7. **Third parties** to whom information is disclosed and why
8. **Retention periods** for each category
9. **Security measures** in place
10. **Cookie and tracking** disclosure
11. **Transfers outside Quebec** (Railway servers location, Stripe US processing)
12. **Complaint process** (how to complain to the organization and to CAI)

Must be available in French (primary) and English.

---

## 8. Breach Notification Requirements

### Loi 25 Requirements
- **CAI notification**: Required if the breach presents a risk of serious injury
- **Affected person notification**: Required if risk of serious injury
- **Timeline**: As soon as possible after becoming aware
- **Incident register**: Must record ALL breaches, even minor ones
- **Content**: Nature of information, circumstances, measures taken, contact info

### LPRPDE Requirements
- **OPC notification**: Required if real risk of significant harm (RROSH)
- **Affected individuals**: Must notify if RROSH
- **Timeline**: As soon as feasible
- **Content**: Description of breach, information involved, steps taken, contact info
- **Record keeping**: Keep records for 24 months

### Recommended Breach Response Procedure
1. **Detect**: Identify and confirm the breach
2. **Contain**: Stop ongoing data loss
3. **Assess**: Determine scope, data involved, risk level
4. **Notify**: CAI/OPC + affected persons if threshold met
5. **Document**: Log in incident register
6. **Remediate**: Fix root cause, improve controls
7. **Review**: Update procedures to prevent recurrence

---

## 9. Data Transfer Considerations

WorkOn uses services that may process data outside Quebec:

| Service | Likely Server Location | Impact |
|---------|----------------------|--------|
| Railway | US (various regions) | Personal data transferred to US |
| Stripe | US (primary) | Payment data processed in US |
| GoHighLevel | US | Contact data stored in US |
| Notion | US (AWS) | Operational data in US |
| GitHub | US | Source code (no personal data) |

### Loi 25 Requirement for Cross-Border Transfers
- Must conduct a PIA before transferring personal information outside Quebec
- Must ensure the receiving jurisdiction offers adequate protection
- US is generally considered to have adequate commercial privacy protections
- Contractual safeguards (DPAs) should be in place

---

## 10. Compliance Roadmap

### Week 1 (Immediate)
- [ ] Designate person responsible (C2)
- [ ] Create incident register (C3)
- [ ] Add consent language to GHL forms (C5)

### Week 2-3
- [ ] Draft and publish privacy policy (C1)
- [ ] Document breach notification procedure (C4)
- [ ] Request DPAs from third parties (H5)

### Month 2
- [ ] Implement data retention policy (H1)
- [ ] Build data export endpoint (H2)
- [ ] Implement cookie consent on Next.js (H6)

### Month 3
- [ ] Complete PIA (H4)
- [ ] Build account deletion flow (H3)
- [ ] Implement comprehensive audit logging (M1)

### Ongoing
- [ ] Monthly incident register review
- [ ] Quarterly privacy program review
- [ ] Annual full compliance audit

---

## 11. Regulatory Contacts

| Authority | Jurisdiction | Website |
|-----------|-------------|---------|
| Commission d'acces a l'information du Quebec (CAI) | Quebec | https://www.cai.gouv.qc.ca |
| Office of the Privacy Commissioner of Canada (OPC) | Federal | https://www.priv.gc.ca |

### CAI Breach Notification
- Online form: https://www.cai.gouv.qc.ca/incident-de-confidentialite
- Must be filed if breach presents risk of serious injury

### OPC Breach Notification
- Online form: https://www.priv.gc.ca/en/report-a-concern/report-a-privacy-breach-at-your-organization/
- Must be filed if real risk of significant harm

---

*This report should be reviewed monthly and updated as compliance gaps are addressed. Full compliance is achievable within 90 days with focused effort on the critical and high-priority items.*
