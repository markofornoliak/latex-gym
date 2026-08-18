import { describe, expect, it } from 'vitest';
import { legacyConceptAliases, canonicalConceptId } from './conceptAliases';
import { concepts } from './concepts';

describe('legacy concept aliases',()=>{
  const canonical=new Set(concepts.map(concept=>concept.id));

  it('maps every historical alias to an existing canonical concept',()=>{
    const invalid=Object.entries(legacyConceptAliases).filter(([,target])=>!canonical.has(target));
    expect(invalid).toEqual([]);
  });

  it('keeps important professional domains semantically distinct',()=>{
    expect(canonical.has('bibtex')).toBe(true);
    expect(canonical.has('biblatex')).toBe(true);
    expect(canonical.has('biber')).toBe(true);
    expect(canonicalConceptId('printbibliography')).toBe('biblatex');
    expect(canonicalConceptId('biblatex')).toBe('biblatex');
    expect(canonicalConceptId('build')).toBe('latexmk');
  });

  it('normalizes syntax-flavored historical tags without multiplying concepts',()=>{
    expect(canonicalConceptId('frac')).toBe('fraction');
    expect(canonicalConceptId('textbf')).toBe('emphasis');
    expect(canonicalConceptId('includegraphics')).toBe('figure');
    expect(canonicalConceptId('input')).toBe('multi-file');
    expect(canonicalConceptId('FloatBarrier'.toLowerCase())).toBe('float-placement');
  });
});
