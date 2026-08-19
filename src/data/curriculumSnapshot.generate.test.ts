import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { buildCurriculum } from './curriculumBuild';

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
  it('constructs a valid semantic snapshot with stable seed exercise ids',()=>{
    expect(built.lessons.length).toBeGreaterThan(0);
    expect(built.exercises.length).toBeGreaterThan(0);
    expect(built.exercises.some(exercise=>/^e\d+$/.test(exercise.id))).toBe(false);
    expect(semanticFingerprint).toMatch(/^[0-9a-f]{8}$/);
  });
});

function fingerprint(value:unknown){const payload=JSON.stringify(value);let hash=0x811c9dc5;for(let index=0;index<payload.length;index+=1){hash^=payload.charCodeAt(index);hash=Math.imul(hash,0x01000193)>>>0;}return hash.toString(16).padStart(8,'0');}
