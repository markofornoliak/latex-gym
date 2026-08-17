import type { CompileResult, Exercise, ValidatorRule } from '../types';

export type ValidationItem = { ok:boolean; message:string; hint:string; line?:number };
export type ValidationResult = { ok:boolean; items:ValidationItem[] };

const escapeRegExp=(value:string)=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const withoutComments=(source:string)=>source.replace(/(^|[^\\])%.*$/gm,'$1');
const normalizeGroupWhitespace=(source:string)=>source.replace(/[ \t]+}/g,'}');

function countCommand(source:string,name:string){
  const escaped=escapeRegExp(name);
  // A TeX control word ends at the first non-letter token. That includes
  // argument delimiters, whitespace, stars, subscripts and superscripts.
  return (withoutComments(source).match(new RegExp(`\\\\${escaped}(?=[^A-Za-z@]|$)`, 'g'))??[]).length;
}
function hasEnvironment(source:string,name:string){
  const escaped=escapeRegExp(name);
  return new RegExp(`\\\\begin\\s*\\{${escaped}\\}[\\s\\S]*?\\\\end\\s*\\{${escaped}\\}`).test(withoutComments(source));
}
function hasPackage(source:string,name:string){
  const preamble=(withoutComments(source).split(/\\begin\s*\{document\}/)[0]??'');
  const escaped=escapeRegExp(name);
  return new RegExp(`\\\\usepackage(?:\\[[^\\]]*\\])?\\{[^}]*\\b${escaped}\\b[^}]*\\}`).test(preamble);
}
function hasDocumentClassOption(source:string,option:string){
  const match=withoutComments(source).match(/\\documentclass(?:\[([^\]]*)\])?\{[^}]+\}/);
  return (match?.[1]??'').split(',').map(value=>value.trim()).includes(option);
}
function hasStructuralText(source:string,value:string){
  if(source.includes(value))return true;
  return normalizeGroupWhitespace(source).includes(normalizeGroupWhitespace(value));
}
function hasParagraph(source:string){
  const body=source.match(/\\begin\{document\}([\s\S]*?)\\end\{document\}/)?.[1]??source;
  const stripped=withoutComments(body).replace(/\\[a-zA-Z@]+\*?(?:\[[^\]]*\])?(?:\{[^}]*\})?/g,' ').replace(/[{}$^_&]/g,' ').replace(/\s+/g,' ').trim();
  return /[\p{L}\p{N}]{2,}/u.test(stripped);
}
function hasInlineMath(source:string){return /(?<!\\)\$[^$\n]+(?<!\\)\$/.test(withoutComments(source));}
function hasDisplayMath(source:string){return /\\\[[\s\S]*?\\\]|\$\$[\s\S]*?\$\$|\\begin\{(?:equation\*?|align\*?)\}[\s\S]*?\\end\{(?:equation\*?|align\*?)\}/.test(withoutComments(source));}
function environmentsBalanced(source:string){
  const stack:string[]=[];
  const tokens=withoutComments(source).matchAll(/\\(begin|end)\s*\{([^}]+)\}/g);
  for(const token of tokens){
    const [,kind,name]=token;
    if(kind==='begin')stack.push(name);
    else if(stack.pop()!==name)return false;
  }
  return stack.length===0;
}
function firstLineContaining(source:string,value:string){
  const exact=source.indexOf(value);
  if(exact>=0)return source.slice(0,exact).split('\n').length;
  const normalizedValue=normalizeGroupWhitespace(value);
  const lines=source.split('\n');
  const index=lines.findIndex(line=>normalizeGroupWhitespace(line).includes(normalizedValue));
  return index>=0?index+1:undefined;
}

export function validateExercise(exercise:Exercise,source:string,compileResult?:CompileResult):ValidationResult{
  const items=exercise.validators.map(rule=>validateRule(rule,source,compileResult));
  return {ok:items.every(item=>item.ok),items};
}

function validateRule(rule:ValidatorRule,source:string,compileResult?:CompileResult):ValidationItem{
  let ok=false;let line: number|undefined;
  switch(rule.type){
    case 'documentClass':ok=new RegExp(`\\\\documentclass(?:\\[[^\\]]*\\])?\\{${escapeRegExp(rule.value)}\\}`).test(withoutComments(source));break;
    case 'documentClassOption':ok=hasDocumentClassOption(source,rule.value);break;
    case 'environment':ok=hasEnvironment(source,rule.value);break;
    case 'command':ok=countCommand(source,rule.value)>=(rule.min??1);break;
    case 'package':ok=hasPackage(source,rule.value);break;
    case 'containsText':ok=hasStructuralText(source,rule.value);line=firstLineContaining(source,rule.value);break;
    case 'forbiddenText':ok=!source.includes(rule.value);line=ok?undefined:firstLineContaining(source,rule.value);break;
    case 'regex':try{ok=new RegExp(rule.value,rule.flags).test(source);}catch{ok=false;}break;
    case 'paragraph':ok=hasParagraph(source);break;
    case 'inlineMath':ok=hasInlineMath(source);break;
    case 'displayMath':ok=hasDisplayMath(source);break;
    case 'balancedEnvironments':ok=environmentsBalanced(source);break;
    case 'compiles':ok=Boolean(compileResult?.ok);line=compileResult?.diagnostics.find(item=>item.severity==='error')?.line;break;
  }
  return {ok,message:rule.message,hint:rule.hint,line};
}

export const validatorInternals={countCommand,hasEnvironment,hasPackage,hasDocumentClassOption,hasStructuralText,environmentsBalanced};
