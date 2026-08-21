import type { CompileResult, Exercise, ExerciseExecution, ValidatorRule } from '../types';
import { compileResultAuthority, satisfiesCompilerAuthority } from './compilerAuthority';
import { exerciseExecution } from './exerciseInteraction';
import {
  activeLatexSource,
  commandCount,
  documentClass,
  environmentsBalanced,
  firstActiveLineContaining,
  hasActiveStructuralText,
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
const conceptualNegation=/\b(?:не|нет|нельзя|неверно|ошибочно|not|never|without|incorrect|false)\b/iu;

function hasConceptualText(source:string,value:string){
  const required=value.split(/\s*→\s*/).map(normalizeConceptText).filter(Boolean);
  if(required.length<2){
    if(hasStructuralText(source,value))return true;
    return normalizeConceptText(source).includes(normalizeConceptText(value));
  }
  const answer=normalizeConceptText(source);
  let cursor=0;
  for(const part of required){
    const index=answer.indexOf(part,cursor);
    if(index<0)return false;
    const relationContext=answer.slice(Math.max(0,cursor-24),index);
    if(conceptualNegation.test(relationContext))return false;
    cursor=index+part.length;
  }
  return true;
}

export function validateExercise(exercise:Exercise,source:string,compileResult?:CompileResult):ValidationResult{
  const execution=exerciseExecution(exercise);
  const conceptualAnswer=!compileResult&&execution==='concept';
  const items=exercise.validators.map(rule=>validateRule(rule,source,compileResult,conceptualAnswer,execution));
  if(execution==='reconstruction')items.push(validateReconstruction(exercise,source));
  return {ok:items.every(item=>item.ok),items};
}

export function validateRule(rule:ValidatorRule,source:string,compileResult?:CompileResult,conceptualAnswer=false,execution?:ExerciseExecution):ValidationItem{
  let ok=false;let line:number|undefined;let message=rule.message;let hint=rule.hint;
  switch(rule.type){
    case 'documentClass':ok=documentClass(source)===rule.value;break;
    case 'documentClassOption':ok=hasDocumentClassOption(source,rule.value);break;
    case 'environment':ok=hasEnvironment(source,rule.value);break;
    case 'command':ok=commandCount(source,rule.value)>=(rule.min??1);break;
    case 'package':ok=hasPackage(source,rule.value);break;
    case 'containsText':ok=conceptualAnswer?hasConceptualText(source,rule.value):hasActiveStructuralText(source,rule.value);line=ok?undefined:firstActiveLineContaining(source,rule.value);break;
    case 'forbiddenText':ok=!hasActiveStructuralText(source,rule.value);line=ok?undefined:firstActiveLineContaining(source,rule.value);break;
    case 'regex':try{ok=new RegExp(rule.value,rule.flags).test(rule.scope==='raw'?source:activeLatexSource(source));}catch{ok=false;}break;
    case 'paragraph':ok=hasParagraph(source);break;
    case 'inlineMath':ok=hasInlineMath(source);break;
    case 'displayMath':ok=hasDisplayMath(source);break;
    case 'balancedEnvironments':ok=environmentsBalanced(source);break;
    case 'compiles':{
      const required=rule.authority??(execution==='document'||execution==='reconstruction'?'real-tex':'educational');
      ok=satisfiesCompilerAuthority(compileResult,required);
      line=compileResult?.diagnostics.find(item=>item.severity==='error')?.line;
      if(!ok&&required==='real-tex'&&compileResultAuthority(compileResult)==='educational'){
        message=`${rule.message} — требуется реальная TeX-сборка`;
        hint='Учебный предпросмотр не является доказательством компиляции документа. Повторите проверку, когда BusyTeX доступен и вернул настоящий PDF.';
      }
      break;
    }
  }
  return {ok,message,hint,line};
}

function validateReconstruction(exercise:Exercise,source:string):ValidationItem{
  const ok=reconstructionMatches(exercise.solution,source);
  return {
    ok,
    message:ok?'Структура результата соответствует цели.':'Результат не соответствует заданной структуре.',
    hint:'Воспроизведите смысловую структуру целевого результата; одного наличия нужной команды недостаточно.'
  };
}

export function reconstructionMatches(target:string,source:string){
  const expectedFractions=extractFractions(activeLatexSource(target));
  if(expectedFractions.length){
    const actualFractions=extractFractions(activeLatexSource(source));
    return expectedFractions.every(expected=>actualFractions.some(actual=>actual[0]===expected[0]&&actual[1]===expected[1]));
  }
  const expectedMath=mathBlocks(activeLatexSource(target));
  if(!expectedMath.length)return true;
  const actualMath=new Set(mathBlocks(activeLatexSource(source)));
  return expectedMath.every(block=>actualMath.has(block));
}

function extractFractions(source:string){
  const output:Array<[string,string]>=[];
  for(const match of source.matchAll(/\\frac\s*\{/g)){
    const firstOpen=(match.index??0)+match[0].lastIndexOf('{');
    const numerator=readGroup(source,firstOpen);if(!numerator)continue;
    let cursor=numerator.end+1;while(/\s/.test(source[cursor]??''))cursor+=1;
    if(source[cursor]!=='{')continue;
    const denominator=readGroup(source,cursor);if(!denominator)continue;
    output.push([normalizeMath(numerator.value),normalizeMath(denominator.value)]);
  }
  return output;
}
function readGroup(source:string,open:number){
  if(source[open]!=='{')return null;
  let depth=0;
  for(let index=open;index<source.length;index+=1){
    if(source[index]==='{'&&source[index-1]!=='\\')depth+=1;
    else if(source[index]==='}'&&source[index-1]!=='\\'){
      depth-=1;if(depth===0)return {value:source.slice(open+1,index),end:index};
    }
  }
  return null;
}
function mathBlocks(source:string){
  const blocks:string[]=[];
  for(const match of source.matchAll(/\\\[([\s\S]*?)\\\]|\$\$([\s\S]*?)\$\$|\\begin\{(?:equation\*?|align\*?)\}([\s\S]*?)\\end\{(?:equation\*?|align\*?)\}/g)){
    const value=match[1]??match[2]??match[3]??'';blocks.push(normalizeMath(value));
  }
  return blocks.filter(Boolean);
}
function normalizeMath(value:string){return value.replace(/\s+/g,'').replace(/\{([^{}]+)\}/g,'{$1}');}

export const validatorInternals={countCommand:commandCount,commandCount,hasEnvironment,hasPackage,hasDocumentClassOption,hasStructuralText,hasActiveStructuralText,hasConceptualText,environmentsBalanced,reconstructionMatches};