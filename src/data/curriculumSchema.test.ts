import { describe, expect, it } from 'vitest';
import { curriculumSource } from './curriculumSource';
import { assertCanonicalCurriculumSchema } from './curriculumSchema';

function clone(){return structuredClone(curriculumSource) as unknown as Record<string,unknown>;}
function firstExercise(source:Record<string,unknown>){
  const modules=source.modules as Array<Record<string,unknown>>;
  const lessons=modules[0].lessons as Array<Record<string,unknown>>;
  return (lessons[0].exercises as Array<Record<string,unknown>>)[0];
}

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
    const validators=firstExercise(source).validators as Array<Record<string,unknown>>;
    validators[0].message=42;
    expect(()=>assertCanonicalCurriculumSchema(source)).toThrow(/curriculum\.modules\[0\]\.lessons\[0\]\.exercises\[0\]\.validators\[0\]\.message/);
  });

  it('rejects unknown validator discriminants with an exact path',()=>{
    const source=clone();
    const validators=firstExercise(source).validators as Array<Record<string,unknown>>;
    validators[0].type='unknown-rule';
    expect(()=>assertCanonicalCurriculumSchema(source)).toThrow(/validators\[0\]\.type/);
  });

  it('rejects an invalid execution override before it can change runtime behavior',()=>{
    const source=clone();
    firstExercise(source).execution='documemt';
    expect(()=>assertCanonicalCurriculumSchema(source)).toThrow(/exercises\[0\]\.execution/);
  });

  it('rejects an invalid regex evidence scope',()=>{
    const source=clone();
    const exercise=firstExercise(source);
    exercise.validators=[{type:'regex',value:'section',scope:'comments-too',message:'x',hint:'x'}];
    expect(()=>assertCanonicalCurriculumSchema(source)).toThrow(/validators\[0\]\.scope/);
  });
});