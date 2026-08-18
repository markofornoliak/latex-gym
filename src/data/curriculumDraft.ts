import type { CourseModule, Exercise, Lesson, ReferenceEntry } from '../types';

/**
 * Mutable only inside curriculum construction. Runtime code never receives this type;
 * the finalized snapshot is deep-frozen by curriculumRuntime.
 */
export type CurriculumDraft={
  modules:CourseModule[];
  lessons:Lesson[];
  exercises:Exercise[];
  references:ReferenceEntry[];
};

/**
 * Clone the whole graph in one operation so shared identities are preserved:
 * module.lessons[n] === lessons[m] and lesson.exercises[n] === exercises[m].
 */
export function cloneCurriculumDraft(draft:CurriculumDraft):CurriculumDraft{
  return structuredClone(draft);
}
