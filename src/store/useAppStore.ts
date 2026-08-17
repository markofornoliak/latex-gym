import { create } from 'zustand';
import { createJSONStorage,persist } from 'zustand/middleware';
import { getProgressStorage } from '../storage/progressStorage';
import type { Bookmark,ConceptLearningState,ConceptMastery,HistoryEntry,MistakeCategory,MistakeEvidence } from '../types';

type Settings={textSize:'small'|'medium'|'large';wordWrap:boolean;autoClose:boolean;lineNumbers:boolean};
type ProjectProgress=Record<string,string[]>;
export type ExerciseAttemptEvidence={firstTry?:boolean;hintsUsed?:number;solutionRevealed?:boolean;application?:boolean;mistakeCategories?:MistakeCategory[]};
type AppState={
  version:number;onboarded:boolean;completedLessons:string[];completedExercises:string[];completedProjectStages:ProjectProgress;currentLessonId:string;bookmarks:Bookmark[];
  attempts:Record<string,number>;successfulAttempts:Record<string,number>;hintsUsed:Record<string,number>;drafts:Record<string,string>;conceptScores:Record<string,number>;conceptMastery:Record<string,ConceptMastery>;mistakes:Partial<Record<MistakeCategory,MistakeEvidence>>;history:HistoryEntry[];streak:{count:number;lastActive:string|null};settings:Settings;
  setOnboarded:()=>void;setCurrentLesson:(id:string)=>void;completeLesson:(id:string,title:string)=>void;
  recordExerciseAttempt:(exerciseId:string,ok:boolean,concepts:string[],title:string,evidence?:ExerciseAttemptEvidence)=>void;
  completeProjectStage:(projectId:string,stageId:string,title:string,concepts?:string[])=>void;recordHint:(exerciseId:string,level:number)=>void;setDraft:(key:string,source:string)=>void;toggleBookmark:(type:Bookmark['type'],targetId:string)=>void;touchReference:(title:string)=>void;updateSettings:(patch:Partial<Settings>)=>void;importProgress:(raw:string)=>{ok:boolean;message:string};resetProgress:()=>void;
};
const defaultSettings:Settings={textSize:'medium',wordWrap:true,autoClose:true,lineNumbers:true};
const pad2=(value:number)=>String(value).padStart(2,'0');
const today=()=>{const date=new Date();return `${date.getFullYear()}-${pad2(date.getMonth()+1)}-${pad2(date.getDate())}`;};
const localDate=(value:string)=>{const [year,month,day]=value.split('-').map(Number);return new Date(year,month-1,day,12);};
const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
const unique=(values:string[],value:string)=>values.includes(value)?values:[...values,value];
const historyItem=(text:string,kind:HistoryEntry['kind']):HistoryEntry=>({id:crypto.randomUUID(),at:new Date().toISOString(),text,kind});
function nextStreak(streak:AppState['streak']){const current=today();if(streak.lastActive===current)return streak;if(!streak.lastActive)return {count:1,lastActive:current};const diff=Math.round((localDate(current).getTime()-localDate(streak.lastActive).getTime())/86400000);return {count:diff===1?streak.count+1:1,lastActive:current};}

export function conceptLearningState(mastery:ConceptMastery|undefined,now=new Date()):ConceptLearningState{
  if(!mastery)return 'unseen';
  const due=mastery.nextReview?new Date(mastery.nextReview).getTime()<=now.getTime():false;
  const errorRate=mastery.attempts?mastery.mistakeCount/mastery.attempts:0;
  if(mastery.attempts>=2&&(mastery.score<.42||errorRate>.6))return 'weak';
  if(due&&mastery.attempts>0)return 'review-due';
  if(mastery.score>=.86&&mastery.attempts>=5&&(mastery.applications??0)>=1)return 'mastered';
  if(mastery.score>=.72&&(mastery.applications??0)>=1)return 'independent';
  if(mastery.attempts>=3&&mastery.score>=.58)return 'practiced';
  if(mastery.successes>=1)return 'understood';
  return 'introduced';
}
export function updateConceptMastery(previous:ConceptMastery|undefined,ok:boolean,now=new Date(),evidence:ExerciseAttemptEvidence={}):ConceptMastery{
  const base:ConceptMastery=previous??{score:.3,attempts:0,successes:0,mistakeCount:0,lastPracticed:null,stability:1,nextReview:null};
  const attempts=base.attempts+1;const successes=base.successes+(ok?1:0);const mistakeCount=base.mistakeCount+(ok?0:1);
  const hintPenalty=Math.min(.36,(evidence.hintsUsed??0)*.12);const solutionPenalty=evidence.solutionRevealed?.34:0;const firstTryBonus=evidence.firstTry?.08:0;const applicationBonus=evidence.application?.1:0;
  const quality=ok?clamp(1-hintPenalty-solutionPenalty+firstTryBonus+applicationBonus,.22,1):0;const learningRate=attempts<4?.32:.2;const score=clamp(base.score*(1-learningRate)+quality*learningRate,0,1);const stability=clamp(ok?base.stability*(1.08+quality*.38+score*.18):base.stability*.62,.5,60);const intervalDays=ok?Math.max(1,Math.round(stability*(score>.82?4:score>.62?2:1))):1;const nextReview=new Date(now);nextReview.setDate(nextReview.getDate()+intervalDays);
  return {score,attempts,successes,mistakeCount,lastPracticed:now.toISOString(),stability,nextReview:nextReview.toISOString(),firstTrySuccesses:(base.firstTrySuccesses??0)+(ok&&evidence.firstTry?1:0),hintedSuccesses:(base.hintedSuccesses??0)+(ok&&(evidence.hintsUsed??0)>0?1:0),solutionReveals:(base.solutionReveals??0)+(evidence.solutionRevealed?1:0),applications:(base.applications??0)+(ok&&evidence.application?1:0)};
}
function recordMistakes(previous:AppState['mistakes'],categories:MistakeCategory[],exerciseId:string,conceptIds:string[],now:Date){
  const next={...previous};for(const category of new Set(categories)){const current=next[category];next[category]={category,count:(current?.count??0)+1,lastSeen:now.toISOString(),exerciseIds:unique(current?.exerciseIds??[],exerciseId).slice(-30),conceptIds:[...new Set([...(current?.conceptIds??[]),...conceptIds])].slice(-30)};}return next;
}

export const useAppStore=create<AppState>()(persist((set)=>({
  version:3,onboarded:false,completedLessons:[],completedExercises:[],completedProjectStages:{},currentLessonId:'what-is-latex',bookmarks:[],attempts:{},successfulAttempts:{},hintsUsed:{},drafts:{},conceptScores:{},conceptMastery:{},mistakes:{},history:[],streak:{count:0,lastActive:null},settings:defaultSettings,
  setOnboarded:()=>set({onboarded:true}),setCurrentLesson:(id)=>set({currentLessonId:id}),
  completeLesson:(id,title)=>set(state=>({completedLessons:unique(state.completedLessons,id),currentLessonId:id,history:[historyItem(`Пройден урок «${title}»`,'lesson'),...state.history].slice(0,100),streak:nextStreak(state.streak)})),
  recordExerciseAttempt:(exerciseId,ok,concepts,title,evidence={})=>set(state=>{const attempts={...state.attempts,[exerciseId]:(state.attempts[exerciseId]??0)+1};const successfulAttempts={...state.successfulAttempts};if(ok)successfulAttempts[exerciseId]=(successfulAttempts[exerciseId]??0)+1;const conceptScores={...state.conceptScores};const conceptMastery={...state.conceptMastery};const now=new Date();for(const conceptId of concepts){conceptScores[conceptId]=(conceptScores[conceptId]??0)+(ok?1:-1);conceptMastery[conceptId]=updateConceptMastery(conceptMastery[conceptId],ok,now,evidence);}const mistakes=evidence.mistakeCategories?.length?recordMistakes(state.mistakes,evidence.mistakeCategories,exerciseId,concepts,now):state.mistakes;return {attempts,successfulAttempts,conceptScores,conceptMastery,mistakes,completedExercises:ok?unique(state.completedExercises,exerciseId):state.completedExercises,history:ok?[historyItem(`Решена задача «${title}»`,'exercise'),...state.history].slice(0,100):state.history,streak:nextStreak(state.streak)};}),
  completeProjectStage:(projectId,stageId,title,concepts=[])=>set(state=>{const conceptMastery={...state.conceptMastery};const conceptScores={...state.conceptScores};const now=new Date();for(const conceptId of concepts){conceptMastery[conceptId]=updateConceptMastery(conceptMastery[conceptId],true,now,{application:true});conceptScores[conceptId]=(conceptScores[conceptId]??0)+1;}return {completedProjectStages:{...state.completedProjectStages,[projectId]:unique(state.completedProjectStages[projectId]??[],stageId)},conceptMastery,conceptScores,history:[historyItem(`Завершён этап проекта «${title}»`,'exercise'),...state.history].slice(0,100),streak:nextStreak(state.streak)};}),
  recordHint:(exerciseId,level)=>set(state=>({hintsUsed:{...state.hintsUsed,[exerciseId]:Math.max(level,state.hintsUsed[exerciseId]??0)}})),setDraft:(key,source)=>set(state=>({drafts:{...state.drafts,[key]:source}})),toggleBookmark:(type,targetId)=>set(state=>{const id=`${type}:${targetId}`;const exists=state.bookmarks.some(bookmark=>bookmark.id===id);return {bookmarks:exists?state.bookmarks.filter(bookmark=>bookmark.id!==id):[...state.bookmarks,{id,type,targetId,createdAt:new Date().toISOString()}]};}),touchReference:(title)=>set(state=>({history:[historyItem(`Изучена команда ${title}`,'reference'),...state.history].slice(0,100),streak:nextStreak(state.streak)})),updateSettings:(patch)=>set(state=>({settings:{...state.settings,...patch}})),
  importProgress:(raw)=>{try{const parsed=JSON.parse(raw) as Partial<AppState>;if(!parsed||typeof parsed!=='object')throw new Error('invalid');set(state=>({onboarded:parsed.onboarded??state.onboarded,completedLessons:Array.isArray(parsed.completedLessons)?parsed.completedLessons:state.completedLessons,completedExercises:Array.isArray(parsed.completedExercises)?parsed.completedExercises:state.completedExercises,completedProjectStages:parsed.completedProjectStages??state.completedProjectStages,currentLessonId:typeof parsed.currentLessonId==='string'?parsed.currentLessonId:state.currentLessonId,bookmarks:Array.isArray(parsed.bookmarks)?parsed.bookmarks:state.bookmarks,attempts:parsed.attempts??state.attempts,successfulAttempts:parsed.successfulAttempts??state.successfulAttempts,hintsUsed:parsed.hintsUsed??state.hintsUsed,drafts:parsed.drafts??state.drafts,conceptScores:parsed.conceptScores??state.conceptScores,conceptMastery:parsed.conceptMastery??state.conceptMastery,mistakes:parsed.mistakes??state.mistakes,history:Array.isArray(parsed.history)?parsed.history:state.history,streak:parsed.streak??state.streak,settings:{...state.settings,...parsed.settings}}));return {ok:true,message:'Прогресс импортирован.'};}catch{return {ok:false,message:'Файл прогресса имеет неверный формат.'};}},
  resetProgress:()=>set({completedLessons:[],completedExercises:[],completedProjectStages:{},currentLessonId:'what-is-latex',bookmarks:[],attempts:{},successfulAttempts:{},hintsUsed:{},drafts:{},conceptScores:{},conceptMastery:{},mistakes:{},history:[],streak:{count:0,lastActive:null}})
}),{name:'latex-gym-state',version:3,storage:createJSONStorage(()=>getProgressStorage()),migrate:(persisted,version)=>{const state=(persisted??{}) as Record<string,unknown>;if(version<3)return {...state,version:3,completedProjectStages:state.completedProjectStages??{},conceptMastery:state.conceptMastery??{},mistakes:state.mistakes??{}} as unknown as AppState;return state as unknown as AppState;}}));
export function exportProgress(){const state=useAppStore.getState();return JSON.stringify({version:3,onboarded:state.onboarded,completedLessons:state.completedLessons,completedExercises:state.completedExercises,completedProjectStages:state.completedProjectStages,currentLessonId:state.currentLessonId,bookmarks:state.bookmarks,attempts:state.attempts,successfulAttempts:state.successfulAttempts,hintsUsed:state.hintsUsed,drafts:state.drafts,conceptScores:state.conceptScores,conceptMastery:state.conceptMastery,mistakes:state.mistakes,history:state.history,streak:state.streak,settings:state.settings},null,2);}
