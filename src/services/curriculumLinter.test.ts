import { describe, expect, it } from 'vitest';
import { curriculum } from '../data/curriculumRuntime';
import { lintCurriculum } from './curriculumLinter';
import { CURRICULUM_WARNING_POLICY } from './curriculumWarningPolicy';

const {modules,lessons,exercises,projects,references,concepts,graph}=curriculum;
const foundationOrder=['what-is-latex','compilation-model','tex-source','commands-foundation','arguments-foundation','environments-foundation','document-structure-foundation','preamble-body-foundation','packages-foundation','errors-foundation','first-document-foundation'];
const debuggingIds=['debug-undefined-control','debug-missing-brace','debug-alignment-tab','debug-missing-math','debug-undefined-environment','debug-file-not-found'];
const expectedWarningCounts=Object.fromEntries(Object.entries(CURRICULUM_WARNING_POLICY).map(([code,entry])=>[code,entry.expectedCount]));

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

  it('keeps every known warning class reconciled to the reviewed debt policy',()=>{
    const issues=lintCurriculum(lessons,exercises,references,{modules,concepts,projects});
    const warnings=issues.filter(issue=>issue.severity==='warning');
    const warningCounts=warnings.reduce<Record<string,number>>((counts,issue)=>{
      counts[issue.code]=(counts[issue.code]??0)+1;
      return counts;
    },{});
    const details=warnings.map(issue=>`${issue.code}: ${issue.lessonId??issue.exerciseId??issue.projectId??issue.conceptId??issue.referenceId??''} ${issue.message}`).join('\n');
    expect(warningCounts,details).toEqual(expectedWarningCounts);
    for(const [code,policy] of Object.entries(CURRICULUM_WARNING_POLICY)){
      expect(policy.rationale.trim().length,`${code} requires a written rationale`).toBeGreaterThan(40);
    }
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
