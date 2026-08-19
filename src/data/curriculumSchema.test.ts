import { describe, expect, it } from 'vitest';
import { curriculumSource } from './curriculumSource';
import { assertCanonicalCurriculumSchema } from './curriculumSchema';

function clone(){return structuredClone(curriculumSource) as unknown as Record<string,unknown>;}

describe('canonical curriculum runtime schema',()=>{
  it('accepts the canonical curriculum source',()=>{
    expect(()=>assertCanonicalCurriculumSchema(curriculumSource)).not.toThrow();
  });

  it('reports a path when a module field has the wrong type',()=>{
    const source=clone();
    const modules=source.modules as Array<Record<string,unknown>>;
    modules[0].number='1';
    expect(()=>assertCanonicalCurriculumSchema(source)).toThrow(/curriculum\.modules\[0\]\.number/);
  });

  it('reports nested malformed validator fields before construction',()=>{
    const source=clone();
    const modules=source.modules as Array<Record<string,unknown>>;
    const lessons=modules[0].lessons as Array<Record<string,unknown>>;
    const exercises=lessons[0].exercises as Array<Record<string,unknown>>;
    const validators=exercises[0].validators as Array<Record<string,unknown>>;
    validators[0].message=42;
    expect(()=>assertCanonicalCurriculumSchema(source)).toThrow(/curriculum\.modules\[0\]\.lessons\[0\]\.exercises\[0\]\.validators\[0\]\.message/);
  });

  it('rejects unknown validator discriminants with an exact path',()=>{
    const source=clone();
    const modules=source.modules as Array<Record<string,unknown>>;
    const lessons=modules[0].lessons as Array<Record<string,unknown>>;
    const exercises=lessons[0].exercises as Array<Record<string,unknown>>;
    const validators=exercises[0].validators as Array<Record<string,unknown>>;
    validators[0].type='unknown-rule';
    expect(()=>assertCanonicalCurriculumSchema(source)).toThrow(/validators\[0\]\.type/);
  });
});
