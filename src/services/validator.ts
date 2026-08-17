import type { CompileResult, Exercise, ValidatorRule } from '../types';

export type ValidationLevel='requirement'|'warning'|'style'|'pedagogy';
export type ValidationItem = { ok:boolean; message:string; hint:string; line?:number; level:ValidationLevel; blocking:boolean };
export type ValidationResult = { ok:boolean; items:ValidationItem[] };

const escapeRegExp=(value:string)=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const withoutComments=(source:string)=>source.replace(/(^|[^\\])%.*$/gm,'$1');
const normalizeGroupWhitespace=(source:string)=>source.replace(/[ \t]+}/g,'}');

function countCommand(source:string,name:string){
  const escaped=escapeRegExp(name);
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
  const required=exercise.validators.map(rule=>validateRule(rule,source,compileResult));
  const quality=looksLikeLatex(source)?qualityChecks(exercise,source):[];
  const items=[...required,...quality];
  return {ok:items.filter(item=>item.blocking).every(item=>item.ok),items};
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
  return {ok,message:rule.message,hint:rule.hint,line,level:'requirement',blocking:true};
}

function qualityChecks(exercise:Exercise,source:string):ValidationItem[]{
  const items:ValidationItem[]=[];
  const manualBreak=findManualParagraphBreak(source);
  if(manualBreak)items.push({ok:false,level:'style',blocking:false,line:manualBreak,message:'Принудительный перенос используется как абзац.',hint:'Документ может компилироваться, но смысловой абзац задаётся пустой строкой. Оставьте \\\\ для контекстов, где перенос строки действительно является частью структуры.'});

  const plainOperator=findPlainMathOperator(source);
  if(plainOperator)items.push({ok:false,level:'style',blocking:false,line:plainOperator.line,message:`Математический оператор «${plainOperator.operator}» набран как последовательность букв.`,hint:`Используйте \\${plainOperator.operator}: LaTeX тогда применит правильное начертание и математические интервалы.`});

  if(/\\includegraphics(?=[^A-Za-z@]|$)/.test(withoutComments(source))&&!hasPackage(source,'graphicx'))items.push({ok:false,level:'warning',blocking:false,line:firstLineContaining(source,'\\includegraphics'),message:'includegraphics используется без graphicx.',hint:'Подключите \\usepackage{graphicx} в преамбуле. В полном TeX это обычно приводит к Undefined control sequence.'});

  if(exercise.concepts.some(concept=>['label','ref'].includes(concept))&&/\b(?:Figure|Table|Equation|Section|Рисунок|Таблица|Уравнение|Раздел)\s+\d+\b/i.test(withoutComments(source)))items.push({ok:false,level:'pedagogy',blocking:false,message:'В исходнике осталась жёстко записанная ссылка по номеру.',hint:'Метка задаёт идентичность объекта, а ref — связь с ним. Такой текст переживает перенумерацию документа.'});

  const fakeHeading=findVisualHeading(source);
  if(fakeHeading)items.push({ok:false,level:'pedagogy',blocking:false,line:fakeHeading,message:'Похоже, структурный заголовок имитируется полужирным текстом.',hint:'Если фрагмент имеет роль раздела, выразите эту роль через \\section или подходящую команду секционирования, а не через оформление.'});
  return items;
}

function looksLikeLatex(source:string){return /\\[A-Za-z@]+|\\begin\{|(?<!\\)\$/.test(source);}
function findManualParagraphBreak(source:string){
  let protectedDepth=0;
  const lines=withoutComments(source).split('\n');
  for(let index=0;index<lines.length;index++){
    const line=lines[index];
    if(/\\begin\{(?:align\*?|tabular|array|matrix|pmatrix|bmatrix|cases)\}/.test(line))protectedDepth++;
    if(protectedDepth===0&&/[^&]\\\\\s*$/.test(line.trim())&&index+1<lines.length&&lines[index+1].trim())return index+1;
    if(/\\end\{(?:align\*?|tabular|array|matrix|pmatrix|bmatrix|cases)\}/.test(line))protectedDepth=Math.max(0,protectedDepth-1);
  }
  return undefined;
}
function findPlainMathOperator(source:string){
  const lines=withoutComments(source).split('\n');
  for(let index=0;index<lines.length;index++){
    const math=[...lines[index].matchAll(/(?<!\\)\$([^$]+)(?<!\\)\$|\\\[([^\]]+)\\\]/g)].map(match=>match[1]??match[2]??'');
    for(const fragment of math){
      const operator=fragment.match(/(?<!\\)\b(sin|cos|tan|log|ln|lim|max|min|exp)\b/)?.[1];
      if(operator)return {line:index+1,operator};
    }
  }
  return undefined;
}
function findVisualHeading(source:string){
  const lines=withoutComments(source).split('\n');
  const index=lines.findIndex(line=>/^\s*\\textbf\{[^}]{2,50}\}\s*$/.test(line));
  return index>=0?index+1:undefined;
}

export const validatorInternals={countCommand,hasEnvironment,hasPackage,hasDocumentClassOption,hasStructuralText,environmentsBalanced,findManualParagraphBreak,findPlainMathOperator};
