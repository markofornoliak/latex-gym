import { describe, expect, it } from 'vitest';
import sourceJson from './curriculumSource.json';
import { CurriculumSchemaError, parseCurriculumSource } from './curriculumSchema';

const cloneSource=()=>structuredClone(sourceJson) as unknown as {
  modules:Array<{
    difficulty:unknown;
    lessons:Array<{
      content?:Array<Record<string,unknown>>;
      pedagogy?:Record<string,unknown>;
      exercises:Array<{validators:unknown}>;
    }>;
  }>;
};

describe('curriculum structural schema',()=>{
  it('accepts the complete canonical curriculum without mutating it',()=>{
    const before=JSON.stringify(sourceJson);
    expect(parseCurriculumSource(sourceJson)).toBe(sourceJson);
    expect(JSON.stringify(sourceJson)).toBe(before);
  });

  it('reports exact paths for invalid enums',()=>{
    const draft=cloneSource();
    draft.modules[0].difficulty='Intermediate';
    expect(()=>parseCurriculumSource(draft)).toThrow(/curriculum\.modules\[0\]\.difficulty/);
  });

  it('rejects malformed arrays before downstream code can call map on them',()=>{
    const draft=cloneSource();
    draft.modules[0].lessons[0].exercises[0].validators='command';
    expect(()=>parseCurriculumSource(draft)).toThrow(/validators: expected array/);
  });

  it('rejects unknown fields and misspelled discriminators',()=>{
    const unknownField=cloneSource();
    unknownField.modules[0].lessons[0].pedagogy!.introduce=[];
    expect(()=>parseCurriculumSource(unknownField)).toThrow(/pedagogy\.introduce: unknown field/);

    const badBlock=cloneSource();
    badBlock.modules[0].lessons[0].content![0].type='synatx';
    expect(()=>parseCurriculumSource(badBlock)).toThrow(/content\[0\]\.type/);
  });

  it('rejects invalid regular expressions at authoring time',()=>{
    const draft=cloneSource();
    const regexRule=draft.modules.flatMap(module=>module.lessons).flatMap(lesson=>lesson.exercises).flatMap(exercise=>Array.isArray(exercise.validators)?exercise.validators:[]).find(rule=>typeof rule==='object'&&rule!==null&&(rule as Record<string,unknown>).type==='regex') as Record<string,unknown>|undefined;
    expect(regexRule).toBeDefined();
    regexRule!.value='[';
    expect(()=>parseCurriculumSource(draft)).toThrow(CurriculumSchemaError);
    expect(()=>parseCurriculumSource(draft)).toThrow(/invalid regular expression/);
  });
});
