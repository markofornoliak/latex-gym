import type { ConceptMastery, Exercise } from '../types';

export function selectDailyTraining(
  exercises:Exercise[],
  conceptScores:Record<string,number>,
  completedLessonIds:string[],
  daySeed=new Date().toISOString().slice(0,10),
  mastery:Record<string,ConceptMastery>={}
){
  const unlocked=exercises.filter(exercise=>completedLessonIds.length===0?exercise.difficulty==='Начальный':completedLessonIds.includes(exercise.lessonId));
  const pool=unlocked.length>=5?unlocked:exercises.filter(exercise=>['Начальный','Базовый'].includes(exercise.difficulty));
  const hash=[...daySeed].reduce((value,char)=>((value*31)+char.charCodeAt(0))>>>0,7);
  const now=Date.now();
  return [...pool].sort((left,right)=>{
    const delta=priority(left,conceptScores,mastery,now)-priority(right,conceptScores,mastery,now);
    if(Math.abs(delta)>.0001)return delta;
    return seeded(left.id,hash)-seeded(right.id,hash);
  }).slice(0,5);
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
    return sum+weakness+reviewPressure+mistakePressure+recencyPressure+(neverPracticed?-1:0);
  },0)/exercise.concepts.length;
}

function seeded(id:string,seed:number){let value=seed;for(const char of id)value=(value*33+char.charCodeAt(0))>>>0;return value;}
