import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BackIcon, ChevronIcon, PlayIcon } from '../components/Icons';
import { LatexPreview } from '../components/LatexPreview';
import { getProject } from '../data/projects';
import { compiler } from '../services/compiler';
import { validateProjectStage, type ProjectValidationResult } from '../services/projectValidator';
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
  const key=project&&stage?`project:${project.id}:${stage.id}`:'';
  const [source,setSource]=useState('');
  const [result,setResult]=useState<CompileResult|null>(null);
  const [validation,setValidation]=useState<ProjectValidationResult|null>(null);
  const [state,setState]=useState<CompilationState>('ready');
  const [saved,setSaved]=useState(true);

  useEffect(()=>{
    if(!project||!stage)return;
    setSource(drafts[key]??stage.starterCode);setResult(null);setValidation(null);setState('ready');setSaved(true);
  },[project?.id,stage?.id,key]);
  useEffect(()=>{
    if(!key)return;
    setSaved(false);
    const timeout=window.setTimeout(()=>{setDraft(key,source);setSaved(true);},300);
    return()=>window.clearTimeout(timeout);
  },[key,source,setDraft]);

  if(!project||!stage)return <div className="page empty-state"><h1>Проект не найден</h1><Link to="/projects">Вернуться к проектам</Link></div>;
  const busy=state==='queued'||state==='compiling';
  const currentDone=projectProgress.includes(stage.id);
  const next=project.stages[index+1];
  const setProjectSource=(value:string)=>{setSource(value);setResult(null);setValidation(null);setState('ready');};
  const runCompile=async():Promise<CompileResult|null>=>{
    setState('queued');setValidation(null);await Promise.resolve();setState('compiling');
    try{const compiled=await compiler.compile(source);setResult(compiled);setState(!compiled.ok?'error':compiled.diagnostics.some(item=>item.severity==='warning')?'warning':'success');return compiled;}
    catch{setState('error');return null;}
  };
  const finish=async()=>{
    if(currentDone){if(next)navigate(`/project/${project.id}/${next.id}`);return;}
    const requiresCompilation=/\\documentclass\b/.test(source);
    const compiled=requiresCompilation?(result??await runCompile()):result;
    const checked=validateProjectStage(stage,source,compiled??undefined);
    setValidation(checked);
    if(!checked.ok)return;
    completeStage(project.id,stage.id,`${project.title}: ${stage.title}`);
  };

  return <div className="project-workspace">
    <aside className="project-stage-nav"><Link className="project-back" to="/projects"><BackIcon/> Проекты</Link><span className="eyebrow">{project.title}</span><nav aria-label="Этапы проекта">{project.stages.map((item,itemIndex)=><Link key={item.id} to={`/project/${project.id}/${item.id}`} className={`${item.id===stage.id?'active':''} ${projectProgress.includes(item.id)?'done':''}`}><span>{String(itemIndex+1).padStart(2,'0')}</span><strong>{item.title.replace(/^\d+\.\s*/, '')}</strong>{projectProgress.includes(item.id)&&<i>✓</i>}</Link>)}</nav></aside>
    <main className="project-main">
      <header className="project-header"><span className="eyebrow">ПРОЕКТ · ЭТАП {index+1} ИЗ {project.stages.length}</span><h1>{stage.title}</h1><p>{stage.objective}</p></header>
      <section className="project-requirements"><span className="eyebrow">КРИТЕРИИ ЭТАПА</span><ul>{stage.requirements.map(requirement=><li key={requirement}>{requirement}</li>)}</ul></section>
      <section className="project-editor"><div className="editor-status-line"><span className={`compile-state compile-state--${state}`}>{projectStateLabel(state)}</span><span>{saved?'Сохранено локально':'Сохранение…'}</span></div><Suspense fallback={<div className="editor-loading">Загрузка редактора…</div>}><CodeEditor value={source} onChange={setProjectSource} wordWrap={settings.wordWrap} showLineNumbers={settings.lineNumbers} autoClose={settings.autoClose} minHeight={410} onReset={()=>setProjectSource(stage.starterCode)} onCompile={()=>{void runCompile();}} onSave={()=>{setDraft(key,source);setSaved(true);}} diagnostics={result?.diagnostics??[]}/></Suspense>
        {result&&!validation&&<div className="compile-result-note" role="status" aria-live="polite"><h3>{result.ok?'Документ собирается.':'Компиляция остановлена.'}</h3><p>{result.ok?'Этап ещё не проверен по критериям приёмки.':'Исправьте первую содержательную ошибку перед проверкой этапа.'}</p></div>}
        {validation&&<div className={`validation-panel project-validation ${validation.ok?'validation-panel--ok':''}`} role="status" aria-live="polite"><h3>{validation.ok?'Критерии этапа выполнены':'Этап ещё не принят'}</h3>{validation.items.map((item,index)=><div className="validation-row" key={`${item.label}-${index}`}><span>{item.ok?'✓':item.blocking?'×':'!'}</span><div><strong>{item.label}</strong><small>{item.blocking?'Критерий приёмки':'Редакторская проверка'}</small>{!item.ok&&<small>{item.hint}</small>}</div></div>)}</div>}
        <div className="project-editor-actions"><button className="compile-button" onClick={()=>{void runCompile();}} disabled={busy}><PlayIcon/>{busy?'Компиляция…':'Скомпилировать'}</button><button className="primary-button" onClick={()=>{void finish();}} disabled={busy||Boolean(currentDone&&!next)}>{currentDone?(next?'Продолжить':'Этап принят'):'Проверить этап'}{currentDone&&next&&<ChevronIcon/>}</button></div></section>
    </main>
    <aside className="project-preview"><span className="eyebrow">РЕЗУЛЬТАТ</span><div className="project-paper"><LatexPreview result={result}/></div><p>Быстрый предпросмотр показывает поддерживаемый учебный поднабор. Он отвечает за мгновенную обратную связь; критерии этапа проверяются отдельно.</p></aside>
  </div>;
}

function projectStateLabel(state:CompilationState){
  if(state==='queued')return 'В очереди';if(state==='compiling')return 'Компиляция';if(state==='success')return 'Документ собирается';if(state==='warning')return 'Есть предупреждение';if(state==='error')return 'Компиляция остановлена';return 'Готов к компиляции';
}
