import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BackIcon, BookmarkIcon, PlayIcon } from '../components/Icons';
import { LatexPreview } from '../components/LatexPreview';
import { getExercise, getLesson } from '../data/courses';
import { compiler } from '../services/compiler';
import { compilationStateLabel, isCompilationBusy } from '../services/compilerState';
import { validateExercise, type ValidationResult } from '../services/validator';
import { useAppStore } from '../store/useAppStore';
import type { CompilationState, CompileResult } from '../types';

const CodeEditor=lazy(()=>import('../components/CodeEditor').then(module=>({default:module.CodeEditor})));

export function PracticeExercisePage(){
  const {exerciseId}=useParams();
  const exercise=getExercise(exerciseId);
  const settings=useAppStore(state=>state.settings);
  const drafts=useAppStore(state=>state.drafts);
  const setDraft=useAppStore(state=>state.setDraft);
  const recordAttempt=useAppStore(state=>state.recordExerciseAttempt);
  const recordHint=useAppStore(state=>state.recordHint);
  const recordSolutionReveal=useAppStore(state=>state.recordSolutionReveal);
  const hintsUsed=useAppStore(state=>state.hintsUsed);
  const bookmarks=useAppStore(state=>state.bookmarks);
  const toggleBookmark=useAppStore(state=>state.toggleBookmark);
  const initial=exercise?(drafts[`exercise:${exercise.id}`]??exercise.starterCode):'';
  const [source,setSource]=useState(initial);
  const [result,setResult]=useState<CompileResult|null>(null);
  const [validation,setValidation]=useState<ValidationResult|null>(null);
  const [compileState,setCompileState]=useState<CompilationState>('ready');
  const [solution,setSolution]=useState(false);
  const [hintOpenedThisAttempt,setHintOpenedThisAttempt]=useState(false);
  const [saved,setSaved]=useState(true);
  const [shortcutsOpen,setShortcutsOpen]=useState(false);
  const hintLevel=exercise?(hintsUsed[exercise.id]??0):0;

  useEffect(()=>{
    if(!exercise)return;
    setSource(drafts[`exercise:${exercise.id}`]??exercise.starterCode);
    setResult(null);setValidation(null);setSolution(false);setHintOpenedThisAttempt(false);setCompileState('ready');setSaved(true);
    const key=`latex-gym:scroll:${exercise.id}`;
    const restored=Number(sessionStorage.getItem(key)??0);
    requestAnimationFrame(()=>window.scrollTo({top:restored,behavior:'auto'}));
    return()=>{sessionStorage.setItem(key,String(window.scrollY));};
  },[exercise?.id]);

  useEffect(()=>{
    if(!exercise)return;
    setSaved(false);
    const id=window.setTimeout(()=>{setDraft(`exercise:${exercise.id}`,source);setSaved(true);},280);
    return()=>window.clearTimeout(id);
  },[source,exercise?.id,setDraft]);

  const lesson=useMemo(()=>exercise?getLesson(exercise.lessonId):undefined,[exercise]);
  const position=useMemo(()=>Math.max(1,(lesson?.exercises.findIndex(item=>item.id===exercise?.id)??0)+1),[lesson,exercise?.id]);
  const total=lesson?.exercises.length??1;
  if(!exercise)return <div className="page empty-state">Задача не найдена.</div>;

  const isSaved=bookmarks.some(item=>item.type==='exercise'&&item.targetId===exercise.id);
  const busy=isCompilationBusy(compileState);
  const setEditorSource=(value:string)=>{setSource(value);if(validation)setValidation(null);};
  const saveNow=()=>{setDraft(`exercise:${exercise.id}`,source);setSaved(true);};
  const runCompile=async()=>{
    setCompileState('queued');setValidation(null);
    try{
      const compiled=await compiler.compile(source,{onPhase:setCompileState});
      setResult(compiled);
      return compiled;
    }catch(error){
      setCompileState('error');
      const message=error instanceof Error?error.message:String(error);
      setResult({ok:false,diagnostics:[{severity:'error',line:1,message:'Компилятор не завершил запрос',explanation:'Не удалось получить ни реальную TeX-сборку, ни образовательный fallback.',suggestion:'Исходник сохранён локально. Повторите компиляцию; если ошибка сохраняется, откройте Playground и проверьте доступность движка.',source:'latex-gym',originalCompilerMessage:message}],blocks:[],elapsedMs:1,engine:'educational-preview',providerId:'compiler-manager'});
      return null;
    }
  };
  const check=async()=>{
    const compiled=await runCompile();
    if(!compiled)return;
    const checked=validateExercise(exercise,source,compiled);
    setValidation(checked);
    recordAttempt(exercise.id,checked.ok,exercise.concepts,exercise.title,{
      independence:solution?'revealed':hintOpenedThisAttempt?'hinted':'independent',
      context:'practice',
      realCompile:Boolean(compiled.pdf?.length&&!compiled.fallbackReason)
    });
  };
  const revealHint=()=>{const next=Math.min(exercise.hints.length,hintLevel+1);recordHint(exercise.id,next);setHintOpenedThisAttempt(true);};
  const revealSolution=()=>{setSolution(true);recordSolutionReveal(exercise.id);};
  const renderHints=(variant:'desktop'|'mobile')=><div className={`hint-area hint-area--${variant}`}><div className="hint-heading"><span>Подсказки</span><button onClick={revealHint} disabled={hintLevel>=exercise.hints.length}>{hintLevel>=exercise.hints.length?'Все открыты':'Открыть подсказку'}</button></div>{exercise.hints.slice(0,hintLevel).map((hint,index)=><p key={index}><b>{index+1}.</b> {hint}</p>)}{hintLevel>=exercise.hints.length&&!solution&&<button className="text-tool reveal-solution" onClick={revealSolution}>Показать одно решение</button>}</div>;

  return <div className="practice-screen" data-compilation-state={compileState}>
    <header className="practice-top"><Link to="/practice" aria-label="Назад к практике"><BackIcon/></Link><strong>Практика</strong><button type="button" className={`icon-button practice-bookmark ${isSaved?'active':''}`} onClick={()=>toggleBookmark('exercise',exercise.id)} aria-label={isSaved?'Удалить задачу из закладок':'Сохранить задачу'}><BookmarkIcon/></button></header>
    <div className="practice-workspace">
      <section className="task-pane">
        <div className="task-progress"><span>ЗАДАНИЕ {position} ИЗ {total}</span><div><i style={{width:`${(position/total)*100}%`}}/></div></div>
        <span className="practice-mode">{exercise.mode}</span>
        <h1>{exercise.instructions}</h1><p className="requirements-title">Требования:</p><ul>{exercise.requirements.map(requirement=><li key={requirement}>{requirement}</li>)}</ul>
        {renderHints('desktop')}
      </section>
      <section className="editor-pane mobile-active">
        <div className="editor-pane-inner">
          <div className="editor-status-line" aria-live="polite"><span className={`compile-state compile-state--${compileState}`}>{compilationStateLabel(compileState)}</span><span>{result?engineLabel(result):saved?'Сохранено локально':'Сохранение…'}</span></div>
          <Suspense fallback={<div className="editor-loading">Загрузка редактора…</div>}><CodeEditor value={source} onChange={setEditorSource} wordWrap={settings.wordWrap} showLineNumbers={settings.lineNumbers} autoClose={settings.autoClose} minHeight={235} onReset={()=>setSource(exercise.starterCode)} onCompile={()=>{void runCompile();}} onSave={saveNow} onShowShortcuts={()=>setShortcutsOpen(true)} diagnostics={result?.diagnostics??[]}/></Suspense>
          <button className="compile-button" onClick={()=>{void runCompile();}} disabled={busy}><PlayIcon/>{busy?compilationStateLabel(compileState):'Скомпилировать'}</button>
        </div>
      </section>
      <section className="result-pane mobile-active"><h2>Результат</h2><div className="result-frame"><LatexPreview result={result}/></div>
        {validation&&<div className={`validation-panel ${validation.ok?'validation-panel--ok':''}`} role="status" aria-live="polite"><h3>{validation.ok?'Решение принято':'Что нужно исправить'}</h3>{validation.items.map((item,index)=><div className="validation-row" key={index}><span>{item.ok?'✓':'×'}</span><div><strong>{item.message}</strong>{item.line&&<small>Строка {item.line}</small>}{!item.ok&&<small>{item.hint}</small>}</div></div>)}</div>}
        {solution&&<details className="reference-solution" open><summary>Один корректный вариант</summary><pre>{exercise.solution}</pre><p>Это пример, а не определение правильности. Раскрытое решение даёт более слабое evidence mastery, чем самостоятельное решение.</p></details>}
        {renderHints('mobile')}
      </section>
    </div>
    <footer className="practice-action"><button className="primary-button primary-button--large" onClick={()=>{void check();}} disabled={busy}>Проверить решение</button></footer>
    {shortcutsOpen&&<div className="shortcut-backdrop" role="presentation" onMouseDown={()=>setShortcutsOpen(false)}><section className="shortcut-dialog" role="dialog" aria-modal="true" aria-labelledby="shortcut-title" onMouseDown={event=>event.stopPropagation()}><button className="shortcut-close" onClick={()=>setShortcutsOpen(false)} aria-label="Закрыть">×</button><span className="eyebrow">РЕДАКТОР</span><h2 id="shortcut-title">Клавиатура</h2><dl><div><dt>Cmd/Ctrl + Enter</dt><dd>Скомпилировать</dd></div><div><dt>Cmd/Ctrl + S</dt><dd>Сохранить локальный черновик</dd></div><div><dt>Cmd/Ctrl + K</dt><dd>Поиск LaTeX Gym</dd></div><div><dt>Cmd/Ctrl + /</dt><dd>Эта справка</dd></div></dl></section></div>}
  </div>;
}

function engineLabel(result:CompileResult){
  if(result.fallbackReason)return 'Учебный fallback';
  if(result.engine==='pdflatex')return 'pdfLaTeX';if(result.engine==='xelatex')return 'XeLaTeX';if(result.engine==='lualatex')return 'LuaLaTeX';return 'Учебный предпросмотр';
}
