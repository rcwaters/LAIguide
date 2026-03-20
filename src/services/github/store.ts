import type { MedDataStore } from '../interfaces';

const MEDS_PATH = 'src/meds';

interface GitHubFile {
    name: string;
    path: string;
    sha: string;
    download_url: string;
}

interface GitHubContentResponse {
    sha: string;
    content: string;
    encoding: string;
}

function headers(token: string): HeadersInit {
    return {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
    };
}

async function ghFetch<T>(url: string, token: string, init?: RequestInit): Promise<T> {
    const res = await fetch(url, {
        ...init,
        headers: { ...headers(token), ...init?.headers },
    });
    if (!res.ok) {
        const body = await res.text();
        throw new Error(`GitHub API ${res.status}: ${body}`);
    }
    return res.json() as Promise<T>;
}

/** Get the SHA of an existing file (needed for updates and deletes). */
async function getFileSha(
    owner: string,
    repo: string,
    path: string,
    token: string,
    branch: string,
): Promise<string | null> {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
    const res = await fetch(url, { headers: headers(token) });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`GitHub API ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as GitHubContentResponse;
    return data.sha;
}

export function createGitHubStore(
    owner: string,
    repo: string,
    token: string,
    branch = 'main',
): MedDataStore {
    const api = `https://api.github.com/repos/${owner}/${repo}`;

    return {
        async listMedKeys(): Promise<string[]> {
            const files = await ghFetch<GitHubFile[]>(
                `${api}/contents/${MEDS_PATH}?ref=${branch}`,
                token,
            );
            return files
                .filter((f) => f.name.endsWith('.json'))
                .map((f) => f.name.replace(/\.json$/, ''));
        },

        async getMed(key: string): Promise<Record<string, unknown> | null> {
            const filePath = `${MEDS_PATH}/${key}.json`;
            const url = `${api}/contents/${filePath}?ref=${branch}`;
            const res = await fetch(url, { headers: headers(token) });
            if (res.status === 404) return null;
            if (!res.ok) throw new Error(`GitHub API ${res.status}: ${await res.text()}`);
            const data = (await res.json()) as GitHubContentResponse;
            const decoded = atob(data.content);
            return JSON.parse(decoded) as Record<string, unknown>;
        },

        async getAllMeds(): Promise<Record<string, unknown>[]> {
            const keys = await this.listMedKeys();
            const results = await Promise.all(keys.map((k) => this.getMed(k)));
            return results.filter((m): m is Record<string, unknown> => m !== null);
        },

        async saveMed(key: string, data: Record<string, unknown>): Promise<void> {
            const filePath = `${MEDS_PATH}/${key}.json`;
            const sha = await getFileSha(owner, repo, filePath, token, branch);
            const bytes = new TextEncoder().encode(JSON.stringify(data, null, 2) + '\n');
            const content = btoa(String.fromCodePoint(...bytes));
            await ghFetch(`${api}/contents/${filePath}`, token, {
                method: 'PUT',
                body: JSON.stringify({
                    message: `Update ${key} via admin portal`,
                    content,
                    branch,
                    ...(sha ? { sha } : {}),
                }),
            });
        },

        async deleteMed(key: string): Promise<void> {
            const filePath = `${MEDS_PATH}/${key}.json`;
            const sha = await getFileSha(owner, repo, filePath, token, branch);
            if (!sha) throw new Error(`"${key}" not found in repository.`);
            await ghFetch(`${api}/contents/${filePath}`, token, {
                method: 'DELETE',
                body: JSON.stringify({
                    message: `Delete ${key} via admin portal`,
                    sha,
                    branch,
                }),
            });
        },
    };
}
