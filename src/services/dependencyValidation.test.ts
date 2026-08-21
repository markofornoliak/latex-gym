import { describe, expect, it } from 'vitest';
import type { ConceptDefinition, Exercise, LearningProject, Lesson } from '../types';
import { buildCurriculumGraph } from './curriculumGraph';
import { validateDependencyStructure } from './dependencyValidation';

const emptyInput={lessons:[] as Lesson[],exercises:[] as Exercise[],references:[],projects:[] as LearningProject[]};

describe('dependency graph validation',()=>{
  it('detects direct and multi-hop concept cycles',()=>{
    const two:ConceptDefinition[]=[concept('a',['b']),concept('b',['a'])];
    const three:ConceptDefinition[]=[concept('a',['c']),concept('b',['a']),concept('c',['b'])];
    expect(buildCurriculumGraph({concepts:two,...emptyInput}).issues.some(issue=>issue.code==='concept-cycle')).toBe(true);
    expect(buildCurriculumGraph({concepts:three,...emptyInput}).issues.some(issue=>issue.code==='concept-cycle')).toBe(true);
  });

  it('rejects duplicate prerequisite declarations before graph Set normalization',()=>{
    const concepts=[concept('base',[]),concept('advanced',['base','base'])];
    const issues=validateDependencyStructure({concepts,lessons:[],exercises:[],projects:[]});
    expect(issues.some(issue=>issue.code==='duplicate-prerequisite'&&issue.conceptId==='advanced')).toBe(true);
  });

  it('reports a disconnected concept region without treating it as a hard error',()=>{
    const concepts=[concept('latex-model',[]),concept('connected',['latex-model']),concept('island-a',[]),concept('island-b',['island-a'])];
    const issue=validateDependencyStructure({concepts,lessons:[],exercises:[],projects:[]}).find(item=>item.code==='disconnected-concept-region');
    expect(issue?.severity).toBe('warning');
    expect(issue?.message).toContain('island-a');
  });

  it('detects a multi-step lesson/concept constraint cycle',()=>{
    const concepts=[concept('a',['b']),concept('b',['c']),concept('c',[])];
    const lessons=[lesson('introduce-a',['a'],[]),lesson('introduce-c',['c'],['a']),lesson('introduce-b',['b'],['c'])];
    const issues=validateDependencyStructure({concepts,lessons,exercises:[],projects:[]});
    expect(issues.some(issue=>issue.code==='impossible-learning-path')).toBe(true);
  });

  it('rejects exercise prerequisites introduced later or never introduced',()=>{
    const concepts=[concept('base',[]),concept('later',['base']),concept('ghost',['base'])];
    const lessons=[lesson('first',['base'],[]),lesson('second',['later'],['base'])];
    const exercises=[exercise('too-early','first',['later']),exercise('never','second',['ghost'])];
    const issues=validateDependencyStructure({concepts,lessons,exercises,projects:[]});
    expect(issues.some(issue=>issue.code==='exercise-knowledge-gap'&&issue.exerciseId==='too-early')).toBe(true);
    expect(issues.some(issue=>issue.code==='exercise-prerequisite-never-introduced'&&issue.exerciseId==='never')).toBe(true);
  });

  it('allows an exercise to use a prerequisite introduced in its own lesson before practice',()=>{
    const concepts=[concept('base',[])];
    const lessons=[lesson('first',['base'],[])];
    const exercises=[exercise('same-lesson','first',['base'])];
    const issues=validateDependencyStructure({concepts,lessons,exercises,projects:[]});
    expect(issues.some(issue=>issue.code==='exercise-knowledge-gap'||issue.code==='exercise-prerequisite-never-introduced')).toBe(false);
  });
});

function concept(id:string,prerequisites:string[]):ConceptDefinition{return {id,title:id,description:id,prerequisites};}
function lesson(id:string,introduces:string[],prerequisites:string[]):Lesson{return {id,moduleId:'module',number:1,title:id,subtitle:id,difficulty:'Начальный',theory:[],pedagogy:{objective:id,prerequisites,introduces,reinforces:[],misconceptions:[],practiceObjective:id,masteryCriteria:[id]},examples:[],exercises:[],relatedCommands:[]};}
function exercise(id:string,lessonId:string,prerequisites:string[]):Exercise{return {id,lessonId,category:'Основы',difficulty:'Начальный',mode:'Написать код',title:id,instructions:id,requirements:[id],starterCode:'',validators:[],hints:[],solution:'ok',concepts:[],prerequisites};}
