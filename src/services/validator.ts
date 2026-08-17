import type { CompileResult, Exercise, MistakeCategory, StructuralQuery, ValidatorRule } from '../types';
import { nodeInside, parseLatexStructure, type LatexStructure } from './latexStructure';

export type ValidationLevel='requirement'|'warning'|'style'|'pedagogy';
export type ValidationItem={ok:boolean;message:string;hint:string;line?:number;level:ValidationLevel;blocking:boolean;mistakeCategory?:MistakeCategory;conceptId?:string};
export type ValidationResult={ok:boolean;items:ValidationItem[]};

const escapeRegExp=(value:string)=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const withoutComments=(source:string)=>source.replace(/(^|[^\\])%.*$/gm,'$1');
const normalizeGroupWhitespace=(source:string)=>source.replace(/[ \t]+}/g,'}');
function countCommand(source:string,name:string){return parseLatexStructure(source).commands(name).length;}
function hasEnvironment(source:string,name:string){return parseLatexStructure(source).environments(name).length>0;}
function hasPackage(source:string,name:string){return parseLatexStructure(source).packages.has(name);}
function hasDocumentClassOption(source:string,option:string){return parseLatexStructure(source).documentClass?.options.includes(option)??false;}
function hasStructuralText(source:string,value:string){return source.includes(value)||normalizeGroupWhitespace(source).includes(normalizeGroupWhitespace(value));}
function hasParagraph(source:string){return parseLatexStructure(source).byKind('Paragraph').some(node=>/[\p{L}\p{N}]{2,}/u.test(node.value??''));}
function hasInlineMath(source:string){return parseLatexStructure(source).byKind('Math').some(node=>node.mathMode==='inline');}
function hasDisplayMath(source:string){return parseLatexStructure(source).byKind('Math').some(node=>node.mathMode==='display');}
function environmentsBalanced(source:string){return !parseLatexStructure(source).problems.some(problem=>problem.kind==='environment-mismatch'||problem.kind==='unclosed-environment');}
function firstLineContaining(source:string,value:string){const exact=source.indexOf(value);if(exact>=0)return source.slice(0,exact).split('\n').length;const normalizedValue=normalizeGroupWhitespace(value);const lines=source.split('\n');const index=lines.findIndex(line=>normalizeGroupWhitespace(line).includes(normalizedValue));return index>=0?index+1:undefined;}

export function validateExercise(exercise:Exercise,source:string,compileResult?:CompileResult):ValidationResult{
  const structure=parseLatexStructure(source);
  const required=exercise.validators.map(rule=>validateRule(rule,source,structure,compileResult));
  const quality=looksLikeLatex(source)?qualityChecks(exercise,source,structure):[];
  const items=[...required,...quality];
  return {ok:items.filter(item=>item.blocking).every(item=>item.ok),items};
}

function validateRule(rule:ValidatorRule,source:string,structure:LatexStructure,compileResult?:CompileResult):ValidationItem{
  let ok=false;let line:number|undefined;let mistakeCategory:MistakeCategory|undefined=mistakeForRule(rule);
  switch(rule.type){
    case 'documentClass':ok=structure.documentClass?.name===rule.value;break;
    case 'documentClassOption':ok=structure.documentClass?.options.includes(rule.value)??false;break;
    case 'environment':ok=structure.environments(rule.value).length>0;break;
    case 'command':ok=structure.commands(rule.value).length>=(rule.min??1);break;
    case 'package':ok=structure.packages.has(rule.value);break;
    case 'containsText':ok=hasStructuralText(source,rule.value);line=firstLineContaining(source,rule.value);break;
    case 'forbiddenText':ok=!source.includes(rule.value);line=ok?undefined:firstLineContaining(source,rule.value);break;
    case 'regex':try{ok=new RegExp(rule.value,rule.flags).test(source);}catch{ok=false;}break;
    case 'paragraph':ok=structure.byKind('Paragraph').some(node=>/[\p{L}\p{N}]{2,}/u.test(node.value??''));break;
    case 'inlineMath':ok=structure.byKind('Math').some(node=>node.mathMode==='inline');break;
    case 'displayMath':ok=structure.byKind('Math').some(node=>node.mathMode==='display');break;
    case 'balancedEnvironments':{const problem=structure.problems.find(item=>item.kind==='environment-mismatch'||item.kind==='unclosed-environment');ok=!problem;line=problem?.line;break;}
    case 'compiles':ok=Boolean(compileResult?.ok);line=compileResult?.diagnostics.find(item=>item.severity==='error')?.line;mistakeCategory=compileResult?.diagnostics.find(item=>item.severity==='error')?.mistakeCategory??mistakeCategory;break;
    case 'structure':ok=matchesStructuralQuery(structure,rule.query);line=ok?undefined:structuralFailureLine(structure,rule.query);break;
  }
  return {ok,message:rule.message,hint:rule.hint,line,level:'requirement',blocking:true,mistakeCategory:ok?undefined:mistakeCategory};
}

export function matchesStructuralQuery(structure:LatexStructure,query:StructuralQuery){
  if(query.target==='fraction'){
    const nodes=structure.byKind('Fraction').filter(node=>{
      if(query.within==='inlineMath'&&node.mathMode!=='inline')return false;
      if(query.within==='displayMath'&&node.mathMode!=='display')return false;
      const [numerator='',denominator='']=node.arguments??[];
      if(query.numeratorContains&&!normalizeGroupWhitespace(numerator).includes(normalizeGroupWhitespace(query.numeratorContains)))return false;
      if(query.denominatorContains&&!normalizeGroupWhitespace(denominator).includes(normalizeGroupWhitespace(query.denominatorContains)))return false;
      return true;
    });
    return nodes.length>=(query.min??1);
  }
  if(query.target==='environment'){
    return structure.environments(query.name).filter(env=>!query.containsCommand||structure.commands(query.containsCommand).some(command=>nodeInside(command,env))).length>=(query.min??1);
  }
  if(query.target==='command'){
    return structure.commands(query.name).filter(command=>{
      if(query.argumentContains&&!command.arguments?.some(arg=>normalizeGroupWhitespace(arg).includes(normalizeGroupWhitespace(query.argumentContains!))))return false;
      if(query.withinEnvironment){const env=structure.environments(query.withinEnvironment).find(item=>nodeInside(command,item));if(!env)return false;}
      return true;
    }).length>=(query.min??1);
  }
  if(query.target==='table'){
    return structure.byKind('Table').some(table=>{
      const rows=Number(table.meta?.rows??0);const columns=Number(table.meta?.columns??0);
      return rows>=(query.minRows??1)&&(query.columns===undefined||columns===query.columns);
    });
  }
  const labels=new Set(structure.byKind('Label').map(node=>node.value).filter(Boolean));
  const refs=structure.byKind('Reference').map(node=>node.value).filter(Boolean);
  if(query.label)return labels.has(query.label)&&refs.includes(query.label);
  return refs.some(key=>labels.has(key));
}

function structuralFailureLine(structure:LatexStructure,query:StructuralQuery){
  if(query.target==='fraction')return structure.byKind('Math')[0]?.range.line;
  if(query.target==='environment')return structure.commands('begin')[0]?.range.line;
  if(query.target==='command'&&query.withinEnvironment)return structure.environments(query.withinEnvironment)[0]?.range.line;
  if(query.target==='table')return structure.byKind('Table')[0]?.range.line;
  if(query.target==='labelReference')return structure.byKind('Label')[0]?.range.line??structure.byKind('Reference')[0]?.range.line;
  return undefined;
}

function mistakeForRule(rule:ValidatorRule):MistakeCategory{
  if(rule.type==='balancedEnvironments'||rule.type==='environment')return 'environment-balance';
  if(rule.type==='inlineMath'||rule.type==='displayMath')return 'math-mode';
  if(rule.type==='package')return 'package-placement';
  if(rule.type==='paragraph')return 'paragraph-break';
  if(rule.type==='structure'){
    if(rule.query.target==='table')return 'table-alignment';
    if(rule.query.target==='labelReference')return 'reference-placement';
    return 'semantic-structure';
  }
  return 'other';
}

function qualityChecks(exercise:Exercise,source:string,structure:LatexStructure):ValidationItem[]{
  const items:ValidationItem[]=[];
  const manualBreak=findManualParagraphBreak(source);
  if(manualBreak)items.push({ok:false,level:'style',blocking:false,line:manualBreak,message:'Принудительный перенос используется как абзац.',hint:'Документ может компилироваться, но смысловой абзац задаётся пустой строкой. Оставьте \\\\ для контекстов, где перенос строки является частью структуры.',mistakeCategory:'paragraph-break'});
  const plainOperator=findPlainMathOperator(source);
  if(plainOperator)items.push({ok:false,level:'style',blocking:false,line:plainOperator.line,message:`Математический оператор «${plainOperator.operator}» набран как последовательность букв.`,hint:`Используйте \\${plainOperator.operator}: LaTeX применит правильное начертание и математические интервалы.`,mistakeCategory:'semantic-structure'});
  if(structure.commands('includegraphics').length&&!structure.packages.has('graphicx'))items.push({ok:false,level:'warning',blocking:false,line:structure.commands('includegraphics')[0]?.range.line,message:'includegraphics используется без graphicx.',hint:'Подключите \\usepackage{graphicx} в преамбуле. В полном TeX это обычно приводит к Undefined control sequence.',mistakeCategory:'package-placement'});
  if(exercise.concepts.some(concept=>['label','ref'].includes(concept))&&/\b(?:Figure|Table|Equation|Section|Рисунок|Таблица|Уравнение|Раздел)\s+\d+\b/i.test(withoutComments(source)))items.push({ok:false,level:'pedagogy',blocking:false,message:'В исходнике осталась жёстко записанная ссылка по номеру.',hint:'Метка задаёт идентичность объекта, а ref — связь с ним. Такой текст переживает перенумерацию документа.',mistakeCategory:'reference-placement'});
  const fakeHeading=findVisualHeading(source);if(fakeHeading)items.push({ok:false,level:'pedagogy',blocking:false,line:fakeHeading,message:'Похоже, структурный заголовок имитируется полужирным текстом.',hint:'Если фрагмент имеет роль раздела, выразите её через \\section или подходящую команду секционирования.',mistakeCategory:'semantic-structure'});
  return items;
}
function looksLikeLatex(source:string){return /\\[A-Za-z@]+|\\begin\{|(?<!\\)\$/.test(source);}
function findManualParagraphBreak(source:string){let protectedDepth=0;const lines=withoutComments(source).split('\n');for(let index=0;index<lines.length;index++){const line=lines[index];if(/\\begin\{(?:align\*?|tabular|array|matrix|pmatrix|bmatrix|cases)\}/.test(line))protectedDepth++;if(protectedDepth===0&&/[^&]\\\\\s*$/.test(line.trim())&&index+1<lines.length&&lines[index+1].trim())return index+1;if(/\\end\{(?:align\*?|tabular|array|matrix|pmatrix|bmatrix|cases)\}/.test(line))protectedDepth=Math.max(0,protectedDepth-1);}return undefined;}
function findPlainMathOperator(source:string){const lines=withoutComments(source).split('\n');for(let index=0;index<lines.length;index++){const math=[...lines[index].matchAll(/(?<!\\)\$([^$]+)(?<!\\)\$|\\\[([^\]]+)\\\]/g)].map(match=>match[1]??match[2]??'');for(const fragment of math){const operator=fragment.match(/(?<!\\)\b(sin|cos|tan|log|ln|lim|max|min|exp)\b/)?.[1];if(operator)return {line:index+1,operator};}}return undefined;}
function findVisualHeading(source:string){const lines=withoutComments(source).split('\n');const index=lines.findIndex(line=>/^\s*\\textbf\{[^}]{2,50}\}\s*$/.test(line));return index>=0?index+1:undefined;}
export const validatorInternals={countCommand,hasEnvironment,hasPackage,hasDocumentClassOption,hasStructuralText,environmentsBalanced,findManualParagraphBreak,findPlainMathOperator,parseLatexStructure,matchesStructuralQuery};
