import { assertCanonicalCurriculumSource, materializeCurriculumSource } from './curriculumSource';
import { buildCurriculumGraph } from '../services/curriculumGraph';
import { lintCurriculum, type CurriculumIssue } from '../services/curriculumLinter';
import { assertProjectStageRuleCoverage } from '../services/projectStageValidation';

/** Build-only curriculum construction. Runtime code must import curriculumRuntime. */
export function buildCurriculum(){
  const {modules,lessons,exercises,concepts,references,projects}=assertCanonicalCurriculumSource(materializeCurriculumSource());

  assertProjectStageRuleCoverage(projects);
  const issues=lintCurriculum(lessons,exercises,references,{modules,concepts,projects});
  const errors=issues.filter(issue=>issue.severity==='error');
  if(errors.length)throw new Error(formatCurriculumErrors(errors));

  const {graph,issues:graphIssues}=buildCurriculumGraph({concepts,lessons,exercises,references,projects});
  if(graphIssues.some(issue=>issue.code==='concept-cycle'))throw new Error(`Curriculum graph contains a dependency cycle:\n${graphIssues.map(issue=>issue.message).join('\n')}`);

  // Historical normalization is now complete: the canonical source stores only
  // canonical concept IDs. Keep the snapshot field for runtime compatibility.
  const normalization={changes:[] as const,unresolved:[] as const};

  return {
    modules,lessons,exercises,concepts,references,projects,graph,normalization,issues,
    build:{
      moduleCount:modules.length,
      lessonCount:lessons.length,
      exerciseCount:exercises.length,
      conceptCount:concepts.length,
      referenceCount:references.length,
      projectCount:projects.length,
      normalizedConceptTags:0
    }
  };
}

function formatCurriculumErrors(list:CurriculumIssue[]){
  const unknownConcepts=[...new Set(list.filter(issue=>issue.conceptId&&issue.code.includes('unknown')).map(issue=>issue.conceptId!))].sort();
  const unknownSection=unknownConcepts.length?`\nUnknown concept IDs (${unknownConcepts.length}): ${unknownConcepts.join(', ')}\n`:'';
  const details=list.slice(0,80).map(issue=>`- ${issue.code}${issue.lessonId?` [lesson:${issue.lessonId}]`:''}${issue.exerciseId?` [exercise:${issue.exerciseId}]`:''}${issue.projectId?` [project:${issue.projectId}]`:''}${issue.conceptId?` [concept:${issue.conceptId}]`:''}: ${issue.message}`).join('\n');
  const more=list.length>80?`\n- …and ${list.length-80} more errors.`:'';
  return `Curriculum integrity check failed with ${list.length} error(s).${unknownSection}\n${details}${more}`;
}