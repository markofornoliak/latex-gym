import { createWriteStream } from 'node:fs';
import { mkdir, stat, unlink } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import path from 'node:path';

async function resolveLatestRelease() {
  const probe = await fetch('https://github.com/busytex/busytex/releases/latest/download/busytex_pipeline.js', { redirect: 'manual' });
  const location = probe.headers.get('location') || '';
  const match = location.match(/\/releases\/download\/([^/]+)\/busytex_pipeline\.js/);
  if (!match) throw new Error(`Unable to resolve BusyTeX release tag from ${location || `HTTP ${probe.status}`}`);
  console.log(`BUSYTEX_RESOLVED_RELEASE=${match[1]}`);
  return match[1];
}

const RELEASE = process.env.BUSYTEX_RELEASE || await resolveLatestRelease();
const BASE = `https://github.com/busytex/busytex/releases/download/${RELEASE}`;
const destination = process.env.BUSYTEX_DEST || path.resolve('dist', 'busytex');
const mode = process.argv[2] === 'full' ? 'full' : 'smoke';

const shared = [
  'busytex_pipeline.js',
  'busytex.js',
  'busytex.wasm',
  'texlive-basic.js',
  'texlive-basic.data',
  'ubuntu-texlive-latex-recommended.js',
  'ubuntu-texlive-latex-extra.js',
  'ubuntu-texlive-science.js'
];

const productionData = [
  'ubuntu-texlive-latex-recommended.data',
  'ubuntu-texlive-latex-extra.data',
  'ubuntu-texlive-science.data'
];

async function existsWithContent(filePath) {
  try {
    return (await stat(filePath)).size > 0;
  } catch {
    return false;
  }
}

async function download(file) {
  const target = path.join(destination, file);
  if (await existsWithContent(target)) {
    console.log(`BusyTeX: keep ${file}`);
    return;
  }

  const response = await fetch(`${BASE}/${file}`, { redirect: 'follow' });
  if (!response.ok || !response.body) {
    throw new Error(`BusyTeX asset ${file} failed: HTTP ${response.status}`);
  }

  try {
    await pipeline(Readable.fromWeb(response.body), createWriteStream(target));
    const size = (await stat(target)).size;
    if (size === 0) throw new Error(`BusyTeX asset ${file} is empty`);
    console.log(`BusyTeX: ${file} (${(size / 1024 / 1024).toFixed(1)} MiB)`);
  } catch (error) {
    await unlink(target).catch(() => {});
    throw error;
  }
}

await mkdir(destination, { recursive: true });
for (const file of [...shared, ...(mode === 'full' ? productionData : [])]) {
  await download(file);
}

console.log(`BusyTeX ${mode} runtime ready at ${destination}`);
