import type { ConceptMastery, Exercise, LearningProject, Lesson } from '../types';
import type { CurriculumGraph } from './curriculumGraph';
import { filterEligibleExercises, isPrerequisiteReady } from './exerciseEligibility';
import { preferredLessonIds, preferredProjectIds } from './learningTracks';

export type NextLearningAction=
  | {kind:'practice';exerciseId:string;reason:'due'|'weak'}
  | {kind:'project';projectId:string;stageId:string;reason:'continue-project'|'goal-project'}
  | {kind:'lesson';lessonId:string;reason:'goal-track'|'course-sequence'};

export type NextLearningActionInput={
  lessons:readonly Lesson[];
  exercises:readonly Exercise[];
  projects:readonly LearningProject[];
  graph:CurriculumGraph;
  conceptScores:Record<string,number>;
  mastery:Record<string,ConceptMastery>;
  completedLessonIds:readonly string[];
  completedProjectStages:Record<string,string[]>;
  goals:readonly string[];
  experience?:string|null;
  now?:Date;
};

export function nextBestLearningAction(input:NextLearningActionInput):NextLearningAction|null{
  const now=(input.now??new Date()).getTime();
  const eligible=filterEligibleExercises(input.exercises,input.conceptScores,input.completedLessonIds,input.mastery,{graph:input.graph,lessons:input.lessons});
  const due=eligible.filter(exercise=>exercise.concepts.some(id=>{
    const next=input.mastery[id]?.nextReview;return Boolean(next&&Date.parse(next)<=now);
  })).sort((left,right)=>oldestDue(left,input.mastery)-oldestDue(right,input.mastery))[0];
  if(due)return {kind:'practice',exerciseId:due.id,reason:'due'};

  const weak=eligible.filter(exercise=>exercise.concepts.some(id=>{
    const state=input.mastery[id];return Boolean(state&&state.attempts>0&&(state.score<.62||(state.attempts>1&&state.mistakeCount/state.attempts>.34)));
  })).sort((left,right)=>weakness(left,input.mastery)-weakness(right,input.mastery))[0];
  if(weak)return {kind:'practice',exerciseId:weak.id,reason:'weak'};

  const activeProject=preferredProjectIds(input.goals,input.experience).map(id=>input.projects.find(project=>project.id===id)).filter((project):project is LearningProject=>Boolean(project)).map(project=>{
    const done=new Set(input.completedProjectStages[project.id]??[]);
    const next=project.stages.find(stage=>!done.has(stage.id));
    return {project,done,next};
  }).find(item=>item.done.size>0&&item.next&&projectReady(item.project,input));
  if(activeProject?.next)return {kind:'project',projectId:activeProject.project.id,stageId:activeProject.next.id,reason:'continue-project'};

  const lessonById=new Map(input.lessons.map(lesson=>[lesson.id,lesson]));
  const preferred=preferredLessonIds(input.goals,input.experience).map(id=>lessonById.get(id)).filter((lesson):lesson is Lesson=>Boolean(lesson));
  const goalLesson=preferred.find(lesson=>!input.completedLessonIds.includes(lesson.id)&&lessonReady(lesson,input));
  if(goalLesson)return {kind:'lesson',lessonId:goalLesson.id,reason:'goal-track'};

  const goalProject=preferredProjectIds(input.goals,input.experience).map(id=>input.projects.find(project=>project.id===id)).find((project):project is LearningProject=>Boolean(project)&&projectReady(project,input)&&project.stages.some(stage=>!(input.completedProjectStages[project.id]??[]).includes(stage.id)));
  if(goalProject){
    const done=new Set(input.completedProjectStages[goalProject.id]??[]);
    const next=goalProject.stages.find(stage=>!done.has(stage.id));
    if(next)return {kind:'project',projectId:goalProject.id,stageId:next.id,reason:'goal-project'};
  }

  const sequential=input.lessons.find(lesson=>!input.completedLessonIds.includes(lesson.id)&&lessonReady(lesson,input));
  return sequential?{kind:'lesson',lessonId:sequential.id,reason:'course-sequence'}:null;
}

function lessonReady(lesson:Lesson,input:NextLearningActionInput){
  const required=new Set(lesson.pedagogy?.prerequisites??[]);
  for(const introduced of lesson.pedagogy?.introduces??[])for(const prerequisite of input.graph.nodes[introduced]?.requires??[])required.add(prerequisite);
  return [...required].every(id=>conceptKnown(id,input));
}
function projectReady(project:LearningProject,input:NextLearningActionInput){return project.prerequisites.every(id=>conceptKnown(id,input));}
function conceptKnown(id:string,input:NextLearningActionInput){
  if(isPrerequisiteReady(input.mastery[id]))return true;
  return input.completedLessonIds.some(lessonId=>(input.lessons.find(lesson=>lesson.id===lessonId)?.pedagogy?.introduces??[]).includes(id));
}
function oldestDue(exercise:Exercise,mastery:Record<string,ConceptMastery>){return Math.min(...exercise.concepts.map(id=>Date.parse(mastery[id]?.nextReview??'9999-12-31')).filter(Number.isFinite));}
function weakness(exercise:Exercise,mastery:Record<string,ConceptMastery>){return Math.min(...exercise.concepts.map(id=>mastery[id]?.score??1));}
