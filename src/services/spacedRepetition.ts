import { conceptById } from '../data/concepts';
import type { CognitiveSkill,ConceptMastery,Exercise,MistakeCategory,MistakeEvidence } from '../types';

export function selectDailyTraining(
  exercises:Exercise[],conceptScores:Record<string,number>,completedLessonIds:string[],daySeed=new Date().toISOString().slice(0,10),mastery:Record<string,ConceptMastery>={},mistakes:Partial<Record<MistakeCategory,MistakeEvidence>>={}
){
  const unlocked=exercises.filter(exercise=>completedLessonIds.length===0?exercise.difficulty==='Начальный':completedLessonIds.includes(exercise.lessonId));
  const pool=unlocked.length>=5?unlocked:exercises.filter(exercise=>['Начальный','Базовый'].includes(exercise.difficulty));
  const hash=[...daySeed].reduce((value,char)=>((value*31)+char.charCodeAt(0))>>>0,7);const now=Date.now();
  const ranked=[...pool].sort((left,right)=>{const delta=priority(left,conceptScores,mastery,mistakes,now)-priority(right,conceptScores,mastery,mistakes,now);if(Math.abs(delta)>.0001)return delta;return seeded(left.id,hash)-seeded(right.id,hash);});
  return diversify(ranked,5);
}

function priority(exercise:Exercise,scores:Record<string,number>,mastery:Record<string,ConceptMastery>,mistakes:Partial<Record<MistakeCategory,MistakeEvidence>>,now:number){
  if(exercise.concepts.length===0)return 2;
  const conceptPriority=exercise.concepts.reduce((sum,conceptId)=>{
    const state=mastery[conceptId];
    if(!state)return sum+(scores[conceptId]??0)*.08-1.8-prerequisiteGap(conceptId,mastery)*.7;
    const due=state.nextReview?new Date(state.nextReview).getTime()<=now:true;const errorRate=state.attempts?state.mistakeCount/state.attempts:0;const daysSince=state.lastPracticed?Math.max(0,(now-new Date(state.lastPracticed).getTime())/86400000):30;
    return sum+state.score*4+(due?-2.5:0)-errorRate*1.8-Math.min(1.5,daysSince/14)-prerequisiteGap(conceptId,mastery)*.7;
  },0)/exercise.concepts.length;
  const mistakePressure=relevantMistakePressure(exercise,mistakes);
  const transferBonus=['transfer','debugging','production'].includes(cognitiveSkill(exercise))?-.16:0;
  return conceptPriority+mistakePressure+transferBonus;
}

function prerequisiteGap(conceptId:string,mastery:Record<string,ConceptMastery>){
  const definition=conceptById.get(conceptId);if(!definition)return 0;
  return definition.prerequisites.filter(id=>(mastery[id]?.score??0)<.5).length;
}
function relevantMistakePressure(exercise:Exercise,mistakes:Partial<Record<MistakeCategory,MistakeEvidence>>){
  const concepts=new Set(exercise.concepts);let pressure=0;
  for(const evidence of Object.values(mistakes)){if(!evidence)continue;if(evidence.conceptIds.some(id=>concepts.has(id)))pressure-=Math.min(1.2,.12*evidence.count);}
  return pressure;
}
export function cognitiveSkill(exercise:Exercise):CognitiveSkill{
  if(exercise.cognitiveSkill)return exercise.cognitiveSkill;
  if(exercise.mode==='Предсказать результат')return 'prediction';
  if(exercise.mode==='Исправить ошибку'||exercise.mode==='Найти ошибку')return 'debugging';
  if(exercise.mode==='Рефакторинг'||exercise.mode==='Улучшить код')return 'transfer';
  if(exercise.mode==='Архитектура')return 'architecture';
  if(exercise.mode==='Объяснить')return 'understanding';
  if(exercise.mode==='Дополнить документ')return 'modification';
  return 'production';
}
function diversify(ranked:Exercise[],limit:number){
  const selected:Exercise[]=[];const remaining=[...ranked];
  while(selected.length<limit&&remaining.length){let bestIndex=0;let bestScore=Infinity;for(let i=0;i<Math.min(remaining.length,20);i++){const candidate=remaining[i];const skill=cognitiveSkill(candidate);const sameSkill=selected.filter(item=>cognitiveSkill(item)===skill).length;const overlap=selected.reduce((sum,item)=>sum+item.concepts.filter(concept=>candidate.concepts.includes(concept)).length,0);const score=i+sameSkill*4+overlap*2.2;if(score<bestScore){bestScore=score;bestIndex=i;}}selected.push(remaining.splice(bestIndex,1)[0]);}
  return selected;
}
function seeded(id:string,seed:number){let value=seed;for(const char of id)value=(value*33+char.charCodeAt(0))>>>0;return value;}
