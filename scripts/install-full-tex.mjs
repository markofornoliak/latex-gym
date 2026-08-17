import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

const CORE_TAG='build_b16fdf28019d93ccfd8f09776e4191835acea5dc';
const PACKAGES_TAG='release_88f12c721278c652c9fb69c6a097af9481a2ae7e';
const CORE_RELEASE=`https://github.com/busytex/busytex/releases/download/${CORE_TAG}`;
const PACKAGE_RELEASE=`https://github.com/busytex/busytex/releases/download/${PACKAGES_TAG}`;
const RAW_CORE=`https://raw.githubusercontent.com/busytex/busytex/${CORE_TAG}`;
const output=join(process.cwd(),'public','full-tex');

const assets=[
  [`${RAW_CORE}/busytex_worker.js`,'busytex_worker.js'],
  [`${RAW_CORE}/busytex_pipeline.js`,'busytex_pipeline.js'],
  ...['busytex.js','busytex.wasm','texlive-basic.js','texlive-basic.data'].map(name=>[`${CORE_RELEASE}/${name}`,name]),
  ...[
    'ubuntu-texlive-latex-base.js','ubuntu-texlive-latex-base.data',
    'ubuntu-texlive-latex-recommended.js','ubuntu-texlive-latex-recommended.data',
    'ubuntu-texlive-latex-extra.js','ubuntu-texlive-latex-extra.data'
  ].map(name=>[`${PACKAGE_RELEASE}/${name}`,name])
];

await mkdir(output,{recursive:true});
const manifest={busytex:{coreTag:CORE_TAG,packagesTag:PACKAGES_TAG},assets:{}};

for(const [url,name] of assets){
  const destination=join(output,name);
  const existing=await fileInfo(destination);
  if(existing&&existing.size>0){
    manifest.assets[name]=existing;
    console.log(`full-tex cache: ${name} (${formatBytes(existing.size)})`);
    continue;
  }
  console.log(`full-tex download: ${name}`);
  const response=await fetch(url,{redirect:'follow',headers:{'user-agent':'latex-gym-build'}});
  if(!response.ok)throw new Error(`Failed to download ${name}: HTTP ${response.status} ${response.statusText}`);
  const bytes=new Uint8Array(await response.arrayBuffer());
  if(bytes.byteLength===0)throw new Error(`Downloaded empty asset: ${name}`);
  const temporary=`${destination}.tmp`;
  await writeFile(temporary,bytes);
  await rename(temporary,destination);
  const info={size:bytes.byteLength,sha256:createHash('sha256').update(bytes).digest('hex')};
  manifest.assets[name]=info;
  console.log(`  ${formatBytes(info.size)} sha256:${info.sha256}`);
}

await writeFile(join(output,'manifest.json'),`${JSON.stringify(manifest,null,2)}\n`,'utf8');
console.log(`Full TeX assets ready in ${output}.`);

async function fileInfo(path){
  try{
    const info=await stat(path);
    if(!info.isFile())return undefined;
    const bytes=await readFile(path);
    return {size:info.size,sha256:createHash('sha256').update(bytes).digest('hex')};
  }catch(error){
    if(error?.code==='ENOENT')return undefined;
    await rm(path,{force:true}).catch(()=>{});
    throw error;
  }
}
function formatBytes(bytes){
  if(bytes<1024)return `${bytes} B`;
  if(bytes<1024*1024)return `${(bytes/1024).toFixed(1)} KiB`;
  return `${(bytes/(1024*1024)).toFixed(1)} MiB`;
}
