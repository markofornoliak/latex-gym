import { describe, expect, it } from 'vitest';
import { assessPlacement } from './placementAssessment';

describe('placement assessment',()=>{
  it('distinguishes the same 4/6 raw score when the demonstrated difficulty differs',()=>{
    const basic=assessPlacement([
      {concept:'a',difficulty:0,correct:true},
      {concept:'b',difficulty:1,correct:true},
      {concept:'c',difficulty:1,correct:true},
      {concept:'d',difficulty:2,correct:true},
      {concept:'e',difficulty:2,correct:false},
      {concept:'f',difficulty:2,correct:false}
    ],'basic');
    const advanced=assessPlacement([
      {concept:'a',difficulty:3,correct:true},
      {concept:'b',difficulty:3,correct:true},
      {concept:'c',difficulty:3,correct:true},
      {concept:'d',difficulty:3,correct:true},
      {concept:'e',difficulty:2,correct:false},
      {concept:'f',difficulty:2,correct:false}
    ],'advanced');
    expect(basic.weightedAccuracy).toBeCloseTo(6/10.5,5);
    expect(advanced.weightedAccuracy).toBeCloseTo(10/14,5);
    expect(basic.recommendedLessonId).toBe('sections-paragraphs');
    expect(advanced.recommendedLessonId).toBe('math-modes');
  });

  it('keeps a foundational miss conservative even after harder successes',()=>{
    const result=assessPlacement([
      {concept:'foundation',difficulty:0,correct:false},
      {concept:'x',difficulty:3,correct:true},
      {concept:'y',difficulty:3,correct:true},
      {concept:'z',difficulty:3,correct:true}
    ],'advanced');
    expect(result.recommendedLessonId).toBe('document-structure');
  });
});