import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BackIcon, ChevronIcon, PlayIcon } from '../components/Icons';
import { LatexPreview } from '../components/LatexPreview';
import { getProject } from '../data/projects';
import { compiler } from '../services/compiler';
import { compilationStateLabel, isCompilationBusy } from '../services/compilerState';
import { useAppStore } from '../store/useAppStore';
import type { CompilationState, CompileResult } from '../types';

const CodeEditor=lazy(()=>import('../components/CodeEditor').then(module=>({default:module.CodeEditor})));
const EMPTY_PROJECT_PROGRESS:string[]=[];

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
  const workspaceKey=project?`project:${project.id}:workspace`:'';
  const legacyStageKey=project&&stage?`project:${project.id}:${stage.id}`:'';
  const [source,setSource]=useState('');
  const [result,setResult]=useState<CompileResult|null>(null);
  const [state,setState]=useState<CompilationState>('ready');
  const [saved,setSaved]=useState(true);

  useEffect(()=>{
    if(!project||!stage)return;
    const existing=drafts[workspaceKey]??drafts[legacyStageKey];
    setSource(existing??stage.starterCode);setResult(null);setState('ready');setSaved(true);
  },[project?.id,stage?.id,workspaceKey,legacyStageKey]);
  useEffect(()=>{
    if(!workspaceKey)return;
    setSaved(false);
    const timeout=window.setTimeout(()=>{setDraft(workspaceKey,source);setSaved(true);},300);
    return()=>window.clearTimeout(timeout);
  },[workspaceKey,source,setDraft]);

  if(!project||!stage)return <div className="page empty-state"><h1>Проект не найден</h1><Link to="/projects">Вернуться к проектам</Link></div>;
  const busy=isCompilationBusy(state);
  const currentDone=projectProgress.includes(stage.id);
  const next=project.stages[index+1];
  const updateSource=(value:string)=>{setSource(value);if(result)setResult(null);if(state!=='ready')setState('ready');};
  const runCompile=async()=>{
    setState('queued');
    try{
      const compiled=await compiler.compile(source,{onPhase:setState});
      setResult(compiled);
      return compiled;
    }catch(error){
      const message=error instanceof Error?error.message:String(error);setState('error');
      setResult({ok:false,diagnostics:[{severity:'error',line:1,message:'Сборка проекта не завершена',explanation:'Компилятор не вернул результат, но рабочий исходник сохранён локально.',suggestion:'Повторите сборку после проверки доступности движка.',source:'latex-gym',originalCompilerMessage:message}],blocks:[],elapsedMs:1,engine:'educational-preview'});
      return null;
    }
  };
  const finish=()=>{
    setDraft(workspaceKey,source);
    completeStage(project.id,stage.id,`${project.title}: ${stage.title}`);
    if(next)navigate(`/project/${project.id}/${next.id}`);
  };

  return <div className="project-workspace">
    <aside className="project-stage-nav"><Link className="project-back" to="/projects"><BackIcon/> Проекты</Link><span className="eyebrow">{project.title}</span><nav aria-label="Этапы проекта">{project.stages.map((item,itemIndex)=><Link key={item.id} to={`/project/${project.id}/${item.id}`} className={`${item.id===stage.id?'active':''} ${projectProgress.includes(item.id)?'done':''}`}><span>{String(itemIndex+1).padStart(2,'0')}</span><strong>{item.title.replace(/^\d+\.\s*/, '')}</strong>{projectProgress.includes(item.id)&&<i>✓</i>}</Link>)}</nav></aside>
    <main className="project-main">
      <header className="project-header"><span className="eyebrow">ПРОЕКТ · ЭТАП {index+1} ИЗ {project.stages.length}</span><h1>{stage.title}</h1><p>{stage.objective}</p></header>
      <section className="project-requirements"><span className="eyebrow">КРИТЕРИИ ЭТАПА</span><ul>{stage.requirements.map(requirement=><li key={requirement}>{requirement}</li>)}</ul>{index>0&&<p className="project-integrity-note">Продолжайте тот же документ: требования предыдущих этапов должны оставаться рабочими.</p>}</section>
      <section className="project-editor"><div className="editor-status-line" aria-live="polite"><span className={`compile-state compile-state--${state}`}>{compilationStateLabel(state)}</span><span>{result?engineLabel(result):saved?'Сохранено как единый проект':'Сохранение…'}</span></div><Suspense fallback={<div className="editor-loading">Загрузка редактора…</div>}><CodeEditor value={source} onChange={updateSource} wordWrap={settings.wordWrap} showLineNumbers={settings.lineNumbers} autoClose={settings.autoClose} minHeight={410} onReset={index===0?()=>updateSource(stage.starterCode):undefined} onCompile={()=>{void runCompile();}} onSave={()=>{setDraft(workspaceKey,source);setSaved(true);}} diagnostics={result?.diagnostics??[]}/></Suspense><div className="project-editor-actions"><button className="compile-button" onClick={()=>{void runCompile();}} disabled={busy}><PlayIcon/>{busy?compilationStateLabel(state):'Скомпилировать'}</button><button className="primary-button" onClick={finish}>{currentDone?'Этап пройден':next?'Завершить и продолжить':'Завершить проект'}{next&&<ChevronIcon/>}</button></div></section>
    </main>
    <aside className="project-preview"><span className="eyebrow">РЕЗУЛЬТАТ</span><div className="project-paper"><LatexPreview result={result}/></div><p>{result?.pdf?'Это реальный PDF текущего проектного документа.':result?.fallbackReason?'Реальный TeX недоступен: показан явно обозначенный учебный fallback.':'Скомпилируйте проект, чтобы проверить его реальным TeX-движком.'}</p></aside>
  </div>;
}

function engineLabel(result:CompileResult){if(result.fallbackReason)return 'Учебный fallback';if(result.engine==='pdflatex')return 'pdfLaTeX';if(result.engine==='xelatex')return 'XeLaTeX';if(result.engine==='lualatex')return 'LuaLaTeX';return 'Учебный предпросмотр';}
