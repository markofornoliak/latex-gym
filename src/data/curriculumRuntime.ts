/*
 * Curriculum construction boundary.
 *
 * One legacy editorial step still mutates the initial seed graph first because later
 * enrichment historically depends on those edits. Expansion and deep-curriculum
 * construction are generated as deterministic copy-on-write transforms from
 * byte-preserved legacy source fixtures. Every subsequent step is also pure.
 * The finalized graph is normalized, validated, indexed and deeply frozen before
 * runtime code can observe it.
 *
 * This boundary is the only supported entry point for application curriculum reads.
 */
import './editorialEnhancements';

import { exercises as seedExercises, lessons as seedLessons, modules as seedModules } from './courses';
import { concepts } from './concepts';
import { applyCurriculumExpansion } from './curriculumExpansion.generated';
import { applyDeepCurriculum } from './deepCurriculum.generated';
import { applyDebuggingTrack } from './debuggingTrackTransform';
import { applyExplanationElaboration } from './explanationElaboration';
import { normalizeCurriculumDraft } from './curriculumNormalize';
import { projects } from './projects';
import { referenceEntries as seedReferences } from './reference';
import { buildCurriculumGraph } from '../services/curriculumGraph';
import { lintCurriculum, type CurriculumIssue } from '../services/curriculumLinter';

const expanded=applyCurriculumExpansion({
  modules:seedModules,
  lessons:seedLessons,
  exercises:seedExercises,
  references:seedReferences
});
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

const moduleById=freezeRecord(Object.fromEntries(modules.map(module=>[module.id,module])));
const lessonById=freezeRecord(Object.fromEntries(lessons.map(lesson=>[lesson.id,lesson])));
const lessonPositionById=freezeRecord(Object.fromEntries(lessons.map((lesson,index)=>[lesson.id,index])));
const exerciseById=freezeRecord(Object.fromEntries(exercises.map(exercise=>[exercise.id,exercise])));
const conceptById=freezeRecord(Object.fromEntries(concepts.map(concept=>[concept.id,concept])));
const referenceById=freezeRecord(Object.fromEntries(references.map(entry=>[entry.id,entry])));
const projectById=freezeRecord(Object.fromEntries(projects.map(project=>[project.id,project])));

deepFreeze(modules);deepFreeze(lessons);deepFreeze(exercises);deepFreeze(concepts);deepFreeze(references);deepFreeze(projects);

export const curriculum=Object.freeze({
  modules:modules as readonly typeof modules[number][],
  lessons:lessons as readonly typeof lessons[number][],
  exercises:exercises as readonly typeof exercises[number][],
  concepts:concepts as readonly typeof concepts[number][],
  references:references as readonly typeof references[number][],
  projects:projects as readonly typeof projects[number][],
  moduleById,
  lessonById,
  lessonPositionById,
  exerciseById,
  conceptById,
  referenceById,
  projectById,
  graph,
  normalization,
  issues:Object.freeze(issues),
  build:Object.freeze({
    moduleCount:modules.length,
    lessonCount:lessons.length,
    exerciseCount:exercises.length,
    conceptCount:concepts.length,
    referenceCount:references.length,
    projectCount:projects.length,
    normalizedConceptTags:normalization.changes.length
  })
});

export function assertCurriculumIntegrity(){return curriculum;}

function deepFreeze<T>(value:T,seen=new WeakSet<object>()):T{
  if(value===null||typeof value!=='object')return value;
  const object=value as object;
  if(seen.has(object))return value;
  seen.add(object);
  if(ArrayBuffer.isView(object)||object instanceof ArrayBuffer)return value;
  for(const child of Object.values(object as Record<string,unknown>))deepFreeze(child,seen);
  return Object.freeze(value);
}

function freezeRecord<T extends Record<string,unknown>>(record:T):Readonly<T>{return Object.freeze(record);}
function formatCurriculumErrors(list:CurriculumIssue[]){
  const unknownConcepts=[...new Set(list.filter(issue=>issue.conceptId&&issue.code.includes('unknown')).map(issue=>issue.conceptId!))].sort();
  const unknownSection=unknownConcepts.length?`\nUnknown concept IDs (${unknownConcepts.length}): ${unknownConcepts.join(', ')}\n`:'';
  const details=list.slice(0,80).map(issue=>`- ${issue.code}${issue.lessonId?` [lesson:${issue.lessonId}]`:''}${issue.exerciseId?` [exercise:${issue.exerciseId}]`:''}${issue.projectId?` [project:${issue.projectId}]`:''}${issue.conceptId?` [concept:${issue.conceptId}]`:''}: ${issue.message}`).join('\n');
  const more=list.length>80?`\n- …and ${list.length-80} more errors.`:'';
  return `Curriculum integrity check failed with ${list.length} error(s).${unknownSection}\n${details}${more}`;
}
