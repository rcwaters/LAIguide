import { createGitHubStore } from '../services/github/store';
import { createLocalStore } from './localStore';
import { getSession } from './session';
import { GITHUB_OWNER, GITHUB_REPO } from './config';
import type { ChangelogEntry } from './types';

const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN as string;
const store = GITHUB_TOKEN
    ? createGitHubStore(GITHUB_OWNER, GITHUB_REPO, GITHUB_TOKEN)
    : createLocalStore();

const session = getSession();
if (!session) {
    window.location.href = './admin.html';
}

const tbody = document.getElementById('changelog-tbody') as HTMLTableSectionElement;
const statusEl = document.getElementById('changelog-status') as HTMLDivElement;

function formatTimestamp(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function renderRow(entry: ChangelogEntry): HTMLTableRowElement {
    const tr = document.createElement('tr');
    tr.className = entry.action === 'delete' ? 'row-delete' : 'row-update';

    const tdTime = document.createElement('td');
    tdTime.textContent = formatTimestamp(entry.timestamp);

    const tdEmail = document.createElement('td');
    tdEmail.textContent = entry.email;

    const tdAction = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = `action-badge action-${entry.action}`;
    badge.textContent = entry.action === 'update' ? 'Updated' : 'Deleted';
    tdAction.appendChild(badge);

    const tdMed = document.createElement('td');
    tdMed.textContent = entry.displayName;

    const tdKey = document.createElement('td');
    tdKey.className = 'med-key';
    tdKey.textContent = entry.medKey;

    tr.append(tdTime, tdEmail, tdAction, tdMed, tdKey);
    return tr;
}

async function loadChangelog(): Promise<void> {
    try {
        const entries = await store.getChangelog();
        if (entries.length === 0) {
            statusEl.textContent = 'No changes have been recorded yet.';
            return;
        }
        tbody.innerHTML = '';
        for (const entry of entries) {
            tbody.appendChild(renderRow(entry));
        }
    } catch (err) {
        statusEl.textContent = err instanceof Error ? err.message : 'Failed to load changelog.';
        statusEl.style.color = '#c0392b';
    }
}

void loadChangelog();
