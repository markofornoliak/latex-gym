import { describe, expect, it } from 'vitest';
import { documentRepositoryInternals } from './documentRepository';

describe('document persistence recovery primitives',()=>{
  it('accepts only structurally valid IndexedDB document records',()=>{
    expect(documentRepositoryInternals.isDocumentRecord({key:'exercise:x',content:'ok',updatedAt:'2026-08-21T10:00:00.000Z'})).toBe(true);
    expect(documentRepositoryInternals.isDocumentRecord({key:7,content:'ok',updatedAt:'2026-08-21T10:00:00.000Z'})).toBe(false);
    expect(documentRepositoryInternals.isDocumentRecord({key:'x',content:7,updatedAt:'2026-08-21T10:00:00.000Z'})).toBe(false);
    expect(documentRepositoryInternals.isDocumentRecord({key:'x',content:'ok',updatedAt:'not-a-date'})).toBe(false);
  });

  it('reads the versioned fallback envelope and preserves legacy raw drafts',()=>{
    const versioned=JSON.stringify({version:2,content:'new',updatedAt:'2026-08-21T10:00:00.000Z'});
    expect(documentRepositoryInternals.parseFallbackValue(versioned)?.content).toBe('new');
    const legacy=documentRepositoryInternals.parseFallbackValue('legacy TeX source');
    expect(legacy?.content).toBe('legacy TeX source');
    expect(legacy?.updatedAt).toBe('1970-01-01T00:00:00.000Z');
  });

  it('selects newer durable evidence deterministically',()=>{
    expect(documentRepositoryInternals.isLater('2026-08-21T12:00:00.000Z','2026-08-21T11:00:00.000Z')).toBe(true);
    expect(documentRepositoryInternals.isLater('2026-08-21T10:00:00.000Z','2026-08-21T11:00:00.000Z')).toBe(false);
    expect(documentRepositoryInternals.isLater('bad','2026-08-21T11:00:00.000Z')).toBe(false);
  });
});