import fs from 'node:fs';
import path from 'node:path';

export class MissingEnvError extends Error {
  readonly variable: string;

  constructor(variable: string) {
    super(`Missing environment variable: ${variable}`);
    this.name = 'MissingEnvError';
    this.variable = variable;
  }
}

let envLoaded = false;

/** Load .env and .env.local for local dev. Real environment variables win. */
export function loadEnvFiles(): void {
  if (envLoaded) return;
  envLoaded = true;
  for (const file of ['.env', '.env.local']) {
    const full = path.join(process.cwd(), file);
    try {
      if (fs.existsSync(full) && typeof process.loadEnvFile === 'function') {
        process.loadEnvFile(full);
      }
    } catch {
      // Ignore unreadable or malformed env files; required values are checked on use.
    }
  }
}

export type NexconnRegion = 'singapore' | 'north-america' | 'saudi-arabia';

const BASE_URLS: Record<NexconnRegion, string[]> = {
  singapore: ['https://api.sg-light-api.com', 'https://api-b.sg-light-api.com'],
  'north-america': ['https://api.us-light-api.com', 'https://api-b.us-light-api.com'],
  'saudi-arabia': ['https://api.sau-light-api.com', 'https://api-b.sau-light-api.com'],
};

export function normalizeRegion(raw: string | undefined): NexconnRegion {
  const value = (raw || 'singapore').trim().toLowerCase();
  if (['na', 'us', 'north-america', 'north_america', 'north america'].includes(value)) {
    return 'north-america';
  }
  if (['sa', 'saudi', 'saudi-arabia', 'saudi_arabia', 'saudi arabia'].includes(value)) {
    return 'saudi-arabia';
  }
  return 'singapore';
}

export interface NexconnEnv {
  appKey: string;
  appSecret: string;
  region: NexconnRegion;
  apiBaseUrls: string[];
}

export function readNexconnEnv(): NexconnEnv {
  loadEnvFiles();
  const appKey = (process.env.NEXCONN_APP_KEY || '').trim();
  const appSecret = (process.env.NEXCONN_APP_SECRET || '').trim();
  if (!appKey) throw new MissingEnvError('NEXCONN_APP_KEY');
  if (!appSecret) throw new MissingEnvError('NEXCONN_APP_SECRET');

  const region = normalizeRegion(process.env.NEXCONN_REGION);
  const override = (process.env.NEXCONN_API_BASE_URL || '').trim().replace(/\/+$/, '');
  return {
    appKey,
    appSecret,
    region,
    apiBaseUrls: override ? [override] : BASE_URLS[region],
  };
}
