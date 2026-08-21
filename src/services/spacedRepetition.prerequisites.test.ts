import { describe, expect, it } from 'vitest';
import type { ConceptMastery, Exercise, Lesson } from '../types';
import { buildCurriculumGraph } from './curriculumGraph';
import { buildDailyWorkout } from './spacedRepetition';

const baseExercise=exercise('base-exercise','base-lesson','base');
const advancedExercise=exercise('advanced-exercise','advanced-lesson','advanced');
const baseLesson=lesson('base-lesson',['base'],[],baseExercise);
const advancedLesson=lesson('advanced-lesson',['advanced'],['base'],advancedExercise);
const concepts=[{id:'base',title:'Base',description:'Base',prerequisites:[]},{id:'advanced',title:'Advanced',description:'Advanced',prerequisites:['base']}];
const graph=buildCurriculumGraph({concepts,lessons:[baseLesson,advancedLesson],exercises:[baseExercise,advancedExercise],references:[],projects:[]}).graph;
const context={graph,lessons:[baseLesson,advancedLesson]};

describe('dependency-aware daily workout',()=>{
  it('does not leak an exercise whose prerequisite is not yet known',()=>{
    const workout=buildDailyWorkout([baseExercise,advancedExercise],{},[],'2026-08-21',{},context);
    expect(workout.map(item=>item.exercise.id)).toEqual(['base-exercise']);
  });

  it('unlocks dependent practice from completed teaching or positive prerequisite mastery evidence',()=>{
    const byLesson=buildDailyWorkout([baseExercise,advancedExercise],{},['base-lesson'],'2026-08-21',{},context);
    expect(byLesson.some(item=>item.exercise.id==='advanced-exercise')).toBe(true);
    const mastery:Record<string,ConceptMastery>={base:mastered()};
    const byMastery=buildDailyWorkout([baseExercise,advancedExercise],{},[],'2026-08-21',mastery,context);
    expect(byMastery.some(item=>item.exercise.id==='advanced-exercise')).toBe(true);
  });

  it('keeps review practice available when the target concept already has successful evidence',()=>{
    const mastery:Record<string,ConceptMastery>={advanced:mastered()};
    const workout=buildDailyWorkout([advancedExercise],{},[],'2026-08-21',mastery,context);
    expect(workout.map(item=>item.exercise.id)).toContain('advanced-exercise');
  });
});

function exercise(id:string,lessonId:string,concept:string):Exercise{return {id,lessonId,category:'Основы',difficulty:'Начальный',mode:'Написать код',title:id,instructions:id,requirements:[id],starterCode:'',validators:[],hints:[],solution:'ok',concepts:[concept],prerequisites:[]};}
function lesson(id:string,introduces:string[],prerequisites:string[],item:Exercise):Lesson{return {id,moduleId:'module',number:1,title:id,subtitle:id,difficulty:'Начальный',theory:[],pedagogy:{objective:id,prerequisites,introduces,reinforces:[],misconceptions:[],practiceObjective:id,masteryCriteria:[id]},examples:[],exercises:[item],relatedCommands:[]};}
function mastered():ConceptMastery{return {score:.9,attempts:2,successes:2,mistakeCount:0,lastPracticed:'2026-08-20T00:00:00.000Z',stability:4,nextReview:'2026-08-21T00:00:00.000Z',independentSuccesses:2,hintedSuccesses:0,transferSuccesses:0,projectSuccesses:0,solutionReveals:0,lastEvidence:null};}
