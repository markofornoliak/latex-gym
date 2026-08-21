import type { Exercise } from '../types';

/**
 * Concepts that should receive learner-model evidence from an exercise result.
 * Supporting concepts stay available on exercise.concepts for graph/navigation use.
 */
export function exerciseEvidenceConcepts(exercise:Pick<Exercise,'concepts'|'evidenceConcepts'>):readonly string[]{
  return exercise.evidenceConcepts?.length?exercise.evidenceConcepts:exercise.concepts;
}
