import { conceptById } from './concepts';
import { exercises, lessons } from './courses';
import { canonicalConceptId, canonicalConceptIds } from './conceptAliases';
import type { ConceptDefinition, Exercise, LearningBlock, Lesson } from '../types';

export type CurriculumNormalizationChange={
  kind:'exercise-concept'|'exercise-prerequisite'|'lesson-prerequisite'|'lesson-introduces'|'lesson-reinforces';
  sourceId:string;
  from:string;
  to:string;
};

export type CurriculumNormalizationReport={
  changes:readonly CurriculumNormalizationChange[];
  unresolved:readonly {sourceId:string;conceptId:string;kind:CurriculumNormalizationChange['kind']}[];
};

export function normalizeCurriculumConcepts(targetLessons:Lesson[]=lessons,targetExercises:Exercise[]=exercises,concepts:readonly ConceptDefinition[]=[...conceptById.values()]):CurriculumNormalizationReport{
  const known=new Set(concepts.map(concept=>concept.id));
  const changes:CurriculumNormalizationChange[]=[];
  const unresolved:CurriculumNormalizationReport['unresolved'][number][]=[];
  const seenExercises=new Set<Exercise>();

  const normalizeList=(ids:readonly string[],sourceId:string,kind:CurriculumNormalizationChange['kind'])=>{
    const result:string[]=[];
    for(const raw of ids){
      const original=normalizeToken(raw);
      const canonical=canonicalConceptId(original);
      if(canonical!==original)changes.push({kind,sourceId,from:original,to:canonical});
      if(!known.has(canonical))unresolved.push({kind,sourceId,conceptId:canonical});
      if(!result.includes(canonical))result.push(canonical);
    }
    return result;
  };

  for(const lesson of targetLessons){
    if(!lesson.content&&lesson.theory.length){
      lesson.content=lesson.theory.map((item,index):LearningBlock=>{
        if(item.code)return {id:`${lesson.id}-structured-${index+1}`,type:'syntax',title:item.title,body:item.body,code:item.code,note:item.note};
        return {id:`${lesson.id}-structured-${index+1}`,type:index===0?'concept':'explanation',title:item.title,body:item.body,details:item.note};
      });
    }

    for(const exercise of lesson.exercises)seenExercises.add(exercise);
    const pedagogy=lesson.pedagogy;
    if(!pedagogy)continue;
    pedagogy.prerequisites=normalizeList(pedagogy.prerequisites,lesson.id,'lesson-prerequisite');
    pedagogy.introduces=normalizeList(pedagogy.introduces,lesson.id,'lesson-introduces');
    pedagogy.reinforces=normalizeList(pedagogy.reinforces,lesson.id,'lesson-reinforces');
  }
  for(const exercise of targetExercises)seenExercises.add(exercise);

  for(const exercise of seenExercises){
    exercise.concepts=normalizeList(exercise.concepts,exercise.id,'exercise-concept');
    if(exercise.prerequisites)exercise.prerequisites=normalizeList(exercise.prerequisites,exercise.id,'exercise-prerequisite');
  }

  // Preserve the previous useful enrichment behavior: an exercise can reinforce a
  // canonical concept even if old lesson metadata omitted that reinforcement.
  for(const lesson of targetLessons){
    if(!lesson.pedagogy)continue;
    const exerciseConcepts=canonicalConceptIds(lesson.exercises.flatMap(exercise=>exercise.concepts));
    lesson.pedagogy.reinforces=[...new Set([...lesson.pedagogy.reinforces,...exerciseConcepts.filter(id=>!lesson.pedagogy!.introduces.includes(id))])];
  }

  return Object.freeze({changes:Object.freeze(changes),unresolved:Object.freeze(unresolved)});
}

export function normalizeConceptRecord<T>(record:Record<string,T>,merge:(existing:T|undefined,incoming:T,canonicalId:string,legacyId:string)=>T){
  const normalized:Record<string,T>={};
  for(const [legacyId,value] of Object.entries(record)){
    const canonicalId=canonicalConceptId(normalizeToken(legacyId));
    normalized[canonicalId]=merge(normalized[canonicalId],value,canonicalId,legacyId);
  }
  return normalized;
}

export function normalizeConceptIdList(ids:readonly string[]){return canonicalConceptIds(ids.map(normalizeToken));}

function normalizeToken(value:string){return value.trim().toLocaleLowerCase('en').replace(/_/g,'-');}
