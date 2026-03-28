import { readFileSync } from 'fs';
import { resolve } from 'path';

export default function globalSetup(): void {
    try {
        const env = readFileSync(resolve(process.cwd(), '.env'), 'utf-8');
        if (/^VITE_GITHUB_TOKEN=.+/m.test(env)) {
            process.env.HAS_GITHUB_TOKEN = '1';
        }
    } catch {
        // no .env file in CI
    }
}
