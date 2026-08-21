import { lazy, Suspense, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AccessibleTabs } from '../components/AccessibleTabs';
import { BackIcon, BookmarkIcon, PlayIcon } from '../components/Icons';
import { LatexPreview, type DiagnosticNavigation } from '../components/LatexPreview';
import { getRuntimeExercise, getRuntimeLesson } from '../data/runtimeCatalog';
import { useCompilationSession } from '../hooks/useCompilationSession';
import { useDocumentDraft } from '../hooks/useDocumentDraft';
import { compiler, isCompilerCancellation } from '../services/compiler';
import { compilationStateLabel, isCompilationBusy } from '../services/compilerState';
import { diagnosticFitsSource, requestDiagnosticNavigation } from '../services/editorNavigation';
import { getExerciseInteraction, initialExerciseDraft } from '../services/exerciseInteraction';
import { validateExercise, type ValidationResult } from '../services/validator';
import { useAppStore } from '../store/useAppStore';
import type { CompilationState, CompileResult, Diagnostic } from '../types';

const CodeEditor=lazy(()=>import('../components/CodeEditor').then(module=>({default:module.CodeEditor})));
type MobilePracticeView='task'|'code'|'result';

export function PracticeExercisePage(){
  const {exerciseId}=useParams();
  const exercise=getRuntimeExercise(exerciseId);
  const interaction=useMemo(()=>exercise?getExerciseInteraction(exercise):null,[exercise]);
  const settings=useAppStore(state=>state.settings);
  const recordAttempt=useAppStore(state=>state.recordExerciseAttempt);
  const recordHint=useAppStore(state=>state.recordHint);
  const recordSolutionReveal=useAppStore(state=>state.recordSolutionReveal);
  const hintsUsed=useAppStore(state=>state.hintsUsed);
  const bookmarks=useAppStore(state=>state.bookmarks);
  const toggleBookmark=useAppStore(state=>state.toggleBookmark);
  const draftKey=exercise?`exercise:${exercise.id}`:'exercise:missing';
  const draft=useDocumentDraft({key:draftKey,initialValue:exercise?.starterCode??'',normalizeLoaded:saved=>exercise?initialExerciseDraft(exercise,saved):''});
  const source=draft.value;
  const compilation=useCompilationSession(error=>compilerFailure(error,'Компилятор не завершил запрос','Исходник сохранён локально. Повторите компиляцию; если ошибка сохраняется, откройте Playground и проверьте доступность движка.'));
  const result=compilation.result;
  const compileState=compilation.state;
  const [targetResult,setTargetResult]=useState<CompileResult|null>(null);
  const [validation,setValidation]=useState<ValidationResult|null>(null);
  const [targetCompileState,setTargetCompileState]=useState<CompilationState>('ready');
  const [solution,setSolution]=useState(false);
  const [hintOpenedThisAttempt,setHintOpenedThisAttempt]=useState(false);
  const [shortcutsOpen,setShortcutsOpen]=useState(false);
  const [mobileView,setMobileView]=useState<MobilePracticeView>('task');
  const mobileScroll=useRef<Record<MobilePracticeView,number>>({task:0,code:0,result:0});
  const shortcutDialog=useRef<HTMLElement|null>(null);
  const shortcutOpener=useRef<HTMLElement|null>(null);
  const hintLevel=exercise?(hintsUsed[exercise.id]??0):0;

  useEffect(()=>{
    if(!exercise)return;
    compilation.reset();setTargetResult(null);setValidation(null);setSolution(false);setHintOpenedThisAttempt(false);setTargetCompileState('ready');setMobileView('task');mobileScroll.current={task:0,code:0,result:0};
    const key=`latex-gym:scroll:${exercise.id}`;const restored=Number(sessionStorage.getItem(key)??0);requestAnimationFrame(()=>window.scrollTo({top:restored,behavior:'auto'}));
    return()=>{sessionStorage.setItem(key,String(window.scrollY));};
  },[exercise?.id]);

  useEffect(()=>{
    if(!exercise||interaction?.kind!=='reconstruction')return;
    const controller=new AbortController();
    setTargetResult(null);setTargetCompileState('queued');
    void compiler.compile(exercise.solution,{signal:controller.signal,onPhase:phase=>{if(!controller.signal.aborted)setTargetCompileState(phase);}}).then(compiled=>{if(!controller.signal.aborted)setTargetResult(compiled);}).catch(error=>{
      if(controller.signal.aborted||isCompilerCancellation(error))return;
      setTargetCompileState('error');setTargetResult(compilerFailure(error,'Не удалось подготовить целевой документ','Исходный эталон сохранён в задаче; попробуйте открыть её повторно после загрузки TeX-движка.'));
    });
    return()=>controller.abort('Reconstruction target changed');
  },[exercise?.id,interaction?.kind]);

  useEffect(()=>{
    if(!shortcutsOpen)return;
    requestAnimationFrame(()=>shortcutDialog.current?.querySelector<HTMLElement>('button,[href],[tabindex]:not([tabindex="-1"])')?.focus({preventScroll:true}));
    return()=>{const opener=shortcutOpener.current;requestAnimationFrame(()=>{if(opener?.isConnected)opener.focus({preventScroll:true});});};
  },[shortcutsOpen]);

  const lesson=useMemo(()=>exercise?getRuntimeLesson(exercise.lessonId):undefined,[exercise]);
  const position=useMemo(()=>Math.max(1,(lesson?.exercises.findIndex(item=>item.id===exercise?.id)??0)+1),[lesson,exercise?.id]);
  const total=lesson?.exercises.length??1;
  if(!exercise||!interaction)return <div className="page empty-state">Задача не найдена.</div>;

  const isSaved=bookmarks.some(item=>item.type==='exercise'&&item.targetId===exercise.id);
  const busy=compilation.busy;
  const targetBusy=interaction.kind==='reconstruction'&&isCompilationBusy(targetCompileState);
  const workspaceBusy=busy||targetBusy;
  const switchMobileView=(next:MobilePracticeView)=>{if(next===mobileView)return;mobileScroll.current[mobileView]=window.scrollY;setMobileView(next);requestAnimationFrame(()=>window.scrollTo({top:mobileScroll.current[next],behavior:'auto'}));};
  const setExerciseSource=(value:string)=>{draft.setValue(value);if(validation)setValidation(null);if(result||compileState!=='ready')compilation.invalidate();};
  const resetEditor=()=>setExerciseSource(exercise.starterCode);
  const saveNow=()=>{void draft.saveNow();};
  const evidenceIndependence=()=>solution?'revealed' as const:hintOpenedThisAttempt?'hinted' as const:'independent' as const;
  const recordChecked=(checked:ValidationResult,realCompile:boolean,context:'practice'|'transfer'='practice')=>{
    setValidation(checked);switchMobileView('result');recordAttempt(exercise.id,checked.ok,exercise.concepts,exercise.title,{independence:evidenceIndependence(),context,realCompile});
  };
  const runCompile=async()=>{
    if(!interaction.requiresCompile||interaction.kind==='concept-answer'||targetBusy)return null;
    setValidation(null);const compiled=await compilation.run(source);if(compiled)switchMobileView('result');return compiled;
  };
  const check=async()=>{
    if(interaction.kind==='concept-answer'||!interaction.requiresCompile){recordChecked(validateExercise(exercise,source),false);return;}
    const compiled=await runCompile();if(!compiled)return;
    recordChecked(validateExercise(exercise,source,compiled),Boolean(compiled.pdf?.length&&!compiled.fallbackReason),interaction.kind==='reconstruction'?'transfer':'practice');
  };
  const revealHint=()=>{const next=Math.min(exercise.hints.length,hintLevel+1);recordHint(exercise.id,next);setHintOpenedThisAttempt(true);};
  const revealSolution=()=>{setSolution(true);recordSolutionReveal(exercise.id);};
  const renderHints=(variant:'desktop'|'mobile')=><div className={`hint-area hint-area--${variant}`}><div className="hint-heading"><span>Подсказки</span><button onClick={revealHint} disabled={hintLevel>=exercise.hints.length}>{hintLevel>=exercise.hints.length?'Все открыты':'Открыть подсказку'}</button></div>{exercise.hints.slice(0,hintLevel).map((hint,index)=><p key={index}><b>{index+1}.</b> {hint}</p>)}{hintLevel>=exercise.hints.length&&!solution&&<button className="text-tool reveal-solution" onClick={revealSolution}>Показать одно решение</button>}</div>;
  const mobileTabs=[
    {id:'task' as const,label:'Задание',tabId:'practice-tab-task',panelId:'practice-panel-task'},
    {id:'code' as const,label:interaction.middleTabLabel,tabId:'practice-tab-code',panelId:'practice-panel-code'},
    {id:'result' as const,label:interaction.resultTabLabel,tabId:'practice-tab-result',panelId:'practice-panel-result'}
  ];
  const diagnosticNavigation:DiagnosticNavigation={
    canNavigate:diagnostic=>diagnosticFitsSource(diagnostic,source),
    navigate:diagnostic=>{switchMobileView('code');requestAnimationFrame(()=>requestDiagnosticNavigation(diagnostic));}
  };
  const openShortcuts=()=>{shortcutOpener.current=document.activeElement instanceof HTMLElement?document.activeElement:null;setShortcutsOpen(true);};
  const onShortcutKeyDown=(event:ReactKeyboardEvent<HTMLElement>)=>{
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();setShortcutsOpen(false);return;}
    if(event.key!=='Tab')return;
    const focusable=[...(shortcutDialog.current?.querySelectorAll<HTMLElement>('button,[href],[tabindex]:not([tabindex="-1"])')??[])].filter(element=>!element.hasAttribute('disabled'));
    if(!focusable.length){event.preventDefault();return;}
    const first=focusable[0],last=focusable.at(-1)!;
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  };
  const editedLines=interaction.debug?changedLineCount(exercise.starterCode,source):0;

  return <div className={`practice-screen practice-screen--${interaction.kind}`} data-compilation-state={compileState} data-mobile-view={mobileView} data-exercise-interaction={interaction.kind} data-execution={interaction.execution}>
    <header className="practice-top"><Link to="/practice" aria-label="Назад к практике"><BackIcon/></Link><strong>Практика</strong><button type="button" className={`icon-button practice-bookmark ${isSaved?'active':''}`} onClick={()=>toggleBookmark('exercise',exercise.id)} aria-label={isSaved?'Удалить задачу из закладок':'Сохранить задачу'}><BookmarkIcon/></button></header>
    <AccessibleTabs className="practice-mobile-tabs" label="Рабочая область задачи" options={mobileTabs} active={mobileView} onChange={switchMobileView}/>
    <div className="practice-workspace">
      <section id="practice-panel-task" role="tabpanel" aria-labelledby="practice-tab-task" className={`task-pane ${mobileView==='task'?'mobile-active':''}`}>
        <div className="task-progress"><span>ЗАДАНИЕ {position} ИЗ {total}</span><div><i style={{width:`${(position/total)*100}%`}}/></div></div><span className="practice-mode">{exercise.mode}</span><h1>{exercise.instructions}</h1><p className="requirements-title">Требования:</p><ul>{exercise.requirements.map(requirement=><li key={requirement}>{requirement}</li>)}</ul>
        {interaction.debug&&<DebugMethod requiresCompile={interaction.requiresCompile}/>} {interaction.kind==='reconstruction'&&<p className="reconstruction-method">Цель — воспроизвести структуру документа, а не угадать исходный код. Проверка остаётся семантической: допустимы разные корректные реализации.</p>}{renderHints('desktop')}{renderHints('mobile')}
        <button className="primary-button practice-mobile-start" onClick={()=>switchMobileView('code')}>{interaction.kind==='concept-answer'?'Перейти к ответу':'Перейти к коду'}</button>
      </section>
      <section id="practice-panel-code" role="tabpanel" aria-labelledby="practice-tab-code" className={`editor-pane ${mobileView==='code'?'mobile-active':''}`}>
        {interaction.kind==='concept-answer'?<ConceptAnswer value={source} onChange={setExerciseSource} starter={exercise.starterCode} saved={draft.saved}/>:<div className="editor-pane-inner">
          <div className="editor-status-line" aria-live="polite"><span className={`compile-state compile-state--${compileState}`}>{interaction.requiresCompile?compilationStateLabel(compileState):'Фрагмент TeX'}</span><span>{result?engineLabel(result):draft.saved?'Сохранено локально':'Сохранение…'}</span></div>
          {interaction.debug&&<div className="debug-edit-scope" aria-live="polite">Изменено строк: {editedLines}. Исправляйте только первопричину.</div>}
          {interaction.kind==='reconstruction'&&<div className="target-runtime-status" aria-live="polite"><span>Целевой документ</span><strong>{targetResult?engineLabel(targetResult):compilationStateLabel(targetCompileState)}</strong></div>}
          <Suspense fallback={<div className="editor-loading">Загрузка редактора…</div>}><CodeEditor value={source} onChange={setExerciseSource} wordWrap={settings.wordWrap} showLineNumbers={settings.lineNumbers} autoClose={settings.autoClose} minHeight={235} onReset={resetEditor} onCompile={interaction.requiresCompile?()=>{void runCompile();}:undefined} onSave={saveNow} onShowShortcuts={openShortcuts} diagnostics={result?.diagnostics??[]} allowFormat={!interaction.debug}/></Suspense>
          {interaction.requiresCompile&&<button className="compile-button" onClick={()=>{void runCompile();}} disabled={workspaceBusy}><PlayIcon/>{targetBusy?'Подготовка цели…':busy?compilationStateLabel(compileState):'Скомпилировать'}</button>}
          {renderHints('mobile')}
        </div>}
      </section>
      <section id="practice-panel-result" role="tabpanel" aria-labelledby="practice-tab-result" className={`result-pane ${mobileView==='result'?'mobile-active':''}`}>
        <h2>{interaction.resultTabLabel}</h2>{interaction.debug&&interaction.requiresCompile&&<DebugSignal result={result}/>} 
        {interaction.kind==='reconstruction'?<ReconstructionComparison target={targetResult} targetState={targetCompileState} result={result} diagnosticNavigation={diagnosticNavigation}/>:interaction.kind==='concept-answer'?<ConceptReview answer={source} validation={validation}/>:interaction.requiresCompile?<div className="result-frame"><LatexPreview result={result} diagnosticNavigation={diagnosticNavigation}/></div>:<FragmentReview validation={validation} debug={interaction.debug}/>} 
        {validation&&interaction.kind!=='concept-answer'&&interaction.requiresCompile&&<ValidationPanel validation={validation}/>} 
        {solution&&<details className="reference-solution" open><summary>Один корректный вариант</summary><pre>{exercise.solution}</pre><p>Это пример, а не определение правильности. Раскрытое решение считается более слабым свидетельством знания, чем самостоятельное решение.</p></details>}{renderHints('mobile')}
      </section>
    </div>
    <footer className="practice-action"><button className="primary-button primary-button--large" onClick={()=>{void check();}} disabled={workspaceBusy}>{targetBusy?'Подготовка целевого документа…':interaction.primaryActionLabel}</button></footer>
    {shortcutsOpen&&interaction.kind!=='concept-answer'&&<div className="shortcut-backdrop" role="presentation" onMouseDown={()=>setShortcutsOpen(false)}><section ref={shortcutDialog} className="shortcut-dialog" role="dialog" aria-modal="true" aria-labelledby="shortcut-title" onMouseDown={event=>event.stopPropagation()} onKeyDown={onShortcutKeyDown}><button className="shortcut-close" onClick={()=>setShortcutsOpen(false)} aria-label="Закрыть">×</button><span className="eyebrow">РЕДАКТОР</span><h2 id="shortcut-title">Клавиатура</h2><dl>{interaction.requiresCompile&&<div><dt>Cmd/Ctrl + Enter</dt><dd>Скомпилировать</dd></div>}<div><dt>Cmd/Ctrl + S</dt><dd>Сохранить локальный черновик</dd></div><div><dt>Cmd/Ctrl + K</dt><dd>Поиск LaTeX Gym</dd></div><div><dt>Cmd/Ctrl + /</dt><dd>Эта справка</dd></div></dl></section></div>}
  </div>;
}

function ConceptAnswer({value,onChange,starter,saved}:{value:string;onChange:(value:string)=>void;starter:string;saved:boolean}){return <div className="concept-answer-workspace"><div className="concept-answer-heading"><div><span className="eyebrow">КОНЦЕПТУАЛЬНЫЙ ОТВЕТ</span><h2>Ответьте по существу</h2></div><span>{saved?'Сохранено локально':'Сохранение…'}</span></div>{starter.trim()&&<div className="concept-prompt"><span>Исходные данные</span><pre>{starter}</pre></div>}<label className="concept-answer-field"><span>Ваш ответ</span><textarea value={value} onChange={event=>onChange(event.target.value)} rows={9} spellCheck aria-describedby="concept-answer-help" placeholder="Кратко сформулируйте ответ. Точное совпадение с эталоном не требуется."/></label><p id="concept-answer-help" className="concept-answer-help">LaTeX Gym проверяет требования задачи, а не совпадение строки с одним эталонным ответом.</p></div>;}
function ConceptReview({answer,validation}:{answer:string;validation:ValidationResult|null}){return <div className="concept-review-panel"><div className="concept-answer-readback"><span>Ваш ответ</span><p>{answer.trim()||'Ответ пока не введён.'}</p></div>{validation?<ValidationPanel validation={validation}/>:<div className="concept-check-empty"><strong>Проверка ещё не выполнена</strong><p>Сформулируйте ответ своими словами и нажмите «Проверить ответ».</p></div>}</div>;}
function FragmentReview({validation,debug}:{validation:ValidationResult|null;debug:boolean}){if(validation)return <ValidationPanel validation={validation}/>;return <div className="concept-check-empty"><strong>{debug?'Проверьте исправление':'Проверка фрагмента'}</strong><p>{debug?'Этот фрагмент оценивается по требованию задачи без фиктивной ошибки отсутствующего main document.':'Для этого упражнения отдельный PDF не требуется: оценивается структура TeX-фрагмента.'}</p></div>;}
function ReconstructionComparison({target,targetState,result,diagnosticNavigation}:{target:CompileResult|null;targetState:CompilationState;result:CompileResult|null;diagnosticNavigation:DiagnosticNavigation}){return <div className="reconstruction-comparison"><div className="reconstruction-note"><strong>Сравнивайте структуру, а не пиксели.</strong><span>LaTeX Gym не выставляет фиктивный процент визуального совпадения: разные корректные исходники могут давать эквивалентный документ.</span></div><div className="reconstruction-grid"><section><header><span>ЦЕЛЬ</span><small>{target?engineLabel(target):compilationStateLabel(targetState)}</small></header><div className="result-frame"><LatexPreview result={target} emptyText="Подготовка целевого документа…"/></div></section><section><header><span>ВАШ РЕЗУЛЬТАТ</span><small>{result?engineLabel(result):'Ещё не собран'}</small></header><div className="result-frame"><LatexPreview result={result} emptyText="Скомпилируйте свой вариант" diagnosticNavigation={diagnosticNavigation}/></div></section></div></div>;}
function DebugMethod({requiresCompile}:{requiresCompile:boolean}){return <aside className="debug-method" aria-label="Метод отладки"><strong>Метод отладки</strong>{requiresCompile?<ol><li>Скомпилируйте исходник.</li><li>Читайте первое содержательное сообщение TeX.</li><li>Исправьте одну первопричину и соберите снова.</li><li>Каскад последующих ошибок оценивайте только после этого.</li></ol>:<ol><li>Локализуйте сломанную конструкцию во фрагменте.</li><li>Исправьте только требуемую первопричину.</li><li>Не добавляйте случайный пакет или лишний каркас документа.</li><li>Проверьте структурное требование задачи.</li></ol>}</aside>;}
function DebugSignal({result}:{result:CompileResult|null}){if(!result)return <div className="debug-signal debug-signal--idle"><strong>Сначала получите сигнал компилятора.</strong><p>Запустите сборку: в отладочной задаче журнал TeX — часть условия, а не служебный шум.</p></div>;const diagnostic=firstMeaningfulDiagnostic(result.diagnostics);if(result.ok&&!diagnostic)return <div className="debug-signal debug-signal--ok"><strong>TeX собирает документ.</strong><p>Теперь проверьте, что исправлена именно причина задачи, а не только исчез фатальный сбой.</p></div>;if(!diagnostic)return null;return <div className={`debug-signal debug-signal--${diagnostic.severity}`}><span>ПЕРВЫЙ СИГНАЛ</span>{diagnostic.originalCompilerMessage&&<code>{diagnostic.originalCompilerMessage}</code>}<strong>{diagnostic.message}</strong><p>{diagnostic.explanation}</p></div>;}
function ValidationPanel({validation}:{validation:ValidationResult}){return <div className={`validation-panel ${validation.ok?'validation-panel--ok':''}`} role="status" aria-live="polite"><h3>{validation.ok?'Решение принято':'Что нужно исправить'}</h3>{validation.items.map((item,index)=><div className="validation-row" key={index}><span>{item.ok?'✓':'×'}</span><div><strong>{item.message}</strong>{item.line&&<small>Строка {item.line}</small>}{!item.ok&&<small>{item.hint}</small>}</div></div>)}</div>;}
function firstMeaningfulDiagnostic(diagnostics:Diagnostic[]){return diagnostics.find(item=>item.severity==='error')??diagnostics.find(item=>item.severity==='warning')??diagnostics[0];}
function changedLineCount(original:string,current:string){const before=original.split('\n'),after=current.split('\n'),count=Math.max(before.length,after.length);let changed=0;for(let index=0;index<count;index+=1)if(before[index]!==after[index])changed+=1;return changed;}
function compilerFailure(error:unknown,message:string,suggestion:string):CompileResult{const original=error instanceof Error?error.message:String(error);return {ok:false,diagnostics:[{severity:'error',line:1,message,explanation:'Компилятор не вернул завершённый результат.',suggestion,source:'latex-gym',originalCompilerMessage:original}],blocks:[],elapsedMs:1,engine:'educational-preview',providerId:'compiler-manager'};}
function engineLabel(result:CompileResult){if(result.fallbackReason)return 'Учебный предпросмотр';if(result.engine==='pdflatex')return 'pdfLaTeX';if(result.engine==='xelatex')return 'XeLaTeX';if(result.engine==='lualatex')return 'LuaLaTeX';return 'Учебный предпросмотр';}
