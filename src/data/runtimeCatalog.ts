import { curriculum } from './curriculumRuntime';
import type { ReferenceEntry } from '../types';

export const getRuntimeModule=(id?:string)=>id?curriculum.moduleById[id]:undefined;
export const getRuntimeLesson=(id?:string)=>id?curriculum.lessonById[id]:undefined;
export const getRuntimeExercise=(id?:string)=>id?curriculum.exerciseById[id]:undefined;
export const getRuntimeProject=(id?:string)=>id?curriculum.projectById[id]:undefined;
export const getRuntimeReference=(id?:string)=>id?curriculum.referenceById[id]:undefined;

export const runtimeReferenceCategories=Object.freeze([...new Set(curriculum.references.map(entry=>entry.category))]);

export function searchRuntimeReference(query:string){
  const q=normalized(query);
  if(!q)return curriculum.references;
  return curriculum.references
    .map(entry=>({entry,score:referenceScore(entry,q)}))
    .filter(item=>item.score>0)
    .sort((left,right)=>right.score-left.score)
    .map(item=>item.entry);
}

function normalized(value:string){return value.toLocaleLowerCase('ru').replace(/^\\/,'').replace(/[{}[\]$]/g,' ').replace(/\s+/g,' ').trim();}
function referenceScore(entry:ReferenceEntry,q:string){
  const command=normalized(entry.command);const title=normalized(entry.title);const aliases=entry.aliases.map(normalized);
  if(command===q)return 100;if(aliases.includes(q))return 90;if(title===q)return 85;
  if(command.startsWith(q))return 70;if(title.startsWith(q))return 60;if(aliases.some(alias=>alias.startsWith(q)))return 55;
  const haystack=normalized([entry.command,entry.title,entry.description,...entry.aliases].join(' '));
  return haystack.includes(q)?30:0;
}
