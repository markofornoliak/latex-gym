import type { ConceptDefinition, Exercise, LearningProject, Lesson } from '../types';

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
