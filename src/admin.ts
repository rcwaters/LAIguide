import { createGitHubStore } from './services/github/store';
import type { MedDataStore } from './services/interfaces';

// ── Admin configuration ─────────────────────────────────────────────────────
// REQUIRED_EMAIL_VALUE : the email must include this string (e.g. '@desc.org')
// ACCESS_CODE_HASH     : SHA-256 hex digest of the access code
//   Generate a new hash in the browser console:
//     crypto.subtle.digest('SHA-256', new TextEncoder().encode('your-code'))
//       .then(b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2,'0')).join(''))
// SESSION_TTL_HOURS    : hours before the login session expires
//
// Default access code is "1234" — change it before deploying.
const REQUIRED_EMAIL_VALUE = '@desc.org';
const ACCESS_CODE_HASH =
    '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4'; // "1234"
const SESSION_TTL_HOURS = 24;
const GITHUB_OWNER = 'rcwaters';
const GITHUB_REPO = 'LAIguide';
// ─────────────────────────────────────────────────────────────────────────────

const SESSION_KEY = 'lai_admin_session';
const TOKEN_KEY = 'lai_admin_gh_token';
let store: MedDataStore;

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const loginSection = $<HTMLDivElement>('login-section');
const editorSection = $<HTMLDivElement>('editor-section');
const emailInput = $<HTMLInputElement>('email-input');
const codeInput = $<HTMLInputElement>('code-input');
const tokenInput = $<HTMLInputElement>('token-input');
const loginBtn = $<HTMLButtonElement>('login-btn');
const loginError = $<HTMLDivElement>('login-error');
const deployStatus = $<HTMLDivElement>('deploy-status');

const userEmail = $<HTMLSpanElement>('user-email');
const logoutBtn = $<HTMLButtonElement>('logout-btn');
const medSelect = $<HTMLSelectElement>('med-select');
const newKeyInput = $<HTMLInputElement>('new-key-input');
const addBtn = $<HTMLButtonElement>('add-btn');
const saveBtn = $<HTMLButtonElement>('save-btn');
const deleteBtn = $<HTMLButtonElement>('delete-btn');
const jsonEditor = $<HTMLTextAreaElement>('json-editor');
const editorStatus = $<HTMLDivElement>('editor-status');

// ── Session helpers ─────────────────────────────────────────────────────────

interface AdminSession { email: string; loginAt: number; hasToken: boolean }

function getSession(): AdminSession | null {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    try {
        const s: AdminSession = JSON.parse(raw);
        if (Date.now() - s.loginAt > SESSION_TTL_HOURS * 3_600_000) {
            localStorage.removeItem(SESSION_KEY);
            return null;
        }
        return s;
    } catch {
        localStorage.removeItem(SESSION_KEY);
        return null;
    }
}

function setSession(email: string) {
    localStorage.setItem(
        SESSION_KEY,
        JSON.stringify({ email, loginAt: Date.now(), hasToken: true }),
    );
}

function storeToken(token: string) {
    sessionStorage.setItem(TOKEN_KEY, token);
}

function getToken(): string | null {
    return sessionStorage.getItem(TOKEN_KEY);
}

function clearToken() {
    sessionStorage.removeItem(TOKEN_KEY);
}

function initStore(token: string) {
    store = createGitHubStore(GITHUB_OWNER, GITHUB_REPO, token);
}

function clearSession() {
    localStorage.removeItem(SESSION_KEY);
    clearToken();
}

async function sha256(text: string): Promise<string> {
    const buf = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(text),
    );
    return [...new Uint8Array(buf)]
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

// ── UI helpers ──────────────────────────────────────────────────────────────

function showError(msg: string) {
    loginError.textContent = msg;
    loginError.style.display = 'block';
}

function showStatus(msg: string, ok: boolean) {
    editorStatus.textContent = msg;
    editorStatus.className = ok ? 'status-ok' : 'status-err';
}

function showEditor(email: string) {
    loginSection.style.display = 'none';
    editorSection.style.display = 'block';
    userEmail.textContent = `Signed in as ${email}`;
    loadMedList();
}

function showLogin() {
    loginSection.style.display = 'block';
    editorSection.style.display = 'none';
    jsonEditor.value = '';
    editorStatus.textContent = '';
}

// ── Data helpers ────────────────────────────────────────────────────────────

async function loadMedList() {
    medSelect.innerHTML = '<option value="">Select a medication…</option>';
    const keys = await store.listMedKeys();
    keys.sort();
    for (const k of keys) {
        const opt = document.createElement('option');
        opt.value = k;
        opt.textContent = k;
        medSelect.appendChild(opt);
    }
}

async function loadMed(key: string) {
    jsonEditor.value = '';
    editorStatus.textContent = '';
    if (!key) return;
    const data = await store.getMed(key);
    if (data) {
        jsonEditor.value = JSON.stringify(data, null, 2);
    } else {
        showStatus(`"${key}" not found in store.`, false);
    }
}

// ── Auth flow ───────────────────────────────────────────────────────────────

loginBtn.addEventListener('click', async () => {
    loginError.style.display = 'none';
    const email = emailInput.value.trim().toLowerCase();
    const code = codeInput.value;

    if (!email) { showError('Email is required.'); return; }
    if (!email.includes(REQUIRED_EMAIL_VALUE)) {
        showError(`Email must contain "${REQUIRED_EMAIL_VALUE}".`);
        return;
    }
    if (!code) { showError('Access code is required.'); return; }

    const token = tokenInput.value.trim();
    if (!token) { showError('GitHub token is required.'); return; }

    const hash = await sha256(code);
    if (hash !== ACCESS_CODE_HASH) {
        showError('Invalid access code.');
        return;
    }

    storeToken(token);
    initStore(token);
    setSession(email);
    showEditor(email);
});

codeInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') loginBtn.click();
});

logoutBtn.addEventListener('click', () => {
    clearSession();
    showLogin();
});

// Restore session on page load
const existing = getSession();
const savedToken = getToken();
if (existing && savedToken) {
    initStore(savedToken);
    showEditor(existing.email);
} else {
    clearSession();
    showLogin();
}

// ── Editor actions ──────────────────────────────────────────────────────────

medSelect.addEventListener('change', () => loadMed(medSelect.value));

addBtn.addEventListener('click', () => {
    if (newKeyInput.style.display === 'none') {
        newKeyInput.style.display = 'inline-block';
        newKeyInput.focus();
        return;
    }
    const key = newKeyInput.value.trim().toLowerCase().replace(/\s+/g, '-');
    if (!key) return;
    newKeyInput.style.display = 'none';
    newKeyInput.value = '';
    jsonEditor.value = JSON.stringify({ name: key }, null, 2);
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = key;
    medSelect.appendChild(opt);
    medSelect.value = key;
    showStatus(`New med "${key}" — edit JSON then click Save.`, true);
});

saveBtn.addEventListener('click', async () => {
    const key = medSelect.value;
    if (!key) {
        showStatus('Select or create a medication first.', false);
        return;
    }
    let data: Record<string, unknown>;
    try {
        data = JSON.parse(jsonEditor.value);
    } catch {
        showStatus('Invalid JSON — fix syntax errors before saving.', false);
        return;
    }
    try {
        await store.saveMed(key, data);
        showStatus(`Saved "${key}" — commit pushed. Site will redeploy shortly.`, true);
        deployStatus.textContent = '⏳ Deploy triggered — changes will be live in ~1-2 minutes.';
        deployStatus.style.color = '#2980b9';
    } catch (err: unknown) {
        showStatus(err instanceof Error ? err.message : 'Save failed.', false);
    }
});

deleteBtn.addEventListener('click', async () => {
    const key = medSelect.value;
    if (!key) {
        showStatus('Select a medication to delete.', false);
        return;
    }
    if (!confirm(`Delete "${key}"? This cannot be undone.`)) return;
    try {
        await store.deleteMed(key);
        showStatus(`Deleted "${key}" — commit pushed. Site will redeploy shortly.`, true);
        deployStatus.textContent = '⏳ Deploy triggered — changes will be live in ~1-2 minutes.';
        deployStatus.style.color = '#2980b9';
        await loadMedList();
        jsonEditor.value = '';
    } catch (err: unknown) {
        showStatus(err instanceof Error ? err.message : 'Delete failed.', false);
    }
});
