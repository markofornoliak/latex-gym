import { materializeCurriculumSource } from './curriculumSource';

const materialized=materializeCurriculumSource();

/**
 * Compatibility adapter for code that still imports the historical course catalog.
 * Educational content is authored only in curriculumSource.json.
 */
export const modules=materialized.modules;
export const lessons=materialized.lessons;
export const exercises=materialized.exercises;
export const getLesson=(id?:string)=>lessons.find(lesson=>lesson.id===id);
export const getExercise=(id?:string)=>exercises.find(exercise=>exercise.id===id);
export const getModule=(id?:string)=>modules.find(module=>module.id===id);
export const lessonIndex=new Map(lessons.map((lesson,index)=>[lesson.id,index]));
