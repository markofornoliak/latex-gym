import { describe, expect, it } from 'vitest';
import { curriculum } from '../data/curriculumRuntime';
import { lintCurriculum } from './curriculumLinter';

const {modules,lessons,exercises,projects,references,concepts,graph}=curriculum;
const foundationOrder=['what-is-latex','compilation-model','tex-source','commands-foundation','arguments-foundation','environments-foundation','document-structure-foundation','preamble-body-foundation','packages-foundation','errors-foundation','first-document-foundation'];
const debuggingIds=['debug-undefined-control','debug-missing-brace','debug-alignment-tab','debug-missing-math','debug-undefined-environment','debug-file-not-found'];

describe('curriculum quality gate',()=>{
  it('meets the substantial content floor without filler modules',()=>{
    expect(modules.length).toBeGreaterThanOrEqual(15);
    expect(lessons.length).toBeGreaterThanOrEqual(60);
    expect(exercises.length).toBeGreaterThanOrEqual(150);
    expect(projects).toHaveLength(5);
    expect(references.length).toBeGreaterThanOrEqual(45);
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

  it('contains no structural curriculum integrity errors',()=>{
    const issues=lintCurriculum(lessons,exercises,references,{modules,concepts,projects});
    const errors=issues.filter(issue=>issue.severity==='error');
    expect(errors,errors.map(issue=>`${issue.code}: ${issue.lessonId??issue.exerciseId??issue.projectId??issue.conceptId??''} ${issue.message}`).join('\n')).toEqual([]);
  });

  it('is deeply frozen after the construction phase',()=>{
    expect(Object.isFrozen(modules)).toBe(true);
    expect(Object.isFrozen(lessons)).toBe(true);
    expect(Object.isFrozen(exercises)).toBe(true);
    expect(Object.isFrozen(references)).toBe(true);
    expect(Object.isFrozen(projects)).toBe(true);
    expect(Object.isFrozen(lessons[0])).toBe(true);
    expect(Object.isFrozen(lessons[0].exercises)).toBe(true);
  });
});

describe('curriculum semantic integrity rules',()=>{
  it('detects project prerequisites and lesson project-stage references that do not resolve',()=>{
    const brokenProjects=projects.map((project,index)=>index===0?{...project,prerequisites:[...project.prerequisites,'missing-concept']}:project);
    const brokenLessons=lessons.map((lesson,index)=>index===0?{...lesson,projectStage:'academic-paper:missing-stage'}:lesson);
    const issues=lintCurriculum(brokenLessons,exercises,references,{modules,concepts,projects:brokenProjects});
    expect(issues.some(issue=>issue.code==='unknown-project-prerequisite'&&issue.conceptId==='missing-concept')).toBe(true);
    expect(issues.some(issue=>issue.code==='unknown-project-stage'&&issue.lessonId===brokenLessons[0].id)).toBe(true);
  });

  it('detects duplicate theory and example identities inside a lesson',()=>{
    const index=lessons.findIndex(lesson=>lesson.theory.length>0&&lesson.examples.length>0);
    expect(index).toBeGreaterThanOrEqual(0);
    const lesson=lessons[index];
    const broken={...lesson,theory:[...lesson.theory,{...lesson.theory[0]}],examples:[...lesson.examples,{...lesson.examples[0]}]};
    const brokenLessons=lessons.map((item,itemIndex)=>itemIndex===index?broken:item);
    const issues=lintCurriculum(brokenLessons,exercises,references,{modules,concepts,projects});
    expect(issues.some(issue=>issue.code==='duplicate-theory-block-id'&&issue.lessonId===lesson.id)).toBe(true);
    expect(issues.some(issue=>issue.code==='duplicate-example-id'&&issue.lessonId===lesson.id)).toBe(true);
  });
});

describe('concept dependency graph',()=>{
  it('contains every concept exactly once and has a complete topological order',()=>{
    expect(graph.conceptIds).toHaveLength(concepts.length);
    expect(new Set(graph.conceptIds).size).toBe(concepts.length);
    expect(graph.topologicalOrder).toHaveLength(concepts.length);
    expect(new Set(graph.topologicalOrder).size).toBe(concepts.length);
  });

  it('orders prerequisites before their dependents',()=>{
    const position=new Map(graph.topologicalOrder.map((id,index)=>[id,index]));
    for(const node of Object.values(graph.nodes)){
      for(const prerequisite of node.requires){
        expect(position.get(prerequisite),`${prerequisite} before ${node.id}`).toBeLessThan(position.get(node.id)!);
      }
    }
  });

  it('connects concepts to learning, practice, reference and projects without duplicating databases',()=>{
    const label=graph.nodes.label;
    expect(label).toBeDefined();
    expect(label.introducedBy.length+label.reinforcedBy.length).toBeGreaterThan(0);
    expect(label.practicedBy.length).toBeGreaterThan(0);
    expect(label.referenceIds).toContain('label');
    expect(label.projectIds.length).toBeGreaterThan(0);
  });
});
