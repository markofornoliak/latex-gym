import { describe, expect, it } from 'vitest';
import type { Exercise } from '../types';
import { exerciseEvidenceConcepts } from './masteryEvidence';

describe('exercise mastery evidence',()=>{
  it('falls back to all concepts for existing exercises',()=>{
    expect(exerciseEvidenceConcepts({concepts:['a','b']})).toEqual(['a','b']);
  });

  it('uses the narrower evidence set when authored',()=>{
    expect(exerciseEvidenceConcepts({concepts:['a','b'],evidenceConcepts:['b']})).toEqual(['b']);
  });

  it('does not treat an empty override as evidence for nothing',()=>{
    const exercise={concepts:['a'],evidenceConcepts:[]} as Pick<Exercise,'concepts'|'evidenceConcepts'>;
    expect(exerciseEvidenceConcepts(exercise)).toEqual(['a']);
  });
});
