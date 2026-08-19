import { describe, expect, it } from 'vitest';
import baselineJson from './curriculumBaseline.json';
import { assertCanonicalCurriculumSource, materializeCurriculumSource } from './curriculumSource';
import { registeredSeedExerciseIdentities } from './exerciseIdentity';

const baseline=baselineJson as {
  semanticFingerprint:string;
  moduleIds:string[];
  lessonIds:string[];
  exerciseIds:string[];
  conceptIds:string[];
  referenceIds:string[];
  projectIds:string[];
  projectStageIds:Record<string,string[]>;
};

function fingerprint(value:unknown){
  const payload=JSON.stringify(value);
  let hash=0x811c9dc5;
  for(let index=0;index<payload.length;index+=1){hash^=payload.charCodeAt(index);hash=Math.imul(hash,0x01000193)>>>0;}
  return hash.toString(16).padStart(8,'0');
}

describe('canonical curriculum source',()=>{
  it('derives flat lesson and exercise catalogs from the authored hierarchy without duplicating identity',()=>{
    const source=materializeCurriculumSource();
    expect(source.modules.flatMap(module=>module.lessons)).toEqual(source.lessons);
    expect(source.lessons.flatMap(lesson=>lesson.exercises)).toEqual(source.exercises);
    for(const lesson of source.lessons){
      expect(source.modules.find(module=>module.id===lesson.moduleId)?.lessons).toContain(lesson);
      for(const exercise of lesson.exercises)expect(source.exercises.find(item=>item.id===exercise.id)).toBe(exercise);
    }
  });

  it('preserves every compatibility-sensitive identity from the pre-migration curriculum',()=>{
    const source=materializeCurriculumSource();
    expect(source.modules.map(item=>item.id)).toEqual(baseline.moduleIds);
    expect(source.lessons.map(item=>item.id)).toEqual(baseline.lessonIds);
    expect(source.exercises.map(item=>item.id)).toEqual(baseline.exerciseIds);
    expect(source.concepts.map(item=>item.id)).toEqual(baseline.conceptIds);
    expect(source.references.map(item=>item.id)).toEqual(baseline.referenceIds);
    expect(source.projects.map(item=>item.id)).toEqual(baseline.projectIds);
    expect(Object.fromEntries(source.projects.map(project=>[project.id,project.stages.map(stage=>stage.id)]))).toEqual(baseline.projectStageIds);
  });

  it('preserves the complete pre-migration semantic payload',()=>{
    const source=materializeCurriculumSource();
    const semantic={modules:source.modules,lessons:source.lessons,exercises:source.exercises,references:source.references,concepts:source.concepts,projects:source.projects};
    expect(fingerprint(semantic)).toBe(baseline.semanticFingerprint);
  });

  it('contains only canonical concept IDs and keeps all legacy exercise aliases resolvable',()=>{
    const source=materializeCurriculumSource();
    expect(()=>assertCanonicalCurriculumSource(source)).not.toThrow();
    const exerciseIds=new Set(source.exercises.map(exercise=>exercise.id));
    for(const [,,,stableId] of registeredSeedExerciseIdentities())expect(exerciseIds.has(stableId)).toBe(true);
    expect(source.exercises.some(exercise=>/^e\d+$/.test(exercise.id))).toBe(false);
  });
});
