/**
 * Cyient rApp Workflows — Playwright screen recorder
 * Records a 12s loop of each workflow and saves as WebM.
 *
 * Prerequisites:
 *   npm install -D playwright @playwright/test
 *   npx playwright install chromium
 *   npm run dev   (must be running on localhost:5173)
 *
 * Usage:
 *   node scripts/record-workflows.js
 *
 * Output: ./recordings/anomaly-rca.webm, network-assurance.webm, etc.
 */

import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'recordings');
const BASE_URL = 'http://localhost:5173';
const RECORD_MS = 12_000;

const WORKFLOWS = [
  { id: 'anomaly-rca',         tabLabel: 'Anomaly RCA' },
  { id: 'network-assurance',   tabLabel: 'Net Assurance' },
  { id: 'pci-clash',           tabLabel: 'PCI Clash' },
  { id: 'intelligent-energy',  tabLabel: 'Energy Saving' },
];

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: false });

  for (const wf of WORKFLOWS) {
    console.log(`\n[Recorder] Starting: ${wf.id}`);
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      recordVideo: {
        dir: OUT_DIR,
        size: { width: 1440, height: 900 },
      },
    });

    const page = await context.newPage();
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    // Click the correct workflow tab
    await page.getByText(wf.tabLabel, { exact: true }).click();
    await sleep(500);

    // Let animation run
    console.log(`[Recorder] Recording ${RECORD_MS / 1000}s for ${wf.id}...`);
    await sleep(RECORD_MS);

    // Save and rename
    await context.close();

    // Playwright saves with a random name; rename it
    const { readdirSync, renameSync } = await import('fs');
    const files = readdirSync(OUT_DIR).filter((f) => f.endsWith('.webm'));
    const latest = files
      .map((f) => ({ f, mtime: require('fs').statSync(join(OUT_DIR, f)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime)[0];

    if (latest) {
      const dest = join(OUT_DIR, `${wf.id}.webm`);
      renameSync(join(OUT_DIR, latest.f), dest);
      console.log(`[Recorder] Saved: ${dest}`);
    }
  }

  await browser.close();
  console.log('\n[Recorder] All done. Files are in ./recordings/');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
