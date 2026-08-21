import { describe, expect, it } from 'vitest';
import { IMPORT_LIMITS, parseProgressImport, PERSISTENCE_SCHEMA_VERSION } from './persistenceSchema';

describe('persistence schema',()=>{
  it('rejects malformed and future exports',()=>{
    expect(parseProgressImport('{')).toMatchObject({ok:false});
    expect(parseProgressImport(JSON.stringify({schemaVersion:PERSISTENCE_SCHEMA_VERSION+1}))).toMatchObject({ok:false});
  });

  it('sanitizes counters and migrates legacy exercise/document ids',()=>{
    const parsed=parseProgressImport(JSON.stringify({schemaVersion:4,progress:{completedExercises:['e01'],attempts:{e01:2,bad:'x'},drafts:{'exercise:e01':'source'}},settings:{textSize:'huge',wordWrap:true}}));
    expect(parsed.ok).toBe(true);if(!parsed.ok)return;
    expect(parsed.value.completedExercises).toEqual(['document-structure:minimal-document']);
    expect(parsed.value.attempts).toEqual({'document-structure:minimal-document':2});
    expect(parsed.value.documents['exercise:document-structure:minimal-document']).toBe('source');
    expect(parsed.value.settings).toEqual({wordWrap:true});
  });

  it('rejects oversized document payloads instead of partially importing them',()=>{
    const huge='x'.repeat(IMPORT_LIMITS.maxDocumentChars+1);
    const parsed=parseProgressImport(JSON.stringify({schemaVersion:PERSISTENCE_SCHEMA_VERSION,documents:{'playground:main':huge}}));
    expect(parsed.ok).toBe(false);if(parsed.ok)return;
    expect(parsed.message).toContain('слишком большой');
  });

  it('rejects dangerous record keys before they can enter plain-object state',()=>{
    const parsed=parseProgressImport(`{"schemaVersion":${PERSISTENCE_SCHEMA_VERSION},"progress":{"attempts":{"__proto__":1}}}`);
    expect(parsed.ok).toBe(false);if(parsed.ok)return;
    expect(parsed.message).toContain('недопустимый ключ');
  });

  it('rejects pathological collection sizes including nested placement evidence',()=>{
    const completedLessons=Array.from({length:IMPORT_LIMITS.maxArrayItems+1},(_,index)=>`lesson-${index}`);
    const parsed=parseProgressImport(JSON.stringify({schemaVersion:PERSISTENCE_SCHEMA_VERSION,progress:{completedLessons}}));
    expect(parsed.ok).toBe(false);if(parsed.ok)return;
    expect(parsed.message).toContain('слишком большой список');

    const placementEvidence=Object.fromEntries(Array.from({length:IMPORT_LIMITS.maxRecordEntries+1},(_,index)=>[`concept-${index}`,true]));
    const nested=parseProgressImport(JSON.stringify({schemaVersion:PERSISTENCE_SCHEMA_VERSION,progress:{onboarding:{placementEvidence}}}));
    expect(nested.ok).toBe(false);if(nested.ok)return;
    expect(nested.message).toContain('слишком много записей');
  });

  it('bounds huge finite counters and mastery values before alias merges can overflow',()=>{
    const parsed=parseProgressImport(JSON.stringify({schemaVersion:PERSISTENCE_SCHEMA_VERSION,progress:{attempts:{e01:1e308},conceptScores:{frac:1e308,fraction:1e308},conceptMastery:{frac:{score:1e308,attempts:1e308,stability:1e308}}}}));
    expect(parsed.ok).toBe(true);if(!parsed.ok)return;
    expect(parsed.value.attempts?.['document-structure:minimal-document']).toBe(IMPORT_LIMITS.maxCounter);
    expect(parsed.value.conceptScores?.frac).toBe(IMPORT_LIMITS.maxConceptScore);
    expect(parsed.value.conceptMastery?.frac?.score).toBe(1);
    expect(parsed.value.conceptMastery?.frac?.stability).toBe(IMPORT_LIMITS.maxStability);
    expect(parsed.value.conceptMastery?.frac?.attempts).toBe(IMPORT_LIMITS.maxCounter);
  });

  it('rejects malformed persisted project asset envelopes before storage mutation',()=>{
    const parsed=parseProgressImport(JSON.stringify({schemaVersion:PERSISTENCE_SCHEMA_VERSION,documents:{'project:academic-paper:file:figure.png':'__LATEX_GYM_BINARY_V1__:%%%'}}));
    expect(parsed.ok).toBe(false);if(parsed.ok)return;
    expect(parsed.message).toContain('Бинарный файл');
  });
});