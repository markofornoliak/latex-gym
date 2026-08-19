import { exercises as seedExercises, lessons as seedLessons, modules as seedModules } from './courses';
import { concepts } from './concepts';
import { applyCurriculumExpansion } from './curriculumExpansion';
import { applyDeepCurriculum } from './deepCurriculum';
import { applyDebuggingTrack } from './debuggingTrackTransform';
import { applyEditorialEnhancements } from './editorialEnhancements';
import { applyStableExerciseIds } from './exerciseIdentity';
import { applyExplanationElaboration } from './explanationElaboration';
import { normalizeCurriculumDraft } from './curriculumNormalize';
import { projects } from './projects';
import { referenceEntries as seedReferences } from './reference';
import { buildCurriculumGraph } from '../services/curriculumGraph';
import { lintCurriculum, type CurriculumIssue } from '../services/curriculumLinter';

/** Build-only curriculum construction. Runtime code must import curriculumRuntime. */
export function buildCurriculum(){
  const identifiedSeed=applyStableExerciseIds({modules:seedModules,lessons:seedLessons,exercises:seedExercises,references:seedReferences});
  const editorial=applyEditorialEnhancements(identifiedSeed);
  const expanded=applyCurriculumExpansion(editorial);
  const deepened=applyDeepCurriculum(expanded);
  const withDebugging=applyDebuggingTrack(deepened);
  const explained=applyExplanationElaboration(withDebugging);
  const {draft,report:normalization}=normalizeCurriculumDraft(explained,concepts);
  const {modules,lessons,exercises,references}=draft;

  if(normalization.unresolved.length){
    const unresolved=[...new Set(normalization.unresolved.map(item=>item.conceptId))].sort();
    throw new Error(`Curriculum normalization produced unknown concepts (${unresolved.length}): ${unresolved.join(', ')}`);
  }

  const issues=lintCurriculum(lessons,exercises,references,{modules,concepts,projects});
  const errors=issues.filter(issue=>issue.severity==='error');
  if(errors.length)throw new Error(formatCurriculumErrors(errors));

  const {graph,issues:graphIssues}=buildCurriculumGraph({concepts,lessons,exercises,references,projects});
  if(graphIssues.some(issue=>issue.code==='concept-cycle'))throw new Error(`Curriculum graph contains a dependency cycle:\n${graphIssues.map(issue=>issue.message).join('\n')}`);

  return {modules,lessons,exercises,concepts,references,projects,graph,normalization,issues,build:{moduleCount:modules.length,lessonCount:lessons.length,exerciseCount:exercises.length,conceptCount:concepts.length,referenceCount:references.length,projectCount:projects.length,normalizedConceptTags:normalization.changes.length}};
}

function formatCurriculumErrors(list:CurriculumIssue[]){
  const unknownConcepts=[...new Set(list.filter(issue=>issue.conceptId&&issue.code.includes('unknown')).map(issue=>issue.conceptId!))].sort();
  const unknownSection=unknownConcepts.length?`\nUnknown concept IDs (${unknownConcepts.length}): ${unknownConcepts.join(', ')}\n`:'';
  const details=list.slice(0,80).map(issue=>`- ${issue.code}${issue.lessonId?` [lesson:${issue.lessonId}]`:''}${issue.exerciseId?` [exercise:${issue.exerciseId}]`:''}${issue.projectId?` [project:${issue.projectId}]`:''}${issue.conceptId?` [concept:${issue.conceptId}]`:''}: ${issue.message}`).join('\n');
  const more=list.length>80?`\n- …and ${list.length-80} more errors.`:'';
  return `Curriculum integrity check failed with ${list.length} error(s).${unknownSection}\n${details}${more}`;
}
