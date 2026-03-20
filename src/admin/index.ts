import { createGitHubStore } from '../services/github/store';
import { createLocalStore } from './localStore';
import { getSession, setSession, clearSession, sha256 } from './session';
import { REQUIRED_EMAIL_VALUE, ACCESS_CODE_HASH, GITHUB_OWNER, GITHUB_REPO } from './config';
import { renderForm, collectFormData } from './form';
import { validateMedJson } from './validate';
import type { MedDataStore } from '../services/interfaces';
import type { RawMedJson } from './types';

// ── Store ────────────────────────────────────────────────────────────────────

const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN as string;
const store: MedDataStore = GITHUB_TOKEN
    ? createGitHubStore(GITHUB_OWNER, GITHUB_REPO, GITHUB_TOKEN)
    : createLocalStore();

// ── DOM refs ─────────────────────────────────────────────────────────────────

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const loginSection  = $<HTMLDivElement>('login-section');
const editorSection = $<HTMLDivElement>('editor-section');
const emailInput    = $<HTMLInputElement>('email-input');
const codeInput     = $<HTMLInputElement>('code-input');
const loginBtn      = $<HTMLButtonElement>('login-btn');
const loginError    = $<HTMLDivElement>('login-error');
const deployStatus  = $<HTMLDivElement>('deploy-status');
const userEmail     = $<HTMLSpanElement>('user-email');
const logoutBtn     = $<HTMLButtonElement>('logout-btn');
const medSelect     = $<HTMLSelectElement>('med-select');
const saveBtn       = $<HTMLButtonElement>('save-btn');
const deleteBtn     = $<HTMLButtonElement>('delete-btn');
const jsonEditor    = $<HTMLTextAreaElement>('json-editor');
const jsonSection   = $<HTMLDivElement>('json-section');
const formEditorEl  = $<HTMLDivElement>('form-editor');
const toggleJsonBtn = $<HTMLButtonElement>('toggle-json-btn');
const editorStatus  = $<HTMLDivElement>('editor-status');

// ── State ────────────────────────────────────────────────────────────────────

let currentMedData: Record<string, unknown> | null = null;
let jsonMode = false;

// ── UI helpers ───────────────────────────────────────────────────────────────

function showLoginError(msg: string): void {
    loginError.textContent = msg;
    loginError.style.display = 'block';
}

function showStatus(msg: string, ok: boolean): void {
    editorStatus.textContent = msg;
    editorStatus.className = ok ? 'status-ok' : 'status-err';
}

// ── View transitions ─────────────────────────────────────────────────────────

function showEditor(email: string): void {
    loginSection.style.display = 'none';
    editorSection.style.display = 'block';
    userEmail.textContent = email;
    void loadMedList();
}

function showLogin(): void {
    loginSection.style.display = 'block';
    editorSection.style.display = 'none';
    formEditorEl.innerHTML = '';
    jsonEditor.value = '';
    editorStatus.textContent = '';
}

// ── Data loading ─────────────────────────────────────────────────────────────

async function loadMedList(): Promise<void> {
    medSelect.innerHTML = '<option value="">Select a medication…</option>';
    const keys = await store.listMedKeys();
    keys.sort();
    const meds = await Promise.all(keys.map(async k => {
        const d = await store.getMed(k);
        return { key: k, displayName: (d?.displayName as string) ?? k };
    }));
    for (const m of meds) {
        const opt = document.createElement('option');
        opt.value = m.key;
        opt.textContent = m.displayName;
        medSelect.appendChild(opt);
    }
}

async function loadMed(key: string): Promise<void> {
    formEditorEl.innerHTML = '';
    jsonEditor.value = '';
    editorStatus.textContent = '';
    deployStatus.textContent = '';
    currentMedData = null;
    if (!key) return;
    const data = await store.getMed(key);
    if (data) {
        currentMedData = data;
        renderForm(formEditorEl, data as RawMedJson);
        jsonEditor.value = JSON.stringify(data, null, 2);
    } else {
        showStatus(`"${key}" not found.`, false);
    }
}

// ── Auth flow ─────────────────────────────────────────────────────────────────

loginBtn.addEventListener('click', async () => {
    loginError.style.display = 'none';
    const email = emailInput.value.trim().toLowerCase();
    const code = codeInput.value;

    if (!email) { showLoginError('Email is required.'); return; }
    if (!code)  { showLoginError('Access code is required.'); return; }

    const hash = await sha256(code);
    if (!email.includes(REQUIRED_EMAIL_VALUE) || hash !== ACCESS_CODE_HASH) {
        showLoginError('Email and/or access code is invalid.');
        return;
    }

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

const existing = getSession();
if (existing) { showEditor(existing.email); } else { showLogin(); }

// ── Editor actions ────────────────────────────────────────────────────────────

medSelect.addEventListener('change', () => void loadMed(medSelect.value));

toggleJsonBtn.addEventListener('click', () => {
    jsonMode = !jsonMode;
    if (jsonMode) {
        if (currentMedData) {
            jsonEditor.value = JSON.stringify(collectFormData(formEditorEl, currentMedData), null, 2);
        }
        formEditorEl.style.display = 'none';
        jsonSection.style.display = 'block';
        toggleJsonBtn.textContent = 'Form View';
    } else {
        try {
            const parsed = JSON.parse(jsonEditor.value) as Record<string, unknown>;
            currentMedData = parsed;
            renderForm(formEditorEl, parsed as RawMedJson);
        } catch {
            showStatus('Invalid JSON — cannot switch to form view.', false);
            return;
        }
        formEditorEl.style.display = 'block';
        jsonSection.style.display = 'none';
        toggleJsonBtn.textContent = 'Raw JSON';
    }
});

saveBtn.addEventListener('click', async () => {
    const key = medSelect.value;
    if (!key) { showStatus('Select a medication first.', false); return; }

    let raw: unknown;
    if (jsonMode) {
        try {
            raw = JSON.parse(jsonEditor.value);
        } catch {
            showStatus('Invalid JSON — fix syntax errors before saving.', false);
            return;
        }
    } else {
        raw = currentMedData ? collectFormData(formEditorEl, currentMedData) : {};
    }

    const result = validateMedJson(raw);
    if (!result.ok) {
        showStatus(`⚠ Invalid value: ${result.error}`, false);
        return;
    }

    try {
        await store.saveMed(key, result.data);
        currentMedData = result.data;
        if (GITHUB_TOKEN) {
            showStatus(`✓ Saved "${key}" — commit pushed. Site will redeploy shortly.`, true);
            deployStatus.textContent = '⏳ Deploy triggered — changes will be live in ~1-2 minutes.';
            deployStatus.style.color = '#2980b9';
        } else {
            showStatus(`✓ Saved "${key}" locally — no GitHub token, changes will not persist on reload.`, true);
        }
    } catch (err: unknown) {
        showStatus(err instanceof Error ? err.message : 'Save failed.', false);
    }
});

deleteBtn.addEventListener('click', async () => {
    const key = medSelect.value;
    if (!key) { showStatus('Select a medication to delete.', false); return; }
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
