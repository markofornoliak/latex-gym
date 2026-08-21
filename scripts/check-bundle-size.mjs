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
const failures=[];

const initial=stats.find(file=>/^index-[\w-]+\.js$/.test(file.name));
if(!initial)throw new Error('Production initial index chunk was not found in dist/assets.');
const css=stats.find(file=>/^index-[\w-]+\.css$/.test(file.name));
const curriculum=stats.find(file=>/^curriculumRuntime-[\w-]+\.js$/.test(file.name));
if(!curriculum)throw new Error('Deferred curriculum runtime chunk was not found; the bootstrap split may have regressed.');
const js=stats.filter(file=>file.name.endsWith('.js'));
const largestExecutableLazy=js.filter(file=>file!==initial&&file!==curriculum).sort((a,b)=>b.raw-a.raw)[0];

// Keep executable bootstrap/lazy code tight. The curriculum chunk is mostly
// authored course data, so it receives a separate compressed-size-aware budget
// instead of silently inflating the generic JavaScript allowance.
check(initial,'initial JS',320*1024,95*1024);
check(curriculum,'deferred curriculum data',1500*1024,190*1024);
if(largestExecutableLazy)check(largestExecutableLazy,'largest executable lazy JS',420*1024,130*1024);
if(css)check(css,'application CSS',120*1024,25*1024);

console.log('\nBundle budget report');
console.log(`  initial JS              ${basename(initial.name)}  ${format(initial.raw)} raw / ${format(initial.gzip)} gzip`);
console.log(`  deferred curriculum     ${basename(curriculum.name)}  ${format(curriculum.raw)} raw / ${format(curriculum.gzip)} gzip`);
if(largestExecutableLazy)console.log(`  largest executable lazy ${basename(largestExecutableLazy.name)}  ${format(largestExecutableLazy.raw)} raw / ${format(largestExecutableLazy.gzip)} gzip`);
if(css)console.log(`  application CSS         ${basename(css.name)}  ${format(css.raw)} raw / ${format(css.gzip)} gzip`);

if(failures.length){
  console.error('\nBundle budget exceeded:');
  for(const message of failures)console.error(`  - ${message}`);
  process.exitCode=1;
}else console.log('  ✓ all bundle budgets satisfied');

function check(file,label,maxRaw,maxGzip){
  if(file.raw>maxRaw)failures.push(`${label} ${file.name}: ${format(file.raw)} raw > ${format(maxRaw)}`);
  if(file.gzip>maxGzip)failures.push(`${label} ${file.name}: ${format(file.gzip)} gzip > ${format(maxGzip)}`);
}
