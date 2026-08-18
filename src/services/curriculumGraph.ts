import type { ConceptDefinition, Exercise, LearningProject, Lesson, ReferenceEntry } from '../types';

export type CurriculumGraphIssue={
  code:'duplicate-concept-id'|'unknown-prerequisite'|'unknown-lesson-concept'|'unknown-exercise-concept'|'unknown-reference'|'unknown-project-concept'|'concept-cycle';
  message:string;
  conceptId?:string;
  sourceId?:string;
};

export type CurriculumConceptNode={
  id:string;
  title:string;
  description:string;
  requires:readonly string[];
  requiredBy:readonly string[];
  introducedBy:readonly string[];
  reinforcedBy:readonly string[];
  practicedBy:readonly string[];
  referenceIds:readonly string[];
  projectIds:readonly string[];
};

export type CurriculumGraph={
  nodes:Readonly<Record<string,CurriculumConceptNode>>;
  conceptIds:readonly string[];
  topologicalOrder:readonly string[];
};

type GraphInput={
  concepts:readonly ConceptDefinition[];
  lessons:readonly Lesson[];
  exercises:readonly Exercise[];
  references:readonly ReferenceEntry[];
  projects:readonly LearningProject[];
};

type MutableNode={
  definition:ConceptDefinition;
  requires:Set<string>;
  requiredBy:Set<string>;
  introducedBy:Set<string>;
  reinforcedBy:Set<string>;
  practicedBy:Set<string>;
  referenceIds:Set<string>;
  projectIds:Set<string>;
};

export function buildCurriculumGraph(input:GraphInput):{graph:CurriculumGraph;issues:CurriculumGraphIssue[]}{
  const issues:CurriculumGraphIssue[]=[];
  const definitions=new Map<string,ConceptDefinition>();
  for(const concept of input.concepts){
    if(definitions.has(concept.id))issues.push({code:'duplicate-concept-id',conceptId:concept.id,sourceId:concept.id,message:`Duplicate concept ID: ${concept.id}`});
    else definitions.set(concept.id,concept);
  }

  const nodes=new Map<string,MutableNode>();
  for(const concept of definitions.values())nodes.set(concept.id,{
    definition:concept,
    requires:new Set(),requiredBy:new Set(),introducedBy:new Set(),reinforcedBy:new Set(),practicedBy:new Set(),referenceIds:new Set(),projectIds:new Set()
  });

  for(const concept of definitions.values()){
    const node=nodes.get(concept.id)!;
    for(const prerequisite of concept.prerequisites){
      if(!nodes.has(prerequisite)){
        issues.push({code:'unknown-prerequisite',conceptId:concept.id,sourceId:prerequisite,message:`Concept ${concept.id} requires unknown concept ${prerequisite}.`});
        continue;
      }
      node.requires.add(prerequisite);
      nodes.get(prerequisite)!.requiredBy.add(concept.id);
    }
  }

  for(const lesson of input.lessons){
    const pedagogy=lesson.pedagogy;
    if(!pedagogy)continue;
    for(const conceptId of pedagogy.prerequisites){
      if(!nodes.has(conceptId))issues.push({code:'unknown-lesson-concept',conceptId,sourceId:lesson.id,message:`Lesson ${lesson.id} requires unknown concept ${conceptId}.`});
    }
    for(const conceptId of pedagogy.introduces){
      const node=nodes.get(conceptId);
      if(node)node.introducedBy.add(lesson.id);
      else issues.push({code:'unknown-lesson-concept',conceptId,sourceId:lesson.id,message:`Lesson ${lesson.id} introduces unknown concept ${conceptId}.`});
    }
    for(const conceptId of pedagogy.reinforces){
      const node=nodes.get(conceptId);
      if(node)node.reinforcedBy.add(lesson.id);
      else issues.push({code:'unknown-lesson-concept',conceptId,sourceId:lesson.id,message:`Lesson ${lesson.id} reinforces unknown concept ${conceptId}.`});
    }
  }

  for(const exercise of input.exercises){
    for(const conceptId of exercise.concepts){
      const node=nodes.get(conceptId);
      if(node)node.practicedBy.add(exercise.id);
      else issues.push({code:'unknown-exercise-concept',conceptId,sourceId:exercise.id,message:`Exercise ${exercise.id} references unknown concept ${conceptId}.`});
    }
  }

  const referenceIds=new Set(input.references.map(entry=>entry.id));
  for(const concept of definitions.values()){
    const node=nodes.get(concept.id)!;
    for(const referenceId of concept.referenceIds??[]){
      if(referenceIds.has(referenceId))node.referenceIds.add(referenceId);
      else issues.push({code:'unknown-reference',conceptId:concept.id,sourceId:referenceId,message:`Concept ${concept.id} points to unknown reference ${referenceId}.`});
    }
  }

  // Reference entries may not yet be explicitly listed on every concept. Link obvious
  // canonical command IDs without inventing fuzzy semantic relationships.
  for(const entry of input.references){
    const direct=nodes.get(entry.id)??nodes.get(entry.command.replace(/^\\/,''));
    if(direct)direct.referenceIds.add(entry.id);
  }

  for(const project of input.projects){
    for(const conceptId of project.concepts){
      const node=nodes.get(conceptId);
      if(node)node.projectIds.add(project.id);
      else issues.push({code:'unknown-project-concept',conceptId,sourceId:project.id,message:`Project ${project.id} references unknown concept ${conceptId}.`});
    }
  }

  const topologicalOrder=topologicalSort(nodes,issues);
  const frozenNodes:Record<string,CurriculumConceptNode>={};
  for(const [id,node] of nodes){
    frozenNodes[id]=Object.freeze({
      id,
      title:node.definition.title,
      description:node.definition.description,
      requires:Object.freeze([...node.requires]),
      requiredBy:Object.freeze([...node.requiredBy]),
      introducedBy:Object.freeze([...node.introducedBy]),
      reinforcedBy:Object.freeze([...node.reinforcedBy]),
      practicedBy:Object.freeze([...node.practicedBy]),
      referenceIds:Object.freeze([...node.referenceIds]),
      projectIds:Object.freeze([...node.projectIds])
    });
  }

  return {
    graph:Object.freeze({nodes:Object.freeze(frozenNodes),conceptIds:Object.freeze([...nodes.keys()]),topologicalOrder:Object.freeze(topologicalOrder)}),
    issues
  };
}

function topologicalSort(nodes:Map<string,MutableNode>,issues:CurriculumGraphIssue[]){
  const state=new Map<string,0|1|2>();
  const order:string[]=[];
  const stack:string[]=[];
  const reported=new Set<string>();

  const visit=(id:string)=>{
    const current=state.get(id)??0;
    if(current===2)return;
    if(current===1){
      const start=stack.lastIndexOf(id);
      const cycle=[...stack.slice(Math.max(0,start)),id];
      const key=cycle.join('>');
      if(!reported.has(key)){
        reported.add(key);
        issues.push({code:'concept-cycle',conceptId:id,sourceId:cycle.join(' → '),message:`Concept dependency cycle: ${cycle.join(' → ')}`});
      }
      return;
    }
    state.set(id,1);stack.push(id);
    for(const prerequisite of nodes.get(id)?.requires??[])visit(prerequisite);
    stack.pop();state.set(id,2);order.push(id);
  };

  for(const id of nodes.keys())visit(id);
  return order;
}
