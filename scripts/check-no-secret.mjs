import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function readSecretFromEnvFile(file) {
  const full = path.join(root, file);
  try {
    if (!fs.existsSync(full)) return '';
    const text = fs.readFileSync(full, 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (match && match[1] === 'NEXCONN_APP_SECRET') {
        return (match[2] || '').trim().replace(/^["']|["']$/g, '');
      }
    }
  } catch {
    return '';
  }
  return '';
}

const secret =
  (process.env.NEXCONN_APP_SECRET || '').trim() ||
  readSecretFromEnvFile('.env.local') ||
  readSecretFromEnvFile('.env');

if (!secret) {
  console.log('check-no-secret: NEXCONN_APP_SECRET is not set; nothing to scan for.');
  process.exit(0);
}

const dist = path.join(root, 'dist');
if (!fs.existsSync(dist)) {
  console.error('check-no-secret: dist/ does not exist. Run the build first.');
  process.exit(1);
}

const needles = [secret, Buffer.from(secret, 'utf8').toString('base64')].filter(Boolean);
const hits = [];
let scanned = 0;

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
      continue;
    }
    if (!entry.isFile()) continue;
    scanned += 1;
    const content = fs.readFileSync(full, 'utf8');
    if (needles.some((needle) => content.includes(needle))) {
      hits.push(path.relative(root, full));
    }
  }
}

walk(dist);

if (hits.length > 0) {
  console.error(`check-no-secret: FAILED. The App Secret was found in: ${hits.join(', ')}`);
  process.exit(1);
}

console.log(`check-no-secret: OK. Scanned ${scanned} files in dist/, secret not present.`);
