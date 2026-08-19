import { describe, expect, it } from 'vitest';
import { parseProgressImport, PERSISTENCE_SCHEMA_VERSION } from './persistenceSchema';

describe('persistence schema',()=>{
  it('rejects malformed and future exports',()=>{expect(parseProgressImport('{')).toMatchObject({ok:false});expect(parseProgressImport(JSON.stringify({schemaVersion:PERSISTENCE_SCHEMA_VERSION+1}))).toMatchObject({ok:false});});
  it('sanitizes counters and migrates legacy exercise/document ids',()=>{
    const parsed=parseProgressImport(JSON.stringify({schemaVersion:4,progress:{completedExercises:['e01'],attempts:{e01:2,bad:'x'},drafts:{'exercise:e01':'source'}},settings:{textSize:'huge',wordWrap:true}}));
    expect(parsed.ok).toBe(true);if(!parsed.ok)return;
    expect(parsed.value.completedExercises).toEqual(['document-structure:minimal-document']);
    expect(parsed.value.attempts).toEqual({'document-structure:minimal-document':2});
    expect(parsed.value.documents['exercise:document-structure:minimal-document']).toBe('source');
    expect(parsed.value.settings).toEqual({wordWrap:true});
  });
});
