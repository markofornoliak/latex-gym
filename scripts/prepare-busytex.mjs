import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, readFile, stat, unlink } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import path from 'node:path';

// BusyTeX no longer publishes its WASM bundle in the current native GitHub release.
// The project's own GitHub Pages deployment still serves the browser runtime used by
// busytex.github.io. We mirror that runtime into LaTeX Gym at build time and print
// SHA-256 hashes; once validated, these hashes become the immutable supply-chain pin.
const BASE = process.env.BUSYTEX_ASSET_BASE || 'https://busytex.github.io/dist';
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

async function sha256(filePath) {
  return createHash('sha256').update(await readFile(filePath)).digest('hex');
}

async function download(file) {
  const target = path.join(destination, file);
  if (!(await existsWithContent(target))) {
    const response = await fetch(`${BASE}/${file}`, { redirect: 'follow' });
    if (!response.ok || !response.body) {
      throw new Error(`BusyTeX asset ${file} failed: HTTP ${response.status}`);
    }

    try {
      await pipeline(Readable.fromWeb(response.body), createWriteStream(target));
      if ((await stat(target)).size === 0) throw new Error(`BusyTeX asset ${file} is empty`);
    } catch (error) {
      await unlink(target).catch(() => {});
      throw error;
    }
  }

  const size = (await stat(target)).size;
  console.log(`BUSYTEX_ASSET ${file} ${size} sha256=${await sha256(target)}`);
}

await mkdir(destination, { recursive: true });
for (const file of [...shared, ...(mode === 'full' ? productionData : [])]) {
  await download(file);
}

console.log(`BusyTeX ${mode} runtime ready at ${destination}`);
