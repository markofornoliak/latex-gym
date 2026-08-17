import { describe, expect, it } from 'vitest';
import '../data/curriculumBuild';
import { exercises, lessons, modules } from '../data/courses';
import { concepts, conceptById } from '../data/concepts';
import { projects } from '../data/projects';
import { referenceEntries } from '../data/reference';
import { lintCurriculum } from './curriculumLinter';

const foundationOrder=['what-is-latex','compilation-model','tex-source','commands-foundation','arguments-foundation','environments-foundation','document-structure-foundation','preamble-body-foundation','packages-foundation','errors-foundation','first-document-foundation'];
const debuggingIds=['debug-undefined-control','debug-missing-brace','debug-alignment-tab','debug-missing-math','debug-undefined-environment','debug-file-not-found'];

describe('curriculum quality gate',()=>{
  it('meets the substantial content floor without filler modules',()=>{
    expect(modules.length).toBeGreaterThanOrEqual(15);
    expect(lessons.length).toBeGreaterThanOrEqual(60);
    expect(exercises.length).toBeGreaterThanOrEqual(150);
    expect(projects).toHaveLength(5);
    expect(referenceEntries.length).toBeGreaterThanOrEqual(45);
  });

  it('keeps theory-before-syntax foundation in the intended order',()=>{
    expect(lessons.slice(0,foundationOrder.length).map(lesson=>lesson.id)).toEqual(foundationOrder);
    const firstWholeDocument=lessons.findIndex(lesson=>lesson.id==='first-document-foundation');
    expect(firstWholeDocument).toBe(foundationOrder.length-1);
    expect(lessons[firstWholeDocument].pedagogy?.prerequisites).toContain('package-model');
    expect(lessons[firstWholeDocument].pedagogy?.prerequisites).toContain('compile-error');
  });

  it('contains the dedicated realistic debugging progression',()=>{
    const ids=new Set(lessons.map(lesson=>lesson.id));
    for(const id of debuggingIds)expect(ids.has(id),id).toBe(true);
  });

  it('contains no curriculum integrity errors',()=>{
    const issues=lintCurriculum(lessons,exercises,referenceEntries,projects);
    const errors=issues.filter(issue=>issue.severity==='error');
    expect(errors,errors.map(issue=>`${issue.code}: ${issue.lessonId??issue.exerciseId??''} ${issue.message}`).join('\n')).toEqual([]);
  });

  it('freezes the final curriculum after all build stages',()=>{
    expect(Object.isFrozen(modules)).toBe(true);
    expect(Object.isFrozen(lessons)).toBe(true);
    expect(Object.isFrozen(exercises)).toBe(true);
    expect(Object.isFrozen(lessons[0])).toBe(true);
  });
});

describe('concept dependency graph',()=>{
  it('has only known prerequisites and no dependency cycles',()=>{
    for(const concept of concepts){
      for(const prerequisite of concept.prerequisites)expect(conceptById.has(prerequisite),`${concept.id} -> ${prerequisite}`).toBe(true);
      expect(hasCycle(concept.id,new Set(),new Set()),`cycle starting at ${concept.id}`).toBe(false);
    }
  });
});

function hasCycle(id:string,visiting:Set<string>,visited:Set<string>):boolean{
  if(visiting.has(id))return true;
  if(visited.has(id))return false;
  visiting.add(id);
  for(const parent of conceptById.get(id)?.prerequisites??[])if(hasCycle(parent,visiting,visited))return true;
  visiting.delete(id);visited.add(id);return false;
}
