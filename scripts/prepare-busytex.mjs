import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, readFile, stat, unlink } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import path from 'node:path';

// BusyTeX no longer publishes its WASM bundle in the current native GitHub release.
// Its own GitHub Pages deployment still serves the browser runtime used by
// busytex.github.io. LaTeX Gym mirrors those files at build time, but accepts them
// only when their SHA-256 matches this reviewed manifest.
const BASE = process.env.BUSYTEX_ASSET_BASE || 'https://busytex.github.io/dist';
const destination = process.env.BUSYTEX_DEST || path.resolve('dist', 'busytex');
const mode = process.argv[2] === 'full' ? 'full' : 'smoke';

const EXPECTED_SHA256 = {
  'busytex_pipeline.js': 'f8741cfd1fb0ac3c11daeee8386bc024f59d8b14c3000ad64b9c00dce7d61265',
  'busytex.js': 'ef11cdc4d36f8bf9c1fd40e5779bb24ff096d0fb69cccd021b158b01e1aa874f',
  'busytex.wasm': '44023c0197226276d61db370da15e95ec1c98fd1abf084041011d636689cdd82',
  'texlive-basic.js': '06a7878bb0ddd650df05ac66b4872c8a37d309617ce052c7b8184042e355eaa9',
  'texlive-basic.data': 'fa1d51b0ed1a65548232e60f9bdc3eeb3ed96bcf87250c43f2843dc64337cead',
  'ubuntu-texlive-latex-recommended.js': '02882e14e587390c9c03bdb9df34a78512731f01c7652e5d81deb04d0124bfa2',
  'ubuntu-texlive-latex-recommended.data': 'a6ea762272218d9b4ae8fe937c379a9d7a4f656fd4fde2ac2ff95f1e69e6fd23',
  'ubuntu-texlive-latex-extra.js': '23aa09244b374c44b71e841eec9b97f22363ac5bec69c465b7f1b65253831f9f',
  'ubuntu-texlive-latex-extra.data': '8e3581093015af2ffdbe77cee4c0aefa8d0e2a86b8e22eeb2d9fe4108c6260ee',
  'ubuntu-texlive-science.js': '3e4fccb122c66bb80fbc82ab8f0b5a911106a141f48d9f2093630dbcf35ae304',
  'ubuntu-texlive-science.data': '3aab1ad9e93df5bd864ed3c9b66cf43fbfee650455bc7eaeac8374b196c896b8'
};

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

async function verify(file, target) {
  const digest = await sha256(target);
  const expected = EXPECTED_SHA256[file];
  if (!expected) {
    throw new Error(`BusyTeX asset ${file} is missing from the reviewed SHA-256 manifest`);
  }
  if (digest !== expected) {
    throw new Error(`BusyTeX asset ${file} SHA-256 mismatch: expected ${expected}, got ${digest}`);
  }
  const size = (await stat(target)).size;
  console.log(`BUSYTEX_ASSET ${file} ${size} sha256=${digest} verified`);
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

  await verify(file, target);
}

await mkdir(destination, { recursive: true });
for (const file of [...shared, ...(mode === 'full' ? productionData : [])]) {
  await download(file);
}

console.log(`BusyTeX ${mode} runtime ready at ${destination}`);
