import { describe, expect, it } from 'vitest';
import { exercises } from '../data/courses';
import { selectDailyTraining } from './spacedRepetition';

describe('daily training',()=>{
  it('is deterministic for the same day and scores',()=>{
    const a=selectDailyTraining(exercises,{section:-2},[], '2026-08-16').map(e=>e.id);
    const b=selectDailyTraining(exercises,{section:-2},[], '2026-08-16').map(e=>e.id);
    expect(a).toEqual(b);
    expect(a).toHaveLength(5);
  });
});
