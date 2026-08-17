import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BackIcon, BookmarkIcon, PlayIcon } from '../components/Icons';
import { LatexPreview } from '../components/LatexPreview';
import { getExercise, getLesson } from '../data/courses';
import { compiler } from '../services/compiler';
import { validateExercise, type ValidationResult } from '../services/validator';
import { useAppStore } from '../store/useAppStore';
import type { CompileResult } from '../types';
const CodeEditor=lazy(()=>import('../components/CodeEditor').then(m=>({default:m.CodeEditor})));

export function PracticeExercisePage(){
  const {exerciseId}=useParams();const exercise=getExercise(exerciseId);const settings=useAppStore(s=>s.settings);const drafts=useAppStore(s=>s.drafts);const setDraft=useAppStore(s=>s.setDraft);const recordAttempt=useAppStore(s=>s.recordExerciseAttempt);const recordHint=useAppStore(s=>s.recordHint);const hintsUsed=useAppStore(s=>s.hintsUsed);const bookmarks=useAppStore(s=>s.bookmarks);const toggleBookmark=useAppStore(s=>s.toggleBookmark);
  const initial=exercise?(drafts[`exercise:${exercise.id}`]??exercise.starterCode):'';const [source,setSource]=useState(initial);const [result,setResult]=useState<CompileResult|null>(null);const [validation,setValidation]=useState<ValidationResult|null>(null);const [busy,setBusy]=useState(false);const [solution,setSolution]=useState(false);
  const hintLevel=exercise?(hintsUsed[exercise.id]??0):0;
  useEffect(()=>{if(exercise){setSource(drafts[`exercise:${exercise.id}`]??exercise.starterCode);setResult(null);setValidation(null);setSolution(false);}},[exercise?.id]);
  useEffect(()=>{if(!exercise)return;const id=window.setTimeout(()=>setDraft(`exercise:${exercise.id}`,source),250);return()=>window.clearTimeout(id);},[source,exercise?.id]);
  const position=useMemo(()=>{if(!exercise)return 1;const lesson=getLesson(exercise.lessonId);const index=lesson?.exercises.findIndex(item=>item.id===exercise.id)??0;return Math.max(1,index+1);},[exercise]);
  if(!exercise)return <div className="page empty-state">Задача не найдена.</div>;
  const isSaved=bookmarks.some(item=>item.type==='exercise'&&item.targetId===exercise.id);
  const compile=async()=>{setBusy(true);setValidation(null);try{const r=await compiler.compile(source);setResult(r);return r;}finally{setBusy(false)}};
  const check=async()=>{setBusy(true);try{const r=await compiler.compile(source);setResult(r);const v=validateExercise(exercise,source,r);setValidation(v);recordAttempt(exercise.id,v.ok,exercise.concepts,exercise.title);if(v.ok)setSolution(true);}finally{setBusy(false)}};
  const revealHint=()=>{const next=Math.min(exercise.hints.length,hintLevel+1);recordHint(exercise.id,next);};
  const renderHints=(variant:'desktop'|'mobile')=><div className={`hint-area hint-area--${variant}`}><div className="hint-heading"><span>Подсказки</span><button onClick={revealHint} disabled={hintLevel>=exercise.hints.length}>{hintLevel>=exercise.hints.length?'Все открыты':'Открыть подсказку'}</button></div>{exercise.hints.slice(0,hintLevel).map((h,i)=><p key={i}><b>{i+1}.</b> {h}</p>)}{hintLevel>=exercise.hints.length&&!solution&&<button className="text-tool reveal-solution" onClick={()=>setSolution(true)}>Показать эталонное решение</button>}</div>;
  return <div className="practice-screen">
    <header className="practice-top"><Link to="/practice" aria-label="Назад к практике"><BackIcon/></Link><strong>Практика</strong><button type="button" className={`icon-button practice-bookmark ${isSaved?'active':''}`} onClick={()=>toggleBookmark('exercise',exercise.id)} aria-label={isSaved?'Удалить задачу из закладок':'Сохранить задачу'}><BookmarkIcon/></button></header>
    <div className="practice-workspace">
      <section className="task-pane">
        <div className="task-progress"><span>ЗАДАНИЕ {position} ИЗ 3</span><div><i style={{width:`${(position/3)*100}%`}}/></div></div>
        <h1>{exercise.instructions}</h1><p className="requirements-title">Требования:</p><ul>{exercise.requirements.map(r=><li key={r}>{r}</li>)}</ul>
        {renderHints('desktop')}
      </section>
      <section className="editor-pane mobile-active">
        <div className="editor-pane-inner"><Suspense fallback={<div className="editor-loading">Загрузка редактора…</div>}><CodeEditor value={source} onChange={setSource} wordWrap={settings.wordWrap} showLineNumbers={settings.lineNumbers} autoClose={settings.autoClose} minHeight={235} onReset={()=>setSource(exercise.starterCode)}/></Suspense>
          <button className="compile-button" onClick={compile} disabled={busy}><PlayIcon/>{busy?'Компиляция…':'Скомпилировать'}</button>
        </div>
      </section>
      <section className="result-pane mobile-active"><h2>Результат</h2><div className="result-frame"><LatexPreview result={result}/></div>
        {validation&&<div className={`validation-panel ${validation.ok?'validation-panel--ok':''}`} role="status"><h3>{validation.ok?'Решение принято':'Что нужно исправить'}</h3>{validation.items.map((item,i)=><div className="validation-row" key={i}><span>{item.ok?'✓':'×'}</span><div><strong>{item.message}</strong>{!item.ok&&<small>{item.hint}</small>}</div></div>)}</div>}
        {solution&&<details className="reference-solution"><summary>Эталонное решение</summary><pre>{exercise.solution}</pre><p>Это один из корректных вариантов, а не единственно допустимый исходник.</p></details>}
        {renderHints('mobile')}
      </section>
    </div>
    <footer className="practice-action"><button className="primary-button primary-button--large" onClick={check} disabled={busy}>Проверить решение</button></footer>
  </div>;
}
