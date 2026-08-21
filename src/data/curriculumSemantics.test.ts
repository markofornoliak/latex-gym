import { describe, expect, it } from 'vitest';
import { materializeCurriculumSource } from './curriculumSource';
import { conceptPrerequisiteOverrides, exerciseEvidenceOverrides } from './curriculumSemantics';

describe('curriculum knowledge semantics',()=>{
  const source=materializeCurriculumSource();
  const concept=(id:string)=>source.concepts.find(item=>item.id===id)!;
  const lesson=(id:string)=>source.lessons.find(item=>item.id===id)!;
  const exercise=(id:string)=>source.exercises.find(item=>item.id===id)!;

  it('keeps the approved hard-prerequisite corrections exact',()=>{
    for(const [id,expected] of Object.entries(conceptPrerequisiteOverrides)){
      expect(concept(id).prerequisites,`prerequisites for ${id}`).toEqual(expected);
    }
  });

  it('introduces debugging with the compilation model and reinforces it at expert level',()=>{
    expect(lesson('compilation-model').pedagogy?.introduces).toContain('debugging');
    expect(lesson('debugging').pedagogy?.introduces).not.toContain('debugging');
    expect(lesson('debugging').pedagogy?.reinforces).toContain('debugging');
  });

  it('narrows mastery evidence without discarding supporting concept tags',()=>{
    for(const [id,expected] of Object.entries(exerciseEvidenceOverrides)){
      expect(exercise(id).evidenceConcepts,`evidence concepts for ${id}`).toEqual(expected);
      for(const conceptId of expected)expect(exercise(id).concepts).toContain(conceptId);
    }
    expect(exercise('deep-014').concepts).toEqual(expect.arrayContaining(['required-argument','optional-argument','grouping','command']));
    expect(exercise('deep-014').evidenceConcepts).toEqual(['optional-argument']);
  });
});
