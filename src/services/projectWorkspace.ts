import type { CompileResult, CompilerProject, LearningProject } from '../types';

export type ProjectWorkspace={mainFile:string;files:Record<string,string>};
export type ProjectAssessmentItem={id:string;label:string;ok:boolean;detail?:string;kind:'compiler'|'integrity'|'stage'};
export type ProjectAssessment={ok:boolean;items:ProjectAssessmentItem[];realCompile:boolean};

type StageSeed={files:Record<string,string>;concepts:string[]};

const stageSeeds:Record<string,StageSeed>={
  'mathematical-notes:structure':{files:{},concepts:['document-body','section']},
  'mathematical-notes:notation':{files:{},concepts:['inline-math','paragraph']},
  'mathematical-notes:formula':{files:{},concepts:['display-math','fraction']},
  'mathematical-notes:equation':{files:{},concepts:['equation','label']},
  'mathematical-notes:reference':{files:{},concepts:['label','ref']},
  'laboratory-report:sections':{files:{},concepts:['section']},
  'laboratory-report:method':{files:{},concepts:['paragraph']},
  'laboratory-report:table':{files:{},concepts:['tabular','professional-table']},
  'laboratory-report:figure':{files:{},concepts:['figure','caption','float']},
  'laboratory-report:crossrefs':{files:{},concepts:['label','ref']},
  'laboratory-report:final':{files:{},concepts:['professional-workflow']},
  'academic-paper:stage-1':{files:{},concepts:['document-class','document-body']},
  'academic-paper:stage-2':{files:{},concepts:['preamble']},
  'academic-paper:stage-3':{files:{},concepts:['section']},
  'academic-paper:stage-4':{files:{},concepts:['math-mode','label']},
  'academic-paper:stage-5':{files:{},concepts:['figure','caption','label']},
  'academic-paper:stage-6':{files:{},concepts:['tabular','professional-table']},
  'academic-paper:stage-7':{files:{},concepts:['label','ref']},
  'academic-paper:stage-8':{files:{
    'references.bib':'@book{knuth1984,\n  author = {Donald E. Knuth},\n  title = {The TeXbook},\n  year = {1984},\n  publisher = {Addison-Wesley}\n}\n'
  },concepts:['bibliography-model','citation']},
  'academic-paper:stage-9':{files:{},concepts:['appendix']},
  'academic-paper:stage-10':{files:{
    'sections/introduction.tex':'% Перенесите сюда содержимое раздела Introduction.\n',
    'sections/method.tex':'% Перенесите сюда содержимое раздела Method.\n',
    'sections/results.tex':'% Перенесите сюда содержимое раздела Results.\n',
    'macros.tex':'% Общие семантические команды проекта.\n'
  },concepts:['project-architecture']},
  'technical-report:class':{files:{},concepts:['document-class']},
  'technical-report:layout':{files:{},concepts:['page-structure']},
  'technical-report:files':{files:{
    'chapters/system.tex':'% Содержимое главы System overview.\n\\chapter{System overview}\n',
    'chapters/validation.tex':'% Содержимое главы Validation.\n\\chapter{Validation}\n'
  },concepts:['multi-file','project-architecture']},
  'technical-report:headers':{files:{},concepts:['headers-footers']},
  'technical-report:appendix':{files:{},concepts:['appendix']},
  'technical-report:build':{files:{},concepts:['project-architecture','professional-workflow']},
  'beamer-presentation:frame':{files:{},concepts:['document-class','environment']},
  'beamer-presentation:structure':{files:{},concepts:['section','environment']},
  'beamer-presentation:math':{files:{},concepts:['math-mode']},
  'beamer-presentation:figure':{files:{},concepts:['figure']},
  'beamer-presentation:final':{files:{},concepts:['professional-workflow']}
};

const filePrefix=(projectId:string)=>`project:${projectId}:file:`;
export const projectFileDraftKey=(projectId:string,path:string)=>`${filePrefix(projectId)}${path}`;

export function normalizeProjectFilePath(input:string){
  const value=input.trim().replaceAll('\\','/').replace(/^\.\//,'').replace(/\/{2,}/g,'/');
  if(!value||value.startsWith('/')||value.endsWith('/')||value.includes('\0'))return null;
  const parts=value.split('/');
  if(parts.some(part=>!part||part==='.'||part==='..'))return null;
  if(!/^[\w@.+\- /]+$/u.test(value))return null;
  return value;
}

export function createProjectWorkspace(project:LearningProject,stageIndex:number,drafts:Record<string,string>):ProjectWorkspace{
  const stage=project.stages[Math.max(0,stageIndex)]??project.stages[0];
  const mainFile='main.tex';
  const legacyWorkspace=drafts[`project:${project.id}:workspace`];
  const legacyStage=stage?drafts[`project:${project.id}:${stage.id}`]:undefined;
  const mainDraft=drafts[projectFileDraftKey(project.id,mainFile)];
  const files:Record<string,string>={[mainFile]:mainDraft??legacyWorkspace??legacyStage??stage?.starterCode??'\\documentclass{article}\n\\begin{document}\n\\end{document}'};
  const prefix=filePrefix(project.id);
  for(const [key,content] of Object.entries(drafts)){
    if(!key.startsWith(prefix))continue;
    const path=normalizeProjectFilePath(key.slice(prefix.length));
    if(path)files[path]=content;
  }
  return ensureStageFiles(project,stageIndex,{mainFile,files},drafts);
}

export function ensureStageFiles(project:LearningProject,stageIndex:number,workspace:ProjectWorkspace,drafts:Record<string,string>):ProjectWorkspace{
  const files={...workspace.files};
  for(let index=0;index<=stageIndex;index+=1){
    const stage=project.stages[index];
    if(!stage)continue;
    const seed=stageSeeds[`${project.id}:${stage.id}`];
    if(!seed)continue;
    for(const [path,content] of Object.entries(seed.files)){
      if(path in files)continue;
      files[path]=drafts[projectFileDraftKey(project.id,path)]??content;
    }
  }
  return {...workspace,files};
}

export function addWorkspaceFile(workspace:ProjectWorkspace,input:string){
  const path=normalizeProjectFilePath(input);
  if(!path)return {workspace,error:'Используйте относительный путь без .. и специальных символов.'};
  if(path in workspace.files)return {workspace,error:'Файл с таким путём уже существует.'};
  return {workspace:{...workspace,files:{...workspace.files,[path]:path.endsWith('.bib')?'% Bibliography database\n':`% ${path}\n`}},error:null};
}

export function toCompilerProject(workspace:ProjectWorkspace):CompilerProject{
  return {mainFile:workspace.mainFile,files:Object.entries(workspace.files).map(([path,content])=>({path,content}))};
}

export function projectStageConcepts(projectId:string,stageId:string){
  return stageSeeds[`${projectId}:${stageId}`]?.concepts??[];
}

export function assessProjectStage(project:LearningProject,stageIndex:number,workspace:ProjectWorkspace,result:CompileResult):ProjectAssessment{
  const stage=project.stages[stageIndex];
  const items:ProjectAssessmentItem[]=[];
  const paths=Object.keys(workspace.files);
  const texFiles=paths.filter(path=>path.endsWith('.tex'));
  const multiFile=paths.length>1;
  const realCompile=Boolean(result.pdf?.length&&!result.fallbackReason);

  items.push({id:'compiler',kind:'compiler',label:multiFile?'Многофайловый проект собирается реальным TeX':'Документ компилируется',ok:result.ok&&(!multiFile||realCompile),detail:result.fallbackReason&&multiFile?'Учебный предпросмотр не подтверждает корректность нескольких файлов.':undefined});
  items.push({id:'main-file',kind:'integrity',label:`Корневой документ — ${workspace.mainFile}`,ok:Boolean(workspace.files[workspace.mainFile])});

  const roots=texFiles.filter(path=>/\\documentclass(?:\[[^\]]*\])?\{/.test(workspace.files[path]??''));
  items.push({id:'single-root',kind:'integrity',label:'В проекте один корневой документ с \\documentclass',ok:roots.length===1&&roots[0]===workspace.mainFile,detail:roots.length>1?`Найдены корни: ${roots.join(', ')}`:roots.length===0?'\\documentclass не найден.':undefined});

  const unresolved=findUnresolvedInputs(workspace);
  items.push({id:'inputs',kind:'integrity',label:'Все \\input / \\include указывают на существующие файлы',ok:unresolved.length===0,detail:unresolved.length?`Не найдены: ${unresolved.join(', ')}`:undefined});

  for(const check of stageSpecificChecks(project.id,stage?.id??'',workspace))items.push(check);

  return {ok:items.every(item=>item.ok),items,realCompile};
}

function stageSpecificChecks(projectId:string,stageId:string,workspace:ProjectWorkspace):ProjectAssessmentItem[]{
  if(projectId==='academic-paper'&&stageId==='stage-10'){
    return [
      fileCheck(workspace,'sections/introduction.tex'),fileCheck(workspace,'sections/method.tex'),fileCheck(workspace,'sections/results.tex'),
      containsCheck(workspace.mainFile,workspace,'\\input{sections/introduction}','main.tex подключает introduction через \\input'),
      containsCheck(workspace.mainFile,workspace,'\\input{sections/method}','main.tex подключает method через \\input'),
      containsCheck(workspace.mainFile,workspace,'\\input{sections/results}','main.tex подключает results через \\input'),
      subfilesHaveNoDocumentClass(workspace)
    ];
  }
  if(projectId==='technical-report'&&(stageId==='files'||stageId==='build')){
    return [
      fileCheck(workspace,'chapters/system.tex'),fileCheck(workspace,'chapters/validation.tex'),
      inputTargetCheck(workspace,'chapters/system'),inputTargetCheck(workspace,'chapters/validation'),
      subfilesHaveNoDocumentClass(workspace)
    ];
  }
  return [];
}

function fileCheck(workspace:ProjectWorkspace,path:string):ProjectAssessmentItem{
  return {id:`file:${path}`,kind:'stage',label:`Файл ${path} существует`,ok:path in workspace.files};
}
function containsCheck(path:string,workspace:ProjectWorkspace,value:string,label:string):ProjectAssessmentItem{
  return {id:`contains:${path}:${value}`,kind:'stage',label,ok:(workspace.files[path]??'').includes(value)};
}
function inputTargetCheck(workspace:ProjectWorkspace,target:string):ProjectAssessmentItem{
  const source=workspace.files[workspace.mainFile]??'';
  const pattern=new RegExp(`\\\\(?:input|include)\\{${escapeRegExp(target)}\\}`);
  return {id:`input:${target}`,kind:'stage',label:`main.tex подключает ${target}.tex`,ok:pattern.test(source)};
}
function subfilesHaveNoDocumentClass(workspace:ProjectWorkspace):ProjectAssessmentItem{
  const offenders=Object.entries(workspace.files).filter(([path,content])=>path!==workspace.mainFile&&path.endsWith('.tex')&&/\\documentclass(?:\[[^\]]*\])?\{/.test(content)).map(([path])=>path);
  return {id:'subfile-root',kind:'integrity',label:'Подключаемые .tex-файлы не создают второй document root',ok:offenders.length===0,detail:offenders.length?`Уберите \\documentclass из: ${offenders.join(', ')}`:undefined};
}

function findUnresolvedInputs(workspace:ProjectWorkspace){
  const missing=new Set<string>();
  for(const [sourcePath,source] of Object.entries(workspace.files)){
    if(!sourcePath.endsWith('.tex'))continue;
    for(const match of source.matchAll(/\\(?:input|include)\{([^}]+)\}/g)){
      const target=resolveTexPath(sourcePath,match[1]);
      if(!(target in workspace.files))missing.add(target);
    }
  }
  return [...missing];
}
function resolveTexPath(sourcePath:string,target:string){
  const base=sourcePath.includes('/')?sourcePath.slice(0,sourcePath.lastIndexOf('/')+1):'';
  const raw=(target.endsWith('.tex')?target:`${target}.tex`);
  const parts=`${base}${raw}`.split('/');
  const normalized:string[]=[];
  for(const part of parts){if(!part||part==='.')continue;if(part==='..')normalized.pop();else normalized.push(part);}
  return normalized.join('/');
}
function escapeRegExp(value:string){return value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
