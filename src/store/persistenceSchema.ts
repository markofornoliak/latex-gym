import { canonicalExerciseId, migrateDocumentKey, migrateExerciseIdList, migrateExerciseKeyedRecord, migrateLegacyDraftRecord } from '../data/exerciseIdentity';
import type { Bookmark, ConceptMastery, HistoryEntry, MasteryEvidence } from '../types';

export const PERSISTENCE_SCHEMA_VERSION=6;
export const IMPORT_LIMITS={
  maxJsonChars:32*1024*1024,
  maxRecordEntries:10_000,
  maxArrayItems:10_000,
  maxDocuments:2_000,
  maxDocumentChars:2*1024*1024,
  maxDocumentTotalChars:24*1024*1024,
  maxKeyChars:512,
  maxTextChars:20_000
} as const;

export type PersistedSettings={textSize:'small'|'medium'|'large';wordWrap:boolean;autoClose:boolean;lineNumbers:boolean};
export type PersistedOnboarding={goals:string[];experience:'new'|'basic'|'regular'|'advanced'|null;placementScore:number|null;placementTotal:number;placementEvidence:Record<string,boolean>;recommendedLessonId:string|null;completedAt:string|null};
export type ParsedProgressImport={
  schemaVersion:number;onboarded?:boolean;onboarding?:Partial<PersistedOnboarding>;completedLessons?:string[];completedExercises?:string[];completedProjectStages?:Record<string,string[]>;currentLessonId?:string;
  bookmarks?:Bookmark[];attempts?:Record<string,number>;successfulAttempts?:Record<string,number>;hintsUsed?:Record<string,number>;solutionReveals?:Record<string,number>;
  conceptScores?:Record<string,number>;conceptMastery?:Record<string,Partial<ConceptMastery>>;history?:HistoryEntry[];streak?:{count:number;lastActive:string|null};settings?:Partial<PersistedSettings>;documents:Record<string,string>;
};

type ParseOptions={enforceRawLimit:boolean};

export function parseProgressImport(raw:string):{ok:true;value:ParsedProgressImport}|{ok:false;message:string}{
  return parseProgress(raw,{enforceRawLimit:true});
}

function parseProgress(raw:string,options:ParseOptions):{ok:true;value:ParsedProgressImport}|{ok:false;message:string}{
  if(options.enforceRawLimit&&raw.length>IMPORT_LIMITS.maxJsonChars)return {ok:false,message:'Файл прогресса слишком большой для безопасного импорта.'};
  let parsed:unknown;try{parsed=JSON.parse(raw);}catch{return {ok:false,message:'Файл прогресса не является корректным JSON.'};}
  if(!isRecord(parsed))return {ok:false,message:'Файл прогресса должен содержать объект.'};
  const boundsProblem=importBoundsProblem(parsed);
  if(boundsProblem)return {ok:false,message:boundsProblem};
  const schemaVersion=finiteInteger(parsed.schemaVersion,0,0);
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
  if(typeof progress.currentLessonId==='string'&&progress.currentLessonId.trim())output.currentLessonId=boundedText(progress.currentLessonId,IMPORT_LIMITS.maxKeyChars);
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
  for(const [key,value] of Object.entries({...progressDrafts,...projectDrafts,...documents})){
    const migrated=migrateDocumentKey(key);
    if(safeRecordKey(migrated))output.documents[migrated]=value;
  }
  return {ok:true,value:output};
}

export function sanitizePersistedState(value:unknown):Partial<ParsedProgressImport>{
  if(!isRecord(value))return {};
  const raw=JSON.stringify(value);
  const parsed=parseProgress(raw,{enforceRawLimit:false});
  return parsed.ok?parsed.value:{};
}

function importBoundsProblem(root:Record<string,unknown>):string|null{
  const progress=isRecord(root.progress)?root.progress:root;
  const projects=isRecord(root.projects)?root.projects:{};
  const boundedRecords=[
    progress.attempts,progress.successfulAttempts,progress.hintsUsed,progress.solutionReveals,progress.conceptScores,progress.conceptMastery,
    progress.placementEvidence,progress.completedProjectStages,projects.completedStages
  ];
  for(const value of boundedRecords){
    if(isRecord(value)&&Object.keys(value).length>IMPORT_LIMITS.maxRecordEntries)return 'Файл прогресса содержит слишком много записей в одном разделе.';
    if(isRecord(value)&&Object.keys(value).some(key=>!safeRecordKey(key)))return 'Файл прогресса содержит недопустимый ключ.';
  }
  const boundedArrays=[progress.completedLessons,progress.completedExercises,progress.bookmarks,progress.history];
  for(const value of boundedArrays)if(Array.isArray(value)&&value.length>IMPORT_LIMITS.maxArrayItems)return 'Файл прогресса содержит слишком большой список.';

  const documentSources=[root.documents,progress.drafts,projects.drafts].filter(isRecord);
  let documentCount=0;let totalChars=0;
  for(const source of documentSources){
    for(const [key,value] of Object.entries(source)){
      documentCount++;
      if(documentCount>IMPORT_LIMITS.maxDocuments)return 'Файл прогресса содержит слишком много локальных документов.';
      if(!safeRecordKey(key))return 'Файл прогресса содержит недопустимый ключ документа.';
      if(typeof value!=='string')continue;
      if(value.length>IMPORT_LIMITS.maxDocumentChars)return `Документ «${key.slice(0,80)}» слишком большой для безопасного импорта.`;
      totalChars+=value.length;
      if(totalChars>IMPORT_LIMITS.maxDocumentTotalChars)return 'Суммарный объём локальных документов слишком большой для безопасного импорта.';
    }
  }
  return null;
}

function sanitizeOnboarding(value:Record<string,unknown>):Partial<PersistedOnboarding>{
  const result:Partial<PersistedOnboarding>={};
  if(Array.isArray(value.goals))result.goals=stringArray(value.goals);
  if(value.experience===null||['new','basic','regular','advanced'].includes(String(value.experience)))result.experience=value.experience as PersistedOnboarding['experience'];
  if(value.placementScore===null||isFiniteNumber(value.placementScore))result.placementScore=value.placementScore===null?null:finiteInteger(value.placementScore,0,0);
  if(isFiniteNumber(value.placementTotal))result.placementTotal=finiteInteger(value.placementTotal,0,0);
  if(isRecord(value.placementEvidence))result.placementEvidence=booleanRecord(value.placementEvidence);
  if(value.recommendedLessonId===null||typeof value.recommendedLessonId==='string')result.recommendedLessonId=value.recommendedLessonId===null?null:boundedText(value.recommendedLessonId,IMPORT_LIMITS.maxKeyChars);
  if(value.completedAt===null||isDateString(value.completedAt))result.completedAt=value.completedAt as string|null;
  return result;
}
function sanitizeSettings(value:Record<string,unknown>):Partial<PersistedSettings>{const result:Partial<PersistedSettings>={};if(['small','medium','large'].includes(String(value.textSize)))result.textSize=value.textSize as PersistedSettings['textSize'];if(typeof value.wordWrap==='boolean')result.wordWrap=value.wordWrap;if(typeof value.autoClose==='boolean')result.autoClose=value.autoClose;if(typeof value.lineNumbers==='boolean')result.lineNumbers=value.lineNumbers;return result;}
function sanitizeBookmarks(values:unknown[]):Bookmark[]{const result:Bookmark[]=[];const seen=new Set<string>();for(const value of values.slice(0,IMPORT_LIMITS.maxArrayItems)){if(!isRecord(value)||!['lesson','exercise','reference'].includes(String(value.type))||typeof value.targetId!=='string')continue;const type=value.type as Bookmark['type'];const rawTarget=boundedText(value.targetId,IMPORT_LIMITS.maxKeyChars);const targetId=type==='exercise'?canonicalExerciseId(rawTarget):rawTarget;if(!targetId)continue;const id=`${type}:${targetId}`;if(seen.has(id))continue;seen.add(id);result.push({id,type,targetId,createdAt:isDateString(value.createdAt)?value.createdAt:new Date(0).toISOString()});}return result;}
function sanitizeHistory(values:unknown[]):HistoryEntry[]{const result:HistoryEntry[]=[];for(const value of values){if(!isRecord(value)||typeof value.text!=='string'||!['lesson','exercise','reference'].includes(String(value.kind)))continue;result.push({id:typeof value.id==='string'?boundedText(value.id,IMPORT_LIMITS.maxKeyChars):crypto.randomUUID(),at:isDateString(value.at)?value.at:new Date(0).toISOString(),text:boundedText(value.text,IMPORT_LIMITS.maxTextChars),kind:value.kind as HistoryEntry['kind']});if(result.length>=100)break;}return result;}
function exerciseCounter(value:Record<string,unknown>,mode:'sum'|'max'){const raw:Record<string,number>={};for(const [id,count] of Object.entries(value)){if(!safeRecordKey(id)||!isFiniteNumber(count))continue;raw[id]=finiteInteger(count,0,0);}return migrateExerciseKeyedRecord(raw,(left,right)=>mode==='sum'?(left??0)+right:Math.max(left??0,right));}
function masteryRecord(value:Record<string,unknown>){const result:Record<string,Partial<ConceptMastery>>={};for(const [id,item] of Object.entries(value)){if(!safeRecordKey(id)||!isRecord(item))continue;result[id]=sanitizeMastery(item);}return result;}
function sanitizeMastery(value:Record<string,unknown>):Partial<ConceptMastery>{
  const out:Partial<ConceptMastery>={};
  if(isFiniteNumber(value.score))out.score=clamp(value.score,0,1);
  if(isFiniteNumber(value.attempts))out.attempts=finiteInteger(value.attempts,0,0);
  if(isFiniteNumber(value.successes))out.successes=finiteInteger(value.successes,0,0);
  if(isFiniteNumber(value.mistakeCount))out.mistakeCount=finiteInteger(value.mistakeCount,0,0);
  if(isFiniteNumber(value.stability))out.stability=Math.max(.5,value.stability);
  if(isFiniteNumber(value.independentSuccesses))out.independentSuccesses=finiteInteger(value.independentSuccesses,0,0);
  if(isFiniteNumber(value.hintedSuccesses))out.hintedSuccesses=finiteInteger(value.hintedSuccesses,0,0);
  if(isFiniteNumber(value.transferSuccesses))out.transferSuccesses=finiteInteger(value.transferSuccesses,0,0);
  if(isFiniteNumber(value.projectSuccesses))out.projectSuccesses=finiteInteger(value.projectSuccesses,0,0);
  if(isFiniteNumber(value.solutionReveals))out.solutionReveals=finiteInteger(value.solutionReveals,0,0);
  if(isFiniteNumber(value.delayedRecallSuccesses))out.delayedRecallSuccesses=finiteInteger(value.delayedRecallSuccesses,0,0);
  if(value.lastSuccessfulDelayDays===null||isFiniteNumber(value.lastSuccessfulDelayDays))out.lastSuccessfulDelayDays=value.lastSuccessfulDelayDays===null?null:Math.max(0,Number(value.lastSuccessfulDelayDays));
  if(value.lastPracticed===null||isDateString(value.lastPracticed))out.lastPracticed=value.lastPracticed as string|null;
  if(value.nextReview===null||isDateString(value.nextReview))out.nextReview=value.nextReview as string|null;
  if(value.lastIndependentSuccess===null||isDateString(value.lastIndependentSuccess))out.lastIndependentSuccess=value.lastIndependentSuccess as string|null;
  if(value.lastEvidence===null)out.lastEvidence=null;else if(isRecord(value.lastEvidence)){const evidence=sanitizeEvidence(value.lastEvidence);if(evidence)out.lastEvidence=evidence;}
  return out;
}
function sanitizeEvidence(value:Record<string,unknown>):MasteryEvidence|null{if(!['success','failure'].includes(String(value.outcome)))return null;if(!['independent','hinted','revealed'].includes(String(value.independence)))return null;if(!['practice','transfer','project','placement'].includes(String(value.context)))return null;if(typeof value.realCompile!=='boolean')return null;return {outcome:value.outcome as MasteryEvidence['outcome'],independence:value.independence as MasteryEvidence['independence'],context:value.context as MasteryEvidence['context'],realCompile:value.realCompile};}
function stringArrayRecord(value:Record<string,unknown>){const result:Record<string,string[]>={};for(const [key,item] of Object.entries(value)){if(!safeRecordKey(key)||!Array.isArray(item))continue;result[key]=stringArray(item);}return result;}
function stringRecord(value:Record<string,unknown>){const result:Record<string,string>={};for(const [key,item] of Object.entries(value)){if(!safeRecordKey(key)||typeof item!=='string')continue;result[key]=item;}return result;}
function booleanRecord(value:Record<string,unknown>){const result:Record<string,boolean>={};for(const [key,item] of Object.entries(value)){if(!safeRecordKey(key)||typeof item!=='boolean')continue;result[key]=item;}return result;}
function numberRecord(value:Record<string,unknown>,allowNegative=false){const result:Record<string,number>={};for(const [key,item] of Object.entries(value)){if(!safeRecordKey(key)||!isFiniteNumber(item)||(item<0&&!allowNegative))continue;result[key]=Number(item);}return result;}
function stringArray(value:unknown[]){return [...new Set(value.slice(0,IMPORT_LIMITS.maxArrayItems).filter((item):item is string=>typeof item==='string'&&Boolean(item.trim())).map(item=>boundedText(item,IMPORT_LIMITS.maxTextChars)))];}
function boundedText(value:string,max:number){return value.length<=max?value:value.slice(0,max);}
function safeRecordKey(value:string){return Boolean(value)&&value.length<=IMPORT_LIMITS.maxKeyChars&&!['__proto__','prototype','constructor'].includes(value)&&!/[\u0000-\u001f\u007f]/.test(value);}
function nullableDate(value:unknown){return value===null?null:isDateString(value)?value:null;}
function isDateString(value:unknown):value is string{return typeof value==='string'&&Number.isFinite(Date.parse(value));}
function isFiniteNumber(value:unknown):value is number{return typeof value==='number'&&Number.isFinite(value);}
function finiteInteger(value:unknown,fallback=0,min=Number.MIN_SAFE_INTEGER){return isFiniteNumber(value)?Math.max(min,Math.trunc(value)):fallback;}
function clamp(value:number,min:number,max:number){return Math.max(min,Math.min(max,value));}
function isRecord(value:unknown):value is Record<string,unknown>{return Boolean(value)&&typeof value==='object'&&!Array.isArray(value);}
