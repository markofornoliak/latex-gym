import type { Exercise } from '../types';

export function selectDailyTraining(exercises:Exercise[], conceptScores:Record<string,number>, completedLessonIds:string[], daySeed = new Date().toISOString().slice(0,10)) {
  const unlocked = exercises.filter(e => completedLessonIds.length === 0 ? e.difficulty === 'Начальный' : completedLessonIds.includes(e.lessonId));
  const pool = unlocked.length >= 5 ? unlocked : exercises.filter(e => ['Начальный','Базовый'].includes(e.difficulty));
  const hash = [...daySeed].reduce((a,c)=>((a*31)+c.charCodeAt(0))>>>0,7);
  return [...pool].sort((a,b)=>{
    const sa = a.concepts.reduce((sum,c)=>sum+(conceptScores[c] ?? 0),0)/Math.max(1,a.concepts.length);
    const sb = b.concepts.reduce((sum,c)=>sum+(conceptScores[c] ?? 0),0)/Math.max(1,b.concepts.length);
    if (sa !== sb) return sa-sb;
    return seeded(a.id,hash)-seeded(b.id,hash);
  }).slice(0,5);
}
function seeded(id:string,seed:number) {
  let x=seed; for(const c of id) x=(x*33+c.charCodeAt(0))>>>0; return x;
}
