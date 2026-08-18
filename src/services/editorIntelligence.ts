import { referenceEntries } from '../data/reference';
import type { ReferenceEntry } from '../types';

export type LatexEditorContext={
  inPreamble:boolean;
  inMath:boolean;
  environment:string|null;
  environmentStack:string[];
  packages:Set<string>;
};

export type EditorReferenceSuggestion={
  referenceId:string;
  label:string;
  apply:string;
  detail:string;
  package?:string;
  packageLoaded:boolean;
  boost:number;
};

const mathEnvironments=new Set(['equation','equation*','align','align*','gather','gather*','multline','multline*','split','cases','matrix','pmatrix','bmatrix','vmatrix','Vmatrix']);
const structuralPreambleIds=new Set(['documentclass','usepackage']);
const contextualIds:Record<string,string[]>={
  figure:['includegraphics','caption','label','centering'],
  table:['tabular','caption','label','toprule','midrule','bottomrule','centering'],
  tabular:['toprule','midrule','bottomrule'],
  itemize:['item'],
  enumerate:['item'],
  equation:['label'],
  align:['label']
};

export function analyzeLatexContext(source:string,pos=source.length):LatexEditorContext{
  const before=stripLatexComments(source.slice(0,Math.max(0,Math.min(pos,source.length))));
  const documentStart=before.search(/\\begin\s*\{document\}/);
  const environmentStack=environmentStackAt(before);
  const environment=environmentStack.at(-1)??null;
  return {
    inPreamble:documentStart<0,
    inMath:isMathContext(before,environmentStack),
    environment,
    environmentStack,
    packages:extractPackages(before)
  };
}

export function extractPackages(source:string){
  const clean=stripLatexComments(source);
  const packages=new Set<string>();
  for(const match of clean.matchAll(/\\usepackage(?:\[[^\]]*\])?\{([^}]+)\}/g)){
    for(const name of match[1].split(',').map(item=>item.trim()).filter(Boolean))packages.add(name);
  }
  return packages;
}

export function getReferenceSuggestion(entry:ReferenceEntry,context:LatexEditorContext):EditorReferenceSuggestion|null{
  const label=completionLabel(entry);
  if(!label)return null;
  const requiredPackage=entry.package;
  const packageLoaded=!requiredPackage||context.packages.has(requiredPackage);
  let boost=0;
  if(context.inMath&&entry.mathMode==='required')boost+=32;
  if(!context.inMath&&entry.mathMode==='required')boost-=18;
  if(context.inPreamble&&structuralPreambleIds.has(entry.id))boost+=36;
  if(!context.inPreamble&&structuralPreambleIds.has(entry.id))boost-=24;
  if(context.environment&&contextualIds[context.environment]?.includes(entry.id))boost+=42;
  if(requiredPackage&&!packageLoaded)boost-=8;
  return {
    referenceId:entry.id,
    label,
    apply:completionApply(entry),
    detail:suggestionDetail(entry,packageLoaded),
    package:requiredPackage,
    packageLoaded,
    boost
  };
}

export function referenceSuggestions(source:string,pos=source.length){
  const context=analyzeLatexContext(source,pos);
  return referenceEntries.map(entry=>getReferenceSuggestion(entry,context)).filter(Boolean) as EditorReferenceSuggestion[];
}

export function environmentSuggestions(source:string,pos=source.length){
  const context=analyzeLatexContext(source,pos);
  return referenceEntries
    .filter(entry=>isEnvironmentEntry(entry))
    .map(entry=>{
      const packageLoaded=!entry.package||context.packages.has(entry.package);
      const name=environmentName(entry)!;
      let boost=context.inMath&&entry.mathMode==='required'?28:0;
      if(context.environment&&contextualIds[context.environment]?.includes(entry.id))boost+=24;
      if(entry.package&&!packageLoaded)boost-=8;
      return {referenceId:entry.id,label:name,apply:name,detail:suggestionDetail(entry,packageLoaded),package:entry.package,packageLoaded,boost};
    });
}

export function packageSuggestions(){
  const packages=[...new Set(referenceEntries.map(entry=>entry.package).filter((value):value is string=>Boolean(value)))].sort();
  return packages.map(name=>({label:name,apply:name,detail:'Пакет из справочника LaTeX Gym'}));
}

export function missingPackageForCommand(command:string,source:string,pos=source.length){
  const normalized=command.replace(/^\\/,'');
  const entry=referenceEntries.find(item=>item.command.replace(/^\\/,'')===normalized);
  if(!entry?.package)return null;
  const context=analyzeLatexContext(source,pos);
  return context.packages.has(entry.package)?null:{referenceId:entry.id,package:entry.package};
}

export function insertPackageIntoPreamble(source:string,packageName:string){
  if(extractPackages(source).has(packageName))return source;
  const line=`\\usepackage{${packageName}}`;
  const documentClass=/\\documentclass(?:\[[^\]]*\])?\{[^}]+\}[^\n]*(?:\n|$)/.exec(source);
  if(documentClass){
    const at=documentClass.index+documentClass[0].length;
    return `${source.slice(0,at)}${line}\n${source.slice(at)}`;
  }
  const documentStart=source.search(/\\begin\s*\{document\}/);
  if(documentStart>=0)return `${source.slice(0,documentStart)}${line}\n${source.slice(documentStart)}`;
  return `${line}\n${source}`;
}

function completionLabel(entry:ReferenceEntry){
  if(entry.command.startsWith('\\')&&/^\\[A-Za-z@]+$/.test(entry.command))return entry.command;
  return null;
}

function completionApply(entry:ReferenceEntry){
  const syntax=entry.syntax.trim();
  if(syntax.startsWith(entry.command)){
    return syntax
      .replace(/\[options\]/gi,'')
      .replace(/\{(?:title|text|key|file|value|name|expression|numerator|denominator|package|class|length|position)\}/gi,'{}')
      .replace(/\s*\.\.\.\s*/g,'');
  }
  return entry.command;
}

function suggestionDetail(entry:ReferenceEntry,packageLoaded:boolean){
  const parts=[entry.title];
  if(entry.package)parts.push(packageLoaded?`пакет ${entry.package}`:`требуется ${entry.package}`);
  if(entry.mathMode==='required')parts.push('математика');
  return parts.join(' · ');
}

function isEnvironmentEntry(entry:ReferenceEntry){return Boolean(environmentName(entry));}
function environmentName(entry:ReferenceEntry){
  const match=/\\begin\{([^}]+)\}/.exec(entry.syntax);
  return match?.[1]??null;
}

function environmentStackAt(source:string){
  const stack:string[]=[];
  for(const match of source.matchAll(/\\(begin|end)\s*\{([^}]+)\}/g)){
    const [,kind,name]=match;
    if(kind==='begin')stack.push(name);
    else{
      const index=stack.lastIndexOf(name);
      if(index>=0)stack.splice(index,1);
    }
  }
  return stack;
}

function isMathContext(source:string,stack:string[]){
  if(stack.some(name=>mathEnvironments.has(name)))return true;
  const displayOpen=source.lastIndexOf('\\[')>source.lastIndexOf('\\]');
  if(displayOpen)return true;
  let dollars=0;
  for(let index=0;index<source.length;index+=1){
    if(source[index]!=='$'||isEscaped(source,index))continue;
    if(source[index+1]==='$'){index+=1;continue;}
    dollars+=1;
  }
  return dollars%2===1;
}

function stripLatexComments(source:string){return source.split('\n').map(stripCommentLine).join('\n');}
function stripCommentLine(line:string){
  for(let index=0;index<line.length;index+=1){
    if(line[index]!=='%'||isEscaped(line,index))continue;
    return line.slice(0,index);
  }
  return line;
}
function isEscaped(source:string,index:number){
  let slashes=0;
  for(let cursor=index-1;cursor>=0&&source[cursor]==='\\';cursor-=1)slashes+=1;
  return slashes%2===1;
}
