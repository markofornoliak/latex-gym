import { lazy, Suspense, useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BackIcon, ChevronIcon, PlayIcon } from '../components/Icons';
import { LatexPreview } from '../components/LatexPreview';
import { getRuntimeProject } from '../data/runtimeCatalog';
import { compiler } from '../services/compiler';
import { compilationStateLabel, isCompilationBusy } from '../services/compilerState';
import {
  encodeProjectAsset,
  encodedProjectAssetSize,
  isEncodedProjectAsset,
  isSupportedProjectAsset,
  PROJECT_ASSET_MAX_BYTES,
  PROJECT_ASSET_TOTAL_BYTES,
  toBinaryAwareCompilerProject,
  workspaceAssetBytes
} from '../services/projectAssets';
import { recordProjectStageEvidence } from '../services/projectMastery';
import {
  addWorkspaceFile,
  assessProjectStage,
  createProjectWorkspace,
  normalizeProjectFilePath,
  projectFileDraftKey,
  projectStageConcepts,
  type ProjectAssessment,
  type ProjectWorkspace
} from '../services/projectWorkspace';
import { useAppStore } from '../store/useAppStore';
import type { CompilationState, CompileResult } from '../types';

const CodeEditor=lazy(()=>import('../components/CodeEditor').then(module=>({default:module.CodeEditor})));
const EMPTY_PROJECT_PROGRESS:string[]=[];

export function ProjectPage(){
  const {projectId,stageId}=useParams();
  const navigate=useNavigate();
  const project=getRuntimeProject(projectId);
  const settings=useAppStore(store=>store.settings);
  const drafts=useAppStore(store=>store.drafts);
  const setDraft=useAppStore(store=>store.setDraft);
  const completeStage=useAppStore(store=>store.completeProjectStage);
  const completedProjectStages=useAppStore(store=>store.completedProjectStages);
  const projectProgress=completedProjectStages[projectId??'']??EMPTY_PROJECT_PROGRESS;
  const index=useMemo(()=>project?Math.max(0,stageId?project.stages.findIndex(stage=>stage.id===stageId):0):0,[project,stageId]);
  const stage=project?.stages[index];
  const [workspace,setWorkspace]=useState<ProjectWorkspace|null>(null);
  const [activeFile,setActiveFile]=useState('main.tex');
  const [result,setResult]=useState<CompileResult|null>(null);
  const [assessment,setAssessment]=useState<ProjectAssessment|null>(null);
  const [state,setState]=useState<CompilationState>('ready');
  const [saved,setSaved]=useState(true);
  const [newFileName,setNewFileName]=useState('');
  const [fileError,setFileError]=useState('');

  useEffect(()=>{
    if(!project||!stage)return;
    const next=createProjectWorkspace(project,index,drafts);
    setWorkspace(next);
    setActiveFile(current=>current in next.files?current:next.mainFile);
    setResult(null);setAssessment(null);setState('ready');setSaved(true);setFileError('');
  },[project?.id,stage?.id,index]);

  const activeSource=workspace?.files[activeFile]??'';
  useEffect(()=>{
    if(!project||!workspace||!(activeFile in workspace.files))return;
    setSaved(false);
    const source=workspace.files[activeFile];
    const timeout=window.setTimeout(()=>{setDraft(projectFileDraftKey(project.id,activeFile),source);setSaved(true);},260);
    return()=>window.clearTimeout(timeout);
  },[project?.id,activeFile,activeSource,setDraft]);

  if(!project||!stage||!workspace)return <div className="page empty-state"><h1>Проект не найден</h1><Link to="/projects">Вернуться к проектам</Link></div>;
  const busy=isCompilationBusy(state);
  const currentDone=projectProgress.includes(stage.id);
  const next=project.stages[index+1];
  const filePaths=sortProjectFiles(Object.keys(workspace.files),workspace.mainFile);
  const multiFile=filePaths.length>1;
  const activeIsAsset=isEncodedProjectAsset(activeSource);

  const saveWorkspace=()=>{
    for(const [path,content] of Object.entries(workspace.files))setDraft(projectFileDraftKey(project.id,path),content);
    setSaved(true);
  };
  const selectFile=(path:string)=>{
    setDraft(projectFileDraftKey(project.id,activeFile),workspace.files[activeFile]??'');
    setActiveFile(path);setFileError('');
  };
  const invalidateBuild=()=>{if(result)setResult(null);if(assessment)setAssessment(null);if(state!=='ready')setState('ready');};
  const updateSource=(value:string)=>{
    setWorkspace(current=>current?{...current,files:{...current.files,[activeFile]:value}}:current);
    invalidateBuild();
  };
  const addFile=()=>{
    const normalized=normalizeProjectFilePath(newFileName);
    const added=addWorkspaceFile(workspace,newFileName);
    if(added.error||!normalized){setFileError(added.error??'Проверьте путь файла.');return;}
    setWorkspace(added.workspace);setDraft(projectFileDraftKey(project.id,normalized),added.workspace.files[normalized]);setActiveFile(normalized);setNewFileName('');setFileError('');invalidateBuild();
  };
  const uploadAsset=async(event:ChangeEvent<HTMLInputElement>)=>{
    const file=event.target.files?.[0];event.target.value='';
    if(!file)return;
    const path=normalizeProjectFilePath(file.name);
    if(!path||!isSupportedProjectAsset(path)){setFileError('Поддерживаются PDF, PNG и JPEG с безопасным относительным именем.');return;}
    if(file.size>PROJECT_ASSET_MAX_BYTES){setFileError('Файл слишком большой. Для local-first проекта ограничение — 1 МБ на один PDF/рисунок.');return;}
    const previous=workspace.files[path];
    const previousBytes=previous?encodedProjectAssetSize(previous):0;
    if(workspaceAssetBytes(workspace)-previousBytes+file.size>PROJECT_ASSET_TOTAL_BYTES){setFileError('Суммарный объём бинарных файлов проекта превышает безопасный localStorage-бюджет 1,5 МБ. Уменьшите изображения или замените существующий asset.');return;}
    try{
      const encoded=encodeProjectAsset(new Uint8Array(await file.arrayBuffer()));
      setWorkspace(current=>current?{...current,files:{...current.files,[path]:encoded}}:current);
      setDraft(projectFileDraftKey(project.id,path),encoded);setActiveFile(path);setFileError('');invalidateBuild();
    }catch{setFileError('Не удалось прочитать файл. Исходники проекта не изменены.');}
  };
  const runCompile=async()=>{
    saveWorkspace();setState('queued');setAssessment(null);
    try{
      const compiled=await compiler.compile(toBinaryAwareCompilerProject(workspace),{onPhase:setState});
      setResult(compiled);
      return compiled;
    }catch(error){
      const message=error instanceof Error?error.message:String(error);setState('error');
      const failed:CompileResult={ok:false,diagnostics:[{severity:'error',line:1,message:'Сборка проекта не завершена',explanation:'Компилятор не вернул результат, но все файлы проекта сохранены локально.',suggestion:'Проверьте структуру проекта и повторите сборку.',source:'latex-gym',originalCompilerMessage:message}],blocks:[],elapsedMs:1,engine:'educational-preview'};
      setResult(failed);return null;
    }
  };
  const checkStage=async()=>{
    const compiled=await runCompile();
    if(!compiled)return;
    const checked=assessProjectStage(project,index,workspace,compiled);
    setAssessment(checked);
    if(!currentDone){
      recordProjectStageEvidence(projectStageConcepts(project.id,stage.id),checked.ok,checked.realCompile);
      if(checked.ok)completeStage(project.id,stage.id,`${project.title}: ${stage.title}`);
    }
  };
  const primaryAction=()=>{
    saveWorkspace();
    if(currentDone){if(next)navigate(`/project/${project.id}/${next.id}`);return;}
    void checkStage();
  };

  return <div className="project-workspace" data-project-files={filePaths.length}>
    <aside className="project-stage-nav"><Link className="project-back" to="/projects" onClick={saveWorkspace}><BackIcon/> Проекты</Link><span className="eyebrow">{project.title}</span><nav aria-label="Этапы проекта">{project.stages.map((item,itemIndex)=><Link key={item.id} to={`/project/${project.id}/${item.id}`} onClick={saveWorkspace} className={`${item.id===stage.id?'active':''} ${projectProgress.includes(item.id)?'done':''}`}><span>{String(itemIndex+1).padStart(2,'0')}</span><strong>{item.title.replace(/^\d+\.\s*/, '')}</strong>{projectProgress.includes(item.id)&&<i>✓</i>}</Link>)}</nav></aside>
    <main className="project-main">
      <header className="project-header"><span className="eyebrow">ПРОЕКТ · ЭТАП {index+1} ИЗ {project.stages.length}</span><h1>{stage.title}</h1><p>{stage.objective}</p></header>
      <section className="project-requirements"><span className="eyebrow">КРИТЕРИИ ЭТАПА</span><ul>{stage.requirements.map(requirement=><li key={requirement}>{requirement}</li>)}</ul>{index>0&&<p className="project-integrity-note">Продолжайте тот же проект: требования предыдущих этапов должны оставаться рабочими.</p>}</section>

      <section className="project-editor">
        <div className="project-files" aria-label="Файлы проекта">
          <div className="project-files-head"><div><span className="eyebrow">ФАЙЛЫ</span><strong>{filePaths.length} · корень {workspace.mainFile}</strong></div><span>{multiFile?'Многофайловый проект':'Один файл'}</span></div>
          <div className="project-file-list" aria-label="Файлы проекта">{filePaths.map(path=><button key={path} type="button" aria-pressed={activeFile===path} className={activeFile===path?'active':''} onClick={()=>selectFile(path)}><span>{fileKind(path)}</span><strong>{path}</strong>{path===workspace.mainFile&&<small>root</small>}</button>)}</div>
          <div className="project-add-file"><label htmlFor="project-new-file">Добавить исходный файл</label><div><input id="project-new-file" value={newFileName} onChange={event=>{setNewFileName(event.target.value);setFileError('');}} placeholder="sections/discussion.tex" onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();addFile();}}}/><button type="button" className="secondary-button" onClick={addFile}>Добавить</button><label className="project-upload-button">PDF / изображение<input type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" onChange={event=>{void uploadAsset(event);}}/></label></div>{fileError&&<small role="alert">{fileError}</small>}</div>
        </div>

        <div className="project-active-file"><span>{activeFile}</span>{activeFile!==workspace.mainFile&&result?.diagnostics.length&&!activeIsAsset?<small>Диагностика TeX относится к общей сборке проекта; точные диапазоны subfile пока не симулируются.</small>:null}</div>
        <div className="editor-status-line" aria-live="polite"><span className={`compile-state compile-state--${state}`}>{compilationStateLabel(state)}</span><span>{result?engineLabel(result):saved?'Все изменения сохранены локально':'Сохранение…'}</span></div>
        {activeIsAsset?<div className="project-asset-inspector" role="region" aria-label={`Файл ${activeFile}`}><span>{fileKind(activeFile)}</span><h2>{activeFile}</h2><p>{formatBytes(encodedProjectAssetSize(activeSource))} · хранится локально и передаётся TeX как бинарный файл при сборке.</p><label className="secondary-button">Заменить файл<input type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" onChange={event=>{void uploadAsset(event);}}/></label></div>:<Suspense fallback={<div className="editor-loading">Загрузка редактора…</div>}><CodeEditor value={activeSource} onChange={updateSource} wordWrap={settings.wordWrap} showLineNumbers={settings.lineNumbers} autoClose={settings.autoClose} minHeight={410} onCompile={()=>{void runCompile();}} onSave={saveWorkspace} diagnostics={activeFile===workspace.mainFile?(result?.diagnostics??[]):[]}/></Suspense>}
        {assessment&&<section className={`project-assessment ${assessment.ok?'project-assessment--ok':''}`} aria-live="polite"><header><div><span className="eyebrow">ПРОВЕРКА ЭТАПА</span><h2>{assessment.ok?'Этап подтверждён':'Проект ещё не готов'}</h2></div><small>{assessment.realCompile?'Проверено реальным TeX':'Проверка без подтверждённого real-PDF'}</small></header><div>{assessment.items.map(item=><div className="project-assessment-row" key={item.id}><span aria-hidden="true">{item.ok?'✓':'×'}</span><p><strong>{item.label}</strong>{item.detail&&<small>{item.detail}</small>}</p></div>)}</div></section>}
        <div className="project-editor-actions"><button className="compile-button" onClick={()=>{void runCompile();}} disabled={busy}><PlayIcon/>{busy?compilationStateLabel(state):'Скомпилировать проект'}</button><button className="primary-button" onClick={primaryAction} disabled={busy||currentDone&&!next}>{currentDone?(next?'Продолжить':'Проект завершён'):'Проверить этап'}{currentDone&&next&&<ChevronIcon/>}</button></div>
      </section>
    </main>
    <aside className="project-preview"><span className="eyebrow">РЕЗУЛЬТАТ</span><div className="project-paper"><LatexPreview result={result}/></div><p>{result?.pdf?`Реальный PDF собран из ${filePaths.length} ${pluralFiles(filePaths.length)}.`:result?.fallbackReason?multiFile?'Учебный fallback не считается подтверждением многофайлового проекта.':'Реальный TeX недоступен: показан явно обозначенный учебный fallback.':'Скомпилируйте весь проект, чтобы проверить root document, зависимости и выходной PDF.'}</p></aside>
  </div>;
}

function engineLabel(result:CompileResult){if(result.fallbackReason)return 'Учебный fallback';if(result.engine==='pdflatex')return 'pdfLaTeX';if(result.engine==='xelatex')return 'XeLaTeX';if(result.engine==='lualatex')return 'LuaLaTeX';return 'Учебный предпросмотр';}
function sortProjectFiles(files:string[],mainFile:string){return [...files].sort((a,b)=>a===mainFile?-1:b===mainFile?1:a.localeCompare(b));}
function fileKind(path:string){if(path.endsWith('.tex'))return 'TEX';if(path.endsWith('.bib'))return 'BIB';if(path.toLowerCase().endsWith('.pdf'))return 'PDF';if(/\.(png|jpe?g)$/i.test(path))return 'IMG';return 'FILE';}
function pluralFiles(count:number){const mod10=count%10,mod100=count%100;return mod10===1&&mod100!==11?'файла':mod10>=2&&mod10<=4&&(mod100<12||mod100>14)?'файла':'файлов';}
function formatBytes(bytes:number){if(bytes<1024)return `${bytes} Б`;if(bytes<1024*1024)return `${(bytes/1024).toFixed(1)} КБ`;return `${(bytes/1024/1024).toFixed(1)} МБ`;}
