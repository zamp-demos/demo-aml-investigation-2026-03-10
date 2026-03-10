const fs = require('fs');
const path = require('path');

// --- Configuration ---
const PROJECT_ROOT = path.join(__dirname, '..');
const PUBLIC_DATA_DIR = path.join(PROJECT_ROOT, 'public/data');
const PROCESSES_FILE = path.join(PUBLIC_DATA_DIR, 'processes.json');
const PROCESS_ID = "AML_001";
const CASE_NAME = "PEP Alert — Viktor Kozlov (Russia/Cyprus)";

// --- Helpers ---
const readJson = (file) => (fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : []);
const writeJson = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 4));
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const updateProcessLog = (processId, logEntry, keyDetailsUpdate = {}) => {
    const processFile = path.join(PUBLIC_DATA_DIR, `process_${processId}.json`);
    let data = { logs: [], keyDetails: {}, sidebarArtifacts: [] };
    if (fs.existsSync(processFile)) data = readJson(processFile);

    if (logEntry) {
        const existingIdx = logEntry.id ? data.logs.findIndex(l => l.id === logEntry.id) : -1;
        if (existingIdx !== -1) {
            data.logs[existingIdx] = { ...data.logs[existingIdx], ...logEntry };
        } else {
            data.logs.push(logEntry);
        }
    }

    if (keyDetailsUpdate && Object.keys(keyDetailsUpdate).length > 0) {
        data.keyDetails = { ...data.keyDetails, ...keyDetailsUpdate };
    }
    writeJson(processFile, data);
};

const updateProcessListStatus = async (processId, status, currentStatus) => {
    const apiUrl = process.env.VITE_API_URL || 'http://localhost:3001';
    try {
        const response = await fetch(`${apiUrl}/api/update-status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: processId, status, currentStatus })
        });
        if (!response.ok) throw new Error(`Server returned ${response.status}`);
    } catch (e) {
        try {
            const processes = JSON.parse(fs.readFileSync(PROCESSES_FILE, 'utf8'));
            const idx = processes.findIndex(p => p.id === String(processId));
            if (idx !== -1) {
                processes[idx].status = status;
                processes[idx].currentStatus = currentStatus;
                fs.writeFileSync(PROCESSES_FILE, JSON.stringify(processes, null, 4));
            }
        } catch (err) { }
    }
};

const waitForSignal = async (signalId) => {
    console.log(`Waiting for human signal: ${signalId}...`);
    const signalFile = path.join(__dirname, '../interaction-signals.json');

    for (let i = 0; i < 15; i++) {
        try {
            if (fs.existsSync(signalFile)) {
                const content = fs.readFileSync(signalFile, 'utf8');
                if (!content) continue;
                const signals = JSON.parse(content);
                if (signals[signalId]) {
                    delete signals[signalId];
                    const tempSignal = signalFile + '.' + Math.random().toString(36).substring(7) + '.tmp';
                    fs.writeFileSync(tempSignal, JSON.stringify(signals, null, 4));
                    fs.renameSync(tempSignal, signalFile);
                }
                break;
            }
        } catch (e) { await delay(Math.floor(Math.random() * 200) + 100); }
    }

    while (true) {
        try {
            if (fs.existsSync(signalFile)) {
                const content = fs.readFileSync(signalFile, 'utf8');
                if (content) {
                    const signals = JSON.parse(content);
                    if (signals[signalId]) {
                        console.log(`Signal ${signalId} received!`);
                        delete signals[signalId];
                        const tempSignal = signalFile + '.' + Math.random().toString(36).substring(7) + '.tmp';
                        fs.writeFileSync(tempSignal, JSON.stringify(signals, null, 4));
                        fs.renameSync(tempSignal, signalFile);
                        return true;
                    }
                }
            }
        } catch (e) { }
        await delay(1000);
    }
};

(async () => {
    console.log(`Starting ${PROCESS_ID}: ${CASE_NAME}...`);

    writeJson(path.join(PUBLIC_DATA_DIR, `process_${PROCESS_ID}.json`), {
        logs: [],
        keyDetails: {
            alertId: "ALT-88241",
            customerName: "Viktor Kozlov",
            alertSource: "Pega AML",
            riskRating: "High",
            customerType: "Private Banking",
            jurisdiction: "Cyprus / Russia",
            pepStatus: "Pending Verification"
        }
    });

    const steps = [
        {
            id: "step-1",
            title_p: "Ingesting alert data from Pega AML platform...",
            title_s: "Alert ALT-88241 ingested — high-risk PEP flag on Viktor Kozlov",
            reasoning: [
                "Alert ID: ALT-88241 triggered by Pega Transaction Monitoring module",
                "Customer: Viktor Kozlov, DOB 1961-04-12, Russian national",
                "Account type: Private Banking — Cyprus branch (account opened 2019)",
                "Alert trigger: 14 wire transfers totalling €2.3M across 3 jurisdictions in 28 days",
                "Pega risk score: 87/100 — auto-escalated to L2 investigation queue"
            ],
            artifacts: [{
                id: "pega-alert",
                type: "file",
                label: "Pega Alert Export — ALT-88241",
                pdfPath: "/data/pega_alert_ALT88241.pdf"
            }]
        },
        {
            id: "step-2",
            title_p: "Retrieving KYC/CDD profile from Pega Customer Hub...",
            title_s: "KYC profile loaded — CDD last refreshed 14 months ago",
            reasoning: [
                "Full name: Viktor Andreyevich Kozlov",
                "Nationality: Russian Federation | Residency: Limassol, Cyprus (since 2017)",
                "Occupation declared: 'Private investor' — no employer on file",
                "Source of wealth: Declared as 'asset sales and consulting income'",
                "CDD last refreshed: 2025-01-08 — 14 months stale, flagged for refresh",
                "KYC risk tier: High (upgraded from Medium in 2024 after address change)",
                "Linked accounts: 3 (personal current, savings, investment portfolio)"
            ],
            artifacts: [{
                id: "kyc-profile",
                type: "json",
                label: "KYC/CDD Profile Summary",
                data: {
                    fullName: "Viktor Andreyevich Kozlov",
                    dob: "1961-04-12",
                    nationality: "Russian Federation",
                    residency: "Limassol, Cyprus",
                    occupation: "Private investor",
                    sourceOfWealth: "Asset sales and consulting income",
                    cddLastRefreshed: "2025-01-08",
                    kycRiskTier: "High",
                    linkedAccounts: 3,
                    accountOpenDate: "2019-06-15",
                    branchCode: "CYP-LIM-002"
                }
            }]
        },
        {
            id: "step-3",
            title_p: "Analysing transaction patterns across linked accounts...",
            title_s: "Suspicious layering pattern detected — €2.3M across 3 jurisdictions",
            reasoning: [
                "Analysed 47 transactions across 90-day window (3 linked accounts)",
                "Pattern detected: Rapid fund layering — Cyprus → Latvia → Dubai → Cyprus",
                "14 wire transfers in 28 days totalling €2,347,000 — average €167K per transfer",
                "Round-amount structuring: 9 of 14 transfers are exact multiples of €50,000",
                "Counterparties: 6 unique entities, 4 registered in known shell company jurisdictions (BVI, Seychelles)",
                "No corresponding commercial invoices or contracts on file for any transfer",
                "Velocity anomaly: 340% increase over prior 90-day baseline"
            ],
            artifacts: [{
                id: "txn-analysis",
                type: "json",
                label: "Transaction Pattern Analysis",
                data: {
                    analysisWindow: "90 days",
                    totalTransactions: 47,
                    flaggedTransactions: 14,
                    totalFlaggedAmount: "€2,347,000",
                    jurisdictions: ["Cyprus", "Latvia", "Dubai (UAE)"],
                    pattern: "Rapid fund layering with round-amount structuring",
                    counterparties: [
                        { name: "Volantis Holdings Ltd", jurisdiction: "BVI", transfers: 4, amount: "€680,000" },
                        { name: "Driftwood Consulting FZCO", jurisdiction: "Dubai", transfers: 3, amount: "€510,000" },
                        { name: "Nordvik Capital SIA", jurisdiction: "Latvia", transfers: 3, amount: "€457,000" },
                        { name: "Heliotrope Services Ltd", jurisdiction: "Seychelles", transfers: 2, amount: "€350,000" },
                        { name: "Meridian Trust (Cyprus)", jurisdiction: "Cyprus", transfers: 1, amount: "€200,000" },
                        { name: "K.A. Consulting OÜ", jurisdiction: "Estonia", transfers: 1, amount: "€150,000" }
                    ],
                    velocityIncrease: "340% vs prior 90-day baseline",
                    roundAmountRatio: "9 of 14 (64%)",
                    supportingDocuments: "None on file"
                }
            }]
        },
        {
            id: "step-4",
            title_p: "Running PEP screening against sanctions and PEP databases in Pega...",
            title_s: "PEP match confirmed — former Deputy Energy Minister of Russia (2008–2014)",
            reasoning: [
                "Screened against: OFAC SDN, EU Consolidated, UN Security Council, Dow Jones Watchlist, World-Check",
                "PEP match: Viktor A. Kozlov — Deputy Minister of Energy, Russian Federation (2008–2014)",
                "Match confidence: 97.2% (full name + DOB + nationality confirmed)",
                "Sanctions status: Not individually designated, but associated with sanctioned entity Rosenergotrans",
                "Close associate of Oleg Deripaska (OFAC-designated) per World-Check RCA data",
                "PEP category: Foreign Senior Political Figure — risk classification: Tier 1",
                "Family member: Anastasia Kozlova (daughter) — director of Volantis Holdings Ltd (BVI counterparty)"
            ],
            artifacts: [
                {
                    id: "pep-video",
                    type: "video",
                    label: "Browser Recording — Pega PEP Screening",
                    videoPath: "/data/pega_pep_screening.webm"
                },
                {
                    id: "pep-results",
                    type: "json",
                    label: "PEP/Sanctions Match Results",
                    data: {
                        screenedEntity: "Viktor Andreyevich Kozlov",
                        matchConfidence: "97.2%",
                        pepRole: "Deputy Minister of Energy, Russian Federation",
                        pepTenure: "2008–2014",
                        pepCategory: "Foreign Senior Political Figure",
                        pepTier: "Tier 1",
                        sanctionsStatus: "Not individually designated",
                        associatedEntities: [
                            "Rosenergotrans (EU-sanctioned)",
                            "Oleg Deripaska (OFAC SDN — close associate)"
                        ],
                        familyLinks: [
                            "Anastasia Kozlova (daughter) — Director, Volantis Holdings Ltd (BVI)"
                        ],
                        databasesChecked: ["OFAC SDN", "EU Consolidated", "UN SC", "Dow Jones Watchlist", "World-Check"]
                    }
                }
            ]
        },
        {
            id: "step-5",
            title_p: "Conducting adverse media screening via open source intelligence...",
            title_s: "3 relevant adverse media hits — corruption allegations and asset freezing",
            reasoning: [
                "Google News: 12 results, 3 directly relevant to Viktor Kozlov",
                "Hit 1: Reuters (2024-09) — 'EU widens Russia energy sanctions net, former officials under scrutiny'",
                "Hit 2: OCCRP (2023-11) — 'Cyprus shell companies linked to Russian energy officials'",
                "Hit 3: Transparency International (2024-03) — 'Unexplained wealth in Limassol — Russian PEP property holdings'",
                "Assessment: Corroborating adverse media confirms PEP nexus and raises shell company concerns",
                "No direct criminal charges found, but pattern consistent with sanctions evasion infrastructure",
                "OFSI portal: No specific designation, but entity Rosenergotrans listed under Russia programme"
            ],
            artifacts: [{
                id: "adverse-media-video",
                type: "video",
                label: "Browser Recording — Adverse Media Search",
                videoPath: "/data/adverse_media_search.webm"
            }]
        },
        {
            id: "step-6",
            title_p: "Mapping beneficial ownership network and corporate structure...",
            title_s: "Shell company network identified — 4 entities across 3 jurisdictions linked to Kozlov family",
            reasoning: [
                "Beneficial ownership analysis via corporate registries and Pega entity resolution",
                "Volantis Holdings Ltd (BVI): Director — Anastasia Kozlova (daughter), UBO — Viktor Kozlov (75%)",
                "Driftwood Consulting FZCO (Dubai): Nominee director structure, UBO obscured — address matches Kozlov Limassol residence",
                "Heliotrope Services Ltd (Seychelles): Bearer shares, no UBO data — used as intermediary in 2 flagged transfers",
                "K.A. Consulting OÜ (Estonia): Registered agent is same law firm as Volantis Holdings — likely connected",
                "Network topology: Hub-and-spoke with Kozlov as central node, daughter as operational director",
                "4 of 6 counterparties in the flagged transactions are part of this network",
                "Assessment: Classic layering infrastructure — funds cycle through controlled entities back to origin jurisdiction"
            ],
            artifacts: [{
                id: "network-analysis",
                type: "json",
                label: "Beneficial Ownership Network",
                data: {
                    centralNode: "Viktor Kozlov",
                    networkEntities: [
                        { name: "Volantis Holdings Ltd", jurisdiction: "BVI", role: "Primary receiving vehicle", ubo: "Viktor Kozlov (75%)", director: "Anastasia Kozlova" },
                        { name: "Driftwood Consulting FZCO", jurisdiction: "Dubai", role: "Layering intermediary", ubo: "Obscured (nominee structure)", link: "Address matches Kozlov residence" },
                        { name: "Heliotrope Services Ltd", jurisdiction: "Seychelles", role: "Pass-through entity", ubo: "Bearer shares — unresolved", link: "Intermediary in 2 flagged transfers" },
                        { name: "K.A. Consulting OÜ", jurisdiction: "Estonia", role: "Terminal recipient", ubo: "Unknown", link: "Same registered agent as Volantis Holdings" }
                    ],
                    topology: "Hub-and-spoke",
                    networkTransactionVolume: "€1,597,000 (68% of flagged total)",
                    assessment: "Controlled entity network consistent with layering infrastructure for sanctions evasion"
                }
            }]
        },
        {
            id: "step-7",
            title_p: "Investigation complete — assembling findings for analyst review...",
            title_s: "Escalation recommended — SAR filing required. Awaiting analyst approval.",
            reasoning: [
                "Investigation summary: Confirmed PEP with active shell company network and layering pattern",
                "Risk factors: (1) Confirmed Tier 1 PEP, (2) €2.3M layered through controlled entities, (3) Stale KYC (14 months), (4) Corroborating adverse media, (5) Family member directs counterparty entity",
                "Recommendation: File Suspicious Activity Report (SAR) with national FIU",
                "Secondary actions: (1) Freeze outbound transfers pending SAR, (2) Trigger enhanced CDD refresh, (3) Notify MLRO",
                "Confidence in recommendation: 94% — multiple independent risk indicators converge",
                "ANALYST ACTION REQUIRED: Approve escalation to SAR filing or override with alternative disposition"
            ],
            artifacts: [{
                id: "investigation-summary",
                type: "json",
                label: "Investigation Summary & Recommendation",
                data: {
                    alertId: "ALT-88241",
                    subject: "Viktor Andreyevich Kozlov",
                    pepConfirmed: true,
                    pepRole: "Former Deputy Minister of Energy, Russia (2008–2014)",
                    flaggedAmount: "€2,347,000",
                    transactionPattern: "Multi-jurisdiction layering via controlled shell entities",
                    adverseMedia: "3 corroborating hits (Reuters, OCCRP, Transparency International)",
                    shellCompanyNetwork: "4 entities across BVI, Dubai, Seychelles, Estonia",
                    kycStatus: "Stale — 14 months since last CDD refresh",
                    recommendation: "File SAR with national FIU",
                    secondaryActions: ["Freeze outbound transfers", "Trigger enhanced CDD", "Notify MLRO"],
                    confidence: "94%"
                }
            }],
            isHitl: true,
            signalName: "APPROVE_ESCALATION"
        },
        {
            id: "step-8",
            title_p: "Generating SAR narrative draft based on investigation findings...",
            title_s: "SAR narrative generated — 2,400-word draft ready for MLRO review",
            reasoning: [
                "SAR Part I: Subject information populated from KYC profile and PEP screening results",
                "SAR Part II: Suspicious activity narrative — 2,400 words covering all investigation findings",
                "SAR Part III: Financial institution information and reporting officer details",
                "Narrative covers: PEP status, transaction pattern analysis, shell company network, adverse media corroboration",
                "Timeline of suspicious activity: June 2025 — March 2026 (10-month window)",
                "Total suspicious amount: €2,347,000 across 14 transactions",
                "Draft ready for MLRO review and regulatory submission"
            ],
            artifacts: [{
                id: "sar-draft",
                type: "json",
                label: "SAR Narrative Draft",
                data: {
                    sarType: "Suspicious Activity Report",
                    filingJurisdiction: "Cyprus — MOKAS (FIU)",
                    subjectName: "Viktor Andreyevich Kozlov",
                    subjectDOB: "1961-04-12",
                    subjectNationality: "Russian Federation",
                    suspiciousActivityPeriod: "June 2025 — March 2026",
                    totalSuspiciousAmount: "€2,347,000",
                    transactionCount: 14,
                    narrativeSections: [
                        "1. Subject Background & PEP Status",
                        "2. Account Activity & Transaction Pattern Analysis",
                        "3. Counterparty & Beneficial Ownership Analysis",
                        "4. Adverse Media & Open Source Intelligence",
                        "5. Indicators of Suspicious Activity",
                        "6. Conclusion & Recommended Actions"
                    ],
                    indicatorsOfSuspicion: [
                        "Confirmed PEP with undisclosed political exposure",
                        "Rapid layering of €2.3M through controlled entities across 3 jurisdictions",
                        "Round-amount structuring (64% of transfers)",
                        "No commercial rationale or supporting documentation",
                        "Family member directs primary receiving entity",
                        "Corroborating adverse media re: sanctions evasion and unexplained wealth"
                    ],
                    wordCount: 2400,
                    status: "Draft — pending MLRO review"
                }
            }]
        },
        {
            id: "step-9",
            title_p: "Filing SAR in Pega Case Management and triggering downstream actions...",
            title_s: "SAR filed — case SAR-2026-0417 created, account restrictions applied",
            reasoning: [
                "SAR filed in Pega under case ID SAR-2026-0417",
                "MOKAS (Cyprus FIU) submission queued — regulatory deadline: 15 business days",
                "Account restrictions applied: Outbound wire transfers blocked pending FIU response",
                "Enhanced CDD review triggered — assigned to KYC team (due in 10 business days)",
                "MLRO notification sent via Pega workflow",
                "Alert ALT-88241 status updated to 'SAR Filed' in Pega AML",
                "Full audit trail preserved — investigation timeline, evidence, and decision rationale logged"
            ],
            artifacts: [{
                id: "sar-filing-video",
                type: "video",
                label: "Browser Recording — Pega SAR Filing",
                videoPath: "/data/pega_sar_filing.webm"
            }]
        }
    ];

    // --- Main Loop ---
    for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const isFinal = i === steps.length - 1;

        // Processing state
        updateProcessLog(PROCESS_ID, {
            id: step.id,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            title: step.title_p,
            status: "processing"
        });
        await updateProcessListStatus(PROCESS_ID, "In Progress", step.title_p);
        await delay(2200);

        // Check if HITL step
        if (step.isHitl) {
            updateProcessLog(PROCESS_ID, {
                id: step.id,
                title: step.title_s,
                status: "warning",
                reasoning: step.reasoning || [],
                artifacts: step.artifacts || []
            });
            await updateProcessListStatus(PROCESS_ID, "Needs Attention", step.title_s);

            await waitForSignal(step.signalName);
            await updateProcessListStatus(PROCESS_ID, "In Progress", `Approved: ${step.title_s}`);
            await delay(1500);
        } else {
            // Normal success
            updateProcessLog(PROCESS_ID, {
                id: step.id,
                title: step.title_s,
                status: isFinal ? "completed" : "success",
                reasoning: step.reasoning || [],
                artifacts: step.artifacts || []
            });
            await updateProcessListStatus(PROCESS_ID, isFinal ? "Done" : "In Progress", step.title_s);
            await delay(1500);
        }
    }

    console.log(`${PROCESS_ID} Complete: ${CASE_NAME}`);
})();
