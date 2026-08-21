import fs from 'node:fs';

function read(path){return fs.readFileSync(path,'utf8');}
function write(path,content){fs.writeFileSync(path,content);}
function replaceOnce(path,from,to){
  const source=read(path);
  const first=source.indexOf(from);
  if(first<0)throw new Error(`Anchor not found in ${path}: ${from.slice(0,120)}`);
  if(source.indexOf(from,first+from.length)>=0)throw new Error(`Anchor is not unique in ${path}: ${from.slice(0,120)}`);
  write(path,source.slice(0,first)+to+source.slice(first+from.length));
}

const dependencyValidation=`import type { ConceptDefinition, Exercise, LearningProject, Lesson } from '../types';

export type DependencyValidationIssue={
  severity:'error'|'warning';code:string;message:string;lessonId?:string;exerciseId?:string;projectId?:string;conceptId?:string;
};

type Input={
  concepts:readonly ConceptDefinition[];
  lessons:readonly Lesson[];
  exercises:readonly Exercise[];
  projects:readonly LearningProject[];
};

export function validateDependencyStructure(input:Input):DependencyValidationIssue[]{
  const issues:DependencyValidationIssue[]=[];
  const conceptIds=new Set(input.concepts.map(concept=>concept.id));
  addDuplicatePrerequisites(input,issues);
  addExerciseChronologyIssues(input,conceptIds,issues);
  addConstraintCycleIssues(input,conceptIds,issues);
  addDisconnectedRegionIssues(input.concepts,conceptIds,issues);
  return issues;
}

function addDuplicatePrerequisites(input:Input,issues:DependencyValidationIssue[]){
  for(const concept of input.concepts)for(const prerequisite of duplicates(concept.prerequisites))issues.push({severity:'error',code:'duplicate-prerequisite',conceptId:concept.id,message:'Concept '+concept.id+' lists prerequisite '+prerequisite+' more than once.'});
  for(const lesson of input.lessons)for(const prerequisite of duplicates(lesson.pedagogy?.prerequisites??[]))issues.push({severity:'error',code:'duplicate-prerequisite',lessonId:lesson.id,conceptId:prerequisite,message:'Lesson '+lesson.id+' lists prerequisite '+prerequisite+' more than once.'});
  for(const exercise of input.exercises)for(const prerequisite of duplicates(exercise.prerequisites??[]))issues.push({severity:'error',code:'duplicate-prerequisite',exerciseId:exercise.id,conceptId:prerequisite,message:'Exercise '+exercise.id+' lists prerequisite '+prerequisite+' more than once.'});
  for(const project of input.projects)for(const prerequisite of duplicates(project.prerequisites))issues.push({severity:'error',code:'duplicate-prerequisite',projectId:project.id,conceptId:prerequisite,message:'Project '+project.id+' lists prerequisite '+prerequisite+' more than once.'});
}

function addExerciseChronologyIssues(input:Input,conceptIds:Set<string>,issues:DependencyValidationIssue[]){
  const lessonPosition=new Map(input.lessons.map((lesson,index)=>[lesson.id,index]));
  const firstIntroduction=new Map<string,{index:number;lessonId:string}>();
  input.lessons.forEach((lesson,index)=>{
    for(const conceptId of lesson.pedagogy?.introduces??[])if(!firstIntroduction.has(conceptId))firstIntroduction.set(conceptId,{index,lessonId:lesson.id});
  });
  for(const exercise of input.exercises){
    const exerciseLessonIndex=lessonPosition.get(exercise.lessonId);
    if(exerciseLessonIndex===undefined)continue;
    for(const prerequisite of new Set(exercise.prerequisites??[])){
      if(!conceptIds.has(prerequisite))continue;
      const introduction=firstIntroduction.get(prerequisite);
      if(!introduction){
        issues.push({severity:'error',code:'exercise-prerequisite-never-introduced',exerciseId:exercise.id,conceptId:prerequisite,message:'Exercise '+exercise.id+' requires '+prerequisite+', but no lesson formally introduces it.'});
      }else if(introduction.index>exerciseLessonIndex){
        issues.push({severity:'error',code:'exercise-knowledge-gap',exerciseId:exercise.id,conceptId:prerequisite,message:'Exercise '+exercise.id+' requires '+prerequisite+' before its first introduction in lesson '+introduction.lessonId+'.'});
      }
    }
  }
}

function addConstraintCycleIssues(input:Input,conceptIds:Set<string>,issues:DependencyValidationIssue[]){
  const graph=new Map<string,Set<string>>();
  const ensure=(id:string)=>{if(!graph.has(id))graph.set(id,new Set());};
  const edge=(from:string,to:string)=>{ensure(from);ensure(to);graph.get(from)!.add(to);};
  for(const concept of input.concepts){
    ensure('c:'+concept.id);
    for(const prerequisite of concept.prerequisites)if(conceptIds.has(prerequisite))edge('c:'+prerequisite,'c:'+concept.id);
  }
  for(const lesson of input.lessons){
    if(!lesson.pedagogy)continue;
    const lessonNode='l:'+lesson.id;
    ensure(lessonNode);
    for(const prerequisite of lesson.pedagogy.prerequisites)if(conceptIds.has(prerequisite))edge('c:'+prerequisite,lessonNode);
    for(const conceptId of lesson.pedagogy.introduces)if(conceptIds.has(conceptId))edge(lessonNode,'c:'+conceptId);
  }
  for(const component of stronglyConnectedComponents(graph)){
    if(component.length<2||!component.some(id=>id.startsWith('l:')))continue;
    if(isAlreadyReportedSameLessonContradiction(component,input.lessons))continue;
    const lessonIds=component.filter(id=>id.startsWith('l:')).map(id=>id.slice(2)).sort();
    const conceptNodes=component.filter(id=>id.startsWith('c:')).map(id=>id.slice(2)).sort();
    issues.push({severity:'error',code:'impossible-learning-path',lessonId:lessonIds[0],conceptId:conceptNodes[0],message:'Learning constraints form a cycle across '+[...lessonIds.map(id=>'lesson:'+id),...conceptNodes.map(id=>'concept:'+id)].join(', ')+'.'});
  }
}

function isAlreadyReportedSameLessonContradiction(component:string[],lessons:readonly Lesson[]){
  if(component.length!==2)return false;
  const lessonNode=component.find(id=>id.startsWith('l:'));
  const conceptNode=component.find(id=>id.startsWith('c:'));
  if(!lessonNode||!conceptNode)return false;
  const lesson=lessons.find(item=>item.id===lessonNode.slice(2));
  const conceptId=conceptNode.slice(2);
  return Boolean(lesson?.pedagogy?.prerequisites.includes(conceptId)&&lesson.pedagogy.introduces.includes(conceptId));
}

function addDisconnectedRegionIssues(concepts:readonly ConceptDefinition[],conceptIds:Set<string>,issues:DependencyValidationIssue[]){
  if(concepts.length<2)return;
  const adjacency=new Map<string,Set<string>>();
  for(const concept of concepts)adjacency.set(concept.id,new Set());
  for(const concept of concepts){
    for(const prerequisite of concept.prerequisites){
      if(!conceptIds.has(prerequisite))continue;
      adjacency.get(concept.id)!.add(prerequisite);
      adjacency.get(prerequisite)!.add(concept.id);
    }
  }
  const components:string[][]=[];
  const visited=new Set<string>();
  for(const concept of concepts){
    if(visited.has(concept.id))continue;
    const component:string[]=[];
    const stack=[concept.id];
    visited.add(concept.id);
    while(stack.length){
      const id=stack.pop()!;
      component.push(id);
      for(const neighbor of adjacency.get(id)??[])if(!visited.has(neighbor)){visited.add(neighbor);stack.push(neighbor);}
    }
    components.push(component.sort());
  }
  if(components.length<2)return;
  const primary=components.find(component=>component.includes('latex-model'))??[...components].sort((a,b)=>b.length-a.length)[0];
  for(const component of components){
    if(component===primary)continue;
    issues.push({severity:'warning',code:'disconnected-concept-region',conceptId:component[0],message:'Disconnected concept region ('+component.length+'): '+component.join(', ')+'.'});
  }
}

function duplicates(values:readonly string[]){
  const seen=new Set<string>();
  const duplicateSet=new Set<string>();
  for(const value of values){if(seen.has(value))duplicateSet.add(value);else seen.add(value);}
  return [...duplicateSet];
}

function stronglyConnectedComponents(graph:Map<string,Set<string>>){
  let index=0;
  const indices=new Map<string,number>();
  const lowLinks=new Map<string,number>();
  const stack:string[]=[];
  const onStack=new Set<string>();
  const components:string[][]=[];
  const visit=(node:string)=>{
    indices.set(node,index);lowLinks.set(node,index);index+=1;stack.push(node);onStack.add(node);
    for(const neighbor of graph.get(node)??[]){
      if(!indices.has(neighbor)){visit(neighbor);lowLinks.set(node,Math.min(lowLinks.get(node)!,lowLinks.get(neighbor)!));}
      else if(onStack.has(neighbor))lowLinks.set(node,Math.min(lowLinks.get(node)!,indices.get(neighbor)!));
    }
    if(lowLinks.get(node)!==indices.get(node))return;
    const component:string[]=[];
    while(stack.length){const item=stack.pop()!;onStack.delete(item);component.push(item);if(item===node)break;}
    components.push(component);
  };
  for(const node of graph.keys())if(!indices.has(node))visit(node);
  return components;
}
`;
write('src/services/dependencyValidation.ts',dependencyValidation);

const eligibility=`import type { ConceptMastery, Exercise, Lesson } from '../types';
import type { CurriculumGraph } from './curriculumGraph';

export type WorkoutCurriculumContext={graph?:CurriculumGraph;lessons?:readonly Lesson[]};

export function filterEligibleExercises(
  exercises:readonly Exercise[],
  conceptScores:Record<string,number>,
  completedLessonIds:readonly string[],
  mastery:Record<string,ConceptMastery>,
  context:WorkoutCurriculumContext
){
  if(!context.graph||!context.lessons)return exercises;
  const graph=context.graph;
  const lessonById=new Map(context.lessons.map(lesson=>[lesson.id,lesson]));
  const completed=new Set(completedLessonIds);
  const known=new Set<string>();
  for(const lessonId of completed){for(const conceptId of lessonById.get(lessonId)?.pedagogy?.introduces??[])known.add(conceptId);}
  for(const [conceptId,state] of Object.entries(mastery))if(state.successes>0)known.add(conceptId);
  for(const [conceptId,score] of Object.entries(conceptScores))if(score>0)known.add(conceptId);

  return exercises.filter(exercise=>{
    if(completed.has(exercise.lessonId))return true;
    if(exercise.concepts.length>0&&exercise.concepts.every(conceptId=>(mastery[conceptId]?.successes??0)>0))return true;
    const required=new Set<string>(exercise.prerequisites??[]);
    for(const prerequisite of lessonById.get(exercise.lessonId)?.pedagogy?.prerequisites??[])required.add(prerequisite);
    const visited=new Set<string>();
    const visit=(conceptId:string)=>{
      if(visited.has(conceptId))return;
      visited.add(conceptId);
      for(const prerequisite of graph.nodes[conceptId]?.requires??[]){required.add(prerequisite);visit(prerequisite);}
    };
    for(const conceptId of exercise.concepts)visit(conceptId);
    return [...required].every(conceptId=>known.has(conceptId));
  });
}
`;
write('src/services/exerciseEligibility.ts',eligibility);

const dependencyTests=`import { describe, expect, it } from 'vitest';
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
`;
write('src/services/dependencyValidation.test.ts',dependencyTests);

const eligibilityTests=`import { describe, expect, it } from 'vitest';
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
`;
write('src/services/spacedRepetition.prerequisites.test.ts',eligibilityTests);

replaceOnce('src/services/curriculumLinter.ts',"import { buildCurriculumGraph } from './curriculumGraph';\nimport { validateRule } from './validator';","import { buildCurriculumGraph } from './curriculumGraph';\nimport { validateDependencyStructure } from './dependencyValidation';\nimport { validateRule } from './validator';");
replaceOnce('src/services/curriculumLinter.ts',"  const firstIntroduction=new Map<string,{index:number;lesson:Lesson}>();\n  lessons.forEach((lesson,index)=>{\n    for(const concept of lesson.pedagogy?.introduces??[])if(!firstIntroduction.has(concept))firstIntroduction.set(concept,{index,lesson});\n  });\n\n",'');
replaceOnce('src/services/curriculumLinter.ts',"          const later=firstIntroduction.get(prerequisite);\n          const contradictory=later&&later.index>lessonIndex&&later.lesson.pedagogy?.prerequisites.includes(conceptId);\n          if(contradictory){\n            issues.push({severity:'error',code:'impossible-learning-path',conceptId:conceptId,lessonId:lesson.id,message:`Concept ${conceptId} requires ${prerequisite}, but ${prerequisite} is first introduced later in ${later.lesson.id}, which itself requires ${conceptId}.`});\n          }else{\n            issues.push({severity:'warning',code:'concept-dependency-gap',conceptId:conceptId,lessonId:lesson.id,message:`Lesson ${lesson.id} introduces ${conceptId} before concept dependency ${prerequisite} has been formally introduced.`});\n          }","          issues.push({severity:'warning',code:'concept-dependency-gap',conceptId:conceptId,lessonId:lesson.id,message:`Lesson ${lesson.id} introduces ${conceptId} before concept dependency ${prerequisite} has been formally introduced.`});");
replaceOnce('src/services/curriculumLinter.ts',"  addReferenceTokenCollisions(references,issues);\n\n  const {graph,issues:graphIssues}=buildCurriculumGraph({concepts,lessons,exercises,references,projects});","  addReferenceTokenCollisions(references,issues);\n  issues.push(...validateDependencyStructure({concepts,lessons,exercises,projects}));\n\n  const {graph,issues:graphIssues}=buildCurriculumGraph({concepts,lessons,exercises,references,projects});");

replaceOnce('src/services/spacedRepetition.ts',"import type { ConceptMastery, Exercise } from '../types';","import type { ConceptMastery, Exercise } from '../types';\nimport { filterEligibleExercises, type WorkoutCurriculumContext } from './exerciseEligibility';");
replaceOnce('src/services/spacedRepetition.ts',"  daySeed=new Date().toISOString().slice(0,10),\n  mastery:Record<string,ConceptMastery>={}\n):DailyWorkoutItem[]{\n  const unlocked=exercises.filter(exercise=>completedLessonIds.length===0?exercise.difficulty==='Начальный':completedLessonIds.includes(exercise.lessonId));\n  const pool=unlocked.length>=5?unlocked:exercises.filter(exercise=>['Начальный','Базовый'].includes(exercise.difficulty));","  daySeed=new Date().toISOString().slice(0,10),\n  mastery:Record<string,ConceptMastery>={},\n  context:WorkoutCurriculumContext={}\n):DailyWorkoutItem[]{\n  const eligible=filterEligibleExercises(exercises,conceptScores,completedLessonIds,mastery,context);\n  const unlocked=eligible.filter(exercise=>completedLessonIds.length===0?exercise.difficulty==='Начальный':completedLessonIds.includes(exercise.lessonId));\n  const dependencyAware=Boolean(context.graph&&context.lessons);\n  const pool=unlocked.length>=5?unlocked:dependencyAware?eligible:exercises.filter(exercise=>['Начальный','Базовый'].includes(exercise.difficulty));");
replaceOnce('src/services/spacedRepetition.ts',"  daySeed=new Date().toISOString().slice(0,10),\n  mastery:Record<string,ConceptMastery>={}\n){\n  return buildDailyWorkout(exercises,conceptScores,completedLessonIds,daySeed,mastery).map(item=>item.exercise);","  daySeed=new Date().toISOString().slice(0,10),\n  mastery:Record<string,ConceptMastery>={},\n  context:WorkoutCurriculumContext={}\n){\n  return buildDailyWorkout(exercises,conceptScores,completedLessonIds,daySeed,mastery,context).map(item=>item.exercise);");

replaceOnce('src/pages/HomePage.tsx','const workout=buildDailyWorkout(exercises,conceptScores,completed,undefined,mastery);','const workout=buildDailyWorkout(exercises,conceptScores,completed,undefined,mastery,{graph:curriculum.graph,lessons});');
replaceOnce('src/pages/HomePage.tsx','Пять задач собраны из повторения, новых или слабых концептов и задач на диагностику.','До пяти задач собраны из повторения, новых или слабых концептов и задач на диагностику.');

const packagePath='package.json';
const packageJson=JSON.parse(read(packagePath));
const check=packageJson.scripts['curriculum:check'];
if(!check.includes('src/services/dependencyValidation.test.ts'))packageJson.scripts['curriculum:check']=check.replace('src/services/curriculumLinter.rules.test.ts','src/services/curriculumLinter.rules.test.ts src/services/dependencyValidation.test.ts src/services/spacedRepetition.prerequisites.test.ts');
write(packagePath,JSON.stringify(packageJson,null,2)+'\n');

const curriculumPath='src/data/curriculumSource.json';
const curriculum=JSON.parse(read(curriculumPath));
const label=curriculum.concepts.find(concept=>concept.id==='label');
const floatConcept=curriculum.concepts.find(concept=>concept.id==='float');
if(!label||JSON.stringify(label.prerequisites)!==JSON.stringify(['section','equation']))throw new Error('Unexpected label prerequisites: '+JSON.stringify(label?.prerequisites));
if(!floatConcept||JSON.stringify(floatConcept.prerequisites)!==JSON.stringify(['figure','tabular']))throw new Error('Unexpected float prerequisites: '+JSON.stringify(floatConcept?.prerequisites));
label.prerequisites=['section'];
floatConcept.prerequisites=['figure'];
write(curriculumPath,JSON.stringify(curriculum));

console.log('Graph upgrade applied successfully.');
