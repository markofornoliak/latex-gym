import { materializeCurriculumSource } from './curriculumSource';

const definitions=materializeCurriculumSource().concepts;

/** Compatibility adapter. Educational concept definitions are materialized from curriculumSource.json. */
export const concepts=definitions;
export const conceptById=new Map(definitions.map(definition=>[definition.id,definition]));
export const hasConcept=(id:string)=>conceptById.has(id);

export function conceptAncestors(id:string,seen=new Set<string>()):string[]{
  if(seen.has(id))return [];
  const definition=conceptById.get(id);
  if(!definition)return [];
  const next=new Set(seen);next.add(id);
  return definition.prerequisites.flatMap(prerequisite=>[prerequisite,...conceptAncestors(prerequisite,next)]);
}
