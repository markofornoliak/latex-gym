import { curriculum } from '../data/curriculumRuntime';
import type { ConceptMastery } from '../types';
import { buildDailyWorkout } from './spacedRepetition';

export type RuntimeWorkoutInput={
  conceptScores:Record<string,number>;
  completedLessonIds:string[];
  mastery:Record<string,ConceptMastery>;
  daySeed?:string;
};

/** Production workout entrypoint: curriculum graph context cannot be accidentally omitted. */
export function buildRuntimeDailyWorkout(input:RuntimeWorkoutInput){
  return buildDailyWorkout(
    curriculum.exercises,
    input.conceptScores,
    input.completedLessonIds,
    input.daySeed,
    input.mastery,
    {graph:curriculum.graph,lessons:curriculum.lessons}
  );
}

export function selectRuntimeDailyTraining(input:RuntimeWorkoutInput){
  return buildRuntimeDailyWorkout(input).map(item=>item.exercise);
}