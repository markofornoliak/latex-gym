import type { CompileResult, Exercise, ValidatorRule } from '../types';
import { satisfiesCompilerAuthority } from './compilerAuthority';
import {
  commandCount,
  documentClass,
  environmentsBalanced,
  firstLineContaining,
  hasDisplayMath,
  hasDocumentClassOption,
  hasEnvironment,
  hasInlineMath,
  hasPackage,
  hasParagraph,
  hasStructuralText
} from './latexSourceAnalysis';

export type ValidationItem = { ok:boolean; message:string; hint:string; line?:number };
export type ValidationResult = { ok:boolean; items:ValidationItem[] };

const normalizeConceptText=(value:string)=>value.toLocaleLowerCase('ru-RU').replace(/[—–]/g,'-').replace(/[^\p{L}\p{N}.@_+\\-]+/gu,' ').replace(/\s+/g,' ').trim();

function hasConceptualText(source:string,value:string){
  if(hasStructuralText(source,value))return true;
  const required=value.split(/\s*→\s*/).map(normalizeConceptText).filter(Boolean);
  if(required.length<2)return normalizeConceptText(source).includes(normalizeConceptText(value));
  const answer=normalizeConceptText(source);
  let cursor=0;
  for(const part of required){
    const index=answer.indexOf(part,cursor);
    if(index<0)return false;
    cursor=index+part.length;
  }
  return true;
}

export function validateExercise(exercise:Exercise,source:string,compileResult?:CompileResult):ValidationResult{
  const conceptualAnswer=!compileResult&&(exercise.mode==='Объяснить'||exercise.mode==='Архитектура');
  const items=exercise.validators.map(rule=>validateRule(rule,source,compileResult,conceptualAnswer));
  return {ok:items.every(item=>item.ok),items};
}

export function validateRule(rule:ValidatorRule,source:string,compileResult?:CompileResult,conceptualAnswer=false):ValidationItem{
  let ok=false;let line:number|undefined;
  switch(rule.type){
    case 'documentClass':ok=documentClass(source)===rule.value;break;
    case 'documentClassOption':ok=hasDocumentClassOption(source,rule.value);break;
    case 'environment':ok=hasEnvironment(source,rule.value);break;
    case 'command':ok=commandCount(source,rule.value)>=(rule.min??1);break;
    case 'package':ok=hasPackage(source,rule.value);break;
    case 'containsText':ok=conceptualAnswer?hasConceptualText(source,rule.value):hasStructuralText(source,rule.value);line=ok?undefined:firstLineContaining(source,rule.value);break;
    case 'forbiddenText':ok=!source.includes(rule.value);line=ok?undefined:firstLineContaining(source,rule.value);break;
    case 'regex':try{ok=new RegExp(rule.value,rule.flags).test(source);}catch{ok=false;}break;
    case 'paragraph':ok=hasParagraph(source);break;
    case 'inlineMath':ok=hasInlineMath(source);break;
    case 'displayMath':ok=hasDisplayMath(source);break;
    case 'balancedEnvironments':ok=environmentsBalanced(source);break;
    case 'compiles':ok=satisfiesCompilerAuthority(compileResult,rule.authority??'educational');line=compileResult?.diagnostics.find(item=>item.severity==='error')?.line;break;
  }
  return {ok,message:rule.message,hint:rule.hint,line};
}

export const validatorInternals={commandCount,hasEnvironment,hasPackage,hasDocumentClassOption,hasStructuralText,hasConceptualText,environmentsBalanced};
