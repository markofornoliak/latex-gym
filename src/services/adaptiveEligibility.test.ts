import { describe, expect, it } from 'vitest';
import type { ConceptMastery, Exercise, Lesson } from '../types';
import { isExerciseEligible, isExerciseInAdaptiveScope, targetPrerequisiteFrontier, type AdaptiveKnowledgeContext } from './adaptiveEligibility';

const exercise=(id:string,lessonId:string,concepts:string[],prerequisites:string[]=[]):Exercise=>({
  id,lessonId,category:'Основы',difficulty:'Начальный',mode:'Написать код',title:id,instructions:id,requirements:[id],starterCode:'',validators:[],hints:[],solution:'ok',concepts,prerequisites
});
const lesson=(id:string,introduces:string[],prerequisites:string[]=[],exercises:Exercise[]=[]):Lesson=>({
  id,moduleId:'module',number:1,title:id,subtitle:id,difficulty:'Начальный',theory:[],examples:[],exercises,relatedCommands:[],
  pedagogy:{objective:'Learn',prerequisites,introduces,reinforces:[],misconceptions:[],practiceObjective:'Practice',masteryCriteria:['Done']}
});
function context(lessons:Lesson[],targetLessonId='target',completedExerciseIds:string[]=[]):AdaptiveKnowledgeContext{
  return {lessons,targetLessonId,completedExerciseIds,graph:{nodes:{
    base:{requires:[],introducedBy:['base-lesson']},
    advanced:{requires:['base'],introducedBy:['target']},
    sibling:{requires:[],introducedBy:['other']}
  }}};
}
const learner=(completedLessonIds:string[]=[],score=.3,attempts=0,successes=0)=>{
  const mastery:Record<string,ConceptMastery>={};
  if(attempts)mastery.base={score,attempts,successes,mistakeCount:attempts-successes,lastPracticed:'2026-08-20T00:00:00.000Z',stability:1,nextReview:null,independentSuccesses:successes,hintedSuccesses:0,transferSuccesses:0,projectSuccesses:0,solutionReveals:0,lastEvidence:null};
  return {conceptScores:{},completedLessonIds,mastery};
};

describe('adaptive prerequisite eligibility',()=>{
  it('blocks new advanced practice until its hard prerequisite is ready',()=>{
    const advanced=exercise('advanced-ex','target',['advanced']);
    const target=lesson('target',['advanced'],[],[advanced]);
    expect(isExerciseEligible(advanced,learner(),context([target]))).toBe(false);
  });

  it('keeps completed practice eligible for review even if a prerequisite later weakens',()=>{
    const advanced=exercise('advanced-ex','target',['advanced']);
    const target=lesson('target',['advanced'],[],[advanced]);
    expect(isExerciseEligible(advanced,learner([],0.2,3,1),context([target],'target',['advanced-ex']))).toBe(true);
  });

  it('allows concepts deliberately co-introduced in the same lesson',()=>{
    const advanced=exercise('advanced-ex','target',['advanced']);
    const target=lesson('target',['base','advanced'],[],[advanced]);
    expect(isExerciseEligible(advanced,learner(),context([target]))).toBe(true);
  });

  it('walks through blocked prerequisites to the nearest learnable foundation',()=>{
    const advanced=exercise('advanced-ex','target',['advanced']);
    const target=lesson('target',['advanced'],[],[advanced]);
    const c=context([target]);
    c.graph={nodes:{
      base:{requires:[],introducedBy:['base-lesson']},
      middle:{requires:['base'],introducedBy:['middle-lesson']},
      advanced:{requires:['middle'],introducedBy:['target']},
      sibling:{requires:[],introducedBy:['other']}
    }};
    expect(targetPrerequisiteFrontier(learner(),c)).toEqual(['base']);
  });

  it('keeps recommendations local to the target and its nearest unmet foundation',()=>{
    const base=exercise('base-ex','base-lesson',['base']);
    const advanced=exercise('advanced-ex','target',['advanced']);
    const unrelated=exercise('other-ex','other',['sibling']);
    const baseLesson=lesson('base-lesson',['base'],[],[base]);
    const target=lesson('target',['advanced'],[],[advanced]);
    const other=lesson('other',['sibling'],[],[unrelated]);
    const c=context([baseLesson,target,other]);
    const state=learner();
    expect(targetPrerequisiteFrontier(state,c)).toEqual(['base']);
    expect(isExerciseInAdaptiveScope(base,state,c)).toBe(true);
    expect(isExerciseInAdaptiveScope(unrelated,state,c)).toBe(false);
  });
});
