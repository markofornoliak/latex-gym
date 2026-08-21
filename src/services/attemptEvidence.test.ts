import { describe, expect, it } from 'vitest';
import { attemptIndependence, nextAttemptHintLevel } from './attemptEvidence';

describe('attempt evidence',()=>{
  it('starts a new attempt independent even when historical hints exist elsewhere in persisted analytics',()=>{
    expect(attemptIndependence({solutionRevealed:false,hintLevelThisAttempt:0})).toBe('independent');
  });

  it('marks the current attempt hinted as soon as a hint is exposed',()=>{
    const level=nextAttemptHintLevel(0,3);
    expect(level).toBe(1);
    expect(attemptIndependence({solutionRevealed:false,hintLevelThisAttempt:level})).toBe('hinted');
  });

  it('solution reveal remains weaker than hinted evidence',()=>{
    expect(attemptIndependence({solutionRevealed:true,hintLevelThisAttempt:2})).toBe('revealed');
  });
});