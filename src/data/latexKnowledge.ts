import { referenceEntries } from './reference';
import type { ReferenceEntry } from '../types';

export type CommandKnowledge={
  name:string;
  entry:ReferenceEntry;
  insert:string;
  detail:string;
};

export type EnvironmentKnowledge={
  name:string;
  entry:ReferenceEntry;
};

const commandName=(entry:ReferenceEntry)=>entry.command.match(/^\\([A-Za-z@]+)$/)?.[1];
const environmentName=(entry:ReferenceEntry)=>entry.syntax.match(/^\\begin\{([A-Za-z*]+)\}/)?.[1]??(!entry.command.startsWith('\\')&&/^[A-Za-z*]+$/.test(entry.command)?entry.command:undefined);

export const commandKnowledge:CommandKnowledge[]=referenceEntries.flatMap(entry=>{
  const name=commandName(entry);
  if(!name)return [];
  return [{name,entry,insert:commandInsert(name,entry),detail:completionDetail(entry)}];
});

export const environmentKnowledge:EnvironmentKnowledge[]=dedupeEnvironments(referenceEntries.flatMap(entry=>{
  const name=environmentName(entry);
  return name?[{name,entry}]:[];
}));

const commandByName=new Map(commandKnowledge.map(item=>[item.name,item]));
const environmentByName=new Map(environmentKnowledge.map(item=>[item.name,item]));

export function getCommandKnowledge(name:string){return commandByName.get(name);}
export function getEnvironmentKnowledge(name:string){return environmentByName.get(name);}

export function commandPriority(item:CommandKnowledge,context:{mathMode:boolean;preamble:boolean;packages:Set<string>}){
  let boost=0;
  if(context.mathMode)boost+=item.entry.mathMode==='required'?35:item.entry.mathMode==='no'?-18:6;
  else if(item.entry.mathMode==='required')boost-=24;
  if(context.preamble){
    if(['documentclass','usepackage','newcommand','newenvironment','setlength','setcounter'].includes(item.name))boost+=30;
    if(['section','subsection','item','caption','cite'].includes(item.name))boost-=12;
  }
  if(item.entry.package&&!context.packages.has(item.entry.package))boost-=5;
  return boost;
}

export function findLabels(source:string){
  return [...source.matchAll(/\\label\{([^}]+)\}/g)].map(match=>match[1]).filter(Boolean);
}

export function findBibKeys(source:string){
  return [...source.matchAll(/@[A-Za-z]+\s*\{\s*([^,\s]+)\s*,/g)].map(match=>match[1]).filter(Boolean);
}

export function packageNames(source:string){
  const preamble=source.split(/\\begin\s*\{document\}/)[0]??source;
  const packages=new Set<string>();
  for(const match of preamble.matchAll(/\\usepackage(?:\[[^\]]*\])?\{([^}]+)\}/g))for(const name of match[1].split(',').map(value=>value.trim()).filter(Boolean))packages.add(name);
  return packages;
}

function commandInsert(name:string,entry:ReferenceEntry){
  const required=entry.arguments?.filter(argument=>argument.required).length??0;
  if(required===0)return `\\${name}`;
  return `\\${name}${'{}'.repeat(required)}`;
}

function completionDetail(entry:ReferenceEntry){
  const parts=[entry.title];
  if(entry.mathMode==='required')parts.push('math');
  if(entry.package)parts.push(entry.package);
  return parts.join(' · ');
}

function dedupeEnvironments(items:EnvironmentKnowledge[]){
  const seen=new Set<string>();
  return items.filter(item=>{if(seen.has(item.name))return false;seen.add(item.name);return true;});
}
