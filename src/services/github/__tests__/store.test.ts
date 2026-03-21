import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createGitHubStore } from '../store';

// ── fetch mock ────────────────────────────────────────────────────────────────

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
    vi.clearAllMocks();
});

function makeJsonResponse(data: unknown, status = 200): Response {
    return {
        ok: status >= 200 && status < 300,
        status,
        json: () => Promise.resolve(data),
        text: () => Promise.resolve(JSON.stringify(data)),
    } as Response;
}

function makeErrorResponse(status: number, body = ''): Response {
    return {
        ok: false,
        status,
        json: () => Promise.resolve({}),
        text: () => Promise.resolve(body),
    } as Response;
}

function b64(obj: unknown): string {
    return Buffer.from(JSON.stringify(obj)).toString('base64');
}

const OWNER = 'test-owner';
const REPO = 'test-repo';
const TOKEN = 'test-token';

// ── listMedKeys ───────────────────────────────────────────────────────────────

describe('listMedKeys', () => {
    it('returns keys derived from JSON filenames', async () => {
        mockFetch.mockResolvedValueOnce(
            makeJsonResponse([
                { name: 'abilify.json', path: 'src/meds/abilify.json', sha: 'a', download_url: '' },
                { name: 'vivitrol.json', path: 'src/meds/vivitrol.json', sha: 'b', download_url: '' },
            ]),
        );
        const store = createGitHubStore(OWNER, REPO, TOKEN);
        const keys = await store.listMedKeys();
        expect(keys).toEqual(['abilify', 'vivitrol']);
    });

    it('excludes non-JSON files', async () => {
        mockFetch.mockResolvedValueOnce(
            makeJsonResponse([
                { name: 'med.json', path: 'src/meds/med.json', sha: 'a', download_url: '' },
                { name: 'README.md', path: 'src/meds/README.md', sha: 'b', download_url: '' },
            ]),
        );
        const store = createGitHubStore(OWNER, REPO, TOKEN);
        const keys = await store.listMedKeys();
        expect(keys).toEqual(['med']);
    });

    it('returns empty array when directory is empty', async () => {
        mockFetch.mockResolvedValueOnce(makeJsonResponse([]));
        const store = createGitHubStore(OWNER, REPO, TOKEN);
        expect(await store.listMedKeys()).toEqual([]);
    });

    it('throws when GitHub API returns non-OK status', async () => {
        mockFetch.mockResolvedValueOnce(makeErrorResponse(401, 'Unauthorized'));
        const store = createGitHubStore(OWNER, REPO, TOKEN);
        await expect(store.listMedKeys()).rejects.toThrow('GitHub API 401');
    });

    it('sends Authorization header with token', async () => {
        mockFetch.mockResolvedValueOnce(makeJsonResponse([]));
        const store = createGitHubStore(OWNER, REPO, TOKEN);
        await store.listMedKeys();
        const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
        expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer test-token');
    });
});

// ── getMed ────────────────────────────────────────────────────────────────────

describe('getMed', () => {
    it('returns parsed JSON for an existing file', async () => {
        const data = { displayName: 'Test Med', optgroupLabel: 'Antipsychotics' };
        mockFetch.mockResolvedValueOnce(
            makeJsonResponse({ sha: 'abc', content: b64(data), encoding: 'base64' }),
        );
        const store = createGitHubStore(OWNER, REPO, TOKEN);
        const result = await store.getMed('test_med');
        expect(result).toEqual(data);
    });

    it('returns null for a 404', async () => {
        mockFetch.mockResolvedValueOnce({ ok: false, status: 404 } as Response);
        const store = createGitHubStore(OWNER, REPO, TOKEN);
        expect(await store.getMed('nonexistent')).toBeNull();
    });

    it('throws for non-404 errors', async () => {
        mockFetch.mockResolvedValueOnce(makeErrorResponse(500, 'Internal Server Error'));
        const store = createGitHubStore(OWNER, REPO, TOKEN);
        await expect(store.getMed('broken')).rejects.toThrow('GitHub API 500');
    });

    it('requests the correct file path', async () => {
        const data = { displayName: 'Med' };
        mockFetch.mockResolvedValueOnce(
            makeJsonResponse({ sha: 'x', content: b64(data), encoding: 'base64' }),
        );
        const store = createGitHubStore(OWNER, REPO, TOKEN);
        await store.getMed('my_med');
        const [url] = mockFetch.mock.calls[0] as [string];
        expect(url).toContain('my_med.json');
        expect(url).toContain('src/meds');
    });
});

// ── getAllMeds ────────────────────────────────────────────────────────────────

describe('getAllMeds', () => {
    it('returns parsed data for all meds', async () => {
        // listMedKeys call
        mockFetch.mockResolvedValueOnce(
            makeJsonResponse([
                { name: 'med1.json', path: 'src/meds/med1.json', sha: 'a', download_url: '' },
                { name: 'med2.json', path: 'src/meds/med2.json', sha: 'b', download_url: '' },
            ]),
        );
        const d1 = { displayName: 'Med 1' };
        const d2 = { displayName: 'Med 2' };
        mockFetch.mockResolvedValueOnce(
            makeJsonResponse({ sha: 'a', content: b64(d1), encoding: 'base64' }),
        );
        mockFetch.mockResolvedValueOnce(
            makeJsonResponse({ sha: 'b', content: b64(d2), encoding: 'base64' }),
        );
        const store = createGitHubStore(OWNER, REPO, TOKEN);
        const results = await store.getAllMeds();
        expect(results).toHaveLength(2);
        expect(results).toContainEqual(d1);
        expect(results).toContainEqual(d2);
    });

    it('filters out null results (404 files)', async () => {
        mockFetch.mockResolvedValueOnce(
            makeJsonResponse([
                { name: 'med1.json', path: 'src/meds/med1.json', sha: 'a', download_url: '' },
            ]),
        );
        // getMed returns 404
        mockFetch.mockResolvedValueOnce({ ok: false, status: 404 } as Response);
        const store = createGitHubStore(OWNER, REPO, TOKEN);
        const results = await store.getAllMeds();
        expect(results).toHaveLength(0);
    });
});

// ── saveMed ───────────────────────────────────────────────────────────────────

describe('saveMed', () => {
    it('sends a PUT request to create a new file when no SHA exists', async () => {
        // getFileSha: 404 (new file)
        mockFetch.mockResolvedValueOnce({ ok: false, status: 404 } as Response);
        // PUT request
        mockFetch.mockResolvedValueOnce(makeJsonResponse({ commit: { sha: 'new-commit' } }));

        const store = createGitHubStore(OWNER, REPO, TOKEN);
        await store.saveMed('new_med', { displayName: 'New Med' });

        const [putUrl, putInit] = mockFetch.mock.calls[1] as [string, RequestInit];
        expect(putInit.method).toBe('PUT');
        expect(putUrl).toContain('new_med.json');
    });

    it('includes SHA in body when updating an existing file', async () => {
        const existingData = { displayName: 'Existing' };
        // getFileSha: success
        mockFetch.mockResolvedValueOnce(
            makeJsonResponse({ sha: 'existing-sha', content: b64(existingData), encoding: 'base64' }),
        );
        // PUT request
        mockFetch.mockResolvedValueOnce(makeJsonResponse({ commit: {} }));

        const store = createGitHubStore(OWNER, REPO, TOKEN);
        await store.saveMed('existing_med', { displayName: 'Updated' });

        const [, putInit] = mockFetch.mock.calls[1] as [string, RequestInit];
        const body = JSON.parse(putInit.body as string) as Record<string, unknown>;
        expect(body['sha']).toBe('existing-sha');
    });

    it('does not include SHA in body for new file', async () => {
        mockFetch.mockResolvedValueOnce({ ok: false, status: 404 } as Response);
        mockFetch.mockResolvedValueOnce(makeJsonResponse({ commit: {} }));

        const store = createGitHubStore(OWNER, REPO, TOKEN);
        await store.saveMed('brand_new', { displayName: 'Brand New' });

        const [, putInit] = mockFetch.mock.calls[1] as [string, RequestInit];
        const body = JSON.parse(putInit.body as string) as Record<string, unknown>;
        expect(body['sha']).toBeUndefined();
    });

    it('includes a commit message in the PUT body', async () => {
        mockFetch.mockResolvedValueOnce({ ok: false, status: 404 } as Response);
        mockFetch.mockResolvedValueOnce(makeJsonResponse({ commit: {} }));

        const store = createGitHubStore(OWNER, REPO, TOKEN);
        await store.saveMed('test_med', { displayName: 'Test' });

        const [, putInit] = mockFetch.mock.calls[1] as [string, RequestInit];
        const body = JSON.parse(putInit.body as string) as Record<string, unknown>;
        expect(typeof body['message']).toBe('string');
        expect((body['message'] as string).length).toBeGreaterThan(0);
    });
});

// ── deleteMed ─────────────────────────────────────────────────────────────────

describe('deleteMed', () => {
    it('sends a DELETE request for an existing file', async () => {
        const existingData = { displayName: 'To Delete' };
        // getFileSha: success
        mockFetch.mockResolvedValueOnce(
            makeJsonResponse({ sha: 'del-sha', content: b64(existingData), encoding: 'base64' }),
        );
        // DELETE request
        mockFetch.mockResolvedValueOnce(makeJsonResponse({ commit: {} }));

        const store = createGitHubStore(OWNER, REPO, TOKEN);
        await store.deleteMed('to_delete');

        const [deleteUrl, deleteInit] = mockFetch.mock.calls[1] as [string, RequestInit];
        expect(deleteInit.method).toBe('DELETE');
        expect(deleteUrl).toContain('to_delete.json');
    });

    it('includes the file SHA in the DELETE request body', async () => {
        const existingData = { displayName: 'Med' };
        mockFetch.mockResolvedValueOnce(
            makeJsonResponse({ sha: 'del-sha', content: b64(existingData), encoding: 'base64' }),
        );
        mockFetch.mockResolvedValueOnce(makeJsonResponse({ commit: {} }));

        const store = createGitHubStore(OWNER, REPO, TOKEN);
        await store.deleteMed('med');

        const [, deleteInit] = mockFetch.mock.calls[1] as [string, RequestInit];
        const body = JSON.parse(deleteInit.body as string) as Record<string, unknown>;
        expect(body['sha']).toBe('del-sha');
    });

    it('throws when the file does not exist', async () => {
        mockFetch.mockResolvedValueOnce({ ok: false, status: 404 } as Response);
        const store = createGitHubStore(OWNER, REPO, TOKEN);
        await expect(store.deleteMed('nonexistent')).rejects.toThrow('not found in repository');
    });

    it('throws when GitHub API returns error on getFileSha', async () => {
        mockFetch.mockResolvedValueOnce(makeErrorResponse(403, 'Forbidden'));
        const store = createGitHubStore(OWNER, REPO, TOKEN);
        await expect(store.deleteMed('forbidden_med')).rejects.toThrow('GitHub API 403');
    });
});
