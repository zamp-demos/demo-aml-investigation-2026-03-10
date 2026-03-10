try { require('dotenv').config(); } catch(e) {}
const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const PORT = process.env.PORT || 3001;
const MODEL_NAME = process.env.VITE_MODEL || 'gemini-2.5-flash';
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(PUBLIC_DIR, 'data');
const KB_PATH = path.join(__dirname, 'src/data/knowledgeBase.md');
const FEEDBACK_QUEUE_PATH = path.join(__dirname, 'feedbackQueue.json');
const KB_VERSIONS_PATH = path.join(DATA_DIR, 'kbVersions.json');
const SNAPSHOTS_DIR = path.join(DATA_DIR, 'snapshots');
const PROCESSES_FILE = path.join(DATA_DIR, 'processes.json');
const BASE_PROCESSES_FILE = path.join(DATA_DIR, 'base_processes.json');

let state = { sent: false, confirmed: false, signals: {} };
const runningProcesses = new Map();

// --- Startup ---
if (fs.existsSync(BASE_PROCESSES_FILE)) {
    fs.copyFileSync(BASE_PROCESSES_FILE, PROCESSES_FILE);
}
if (!fs.existsSync(path.join(__dirname, 'interaction-signals.json'))) {
    fs.writeFileSync(path.join(__dirname, 'interaction-signals.json'), JSON.stringify({ APPROVE_ESCALATION: false, APPROVE_RFI_SEND: false }, null, 4));
}
if (!fs.existsSync(FEEDBACK_QUEUE_PATH)) fs.writeFileSync(FEEDBACK_QUEUE_PATH, '[]');
if (!fs.existsSync(KB_VERSIONS_PATH)) fs.writeFileSync(KB_VERSIONS_PATH, '[]');
if (!fs.existsSync(SNAPSHOTS_DIR)) fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
};

const parseBody = (req) => new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => { try { resolve(JSON.parse(body)); } catch(e) { resolve({}); } });
    req.on('error', reject);
});

const getMimeType = (ext) => {
    const types = { '.html':'text/html','.css':'text/css','.js':'application/javascript','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.pdf':'application/pdf','.webm':'video/webm','.mp4':'video/mp4','.md':'text/markdown','.woff2':'font/woff2','.woff':'font/woff','.ttf':'font/ttf' };
    return types[ext] || 'application/octet-stream';
};

const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

const callGemini = async (systemPrompt, messages) => {
    if (!genAI) return 'Gemini API key not configured.';
    const model = genAI.getGenerativeModel({ model: MODEL_NAME, systemInstruction: systemPrompt });
    const history = messages.slice(0, -1).map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
    const chat = model.startChat({ history });
    const last = messages[messages.length - 1];
    const result = await chat.sendMessage(last.content);
    return result.response.text();
};

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const cleanPath = url.pathname;

    // CORS preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(204, corsHeaders);
        return res.end();
    }

    // --- RESET ---
    if (cleanPath === '/reset') {
        state = { sent: false, confirmed: false, signals: {} };
        console.log('Demo Reset Triggered');

        const signalFile = path.join(__dirname, 'interaction-signals.json');
        fs.writeFileSync(signalFile, JSON.stringify({ APPROVE_ESCALATION: false, APPROVE_RFI_SEND: false }, null, 4));

        runningProcesses.forEach((proc, id) => {
            try { process.kill(-proc.pid, 'SIGKILL'); } catch (e) { }
        });
        runningProcesses.clear();

        exec('pkill -9 -f "node(.*)simulation_scripts" || true', (err) => {
            setTimeout(() => {
                const cases = [{
                    id: "AML_001",
                    name: "PEP Alert — Viktor Kozlov (Russia/Cyprus)",
                    category: "AML Investigation",
                    stockId: "SAR-2026-0417",
                    year: new Date().toISOString().split('T')[0],
                    status: "In Progress",
                    currentStatus: "Initializing...",
                    alertSource: "Pega AML",
                    riskRating: "High",
                    customerType: "Private Banking",
                    jurisdiction: "Cyprus / Russia"
                }, {
                    id: "AML_002",
                    name: "Suspicious Wire — BorderLine Logistics LLC ($1.9M to Mexico)",
                    category: "AML Investigation",
                    stockId: "INV-2025-03-0412",
                    year: new Date().toISOString().split('T')[0],
                    status: "In Progress",
                    currentStatus: "Initializing...",
                    alertSource: "Pega AIM",
                    riskRating: "High",
                    customerType: "Commercial",
                    jurisdiction: "USA / Mexico"
                }];
                fs.writeFileSync(PROCESSES_FILE, JSON.stringify(cases, null, 4));
                fs.writeFileSync(FEEDBACK_QUEUE_PATH, '[]');
                fs.writeFileSync(KB_VERSIONS_PATH, '[]');

                const scriptPath1 = path.join(__dirname, 'simulation_scripts', 'aml_story_1_needs_attention.cjs');
                const child1 = exec(`node "${scriptPath1}" > "${scriptPath1}.log" 2>&1`, (error) => {
                    if (error && error.code !== 0) console.error('Script error:', error.message);
                    runningProcesses.delete('AML_001');
                });
                runningProcesses.set('AML_001', child1);

                const scriptPath2 = path.join(__dirname, 'simulation_scripts', 'aml_story_2_needs_attention.cjs');
                const child2 = exec(`node "${scriptPath2}" > "${scriptPath2}.log" 2>&1`, (error) => {
                    if (error && error.code !== 0) console.error('Script error:', error.message);
                    runningProcesses.delete('AML_002');
                });
                runningProcesses.set('AML_002', child2);
            }, 1000);
        });

        res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ status: 'ok' }));
    }

    // --- EMAIL STATUS ---
    if (cleanPath === '/email-status' && req.method === 'GET') {
        res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ sent: state.sent }));
    }
    if (cleanPath === '/email-status' && req.method === 'POST') {
        const parsed = await parseBody(req);
        state.sent = parsed.sent || false;
        res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ status: 'ok' }));
    }

    // --- SIGNAL ---
    if (cleanPath === '/signal-status' && req.method === 'GET') {
        const signalFile = path.join(__dirname, 'interaction-signals.json');
        let signals = {};
        try { signals = JSON.parse(fs.readFileSync(signalFile, 'utf8')); } catch(e) {}
        res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(signals));
    }
    if (cleanPath === '/signal' && req.method === 'POST') {
        const parsed = await parseBody(req);
        const signalFile = path.join(__dirname, 'interaction-signals.json');
        let signals = {};
        try { signals = JSON.parse(fs.readFileSync(signalFile, 'utf8')); } catch(e) {}
        if (parsed.signal) signals[parsed.signal] = true;
        fs.writeFileSync(signalFile, JSON.stringify(signals, null, 4));
        res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ status: 'ok' }));
    }

    // --- UPDATE STATUS ---
    if (cleanPath === '/api/update-status' && req.method === 'POST') {
        const parsed = await parseBody(req);
        try {
            const processes = JSON.parse(fs.readFileSync(PROCESSES_FILE, 'utf8'));
            const idx = processes.findIndex(p => p.id === String(parsed.id));
            if (idx !== -1) {
                processes[idx].status = parsed.status;
                processes[idx].currentStatus = parsed.currentStatus;
                fs.writeFileSync(PROCESSES_FILE, JSON.stringify(processes, null, 4));
            }
        } catch(e) {}
        res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ status: 'ok' }));
    }

    // --- CHAT (dual contract) ---
    if (cleanPath === '/api/chat' && req.method === 'POST') {
        const parsed = await parseBody(req);
        try {
            let systemPrompt, messages;
            if (parsed.messages && parsed.systemPrompt) {
                systemPrompt = parsed.systemPrompt;
                messages = parsed.messages;
            } else {
                const kb = parsed.knowledgeBase || '';
                systemPrompt = `You are Pace, an AI assistant. Use this knowledge base to answer:\n\n${kb}`;
                messages = [];
                if (parsed.history) {
                    parsed.history.forEach(h => messages.push({ role: h.role === 'assistant' ? 'assistant' : 'user', content: h.content }));
                }
                messages.push({ role: 'user', content: parsed.message || '' });
            }
            const response = await callGemini(systemPrompt, messages);
            res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ response }));
        } catch(e) {
            res.writeHead(500, { ...corsHeaders, 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: e.message }));
        }
    }

    // --- FEEDBACK QUESTIONS ---
    if (cleanPath === '/api/feedback/questions' && req.method === 'POST') {
        const parsed = await parseBody(req);
        try {
            const systemPrompt = `You are a knowledge base editor. Given user feedback and the current KB, generate exactly 3 clarifying questions to understand what change is needed. Return ONLY a JSON array of 3 strings.\n\nKnowledge Base:\n${parsed.knowledgeBase || ''}`;
            const messages = [{ role: 'user', content: `Feedback: ${parsed.feedback}` }];
            const raw = await callGemini(systemPrompt, messages);
            let questions;
            try { questions = JSON.parse(raw.replace(/```json?\n?/g,'').replace(/```/g,'').trim()); } catch(e) { questions = ["Could you elaborate?", "What section needs updating?", "What's the expected outcome?"]; }
            res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ questions }));
        } catch(e) {
            res.writeHead(500, { ...corsHeaders, 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: e.message }));
        }
    }

    // --- FEEDBACK SUMMARIZE ---
    if (cleanPath === '/api/feedback/summarize' && req.method === 'POST') {
        const parsed = await parseBody(req);
        try {
            const qaPairs = (parsed.questions||[]).map((q,i) => `Q: ${q}\nA: ${(parsed.answers||[])[i]||'N/A'}`).join('\n');
            const systemPrompt = `Summarize this feedback into a clear, actionable KB change proposal (2-3 sentences).\n\nKnowledge Base:\n${parsed.knowledgeBase || ''}`;
            const messages = [{ role: 'user', content: `Feedback: ${parsed.feedback}\n\nClarifications:\n${qaPairs}` }];
            const summary = await callGemini(systemPrompt, messages);
            res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ summary }));
        } catch(e) {
            res.writeHead(500, { ...corsHeaders, 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: e.message }));
        }
    }

    // --- FEEDBACK QUEUE ---
    if (cleanPath === '/api/feedback/queue' && req.method === 'POST') {
        const parsed = await parseBody(req);
        let queue = [];
        try { queue = JSON.parse(fs.readFileSync(FEEDBACK_QUEUE_PATH, 'utf8')); } catch(e) {}
        queue.push({ ...parsed, status: 'pending', timestamp: new Date().toISOString() });
        fs.writeFileSync(FEEDBACK_QUEUE_PATH, JSON.stringify(queue, null, 4));
        res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ status: 'ok' }));
    }
    if (cleanPath === '/api/feedback/queue' && req.method === 'GET') {
        let queue = [];
        try { queue = JSON.parse(fs.readFileSync(FEEDBACK_QUEUE_PATH, 'utf8')); } catch(e) {}
        res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ queue }));
    }
    if (cleanPath.startsWith('/api/feedback/queue/') && req.method === 'DELETE') {
        const id = cleanPath.split('/').pop();
        let queue = [];
        try { queue = JSON.parse(fs.readFileSync(FEEDBACK_QUEUE_PATH, 'utf8')); } catch(e) {}
        queue = queue.filter(item => item.id !== id);
        fs.writeFileSync(FEEDBACK_QUEUE_PATH, JSON.stringify(queue, null, 4));
        res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ status: 'ok' }));
    }

    // --- FEEDBACK APPLY ---
    if (cleanPath === '/api/feedback/apply' && req.method === 'POST') {
        const parsed = await parseBody(req);
        try {
            let queue = JSON.parse(fs.readFileSync(FEEDBACK_QUEUE_PATH, 'utf8'));
            const item = queue.find(i => i.id === parsed.feedbackId);
            if (!item) { res.writeHead(404, corsHeaders); return res.end(JSON.stringify({ error: 'Not found' })); }

            const currentKB = fs.readFileSync(KB_PATH, 'utf8');
            const systemPrompt = `Apply this change to the knowledge base. Return ONLY the complete updated knowledge base content, no explanation.`;
            const messages = [{ role: 'user', content: `Current KB:\n${currentKB}\n\nChange to apply:\n${item.summary}` }];
            const updatedKB = await callGemini(systemPrompt, messages);

            // Save snapshots
            const ts = Date.now();
            const prevFile = `kb_before_${ts}.md`;
            const snapFile = `kb_after_${ts}.md`;
            fs.writeFileSync(path.join(SNAPSHOTS_DIR, prevFile), currentKB);
            fs.writeFileSync(path.join(SNAPSHOTS_DIR, snapFile), updatedKB);
            fs.writeFileSync(KB_PATH, updatedKB);

            // Update versions
            let versions = [];
            try { versions = JSON.parse(fs.readFileSync(KB_VERSIONS_PATH, 'utf8')); } catch(e) {}
            versions.push({ id: `v${versions.length + 1}`, timestamp: new Date().toISOString(), snapshotFile: snapFile, previousFile: prevFile, changes: [item.summary] });
            fs.writeFileSync(KB_VERSIONS_PATH, JSON.stringify(versions, null, 4));

            // Update queue item status
            queue = queue.map(i => i.id === parsed.feedbackId ? { ...i, status: 'applied' } : i);
            fs.writeFileSync(FEEDBACK_QUEUE_PATH, JSON.stringify(queue, null, 4));

            res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: true, content: updatedKB }));
        } catch(e) {
            res.writeHead(500, { ...corsHeaders, 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: e.message }));
        }
    }

    // --- KB CONTENT ---
    if (cleanPath === '/api/kb/content' && req.method === 'GET') {
        const versionId = url.searchParams.get('versionId');
        let content;
        if (versionId) {
            try {
                const versions = JSON.parse(fs.readFileSync(KB_VERSIONS_PATH, 'utf8'));
                const ver = versions.find(v => v.id === versionId);
                if (ver) content = fs.readFileSync(path.join(SNAPSHOTS_DIR, ver.snapshotFile), 'utf8');
            } catch(e) {}
        }
        if (!content) {
            try { content = fs.readFileSync(KB_PATH, 'utf8'); } catch(e) { content = ''; }
        }
        res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ content }));
    }

    // --- KB VERSIONS ---
    if (cleanPath === '/api/kb/versions' && req.method === 'GET') {
        let versions = [];
        try { versions = JSON.parse(fs.readFileSync(KB_VERSIONS_PATH, 'utf8')); } catch(e) {}
        res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ versions }));
    }

    // --- KB SNAPSHOT ---
    if (cleanPath.startsWith('/api/kb/snapshot/') && req.method === 'GET') {
        const filename = cleanPath.split('/').pop();
        const filePath = path.join(SNAPSHOTS_DIR, filename);
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf8');
            res.writeHead(200, { ...corsHeaders, 'Content-Type': 'text/markdown' });
            return res.end(content);
        }
        res.writeHead(404, corsHeaders);
        return res.end('Not found');
    }

    // --- KB UPDATE ---
    if (cleanPath === '/api/kb/update' && req.method === 'POST') {
        const parsed = await parseBody(req);
        if (parsed.content) fs.writeFileSync(KB_PATH, parsed.content);
        res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ status: 'ok' }));
    }

    // --- DEBUG ---
    if (cleanPath === '/debug-paths' && req.method === 'GET') {
        res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ dataDir: DATA_DIR, exists: fs.existsSync(DATA_DIR), files: fs.existsSync(DATA_DIR) ? fs.readdirSync(DATA_DIR) : [] }));
    }

    // --- STATIC FILES ---
    let filePath = path.join(PUBLIC_DIR, cleanPath === '/' ? 'index.html' : cleanPath);
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(PUBLIC_DIR, 'index.html');
    }
    if (fs.existsSync(filePath)) {
        const ext = path.extname(filePath);
        const mime = getMimeType(ext);
        const content = fs.readFileSync(filePath);
        res.writeHead(200, { ...corsHeaders, 'Content-Type': mime });
        return res.end(content);
    }
    res.writeHead(404, corsHeaders);
    res.end('Not found');
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Meridian AML Investigation server running on http://0.0.0.0:${PORT}`);
});
