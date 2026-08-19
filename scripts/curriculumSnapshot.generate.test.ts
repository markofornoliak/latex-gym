import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import baselineJson from '../src/data/curriculumBaseline.json';
import { buildCurriculum } from '../src/data/curriculumBuild';

const baseline=baselineJson as {semanticFingerprint:string;moduleIds:string[];lessonIds:string[];exerciseIds:string[]};
const built=buildCurriculum();
const semanticFingerprint=fingerprint({modules:built.modules,lessons:built.lessons,exercises:built.exercises,references:built.references,concepts:built.concepts,projects:built.projects});
const snapshot={snapshotVersion:1,semanticFingerprint,...built};

if(process.env.LATEX_GYM_WRITE_CURRICULUM_SNAPSHOT==='1'){
  const target=resolve(process.cwd(),'src/data/curriculumSnapshot.generated.json');
  mkdirSync(dirname(target),{recursive:true});
  writeFileSync(target,`${JSON.stringify(snapshot)}\n`,'utf8');
  console.log(`[curriculum-snapshot] ${built.lessons.length} lessons, ${built.exercises.length} exercises, fingerprint=${semanticFingerprint}`);
}

describe('build-time curriculum snapshot',()=>{
  it('constructs the exact compatibility-locked semantic curriculum from the canonical source',()=>{
    expect(built.modules.map(item=>item.id)).toEqual(baseline.moduleIds);
    expect(built.lessons.map(item=>item.id)).toEqual(baseline.lessonIds);
    expect(built.exercises.map(item=>item.id)).toEqual(baseline.exerciseIds);
    expect(built.exercises.some(exercise=>/^e\d+$/.test(exercise.id))).toBe(false);
    expect(semanticFingerprint).toBe(baseline.semanticFingerprint);
  });
});

function fingerprint(value:unknown){const payload=JSON.stringify(value);let hash=0x811c9dc5;for(let index=0;index<payload.length;index+=1){hash^=payload.charCodeAt(index);hash=Math.imul(hash,0x01000193)>>>0;}return hash.toString(16).padStart(8,'0');}
