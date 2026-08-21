import type { ConceptMastery, Exercise } from '../types';
import { filterEligibleExercises, type WorkoutCurriculumContext } from './exerciseEligibility';

export type WorkoutReason='review'|'new'|'weak'|'debugging'|'transfer';
export type DailyWorkoutItem={exercise:Exercise;reason:WorkoutReason;explanation:string};

export function buildDailyWorkout(
  exercises:readonly Exercise[],
  conceptScores:Record<string,number>,
  completedLessonIds:string[],
  daySeed=new Date().toISOString().slice(0,10),
  mastery:Record<string,ConceptMastery>={},
  context:WorkoutCurriculumContext={}
):DailyWorkoutItem[]{
  const eligible=filterEligibleExercises(exercises,conceptScores,completedLessonIds,mastery,context);
  const unlocked=eligible.filter(exercise=>completedLessonIds.length===0?exercise.difficulty==='Начальный':completedLessonIds.includes(exercise.lessonId));
  const dependencyAware=Boolean(context.graph&&context.lessons);
  const pool=unlocked.length>=5?unlocked:dependencyAware?eligible:exercises.filter(exercise=>['Начальный','Базовый'].includes(exercise.difficulty));
  const hash=[...daySeed].reduce((value,char)=>((value*31)+char.charCodeAt(0))>>>0,7);
  const now=Date.now();
  const ranked=[...pool].sort((left,right)=>{
    const delta=priority(left,conceptScores,mastery,now)-priority(right,conceptScores,mastery,now);
    if(Math.abs(delta)>.0001)return delta;
    return seeded(left.id,hash)-seeded(right.id,hash);
  });

  const selected:DailyWorkoutItem[]=[];
  const used=new Set<string>();
  const add=(candidate:Exercise|undefined,reason:WorkoutReason)=>{
    if(!candidate||used.has(candidate.id)||selected.length>=5)return false;
    used.add(candidate.id);
    selected.push({exercise:candidate,reason,explanation:reasonText(candidate,reason,mastery,now)});
    return true;
  };
  const take=(reason:WorkoutReason,count:number,predicate:(exercise:Exercise)=>boolean)=>{
    let taken=0;
    for(const exercise of ranked){
      if(taken>=count)break;
      if(predicate(exercise)&&add(exercise,reason))taken++;
    }
  };

  take('review',2,exercise=>isDue(exercise,mastery,now));
  take('debugging',1,isDebuggingExercise);
  take('new',2,exercise=>isNew(exercise,mastery));
  if(selected.length<5)take('transfer',1,isTransferExercise);
  if(selected.length<5)take('weak',5,exercise=>isWeak(exercise,mastery));
  for(const exercise of ranked){if(selected.length>=5)break;add(exercise,classifyFallback(exercise,mastery,now));}
  return selected;
}

export function selectDailyTraining(
  exercises:readonly Exercise[],
  conceptScores:Record<string,number>,
  completedLessonIds:string[],
  daySeed=new Date().toISOString().slice(0,10),
  mastery:Record<string,ConceptMastery>={},
  context:WorkoutCurriculumContext={}
){
  return buildDailyWorkout(exercises,conceptScores,completedLessonIds,daySeed,mastery,context).map(item=>item.exercise);
}

function priority(exercise:Exercise,scores:Record<string,number>,mastery:Record<string,ConceptMastery>,now:number){
  if(exercise.concepts.length===0)return 2;
  return exercise.concepts.reduce((sum,conceptId)=>{
    const state=mastery[conceptId];
    if(!state)return sum+(scores[conceptId]??0)*.08-1.8;
    const due=state.nextReview?new Date(state.nextReview).getTime()<=now:true;
    const errorRate=state.attempts?state.mistakeCount/state.attempts:0;
    const neverPracticed=!state.lastPracticed;
    const daysSince=state.lastPracticed?Math.max(0,(now-new Date(state.lastPracticed).getTime())/86400000):30;
    const weakness=state.score*4;
    const reviewPressure=due?-2.5:0;
    const mistakePressure=-errorRate*1.8;
    const recencyPressure=-Math.min(1.5,daysSince/14);
    const independencePressure=state.successes>0&&state.independentSuccesses===0?-1.1:0;
    return sum+weakness+reviewPressure+mistakePressure+recencyPressure+independencePressure+(neverPracticed?-1:0);
  },0)/exercise.concepts.length;
}

function isDue(exercise:Exercise,mastery:Record<string,ConceptMastery>,now:number){
  return exercise.concepts.some(id=>{const state=mastery[id];return Boolean(state?.nextReview&&new Date(state.nextReview).getTime()<=now);});
}
function isNew(exercise:Exercise,mastery:Record<string,ConceptMastery>){return exercise.concepts.some(id=>!mastery[id]||mastery[id].attempts===0);}
function isWeak(exercise:Exercise,mastery:Record<string,ConceptMastery>){return exercise.concepts.some(id=>{const state=mastery[id];return Boolean(state&&(state.score<.62||(state.attempts>1&&state.mistakeCount/state.attempts>.34)));});}
function isDebuggingExercise(exercise:Exercise){return exercise.category==='Отладка'||exercise.mode==='Исправить ошибку'||exercise.mode==='Найти ошибку';}
function isTransferExercise(exercise:Exercise){return exercise.mode==='Рефакторинг'||exercise.mode==='Воссоздать результат'||exercise.mode==='Архитектура'||exercise.mode==='Собрать документ';}
function classifyFallback(exercise:Exercise,mastery:Record<string,ConceptMastery>,now:number):WorkoutReason{
  if(isDue(exercise,mastery,now))return 'review';
  if(isWeak(exercise,mastery))return 'weak';
  if(isDebuggingExercise(exercise))return 'debugging';
  if(isTransferExercise(exercise))return 'transfer';
  return 'new';
}
function reasonText(exercise:Exercise,reason:WorkoutReason,mastery:Record<string,ConceptMastery>,now:number){
  if(reason==='review'){
    const overdue=exercise.concepts.map(id=>mastery[id]).filter(Boolean).filter(state=>state.nextReview&&new Date(state.nextReview).getTime()<=now);
    const oldest=overdue.sort((a,b)=>new Date(a.nextReview!).getTime()-new Date(b.nextReview!).getTime())[0];
    const days=oldest?.nextReview?Math.max(0,Math.floor((now-new Date(oldest.nextReview).getTime())/86400000)):0;
    return days>0?`Повторение просрочено на ${days} дн.`:'Знание снова пора извлечь из памяти.';
  }
  if(reason==='weak')return 'Недавние ошибки или низкая устойчивость требуют ещё одного подхода.';
  if(reason==='debugging')return 'Тренировка чтения ошибок и поиска первопричины.';
  if(reason==='transfer')return 'Применение знакомых конструкций в другом контексте.';
  return 'По этому концепту пока мало самостоятельной практики.';
}
function seeded(id:string,seed:number){let value=seed;for(const char of id)value=(value*33+char.charCodeAt(0))>>>0;return value;}
