import type { ConceptMastery, Exercise, Lesson } from '../types';
import { exerciseEvidenceConcepts } from './masteryEvidence';

export type AdaptiveGraphNode={
  requires:readonly string[];
  introducedBy:readonly string[];
};
export type AdaptiveKnowledgeGraph={nodes:Readonly<Record<string,AdaptiveGraphNode>>};
export type AdaptiveKnowledgeContext={
  graph:AdaptiveKnowledgeGraph;
  lessons:readonly Lesson[];
  targetLessonId?:string;
  completedExerciseIds?:readonly string[];
  readinessThreshold?:number;
};

export type LearnerKnowledge={
  conceptScores:Record<string,number>;
  mastery:Record<string,ConceptMastery>;
  completedLessonIds:readonly string[];
};

const DEFAULT_READINESS=.42;

/** Readiness is deliberately weaker than mastery: one credible success or a completed
 * introduction can unlock dependent material, while weak mastery can still trigger review. */
export function isConceptReady(conceptId:string,learner:LearnerKnowledge,context:AdaptiveKnowledgeContext):boolean{
  const state=learner.mastery[conceptId];
  const threshold=context.readinessThreshold??DEFAULT_READINESS;
  if(state?.attempts)return state.successes>0&&state.score>=threshold;
  if((learner.conceptScores[conceptId]??0)>0)return true;
  const completed=new Set(learner.completedLessonIds);
  return Boolean(context.graph.nodes[conceptId]?.introducedBy.some(lessonId=>completed.has(lessonId)));
}

export function exercisePrerequisiteIds(exercise:Exercise,context:AdaptiveKnowledgeContext):string[]{
  const lesson=context.lessons.find(item=>item.id===exercise.lessonId);
  const coTaught=new Set([...(lesson?.pedagogy?.introduces??[]),...(lesson?.pedagogy?.reinforces??[])]);
  const required=new Set<string>([...(lesson?.pedagogy?.prerequisites??[]),...(exercise.prerequisites??[])]);
  for(const conceptId of exercise.concepts){
    for(const prerequisite of context.graph.nodes[conceptId]?.requires??[]){
      // Concepts intentionally taught together may be learned within one lesson.
      if(coTaught.has(conceptId)&&coTaught.has(prerequisite))continue;
      required.add(prerequisite);
    }
  }
  return [...required];
}

export function unmetExercisePrerequisites(
  exercise:Exercise,
  learner:LearnerKnowledge,
  context:AdaptiveKnowledgeContext
):string[]{
  return exercisePrerequisiteIds(exercise,context).filter(id=>!isConceptReady(id,learner,context));
}

export function isExerciseEligible(
  exercise:Exercise,
  learner:LearnerKnowledge,
  context:AdaptiveKnowledgeContext
):boolean{
  const completedExercises=new Set(context.completedExerciseIds??[]);
  const completedLessons=new Set(learner.completedLessonIds);
  // Never lock repetition because a prerequisite later became weak.
  if(completedExercises.has(exercise.id)||completedLessons.has(exercise.lessonId))return true;
  return unmetExercisePrerequisites(exercise,learner,context).length===0;
}

/**
 * Adaptive practice stays local: completed material, the current/next lesson, and
 * prerequisite remediation. A satisfied prerequisite must not unlock unrelated
 * future branches merely because they happen to be topologically possible.
 */
export function isExerciseInAdaptiveScope(
  exercise:Exercise,
  learner:LearnerKnowledge,
  context:AdaptiveKnowledgeContext,
  frontier=new Set(targetPrerequisiteFrontier(learner,context))
):boolean{
  if(!isExerciseEligible(exercise,learner,context))return false;
  if((context.completedExerciseIds??[]).includes(exercise.id)||learner.completedLessonIds.includes(exercise.lessonId))return true;
  const target=resolveTargetLesson(learner.completedLessonIds,context);
  if(target?.id===exercise.lessonId)return true;
  return exerciseEvidenceConcepts(exercise).some(id=>frontier.has(id));
}

/** Returns the nearest unmet foundations for the learner's current/next lesson. */
export function targetPrerequisiteFrontier(
  learner:LearnerKnowledge,
  context:AdaptiveKnowledgeContext
):string[]{
  const target=resolveTargetLesson(learner.completedLessonIds,context);
  if(!target)return [];
  const coIntroduced=new Set(target.pedagogy?.introduces??[]);
  const candidates=new Set<string>(target.pedagogy?.prerequisites??[]);
  for(const conceptId of coIntroduced){
    for(const prerequisite of context.graph.nodes[conceptId]?.requires??[]){
      if(!coIntroduced.has(prerequisite))candidates.add(prerequisite);
    }
  }
  for(const exercise of target.exercises){
    for(const prerequisite of exercise.prerequisites??[])candidates.add(prerequisite);
  }
  const frontier=new Set<string>();
  const visit=(conceptId:string,seen:Set<string>)=>{
    if(isConceptReady(conceptId,learner,context)||seen.has(conceptId))return;
    const next=new Set(seen);next.add(conceptId);
    const unmet=(context.graph.nodes[conceptId]?.requires??[]).filter(id=>!isConceptReady(id,learner,context));
    if(unmet.length===0){frontier.add(conceptId);return;}
    for(const prerequisite of unmet)visit(prerequisite,next);
  };
  for(const conceptId of candidates)visit(conceptId,new Set());
  return [...frontier];
}

export function resolveTargetLesson(completedLessonIds:readonly string[],context:AdaptiveKnowledgeContext):Lesson|undefined{
  const completed=new Set(completedLessonIds);
  const requestedIndex=context.targetLessonId?context.lessons.findIndex(lesson=>lesson.id===context.targetLessonId):-1;
  if(requestedIndex>=0&&!completed.has(context.lessons[requestedIndex].id))return context.lessons[requestedIndex];
  const start=requestedIndex>=0?requestedIndex+1:0;
  for(let index=start;index<context.lessons.length;index+=1){
    if(!completed.has(context.lessons[index].id))return context.lessons[index];
  }
  return context.lessons.find(lesson=>!completed.has(lesson.id));
}
