import { canonicalExerciseId, migrateDocumentKey, migrateExerciseIdList, migrateExerciseKeyedRecord, migrateLegacyDraftRecord } from '../data/exerciseIdentity';
import type { Bookmark, ConceptMastery, HistoryEntry } from '../types';

export const PERSISTENCE_SCHEMA_VERSION=5;
export type PersistedSettings={textSize:'small'|'medium'|'large';wordWrap:boolean;autoClose:boolean;lineNumbers:boolean};
export type PersistedOnboarding={goals:string[];experience:'new'|'basic'|'regular'|'advanced'|null;placementScore:number|null;placementTotal:number;placementEvidence:Record<string,boolean>;recommendedLessonId:string|null;completedAt:string|null};
export type ParsedProgressImport={
  schemaVersion:number;
  onboarded?:boolean;
  onboarding?:Partial<PersistedOnboarding>;
  completedLessons?:string[];
  completedExercises?:string[];
  completedProjectStages?:Record<string,string[]>;
  currentLessonId?:string;
  bookmarks?:Bookmark[];
  attempts?:Record<string,number>;
  successfulAttempts?:Record<string,number>;
  hintsUsed?:Record<string,number>;
  solutionReveals?:Record<string,number>;
  conceptScores?:Record<string,number>;
  conceptMastery?:Record<string,Partial<ConceptMastery>>;
  history?:HistoryEntry[];
  streak?:{count:number;lastActive:string|null};
  settings?:Partial<PersistedSettings>;
  documents:Record<string,string>;
};

export function parseProgressImport(raw:string):{ok:true;value:ParsedProgressImport}|{ok:false;message:string}{
  let parsed:unknown;
  try{parsed=JSON.parse(raw);}catch{return {ok:false,message:'Файл прогресса не является корректным JSON.'};}
  if(!isRecord(parsed))return {ok:false,message:'Файл прогресса должен содержать объект.'};
  const schemaVersion=finiteInteger(parsed.schemaVersion,0);
  if(schemaVersion>PERSISTENCE_SCHEMA_VERSION)return {ok:false,message:`Этот экспорт создан более новой версией LaTeX Gym (схема ${schemaVersion}). Обновите приложение перед импортом.`};

  const progress=isRecord(parsed.progress)?parsed.progress:parsed;
  const projects=isRecord(parsed.projects)?parsed.projects:{};
  const output:ParsedProgressImport={schemaVersion,documents:{}};

  if(typeof progress.onboarded==='boolean')output.onboarded=progress.onboarded;
  if(isRecord(progress.onboarding))output.onboarding=sanitizeOnboarding(progress.onboarding);
  if(Array.isArray(progress.completedLessons))output.completedLessons=stringArray(progress.completedLessons);
  if(Array.isArray(progress.completedExercises))output.completedExercises=migrateExerciseIdList(stringArray(progress.completedExercises));
  const projectProgress=isRecord(projects.completedStages)?projects.completedStages:isRecord(progress.completedProjectStages)?progress.completedProjectStages:null;
  if(projectProgress)output.completedProjectStages=stringArrayRecord(projectProgress);
  if(typeof progress.currentLessonId==='string'&&progress.currentLessonId.trim())output.currentLessonId=progress.currentLessonId;
  if(Array.isArray(progress.bookmarks))output.bookmarks=sanitizeBookmarks(progress.bookmarks);
  if(isRecord(progress.attempts))output.attempts=exerciseCounter(progress.attempts,'sum');
  if(isRecord(progress.successfulAttempts))output.successfulAttempts=exerciseCounter(progress.successfulAttempts,'sum');
  if(isRecord(progress.hintsUsed))output.hintsUsed=exerciseCounter(progress.hintsUsed,'max');
  if(isRecord(progress.solutionReveals))output.solutionReveals=exerciseCounter(progress.solutionReveals,'sum');
  if(isRecord(progress.conceptScores))output.conceptScores=numberRecord(progress.conceptScores,true);
  if(isRecord(progress.conceptMastery))output.conceptMastery=masteryRecord(progress.conceptMastery);
  if(Array.isArray(progress.history))output.history=sanitizeHistory(progress.history);
  if(isRecord(progress.streak))output.streak={count:finiteInteger(progress.streak.count,0,0),lastActive:nullableDate(progress.streak.lastActive)};
  const settings=isRecord(parsed.settings)?parsed.settings:isRecord(progress.settings)?progress.settings:null;
  if(settings)output.settings=sanitizeSettings(settings);

  const documents=isRecord(parsed.documents)?stringRecord(parsed.documents):{};
  const progressDrafts=isRecord(progress.drafts)?migrateLegacyDraftRecord(stringRecord(progress.drafts)):{};
  const projectDrafts=isRecord(projects.drafts)?migrateLegacyDraftRecord(stringRecord(projects.drafts)):{};
  for(const [key,value] of Object.entries({...progressDrafts,...projectDrafts,...documents}))output.documents[migrateDocumentKey(key)]=value;
  return {ok:true,value:output};
}

export function sanitizePersistedState(value:unknown){
  if(!isRecord(value))return {};
  const parsed=parseProgressImport(JSON.stringify(value));
  return parsed.ok?parsed.value:{};
}

function sanitizeOnboarding(value:Record<string,unknown>):Partial<PersistedOnboarding>{
  const result:Partial<PersistedOnboarding>={};
  if(Array.isArray(value.goals))result.goals=stringArray(value.goals);
  if(value.experience===null||['new','basic','regular','advanced'].includes(String(value.experience)))result.experience=value.experience as PersistedOnboarding['experience'];
  if(value.placementScore===null||isFiniteNumber(value.placementScore))result.placementScore=value.placementScore===null?null:finiteInteger(value.placementScore,0,0);
  if(isFiniteNumber(value.placementTotal))result.placementTotal=finiteInteger(value.placementTotal,0,0);
  if(isRecord(value.placementEvidence))result.placementEvidence=booleanRecord(value.placementEvidence);
  if(value.recommendedLessonId===null||typeof value.recommendedLessonId==='string')result.recommendedLessonId=value.recommendedLessonId as string|null;
  if(value.completedAt===null||isDateString(value.completedAt))result.completedAt=value.completedAt as string|null;
  return result;
}
function sanitizeSettings(value:Record<string,unknown>):Partial<PersistedSettings>{
  const result:Partial<PersistedSettings>={};
  if(['small','medium','large'].includes(String(value.textSize)))result.textSize=value.textSize as PersistedSettings['textSize'];
  if(typeof value.wordWrap==='boolean')result.wordWrap=value.wordWrap;
  if(typeof value.autoClose==='boolean')result.autoClose=value.autoClose;
  if(typeof value.lineNumbers==='boolean')result.lineNumbers=value.lineNumbers;
  return result;
}
function sanitizeBookmarks(values:unknown[]):Bookmark[]{
  const result:Bookmark[]=[];const seen=new Set<string>();
  for(const value of values){
    if(!isRecord(value)||!['lesson','exercise','reference'].includes(String(value.type))||typeof value.targetId!=='string')continue;
    const type=value.type as Bookmark['type'];const targetId=type==='exercise'?canonicalExerciseId(value.targetId):value.targetId;if(!targetId)continue;
    const id=`${type}:${targetId}`;if(seen.has(id))continue;seen.add(id);
    result.push({id,type,targetId,createdAt:isDateString(value.createdAt)?value.createdAt:new Date(0).toISOString()});
  }
  return result;
}
function sanitizeHistory(values:unknown[]):HistoryEntry[]{
  const result:HistoryEntry[]=[];
  for(const value of values){if(!isRecord(value)||typeof value.text!=='string'||!['lesson','exercise','reference'].includes(String(value.kind)))continue;result.push({id:typeof value.id==='string'?value.id:crypto.randomUUID(),at:isDateString(value.at)?value.at:new Date(0).toISOString(),text:value.text,kind:value.kind as HistoryEntry['kind']});if(result.length>=100)break;}
  return result;
}
function exerciseCounter(value:Record<string,unknown>,mode:'sum'|'max'){
  const raw:Record<string,number>={};for(const [id,count] of Object.entries(value))if(isFiniteNumber(count))raw[id]=finiteInteger(count,0,0);
  return migrateExerciseKeyedRecord(raw,(left,right)=>mode==='sum'?(left??0)+right:Math.max(left??0,right));
}
function masteryRecord(value:Record<string,unknown>){const result:Record<string,Partial<ConceptMastery>>={};for(const [id,item] of Object.entries(value))if(isRecord(item))result[id]=sanitizeMastery(item);return result;}
function sanitizeMastery(value:Record<string,unknown>):Partial<ConceptMastery>{
  const out:Partial<ConceptMastery>={};
  for(const key of ['score','attempts','successes','mistakeCount','stability','independentSuccesses','hintedSuccesses','transferSuccesses','projectSuccesses','solutionReveals'] as const)if(isFiniteNumber(value[key]))out[key]=Number(value[key]) as never;
  if(value.lastPracticed===null||isDateString(value.lastPracticed))out.lastPracticed=value.lastPracticed as string|null;
  if(value.nextReview===null||isDateString(value.nextReview))out.nextReview=value.nextReview as string|null;
  if(value.lastEvidence===null||isRecord(value.lastEvidence))out.lastEvidence=value.lastEvidence as ConceptMastery['lastEvidence'];
  return out;
}
function stringArrayRecord(value:Record<string,unknown>){const result:Record<string,string[]>={};for(const [key,item] of Object.entries(value))if(Array.isArray(item))result[key]=stringArray(item);return result;}
function stringRecord(value:Record<string,unknown>){const result:Record<string,string>={};for(const [key,item] of Object.entries(value))if(typeof item==='string')result[key]=item;return result;}
function booleanRecord(value:Record<string,unknown>){const result:Record<string,boolean>={};for(const [key,item] of Object.entries(value))if(typeof item==='boolean')result[key]=item;return result;}
function numberRecord(value:Record<string,unknown>,allowNegative=false){const result:Record<string,number>={};for(const [key,item] of Object.entries(value))if(isFiniteNumber(item)&&(allowNegative||item>=0))result[key]=Number(item);return result;}
function stringArray(value:unknown[]){return [...new Set(value.filter((item):item is string=>typeof item==='string'&&Boolean(item.trim())))];}
function nullableDate(value:unknown){return value===null?null:isDateString(value)?value:null;}
function isDateString(value:unknown):value is string{return typeof value==='string'&&Number.isFinite(Date.parse(value));}
function isFiniteNumber(value:unknown):value is number{return typeof value==='number'&&Number.isFinite(value);}
function finiteInteger(value:unknown,fallback=0,min=Number.MIN_SAFE_INTEGER){return isFiniteNumber(value)?Math.max(min,Math.trunc(value)):fallback;}
function isRecord(value:unknown):value is Record<string,unknown>{return Boolean(value)&&typeof value==='object'&&!Array.isArray(value);}
