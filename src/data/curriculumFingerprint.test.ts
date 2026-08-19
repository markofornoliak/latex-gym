import { describe, expect, it } from 'vitest';
import { curriculum } from './curriculumRuntime';

export function curriculumSemanticFingerprint(){
  const payload=JSON.stringify({modules:curriculum.modules,lessons:curriculum.lessons,exercises:curriculum.exercises,references:curriculum.references,concepts:curriculum.concepts,projects:curriculum.projects});
  let hash=0x811c9dc5;for(let index=0;index<payload.length;index+=1){hash^=payload.charCodeAt(index);hash=Math.imul(hash,0x01000193)>>>0;}return hash.toString(16).padStart(8,'0');
}

describe('final curriculum semantic fingerprint',()=>{
  it('matches the build-time materialized snapshot',()=>{expect(curriculumSemanticFingerprint()).toBe(curriculum.build.semanticFingerprint);});
});
