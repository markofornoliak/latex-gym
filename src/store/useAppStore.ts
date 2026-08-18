import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Bookmark, ConceptMastery, HistoryEntry, MasteryEvidence } from '../types';

type Settings={textSize:'small'|'medium'|'large';wordWrap:boolean;autoClose:boolean;lineNumbers:boolean};
type ProjectProgress=Record<string,string[]>;
type AttemptEvidence=Partial<Omit<MasteryEvidence,'outcome'>>;
export type OnboardingExperience='new'|'basic'|'regular'|'advanced';
export type OnboardingProfile={goals:string[];experience:OnboardingExperience|null;placementScore:number|null;placementTotal:number;placementEvidence:Record<string,boolean>;recommendedLessonId:string|null;completedAt:string|null};

type AppState={
  version:number;
  onboarded:boolean;
  onboarding:OnboardingProfile;
  completedLessons:string[];
  completedExercises:string[];
  completedProjectStages:ProjectProgress;
  currentLessonId:string;
  bookmarks:Bookmark[];
  attempts:Record<string,number>;
  successfulAttempts:Record<string,number>;
  hintsUsed:Record<string,number>;
  solutionReveals:Record<string,number>;
  drafts:Record<string,string>;
  conceptScores:Record<string,number>;
  conceptMastery:Record<string,ConceptMastery>;
  history:HistoryEntry[];
  streak:{count:number;lastActive:string|null};
  settings:Settings;
  setOnboarded:()=>void;
  completeOnboarding:(profile:Omit<OnboardingProfile,'completedAt'>)=>void;
  retakeOnboarding:()=>void;
  setCurrentLesson:(id:string)=>void;
  completeLesson:(id:string,title:string)=>void;
  recordExerciseAttempt:(exerciseId:string,ok:boolean,concepts:string[],title:string,evidence?:AttemptEvidence)=>void;
  completeProjectStage:(projectId:string,stageId:string,title:string)=>void;
  recordHint:(exerciseId:string,level:number)=>void;
  recordSolutionReveal:(exerciseId:string)=>void;
  setDraft:(key:string,source:string)=>void;
  toggleBookmark:(type:Bookmark['type'],targetId:string)=>void;
  touchReference:(title:string)=>void;
  updateSettings:(patch:Partial<Settings>)=>void;
  importProgress:(raw:string)=>{ok:boolean;message:string};
  resetProgress:()=>void;
};

const defaultSettings:Settings={textSize:'medium',wordWrap:true,autoClose:true,lineNumbers:true};
const defaultOnboarding:OnboardingProfile={goals:[],experience:null,placementScore:null,placementTotal:0,placementEvidence:{},recommendedLessonId:null,completedAt:null};
const pad2=(value:number)=>String(value).padStart(2,'0');
const today=()=>{const date=new Date();return `${date.getFullYear()}-${pad2(date.getMonth()+1)}-${pad2(date.getDate())}`;};
const localDate=(value:string)=>{const [year,month,day]=value.split('-').map(Number);return new Date(year,month-1,day,12);};
const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
const unique=(values:string[],value:string)=>values.includes(value)?values:[...values,value];
const historyItem=(text:string,kind:HistoryEntry['kind']):HistoryEntry=>({id:crypto.randomUUID(),at:new Date().toISOString(),text,kind});

function nextStreak(streak:AppState['streak']){
  const current=today();
  if(streak.lastActive===current)return streak;
  if(!streak.lastActive)return {count:1,lastActive:current};
  const diff=Math.round((localDate(current).getTime()-localDate(streak.lastActive).getTime())/86400000);
  return {count:diff===1?streak.count+1:1,lastActive:current};
}

const emptyMastery=():ConceptMastery=>({
  score:.3,attempts:0,successes:0,mistakeCount:0,lastPracticed:null,stability:1,nextReview:null,
  independentSuccesses:0,hintedSuccesses:0,transferSuccesses:0,projectSuccesses:0,solutionReveals:0,lastEvidence:null
});

function normalizeMastery(value:Partial<ConceptMastery>|undefined):ConceptMastery{
  const base=emptyMastery();
  if(!value)return base;
  return {
    score:typeof value.score==='number'?value.score:base.score,
    attempts:typeof value.attempts==='number'?value.attempts:0,
    successes:typeof value.successes==='number'?value.successes:0,
    mistakeCount:typeof value.mistakeCount==='number'?value.mistakeCount:0,
    lastPracticed:typeof value.lastPracticed==='string'?value.lastPracticed:null,
    stability:typeof value.stability==='number'?value.stability:1,
    nextReview:typeof value.nextReview==='string'?value.nextReview:null,
    independentSuccesses:typeof value.independentSuccesses==='number'?value.independentSuccesses:0,
    hintedSuccesses:typeof value.hintedSuccesses==='number'?value.hintedSuccesses:0,
    transferSuccesses:typeof value.transferSuccesses==='number'?value.transferSuccesses:0,
    projectSuccesses:typeof value.projectSuccesses==='number'?value.projectSuccesses:0,
    solutionReveals:typeof value.solutionReveals==='number'?value.solutionReveals:0,
    lastEvidence:value.lastEvidence??null
  };
}

function evidenceStrength(evidence:MasteryEvidence){
  if(evidence.outcome==='failure')return 0;
  let strength=evidence.independence==='independent'?.9:evidence.independence==='hinted'?.58:.24;
  if(evidence.context==='transfer')strength+=.08;
  if(evidence.context==='project')strength+=.1;
  if(evidence.context==='placement')strength-=.06;
  if(evidence.realCompile)strength+=.04;
  return clamp(strength,.18,1);
}

export function updateConceptMastery(previous:ConceptMastery|undefined,ok:boolean,now=new Date(),partialEvidence:AttemptEvidence={}):ConceptMastery{
  const base=normalizeMastery(previous);
  const evidence:MasteryEvidence={
    outcome:ok?'success':'failure',
    independence:partialEvidence.independence??'independent',
    context:partialEvidence.context??'practice',
    realCompile:partialEvidence.realCompile??false
  };
  const attempts=base.attempts+1;
  const successes=base.successes+(ok?1:0);
  const mistakeCount=base.mistakeCount+(ok?0:1);
  const strength=evidenceStrength(evidence);
  const learningRate=attempts<4?.28:.16;
  const target=ok?strength:0;
  const score=clamp(base.score*(1-learningRate)+target*learningRate,0,1);
  const successGrowth=1+strength*(.14+score*.28);
  const stability=clamp(ok?base.stability*successGrowth:base.stability*.58,.5,90);
  const intervalFactor=!ok?1:strength>=.92?3:strength>=.7?2:1;
  const intervalDays=ok?Math.max(1,Math.round(stability*intervalFactor)):1;
  const nextReview=new Date(now);nextReview.setDate(nextReview.getDate()+intervalDays);
  return {
    score,attempts,successes,mistakeCount,lastPracticed:now.toISOString(),stability,nextReview:nextReview.toISOString(),
    independentSuccesses:base.independentSuccesses+(ok&&evidence.independence==='independent'?1:0),
    hintedSuccesses:base.hintedSuccesses+(ok&&evidence.independence==='hinted'?1:0),
    transferSuccesses:base.transferSuccesses+(ok&&evidence.context==='transfer'?1:0),
    projectSuccesses:base.projectSuccesses+(ok&&evidence.context==='project'?1:0),
    solutionReveals:base.solutionReveals+(evidence.independence==='revealed'?1:0),
    lastEvidence:evidence
  };
}

export const useAppStore=create<AppState>()(persist((set)=>({
  version:3,
  onboarded:false,onboarding:defaultOnboarding,
  completedLessons:[],completedExercises:[],completedProjectStages:{},currentLessonId:'what-is-latex',bookmarks:[],attempts:{},successfulAttempts:{},hintsUsed:{},solutionReveals:{},drafts:{},conceptScores:{},conceptMastery:{},history:[],streak:{count:0,lastActive:null},settings:defaultSettings,
  setOnboarded:()=>set({onboarded:true}),
  completeOnboarding:(profile)=>set(state=>{
    const conceptMastery={...state.conceptMastery};
    const conceptScores={...state.conceptScores};
    const now=new Date();
    for(const [conceptId,correct] of Object.entries(profile.placementEvidence)){
      conceptMastery[conceptId]=updateConceptMastery(conceptMastery[conceptId],correct,now,{independence:'independent',context:'placement',realCompile:false});
      conceptScores[conceptId]=(conceptScores[conceptId]??0)+(correct?1:-1);
    }
    return {onboarded:true,onboarding:{...profile,completedAt:now.toISOString()},currentLessonId:profile.recommendedLessonId??'what-is-latex',conceptMastery,conceptScores};
  }),
  retakeOnboarding:()=>set({onboarded:false,onboarding:{...defaultOnboarding,placementEvidence:{}}}),
  setCurrentLesson:(id)=>set({currentLessonId:id}),
  completeLesson:(id,title)=>set(state=>({completedLessons:unique(state.completedLessons,id),currentLessonId:id,history:[historyItem(`Пройден урок «${title}»`,'lesson'),...state.history].slice(0,100),streak:nextStreak(state.streak)})),
  recordExerciseAttempt:(exerciseId,ok,concepts,title,evidence)=>set(state=>{
    const attempts={...state.attempts,[exerciseId]:(state.attempts[exerciseId]??0)+1};
    const successfulAttempts={...state.successfulAttempts};
    if(ok)successfulAttempts[exerciseId]=(successfulAttempts[exerciseId]??0)+1;
    const conceptScores={...state.conceptScores};
    const conceptMastery={...state.conceptMastery};
    const now=new Date();
    for(const conceptId of concepts){
      conceptScores[conceptId]=(conceptScores[conceptId]??0)+(ok?1:-1);
      conceptMastery[conceptId]=updateConceptMastery(conceptMastery[conceptId],ok,now,evidence);
    }
    return {attempts,successfulAttempts,conceptScores,conceptMastery,completedExercises:ok?unique(state.completedExercises,exerciseId):state.completedExercises,history:ok?[historyItem(`Решена задача «${title}»`,'exercise'),...state.history].slice(0,100):state.history,streak:nextStreak(state.streak)};
  }),
  completeProjectStage:(projectId,stageId,title)=>set(state=>({completedProjectStages:{...state.completedProjectStages,[projectId]:unique(state.completedProjectStages[projectId]??[],stageId)},history:[historyItem(`Завершён этап проекта «${title}»`,'exercise'),...state.history].slice(0,100),streak:nextStreak(state.streak)})),
  recordHint:(exerciseId,level)=>set(state=>({hintsUsed:{...state.hintsUsed,[exerciseId]:Math.max(level,state.hintsUsed[exerciseId]??0)}})),
  recordSolutionReveal:(exerciseId)=>set(state=>({solutionReveals:{...state.solutionReveals,[exerciseId]:(state.solutionReveals[exerciseId]??0)+1}})),
  setDraft:(key,source)=>set(state=>({drafts:{...state.drafts,[key]:source}})),
  toggleBookmark:(type,targetId)=>set(state=>{const id=`${type}:${targetId}`;const exists=state.bookmarks.some(bookmark=>bookmark.id===id);return {bookmarks:exists?state.bookmarks.filter(bookmark=>bookmark.id!==id):[...state.bookmarks,{id,type,targetId,createdAt:new Date().toISOString()}]};}),
  touchReference:(title)=>set(state=>({history:[historyItem(`Изучена команда ${title}`,'reference'),...state.history].slice(0,100),streak:nextStreak(state.streak)})),
  updateSettings:(patch)=>set(state=>({settings:{...state.settings,...patch}})),
  importProgress:(raw)=>{
    try{
      const parsed=JSON.parse(raw) as Record<string,unknown>;
      if(!parsed||typeof parsed!=='object')throw new Error('invalid');
      const progress=(parsed.progress&&typeof parsed.progress==='object'?parsed.progress:parsed) as Partial<AppState>;
      const projects=(parsed.projects&&typeof parsed.projects==='object'?parsed.projects:{}) as {completedStages?:ProjectProgress;drafts?:Record<string,string>};
      const importedMastery=progress.conceptMastery??{};
      const conceptMastery=Object.fromEntries(Object.entries(importedMastery).map(([id,value])=>[id,normalizeMastery(value)]));
      set(state=>({
        onboarded:progress.onboarded??state.onboarded,
        onboarding:progress.onboarding??state.onboarding,
        completedLessons:Array.isArray(progress.completedLessons)?progress.completedLessons:state.completedLessons,
        completedExercises:Array.isArray(progress.completedExercises)?progress.completedExercises:state.completedExercises,
        completedProjectStages:projects.completedStages??progress.completedProjectStages??state.completedProjectStages,
        currentLessonId:typeof progress.currentLessonId==='string'?progress.currentLessonId:state.currentLessonId,
        bookmarks:Array.isArray(progress.bookmarks)?progress.bookmarks:state.bookmarks,
        attempts:progress.attempts??state.attempts,successfulAttempts:progress.successfulAttempts??state.successfulAttempts,
        hintsUsed:progress.hintsUsed??state.hintsUsed,solutionReveals:progress.solutionReveals??state.solutionReveals,
        drafts:{...state.drafts,...(progress.drafts??{}),...(projects.drafts??{})},conceptScores:progress.conceptScores??state.conceptScores,conceptMastery,
        history:Array.isArray(progress.history)?progress.history:state.history,streak:progress.streak??state.streak,settings:{...state.settings,...((parsed.settings??progress.settings) as Partial<Settings>|undefined)}
      }));
      return {ok:true,message:'Прогресс импортирован.'};
    }catch{return {ok:false,message:'Файл прогресса имеет неверный формат.'};}
  },
  resetProgress:()=>set({onboarded:false,onboarding:{...defaultOnboarding,placementEvidence:{}},completedLessons:[],completedExercises:[],completedProjectStages:{},currentLessonId:'what-is-latex',bookmarks:[],attempts:{},successfulAttempts:{},hintsUsed:{},solutionReveals:{},drafts:{},conceptScores:{},conceptMastery:{},history:[],streak:{count:0,lastActive:null}})
}),{
  name:'latex-gym-state',version:3,storage:createJSONStorage(()=>localStorage),
  migrate:(persisted,version)=>{
    const state=(persisted??{}) as Record<string,unknown>;
    const rawMastery=(state.conceptMastery??{}) as Record<string,Partial<ConceptMastery>>;
    const conceptMastery=Object.fromEntries(Object.entries(rawMastery).map(([id,value])=>[id,normalizeMastery(value)]));
    const oldOnboarding=(state.onboarding??{}) as Partial<OnboardingProfile>;
    const onboarding:OnboardingProfile={...defaultOnboarding,...oldOnboarding,goals:Array.isArray(oldOnboarding.goals)?oldOnboarding.goals:[],placementEvidence:oldOnboarding.placementEvidence??{}};
    return {...state,version:3,onboarding,completedProjectStages:state.completedProjectStages??{},solutionReveals:state.solutionReveals??{},conceptMastery} as unknown as AppState;
  }
}));

export function exportProgress(){
  const state=useAppStore.getState();
  const projectDrafts=Object.fromEntries(Object.entries(state.drafts).filter(([key])=>key.startsWith('project:')));
  const otherDrafts=Object.fromEntries(Object.entries(state.drafts).filter(([key])=>!key.startsWith('project:')));
  return JSON.stringify({
    schemaVersion:3,
    exportedAt:new Date().toISOString(),
    progress:{
      onboarded:state.onboarded,onboarding:state.onboarding,completedLessons:state.completedLessons,completedExercises:state.completedExercises,currentLessonId:state.currentLessonId,
      bookmarks:state.bookmarks,attempts:state.attempts,successfulAttempts:state.successfulAttempts,hintsUsed:state.hintsUsed,solutionReveals:state.solutionReveals,
      drafts:otherDrafts,conceptScores:state.conceptScores,conceptMastery:state.conceptMastery,history:state.history,streak:state.streak
    },
    projects:{completedStages:state.completedProjectStages,drafts:projectDrafts},
    settings:state.settings
  },null,2);
}
