import snapshotJson from './curriculumSnapshot.generated.json';
import type { ConceptDefinition, CourseModule, Exercise, LearningProject, Lesson, ReferenceEntry } from '../types';
import type { CurriculumSnapshot } from '../types/curriculumSnapshot';

const raw=snapshotJson as unknown as CurriculumSnapshot;
if(raw.snapshotVersion!==1)throw new Error(`Unsupported curriculum snapshot version: ${raw.snapshotVersion}`);

const exercises=raw.exercises.map(exercise=>({...exercise}));
const exerciseById=freezeRecord(Object.fromEntries(exercises.map(exercise=>[exercise.id,exercise])));
const lessons=raw.lessons.map(lesson=>({...lesson,exercises:lesson.exercises.map(exercise=>exerciseById[exercise.id]??exercise)}));
const lessonById=freezeRecord(Object.fromEntries(lessons.map(lesson=>[lesson.id,lesson])));
const modules=raw.modules.map(module=>({...module,lessons:module.lessons.map(lesson=>lessonById[lesson.id]??lesson)}));
const concepts=raw.concepts.map(concept=>({...concept}));
const references=raw.references.map(reference=>({...reference}));
const projects=raw.projects.map(project=>({...project,stages:project.stages.map(stage=>({...stage}))}));

const moduleById=freezeRecord(Object.fromEntries(modules.map(module=>[module.id,module])));
const lessonPositionById=freezeRecord(Object.fromEntries(lessons.map((lesson,index)=>[lesson.id,index])));
const conceptById=freezeRecord(Object.fromEntries(concepts.map(concept=>[concept.id,concept])));
const referenceById=freezeRecord(Object.fromEntries(references.map(entry=>[entry.id,entry])));
const projectById=freezeRecord(Object.fromEntries(projects.map(project=>[project.id,project])));

deepFreeze(modules);deepFreeze(lessons);deepFreeze(exercises);deepFreeze(concepts);deepFreeze(references);deepFreeze(projects);deepFreeze(raw.graph);deepFreeze(raw.normalization);deepFreeze(raw.issues);

export const curriculum=Object.freeze({
  modules:modules as readonly CourseModule[],lessons:lessons as readonly Lesson[],exercises:exercises as readonly Exercise[],concepts:concepts as readonly ConceptDefinition[],references:references as readonly ReferenceEntry[],projects:projects as readonly LearningProject[],
  moduleById,lessonById,lessonPositionById,exerciseById,conceptById,referenceById,projectById,graph:raw.graph,normalization:raw.normalization,issues:Object.freeze(raw.issues),build:Object.freeze({...raw.build,semanticFingerprint:raw.semanticFingerprint,snapshotVersion:raw.snapshotVersion})
});

export function assertCurriculumIntegrity(){return curriculum;}
function deepFreeze<T>(value:T,seen=new WeakSet<object>()):T{if(value===null||typeof value!=='object')return value;const object=value as object;if(seen.has(object))return value;seen.add(object);if(ArrayBuffer.isView(object)||object instanceof ArrayBuffer)return value;for(const child of Object.values(object as Record<string,unknown>))deepFreeze(child,seen);return Object.freeze(value);}
function freezeRecord<T extends Record<string,unknown>>(record:T):Readonly<T>{return Object.freeze(record);}
