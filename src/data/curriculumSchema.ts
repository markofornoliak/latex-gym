import type { ConceptDefinition, CourseModule, Exercise, LearningProject, Lesson, ReferenceEntry } from '../types';
import type { CurriculumSnapshot } from '../types/curriculumSnapshot';

export type CanonicalCurriculumSource={
  modules:CourseModule[];
  concepts:ConceptDefinition[];
  references:ReferenceEntry[];
  projects:LearningProject[];
};

export class CurriculumSchemaError extends Error{
  readonly issues:readonly string[];
  constructor(label:string,issues:string[]){
    const shown=issues.slice(0,100);
    const more=issues.length>shown.length?`\n… and ${issues.length-shown.length} more schema error(s).`:'';
    super(`${label} failed structural validation with ${issues.length} error(s):\n${shown.map(issue=>`- ${issue}`).join('\n')}${more}`);
    this.name='CurriculumSchemaError';
    this.issues=Object.freeze([...issues]);
  }
}

type Context={issues:string[]};
type RecordValue=Record<string,unknown>;

const DIFFICULTIES=['Начальный','Базовый','Средний','Продвинутый','Экспертный'] as const;
const CATEGORIES=['Основы','Текст','Математика','Таблицы','Графика','TikZ','Библиография','Большие документы','Отладка','Academic challenges'] as const;
const MODES=['Написать код','Исправить ошибку','Предсказать результат','Дополнить документ','Рефакторинг','Найти ошибку','Воссоздать результат','Текст → LaTeX','Улучшить код','Собрать документ','Объяснить','Архитектура'] as const;
const BLOCK_TYPES=['concept','explanation','syntax','anatomy','flow','example','source-output','comparison','mistake','warning','checkpoint'] as const;
const VALIDATOR_TYPES=['documentClass','documentClassOption','environment','command','package','containsText','forbiddenText','regex','paragraph','inlineMath','displayMath','balancedEnvironments','compiles'] as const;
const MATH_MODES=['required','optional','no'] as const;
const AUTHORITIES=['educational','real-tex'] as const;
const NORMALIZATION_KINDS=['exercise-concept','exercise-prerequisite','lesson-prerequisite','lesson-introduces','lesson-reinforces'] as const;

export function parseCurriculumSource(value:unknown):CanonicalCurriculumSource{
  const ctx:Context={issues:[]};
  const root=object(value,'curriculum',ctx);
  if(root){
    exact(root,['modules','concepts','references','projects'],'curriculum',ctx);
    array(root.modules,'curriculum.modules',ctx,(item,path)=>validateModule(item,path,ctx));
    array(root.concepts,'curriculum.concepts',ctx,(item,path)=>validateConcept(item,path,ctx));
    array(root.references,'curriculum.references',ctx,(item,path)=>validateReference(item,path,ctx));
    array(root.projects,'curriculum.projects',ctx,(item,path)=>validateProject(item,path,ctx));
  }
  if(ctx.issues.length)throw new CurriculumSchemaError('Canonical curriculum source',ctx.issues);
  return value as CanonicalCurriculumSource;
}

export function parseCurriculumSnapshot(value:unknown):CurriculumSnapshot{
  const ctx:Context={issues:[]};
  const root=object(value,'snapshot',ctx);
  if(root){
    exact(root,['snapshotVersion','semanticFingerprint','modules','lessons','exercises','concepts','references','projects','graph','normalization','issues','build'],'snapshot',ctx);
    integer(root.snapshotVersion,'snapshot.snapshotVersion',ctx,{min:1});
    if(root.snapshotVersion!==1)issue(ctx,'snapshot.snapshotVersion','expected supported version 1');
    text(root.semanticFingerprint,'snapshot.semanticFingerprint',ctx,{nonEmpty:true,pattern:/^[0-9a-f]{8}$/});
    array(root.modules,'snapshot.modules',ctx,(item,path)=>validateModule(item,path,ctx));
    array(root.lessons,'snapshot.lessons',ctx,(item,path)=>validateLesson(item,path,ctx));
    array(root.exercises,'snapshot.exercises',ctx,(item,path)=>validateExercise(item,path,ctx));
    array(root.concepts,'snapshot.concepts',ctx,(item,path)=>validateConcept(item,path,ctx));
    array(root.references,'snapshot.references',ctx,(item,path)=>validateReference(item,path,ctx));
    array(root.projects,'snapshot.projects',ctx,(item,path)=>validateProject(item,path,ctx));
    validateGraph(root.graph,'snapshot.graph',ctx);
    validateNormalization(root.normalization,'snapshot.normalization',ctx);
    validateIssues(root.issues,'snapshot.issues',ctx);
    validateBuild(root.build,'snapshot.build',ctx);
  }
  if(ctx.issues.length)throw new CurriculumSchemaError('Curriculum snapshot',ctx.issues);
  return value as CurriculumSnapshot;
}

function validateModule(value:unknown,path:string,ctx:Context){
  const item=object(value,path,ctx);if(!item)return;
  exact(item,['id','number','title','description','prerequisites','difficulty','lessons'],path,ctx);
  id(item.id,`${path}.id`,ctx);integer(item.number,`${path}.number`,ctx,{min:1});
  text(item.title,`${path}.title`,ctx);text(item.description,`${path}.description`,ctx);text(item.prerequisites,`${path}.prerequisites`,ctx);
  oneOf(item.difficulty,DIFFICULTIES,`${path}.difficulty`,ctx);
  array(item.lessons,`${path}.lessons`,ctx,(entry,entryPath)=>validateLesson(entry,entryPath,ctx));
}

function validateLesson(value:unknown,path:string,ctx:Context){
  const item=object(value,path,ctx);if(!item)return;
  exact(item,['id','moduleId','number','title','subtitle','difficulty','theory','content','pedagogy','examples','exercises','relatedCommands','projectStage'],path,ctx);
  id(item.id,`${path}.id`,ctx);id(item.moduleId,`${path}.moduleId`,ctx);integer(item.number,`${path}.number`,ctx,{min:1});
  text(item.title,`${path}.title`,ctx);text(item.subtitle,`${path}.subtitle`,ctx);oneOf(item.difficulty,DIFFICULTIES,`${path}.difficulty`,ctx);
  array(item.theory,`${path}.theory`,ctx,(entry,entryPath)=>validateTheory(entry,entryPath,ctx));
  optional(item.content,`${path}.content`,ctx,value=>array(value,`${path}.content`,ctx,(entry,entryPath)=>validateLearningBlock(entry,entryPath,ctx)));
  optional(item.pedagogy,`${path}.pedagogy`,ctx,value=>validatePedagogy(value,`${path}.pedagogy`,ctx));
  array(item.examples,`${path}.examples`,ctx,(entry,entryPath)=>validateExample(entry,entryPath,ctx));
  array(item.exercises,`${path}.exercises`,ctx,(entry,entryPath)=>validateExercise(entry,entryPath,ctx));
  stringArray(item.relatedCommands,`${path}.relatedCommands`,ctx);
  optional(item.projectStage,`${path}.projectStage`,ctx,value=>text(value,`${path}.projectStage`,ctx,{nonEmpty:true}));
}

function validateTheory(value:unknown,path:string,ctx:Context){
  const item=object(value,path,ctx);if(!item)return;
  exact(item,['id','title','body','code','note'],path,ctx);
  id(item.id,`${path}.id`,ctx);text(item.title,`${path}.title`,ctx);text(item.body,`${path}.body`,ctx);
  optionalString(item.code,`${path}.code`,ctx);optionalString(item.note,`${path}.note`,ctx);
}

function validateLearningBlock(value:unknown,path:string,ctx:Context){
  const item=object(value,path,ctx);if(!item)return;
  oneOf(item.type,BLOCK_TYPES,`${path}.type`,ctx);
  if(typeof item.type!=='string'||!BLOCK_TYPES.includes(item.type as typeof BLOCK_TYPES[number]))return;
  const common=()=>{id(item.id,`${path}.id`,ctx);text(item.title,`${path}.title`,ctx);};
  switch(item.type){
    case 'concept':case 'explanation':
      exact(item,['id','type','title','body','details'],path,ctx);common();text(item.body,`${path}.body`,ctx);optionalString(item.details,`${path}.details`,ctx);break;
    case 'syntax':
      exact(item,['id','type','title','body','code','note'],path,ctx);common();text(item.body,`${path}.body`,ctx);text(item.code,`${path}.code`,ctx);optionalString(item.note,`${path}.note`,ctx);break;
    case 'anatomy':
      exact(item,['id','type','title','body','source','parts'],path,ctx);common();optionalString(item.body,`${path}.body`,ctx);text(item.source,`${path}.source`,ctx);
      array(item.parts,`${path}.parts`,ctx,(part,partPath)=>validateSimpleObject(part,partPath,ctx,['token','label','description']));break;
    case 'flow':
      exact(item,['id','type','title','body','steps'],path,ctx);common();optionalString(item.body,`${path}.body`,ctx);
      array(item.steps,`${path}.steps`,ctx,(step,stepPath)=>validateSimpleObject(step,stepPath,ctx,['label','detail']));break;
    case 'example':case 'source-output':
      exact(item,['id','type','title','body','code'],path,ctx);common();text(item.body,`${path}.body`,ctx);text(item.code,`${path}.code`,ctx);break;
    case 'comparison':
      exact(item,['id','type','title','body','left','right'],path,ctx);common();optionalString(item.body,`${path}.body`,ctx);
      validateSimpleObject(item.left,`${path}.left`,ctx,['label','code','note']);validateSimpleObject(item.right,`${path}.right`,ctx,['label','code','note']);break;
    case 'mistake':case 'warning':
      exact(item,['id','type','title','body','code','correction'],path,ctx);common();text(item.body,`${path}.body`,ctx);optionalString(item.code,`${path}.code`,ctx);optionalString(item.correction,`${path}.correction`,ctx);break;
    case 'checkpoint':
      exact(item,['id','type','title','prompt','answer','code'],path,ctx);common();text(item.prompt,`${path}.prompt`,ctx);text(item.answer,`${path}.answer`,ctx);optionalString(item.code,`${path}.code`,ctx);break;
  }
}

function validateExample(value:unknown,path:string,ctx:Context){
  const item=object(value,path,ctx);if(!item)return;
  exact(item,['id','title','description','code'],path,ctx);id(item.id,`${path}.id`,ctx);text(item.title,`${path}.title`,ctx);text(item.description,`${path}.description`,ctx);text(item.code,`${path}.code`,ctx);
}

function validatePedagogy(value:unknown,path:string,ctx:Context){
  const item=object(value,path,ctx);if(!item)return;
  exact(item,['objective','prerequisites','introduces','reinforces','misconceptions','practiceObjective','masteryCriteria'],path,ctx);
  text(item.objective,`${path}.objective`,ctx);stringArray(item.prerequisites,`${path}.prerequisites`,ctx);stringArray(item.introduces,`${path}.introduces`,ctx);stringArray(item.reinforces,`${path}.reinforces`,ctx);
  stringArray(item.misconceptions,`${path}.misconceptions`,ctx);text(item.practiceObjective,`${path}.practiceObjective`,ctx);stringArray(item.masteryCriteria,`${path}.masteryCriteria`,ctx);
}

function validateExercise(value:unknown,path:string,ctx:Context){
  const item=object(value,path,ctx);if(!item)return;
  exact(item,['id','lessonId','category','difficulty','mode','title','instructions','requirements','starterCode','validators','hints','solution','concepts','prerequisites'],path,ctx);
  id(item.id,`${path}.id`,ctx);id(item.lessonId,`${path}.lessonId`,ctx);oneOf(item.category,CATEGORIES,`${path}.category`,ctx);oneOf(item.difficulty,DIFFICULTIES,`${path}.difficulty`,ctx);oneOf(item.mode,MODES,`${path}.mode`,ctx);
  text(item.title,`${path}.title`,ctx);text(item.instructions,`${path}.instructions`,ctx);stringArray(item.requirements,`${path}.requirements`,ctx);text(item.starterCode,`${path}.starterCode`,ctx);
  array(item.validators,`${path}.validators`,ctx,(rule,rulePath)=>validateValidator(rule,rulePath,ctx));stringArray(item.hints,`${path}.hints`,ctx);text(item.solution,`${path}.solution`,ctx);
  stringArray(item.concepts,`${path}.concepts`,ctx);optional(item.prerequisites,`${path}.prerequisites`,ctx,value=>stringArray(value,`${path}.prerequisites`,ctx));
}

function validateValidator(value:unknown,path:string,ctx:Context){
  const item=object(value,path,ctx);if(!item)return;
  oneOf(item.type,VALIDATOR_TYPES,`${path}.type`,ctx);
  if(typeof item.type!=='string'||!VALIDATOR_TYPES.includes(item.type as typeof VALIDATOR_TYPES[number]))return;
  const messages=()=>{text(item.message,`${path}.message`,ctx,{nonEmpty:true});text(item.hint,`${path}.hint`,ctx,{nonEmpty:true});};
  if(['documentClass','documentClassOption','environment','package'].includes(item.type)){
    exact(item,['type','value','message','hint'],path,ctx);text(item.value,`${path}.value`,ctx,{nonEmpty:true});messages();return;
  }
  if(['containsText','forbiddenText'].includes(item.type)){
    exact(item,['type','value','message','hint'],path,ctx);text(item.value,`${path}.value`,ctx);messages();return;
  }
  if(item.type==='command'){
    exact(item,['type','value','min','message','hint'],path,ctx);text(item.value,`${path}.value`,ctx,{nonEmpty:true});optional(item.min,`${path}.min`,ctx,value=>integer(value,`${path}.min`,ctx,{min:1}));messages();return;
  }
  if(item.type==='regex'){
    exact(item,['type','value','flags','message','hint'],path,ctx);text(item.value,`${path}.value`,ctx,{nonEmpty:true});optionalString(item.flags,`${path}.flags`,ctx);messages();
    if(typeof item.value==='string'&&(item.flags===undefined||typeof item.flags==='string'))try{new RegExp(item.value,item.flags);}catch(error){issue(ctx,path,`invalid regular expression: ${error instanceof Error?error.message:String(error)}`);}return;
  }
  if(item.type==='compiles'){
    exact(item,['type','authority','message','hint'],path,ctx);optional(item.authority,`${path}.authority`,ctx,value=>oneOf(value,AUTHORITIES,`${path}.authority`,ctx));messages();return;
  }
  exact(item,['type','message','hint'],path,ctx);messages();
}

function validateConcept(value:unknown,path:string,ctx:Context){
  const item=object(value,path,ctx);if(!item)return;
  exact(item,['id','title','description','prerequisites','referenceIds'],path,ctx);id(item.id,`${path}.id`,ctx);text(item.title,`${path}.title`,ctx);text(item.description,`${path}.description`,ctx);stringArray(item.prerequisites,`${path}.prerequisites`,ctx);
  optional(item.referenceIds,`${path}.referenceIds`,ctx,value=>stringArray(value,`${path}.referenceIds`,ctx));
}

function validateReference(value:unknown,path:string,ctx:Context){
  const item=object(value,path,ctx);if(!item)return;
  exact(item,['id','command','category','aliases','title','description','syntax','example','resultLatex','related','arguments','mathMode','package','commonMistake'],path,ctx);
  id(item.id,`${path}.id`,ctx);text(item.command,`${path}.command`,ctx,{nonEmpty:true});text(item.category,`${path}.category`,ctx,{nonEmpty:true});stringArray(item.aliases,`${path}.aliases`,ctx);
  text(item.title,`${path}.title`,ctx);text(item.description,`${path}.description`,ctx);text(item.syntax,`${path}.syntax`,ctx);text(item.example,`${path}.example`,ctx);optionalString(item.resultLatex,`${path}.resultLatex`,ctx);stringArray(item.related,`${path}.related`,ctx);
  optional(item.arguments,`${path}.arguments`,ctx,value=>array(value,`${path}.arguments`,ctx,(argument,argumentPath)=>validateArgument(argument,argumentPath,ctx)));
  optional(item.mathMode,`${path}.mathMode`,ctx,value=>oneOf(value,MATH_MODES,`${path}.mathMode`,ctx));optionalString(item.package,`${path}.package`,ctx);optionalString(item.commonMistake,`${path}.commonMistake`,ctx);
}

function validateArgument(value:unknown,path:string,ctx:Context){
  const item=object(value,path,ctx);if(!item)return;
  exact(item,['name','required','description'],path,ctx);text(item.name,`${path}.name`,ctx,{nonEmpty:true});boolean(item.required,`${path}.required`,ctx);text(item.description,`${path}.description`,ctx);
}

function validateProject(value:unknown,path:string,ctx:Context){
  const item=object(value,path,ctx);if(!item)return;
  exact(item,['id','title','subtitle','difficulty','description','prerequisites','concepts','stages'],path,ctx);id(item.id,`${path}.id`,ctx);text(item.title,`${path}.title`,ctx);text(item.subtitle,`${path}.subtitle`,ctx);oneOf(item.difficulty,DIFFICULTIES,`${path}.difficulty`,ctx);
  text(item.description,`${path}.description`,ctx);stringArray(item.prerequisites,`${path}.prerequisites`,ctx);stringArray(item.concepts,`${path}.concepts`,ctx);
  array(item.stages,`${path}.stages`,ctx,(stage,stagePath)=>validateProjectStage(stage,stagePath,ctx));
}

function validateProjectStage(value:unknown,path:string,ctx:Context){
  const item=object(value,path,ctx);if(!item)return;
  exact(item,['id','title','objective','requirements','starterCode'],path,ctx);id(item.id,`${path}.id`,ctx);text(item.title,`${path}.title`,ctx);text(item.objective,`${path}.objective`,ctx);stringArray(item.requirements,`${path}.requirements`,ctx);text(item.starterCode,`${path}.starterCode`,ctx);
}

function validateGraph(value:unknown,path:string,ctx:Context){
  const graph=object(value,path,ctx);if(!graph)return;
  exact(graph,['nodes','conceptIds','topologicalOrder'],path,ctx);stringArray(graph.conceptIds,`${path}.conceptIds`,ctx);stringArray(graph.topologicalOrder,`${path}.topologicalOrder`,ctx);
  const nodes=object(graph.nodes,`${path}.nodes`,ctx);if(!nodes)return;
  for(const [key,nodeValue] of Object.entries(nodes)){
    const nodePath=`${path}.nodes.${key}`;const node=object(nodeValue,nodePath,ctx);if(!node)continue;
    exact(node,['id','title','description','requires','requiredBy','introducedBy','reinforcedBy','practicedBy','referenceIds','projectIds'],nodePath,ctx);
    id(node.id,`${nodePath}.id`,ctx);text(node.title,`${nodePath}.title`,ctx);text(node.description,`${nodePath}.description`,ctx);stringArray(node.requires,`${nodePath}.requires`,ctx);stringArray(node.requiredBy,`${nodePath}.requiredBy`,ctx);
    stringArray(node.introducedBy,`${nodePath}.introducedBy`,ctx);stringArray(node.reinforcedBy,`${nodePath}.reinforcedBy`,ctx);stringArray(node.practicedBy,`${nodePath}.practicedBy`,ctx);stringArray(node.referenceIds,`${nodePath}.referenceIds`,ctx);stringArray(node.projectIds,`${nodePath}.projectIds`,ctx);
  }
}

function validateNormalization(value:unknown,path:string,ctx:Context){
  const report=object(value,path,ctx);if(!report)return;exact(report,['changes','unresolved'],path,ctx);
  array(report.changes,`${path}.changes`,ctx,(change,changePath)=>{const item=object(change,changePath,ctx);if(!item)return;exact(item,['kind','sourceId','from','to'],changePath,ctx);oneOf(item.kind,NORMALIZATION_KINDS,`${changePath}.kind`,ctx);id(item.sourceId,`${changePath}.sourceId`,ctx);text(item.from,`${changePath}.from`,ctx,{nonEmpty:true});text(item.to,`${changePath}.to`,ctx,{nonEmpty:true});});
  array(report.unresolved,`${path}.unresolved`,ctx,(entry,entryPath)=>{const item=object(entry,entryPath,ctx);if(!item)return;exact(item,['sourceId','conceptId','kind'],entryPath,ctx);id(item.sourceId,`${entryPath}.sourceId`,ctx);id(item.conceptId,`${entryPath}.conceptId`,ctx);oneOf(item.kind,NORMALIZATION_KINDS,`${entryPath}.kind`,ctx);});
}

function validateIssues(value:unknown,path:string,ctx:Context){
  array(value,path,ctx,(entry,entryPath)=>{const item=object(entry,entryPath,ctx);if(!item)return;exact(item,['severity','code','message','moduleId','lessonId','exerciseId','projectId','conceptId','referenceId'],entryPath,ctx);oneOf(item.severity,['error','warning'] as const,`${entryPath}.severity`,ctx);text(item.code,`${entryPath}.code`,ctx,{nonEmpty:true});text(item.message,`${entryPath}.message`,ctx,{nonEmpty:true});for(const key of ['moduleId','lessonId','exerciseId','projectId','conceptId','referenceId'])optionalString(item[key],`${entryPath}.${key}`,ctx);});
}

function validateBuild(value:unknown,path:string,ctx:Context){
  const item=object(value,path,ctx);if(!item)return;exact(item,['moduleCount','lessonCount','exerciseCount','conceptCount','referenceCount','projectCount','normalizedConceptTags'],path,ctx);
  for(const key of ['moduleCount','lessonCount','exerciseCount','conceptCount','referenceCount','projectCount','normalizedConceptTags'])integer(item[key],`${path}.${key}`,ctx,{min:0});
}

function validateSimpleObject(value:unknown,path:string,ctx:Context,keys:readonly string[]){
  const item=object(value,path,ctx);if(!item)return;exact(item,keys,path,ctx);for(const key of keys)text(item[key],`${path}.${key}`,ctx);
}

function object(value:unknown,path:string,ctx:Context):RecordValue|undefined{
  if(value===null||typeof value!=='object'||Array.isArray(value)){issue(ctx,path,`expected object, received ${describe(value)}`);return undefined;}
  return value as RecordValue;
}
function exact(value:RecordValue,keys:readonly string[],path:string,ctx:Context){const allowed=new Set(keys);for(const key of Object.keys(value))if(!allowed.has(key))issue(ctx,`${path}.${key}`,'unknown field');}
function array(value:unknown,path:string,ctx:Context,visit:(item:unknown,path:string)=>void){if(!Array.isArray(value)){issue(ctx,path,`expected array, received ${describe(value)}`);return;}value.forEach((item,index)=>visit(item,`${path}[${index}]`));}
function stringArray(value:unknown,path:string,ctx:Context){array(value,path,ctx,(item,itemPath)=>text(item,itemPath,ctx,{nonEmpty:true}));}
function text(value:unknown,path:string,ctx:Context,options:{nonEmpty?:boolean;pattern?:RegExp}={}){if(typeof value!=='string'){issue(ctx,path,`expected string, received ${describe(value)}`);return;}if(options.nonEmpty&&value.trim().length===0)issue(ctx,path,'expected non-empty string');if(value!==value.trim()&&options.nonEmpty)issue(ctx,path,'must not have leading or trailing whitespace');if(options.pattern&&!options.pattern.test(value))issue(ctx,path,`does not match ${options.pattern}`);}
function id(value:unknown,path:string,ctx:Context){text(value,path,ctx,{nonEmpty:true});}
function optionalString(value:unknown,path:string,ctx:Context){optional(value,path,ctx,item=>text(item,path,ctx));}
function optional(value:unknown,_path:string,_ctx:Context,visit:(value:unknown)=>void){if(value!==undefined)visit(value);}
function integer(value:unknown,path:string,ctx:Context,options:{min:number}){if(typeof value!=='number'||!Number.isInteger(value)){issue(ctx,path,`expected integer, received ${describe(value)}`);return;}if(value<options.min)issue(ctx,path,`expected integer >= ${options.min}`);}
function boolean(value:unknown,path:string,ctx:Context){if(typeof value!=='boolean')issue(ctx,path,`expected boolean, received ${describe(value)}`);}
function oneOf<const T extends readonly string[]>(value:unknown,values:T,path:string,ctx:Context){if(typeof value!=='string'||!values.includes(value as T[number]))issue(ctx,path,`expected one of ${values.map(item=>JSON.stringify(item)).join(', ')}, received ${describe(value)}`);}
function issue(ctx:Context,path:string,message:string){ctx.issues.push(`${path}: ${message}`);}
function describe(value:unknown){if(value===null)return 'null';if(Array.isArray(value))return 'array';if(typeof value==='string')return JSON.stringify(value);return typeof value;}
