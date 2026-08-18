import { describe, expect, it } from 'vitest';
import { updateConceptMastery } from './useAppStore';

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
