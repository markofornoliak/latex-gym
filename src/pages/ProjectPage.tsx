import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BackIcon, ChevronIcon, PlayIcon } from '../components/Icons';
import { LatexPreview } from '../components/LatexPreview';
import { getProject } from '../data/projects';
import { compiler } from '../services/compiler';
import { compilationStateLabel, isCompilationBusy } from '../services/compilerState';
import {
  addWorkspaceFile,
  normalizeProjectWorkspace,
  projectBuiltInAssetNames,
  projectWorkspaceToCompilerProject,
  removeWorkspaceFile,
  setWorkspaceActiveFile,
  setWorkspaceFileContent,
  setWorkspaceMainFile,
  validateProjectStage,
  type ProjectStageValidation,
  type ProjectWorkspaceMutation
} from '../services/projectWorkspace';
import { useAppStore } from '../store/useAppStore';
import type { CompilationState, CompileResult, ProjectWorkspace } from '../types';

const CodeEditor=lazy(()=>import('../components/CodeEditor').then(module=>({default:module.CodeEditor})));
const EMPTY_PROJECT_PROGRESS:string[]=[];

export function ProjectPage(){
  const {projectId,stageId}=useParams();
  const navigate=useNavigate();
  const project=getProject(projectId);
  const settings=useAppStore(store=>store.settings);
  const drafts=useAppStore(store=>store.drafts);
  const projectWorkspaces=useAppStore(store=>store.projectWorkspaces);
  const ensureProjectWorkspace=useAppStore(store=>store.ensureProjectWorkspace);
  const saveProjectWorkspace=useAppStore(store=>store.saveProjectWorkspace);
  const completeStage=useAppStore(store=>store.completeProjectStage);
  const completedProjectStages=useAppStore(store=>store.completedProjectStages);
  const projectProgress=completedProjectStages[projectId??'']??EMPTY_PROJECT_PROGRESS;
  const index=useMemo(()=>project?Math.max(0,stageId?project.stages.findIndex(stage=>stage.id===stageId):0):0,[project,stageId]);
  const stage=project?.stages[index];
  const [workspace,setWorkspace]=useState<ProjectWorkspace|null>(null);
  const workspaceRef=useRef<ProjectWorkspace|null>(null);
  const [result,setResult]=useState<CompileResult|null>(null);
  const [compiledRevision,setCompiledRevision]=useState<number|null>(null);
  const [state,setState]=useState<CompilationState>('ready');
  const [saved,setSaved]=useState(true);
  const [stageValidation,setStageValidation]=useState<ProjectStageValidation|null>(null);
  const [newFilePath,setNewFilePath]=useState('');
  const [fileError,setFileError]=useState('');

  useEffect(()=>{
    if(!project||!stage)return;
    const existing=projectWorkspaces[project.id];
    const legacy=drafts[`project:${project.id}:workspace`]??drafts[`project:${project.id}:${stage.id}`];
    const next=normalizeProjectWorkspace(existing,project.id,legacy??stage.starterCode);
    workspaceRef.current=next;setWorkspace(next);setResult(null);setCompiledRevision(null);setStageValidation(null);setState('ready');setSaved(Boolean(existing));setFileError('');
    if(!existing)ensureProjectWorkspace(project.id,stage.starterCode,legacy);
  },[project?.id]);

  useEffect(()=>{setStageValidation(null);},[stage?.id]);

  useEffect(()=>{
    if(!workspace)return;
    workspaceRef.current=workspace;setSaved(false);
    const timeout=window.setTimeout(()=>{saveProjectWorkspace(workspace);setSaved(true);},320);
    return()=>window.clearTimeout(timeout);
  },[workspace,saveProjectWorkspace]);

  if(!project||!stage)return <div className="page empty-state"><h1>Проект не найден</h1><Link to="/projects">Вернуться к проектам</Link></div>;
  if(!workspace)return <div className="page project-loading" role="status">Открываем рабочую область проекта…</div>;

  const busy=isCompilationBusy(state);
  const currentDone=projectProgress.includes(stage.id);
  const next=project.stages[index+1];
  const activeSource=workspace.files[workspace.activeFile]??'';
  const builtInAssets=projectBuiltInAssetNames(project.id);
  const buildIsCurrent=Boolean(result&&compiledRevision===workspace.revision);

  const invalidateBuild=()=>{setResult(null);setCompiledRevision(null);setStageValidation(null);if(state!=='ready')setState('ready');};
  const replaceWorkspace=(nextWorkspace:ProjectWorkspace,{invalidate=true}:{invalidate?:boolean}={})=>{
    workspaceRef.current=nextWorkspace;setWorkspace(nextWorkspace);if(invalidate)invalidateBuild();
  };
  const applyMutation=(mutation:ProjectWorkspaceMutation)=>{
    if(!mutation.ok){setFileError(mutation.error);return false;}
    setFileError('');replaceWorkspace(mutation.workspace);return true;
  };
  const updateActiveSource=(value:string)=>replaceWorkspace(setWorkspaceFileContent(workspace,workspace.activeFile,value));
  const openFile=(path:string)=>replaceWorkspace(setWorkspaceActiveFile(workspace,path),{invalidate:false});
  const createFile=(event:React.FormEvent)=>{
    event.preventDefault();
    const mutation=addWorkspaceFile(workspace,newFilePath);
    if(applyMutation(mutation))setNewFilePath('');
  };
  const deleteFile=(path:string)=>{
    if(!window.confirm(`Удалить ${path} из проекта?`))return;
    applyMutation(removeWorkspaceFile(workspace,path));
  };
  const makeMain=(path:string)=>{applyMutation(setWorkspaceMainFile(workspace,path));};
  const saveNow=()=>{saveProjectWorkspace(workspace);setSaved(true);};

  const runCompile=async()=>{
    const snapshot=workspaceRef.current;
    if(!snapshot)return null;
    saveProjectWorkspace(snapshot);setSaved(true);setState('queued');setStageValidation(null);
    try{
      const compiled=await compiler.compile(projectWorkspaceToCompilerProject(snapshot),{onPhase:setState});
      if(workspaceRef.current?.revision!==snapshot.revision){setState('ready');return compiled;}
      setResult(compiled);setCompiledRevision(snapshot.revision);
      return compiled;
    }catch(error){
      if(workspaceRef.current?.revision!==snapshot.revision){setState('ready');return null;}
      const message=error instanceof Error?error.message:String(error);setState('error');setCompiledRevision(snapshot.revision);
      const failed:CompileResult={ok:false,diagnostics:[{severity:'error',line:1,message:'Сборка проекта не завершена',explanation:'Компилятор не вернул результат, но все файлы рабочей области сохранены локально.',suggestion:'Повторите сборку после проверки доступности движка.',source:'latex-gym',originalCompilerMessage:message}],blocks:[],elapsedMs:1,engine:'educational-preview',providerId:'compiler-manager'};
      setResult(failed);return failed;
    }
  };

  const finish=()=>{
    if(currentDone){navigate(next?`/project/${project.id}/${next.id}`:'/projects');return;}
    const checked=validateProjectStage(stage,workspace,result,compiledRevision);
    setStageValidation(checked);
    if(!checked.ok)return;
    saveProjectWorkspace(workspace);
    completeStage(project.id,stage.id,`${project.title}: ${stage.title}`,stage.concepts??project.concepts,checked.realCompile);
    if(next)navigate(`/project/${project.id}/${next.id}`);else navigate('/projects');
  };

  return <div className="project-workspace">
    <aside className="project-stage-nav"><Link className="project-back" to="/projects"><BackIcon/> Проекты</Link><span className="eyebrow">{project.title}</span><nav aria-label="Этапы проекта">{project.stages.map((item,itemIndex)=><Link key={item.id} to={`/project/${project.id}/${item.id}`} className={`${item.id===stage.id?'active':''} ${projectProgress.includes(item.id)?'done':''}`}><span>{String(itemIndex+1).padStart(2,'0')}</span><strong>{item.title.replace(/^\d+\.\s*/, '')}</strong>{projectProgress.includes(item.id)&&<i>✓</i>}</Link>)}</nav></aside>
    <main className="project-main">
      <header className="project-header"><span className="eyebrow">ПРОЕКТ · ЭТАП {index+1} ИЗ {project.stages.length}</span><h1>{stage.title}</h1><p>{stage.objective}</p></header>
      <section className="project-requirements"><span className="eyebrow">КРИТЕРИИ ЭТАПА</span><ul>{stage.requirements.map(requirement=><li key={requirement}>{requirement}</li>)}</ul>{index>0&&<p className="project-integrity-note">Продолжайте тот же проект: предыдущие файлы, ссылки и структура должны оставаться рабочими.</p>}</section>
      <section className="project-editor">
        <div className="project-workspace-meta" aria-live="polite"><span>Workspace v{workspace.schemaVersion} · revision {workspace.revision}</span><span>{saved?'Сохранено локально':'Сохранение…'}</span><span className={buildIsCurrent?'current-build':'stale-build'}>{buildIsCurrent?'Сборка соответствует текущей revision':'Текущая revision ещё не подтверждена'}</span></div>
        <div className="project-editor-shell">
          <ProjectFileBrowser workspace={workspace} assets={builtInAssets} newFilePath={newFilePath} fileError={fileError} onPathChange={setNewFilePath} onCreate={createFile} onOpen={openFile} onDelete={deleteFile} onMakeMain={makeMain}/>
          <div className="project-source-panel">
            <div className="project-active-file"><div><span className="eyebrow">АКТИВНЫЙ ФАЙЛ</span><strong>{workspace.activeFile}</strong></div>{workspace.activeFile===workspace.mainFile?<span>ROOT</span>:workspace.activeFile.endsWith('.tex')?<button type="button" onClick={()=>makeMain(workspace.activeFile)}>Сделать главным</button>:null}</div>
            <div className="editor-status-line" aria-live="polite"><span className={`compile-state compile-state--${state}`}>{compilationStateLabel(state)}</span><span>{result?engineLabel(result):saved?'Файлы сохранены':'Сохранение…'}</span></div>
            <Suspense fallback={<div className="editor-loading">Загрузка редактора…</div>}><CodeEditor value={activeSource} onChange={updateActiveSource} wordWrap={settings.wordWrap} showLineNumbers={settings.lineNumbers} autoClose={settings.autoClose} minHeight={410} onCompile={()=>{void runCompile();}} onSave={saveNow} diagnostics={workspace.activeFile===workspace.mainFile?(result?.diagnostics??[]):[]}/></Suspense>
            {workspace.activeFile!==workspace.mainFile&&result?.diagnostics.length?<p className="project-diagnostic-scope">Диагностика текущей сборки привязана к main.tex. Для secondary file LaTeX Gym не рисует приблизительные line markers без надёжного filename mapping.</p>:null}
          </div>
        </div>
        <div className="project-editor-actions"><button className="compile-button" onClick={()=>{void runCompile();}} disabled={busy}><PlayIcon/>{busy?compilationStateLabel(state):'Собрать проект'}</button><button className="primary-button" onClick={finish} disabled={busy}>{currentDone?(next?'К следующему этапу':'К проектам'):(next?'Проверить и продолжить':'Проверить и завершить')}{(next||currentDone)&&<ChevronIcon/>}</button></div>
        {stageValidation&&<ProjectValidationPanel validation={stageValidation}/>} 
      </section>
    </main>
    <aside className="project-preview"><span className="eyebrow">РЕЗУЛЬТАТ</span><div className="project-paper"><LatexPreview result={result}/></div><p>{result?.pdf&&!result.fallbackReason?'Это реальный PDF всей текущей файловой рабочей области.':result?.fallbackReason?'Показан учебный fallback. Он сохраняет рабочий цикл, но не подтверждает завершение проектного этапа.':'Соберите проект: в TeX будут переданы main file, все текстовые файлы workspace и доступные ресурсы.'}</p></aside>
  </div>;
}

function ProjectFileBrowser({workspace,assets,newFilePath,fileError,onPathChange,onCreate,onOpen,onDelete,onMakeMain}:{workspace:ProjectWorkspace;assets:string[];newFilePath:string;fileError:string;onPathChange:(value:string)=>void;onCreate:(event:React.FormEvent)=>void;onOpen:(path:string)=>void;onDelete:(path:string)=>void;onMakeMain:(path:string)=>void}){
  const files=Object.keys(workspace.files).sort((a,b)=>a===workspace.mainFile?-1:b===workspace.mainFile?1:a.localeCompare(b));
  return <aside className="project-files" aria-label="Файлы проекта"><div className="project-files-heading"><span className="eyebrow">ФАЙЛЫ</span><small>{files.length} editable · {assets.length} assets</small></div><div className="project-file-list">{files.map(path=>{
    const slash=path.lastIndexOf('/');const folder=slash>=0?path.slice(0,slash+1):'';const name=slash>=0?path.slice(slash+1):path;const extension=(name.split('.').pop()??'').toUpperCase();
    return <div className={`project-file-row ${workspace.activeFile===path?'active':''}`} key={path}><button type="button" className="project-file-open" onClick={()=>onOpen(path)} aria-pressed={workspace.activeFile===path}><span className="project-file-type">{extension}</span><span className="project-file-name">{folder&&<small>{folder}</small>}<strong>{name}</strong></span>{path===workspace.mainFile&&<i>ROOT</i>}</button><span className="project-file-actions">{path!==workspace.mainFile&&path.endsWith('.tex')&&<button type="button" title="Сделать главным" aria-label={`Сделать ${path} главным файлом`} onClick={()=>onMakeMain(path)}>R</button>}{path!==workspace.mainFile&&<button type="button" title="Удалить" aria-label={`Удалить ${path}`} onClick={()=>onDelete(path)}>×</button>}</span></div>;
  })}</div>{assets.length>0&&<div className="project-assets"><span>РЕСУРСЫ · ТОЛЬКО ЧТЕНИЕ</span>{assets.map(asset=><div key={asset}><b>PDF</b><strong>{asset}</strong></div>)}</div>}<form className="project-file-add" onSubmit={onCreate}><label htmlFor="project-new-file">Новый файл</label><div><input id="project-new-file" value={newFilePath} onChange={event=>onPathChange(event.target.value)} placeholder="sections/method.tex" autoCapitalize="none" autoCorrect="off" spellCheck={false}/><button type="submit">Создать</button></div>{fileError&&<p role="alert">{fileError}</p>}<small>.tex · .bib · .sty · .cls · .txt</small></form></aside>;
}

function ProjectValidationPanel({validation}:{validation:ProjectStageValidation}){
  return <section className={`project-stage-validation ${validation.ok?'ok':''}`} role="status" aria-live="polite"><header><div><span className="eyebrow">ПРОВЕРКА ЭТАПА</span><h2>{validation.ok?'Этап подтверждён':'Этап ещё не готов'}</h2></div><strong>{validation.items.filter(item=>item.ok).length}/{validation.items.length}</strong></header><div>{validation.items.map((item,index)=><article key={index} className={item.ok?'ok':''}><span>{item.ok?'✓':'×'}</span><p><strong>{item.message}</strong>{!item.ok&&<small>{item.hint}</small>}</p></article>)}</div></section>;
}

function engineLabel(result:CompileResult){if(result.fallbackReason)return 'Учебный fallback';if(result.engine==='pdflatex')return 'pdfLaTeX';if(result.engine==='xelatex')return 'XeLaTeX';if(result.engine==='lualatex')return 'LuaLaTeX';return 'Учебный предпросмотр';}
