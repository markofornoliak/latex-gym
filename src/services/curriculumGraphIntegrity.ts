import type { ConceptDefinition, Exercise } from '../types';
import type { CurriculumGraph } from './curriculumGraph';

export type CurriculumGraphIntegrityIssue={
  severity:'error'|'warning';
  code:'unknown-evidence-concept'|'evidence-concept-not-used'|'empty-evidence-concepts'|'redundant-prerequisite-edge';
  message:string;
  conceptId?:string;
  exerciseId?:string;
};

export function inspectCurriculumGraphIntegrity(
  concepts:readonly ConceptDefinition[],
  exercises:readonly Exercise[],
  graph:CurriculumGraph
):CurriculumGraphIntegrityIssue[]{
  const issues:CurriculumGraphIntegrityIssue[]=[];
  const conceptIds=new Set(concepts.map(concept=>concept.id));

  for(const exercise of exercises){
    if(exercise.evidenceConcepts===undefined)continue;
    if(exercise.evidenceConcepts.length===0){
      issues.push({severity:'error',code:'empty-evidence-concepts',exerciseId:exercise.id,message:`Exercise ${exercise.id} declares an empty evidenceConcepts list.`});
      continue;
    }
    for(const conceptId of new Set(exercise.evidenceConcepts)){
      if(!conceptIds.has(conceptId)){
        issues.push({severity:'error',code:'unknown-evidence-concept',exerciseId:exercise.id,conceptId,message:`Exercise ${exercise.id} evidences unknown concept ${conceptId}.`});
      }else if(!exercise.concepts.includes(conceptId)){
        issues.push({severity:'error',code:'evidence-concept-not-used',exerciseId:exercise.id,conceptId,message:`Exercise ${exercise.id} cannot evidence ${conceptId} because it is not listed in exercise.concepts.`});
      }
    }
  }

  for(const concept of concepts){
    for(const prerequisite of concept.prerequisites){
      const alternatives=concept.prerequisites.filter(id=>id!==prerequisite);
      const via=alternatives.find(other=>requiresTransitively(graph,other,prerequisite));
      if(via){
        issues.push({
          severity:'warning',code:'redundant-prerequisite-edge',conceptId:concept.id,
          message:`Concept ${concept.id} lists ${prerequisite} directly even though it is already required transitively through ${via}.`
        });
      }
    }
  }
  return issues;
}

function requiresTransitively(graph:CurriculumGraph,from:string,target:string,seen=new Set<string>()):boolean{
  if(from===target)return true;
  if(seen.has(from))return false;
  seen.add(from);
  for(const prerequisite of graph.nodes[from]?.requires??[]){
    if(prerequisite===target||requiresTransitively(graph,prerequisite,target,seen))return true;
  }
  return false;
}
