const fs = require('fs');
const path = require('path');

// --- Configuration ---
const PROJECT_ROOT = path.join(__dirname, '..');
const PUBLIC_DATA_DIR = path.join(PROJECT_ROOT, 'public/data');
const PROCESSES_FILE = path.join(PUBLIC_DATA_DIR, 'processes.json');
const PROCESS_ID = "AML_002";
const CASE_NAME = "Suspicious Wire — BorderLine Logistics LLC ($1.9M to Mexico)";

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
            caseId: "INV-2025-03-0412",
            alertId: "ALT-2025-03-0871",
            customerName: "BorderLine Logistics LLC",
            alertSource: "Pega AIM",
            riskRating: "High",
            customerType: "Commercial",
            jurisdiction: "USA / Mexico",
            transactionAmount: "$1,900,000",
            beneficiary: "Transportes del Norte SA de CV"
        }
    });

    const steps = [
        {
            id: "step-1",
            title_p: "Ingesting investigation case from Pega AIM...",
            title_s: "Investigation case INV-2025-03-0412 received from Pega AIM: $1.9M wire from BorderLine Logistics LLC to Transportes del Norte SA de CV, Mexico",
            reasoning: [
                "Pega Alert Intake case ALT-2025-03-0871 created and processed",
                "Alert source: Transaction Monitoring",
                "Triggered rule 6: Transfer amount exceeding $500,000 to new beneficiary",
                "Triggered rule 11: First transaction to Mexico-based entity on this account",
                "Pega enrichment completed: customer profile, KYC file, 24-month transaction history, beneficial ownership records assembled",
                "DLA network indexed: subject, account, transaction, and beneficiary vertices created",
                "Risk score assigned: 68/100",
                "Priority: High — routed to L2 investigation queue",
                "Customer profile: BorderLine Logistics LLC, San Antonio TX, commercial freight and last-mile delivery, account open since 2017"
            ],
            artifacts: [
                { id: "txn-details", type: "file", label: "Transaction Details", pdfPath: "/data/borderline_transaction_details.pdf" },
                { id: "rules-applied", type: "file", label: "View Rules Applied", pdfPath: "/data/borderline_rules_applied.pdf" },
                { id: "customer-profile", type: "file", label: "Customer Profile", pdfPath: "/data/borderline_customer_profile.pdf" },
                { id: "kyc-file", type: "file", label: "KYC File", pdfPath: "/data/borderline_kyc_file.pdf" },
                { id: "txn-history", type: "file", label: "Transaction History (24 months)", pdfPath: "/data/borderline_transaction_history_24m.pdf" },
                { id: "bo-records", type: "file", label: "Beneficial Ownership Records", pdfPath: "/data/borderline_beneficial_ownership.pdf" },
                { id: "dla-network", type: "file", label: "DLA Network Graph", pdfPath: "/data/borderline_dla_network_graph.pdf" }
            ]
        },
        {
            id: "step-2",
            title_p: "Verifying beneficiary \"Transportes del Norte SA de CV\" against public registries...",
            title_s: "Beneficiary \"Transportes del Norte SA de CV\" verified as established Mexican logistics company",
            reasoning: [
                "SAT (Mexico tax registry) confirms active registration since 2004",
                "Registered activity: freight transportation and warehouse operations",
                "LinkedIn presence shows 300+ employees across three Mexican states",
                "No adverse media on LexisNexis or Google News",
                "No OFAC, UN, or EU sanctions matches",
                "Beneficiary appears legitimate — no concerns identified"
            ],
            artifacts: [
                { id: "sat-registry", type: "link", label: "SAT Mexico Registry", url: "https://www.sat.gob.mx" },
                { id: "linkedin-tdn", type: "link", label: "LinkedIn", url: "https://www.linkedin.com" },
                { id: "lexisnexis-tdn", type: "link", label: "LexisNexis", url: "https://www.lexisnexis.com" }
            ]
        },
        {
            id: "step-3",
            title_p: "Investigating customer business context and public filings...",
            title_s: "Customer business context supports a Mexico expansion — USPS border-state contract identified",
            reasoning: [
                "SEC EDGAR filing shows BorderLine Logistics disclosed a USPS last-mile delivery contract for TX, AZ, and NM in Q4 2024",
                "Contract value: $14M over 3 years",
                "Press release on company website confirms cross-border warehousing as part of fulfillment strategy",
                "$1.9M is plausible as upfront warehouse lease and fleet staging costs against a $14M contract"
            ],
            artifacts: [
                { id: "sec-edgar", type: "link", label: "SEC EDGAR Filing", url: "https://www.sec.gov/cgi-bin/browse-edgar" },
                { id: "press-release", type: "link", label: "Company Press Release", url: "https://www.borderlinelogistics.com/press" }
            ]
        },
        {
            id: "step-4",
            title_p: "Reviewing 24-month transaction history for anomalous inflows...",
            title_s: "Source of funds concern: $2.4M in inbound wires from unrelated entity \"Orion Realty Partners LLC\" over past 6 months",
            reasoning: [
                "24-month transaction history review found 9 inbound wires from Orion Realty Partners LLC totaling $2.4M between September 2024 and February 2025",
                "Orion Realty Partners is not referenced anywhere in BorderLine's KYC file or declared business relationships",
                "A logistics company receiving recurring large payments from a real estate entity has no obvious commercial explanation",
                "The $1.9M Mexico wire was sent 11 days after the most recent $310,000 inbound from Orion Realty",
                "Possible that the Mexico wire is funded in part by these unexplained inflows rather than by BorderLine's operating revenue",
                "Customer's average monthly operating revenue is approximately $420,000 — the $1.9M wire exceeds 4 months of revenue without the Orion inflows"
            ],
            artifacts: [
                { id: "orion-inflow", type: "file", label: "Orion Realty Inflow Analysis", pdfPath: "/data/orion_realty_inflow_analysis.pdf" },
                { id: "txn-timeline", type: "file", label: "Transaction Timeline", pdfPath: "/data/borderline_transaction_timeline.pdf" }
            ]
        },
        {
            id: "step-5",
            title_p: "Investigating Orion Realty Partners LLC via public registries and open sources...",
            title_s: "Orion Realty Partners LLC investigated — registered Delaware entity with limited but verifiable footprint",
            reasoning: [
                "Delaware Division of Corporations shows Orion Realty Partners LLC registered in 2019",
                "Browser search found a basic company website listing commercial property management in Dallas-Fort Worth area",
                "Texas Comptroller of Public Accounts shows active franchise tax status",
                "BBB listing found with 3 reviews, no complaints",
                "No adverse media on Google News or LexisNexis",
                "Entity appears to be a small but real operating business — not a shell",
                "However, the commercial relationship between a logistics company and a real estate management firm is still unexplained"
            ],
            artifacts: [
                { id: "delaware-corp", type: "link", label: "Delaware Division of Corporations", url: "https://icis.corp.delaware.gov/ecorp/entitysearch" },
                { id: "orion-website", type: "link", label: "Orion Realty Website", url: "https://www.orionrealtypartners.com" },
                { id: "texas-comptroller", type: "link", label: "Texas Comptroller", url: "https://mycpa.cpa.state.tx.us/coa" },
                { id: "bbb-orion", type: "link", label: "BBB", url: "https://www.bbb.org" }
            ]
        },
        {
            id: "step-6",
            title_p: "Updating risk assessment based on source of funds findings...",
            title_s: "Risk score updated to 74/100",
            reasoning: [
                "Beneficiary verified as legitimate — no counterparty concern",
                "Customer has documented business reason for Mexico transaction",
                "However, $2.4M in unexplained inflows from an unrelated industry creates a source of funds question",
                "The Mexico wire may be clean but the money funding it may not be",
                "Cannot close without understanding the Orion Realty relationship"
            ],
            artifacts: [
                { id: "risk-assessment", type: "file", label: "Risk Assessment", pdfPath: "/data/borderline_risk_assessment.pdf" }
            ]
        },
        {
            id: "step-7",
            title_p: "Generating RFI for BorderLine Logistics LLC — documentation required to resolve source of funds question...",
            title_s: "RFI generated: Documentation requested from BorderLine Logistics LLC",
            reasoning: [
                "RFI Reference: RFI-2025-03-0341",
                "Due date: 03/17/2025 (10 business days)",
                "SLA tracking: Active",
                "Requested: warehouse lease agreement with Transportes del Norte, board resolution approving Mexico expansion spend, USPS contract excerpt confirming cross-border scope",
                "Additionally requested: explanation of business relationship with Orion Realty Partners LLC and documentation supporting the 9 inbound wire transfers totaling $2.4M",
                "RFI framed as routine enhanced due diligence review triggered by increased transaction activity"
            ],
            artifacts: [
                { id: "rfi-email", type: "email_draft", label: "RFI Email Draft", data: {
                    to: "compliance@borderlinelogistics.com",
                    from: "aml-investigations@meridianbank.com",
                    subject: "Routine Document Request — BorderLine Logistics LLC (Ref: RFI-2025-03-0341)",
                    body: "Dear BorderLine Logistics LLC Compliance Team,\n\nAs part of our routine enhanced due diligence review triggered by increased transaction activity, we are requesting the following documentation:\n\n1. Warehouse lease agreement with Transportes del Norte SA de CV\n2. Board resolution approving Mexico expansion expenditure\n3. USPS contract excerpt confirming cross-border logistics scope\n4. Documentation explaining business relationship with Orion Realty Partners LLC\n5. Supporting documentation for 9 inbound wire transfers totaling $2.4M from Orion Realty Partners LLC\n\nPlease provide the requested documents by March 17, 2025 (10 business days).\n\nThis request is part of our standard compliance procedures and does not imply any negative finding.\n\nRegards,\nAML Investigations Unit\nMeridian Bank"
                } }
            ],
            isHitl: true,
            signalName: "APPROVE_RFI_SEND"
        },
        {
            id: "step-8",
            title_p: "Processing RFI response from BorderLine Logistics LLC...",
            title_s: "RFI response received: Complete documentation provided — Orion Realty relationship explained",
            reasoning: [
                "Warehouse lease agreement provided: 5-year lease, 40,000 sq ft in Monterrey, $1.52M upfront (deposit plus 12 months prepaid)",
                "Board resolution dated January 2025 approves up to $2.5M for Mexico operations",
                "USPS contract excerpt confirms bonded warehousing requirement within 50 miles of Laredo crossing",
                "Remaining $380,000 accounted for by fleet staging invoice from Transportes del Norte",
                "Orion Realty relationship explained: BorderLine subleases 3 warehouse properties in Dallas-Fort Worth from Orion Realty and also provides last-mile delivery services for Orion's commercial tenants",
                "Sublease agreements provided for all 3 properties — monthly rents and service fees total approximately $265,000/month which is consistent with the $2.4M over 6 months",
                "Orion Realty's payments are for a legitimate logistics-real estate services arrangement"
            ],
            artifacts: [
                { id: "rfi-response-email", type: "email_draft", label: "RE: Routine Document Request — BorderLine Logistics LLC", data: {
                    isIncoming: true,
                    to: "aml-investigations@meridianbank.com",
                    from: "m.chen@borderlinelogistics.com",
                    subject: "RE: Routine Document Request — BorderLine Logistics LLC (Ref: RFI-2025-03-0341)",
                    body: "Dear AML Investigations Unit,\n\nThank you for your inquiry. Please find attached all requested documentation:\n\n1. Warehouse Lease Agreement — 5-year lease for 40,000 sq ft facility in Monterrey with Transportes del Norte SA de CV. Upfront payment of $1.52M covers security deposit and 12 months prepaid rent.\n\n2. Board Resolution (January 2025) — Authorizes up to $2.5M in capital expenditure for Mexico cross-border operations expansion.\n\n3. USPS Contract Excerpt — Confirms bonded warehousing requirement within 50 miles of Laredo border crossing for our USPS last-mile contract.\n\n4. Orion Realty Partners Relationship — BorderLine subleases three warehouse properties in the Dallas-Fort Worth area from Orion Realty Partners LLC. We also provide last-mile delivery services for Orion’s commercial tenants. Sublease agreements for all three properties are attached. Monthly rents and service fees total approximately $265,000/month.\n\n5. Fleet Staging Invoice — $380,000 invoice from Transportes del Norte for fleet staging and cross-dock setup at the Monterrey facility.\n\nPlease let us know if you require any additional documentation.\n\nBest regards,\nMichael Chen\nChief Financial Officer\nBorderLine Logistics LLC"
                } },
                { id: "warehouse-lease", type: "file", label: "Warehouse_Lease_Monterrey.pdf", pdfPath: "/data/warehouse_lease_monterrey.pdf" },
                { id: "board-resolution", type: "file", label: "Board_Resolution_Jan2025.pdf", pdfPath: "/data/board_resolution_jan2025.pdf" },
                { id: "usps-contract", type: "file", label: "USPS_Contract_Excerpt.pdf", pdfPath: "/data/usps_contract_excerpt.pdf" },
                { id: "fleet-invoice", type: "file", label: "Fleet_Staging_Invoice.pdf", pdfPath: "/data/fleet_staging_invoice.pdf" },
                { id: "orion-sublease-1", type: "file", label: "Orion_Sublease_1.pdf", pdfPath: "/data/orion_sublease_1.pdf" },
                { id: "orion-sublease-2", type: "file", label: "Orion_Sublease_2.pdf", pdfPath: "/data/orion_sublease_2.pdf" },
                { id: "orion-sublease-3", type: "file", label: "Orion_Sublease_3.pdf", pdfPath: "/data/orion_sublease_3.pdf" },
                { id: "orion-service-agreement", type: "file", label: "Orion_Service_Agreement.pdf", pdfPath: "/data/orion_service_agreement.pdf" }
            ]
        },
        {
            id: "step-9",
            title_p: "Verifying submitted documents for internal consistency and external corroboration...",
            title_s: "Document verification: All documents internally consistent and externally verifiable",
            reasoning: [
                "Lease amounts, dates, and counterparty names align across all submitted documents",
                "Orion sublease monthly totals reconcile with the inbound wire amounts and frequency",
                "Board resolution pre-dates the Mexico wire and authorizes the spend amount",
                "USPS contract confirms the operational need for Mexican warehousing",
                "Orion Realty's franchise tax filing and public presence corroborate the sublease arrangement",
                "Wire amount fully accounted for: $1.52M lease plus $380K staging equals $1.9M",
                "Source of funds concern resolved: Orion inflows are legitimate sublease and service revenue"
            ],
            artifacts: [
                { id: "doc-verification", type: "file", label: "Document Verification Summary", pdfPath: "/data/borderline_doc_verification_summary.pdf" }
            ]
        },
        {
            id: "step-10",
            title_p: "Finalizing case disposition and updating risk score...",
            title_s: "Alert resolved: All triggered rules addressed, source of funds verified. Risk score updated to 20/100",
            reasoning: [
                "Beneficiary is legitimate with 20-year operating history",
                "Customer has documented and verifiable business reason for the transaction",
                "Wire amount fully reconciled against lease and staging costs",
                "Source of funds question resolved — Orion Realty payments are documented sublease revenue",
                "Customer responded promptly, completely, and with no inconsistencies",
                "No indicators of layering, structuring, or illicit fund movement"
            ],
            artifacts: [
                { id: "case-summary", type: "file", label: "Case Summary", pdfPath: "/data/borderline_case_summary.pdf" }
            ]
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
