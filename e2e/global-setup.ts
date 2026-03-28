import { readFileSync } from 'fs';
import { resolve } from 'path';

export default function globalSetup(): void {
    // Check shell env first (covers CI and locally-exported ADMIN_PAT).
    if (process.env.ADMIN_PAT) {
        process.env.HAS_GITHUB_TOKEN = '1';
        return;
    }
    // Fall back to .env file (local dev where token isn't exported to the shell).
    try {
        const env = readFileSync(resolve(process.cwd(), '.env'), 'utf-8');
        if (/^ADMIN_PAT=.+/m.test(env)) {
            process.env.HAS_GITHUB_TOKEN = '1';
        }
    } catch {
        // no .env file in CI
    }
}
