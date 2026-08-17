import { lazy, Suspense, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BackIcon, ChevronIcon, PlayIcon } from '../components/Icons';
import { FullCompileResultView } from '../components/FullCompileResultView';
import { LatexPreview } from '../components/LatexPreview';
import { conceptById } from '../data/concepts';
import { getProject } from '../data/projects';
import { compiler } from '../services/compiler';
import { fullCompiler, type FullCompileResult, type FullCompileStatus } from '../services/fullCompiler';
import { validateProjectStage, type ProjectValidationResult } from '../services/projectValidator';
import { activeProjectFile, activateProjectFile, addProjectFile, combinedProjectSource, createProjectWorkspace, referencedProjectFiles, removeProjectFile, restoreProjectWorkspace, rootProjectSource, serializeProjectWorkspace, updateProjectFile, workspaceRequirements, type ProjectWorkspace } from '../services/projectWorkspace';
import { useAppStore } from '../store/useAppStore';
import type { CompilationState, CompileResult } from '../types';

const CodeEditor=lazy(()=>import('../components/CodeEditor').then(module=>({default:module.CodeEditor})));
const EMPTY_PROJECT_PROGRESS:string[]=[];
const EMPTY_WORKSPACE:ProjectWorkspace={version:1,rootFile:'main.tex',activeFile:'main.tex',files:[{path:'main.tex',content:''}]};
type FullState='idle'|FullCompileStatus|'success'|'warning'|'error';

export function ProjectPage(){
  const {projectId,stageId}=useParams();
  const navigate=useNavigate();
  const project=getProject(projectId);
  const settings=useAppStore(store=>store.settings);
  const drafts=useAppStore(store=>store.drafts);
  const setDraft=useAppStore(store=>store.setDraft);
  const completeStage=useAppStore(store=>store.completeProjectStage);
  const completedProjectStages=useAppStore(store=>store.completedProjectStages);
  const projectProgress=completedProjectStages[projectId??'']??EMPTY_PROJECT_PROGRESS;
  const index=useMemo(()=>project?Math.max(0,stageId?project.stages.findIndex(stage=>stage.id===stageId):0):0,[project,stageId]);
  const stage=project?.stages[index];
  const key=project&&stage?`project:${project.id}:${stage.id}`:'';
  const [workspace,setWorkspace]=useState<ProjectWorkspace>(EMPTY_WORKSPACE);
  const [result,setResult]=useState<CompileResult|null>(null);
  const [fullResult,setFullResult]=useState<FullCompileResult|null>(null);
  const [fullState,setFullState]=useState<FullState>('idle');
  const [fullError,setFullError]=useState('');
  const [pdfUrl,setPdfUrl]=useState<string|null>(null);
  const [validation,setValidation]=useState<ProjectValidationResult|null>(null);
  const [state,setState]=useState<CompilationState>('ready');
  const [saved,setSaved]=useState(true);
  const [newFile,setNewFile]=useState('');
  const [fileError,setFileError]=useState('');

  useEffect(()=>{
    if(!project||!stage)return;
    setWorkspace(restoreProjectWorkspace(drafts[key],project.id,stage.id,stage.starterCode));
    setResult(null);setFullResult(null);setFullState('idle');setFullError('');setPdfUrl(null);setValidation(null);setState('ready');setSaved(true);setNewFile('');setFileError('');
  },[project?.id,stage?.id,key]);
  useEffect(()=>{
    if(!key||!project||!stage)return;
    setSaved(false);
    const timeout=window.setTimeout(()=>{setDraft(key,serializeProjectWorkspace(workspace));setSaved(true);},300);
    return()=>window.clearTimeout(timeout);
  },[key,workspace,setDraft,project?.id,stage?.id]);
  useEffect(()=>()=>{if(pdfUrl)URL.revokeObjectURL(pdfUrl);},[pdfUrl]);

  if(!project||!stage)return <div className="page empty-state"><h1>Проект не найден</h1><Link to="/projects">Вернуться к проектам</Link></div>;
  const busy=state==='queued'||state==='compiling'||fullState==='loading-engine'||fullState==='compiling';
  const currentDone=projectProgress.includes(stage.id);
  const next=project.stages[index+1];
  const activeFile=activeProjectFile(workspace);
  const source=activeFile?.content??'';
  const invalidateCompilation=()=>{setResult(null);setState('ready');setFullResult(null);setFullState('idle');setFullError('');setPdfUrl(null);setValidation(null);};
  const setProjectSource=(value:string)=>{if(!activeFile)return;setWorkspace(current=>updateProjectFile(current,activeFile.path,value));invalidateCompilation();};
  const saveNow=()=>{setDraft(key,serializeProjectWorkspace(workspace));setSaved(true);};
  const resetWorkspace=()=>{setWorkspace(createProjectWorkspace(project.id,stage.id,stage.starterCode));invalidateCompilation();};
  const runCompile=async():Promise<CompileResult|null>=>{
    setState('queued');setValidation(null);await Promise.resolve();setState('compiling');
    try{const compiled=await compiler.compile(rootProjectSource(workspace));setResult(compiled);setState(!compiled.ok?'error':compiled.diagnostics.some(item=>item.severity==='warning')?'warning':'success');return compiled;}
    catch{setState('error');return null;}
  };
  const runFullCompile=async():Promise<FullCompileResult|null>=>{
    setValidation(null);setFullError('');setFullState('loading-engine');
    try{
      const compiled=await fullCompiler.compile(workspace.files.map(file=>({path:file.path,contents:file.content})),workspace.rootFile,status=>setFullState(status));
      setFullResult(compiled);
      setFullState(!compiled.ok?'error':compiled.diagnostics.some(item=>item.severity==='warning')?'warning':'success');
      setPdfUrl(compiled.pdf?URL.createObjectURL(new Blob([compiled.pdf.slice().buffer],{type:'application/pdf'})):null);
      return compiled;
    }catch(error){
      setFullState('error');setFullError(error instanceof Error?error.message:'Полная TeX-сборка завершилась с ошибкой.');return null;
    }
  };
  const finish=async()=>{
    if(currentDone){if(next)navigate(`/project/${project.id}/${next.id}`);return;}
    const rootSource=rootProjectSource(workspace);
    const requiresCompilation=/\\documentclass\b/.test(rootSource);
    let acceptedCompile:CompileResult|null=result;
    if(requiresCompilation){
      const full=fullResult??await runFullCompile();
      if(!full)return;
      acceptedCompile={ok:full.ok,diagnostics:full.diagnostics,blocks:[],elapsedMs:full.elapsedMs,engine:'wasm-tex'};
    }
    const base=validateProjectStage(stage,combinedProjectSource(workspace),acceptedCompile??undefined);
    const fileItems=workspaceRequirements(project.id,stage.id,workspace);
    const referenceItems=referencedProjectFiles(workspace).filter(item=>!item.exists).map(item=>({label:`Файл для ${item.reference}`,ok:false,hint:`Корневой файл ссылается на «${item.reference}», но соответствующего файла в проекте нет.`,blocking:true}));
    const checked:ProjectValidationResult={items:[...base.items,...fileItems,...referenceItems],ok:base.ok&&fileItems.every(item=>item.ok)&&referenceItems.length===0};
    setValidation(checked);
    if(!checked.ok)return;
    completeStage(project.id,stage.id,`${project.title}: ${stage.title}`,project.concepts.filter(concept=>conceptById.has(concept)));
  };
  const submitNewFile=(event:FormEvent)=>{
    event.preventDefault();
    const created=addProjectFile(workspace,newFile);
    if(created.error){setFileError(created.error);return;}
    setWorkspace(created.workspace);setNewFile('');setFileError('');invalidateCompilation();
  };
  const removeFile=(path:string)=>{
    const removed=removeProjectFile(workspace,path);
    if(removed.error){setFileError(removed.error);return;}
    setWorkspace(removed.workspace);setFileError('');invalidateCompilation();
  };
  const editorDiagnostics=workspace.activeFile===workspace.rootFile?(fullResult?.diagnostics??result?.diagnostics??[]):[];

  return <div className="project-workspace">
    <aside className="project-stage-nav"><Link className="project-back" to="/projects"><BackIcon/> Проекты</Link><span className="eyebrow">{project.title}</span><nav aria-label="Этапы проекта">{project.stages.map((item,itemIndex)=><Link key={item.id} to={`/project/${project.id}/${item.id}`} className={`${item.id===stage.id?'active':''} ${projectProgress.includes(item.id)?'done':''}`}><span>{String(itemIndex+1).padStart(2,'0')}</span><strong>{item.title.replace(/^\d+\.\s*/, '')}</strong>{projectProgress.includes(item.id)&&<i>✓</i>}</Link>)}</nav></aside>
    <main className="project-main">
      <header className="project-header"><span className="eyebrow">ПРОЕКТ · ЭТАП {index+1} ИЗ {project.stages.length}</span><h1>{stage.title}</h1><p>{stage.objective}</p></header>
      <section className="project-requirements"><span className="eyebrow">КРИТЕРИИ ЭТАПА</span><ul>{stage.requirements.map(requirement=><li key={requirement}>{requirement}</li>)}</ul></section>
      <section className="project-editor">
        <div className="project-source-workspace">
          <aside className="project-file-tree" aria-label="Файлы LaTeX-проекта">
            <div className="project-file-heading"><span className="eyebrow">ФАЙЛЫ</span><small>{workspace.rootFile}</small></div>
            <div className="project-file-list">{workspace.files.map(file=><div className={`project-file-row ${file.path===workspace.activeFile?'active':''}`} key={file.path}><button type="button" onClick={()=>setWorkspace(current=>activateProjectFile(current,file.path))}><code>{file.path}</code>{file.path===workspace.rootFile&&<span>root</span>}</button>{file.path!==workspace.rootFile&&<button className="project-file-remove" type="button" onClick={()=>removeFile(file.path)} aria-label={`Удалить ${file.path}`}>×</button>}</div>)}</div>
            <form className="project-file-add" onSubmit={submitNewFile}><input value={newFile} onChange={event=>setNewFile(event.target.value)} placeholder="sections/new.tex" aria-label="Путь нового файла"/><button type="submit">Добавить</button></form>
            {fileError&&<p className="project-file-error" role="alert">{fileError}</p>}
          </aside>
          <div className="project-source-editor">
            <div className="editor-status-line"><span className={`compile-state compile-state--${state}`}>{projectStateLabel(state)}</span><span>{activeFile?.path} · {saved?'сохранено локально':'сохранение…'}</span></div>
            <Suspense fallback={<div className="editor-loading">Загрузка редактора…</div>}><CodeEditor value={source} onChange={setProjectSource} wordWrap={settings.wordWrap} showLineNumbers={settings.lineNumbers} autoClose={settings.autoClose} minHeight={410} onReset={resetWorkspace} onCompile={()=>{void runCompile();}} onSave={saveNow} diagnostics={editorDiagnostics} projectFiles={workspace.files}/></Suspense>
          </div>
        </div>
        {result&&!fullResult&&!validation&&<div className="compile-result-note" role="status" aria-live="polite"><h3>{result.ok?'Быстрый предпросмотр построен.':'Быстрый предпросмотр остановлен.'}</h3><p>{result.ok?'Это учебный preview, а не доказательство реальной TeX-сборки. Для проверки проекта используйте полную сборку.':'Исправьте первую содержательную ошибку перед следующей проверкой.'}</p></div>}
        {fullError&&<div className="compile-result-note compile-result-note--error" role="alert"><h3>Полная сборка недоступна.</h3><p>{fullError}</p></div>}
        {validation&&<div className={`validation-panel project-validation ${validation.ok?'validation-panel--ok':''}`} role="status" aria-live="polite"><h3>{validation.ok?'Критерии этапа выполнены':'Этап ещё не принят'}</h3>{validation.items.map((item,index)=><div className="validation-row" key={`${item.label}-${index}`}><span>{item.ok?'✓':item.blocking?'×':'!'}</span><div><strong>{item.label}</strong><small>{item.blocking?'Критерий приёмки':'Редакторская проверка'}</small>{!item.ok&&<small>{item.hint}</small>}</div></div>)}</div>}
        <div className="project-editor-actions">
          <button className="compile-button" onClick={()=>{void runCompile();}} disabled={busy}><PlayIcon/>{state==='compiling'?'Предпросмотр…':'Быстрый просмотр'}</button>
          <button className="full-compile-button" onClick={()=>{void runFullCompile();}} disabled={busy}>{fullStateLabel(fullState)}</button>
          <button className="primary-button" onClick={()=>{void finish();}} disabled={busy||Boolean(currentDone&&!next)}>{currentDone?(next?'Продолжить':'Этап принят'):'Проверить этап'}{currentDone&&next&&<ChevronIcon/>}</button>
        </div>
      </section>
    </main>
    <aside className="project-preview"><span className="eyebrow">РЕЗУЛЬТАТ</span>{fullResult?<FullCompileResultView result={fullResult} pdfUrl={pdfUrl}/>:<div className="project-paper"><LatexPreview result={result}/></div>}<p>{fullResult?'Это результат настоящей TeX-сборки проекта. Исправляйте самое раннее содержательное сообщение: поздние ошибки часто являются каскадом одной причины.':'Быстрый просмотр нужен для мгновенной учебной обратной связи. Полная сборка загружается только по запросу; после первого запуска её активы остаются в отдельном офлайн-кэше.'}</p></aside>
  </div>;
}

function projectStateLabel(state:CompilationState){
  if(state==='queued')return 'В очереди';if(state==='compiling')return 'Быстрый просмотр';if(state==='success')return 'Preview готов';if(state==='warning')return 'Preview с предупреждением';if(state==='error')return 'Preview остановлен';return 'Готов';
}
function fullStateLabel(state:FullState){
  if(state==='loading-engine')return 'Загрузка TeX…';
  if(state==='ready'||state==='compiling')return 'Полная сборка…';
  if(state==='success')return 'Собрать заново';
  if(state==='warning')return 'Собрать заново';
  if(state==='error')return 'Повторить полную сборку';
  return 'Полная сборка';
}
