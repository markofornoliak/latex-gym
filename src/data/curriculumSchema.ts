import type { ConceptDefinition, CourseModule, LearningProject, ReferenceEntry, ValidatorRule } from '../types';

export type CanonicalCurriculumSource={
  modules:CourseModule[];
  concepts:ConceptDefinition[];
  references:ReferenceEntry[];
  projects:LearningProject[];
};

type JsonRecord=Record<string,unknown>;
type AssertValue=(value:unknown,path:string)=>void;

const difficulties=new Set(['Начальный','Базовый','Средний','Продвинутый','Экспертный']);
const practiceCategories=new Set(['Основы','Текст','Математика','Таблицы','Графика','TikZ','Библиография','Большие документы','Отладка','Academic challenges']);
const exerciseModes=new Set(['Написать код','Исправить ошибку','Предсказать результат','Дополнить документ','Рефакторинг','Найти ошибку','Воссоздать результат','Текст → LaTeX','Улучшить код','Собрать документ','Объяснить','Архитектура']);
const exerciseExecutions=new Set(['concept','fragment','document','reconstruction']);
const validatorTypes=new Set(['documentClass','documentClassOption','environment','command','package','containsText','forbiddenText','regex','paragraph','inlineMath','displayMath','balancedEnvironments','compiles']);
const valueValidatorTypes=new Set(['documentClass','documentClassOption','environment','command','package','containsText','forbiddenText','regex']);
const learningBlockTypes=new Set(['concept','explanation','syntax','anatomy','flow','example','source-output','comparison','mistake','warning','checkpoint']);

export function assertCanonicalCurriculumSchema(value:unknown):asserts value is CanonicalCurriculumSource{
  const source=record(value,'curriculum');
  array(source.modules,'curriculum.modules',moduleValue);
  array(source.concepts,'curriculum.concepts',conceptValue);
  array(source.references,'curriculum.references',referenceValue);
  array(source.projects,'curriculum.projects',projectValue);
}

function moduleValue(value:unknown,path:string){
  const item=record(value,path);
  string(item.id,`${path}.id`);
  number(item.number,`${path}.number`);
  string(item.title,`${path}.title`);
  string(item.description,`${path}.description`);
  string(item.prerequisites,`${path}.prerequisites`);
  enumString(item.difficulty,`${path}.difficulty`,difficulties);
  array(item.lessons,`${path}.lessons`,lessonValue);
}

function lessonValue(value:unknown,path:string){
  const item=record(value,path);
  string(item.id,`${path}.id`);
  string(item.moduleId,`${path}.moduleId`);
  number(item.number,`${path}.number`);
  string(item.title,`${path}.title`);
  string(item.subtitle,`${path}.subtitle`);
  enumString(item.difficulty,`${path}.difficulty`,difficulties);
  array(item.theory,`${path}.theory`,theoryValue);
  optionalArray(item.content,`${path}.content`,learningBlockValue);
  optional(item.pedagogy,`${path}.pedagogy`,pedagogyValue);
  array(item.examples,`${path}.examples`,exampleValue);
  array(item.exercises,`${path}.exercises`,exerciseValue);
  stringArray(item.relatedCommands,`${path}.relatedCommands`);
  optionalString(item.projectStage,`${path}.projectStage`);
}

function theoryValue(value:unknown,path:string){
  const item=record(value,path);
  string(item.id,`${path}.id`);
  string(item.title,`${path}.title`);
  string(item.body,`${path}.body`);
  optionalString(item.code,`${path}.code`);
  optionalString(item.note,`${path}.note`);
}

function learningBlockValue(value:unknown,path:string){
  const item=record(value,path);
  string(item.id,`${path}.id`);
  const type=enumString(item.type,`${path}.type`,learningBlockTypes);
  string(item.title,`${path}.title`);
  switch(type){
    case 'concept':case 'explanation':
      string(item.body,`${path}.body`);optionalString(item.details,`${path}.details`);break;
    case 'syntax':
      string(item.body,`${path}.body`);string(item.code,`${path}.code`);optionalString(item.note,`${path}.note`);break;
    case 'anatomy':
      optionalString(item.body,`${path}.body`);string(item.source,`${path}.source`);array(item.parts,`${path}.parts`,(part,partPath)=>{
        const detail=record(part,partPath);string(detail.token,`${partPath}.token`);string(detail.label,`${partPath}.label`);string(detail.description,`${partPath}.description`);
      });break;
    case 'flow':
      optionalString(item.body,`${path}.body`);array(item.steps,`${path}.steps`,(step,stepPath)=>{
        const detail=record(step,stepPath);string(detail.label,`${stepPath}.label`);string(detail.detail,`${stepPath}.detail`);
      });break;
    case 'example':case 'source-output':
      string(item.body,`${path}.body`);string(item.code,`${path}.code`);break;
    case 'comparison':
      optionalString(item.body,`${path}.body`);comparisonSide(item.left,`${path}.left`);comparisonSide(item.right,`${path}.right`);break;
    case 'mistake':case 'warning':
      string(item.body,`${path}.body`);optionalString(item.code,`${path}.code`);optionalString(item.correction,`${path}.correction`);break;
    case 'checkpoint':
      string(item.prompt,`${path}.prompt`);string(item.answer,`${path}.answer`);optionalString(item.code,`${path}.code`);break;
  }
}

function comparisonSide(value:unknown,path:string){
  const item=record(value,path);string(item.label,`${path}.label`);string(item.code,`${path}.code`);string(item.note,`${path}.note`);
}

function pedagogyValue(value:unknown,path:string){
  const item=record(value,path);
  string(item.objective,`${path}.objective`);
  stringArray(item.prerequisites,`${path}.prerequisites`);
  stringArray(item.introduces,`${path}.introduces`);
  stringArray(item.reinforces,`${path}.reinforces`);
  stringArray(item.misconceptions,`${path}.misconceptions`);
  string(item.practiceObjective,`${path}.practiceObjective`);
  stringArray(item.masteryCriteria,`${path}.masteryCriteria`);
}

function exampleValue(value:unknown,path:string){
  const item=record(value,path);string(item.id,`${path}.id`);string(item.title,`${path}.title`);string(item.description,`${path}.description`);string(item.code,`${path}.code`);
}

function exerciseValue(value:unknown,path:string){
  const item=record(value,path);
  string(item.id,`${path}.id`);
  string(item.lessonId,`${path}.lessonId`);
  enumString(item.category,`${path}.category`,practiceCategories);
  enumString(item.difficulty,`${path}.difficulty`,difficulties);
  enumString(item.mode,`${path}.mode`,exerciseModes);
  if(item.execution!==undefined)enumString(item.execution,`${path}.execution`,exerciseExecutions);
  string(item.title,`${path}.title`);
  string(item.instructions,`${path}.instructions`);
  stringArray(item.requirements,`${path}.requirements`);
  string(item.starterCode,`${path}.starterCode`);
  array(item.validators,`${path}.validators`,validatorValue);
  stringArray(item.hints,`${path}.hints`);
  string(item.solution,`${path}.solution`);
  stringArray(item.concepts,`${path}.concepts`);
  optionalStringArray(item.prerequisites,`${path}.prerequisites`);
}

function validatorValue(value:unknown,path:string){
  const item=record(value,path);
  const type=enumString(item.type,`${path}.type`,validatorTypes) as ValidatorRule['type'];
  string(item.message,`${path}.message`);
  string(item.hint,`${path}.hint`);
  if(valueValidatorTypes.has(type))string(item.value,`${path}.value`);
  if(type==='command')optionalNumber(item.min,`${path}.min`);
  if(type==='regex'){
    optionalString(item.flags,`${path}.flags`);
    if(item.scope!==undefined)enumString(item.scope,`${path}.scope`,new Set(['active','raw']));
  }
  if(type==='compiles'&&item.authority!==undefined)enumString(item.authority,`${path}.authority`,new Set(['educational','real-tex']));
}

function conceptValue(value:unknown,path:string){
  const item=record(value,path);string(item.id,`${path}.id`);string(item.title,`${path}.title`);string(item.description,`${path}.description`);stringArray(item.prerequisites,`${path}.prerequisites`);optionalStringArray(item.referenceIds,`${path}.referenceIds`);
}

function referenceValue(value:unknown,path:string){
  const item=record(value,path);
  string(item.id,`${path}.id`);string(item.command,`${path}.command`);string(item.category,`${path}.category`);stringArray(item.aliases,`${path}.aliases`);string(item.title,`${path}.title`);string(item.description,`${path}.description`);string(item.syntax,`${path}.syntax`);string(item.example,`${path}.example`);optionalString(item.resultLatex,`${path}.resultLatex`);stringArray(item.related,`${path}.related`);
  optionalArray(item.arguments,`${path}.arguments`,(argument,argumentPath)=>{const detail=record(argument,argumentPath);string(detail.name,`${argumentPath}.name`);boolean(detail.required,`${argumentPath}.required`);string(detail.description,`${argumentPath}.description`);});
  if(item.mathMode!==undefined)enumString(item.mathMode,`${path}.mathMode`,new Set(['required','optional','no']));
  optionalString(item.package,`${path}.package`);optionalString(item.commonMistake,`${path}.commonMistake`);
}

function projectValue(value:unknown,path:string){
  const item=record(value,path);
  string(item.id,`${path}.id`);string(item.title,`${path}.title`);string(item.subtitle,`${path}.subtitle`);enumString(item.difficulty,`${path}.difficulty`,difficulties);string(item.description,`${path}.description`);stringArray(item.prerequisites,`${path}.prerequisites`);stringArray(item.concepts,`${path}.concepts`);
  array(item.stages,`${path}.stages`,(stage,stagePath)=>{const detail=record(stage,stagePath);string(detail.id,`${stagePath}.id`);string(detail.title,`${stagePath}.title`);string(detail.objective,`${stagePath}.objective`);stringArray(detail.requirements,`${stagePath}.requirements`);string(detail.starterCode,`${stagePath}.starterCode`);});
}

function record(value:unknown,path:string):JsonRecord{
  if(value===null||typeof value!=='object'||Array.isArray(value))fail(path,'object',value);
  return value as JsonRecord;
}
function array(value:unknown,path:string,assertValue:AssertValue){
  if(!Array.isArray(value))fail(path,'array',value);
  value.forEach((item,index)=>assertValue(item,`${path}[${index}]`));
}
function optionalArray(value:unknown,path:string,assertValue:AssertValue){if(value!==undefined)array(value,path,assertValue);}
function stringArray(value:unknown,path:string){array(value,path,string);}
function optionalStringArray(value:unknown,path:string){if(value!==undefined)stringArray(value,path);}
function string(value:unknown,path:string):string{if(typeof value!=='string')fail(path,'string',value);return value;}
function optionalString(value:unknown,path:string){if(value!==undefined)string(value,path);}
function number(value:unknown,path:string):number{if(typeof value!=='number'||!Number.isFinite(value))fail(path,'finite number',value);return value;}
function optionalNumber(value:unknown,path:string){if(value!==undefined)number(value,path);}
function boolean(value:unknown,path:string){if(typeof value!=='boolean')fail(path,'boolean',value);}
function optional(value:unknown,path:string,assertValue:AssertValue){if(value!==undefined)assertValue(value,path);}
function enumString(value:unknown,path:string,values:Set<string>):string{
  const candidate=string(value,path);if(!values.has(candidate))throw new Error(`${path}: expected one of ${[...values].join(', ')}, received ${JSON.stringify(candidate)}`);return candidate;
}
function fail(path:string,expected:string,value:unknown):never{
  const actual=value===null?'null':Array.isArray(value)?'array':typeof value;
  throw new Error(`${path}: expected ${expected}, received ${actual}`);
}