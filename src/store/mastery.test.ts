import { describe, expect, it } from 'vitest';
import { updateConceptMastery } from './useAppStore';

describe('mastery evidence',()=>{
  const now=new Date('2026-08-17T12:00:00Z');

  it('values an unassisted first-try success more than a revealed solution',()=>{
    const firstTry=updateConceptMastery(undefined,true,now,{firstTry:true,hintsUsed:0,solutionRevealed:false});
    const revealed=updateConceptMastery(undefined,true,now,{firstTry:false,hintsUsed:2,solutionRevealed:true});
    expect(firstTry.score).toBeGreaterThan(revealed.score);
    expect(firstTry.firstTrySuccesses).toBe(1);
    expect(revealed.solutionReveals).toBe(1);
    expect(revealed.hintedSuccesses).toBe(1);
  });

  it('records application inside a project as transfer evidence',()=>{
    const applied=updateConceptMastery(undefined,true,now,{application:true});
    expect(applied.applications).toBe(1);
    expect(applied.score).toBeGreaterThan(.3);
  });

  it('schedules a failed concept for near-term review',()=>{
    const failed=updateConceptMastery(undefined,false,now);
    expect(failed.mistakeCount).toBe(1);
    expect(failed.nextReview?.slice(0,10)).toBe('2026-08-18');
  });
});
