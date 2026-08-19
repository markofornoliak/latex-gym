import { curriculumSource } from './curriculumSource';
import type { ReferenceEntry } from '../types';

const entries=curriculumSource.references;

/** Compatibility adapter. Reference content is authored in curriculumSource.json. */
export const referenceEntries=entries;
export const referenceCategories=[...new Set(entries.map(entry=>entry.category))];
export const getReferenceEntry=(id?:string)=>id?entries.find(entry=>entry.id===id):undefined;

function normalized(value:string){return value.toLocaleLowerCase('ru').replace(/^\\/,'').replace(/[{}[\]$]/g,' ').replace(/\s+/g,' ').trim();}
export function searchReference(query:string){
  const q=normalized(query);
  if(!q)return entries;
  return entries.map(entry=>({entry,score:referenceScore(entry,q)})).filter(item=>item.score>0).sort((a,b)=>b.score-a.score).map(item=>item.entry);
}
function referenceScore(entry:ReferenceEntry,q:string){
  const command=normalized(entry.command);const title=normalized(entry.title);const aliases=entry.aliases.map(normalized);
  if(command===q)return 100;if(aliases.includes(q))return 90;if(title===q)return 85;
  if(command.startsWith(q))return 70;if(title.startsWith(q))return 60;if(aliases.some(alias=>alias.startsWith(q)))return 55;
  const haystack=normalized([entry.command,entry.title,entry.description,...entry.aliases].join(' '));
  return haystack.includes(q)?30:0;
}
