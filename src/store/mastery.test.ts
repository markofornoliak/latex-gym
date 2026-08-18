import { describe, expect, it } from 'vitest';
import { migrateConceptMastery, migrateConceptScores, updateConceptMastery } from './useAppStore';

describe('concept mastery evidence',()=>{
  const now=new Date('2026-08-18T10:00:00Z');

  it('values an independent real-compile success above a hinted success',()=>{
    const independent=updateConceptMastery(undefined,true,now,{independence:'independent',context:'practice',realCompile:true});
    const hinted=updateConceptMastery(undefined,true,now,{independence:'hinted',context:'practice',realCompile:true});
    expect(independent.score).toBeGreaterThan(hinted.score);
    expect(independent.stability).toBeGreaterThan(hinted.stability);
    expect(independent.independentSuccesses).toBe(1);
    expect(hinted.hintedSuccesses).toBe(1);
  });

  it('treats a revealed solution as exposure rather than mastery',()=>{
    const revealed=updateConceptMastery(undefined,true,now,{independence:'revealed',context:'practice',realCompile:true});
    const independent=updateConceptMastery(undefined,true,now,{independence:'independent',context:'practice',realCompile:true});
    expect(revealed.score).toBeLessThan(independent.score);
    expect(revealed.solutionReveals).toBe(1);
    expect(revealed.independentSuccesses).toBe(0);
  });

  it('makes successful transfer evidence stronger than same-context repetition',()=>{
    const practice=updateConceptMastery(undefined,true,now,{independence:'independent',context:'practice',realCompile:true});
    const transfer=updateConceptMastery(undefined,true,now,{independence:'independent',context:'transfer',realCompile:true});
    expect(transfer.score).toBeGreaterThan(practice.score);
    expect(transfer.transferSuccesses).toBe(1);
  });

  it('brings unstable knowledge back quickly after a failure',()=>{
    const strong=updateConceptMastery(undefined,true,now,{independence:'independent',context:'transfer',realCompile:true});
    const failed=updateConceptMastery(strong,false,new Date('2026-08-19T10:00:00Z'),{independence:'independent',context:'practice',realCompile:true});
    expect(failed.score).toBeLessThan(strong.score);
    expect(failed.stability).toBeLessThan(strong.stability);
    expect(failed.nextReview?.slice(0,10)).toBe('2026-08-20');
  });
});

describe('canonical mastery migration',()=>{
  it('merges legacy command tags into one canonical concept score without dropping evidence',()=>{
    const scores=migrateConceptScores({frac:2,fraction:3,textbf:1,emph:2});
    expect(scores.frac).toBeUndefined();
    expect(scores.textbf).toBeUndefined();
    expect(scores.fraction).toBe(5);
    expect(scores.emphasis).toBe(3);
  });

  it('merges multiple historical mastery records conservatively into the canonical concept',()=>{
    const migrated=migrateConceptMastery({
      frac:{score:.8,attempts:4,successes:3,mistakeCount:1,lastPracticed:'2026-08-10T10:00:00Z',stability:5,nextReview:'2026-08-20T10:00:00Z',independentSuccesses:2,hintedSuccesses:1,transferSuccesses:0,projectSuccesses:0,solutionReveals:0,lastEvidence:{outcome:'success',independence:'independent',context:'practice',realCompile:true}},
      fraction:{score:.6,attempts:2,successes:1,mistakeCount:1,lastPracticed:'2026-08-17T10:00:00Z',stability:3,nextReview:'2026-08-19T10:00:00Z',independentSuccesses:1,hintedSuccesses:0,transferSuccesses:1,projectSuccesses:0,solutionReveals:0,lastEvidence:{outcome:'success',independence:'independent',context:'transfer',realCompile:true}}
    });
    const fraction=migrated.fraction;
    expect(Object.keys(migrated)).toEqual(['fraction']);
    expect(fraction.attempts).toBe(6);
    expect(fraction.successes).toBe(4);
    expect(fraction.independentSuccesses).toBe(3);
    expect(fraction.transferSuccesses).toBe(1);
    expect(fraction.stability).toBe(5);
    expect(fraction.nextReview).toBe('2026-08-19T10:00:00Z');
    expect(fraction.lastPracticed).toBe('2026-08-17T10:00:00Z');
    expect(fraction.score).toBeGreaterThan(.6);
    expect(fraction.score).toBeLessThan(.8);
  });
});
