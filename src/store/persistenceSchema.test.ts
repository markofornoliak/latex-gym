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
    expect(parsed.ok).toBe(false);
    if(parsed.ok)return;
    expect(parsed.message).toContain('слишком большой');
  });

  it('rejects dangerous record keys before they can enter plain-object state',()=>{
    const parsed=parseProgressImport('{"schemaVersion":6,"progress":{"attempts":{"__proto__":1}}}');
    expect(parsed.ok).toBe(false);
    if(parsed.ok)return;
    expect(parsed.message).toContain('недопустимый ключ');
  });

  it('rejects pathological collection sizes with an explicit import error',()=>{
    const completedLessons=Array.from({length:IMPORT_LIMITS.maxArrayItems+1},(_,index)=>`lesson-${index}`);
    const parsed=parseProgressImport(JSON.stringify({schemaVersion:PERSISTENCE_SCHEMA_VERSION,progress:{completedLessons}}));
    expect(parsed.ok).toBe(false);
    if(parsed.ok)return;
    expect(parsed.message).toContain('слишком большой список');
  });
});
