import { describe, expect, it } from 'vitest';
import { exercises } from '../data/courses';
import type { ConceptMastery, Exercise } from '../types';
import { selectDailyTraining } from './spacedRepetition';

describe('daily training',()=>{
  it('is deterministic for the same day and scores',()=>{
    const a=selectDailyTraining(exercises,{section:-2},[], '2026-08-16').map(exercise=>exercise.id);
    const b=selectDailyTraining(exercises,{section:-2},[], '2026-08-16').map(exercise=>exercise.id);
    expect(a).toEqual(b);
    expect(a).toHaveLength(5);
  });

  it('prioritizes a weak concept that is due for review',()=>{
    const pool:Exercise[]=[makeExercise('weak','weak-concept'),makeExercise('strong','strong-concept'),makeExercise('fresh','fresh-concept'),makeExercise('other-1','other-1'),makeExercise('other-2','other-2'),makeExercise('other-3','other-3')];
    const mastery:Record<string,ConceptMastery>={
      'weak-concept':state(.28,4,1,3,'2026-08-01T00:00:00.000Z','2026-08-02T00:00:00.000Z'),
      'strong-concept':state(.96,8,8,0,'2026-08-16T00:00:00.000Z','2026-09-01T00:00:00.000Z'),
      'fresh-concept':state(.82,5,4,1,'2026-08-16T00:00:00.000Z','2026-08-25T00:00:00.000Z')
    };
    const selected=selectDailyTraining(pool,{},['lesson'], '2026-08-17',mastery);
    expect(selected[0].id).toBe('weak');
    expect(selected.findIndex(exercise=>exercise.id==='weak')).toBeLessThan(selected.findIndex(exercise=>exercise.id==='strong'));
  });
});

function makeExercise(id:string,concept:string):Exercise{return {id,lessonId:'lesson',category:'Основы',difficulty:'Начальный',mode:'Написать код',title:id,instructions:id,requirements:[id],starterCode:'',validators:[],hints:[],solution:'ok',concepts:[concept]};}
function state(score:number,attempts:number,successes:number,mistakeCount:number,lastPracticed:string,nextReview:string):ConceptMastery{return {score,attempts,successes,mistakeCount,lastPracticed,stability:4,nextReview};}
