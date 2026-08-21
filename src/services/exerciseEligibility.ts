import type { ConceptMastery, Exercise, Lesson } from '../types';
import type { CurriculumGraph } from './curriculumGraph';

export type WorkoutCurriculumContext={graph?:CurriculumGraph;lessons?:readonly Lesson[]};

export function filterEligibleExercises(
  exercises:readonly Exercise[],
  conceptScores:Record<string,number>,
  completedLessonIds:readonly string[],
  mastery:Record<string,ConceptMastery>,
  context:WorkoutCurriculumContext
){
  if(!context.graph||!context.lessons)return exercises;
  const graph=context.graph;
  const lessonById=new Map(context.lessons.map(lesson=>[lesson.id,lesson]));
  const completed=new Set(completedLessonIds);
  const known=new Set<string>();
  for(const lessonId of completed){for(const conceptId of lessonById.get(lessonId)?.pedagogy?.introduces??[])known.add(conceptId);}
  for(const [conceptId,state] of Object.entries(mastery))if(state.successes>0)known.add(conceptId);
  for(const [conceptId,score] of Object.entries(conceptScores))if(score>0)known.add(conceptId);

  return exercises.filter(exercise=>{
    if(completed.has(exercise.lessonId))return true;
    if(exercise.concepts.length>0&&exercise.concepts.every(conceptId=>(mastery[conceptId]?.successes??0)>0))return true;
    const required=new Set<string>(exercise.prerequisites??[]);
    for(const prerequisite of lessonById.get(exercise.lessonId)?.pedagogy?.prerequisites??[])required.add(prerequisite);
    const visited=new Set<string>();
    const visit=(conceptId:string)=>{
      if(visited.has(conceptId))return;
      visited.add(conceptId);
      for(const prerequisite of graph.nodes[conceptId]?.requires??[]){required.add(prerequisite);visit(prerequisite);}
    };
    for(const conceptId of exercise.concepts)visit(conceptId);
    return [...required].every(conceptId=>known.has(conceptId));
  });
}
