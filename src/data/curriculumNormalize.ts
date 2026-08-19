import { canonicalConceptId, canonicalConceptIds } from './conceptAliases';

/**
 * Canonical curriculum authoring no longer needs a construction-time normalization
 * pass. These helpers remain for persisted/imported legacy concept data.
 */
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
