const fs = require('fs');
const path = require('path');

// --- Configuration ---
const PROJECT_ROOT = path.join(__dirname, '..');
const PUBLIC_DATA_DIR = path.join(PROJECT_ROOT, 'public/data');
const PROCESSES_FILE = path.join(PUBLIC_DATA_DIR, 'processes.json');
const PROCESS_ID = "AML_003";
const CASE_NAME = "Export Control Risk — Hartwell Manufacturing Inc ($840K to Hong Kong)";

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
            caseId: "INV-2025-06-0298",
            alertId: "ALT-2025-06-0514",
            customerName: "Hartwell Manufacturing Inc",
            alertSource: "Pega AIM",
            riskRating: "High",
            customerType: "Commercial",
            jurisdiction: "USA / Hong Kong",
            transactionAmount: "$840,000",
            beneficiary: "Zhengda Industrial Supply Co Ltd"
        }
    });

    const steps = [
        {
            id: "step-1",
            title_p: "Ingesting investigation case from Pega AIM...",
            title_s: "Investigation case INV-2025-06-0298 received from Pega AIM: $840,000 wire from Hartwell Manufacturing Inc to Zhengda Industrial Supply Co Ltd, Hong Kong",
            reasoning: [
                "Pega Alert Intake case ALT-2025-06-0514 created and processed",
                "Alert source: Transaction Monitoring",
                "Triggered rule 6: Transfer amount exceeding $500,000 to new beneficiary",
                "Triggered rule 14: First transaction to Hong Kong-based entity on this account",
                "Pega enrichment completed: customer profile, KYC file, 36-month transaction history, beneficial ownership records assembled",
                "DLA network indexed: subject, account, transaction, beneficiary vertices created",
                "Risk score assigned: 65/100",
                "Priority: High — routed to L2 investigation queue",
                "Customer profile: Hartwell Manufacturing Inc, Cleveland OH, industrial valve and pump manufacturer, account open since 2009"
            ],
            artifacts: [
                { id: "txn-details", type: "file", label: "Transaction Details", pdfPath: "/data/hartwell_transaction_details.pdf" },
                { id: "rules-applied", type: "file", label: "View Rules Applied", pdfPath: "/data/hartwell_rules_applied.pdf" },
                { id: "customer-profile", type: "file", label: "Customer Profile", pdfPath: "/data/hartwell_customer_profile.pdf" },
                { id: "kyc-file", type: "file", label: "KYC File", pdfPath: "/data/hartwell_kyc_file.pdf" },
                { id: "txn-history", type: "file", label: "Transaction History (36 months)", pdfPath: "/data/hartwell_transaction_history_36m.pdf" },
                { id: "bo-records", type: "file", label: "Beneficial Ownership Records", pdfPath: "/data/hartwell_beneficial_ownership.pdf" },
                { id: "dla-network", type: "file", label: "DLA Network Graph", pdfPath: "/data/hartwell_dla_network_graph.pdf" }
            ]
        },
        {
            id: "step-2",
            title_p: "Reviewing customer profile and compliance history...",
            title_s: "Customer profile reviewed: Established US manufacturer with clean compliance history",
            reasoning: [
                "Hartwell Manufacturing Inc, incorporated Ohio 1987, 145 employees per LinkedIn",
                "Manufactures industrial valves and pumps for oil and gas sector",
                "Annual revenue $38M per most recent SEC filing",
                "UBO: David Hartwell, 63, US citizen, no PEP matches, no adverse media",
                "No prior SARs, no previous alerts, no sanctions hits",
                "Account history shows regular international wires to suppliers in Germany, Japan, and South Korea",
                "Hong Kong is a new corridor for this customer but international procurement is core to their business",
                "$840,000 is within range of their typical supplier payments ($200K–$1.2M)"
            ],
            artifacts: [
                { id: "sec-filing", type: "link", label: "SEC Filing", url: "https://www.sec.gov/cgi-bin/browse-edgar" },
                { id: "linkedin-hw", type: "link", label: "LinkedIn", url: "https://www.linkedin.com" },
                { id: "worldcheck-hw", type: "link", label: "WorldCheck", url: "https://www.refinitiv.com/en/products/world-check-kyc-screening" },
                { id: "lexisnexis-hw", type: "link", label: "LexisNexis", url: "https://www.lexisnexis.com" }
            ]
        },
        {
            id: "step-3",
            title_p: "Analyzing transaction patterns against historical behavior...",
            title_s: "Transaction pattern analysis: Wire is consistent with customer's procurement behavior",
            reasoning: [
                "Customer averages 4-6 international supplier payments per quarter",
                "Amounts range from $200K to $1.2M — $840K falls within this band",
                "Timing aligns with Q2 procurement cycle visible in prior years",
                "No velocity anomaly, no structuring indicators, no round-amount concerns",
                "Only deviation from historical pattern is the new geography (Hong Kong)"
            ],
            artifacts: [
                { id: "pattern-analysis", type: "file", label: "Pattern Analysis", pdfPath: "/data/hartwell_pattern_analysis.pdf" }
            ]
        },
        {
            id: "step-4",
            title_p: "Investigating counterparty \"Zhengda Industrial Supply Co Ltd\" via public registries...",
            title_s: "Counterparty \"Zhengda Industrial Supply Co Ltd\" — company exists but beneficial ownership raises concerns",
            reasoning: [
                "Hong Kong Companies Registry confirms Zhengda Industrial Supply registered in 2019",
                "Listed activity: wholesale industrial machinery and components",
                "Company has a basic website listing valve and pump parts — products are relevant to Hartwell's business",
                "However, browser search on directors returned a match on one director: Chen Weiming",
                "Chen Weiming appears on a 2023 BIS Entity List addition for involvement in unauthorized re-export of controlled industrial components to sanctioned jurisdictions",
                "BIS listing references re-export of dual-use pump components to Iran through intermediary companies in Hong Kong and Malaysia",
                "Chen Weiming is listed as director of Zhengda and two other Hong Kong entities named in the BIS action"
            ],
            artifacts: [
                { id: "hk-registry", type: "link", label: "HK Companies Registry", url: "https://www.icris.cr.gov.hk/csci" },
                { id: "zhengda-website", type: "link", label: "Zhengda Website", url: "https://www.zhengda-industrial.com" },
                { id: "bis-entity-list", type: "link", label: "BIS Entity List", url: "https://www.bis.doc.gov/index.php/the-entity-list" }
            ]
        },
        {
            id: "step-5",
            title_p: "Cross-referencing Zhengda's registered address against BIS enforcement records...",
            title_s: "Additional research: Zhengda shares registered address with another BIS-listed entity",
            reasoning: [
                "Zhengda's registered address in Kwun Tong, Kowloon is shared with Apex Precision Parts Ltd",
                "Apex Precision Parts appears on the same 2023 BIS Entity List action as Chen Weiming",
                "BIS filing describes a network of Hong Kong companies used to procure US-origin industrial components and re-export to Iran",
                "Zhengda itself is not named on the BIS Entity List — only its director and its co-located entity are listed",
                "This creates ambiguity: Zhengda could be a separate legitimate business that happens to share a director and address, or it could be part of the same procurement network"
            ],
            artifacts: [
                { id: "bis-filing", type: "link", label: "BIS Entity List Filing", url: "https://www.bis.doc.gov/index.php/the-entity-list" },
                { id: "hk-registry-apex", type: "link", label: "HK Companies Registry — Apex", url: "https://www.icris.cr.gov.hk/csci" }
            ]
        },
        {
            id: "step-6",
            title_p: "Running OFAC and export control cross-checks on Zhengda Industrial Supply...",
            title_s: "OFAC and export control cross-check on Zhengda Industrial Supply",
            reasoning: [
                "Zhengda is not on the OFAC SDN list",
                "Zhengda is not on the BIS Entity List directly",
                "However, transacting with an entity whose director is BIS-listed creates potential export control liability for Hartwell",
                "Hartwell manufactures industrial valves and pumps — these are potentially EAR-controlled items depending on specifications",
                "If Hartwell's products are dual-use and Zhengda's director is involved in re-exporting controlled items to Iran, this wire could facilitate sanctions evasion even though neither the customer nor the entity itself is sanctioned",
                "The risk is not AML in the traditional sense — it is proliferation financing and export control violation risk"
            ],
            artifacts: [
                { id: "ofac-check", type: "file", label: "OFAC SDN Check", pdfPath: "/data/hartwell_ofac_sdn_check.pdf" },
                { id: "ear-reference", type: "file", label: "EAR Control Classification Reference", pdfPath: "/data/hartwell_ear_classification.pdf" }
            ]
        },
        {
            id: "step-7",
            title_p: "Updating risk assessment based on counterparty and export control findings...",
            title_s: "Risk score updated to 82/100",
            reasoning: [
                "Customer is clean with a legitimate business need for industrial component procurement",
                "Transaction amount and pattern are consistent with normal purchasing behavior",
                "However, counterparty's director is BIS-listed for re-export violations to Iran",
                "Counterparty shares address with another BIS-listed entity",
                "Potential for Hartwell's products to be re-exported to sanctioned jurisdiction through Zhengda",
                "Customer may be entirely unaware of counterparty's director and associated entities"
            ],
            artifacts: [
                { id: "risk-assessment", type: "file", label: "Risk Assessment", pdfPath: "/data/hartwell_risk_assessment.pdf" }
            ]
        },
        {
            id: "step-8",
            title_p: "Evaluating disposition options — clean customer but counterparty presents export control concerns...",
            title_s: "Decision required: Customer is clean but counterparty presents export control and proliferation concerns",
            reasoning: [
                "Customer Hartwell Manufacturing Inc has no adverse indicators and a legitimate procurement need",
                "Counterparty Zhengda Industrial Supply is not itself sanctioned or listed",
                "However, Zhengda's director Chen Weiming is on the BIS Entity List for re-export of dual-use components to Iran",
                "Zhengda shares its registered address with Apex Precision Parts, another BIS-listed entity",
                "Hartwell's products (industrial valves and pumps) are potentially EAR-controlled dual-use items",
                "Two recommended actions under consideration:",
                "Option 1: Do not file SAR, add Zhengda to internal watchlist, enhanced monitoring on Hartwell's account",
                "Option 2: File SAR, add Zhengda to internal watchlist, notify Hartwell about counterparty risk"
            ],
            artifacts: [],
            isHitl: true,
            signalName: "APPROVE_HARTWELL_ACTION"
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
