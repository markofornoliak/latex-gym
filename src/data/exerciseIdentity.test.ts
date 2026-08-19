import { describe, expect, it } from 'vitest';
import { canonicalExerciseId, migrateExerciseIdList, migrateExerciseKeyedRecord, registeredSeedExerciseIdentities } from './exerciseIdentity';

describe('stable exercise identities',()=>{
  it('maps every legacy seed id to a semantic id',()=>{for(const [legacyId,,,stableId] of registeredSeedExerciseIdentities()){expect(canonicalExerciseId(legacyId)).toBe(stableId);expect(stableId).toContain(':');}});
  it('migrates lists and keyed counters without losing duplicate evidence',()=>{expect(migrateExerciseIdList(['e01','document-structure:minimal-document'])).toEqual(['document-structure:minimal-document']);expect(migrateExerciseKeyedRecord({'e01':2,'document-structure:minimal-document':3},(a,b)=>(a??0)+b)).toEqual({'document-structure:minimal-document':5});});
});
