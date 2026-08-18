import { readFileSync, readdirSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

const assetsDir=resolve(process.cwd(),'dist/assets');
const files=readdirSync(assetsDir).filter(name=>/\.(js|css)$/.test(name));
const stats=files.map(name=>{
  const bytes=readFileSync(resolve(assetsDir,name));
  return {name,raw:bytes.byteLength,gzip:gzipSync(bytes,{level:9}).byteLength};
});
const kb=value=>value/1024;
const format=value=>`${kb(value).toFixed(1)} kB`;
const fail=[];

const initial=stats.find(file=>/^index-[\w-]+\.js$/.test(file.name));
if(!initial)throw new Error('Production initial index chunk was not found in dist/assets.');
const css=stats.find(file=>/^index-[\w-]+\.css$/.test(file.name));
const js=stats.filter(file=>file.name.endsWith('.js'));
const largestLazy=js.filter(file=>file!==initial).sort((a,b)=>b.raw-a.raw)[0];

check(initial,'initial JS',450*1024,130*1024);
if(largestLazy)check(largestLazy,'largest lazy JS',420*1024,130*1024);
if(css)check(css,'application CSS',120*1024,25*1024);

console.log('\nBundle budget report');
console.log(`  initial JS      ${basename(initial.name)}  ${format(initial.raw)} raw / ${format(initial.gzip)} gzip`);
if(largestLazy)console.log(`  largest lazy JS ${basename(largestLazy.name)}  ${format(largestLazy.raw)} raw / ${format(largestLazy.gzip)} gzip`);
if(css)console.log(`  application CSS ${basename(css.name)}  ${format(css.raw)} raw / ${format(css.gzip)} gzip`);

if(fail.length){
  console.error('\nBundle budget exceeded:');
  for(const message of fail)console.error(`  - ${message}`);
  process.exitCode=1;
}else console.log('  ✓ all bundle budgets satisfied');

function check(file,label,maxRaw,maxGzip){
  if(file.raw>maxRaw)fail.push(`${label} ${file.name}: ${format(file.raw)} raw > ${format(maxRaw)}`);
  if(file.gzip>maxGzip)fail.push(`${label} ${file.name}: ${format(file.gzip)} gzip > ${format(maxGzip)}`);
}
