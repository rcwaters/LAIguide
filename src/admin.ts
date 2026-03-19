import { createGitHubStore } from './services/github/store';
import type { MedDataStore } from './services/interfaces';

// ── Local file-based store (dev fallback when no GitHub token) ──────────────
const localJsonModules = import.meta.glob<Record<string, unknown>>('./meds/*.json', { eager: true, import: 'default' });

function createLocalStore(): MedDataStore {
    const meds: Record<string, Record<string, unknown>> = {};
    for (const [path, data] of Object.entries(localJsonModules)) {
        const key = path.split('/').pop()!.replace(/\.json$/, '');
        meds[key] = data;
    }
    return {
        async listMedKeys() { return Object.keys(meds); },
        async getMed(key) { return meds[key] ?? null; },
        async getAllMeds() { return Object.values(meds); },
        async saveMed() { throw new Error('Save disabled — no GitHub token configured. Add VITE_GITHUB_TOKEN to .env'); },
        async deleteMed() { throw new Error('Delete disabled — no GitHub token configured. Add VITE_GITHUB_TOKEN to .env'); },
    };
}

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
const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN as string;
const store: MedDataStore = GITHUB_TOKEN
    ? createGitHubStore(GITHUB_OWNER, GITHUB_REPO, GITHUB_TOKEN)
    : createLocalStore();

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const loginSection = $<HTMLDivElement>('login-section');
const editorSection = $<HTMLDivElement>('editor-section');
const emailInput = $<HTMLInputElement>('email-input');
const codeInput = $<HTMLInputElement>('code-input');
const loginBtn = $<HTMLButtonElement>('login-btn');
const loginError = $<HTMLDivElement>('login-error');
const deployStatus = $<HTMLDivElement>('deploy-status');

const userEmail = $<HTMLSpanElement>('user-email');
const logoutBtn = $<HTMLButtonElement>('logout-btn');
const medSelect = $<HTMLSelectElement>('med-select');
const saveBtn = $<HTMLButtonElement>('save-btn');
const deleteBtn = $<HTMLButtonElement>('delete-btn');
const jsonEditor = $<HTMLTextAreaElement>('json-editor');
const jsonSection = $<HTMLDivElement>('json-section');
const formEditor = $<HTMLDivElement>('form-editor');
const toggleJsonBtn = $<HTMLButtonElement>('toggle-json-btn');
const editorStatus = $<HTMLDivElement>('editor-status');

// ── Session helpers ─────────────────────────────────────────────────────────

interface AdminSession { email: string; loginAt: number }

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
        JSON.stringify({ email, loginAt: Date.now() }),
    );
}

function clearSession() {
    localStorage.removeItem(SESSION_KEY);
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
    userEmail.textContent = email;
    loadMedList();
}

function showLogin() {
    loginSection.style.display = 'block';
    editorSection.style.display = 'none';
    formEditor.innerHTML = '';
    jsonEditor.value = '';
    editorStatus.textContent = '';
}

// ── Data helpers ────────────────────────────────────────────────────────────

/** The full JSON for the currently loaded med (used as the base when saving). */
let currentMedData: Record<string, unknown> | null = null;
let jsonMode = false;

async function loadMedList() {
    medSelect.innerHTML = '<option value="">Select a medication…</option>';
    const keys = await store.listMedKeys();
    keys.sort();
    // Load display names by fetching each med
    const meds = await Promise.all(keys.map(async k => {
        const d = await store.getMed(k);
        return { key: k, displayName: d?.displayName as string ?? k };
    }));
    for (const m of meds) {
        const opt = document.createElement('option');
        opt.value = m.key;
        opt.textContent = m.displayName;
        medSelect.appendChild(opt);
    }
}

async function loadMed(key: string) {
    formEditor.innerHTML = '';
    jsonEditor.value = '';
    editorStatus.textContent = '';
    deployStatus.textContent = '';
    currentMedData = null;
    if (!key) return;
    const data = await store.getMed(key);
    if (data) {
        currentMedData = data;
        renderForm(data);
        jsonEditor.value = JSON.stringify(data, null, 2);
    } else {
        showStatus(`"${key}" not found.`, false);
    }
}

// ── Form rendering ──────────────────────────────────────────────────────────

function el<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    attrs?: Record<string, string>,
    children?: (Node | string)[],
): HTMLElementTagNameMap[K] {
    const e = document.createElement(tag);
    if (attrs) for (const [k, v] of Object.entries(attrs)) {
        if (k === 'textContent') { e.textContent = v; continue; }
        e.setAttribute(k, v);
    }
    if (children) for (const c of children) e.append(c);
    return e;
}

function makeSection(title: string, collapsed = false): { section: HTMLDivElement; body: HTMLDivElement } {
    const section = el('div', { class: `form-section${collapsed ? ' collapsed' : ''}` });
    const header = el('div', { class: 'form-section-header' }, [
        el('span', { class: 'chevron', textContent: '▼' }),
        document.createTextNode(title),
    ]);
    header.addEventListener('click', () => section.classList.toggle('collapsed'));
    const body = el('div', { class: 'form-section-body' });
    section.append(header, body);
    return { section, body };
}

function makeTextInput(label: string, value: string, dataPath: string): HTMLDivElement {
    const row = el('div', { class: 'form-row' });
    row.append(el('label', { textContent: label }));
    const input = el('input', { type: 'text', value, 'data-path': dataPath });
    row.append(input);
    return row;
}

function makeNumberInput(label: string, value: number | null, dataPath: string): HTMLDivElement {
    const row = el('div', { class: 'form-row' });
    row.append(el('label', { textContent: label }));
    const input = el('input', { type: 'number', value: value != null ? String(value) : '', 'data-path': dataPath });
    row.append(input);
    return row;
}

function makeListEditor(label: string, items: string[], dataPath: string): HTMLDivElement {
    const row = el('div', { class: 'form-row' });
    row.append(el('label', { textContent: label }));
    const container = el('div', { class: 'list-editor', 'data-path': dataPath });

    function addItem(text: string) {
        const item = el('div', { class: 'list-item' });
        const ta = el('textarea');
        ta.value = text;
        const removeBtn = el('button', { class: 'remove-btn', type: 'button', textContent: '×' });
        removeBtn.addEventListener('click', () => item.remove());
        item.append(ta, removeBtn);
        container.insertBefore(item, addBtnEl);
    }

    const addBtnEl = el('button', { class: 'add-item-btn', type: 'button', textContent: '+ Add' });
    addBtnEl.addEventListener('click', () => addItem(''));
    container.append(addBtnEl);

    for (const t of items) addItem(t);
    row.append(container);
    return row;
}

function renderTier(tier: Record<string, unknown>, variantKey: string, tierIdx: number): HTMLDivElement {
    const maxDays = tier.maxDays as number | null;
    const label = maxDays != null ? `≤ ${maxDays} days` : 'Beyond (no limit)';
    const block = el('div', { class: 'tier-block' });
    const header = el('div', { class: 'tier-header' }, [
        el('span', { class: 'chevron', textContent: '▼' }),
        document.createTextNode(`Tier ${tierIdx + 1}: ${label}`),
    ]);
    header.addEventListener('click', () => block.classList.toggle('collapsed'));
    const body = el('div', { class: 'tier-body' });

    const path = `guidance.late.variants.${variantKey}.tiers.${tierIdx}`;
    body.append(makeNumberInput('Max Days (null = no limit)', maxDays, `${path}.maxDays`));

    const g = (tier.guidance ?? {}) as Record<string, unknown>;
    body.append(makeListEditor('Ideal Steps', (g.idealSteps as string[]) ?? [], `${path}.guidance.idealSteps`));
    if ((g.pragmaticVariations as string[])?.length) {
        body.append(makeListEditor('Pragmatic Variations', g.pragmaticVariations as string[], `${path}.guidance.pragmaticVariations`));
    } else {
        body.append(makeListEditor('Pragmatic Variations', [], `${path}.guidance.pragmaticVariations`));
    }
    if ((g.providerNotifications as string[])?.length) {
        body.append(makeListEditor('Provider Notifications (tier)', g.providerNotifications as string[], `${path}.guidance.providerNotifications`));
    } else {
        body.append(makeListEditor('Provider Notifications (tier)', [], `${path}.guidance.providerNotifications`));
    }

    block.append(header, body);
    return block;
}

function renderVariant(variant: Record<string, unknown>, idx: number): HTMLDivElement {
    const block = el('div', { class: 'variant-block' });
    const key = variant.key as string;
    block.append(el('div', { class: 'variant-label', textContent: `Variant: ${key}` }));

    if (variant.sameAs) {
        block.append(el('div', { class: 'sameAs-note', textContent: `Same as variant "${variant.sameAs}" (inherits tiers)` }));
        return block;
    }

    const tiers = (variant.tiers ?? []) as Record<string, unknown>[];
    for (let i = 0; i < tiers.length; i++) {
        block.append(renderTier(tiers[i], String(idx), i));
    }
    return block;
}

function renderForm(data: Record<string, unknown>) {
    formEditor.innerHTML = '';

    // ── Basic Info ──
    const { section: basicSec, body: basicBody } = makeSection('Basic Info');
    basicBody.append(makeTextInput('Display Name', (data.displayName as string) ?? '', 'displayName'));
    basicBody.append(makeTextInput('Key', (data.key as string) ?? '', 'key'));
    basicBody.append(makeTextInput('Category', (data.optgroupLabel as string) ?? '', 'optgroupLabel'));
    formEditor.append(basicSec);

    const guidance = (data.guidance ?? {}) as Record<string, unknown>;

    // ── Shared Provider Notifications ──
    const shared = (guidance.shared ?? {}) as Record<string, unknown>;
    const { section: sharedSec, body: sharedBody } = makeSection('Shared Provider Notifications');
    sharedBody.append(
        makeListEditor('Notifications', (shared.providerNotifications as string[]) ?? [], 'guidance.shared.providerNotifications'),
    );
    formEditor.append(sharedSec);

    // ── Early Guidance ──
    const early = (guidance.early ?? {}) as Record<string, unknown>;
    const { section: earlySec, body: earlyBody } = makeSection('Early Guidance');
    earlyBody.append(makeNumberInput('Min Days', (early.minDays as number) ?? null, 'guidance.early.minDays'));
    if (early.daysBeforeDue != null) {
        earlyBody.append(makeNumberInput('Days Before Due', early.daysBeforeDue as number, 'guidance.early.daysBeforeDue'));
    }
    if (early.guidanceNote) {
        earlyBody.append(makeTextInput('Guidance Note', early.guidanceNote as string, 'guidance.early.guidanceNote'));
    }
    formEditor.append(earlySec);

    // ── Late Guidance Variants ──
    const late = (guidance.late ?? {}) as Record<string, unknown>;
    const variants = (late.variants ?? []) as Record<string, unknown>[];
    const { section: lateSec, body: lateBody } = makeSection('Late Guidance (Variants & Tiers)');
    for (let i = 0; i < variants.length; i++) {
        lateBody.append(renderVariant(variants[i], i));
    }
    formEditor.append(lateSec);
}

// ── Collect form data back into JSON ────────────────────────────────────────

function collectFormData(): Record<string, unknown> {
    if (!currentMedData) return {};
    // Deep clone the current data as the base
    const data = JSON.parse(JSON.stringify(currentMedData)) as Record<string, unknown>;

    // Collect simple text/number inputs
    formEditor.querySelectorAll<HTMLInputElement>('input[data-path]').forEach(input => {
        const path = input.dataset.path!;
        const val = input.type === 'number'
            ? (input.value === '' ? null : Number(input.value))
            : input.value;
        setNested(data, path, val);
    });

    // Collect list editors
    formEditor.querySelectorAll<HTMLDivElement>('.list-editor[data-path]').forEach(container => {
        const path = container.dataset.path!;
        const items: string[] = [];
        container.querySelectorAll<HTMLTextAreaElement>('.list-item textarea').forEach(ta => {
            if (ta.value.trim()) items.push(ta.value);
        });
        setNested(data, path, items);
    });

    return data;
}

function setNested(obj: Record<string, unknown>, path: string, value: unknown) {
    const parts = path.split('.');
    let target: Record<string, unknown> = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        const key = parts[i];
        // Handle variant indices: guidance.late.variants.0.tiers.1...
        if (/^\d+$/.test(parts[i + 1] ?? '')) {
            const arr = target[key] as Record<string, unknown>[];
            const idx = Number(parts[i + 1]);
            target = arr[idx];
            i++; // skip the index part
        } else {
            if (!target[key] || typeof target[key] !== 'object') {
                target[key] = {};
            }
            target = target[key] as Record<string, unknown>;
        }
    }
    target[parts[parts.length - 1]] = value;
}

// ── Auth flow ───────────────────────────────────────────────────────────────

loginBtn.addEventListener('click', async () => {
    loginError.style.display = 'none';
    const email = emailInput.value.trim().toLowerCase();
    const code = codeInput.value;

    if (!email) { showError('Email is required.'); return; }
    if (!code) { showError('Access code is required.'); return; }

    const hash = await sha256(code);
    if (!email.includes(REQUIRED_EMAIL_VALUE) || hash !== ACCESS_CODE_HASH) {
        showError('Email and/or access code is invalid.');
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

// Restore session on page load
const existing = getSession();
if (existing) {
    showEditor(existing.email);
} else {
    showLogin();
}

// ── Editor actions ──────────────────────────────────────────────────────────

medSelect.addEventListener('change', () => loadMed(medSelect.value));

// Toggle between form view and raw JSON view
toggleJsonBtn.addEventListener('click', () => {
    jsonMode = !jsonMode;
    if (jsonMode) {
        // Sync form → JSON before showing
        if (currentMedData) {
            const updated = collectFormData();
            jsonEditor.value = JSON.stringify(updated, null, 2);
        }
        formEditor.style.display = 'none';
        jsonSection.style.display = 'block';
        toggleJsonBtn.textContent = 'Form View';
    } else {
        // Sync JSON → form before showing
        try {
            const parsed = JSON.parse(jsonEditor.value) as Record<string, unknown>;
            currentMedData = parsed;
            renderForm(parsed);
        } catch {
            showStatus('Invalid JSON — cannot switch to form view.', false);
            return;
        }
        formEditor.style.display = 'block';
        jsonSection.style.display = 'none';
        toggleJsonBtn.textContent = 'Raw JSON';
    }
});

saveBtn.addEventListener('click', async () => {
    const key = medSelect.value;
    if (!key) {
        showStatus('Select a medication first.', false);
        return;
    }
    let data: Record<string, unknown>;
    if (jsonMode) {
        try {
            data = JSON.parse(jsonEditor.value);
        } catch {
            showStatus('Invalid JSON — fix syntax errors before saving.', false);
            return;
        }
    } else {
        data = collectFormData();
    }
    try {
        await store.saveMed(key, data);
        currentMedData = data;
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
