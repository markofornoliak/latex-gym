import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const root=process.cwd();
const expansionSource=resolve(root,'src/data/legacy/curriculumExpansion.source.txt');
const deepSource=resolve(root,'src/data/legacy/deepCurriculum.source.txt');
const expansionOutput=resolve(root,'src/data/curriculumExpansion.generated.ts');
const deepOutput=resolve(root,'src/data/deepCurriculum.generated.ts');

function fail(message){throw new Error(`[curriculum-generator] ${message}`);}
function requireMarker(source,marker,label){const index=source.indexOf(marker);if(index<0)fail(`Missing ${label}: ${marker}`);return index;}
function replaceOnce(source,from,to,label){const index=source.indexOf(from);if(index<0)fail(`Missing ${label}`);if(source.indexOf(from,index+from.length)>=0)fail(`Ambiguous ${label}`);return source.slice(0,index)+to+source.slice(index+from.length);}
function indent(source,spaces=2){const prefix=' '.repeat(spaces);return source.split('\n').map(line=>line?prefix+line:line).join('\n');}
function writeGenerated(path,content){mkdirSync(dirname(path),{recursive:true});writeFileSync(path,content.endsWith('\n')?content:`${content}\n`,'utf8');}
function redirectCatalogs(source){
  return source
    .replace(/(?<![\w.])modules\./g,'draft.modules.')
    .replace(/(?<![\w.])lessons\./g,'draft.lessons.')
    .replace(/(?<![\w.])exercises\./g,'draft.exercises.');
}

function generateExpansion(source){
  let text=replaceOnce(source,"import { exercises, lessonIndex, lessons, modules } from './courses';","import { cloneCurriculumDraft, type CurriculumDraft } from './curriculumDraft';",'expansion seed import');
  const guideStart=requireMarker(text,'for(const lesson of lessons){','expansion guide loop');
  const topicsStart=requireMarker(text,'const topics:Topic[]=[','expansion topics');
  const bottomStart=requireMarker(text,'const startNumber=modules.length;','expansion append phase');
  if(!(guideStart<topicsStart&&topicsStart<bottomStart))fail('Expansion markers are out of order');

  const prefix=text.slice(0,guideStart);
  const staticTopics=text.slice(topicsStart,bottomStart);
  let guides=text.slice(guideStart,topicsStart).trim();
  let append=text.slice(bottomStart).trim();

  guides=replaceOnce(guides,'for(const lesson of lessons){','for(const lesson of draft.lessons){','expansion draft guide loop');
  append=append.replace(/\n\s*lessonIndex\.set\(lesson\.id,lessons\.length\);/,'');
  append=redirectCatalogs(append);

  const generated=`${prefix}${staticTopics}\nexport function applyCurriculumExpansion(input:CurriculumDraft):CurriculumDraft{\n  const draft=cloneCurriculumDraft(input);\n${indent(guides)}\n\n${indent(append)}\n  return draft;\n}\n`;
  if(generated.includes("from './courses'"))fail('Generated expansion still imports course seeds');
  if(generated.includes('lessonIndex'))fail('Generated expansion still uses lessonIndex');
  return generated;
}

function generateDeep(source){
  let text=replaceOnce(source,"import { exercises, lessonIndex, lessons, modules } from './courses';","import { cloneCurriculumDraft, type CurriculumDraft } from './curriculumDraft';",'deep seed import');
  const legacyIndex=requireMarker(text,'const legacyIntroduces:Record<string,string[]>={','deep legacy metadata');
  const mutationStart=text.indexOf('for(const lesson of lessons){',legacyIndex);
  if(mutationStart<0)fail('Missing deep mutation phase');
  const prefix=text.slice(0,mutationStart);
  let body=text.slice(mutationStart).trim();

  body=replaceOnce(body,'for(const lesson of lessons){','for(const lesson of draft.lessons){','deep draft lesson loop');
  body=body.replace(/\nlessonIndex\.clear\(\);lessons\.forEach\(\(lesson,index\)=>lessonIndex\.set\(lesson\.id,index\)\);?\s*$/,'');
  body=redirectCatalogs(body);

  const generated=`${prefix}export function applyDeepCurriculum(input:CurriculumDraft):CurriculumDraft{\n  const draft=cloneCurriculumDraft(input);\n  if(draft.modules.some(module=>module.id==='foundation'))return draft;\n${indent(body)}\n  return draft;\n}\n`;
  if(generated.includes("from './courses'"))fail('Generated deep curriculum still imports course seeds');
  if(generated.includes('lessonIndex'))fail('Generated deep curriculum still uses lessonIndex');
  return generated;
}

writeGenerated(expansionOutput,generateExpansion(readFileSync(expansionSource,'utf8')));
writeGenerated(deepOutput,generateDeep(readFileSync(deepSource,'utf8')));
console.log('[curriculum-generator] pure expansion/deep transforms generated');
