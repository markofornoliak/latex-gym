import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { canonicalConceptId } from '../data/conceptAliases';
import { canonicalExerciseId, migrateExerciseIdList, migrateExerciseKeyedRecord } from '../data/exerciseIdentity';
import { documentRepository, migrateLegacyDocuments } from '../services/documentRepository';
import type { Bookmark, ConceptMastery, HistoryEntry, MasteryEvidence } from '../types';
import { parseProgressImport, PERSISTENCE_SCHEMA_VERSION, sanitizePersistedState, type PersistedOnboarding, type PersistedSettings } from './persistenceSchema';

type Settings=PersistedSettings;
type ProjectProgress=Record<string,string[]>;
type AttemptEvidence=Partial<Omit<MasteryEvidence,'outcome'>>;
export type OnboardingExperience='new'|'basic'|'regular'|'advanced';
export type OnboardingProfile=PersistedOnboarding;

type AppState={
  version:number;onboarded:boolean;onboarding:OnboardingProfile;completedLessons:string[];completedExercises:string[];completedProjectStages:ProjectProgress;currentLessonId:string;
  bookmarks:Bookmark[];attempts:Record<string,number>;successfulAttempts:Record<string,number>;hintsUsed:Record<string,number>;solutionReveals:Record<string,number>;
  conceptScores:Record<string,number>;conceptMastery:Record<string,ConceptMastery>;history:HistoryEntry[];streak:{count:number;lastActive:string|null};settings:Settings;
  /** Transitional in-memory payload used once to move v4 drafts to DocumentRepository. Never persisted by v5. */
  legacyDrafts:Record<string,string>;
  setOnboarded:()=>void;completeOnboarding:(profile:Omit<OnboardingProfile,'completedAt'>)=>void;retakeOnboarding:()=>void;setCurrentLesson:(id:string)=>void;
  completeLesson:(id:string,title:string)=>void;recordExerciseAttempt:(exerciseId:string,ok:boolean,concepts:string[],title:string,evidence?:AttemptEvidence)=>void;
  completeProjectStage:(projectId:string,stageId:string,title:string)=>void;recordHint:(exerciseId:string,level:number)=>void;recordSolutionReveal:(exerciseId:string)=>void;
  toggleBookmark:(type:Bookmark['type'],targetId:string)=>void;touchReference:(title:string)=>void;updateSettings:(patch:Partial<Settings>)=>void;
  importProgress:(raw:string)=>Promise<{ok:boolean;message:string}>;resetProgress:()=>void;clearLegacyDrafts:()=>void;
};

const STORE_VERSION=PERSISTENCE_SCHEMA_VERSION;
const defaultSettings:Settings={textSize:'medium',wordWrap:true,autoClose:true,lineNumbers:true};
const defaultOnboarding:OnboardingProfile={goals:[],experience:null,placementScore:null,placementTotal:0,placementEvidence:{},recommendedLessonId:null,completedAt:null};
const pad2=(value:number)=>String(value).padStart(2,'0');
const today=()=>{const date=new Date();return `${date.getFullYear()}-${pad2(date.getMonth()+1)}-${pad2(date.getDate())}`;};
const localDate=(value:string)=>{const [year,month,day]=value.split('-').map(Number);return new Date(year,month-1,day,12);};
const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
const unique=(values:string[],value:string)=>values.includes(value)?values:[...values,value];
const historyItem=(text:string,kind:HistoryEntry['kind']):HistoryEntry=>({id:crypto.randomUUID(),at:new Date().toISOString(),text,kind});
const canonicalKey=(value:string)=>canonicalConceptId(value.trim().toLocaleLowerCase('en').replace(/_/g,'-'));

function nextStreak(streak:AppState['streak']){
  const current=today();if(streak.lastActive===current)return streak;if(!streak.lastActive)return {count:1,lastActive:current};
  const diff=Math.round((localDate(current).getTime()-localDate(streak.lastActive).getTime())/86400000);return {count:diff===1?streak.count+1:1,lastActive:current};
}

const emptyMastery=():ConceptMastery=>({score:.3,attempts:0,successes:0,mistakeCount:0,lastPracticed:null,stability:1,nextReview:null,independentSuccesses:0,hintedSuccesses:0,transferSuccesses:0,projectSuccesses:0,solutionReveals:0,lastEvidence:null});
function normalizeMastery(value:Partial<ConceptMastery>|undefined):ConceptMastery{
  const base=emptyMastery();if(!value)return base;
  return {score:typeof value.score==='number'?clamp(value.score,0,1):base.score,attempts:typeof value.attempts==='number'?Math.max(0,value.attempts):0,successes:typeof value.successes==='number'?Math.max(0,value.successes):0,mistakeCount:typeof value.mistakeCount==='number'?Math.max(0,value.mistakeCount):0,lastPracticed:typeof value.lastPracticed==='string'?value.lastPracticed:null,stability:typeof value.stability==='number'?Math.max(.5,value.stability):1,nextReview:typeof value.nextReview==='string'?value.nextReview:null,independentSuccesses:typeof value.independentSuccesses==='number'?Math.max(0,value.independentSuccesses):0,hintedSuccesses:typeof value.hintedSuccesses==='number'?Math.max(0,value.hintedSuccesses):0,transferSuccesses:typeof value.transferSuccesses==='number'?Math.max(0,value.transferSuccesses):0,projectSuccesses:typeof value.projectSuccesses==='number'?Math.max(0,value.projectSuccesses):0,solutionReveals:typeof value.solutionReveals==='number'?Math.max(0,value.solutionReveals):0,lastEvidence:value.lastEvidence??null};
}
export function migrateConceptScores(raw:Record<string,number>|undefined){const migrated:Record<string,number>={};for(const [legacyId,value] of Object.entries(raw??{})){if(typeof value!=='number'||!Number.isFinite(value))continue;const id=canonicalKey(legacyId);migrated[id]=(migrated[id]??0)+value;}return migrated;}
export function migrateConceptMastery(raw:Record<string,Partial<ConceptMastery>>|undefined){const migrated:Record<string,ConceptMastery>={};for(const [legacyId,value] of Object.entries(raw??{})){const id=canonicalKey(legacyId);migrated[id]=mergeMastery(migrated[id],normalizeMastery(value));}return migrated;}
function migratePlacementEvidence(raw:Record<string,boolean>|undefined){const migrated:Record<string,boolean>={};for(const [legacyId,value] of Object.entries(raw??{})){const id=canonicalKey(legacyId);migrated[id]=id in migrated?migrated[id]&&Boolean(value):Boolean(value);}return migrated;}
function mergeMastery(existing:ConceptMastery|undefined,incoming:ConceptMastery):ConceptMastery{
  if(!existing)return incoming;const leftWeight=Math.max(1,existing.attempts),rightWeight=Math.max(1,incoming.attempts),weight=leftWeight+rightWeight;const latest=isLater(incoming.lastPracticed,existing.lastPracticed)?incoming:existing;
  return {score:clamp((existing.score*leftWeight+incoming.score*rightWeight)/weight,0,1),attempts:existing.attempts+incoming.attempts,successes:existing.successes+incoming.successes,mistakeCount:existing.mistakeCount+incoming.mistakeCount,lastPracticed:latest.lastPracticed,stability:Math.max(existing.stability,incoming.stability),nextReview:earlierDate(existing.nextReview,incoming.nextReview),independentSuccesses:existing.independentSuccesses+incoming.independentSuccesses,hintedSuccesses:existing.hintedSuccesses+incoming.hintedSuccesses,transferSuccesses:existing.transferSuccesses+incoming.transferSuccesses,projectSuccesses:existing.projectSuccesses+incoming.projectSuccesses,solutionReveals:existing.solutionReveals+incoming.solutionReveals,lastEvidence:latest.lastEvidence};
}
function isLater(left:string|null,right:string|null){if(!left)return false;if(!right)return true;return Date.parse(left)>Date.parse(right);}
function earlierDate(left:string|null,right:string|null){if(!left)return right;if(!right)return left;return Date.parse(left)<=Date.parse(right)?left:right;}
function evidenceStrength(evidence:MasteryEvidence){if(evidence.outcome==='failure')return 0;let strength=evidence.independence==='independent'?.9:evidence.independence==='hinted'?.58:.24;if(evidence.context==='transfer')strength+=.08;if(evidence.context==='project')strength+=.1;if(evidence.context==='placement')strength-=.06;if(evidence.realCompile)strength+=.04;return clamp(strength,.18,1);}
export function updateConceptMastery(previous:ConceptMastery|undefined,ok:boolean,now=new Date(),partialEvidence:AttemptEvidence={}):ConceptMastery{
  const base=normalizeMastery(previous);const evidence:MasteryEvidence={outcome:ok?'success':'failure',independence:partialEvidence.independence??'independent',context:partialEvidence.context??'practice',realCompile:partialEvidence.realCompile??false};const attempts=base.attempts+1;const successes=base.successes+(ok?1:0);const mistakeCount=base.mistakeCount+(ok?0:1);const strength=evidenceStrength(evidence);const learningRate=attempts<4?.28:.16;const target=ok?strength:0;const score=clamp(base.score*(1-learningRate)+target*learningRate,0,1);const successGrowth=1+strength*(.14+score*.28);const stability=clamp(ok?base.stability*successGrowth:base.stability*.58,.5,90);const intervalFactor=!ok?1:strength>=.92?3:strength>=.7?2:1;const intervalDays=ok?Math.max(1,Math.round(stability*intervalFactor)):1;const nextReview=new Date(now);nextReview.setDate(nextReview.getDate()+intervalDays);
  return {score,attempts,successes,mistakeCount,lastPracticed:now.toISOString(),stability,nextReview:nextReview.toISOString(),independentSuccesses:base.independentSuccesses+(ok&&evidence.independence==='independent'?1:0),hintedSuccesses:base.hintedSuccesses+(ok&&evidence.independence==='hinted'?1:0),transferSuccesses:base.transferSuccesses+(ok&&evidence.context==='transfer'?1:0),projectSuccesses:base.projectSuccesses+(ok&&evidence.context==='project'?1:0),solutionReveals:base.solutionReveals+(evidence.independence==='revealed'?1:0),lastEvidence:evidence};
}

export const useAppStore=create<AppState>()(persist((set)=>({
  version:STORE_VERSION,onboarded:false,onboarding:defaultOnboarding,completedLessons:[],completedExercises:[],completedProjectStages:{},currentLessonId:'what-is-latex',bookmarks:[],attempts:{},successfulAttempts:{},hintsUsed:{},solutionReveals:{},conceptScores:{},conceptMastery:{},history:[],streak:{count:0,lastActive:null},settings:defaultSettings,legacyDrafts:{},
  setOnboarded:()=>set({onboarded:true}),
  completeOnboarding:(profile)=>set(state=>{const conceptMastery={...state.conceptMastery};const conceptScores={...state.conceptScores};const placementEvidence=migratePlacementEvidence(profile.placementEvidence);const now=new Date();for(const [conceptId,correct] of Object.entries(placementEvidence)){conceptMastery[conceptId]=updateConceptMastery(conceptMastery[conceptId],correct,now,{independence:'independent',context:'placement',realCompile:false});conceptScores[conceptId]=(conceptScores[conceptId]??0)+(correct?1:-1);}return {onboarded:true,onboarding:{...profile,placementEvidence,completedAt:now.toISOString()},currentLessonId:profile.recommendedLessonId??'what-is-latex',conceptMastery,conceptScores};}),
  retakeOnboarding:()=>set({onboarded:false,onboarding:{...defaultOnboarding,placementEvidence:{}}}),setCurrentLesson:(id)=>set({currentLessonId:id}),
  completeLesson:(id,title)=>set(state=>({completedLessons:unique(state.completedLessons,id),currentLessonId:id,history:[historyItem(`Пройден урок «${title}»`,'lesson'),...state.history].slice(0,100),streak:nextStreak(state.streak)})),
  recordExerciseAttempt:(rawExerciseId,ok,concepts,title,evidence)=>set(state=>{const exerciseId=canonicalExerciseId(rawExerciseId);const attempts={...state.attempts,[exerciseId]:(state.attempts[exerciseId]??0)+1};const successfulAttempts={...state.successfulAttempts};if(ok)successfulAttempts[exerciseId]=(successfulAttempts[exerciseId]??0)+1;const conceptScores={...state.conceptScores};const conceptMastery={...state.conceptMastery};const now=new Date();for(const rawConceptId of concepts){const conceptId=canonicalKey(rawConceptId);conceptScores[conceptId]=(conceptScores[conceptId]??0)+(ok?1:-1);conceptMastery[conceptId]=updateConceptMastery(conceptMastery[conceptId],ok,now,evidence);}return {attempts,successfulAttempts,conceptScores,conceptMastery,completedExercises:ok?unique(state.completedExercises,exerciseId):state.completedExercises,history:ok?[historyItem(`Решена задача «${title}»`,'exercise'),...state.history].slice(0,100):state.history,streak:nextStreak(state.streak)};}),
  completeProjectStage:(projectId,stageId,title)=>set(state=>({completedProjectStages:{...state.completedProjectStages,[projectId]:unique(state.completedProjectStages[projectId]??[],stageId)},history:[historyItem(`Завершён этап проекта «${title}»`,'exercise'),...state.history].slice(0,100),streak:nextStreak(state.streak)})),
  recordHint:(rawExerciseId,level)=>set(state=>{const exerciseId=canonicalExerciseId(rawExerciseId);return {hintsUsed:{...state.hintsUsed,[exerciseId]:Math.max(level,state.hintsUsed[exerciseId]??0)}};}),
  recordSolutionReveal:(rawExerciseId)=>set(state=>{const exerciseId=canonicalExerciseId(rawExerciseId);return {solutionReveals:{...state.solutionReveals,[exerciseId]:(state.solutionReveals[exerciseId]??0)+1}};}),
  toggleBookmark:(type,rawTargetId)=>set(state=>{const targetId=type==='exercise'?canonicalExerciseId(rawTargetId):rawTargetId;const id=`${type}:${targetId}`;const exists=state.bookmarks.some(bookmark=>bookmark.id===id);return {bookmarks:exists?state.bookmarks.filter(bookmark=>bookmark.id!==id):[...state.bookmarks,{id,type,targetId,createdAt:new Date().toISOString()}]};}),
  touchReference:(title)=>set(state=>({history:[historyItem(`Изучена команда ${title}`,'reference'),...state.history].slice(0,100),streak:nextStreak(state.streak)})),updateSettings:(patch)=>set(state=>({settings:{...state.settings,...patch}})),
  importProgress:async(raw)=>{
    const parsed=parseProgressImport(raw);if(!parsed.ok)return {ok:false,message:parsed.message};const incoming=parsed.value;
    try{await documentRepository.setMany(incoming.documents);}catch{return {ok:false,message:'Не удалось сохранить импортированные документы в локальное хранилище браузера.'};}
    const importedMastery=migrateConceptMastery(incoming.conceptMastery);const importedScores=migrateConceptScores(incoming.conceptScores);
    set(state=>({
      onboarded:incoming.onboarded??state.onboarded,onboarding:incoming.onboarding?{...state.onboarding,...incoming.onboarding,placementEvidence:migratePlacementEvidence(incoming.onboarding.placementEvidence??state.onboarding.placementEvidence)}:state.onboarding,
      completedLessons:incoming.completedLessons??state.completedLessons,completedExercises:incoming.completedExercises??state.completedExercises,completedProjectStages:incoming.completedProjectStages??state.completedProjectStages,currentLessonId:incoming.currentLessonId??state.currentLessonId,
      bookmarks:incoming.bookmarks??state.bookmarks,attempts:incoming.attempts??state.attempts,successfulAttempts:incoming.successfulAttempts??state.successfulAttempts,hintsUsed:incoming.hintsUsed??state.hintsUsed,solutionReveals:incoming.solutionReveals??state.solutionReveals,
      conceptScores:{...state.conceptScores,...importedScores},conceptMastery:{...state.conceptMastery,...importedMastery},history:incoming.history??state.history,streak:incoming.streak??state.streak,settings:{...state.settings,...incoming.settings}
    }));
    return {ok:true,message:'Прогресс и документы импортированы.'};
  },
  resetProgress:()=>{void documentRepository.clear();set({version:STORE_VERSION,onboarded:false,onboarding:{...defaultOnboarding,placementEvidence:{}},completedLessons:[],completedExercises:[],completedProjectStages:{},currentLessonId:'what-is-latex',bookmarks:[],attempts:{},successfulAttempts:{},hintsUsed:{},solutionReveals:{},conceptScores:{},conceptMastery:{},history:[],streak:{count:0,lastActive:null},legacyDrafts:{}});},
  clearLegacyDrafts:()=>set({legacyDrafts:{}})
}),{
  name:'latex-gym-state',version:STORE_VERSION,storage:createJSONStorage(()=>localStorage),
  partialize:(state)=>{const {legacyDrafts,...persisted}=state;return persisted;},
  migrate:(persisted)=>{
    const raw=(persisted??{}) as Record<string,unknown>;const sanitized=sanitizePersistedState(raw);const oldOnboarding=sanitized.onboarding??{};
    return {...raw,version:STORE_VERSION,onboarded:sanitized.onboarded??false,onboarding:{...defaultOnboarding,...oldOnboarding,placementEvidence:migratePlacementEvidence(oldOnboarding.placementEvidence??{})},completedLessons:sanitized.completedLessons??[],completedExercises:migrateExerciseIdList(sanitized.completedExercises),completedProjectStages:sanitized.completedProjectStages??{},currentLessonId:sanitized.currentLessonId??'what-is-latex',bookmarks:sanitized.bookmarks??[],attempts:migrateExerciseKeyedRecord(sanitized.attempts,(a,b)=>(a??0)+b),successfulAttempts:migrateExerciseKeyedRecord(sanitized.successfulAttempts,(a,b)=>(a??0)+b),hintsUsed:migrateExerciseKeyedRecord(sanitized.hintsUsed,(a,b)=>Math.max(a??0,b)),solutionReveals:migrateExerciseKeyedRecord(sanitized.solutionReveals,(a,b)=>(a??0)+b),conceptScores:migrateConceptScores(sanitized.conceptScores),conceptMastery:migrateConceptMastery(sanitized.conceptMastery),history:sanitized.history??[],streak:sanitized.streak??{count:0,lastActive:null},settings:{...defaultSettings,...sanitized.settings},legacyDrafts:sanitized.documents} as unknown as AppState;
  }
}));

export async function initializeDocumentPersistence(){
  const state=useAppStore.getState();if(!Object.keys(state.legacyDrafts).length)return;
  try{await migrateLegacyDocuments(state.legacyDrafts);state.clearLegacyDrafts();}catch(error){console.error('LaTeX Gym could not migrate legacy drafts to IndexedDB',error);}
}

export async function exportProgress(){
  const state=useAppStore.getState();const documents=await documentRepository.list();
  return JSON.stringify({schemaVersion:STORE_VERSION,exportedAt:new Date().toISOString(),progress:{onboarded:state.onboarded,onboarding:state.onboarding,completedLessons:state.completedLessons,completedExercises:state.completedExercises,currentLessonId:state.currentLessonId,bookmarks:state.bookmarks,attempts:state.attempts,successfulAttempts:state.successfulAttempts,hintsUsed:state.hintsUsed,solutionReveals:state.solutionReveals,conceptScores:state.conceptScores,conceptMastery:state.conceptMastery,history:state.history,streak:state.streak},projects:{completedStages:state.completedProjectStages},settings:state.settings,documents},null,2);
}
