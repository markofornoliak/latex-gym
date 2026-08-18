import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BackIcon, BookmarkIcon, PlayIcon } from '../components/Icons';
import { LatexPreview } from '../components/LatexPreview';
import { getExercise, getLesson } from '../data/courses';
import { compiler } from '../services/compiler';
import { compilationStateLabel, isCompilationBusy } from '../services/compilerState';
import { getExerciseInteraction, initialExerciseDraft } from '../services/exerciseInteraction';
import { validateExercise, type ValidationResult } from '../services/validator';
import { useAppStore } from '../store/useAppStore';
import type { CompilationState, CompileResult, Diagnostic } from '../types';

const CodeEditor=lazy(()=>import('../components/CodeEditor').then(module=>({default:module.CodeEditor})));
type MobilePracticeView='task'|'code'|'result';

export function PracticeExercisePage(){
  const {exerciseId}=useParams();
  const exercise=getExercise(exerciseId);
  const interaction=useMemo(()=>exercise?getExerciseInteraction(exercise):null,[exercise?.mode]);
  const settings=useAppStore(state=>state.settings);
  const drafts=useAppStore(state=>state.drafts);
  const setDraft=useAppStore(state=>state.setDraft);
  const recordAttempt=useAppStore(state=>state.recordExerciseAttempt);
  const recordHint=useAppStore(state=>state.recordHint);
  const recordSolutionReveal=useAppStore(state=>state.recordSolutionReveal);
  const hintsUsed=useAppStore(state=>state.hintsUsed);
  const bookmarks=useAppStore(state=>state.bookmarks);
  const toggleBookmark=useAppStore(state=>state.toggleBookmark);
  const draftKey=exercise?`exercise:${exercise.id}`:'';
  const initial=exercise?initialExerciseDraft(exercise,drafts[draftKey]):'';
  const [source,setSource]=useState(initial);
  const [result,setResult]=useState<CompileResult|null>(null);
  const [targetResult,setTargetResult]=useState<CompileResult|null>(null);
  const [validation,setValidation]=useState<ValidationResult|null>(null);
  const [compileState,setCompileState]=useState<CompilationState>('ready');
  const [targetCompileState,setTargetCompileState]=useState<CompilationState>('ready');
  const [solution,setSolution]=useState(false);
  const [hintOpenedThisAttempt,setHintOpenedThisAttempt]=useState(false);
  const [saved,setSaved]=useState(true);
  const [shortcutsOpen,setShortcutsOpen]=useState(false);
  const [mobileView,setMobileView]=useState<MobilePracticeView>('task');
  const mobileScroll=useRef<Record<MobilePracticeView,number>>({task:0,code:0,result:0});
  const hintLevel=exercise?(hintsUsed[exercise.id]??0):0;

  useEffect(()=>{
    if(!exercise)return;
    setSource(initialExerciseDraft(exercise,drafts[`exercise:${exercise.id}`]));
    setResult(null);setTargetResult(null);setValidation(null);setSolution(false);setHintOpenedThisAttempt(false);setCompileState('ready');setTargetCompileState('ready');setSaved(true);setMobileView('task');mobileScroll.current={task:0,code:0,result:0};
    const key=`latex-gym:scroll:${exercise.id}`;
    const restored=Number(sessionStorage.getItem(key)??0);
    requestAnimationFrame(()=>window.scrollTo({top:restored,behavior:'auto'}));
    return()=>{sessionStorage.setItem(key,String(window.scrollY));};
  },[exercise?.id]);

  useEffect(()=>{
    if(!exercise||!draftKey)return;
    setSaved(false);
    const id=window.setTimeout(()=>{setDraft(draftKey,source);setSaved(true);},280);
    return()=>window.clearTimeout(id);
  },[source,exercise?.id,draftKey,setDraft]);

  useEffect(()=>{
    let active=true;
    if(!exercise||interaction?.kind!=='reconstruction')return;
    setTargetResult(null);setTargetCompileState('queued');
    void compiler.compile(exercise.solution,{onPhase:phase=>{if(active)setTargetCompileState(phase);}}).then(compiled=>{
      if(active)setTargetResult(compiled);
    }).catch(error=>{
      if(!active)return;
      setTargetCompileState('error');
      setTargetResult(compilerFailure(error,'Не удалось подготовить целевой документ','Исходный эталон сохранён в задаче; попробуйте открыть её повторно после загрузки TeX-движка.'));
    });
    return()=>{active=false;};
  },[exercise?.id,interaction?.kind]);

  const lesson=useMemo(()=>exercise?getLesson(exercise.lessonId):undefined,[exercise]);
  const position=useMemo(()=>Math.max(1,(lesson?.exercises.findIndex(item=>item.id===exercise?.id)??0)+1),[lesson,exercise?.id]);
  const total=lesson?.exercises.length??1;
  if(!exercise||!interaction)return <div className="page empty-state">Задача не найдена.</div>;

  const isSaved=bookmarks.some(item=>item.type==='exercise'&&item.targetId===exercise.id);
  const busy=isCompilationBusy(compileState);
  const targetBusy=interaction.kind==='reconstruction'&&isCompilationBusy(targetCompileState);
  const workspaceBusy=busy||targetBusy;
  const switchMobileView=(next:MobilePracticeView)=>{
    if(next===mobileView)return;
    mobileScroll.current[mobileView]=window.scrollY;
    setMobileView(next);
    requestAnimationFrame(()=>window.scrollTo({top:mobileScroll.current[next],behavior:'auto'}));
  };
  const setExerciseSource=(value:string)=>{setSource(value);if(validation)setValidation(null);if(result)setResult(null);if(compileState!=='ready')setCompileState('ready');};
  const resetEditor=()=>{setExerciseSource(exercise.starterCode);};
  const saveNow=()=>{setDraft(draftKey,source);setSaved(true);};
  const runCompile=async()=>{
    if(interaction.kind==='concept-answer'||targetBusy)return null;
    setCompileState('queued');setValidation(null);
    try{
      const compiled=await compiler.compile(source,{onPhase:setCompileState});
      setResult(compiled);switchMobileView('result');
      return compiled;
    }catch(error){
      setCompileState('error');switchMobileView('result');
      const failed=compilerFailure(error,'Компилятор не завершил запрос','Исходник сохранён локально. Повторите компиляцию; если ошибка сохраняется, откройте Playground и проверьте доступность движка.');
      setResult(failed);
      return null;
    }
  };
  const check=async()=>{
    if(interaction.kind==='concept-answer'){
      const checked=validateExercise(exercise,source);
      setValidation(checked);switchMobileView('result');
      recordAttempt(exercise.id,checked.ok,exercise.concepts,exercise.title,{
        independence:solution?'revealed':hintOpenedThisAttempt?'hinted':'independent',context:'practice',realCompile:false
      });
      return;
    }

    const compiled=await runCompile();
    if(!compiled)return;
    const checked=validateExercise(exercise,source,compiled);
    setValidation(checked);
    recordAttempt(exercise.id,checked.ok,exercise.concepts,exercise.title,{
      independence:solution?'revealed':hintOpenedThisAttempt?'hinted':'independent',
      context:interaction.kind==='reconstruction'?'transfer':'practice',
      realCompile:Boolean(compiled.pdf?.length&&!compiled.fallbackReason)
    });
  };
  const revealHint=()=>{const next=Math.min(exercise.hints.length,hintLevel+1);recordHint(exercise.id,next);setHintOpenedThisAttempt(true);};
  const revealSolution=()=>{setSolution(true);recordSolutionReveal(exercise.id);};
  const renderHints=(variant:'desktop'|'mobile')=><div className={`hint-area hint-area--${variant}`}><div className="hint-heading"><span>Подсказки</span><button onClick={revealHint} disabled={hintLevel>=exercise.hints.length}>{hintLevel>=exercise.hints.length?'Все открыты':'Открыть подсказку'}</button></div>{exercise.hints.slice(0,hintLevel).map((hint,index)=><p key={index}><b>{index+1}.</b> {hint}</p>)}{hintLevel>=exercise.hints.length&&!solution&&<button className="text-tool reveal-solution" onClick={revealSolution}>Показать одно решение</button>}</div>;
  const mobileTabs:ReadonlyArray<readonly [MobilePracticeView,string]>=[['task','Задание'],['code',interaction.middleTabLabel],['result',interaction.resultTabLabel]];

  return <div className={`practice-screen practice-screen--${interaction.kind}`} data-compilation-state={compileState} data-mobile-view={mobileView} data-exercise-interaction={interaction.kind}>
    <header className="practice-top"><Link to="/practice" aria-label="Назад к практике"><BackIcon/></Link><strong>Практика</strong><button type="button" className={`icon-button practice-bookmark ${isSaved?'active':''}`} onClick={()=>toggleBookmark('exercise',exercise.id)} aria-label={isSaved?'Удалить задачу из закладок':'Сохранить задачу'}><BookmarkIcon/></button></header>
    <nav className="practice-mobile-tabs" role="tablist" aria-label="Рабочая область задачи">{mobileTabs.map(([id,label])=><button key={id} id={`practice-tab-${id}`} role="tab" aria-selected={mobileView===id} aria-controls={`practice-panel-${id}`} className={mobileView===id?'active':''} onClick={()=>switchMobileView(id)}>{label}</button>)}</nav>
    <div className="practice-workspace">
      <section id="practice-panel-task" role="tabpanel" aria-labelledby="practice-tab-task" className={`task-pane ${mobileView==='task'?'mobile-active':''}`}>
        <div className="task-progress"><span>ЗАДАНИЕ {position} ИЗ {total}</span><div><i style={{width:`${(position/total)*100}%`}}/></div></div>
        <span className="practice-mode">{exercise.mode}</span>
        <h1>{exercise.instructions}</h1><p className="requirements-title">Требования:</p><ul>{exercise.requirements.map(requirement=><li key={requirement}>{requirement}</li>)}</ul>
        {interaction.debug&&<DebugMethod/>}
        {interaction.kind==='reconstruction'&&<p className="reconstruction-method">Цель — воспроизвести структуру документа, а не угадать исходный код. Проверка остаётся семантической: допустимы разные корректные реализации.</p>}
        {renderHints('desktop')}
        <button className="primary-button practice-mobile-start" onClick={()=>switchMobileView('code')}>{interaction.kind==='concept-answer'?'Перейти к ответу':'Перейти к коду'}</button>
      </section>
      <section id="practice-panel-code" role="tabpanel" aria-labelledby="practice-tab-code" className={`editor-pane ${mobileView==='code'?'mobile-active':''}`}>
        {interaction.kind==='concept-answer'?<ConceptAnswer value={source} onChange={setExerciseSource} starter={exercise.starterCode} saved={saved}/>:<div className="editor-pane-inner">
          <div className="editor-status-line" aria-live="polite"><span className={`compile-state compile-state--${compileState}`}>{compilationStateLabel(compileState)}</span><span>{result?engineLabel(result):saved?'Сохранено локально':'Сохранение…'}</span></div>
          {interaction.kind==='reconstruction'&&<div className="target-runtime-status" aria-live="polite"><span>Целевой документ</span><strong>{targetResult?engineLabel(targetResult):compilationStateLabel(targetCompileState)}</strong></div>}
          <Suspense fallback={<div className="editor-loading">Загрузка редактора…</div>}><CodeEditor value={source} onChange={setExerciseSource} wordWrap={settings.wordWrap} showLineNumbers={settings.lineNumbers} autoClose={settings.autoClose} minHeight={235} onReset={resetEditor} onCompile={()=>{void runCompile();}} onSave={saveNow} onShowShortcuts={()=>setShortcutsOpen(true)} diagnostics={result?.diagnostics??[]}/></Suspense>
          <button className="compile-button" onClick={()=>{void runCompile();}} disabled={workspaceBusy}><PlayIcon/>{targetBusy?'Подготовка цели…':busy?compilationStateLabel(compileState):'Скомпилировать'}</button>
        </div>}
      </section>
      <section id="practice-panel-result" role="tabpanel" aria-labelledby="practice-tab-result" className={`result-pane ${mobileView==='result'?'mobile-active':''}`}>
        <h2>{interaction.resultTabLabel}</h2>
        {interaction.debug&&<DebugSignal result={result}/>} 
        {interaction.kind==='reconstruction'?<ReconstructionComparison target={targetResult} targetState={targetCompileState} result={result}/>:interaction.kind==='concept-answer'?<ConceptReview answer={source} validation={validation}/>:<div className="result-frame"><LatexPreview result={result}/></div>}
        {validation&&interaction.kind!=='concept-answer'&&<ValidationPanel validation={validation}/>} 
        {solution&&<details className="reference-solution" open><summary>Один корректный вариант</summary><pre>{exercise.solution}</pre><p>Это пример, а не определение правильности. Раскрытое решение считается более слабым свидетельством знания, чем самостоятельное решение.</p></details>}
        {renderHints('mobile')}
      </section>
    </div>
    <footer className="practice-action"><button className="primary-button primary-button--large" onClick={()=>{void check();}} disabled={workspaceBusy}>{targetBusy?'Подготовка целевого документа…':interaction.primaryActionLabel}</button></footer>
    {shortcutsOpen&&interaction.kind!=='concept-answer'&&<div className="shortcut-backdrop" role="presentation" onMouseDown={()=>setShortcutsOpen(false)}><section className="shortcut-dialog" role="dialog" aria-modal="true" aria-labelledby="shortcut-title" onMouseDown={event=>event.stopPropagation()}><button className="shortcut-close" onClick={()=>setShortcutsOpen(false)} aria-label="Закрыть">×</button><span className="eyebrow">РЕДАКТОР</span><h2 id="shortcut-title">Клавиатура</h2><dl><div><dt>Cmd/Ctrl + Enter</dt><dd>Скомпилировать</dd></div><div><dt>Cmd/Ctrl + S</dt><dd>Сохранить локальный черновик</dd></div><div><dt>Cmd/Ctrl + K</dt><dd>Поиск LaTeX Gym</dd></div><div><dt>Cmd/Ctrl + /</dt><dd>Эта справка</dd></div></dl></section></div>}
  </div>;
}

function ConceptAnswer({value,onChange,starter,saved}:{value:string;onChange:(value:string)=>void;starter:string;saved:boolean}){
  return <div className="concept-answer-workspace">
    <div className="concept-answer-heading"><div><span className="eyebrow">КОНЦЕПТУАЛЬНЫЙ ОТВЕТ</span><h2>Ответьте по существу</h2></div><span>{saved?'Сохранено локально':'Сохранение…'}</span></div>
    {starter.trim()&&<div className="concept-prompt"><span>Исходные данные</span><pre>{starter}</pre></div>}
    <label className="concept-answer-field"><span>Ваш ответ</span><textarea value={value} onChange={event=>onChange(event.target.value)} rows={9} spellCheck aria-describedby="concept-answer-help" placeholder="Кратко сформулируйте ответ. Точное совпадение с эталоном не требуется."/></label>
    <p id="concept-answer-help" className="concept-answer-help">LaTeX Gym проверяет требования задачи, а не совпадение строки с одним эталонным ответом.</p>
  </div>;
}

function ConceptReview({answer,validation}:{answer:string;validation:ValidationResult|null}){
  return <div className="concept-review-panel">
    <div className="concept-answer-readback"><span>Ваш ответ</span><p>{answer.trim()||'Ответ пока не введён.'}</p></div>
    {validation?<ValidationPanel validation={validation}/>:<div className="concept-check-empty"><strong>Проверка ещё не выполнена</strong><p>Сформулируйте ответ своими словами и нажмите «Проверить ответ».</p></div>}
  </div>;
}

function ReconstructionComparison({target,targetState,result}:{target:CompileResult|null;targetState:CompilationState;result:CompileResult|null}){
  return <div className="reconstruction-comparison">
    <div className="reconstruction-note"><strong>Сравнивайте структуру, а не пиксели.</strong><span>LaTeX Gym не выставляет фиктивный процент визуального совпадения: разные корректные исходники могут давать эквивалентный документ.</span></div>
    <div className="reconstruction-grid">
      <section><header><span>ЦЕЛЬ</span><small>{target?engineLabel(target):compilationStateLabel(targetState)}</small></header><div className="result-frame"><LatexPreview result={target} emptyText="Подготовка целевого документа…"/></div></section>
      <section><header><span>ВАШ РЕЗУЛЬТАТ</span><small>{result?engineLabel(result):'Ещё не собран'}</small></header><div className="result-frame"><LatexPreview result={result} emptyText="Скомпилируйте свой вариант"/></div></section>
    </div>
  </div>;
}

function DebugMethod(){
  return <aside className="debug-method" aria-label="Метод отладки"><strong>Метод отладки</strong><ol><li>Скомпилируйте исходник.</li><li>Читайте первое содержательное сообщение TeX.</li><li>Исправьте одну первопричину и соберите снова.</li><li>Каскад последующих ошибок оценивайте только после этого.</li></ol></aside>;
}

function DebugSignal({result}:{result:CompileResult|null}){
  if(!result)return <div className="debug-signal debug-signal--idle"><strong>Сначала получите сигнал компилятора.</strong><p>Запустите сборку: в отладочной задаче журнал TeX — часть условия, а не служебный шум.</p></div>;
  const diagnostic=firstMeaningfulDiagnostic(result.diagnostics);
  if(result.ok&&!diagnostic)return <div className="debug-signal debug-signal--ok"><strong>TeX собирает документ.</strong><p>Теперь проверьте, что исправлена именно причина задачи, а не только исчез фатальный сбой.</p></div>;
  if(!diagnostic)return null;
  return <div className={`debug-signal debug-signal--${diagnostic.severity}`}><span>ПЕРВЫЙ СИГНАЛ</span>{diagnostic.originalCompilerMessage&&<code>{diagnostic.originalCompilerMessage}</code>}<strong>{diagnostic.message}</strong><p>{diagnostic.explanation}</p></div>;
}

function ValidationPanel({validation}:{validation:ValidationResult}){
  return <div className={`validation-panel ${validation.ok?'validation-panel--ok':''}`} role="status" aria-live="polite"><h3>{validation.ok?'Решение принято':'Что нужно исправить'}</h3>{validation.items.map((item,index)=><div className="validation-row" key={index}><span>{item.ok?'✓':'×'}</span><div><strong>{item.message}</strong>{item.line&&<small>Строка {item.line}</small>}{!item.ok&&<small>{item.hint}</small>}</div></div>)}</div>;
}

function firstMeaningfulDiagnostic(diagnostics:Diagnostic[]){return diagnostics.find(item=>item.severity==='error')??diagnostics.find(item=>item.severity==='warning')??diagnostics[0];}

function compilerFailure(error:unknown,message:string,suggestion:string):CompileResult{
  const original=error instanceof Error?error.message:String(error);
  return {ok:false,diagnostics:[{severity:'error',line:1,message,explanation:'Компилятор не вернул завершённый результат.',suggestion,source:'latex-gym',originalCompilerMessage:original}],blocks:[],elapsedMs:1,engine:'educational-preview',providerId:'compiler-manager'};
}

function engineLabel(result:CompileResult){
  if(result.fallbackReason)return 'Учебный предпросмотр';
  if(result.engine==='pdflatex')return 'pdfLaTeX';if(result.engine==='xelatex')return 'XeLaTeX';if(result.engine==='lualatex')return 'LuaLaTeX';return 'Учебный предпросмотр';
}
