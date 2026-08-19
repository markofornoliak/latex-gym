import sourceJson from './curriculumSource.json';
import { canonicalConceptId } from './conceptAliases';
import type { ConceptDefinition, CourseModule, Exercise, LearningProject, Lesson, ReferenceEntry } from '../types';

export type CanonicalCurriculumSource={
  modules:CourseModule[];
  concepts:ConceptDefinition[];
  references:ReferenceEntry[];
  projects:LearningProject[];
};

export type MaterializedCurriculum=CanonicalCurriculumSource&{
  lessons:Lesson[];
  exercises:Exercise[];
};

/**
 * The only authored source of educational content.
 *
 * Lessons live only under modules and exercises live only under lessons. Flat lesson
 * and exercise catalogs are derived when the build runs, so an educational fact is
 * never maintained in two authoring structures.
 */
export const curriculumSource=sourceJson as unknown as CanonicalCurriculumSource;

export function materializeCurriculumSource():MaterializedCurriculum{
  const source=structuredClone(curriculumSource);
  const lessons=source.modules.flatMap(module=>module.lessons);
  const exercises=lessons.flatMap(lesson=>lesson.exercises);
  return {...source,lessons,exercises};
}

/**
 * Canonical source files must not contain historical concept aliases. Compatibility
 * aliases remain valid for persisted user data, but new curriculum authoring must use
 * the canonical concept vocabulary directly.
 */
export function assertCanonicalCurriculumSource(source:MaterializedCurriculum){
  const violations:string[]=[];
  const check=(owner:string,ids:readonly string[])=>{
    for(const id of ids){
      const normalized=id.trim().toLocaleLowerCase('en').replace(/_/g,'-');
      const canonical=canonicalConceptId(normalized);
      if(id!==canonical)violations.push(`${owner}: ${id} -> ${canonical}`);
    }
  };

  for(const concept of source.concepts)check(`concept:${concept.id}:prerequisites`,concept.prerequisites);
  for(const lesson of source.lessons){
    const pedagogy=lesson.pedagogy;
    if(pedagogy){
      check(`lesson:${lesson.id}:prerequisites`,pedagogy.prerequisites);
      check(`lesson:${lesson.id}:introduces`,pedagogy.introduces);
      check(`lesson:${lesson.id}:reinforces`,pedagogy.reinforces);
    }
  }
  for(const exercise of source.exercises){
    check(`exercise:${exercise.id}:concepts`,exercise.concepts);
    check(`exercise:${exercise.id}:prerequisites`,exercise.prerequisites??[]);
  }
  for(const project of source.projects){
    check(`project:${project.id}:prerequisites`,project.prerequisites);
    check(`project:${project.id}:concepts`,project.concepts);
  }

  if(violations.length)throw new Error(`Canonical curriculum source contains legacy concept IDs:\n${violations.slice(0,80).join('\n')}`);
  return source;
}
