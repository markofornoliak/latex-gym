import { describe, expect, it } from 'vitest';
import { exercises } from '../data/courses';
import type { ConceptMastery, Exercise, Lesson } from '../types';
import { buildDailyWorkout, selectDailyTraining } from './spacedRepetition';
import type { AdaptiveKnowledgeContext } from './adaptiveEligibility';

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
    expect(selected).toHaveLength(5);
    expect(selected[0].id).toBe('weak');
    expect(selected.some(exercise=>exercise.id==='weak')).toBe(true);
  });

  it('builds an explainable mix rather than five opaque random tasks',()=>{
    const pool:Exercise[]=[
      makeExercise('review-1','due-1'),makeExercise('review-2','due-2'),
      makeExercise('new-1','new-1'),makeExercise('new-2','new-2'),
      {...makeExercise('debug','debug'),'category':'Отладка','mode':'Найти ошибку'},
      makeExercise('fill','fill')
    ];
    const mastery:Record<string,ConceptMastery>={
      'due-1':state(.55,3,2,1,'2026-08-01T00:00:00.000Z','2026-08-02T00:00:00.000Z'),
      'due-2':state(.61,3,2,1,'2026-08-02T00:00:00.000Z','2026-08-03T00:00:00.000Z')
    };
    const workout=buildDailyWorkout(pool,{},['lesson'],'2026-08-18',mastery);
    expect(workout).toHaveLength(5);
    expect(workout.filter(item=>item.reason==='review')).toHaveLength(2);
    expect(workout.some(item=>item.reason==='debugging')).toBe(true);
    expect(workout.every(item=>item.explanation.length>10)).toBe(true);
  });

  it('never lets the easy fallback bypass an unmet hard prerequisite',()=>{
    const base=makeExercise('base-ex','base','base-lesson');
    const advanced=makeExercise('advanced-ex','advanced','target');
    const baseLesson=makeLesson('base-lesson',['base'],[base]);
    const target=makeLesson('target',['advanced'],[advanced]);
    const adaptive=adaptiveContext([baseLesson,target],{base:{requires:[],introducedBy:['base-lesson']},advanced:{requires:['base'],introducedBy:['target']}},'target');
    const workout=buildDailyWorkout([base,advanced],{},[],'2026-08-21',{},adaptive);
    expect(workout.map(item=>item.exercise.id)).toEqual(['base-ex']);
    expect(workout.some(item=>item.exercise.id==='advanced-ex')).toBe(false);
  });

  it('recommends the nearest missing foundation before unrelated eligible work',()=>{
    const base=makeExercise('base-ex','base','base-lesson');
    const advanced=makeExercise('advanced-ex','advanced','target');
    const unrelated=makeExercise('unrelated-ex','unrelated','completed');
    const baseLesson=makeLesson('base-lesson',['base'],[base]);
    const target=makeLesson('target',['advanced'],[advanced]);
    const completed=makeLesson('completed',['unrelated'],[unrelated]);
    const adaptive=adaptiveContext([baseLesson,target,completed],{
      base:{requires:[],introducedBy:['base-lesson']},advanced:{requires:['base'],introducedBy:['target']},unrelated:{requires:[],introducedBy:['completed']}
    },'target');
    const workout=buildDailyWorkout([unrelated,advanced,base],{},['completed'],'2026-08-21',{},adaptive);
    expect(workout[0].exercise.id).toBe('base-ex');
    expect(workout[0].reason).toBe('weak');
    expect(workout[0].explanation).toContain('недостающая основа');
  });

  it('uses evidenceConcepts rather than broad supporting tags for mastery priority',()=>{
    const precise={...makeExercise('precise','supporting'),concepts:['supporting','target'],evidenceConcepts:['target']};
    const other=makeExercise('other','supporting');
    const mastery:Record<string,ConceptMastery>={
      target:state(.2,3,1,2,'2026-08-01T00:00:00.000Z','2026-08-02T00:00:00.000Z'),
      supporting:state(.95,8,8,0,'2026-08-20T00:00:00.000Z','2026-09-10T00:00:00.000Z')
    };
    const selected=selectDailyTraining([other,precise,makeExercise('f1','f1'),makeExercise('f2','f2'),makeExercise('f3','f3'),makeExercise('f4','f4')],{},['lesson'],'2026-08-21',mastery);
    expect(selected[0].id).toBe('precise');
  });
});

function makeExercise(id:string,concept:string,lessonId='lesson'):Exercise{return {id,lessonId,category:'Основы',difficulty:'Начальный',mode:'Написать код',title:id,instructions:id,requirements:[id],starterCode:'',validators:[],hints:[],solution:'ok',concepts:[concept],prerequisites:[]};}
function makeLesson(id:string,introduces:string[],lessonExercises:Exercise[]):Lesson{return {id,moduleId:'module',number:1,title:id,subtitle:id,difficulty:'Начальный',theory:[],examples:[],exercises:lessonExercises,relatedCommands:[],pedagogy:{objective:'Learn',prerequisites:[],introduces,reinforces:[],misconceptions:[],practiceObjective:'Practice',masteryCriteria:['Done']}};}
function adaptiveContext(lessons:Lesson[],nodes:AdaptiveKnowledgeContext['graph']['nodes'],targetLessonId:string):AdaptiveKnowledgeContext{return {lessons,targetLessonId,completedExerciseIds:[],graph:{nodes}};}
function state(score:number,attempts:number,successes:number,mistakeCount:number,lastPracticed:string,nextReview:string):ConceptMastery{return {score,attempts,successes,mistakeCount,lastPracticed,stability:4,nextReview,independentSuccesses:successes,hintedSuccesses:0,transferSuccesses:0,projectSuccesses:0,solutionReveals:0,lastEvidence:null};}
