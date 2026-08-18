import type { CompileResult, CompilerProject, CompilerProjectFile, LearningProjectStage, ProjectStageCriterion, ProjectWorkspace } from '../types';
import { validateSourceRules, type ValidationItem, type ValidationResult } from './validator';

const TEXT_EXTENSIONS=new Set(['tex','bib','sty','cls','txt']);
const BUILT_IN_ASSETS:Record<string,string[]>={
  'academic-paper':['response.pdf'],
  'laboratory-report':['result.pdf'],
  'beamer-presentation':['result.pdf']
};

export type ProjectPathResult={ok:true;path:string}|{ok:false;error:string};
export type ProjectWorkspaceMutation={ok:true;workspace:ProjectWorkspace}|{ok:false;error:string};
export type ProjectStageValidation=ValidationResult&{compileVerified:boolean;realCompile:boolean};

export function normalizeProjectPath(input:string):ProjectPathResult{
  const path=input.trim().replace(/\\/g,'/').replace(/^\.\//,'').replace(/\/{2,}/g,'/');
  if(!path)return {ok:false,error:'Введите имя файла.'};
  if(path.startsWith('/')||/^[A-Za-z]:\//.test(path))return {ok:false,error:'Используйте путь внутри проекта, без абсолютного адреса.'};
  const parts=path.split('/');
  if(parts.some(part=>!part||part==='.'||part==='..'))return {ok:false,error:'Путь не должен выходить за пределы проекта.'};
  if(/[\u0000-\u001f<>:"|?*]/.test(path))return {ok:false,error:'В имени файла есть недопустимый символ.'};
  if(path.length>180)return {ok:false,error:'Путь слишком длинный.'};
  const extension=path.includes('.')?path.split('.').pop()!.toLowerCase():'';
  if(!TEXT_EXTENSIONS.has(extension))return {ok:false,error:'В редакторе проекта можно создавать .tex, .bib, .sty, .cls и .txt файлы.'};
  return {ok:true,path};
}

export function createProjectWorkspace(projectId:string,initialSource:string,now=new Date()):ProjectWorkspace{
  return {schemaVersion:1,projectId,mainFile:'main.tex',activeFile:'main.tex',files:{'main.tex':initialSource},revision:1,updatedAt:now.toISOString()};
}

export function normalizeProjectWorkspace(value:Partial<ProjectWorkspace>|undefined,projectId:string,fallbackSource:string,now=new Date()):ProjectWorkspace{
  if(!value||typeof value!=='object')return createProjectWorkspace(projectId,fallbackSource,now);
  const files=Object.fromEntries(Object.entries(value.files??{}).filter(([path,content])=>normalizeProjectPath(path).ok&&typeof content==='string'));
  if(!Object.keys(files).length)files['main.tex']=fallbackSource;
  const mainCandidate=typeof value.mainFile==='string'&&files[value.mainFile]!==undefined?value.mainFile:Object.keys(files).find(path=>path.endsWith('.tex'))??Object.keys(files)[0];
  const activeCandidate=typeof value.activeFile==='string'&&files[value.activeFile]!==undefined?value.activeFile:mainCandidate;
  return {
    schemaVersion:1,projectId,mainFile:mainCandidate,activeFile:activeCandidate,files,
    revision:typeof value.revision==='number'&&value.revision>0?Math.floor(value.revision):1,
    updatedAt:typeof value.updatedAt==='string'?value.updatedAt:now.toISOString()
  };
}

function nextWorkspace(workspace:ProjectWorkspace,patch:Partial<ProjectWorkspace>,now=new Date()):ProjectWorkspace{
  return {...workspace,...patch,schemaVersion:1,projectId:workspace.projectId,revision:workspace.revision+1,updatedAt:now.toISOString()};
}

export function setWorkspaceFileContent(workspace:ProjectWorkspace,path:string,content:string,now=new Date()):ProjectWorkspace{
  if(workspace.files[path]===undefined||workspace.files[path]===content)return workspace;
  return nextWorkspace(workspace,{files:{...workspace.files,[path]:content}},now);
}

export function addWorkspaceFile(workspace:ProjectWorkspace,input:string,content='',now=new Date()):ProjectWorkspaceMutation{
  const normalized=normalizeProjectPath(input);
  if(!normalized.ok)return normalized;
  if(workspace.files[normalized.path]!==undefined)return {ok:false,error:'Такой файл уже существует.'};
  const updated=nextWorkspace(workspace,{files:{...workspace.files,[normalized.path]:content},activeFile:normalized.path},now);
  return {ok:true,workspace:updated};
}

export function removeWorkspaceFile(workspace:ProjectWorkspace,path:string,now=new Date()):ProjectWorkspaceMutation{
  if(path===workspace.mainFile)return {ok:false,error:'Главный файл проекта нельзя удалить.'};
  if(workspace.files[path]===undefined)return {ok:false,error:'Файл уже отсутствует.'};
  const files={...workspace.files};delete files[path];
  const activeFile=workspace.activeFile===path?workspace.mainFile:workspace.activeFile;
  return {ok:true,workspace:nextWorkspace(workspace,{files,activeFile},now)};
}

export function setWorkspaceActiveFile(workspace:ProjectWorkspace,path:string):ProjectWorkspace{
  if(workspace.files[path]===undefined||workspace.activeFile===path)return workspace;
  return {...workspace,activeFile:path};
}

export function setWorkspaceMainFile(workspace:ProjectWorkspace,path:string,now=new Date()):ProjectWorkspaceMutation{
  if(workspace.files[path]===undefined)return {ok:false,error:'Главный файл должен существовать в проекте.'};
  if(!path.endsWith('.tex'))return {ok:false,error:'Главный файл TeX-проекта должен иметь расширение .tex.'};
  if(path===workspace.mainFile)return {ok:true,workspace};
  return {ok:true,workspace:nextWorkspace(workspace,{mainFile:path,activeFile:path},now)};
}

export function projectBuiltInAssetNames(projectId:string){return BUILT_IN_ASSETS[projectId]??[];}

export function projectWorkspaceToCompilerProject(workspace:ProjectWorkspace):CompilerProject{
  const files:CompilerProjectFile[]=Object.entries(workspace.files).map(([path,content])=>({path,content}));
  for(const asset of projectBuiltInAssetNames(workspace.projectId)){
    if(workspace.files[asset]===undefined)files.push({path:asset,content:createPlaceholderPdf()});
  }
  return {mainFile:workspace.mainFile,files};
}

export function validateProjectStage(stage:LearningProjectStage,workspace:ProjectWorkspace,compileResult:CompileResult|null,compiledRevision:number|null,previousStages:LearningProjectStage[]=[]):ProjectStageValidation{
  const mainSource=workspace.files[workspace.mainFile]??'';
  const sourceValidation=validateSourceRules(stage.validators??[],mainSource,compileResult??undefined,false);
  const projectItems=(stage.projectCriteria??[]).map(criterion=>validateProjectCriterion(criterion,workspace));
  const inheritedFailures=previousStages.flatMap(previous=>{
    const sourceItems=validateSourceRules(previous.validators??[],mainSource,compileResult??undefined,false).items;
    const treeItems=(previous.projectCriteria??[]).map(criterion=>validateProjectCriterion(criterion,workspace));
    return [...sourceItems,...treeItems].filter(item=>!item.ok).map(item=>({...item,message:`Нарушено из «${previous.title}»: ${item.message}`}));
  });
  const currentBuild=Boolean(compileResult&&compiledRevision===workspace.revision);
  const realCompile=Boolean(currentBuild&&compileResult?.ok&&compileResult.pdf?.length&&!compileResult.fallbackReason);
  const compileItem:ValidationItem={
    ok:realCompile,
    message:realCompile?'Текущая revision подтверждена реальным TeX/PDF.':'Соберите текущую revision реальным TeX-движком.',
    hint:!currentBuild?'После последнего изменения проект нужно собрать заново.':compileResult?.fallbackReason?'Учебный предпросмотр сохраняет работу, но не подтверждает applied mastery проекта.':compileResult?.ok?'Нужен реальный PDF, а не только учебный preview.':'Исправьте первую содержательную ошибку TeX и соберите снова.'
  };
  const referenceWarnings=currentBuild?compileResult?.diagnostics.filter(item=>item.severity==='warning'&&/(undefined references?|reference .* undefined|citation .* undefined|multiply defined labels?)/i.test(`${item.message} ${item.originalCompilerMessage??''}`))??[]:[];
  const linksItem:ValidationItem|undefined=referenceWarnings.length?{
    ok:false,message:'В проекте остались неразрешённые ссылки или цитаты.',hint:'Исправьте ключи label/ref/cite и выполните повторную сборку.'
  }:undefined;
  const items=[...sourceValidation.items,...projectItems,...inheritedFailures,compileItem,...(linksItem?[linksItem]:[])];
  return {ok:items.every(item=>item.ok),items,compileVerified:realCompile,realCompile};
}

function validateProjectCriterion(criterion:ProjectStageCriterion,workspace:ProjectWorkspace):ValidationItem{
  const assetNames=projectBuiltInAssetNames(workspace.projectId);
  let ok=false;
  switch(criterion.type){
    case 'fileExists':ok=workspace.files[criterion.path]!==undefined||assetNames.includes(criterion.path);break;
    case 'fileContains':ok=workspace.files[criterion.path]?.includes(criterion.value)??false;break;
    case 'mainContains':ok=workspace.files[workspace.mainFile]?.includes(criterion.value)??false;break;
    case 'noSecondaryDocumentClass':ok=Object.entries(workspace.files).filter(([path])=>path.endsWith('.tex')&&path!==workspace.mainFile).every(([,content])=>!content.includes('\\documentclass'));break;
  }
  return {ok,message:criterion.message,hint:criterion.hint};
}

function createPlaceholderPdf(){
  const stream='0.8 w\n36 36 228 108 re S\n48 64 m 86 98 l 126 78 l 170 124 l 214 104 l 252 138 l S\n';
  const objects=[
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 180] /Resources << >> /Contents 4 0 R >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}endstream`
  ];
  let pdf='%PDF-1.4\n';const offsets=[0];
  objects.forEach((object,index)=>{offsets.push(pdf.length);pdf+=`${index+1} 0 obj\n${object}\nendobj\n`;});
  const xref=pdf.length;pdf+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;
  for(let index=1;index<offsets.length;index++)pdf+=`${String(offsets[index]).padStart(10,'0')} 00000 n \n`;
  pdf+=`trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(pdf);
}
