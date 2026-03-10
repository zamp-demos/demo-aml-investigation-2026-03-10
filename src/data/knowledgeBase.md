# Meridian — AML Investigation Procedures

## Overview

This knowledge base documents Meridian's Anti-Money Laundering (AML) investigation procedures, including PEP screening, transaction monitoring, SAR filing, and case management workflows powered by Pega AML.

## Alert Triage & Classification

### Alert Sources
- **Pega Transaction Monitoring**: Automated alerts from rule-based and ML-driven transaction surveillance
- **PEP/Sanctions Screening**: Triggered by onboarding, periodic refresh, or list updates (Dow Jones, World-Check, OFAC SDN, EU Consolidated, UN SC)
- **Referrals**: Manual referrals from branch staff, relationship managers, or compliance officers
- **External**: Reports from correspondents, FIU feedback, law enforcement requests

### Risk Scoring
Pega AML assigns a composite risk score (0–100) based on:
- Transaction velocity and volume anomalies
- Counterparty jurisdiction risk (FATF grey/blacklist, tax haven indicators)
- Customer risk tier (PEP status, industry, source of wealth)
- Pattern matching (structuring, layering, round-amount transfers)
- Historical alert frequency

Alerts scoring 70+ are auto-escalated to L2 investigation.

## PEP Investigation Procedures

### PEP Categories
| Category | Definition | Risk Tier |
|----------|-----------|-----------|
| Foreign Senior Political Figure | Head of state, minister, senior military, judiciary | Tier 1 — Highest |
| Domestic PEP | Same roles in home jurisdiction | Tier 1 |
| International Organisation PEP | Senior officials of UN, IMF, World Bank, etc. | Tier 2 |
| Close Associate | Business partner, legal advisor, or close personal associate of a PEP | Tier 2 |
| Family Member | Spouse, parent, sibling, child of a PEP | Tier 2 |

### PEP Investigation Steps
1. **Alert Ingestion**: Retrieve alert data from Pega AML, including trigger details, customer profile, and initial risk score
2. **KYC/CDD Review**: Pull latest KYC profile from Pega Customer Hub. Flag stale CDD (>12 months since last refresh)
3. **Transaction Analysis**: Analyse 90-day transaction history across all linked accounts. Identify patterns: layering, structuring, round-amount, velocity anomalies
4. **PEP/Sanctions Screening**: Run name variants against OFAC SDN, EU Consolidated, UN SC, Dow Jones Watchlist, World-Check. Confirm or dismiss matches using DOB, nationality, and secondary identifiers
5. **Adverse Media Screening**: Search Google News, OFSI portal, and OSINT sources for corroborating negative press, investigations, or sanctions-related coverage
6. **Beneficial Ownership Analysis**: Map corporate structure and UBO chains for all counterparties. Identify controlled entities, nominee structures, and family connections
7. **Analyst Review (HITL)**: Present investigation findings to compliance analyst for disposition decision. Options: Clear as false positive, escalate to SAR, or request additional investigation
8. **SAR Drafting**: Generate SAR narrative covering all investigation findings, indicators of suspicion, and recommended actions
9. **SAR Filing & Case Closure**: File SAR in Pega Case Management, apply account restrictions, trigger enhanced CDD, and notify MLRO

## Transaction Pattern Red Flags

| Pattern | Description | Risk Level |
|---------|-------------|------------|
| Layering | Rapid movement of funds through multiple jurisdictions via intermediary entities | High |
| Structuring | Breaking large amounts into smaller transfers to avoid reporting thresholds | High |
| Round-amount transfers | Transfers in exact multiples (€50K, €100K) with no commercial rationale | Medium-High |
| Velocity anomaly | Transaction volume significantly exceeding historical baseline (>200% increase) | High |
| Shell company involvement | Counterparties registered in BVI, Seychelles, Panama, or other opacity jurisdictions | High |
| No supporting documentation | Transfers with no invoices, contracts, or commercial justification on file | Medium-High |
| Circular funds flow | Funds returning to originating jurisdiction after passing through intermediaries | Critical |

## SAR Filing Requirements

### Regulatory Framework
- **Cyprus**: MOKAS (Financial Intelligence Unit) — filing deadline: 15 business days from determination
- **EU**: 6th Anti-Money Laundering Directive (6AMLD) — enhanced due diligence for PEPs
- **FATF**: Recommendation 12 — enhanced CDD measures for PEPs, family members, and close associates

### SAR Narrative Structure
1. Subject Background & PEP Status
2. Account Activity & Transaction Pattern Analysis
3. Counterparty & Beneficial Ownership Analysis
4. Adverse Media & Open Source Intelligence
5. Indicators of Suspicious Activity
6. Conclusion & Recommended Actions

### Post-Filing Actions
- Freeze outbound transfers pending FIU response
- Trigger enhanced CDD refresh (10 business day deadline)
- Notify MLRO via Pega workflow
- Update customer risk tier in Pega Customer Hub
- Schedule follow-up review at 30/60/90 days

## Pega AML Platform

### Key Modules
- **Transaction Monitoring**: Real-time and batch surveillance with configurable rules
- **Customer Screening**: PEP, sanctions, and adverse media screening with automated rescreening
- **Case Management**: End-to-end investigation workflow with audit trail
- **SAR Management**: Automated SAR generation, review workflow, and regulatory submission
- **Entity Resolution**: Cross-reference customers, counterparties, and beneficial owners across systems

### Data Sources
- Core Banking System (account data, transaction history)
- KYC/CDD Platform (customer profiles, documents, risk assessments)
- Dow Jones Watchlist, World-Check, OFAC SDN, EU Consolidated List, UN SC List
- Corporate Registries (beneficial ownership data)
- Open Source (Google News, OFSI portal, OCCRP, Transparency International)
