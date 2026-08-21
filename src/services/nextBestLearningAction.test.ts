import { describe, expect, it } from 'vitest';
import type { ConceptMastery, Exercise, LearningProject, Lesson } from '../types';
import { buildCurriculumGraph } from './curriculumGraph';
import { nextBestLearningAction } from './nextBestLearningAction';

const lessons=[
  lesson('what-is-latex',['base'],[]),
  lesson('math-modes',['math-mode'],['base']),
  lesson('academic-paper',['paper'],['base'])
];
const exercises=[exercise('base-ex','what-is-latex','base'),exercise('math-ex','math-modes','math-mode'),exercise('paper-ex','academic-paper','paper')];
lessons.forEach(lessonItem=>{lessonItem.exercises=exercises.filter(exerciseItem=>exerciseItem.lessonId===lessonItem.id);});
const concepts=[
  {id:'base',title:'Base',description:'Base',prerequisites:[]},
  {id:'math-mode',title:'Math',description:'Math',prerequisites:['base']},
  {id:'paper',title:'Paper',description:'Paper',prerequisites:['base']}
];
const graph=buildCurriculumGraph({concepts,lessons,exercises,references:[],projects:[]}).graph;
const baseMastery:Record<string,ConceptMastery>={base:mastered('2026-08-20T00:00:00.000Z',null,.9)};

describe('next best learning action',()=>{
  it('uses the same learner history to choose different eligible lessons for different goals',()=>{
    const common={lessons,exercises,projects:[] as LearningProject[],graph,conceptScores:{},mastery:baseMastery,completedLessonIds:['what-is-latex'],completedProjectStages:{},now:new Date('2026-08-21T12:00:00Z')};
    expect(nextBestLearningAction({...common,goals:['mathematics'],experience:'basic'})).toEqual({kind:'lesson',lessonId:'math-modes',reason:'goal-track'});
    expect(nextBestLearningAction({...common,goals:['scientific-papers'],experience:'basic'})).toEqual({kind:'lesson',lessonId:'academic-paper',reason:'goal-track'});
  });

  it('prioritizes an overdue retrieval over a goal-track lesson',()=>{
    const mastery={...baseMastery,'math-mode':mastered('2026-08-18T00:00:00.000Z','2026-08-20T00:00:00.000Z',.8)};
    const action=nextBestLearningAction({lessons,exercises,projects:[],graph,conceptScores:{},mastery,completedLessonIds:['what-is-latex','math-modes'],completedProjectStages:{},goals:['scientific-papers'],experience:'basic',now:new Date('2026-08-21T12:00:00Z')});
    expect(action).toEqual({kind:'practice',exerciseId:'math-ex',reason:'due'});
  });

  it('does not allow placement-only evidence to satisfy a track prerequisite',()=>{
    const placement={...mastered('2026-08-21T00:00:00.000Z','2026-08-22T00:00:00.000Z',.45),lastIndependentSuccess:null,independentSuccesses:0,lastEvidence:{outcome:'success' as const,independence:'independent' as const,context:'placement' as const,realCompile:false}};
    const action=nextBestLearningAction({lessons,exercises,projects:[],graph,conceptScores:{base:1},mastery:{base:placement},completedLessonIds:[],completedProjectStages:{},goals:['mathematics'],experience:'advanced',now:new Date('2026-08-21T12:00:00Z')});
    expect(action).toEqual({kind:'lesson',lessonId:'what-is-latex',reason:'course-sequence'});
  });
});

function lesson(id:string,introduces:string[],prerequisites:string[]):Lesson{return {id,moduleId:id,number:1,title:id,subtitle:id,difficulty:'Начальный',theory:[],pedagogy:{objective:id,prerequisites,introduces,reinforces:[],misconceptions:[],practiceObjective:id,masteryCriteria:[id]},examples:[],exercises:[],relatedCommands:[]};}
function exercise(id:string,lessonId:string,concept:string):Exercise{return {id,lessonId,category:'Основы',difficulty:'Начальный',mode:'Написать код',title:id,instructions:id,requirements:[],starterCode:'',validators:[],hints:[],solution:'ok',concepts:[concept]};}
function mastered(lastPracticed:string,nextReview:string|null,score:number):ConceptMastery{return {score,attempts:2,successes:2,mistakeCount:0,lastPracticed,stability:4,nextReview,independentSuccesses:2,hintedSuccesses:0,transferSuccesses:0,projectSuccesses:0,solutionReveals:0,delayedRecallSuccesses:1,lastIndependentSuccess:lastPracticed,lastSuccessfulDelayDays:2,lastEvidence:null};}
