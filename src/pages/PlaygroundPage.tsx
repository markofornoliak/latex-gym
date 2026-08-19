import { lazy, Suspense, useMemo, useState } from 'react';
import { DownloadIcon, PlayIcon } from '../components/Icons';
import { LatexPreview } from '../components/LatexPreview';
import { useCompilationSession } from '../hooks/useCompilationSession';
import { useDocumentDraft } from '../hooks/useDocumentDraft';
import { compiler } from '../services/compiler';
import { compilationStateLabel } from '../services/compilerState';
import { useAppStore } from '../store/useAppStore';
import type { CompileResult, CompilerEngine } from '../types';
const CodeEditor=lazy(()=>import('../components/CodeEditor').then(m=>({default:m.CodeEditor})));

type RealEngine=Exclude<CompilerEngine,'educational-preview'>;
const templates:Record<string,string>={
  'Минимальный документ':'\\documentclass{article}\n\\begin{document}\nПривет, LaTeX!\n\\end{document}',
  'Научная статья':'\\documentclass{article}\n\\title{Название исследования}\n\\author{Автор}\n\\begin{document}\n\\maketitle\n\\begin{abstract}\nКраткая аннотация.\n\\end{abstract}\n\\section{Введение}\nТекст статьи.\n\\end{document}',
  'Математический конспект':'\\documentclass{article}\n\\usepackage{amsmath}\n\\begin{document}\n\\section{Формулы}\n\\[\\frac{a+b}{c}=x^2\\]\n\\end{document}',
  'Лабораторная работа':'\\documentclass{article}\n\\title{Лабораторная работа}\n\\begin{document}\n\\maketitle\n\\section{Цель}\nОписание цели.\n\\section{Результаты}\nРезультаты измерений.\n\\end{document}',
  'Технический отчёт':'\\documentclass{report}\n\\begin{document}\n\\chapter{Обзор}\nТехническое описание.\n\\end{document}',
  'Книга':'\\documentclass{book}\n\\begin{document}\n\\frontmatter\n\\tableofcontents\n\\mainmatter\n\\chapter{Первая глава}\nТекст главы.\n\\end{document}',
  'Курсовая работа':'\\documentclass{report}\n\\title{Курсовая работа}\n\\author{Автор}\n\\begin{document}\n\\maketitle\n\\tableofcontents\n\\chapter{Введение}\nЦель и постановка задачи.\n\\chapter{Основная часть}\nРезультаты работы.\n\\end{document}',
  'Дипломная работа':'\\documentclass{report}\n\\usepackage{amsmath}\n\\title{Дипломная работа}\n\\begin{document}\n\\maketitle\n\\tableofcontents\n\\chapter{Обзор литературы}\nТекст.\n\\chapter{Методика}\nТекст.\n\\chapter{Результаты}\nТекст.\n\\end{document}',
  'Презентация Beamer':'\\documentclass{beamer}\n\\title{Научный доклад}\n\\author{Автор}\n\\begin{document}\n\\frame{\\titlepage}\n\\begin{frame}{Основной результат}\nКраткое содержание слайда.\n\\end{frame}\n\\end{document}',
  'Библиография':'\\documentclass{article}\n\\begin{document}\nСм.~\\cite{knuth}.\n\\begin{thebibliography}{9}\n\\bibitem{knuth} D. Knuth. The TeXbook.\n\\end{thebibliography}\n\\end{document}',
  'TikZ пример':'\\documentclass{article}\n\\usepackage{tikz}\n\\begin{document}\n\\begin{tikzpicture}\n\\draw (0,0) -- (2,0);\n\\node at (1,.4) {отрезок};\n\\end{tikzpicture}\n\\end{document}'
};

export function PlaygroundPage(){
  const settings=useAppStore(s=>s.settings);
  const draft=useDocumentDraft({key:'playground',initialValue:templates['Минимальный документ'],debounceMs:250});
  const source=draft.value;
  const compilation=useCompilationSession(playgroundFailure);
  const [engine,setEngine]=useState<RealEngine>('pdflatex');const [mobileTab,setMobileTab]=useState<'editor'|'preview'>('editor');
  const names=useMemo(()=>Object.keys(templates),[]);const capabilities=compiler.getPrimaryCapabilities();const busy=compilation.busy;
  const updateSource=(value:string)=>{draft.setValue(value);if(compilation.result||compilation.state!=='ready')compilation.invalidate();};
  const compile=async()=>{await compilation.run(source,{engine});setMobileTab('preview');};
  const download=()=>{const blob=new Blob([source],{type:'application/x-tex'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='latex-gym-document.tex';a.click();URL.revokeObjectURL(url);};
  return <div className="playground-page"><header className="workspace-heading"><div><span className="eyebrow">PLAYGROUND</span><h1>Свободный документ</h1></div><div className="workspace-actions"><select aria-label="Загрузить шаблон" defaultValue="" onChange={e=>{if(e.target.value)updateSource(templates[e.target.value])}}><option value="" disabled>Загрузить шаблон</option>{names.map(n=><option key={n}>{n}</option>)}</select><select aria-label="TeX-движок" value={engine} onChange={event=>setEngine(event.target.value as RealEngine)} disabled={busy}>{capabilities.engines.map(item=><option key={item} value={item}>{engineLabel(item)}</option>)}</select><button className="secondary-button" onClick={download}><DownloadIcon/> .tex</button><button className="primary-button" onClick={()=>{void compile();}} disabled={busy}><PlayIcon/>{busy?compilationStateLabel(compilation.state):'Скомпилировать'}</button></div></header>
    <div className="compiler-capability-strip" aria-label="Возможности компилятора"><strong>Real TeX</strong><span>PDF: да</span><span>Несколько файлов: движок поддерживает</span><span>BibTeX: {capabilities.bibtex?'да':'нет'}</span><span>Biber: {capabilities.biber?'да':'нет'}</span><span>Shell escape: {capabilities.shellEscape?'да':'отключён'}</span><span>Офлайн: {capabilities.offline?'да':'не гарантируется'}</span></div>
    <div className="workspace-mobile-tabs"><button className={mobileTab==='editor'?'active':''} onClick={()=>setMobileTab('editor')}>Код</button><button className={mobileTab==='preview'?'active':''} onClick={()=>setMobileTab('preview')}>Результат</button></div>
    <div className="playground-workspace"><section className={mobileTab==='editor'?'mobile-active':''}><div className="editor-status-line" aria-live="polite"><span className={`compile-state compile-state--${compilation.state}`}>{compilationStateLabel(compilation.state)}</span><span>{compilation.result?.fallbackReason?'Учебный предпросмотр':draft.saved?engineLabel(engine):'Сохранение…'}</span></div><Suspense fallback={<div className="editor-loading">Загрузка редактора…</div>}><CodeEditor value={source} onChange={updateSource} wordWrap={settings.wordWrap} showLineNumbers={settings.lineNumbers} autoClose={settings.autoClose} minHeight={620} onReset={()=>updateSource(templates['Минимальный документ'])} onCompile={()=>{void compile();}} onSave={()=>{void draft.saveNow();}} diagnostics={compilation.result?.diagnostics??[]}/></Suspense></section><section className={`playground-preview ${mobileTab==='preview'?'mobile-active':''}`}><div className="mode-label">РЕЗУЛЬТАТ</div><LatexPreview result={compilation.result}/></section></div>
  </div>;
}
function playgroundFailure(error:unknown):CompileResult{const message=error instanceof Error?error.message:String(error);return {ok:false,diagnostics:[{severity:'error',line:1,message:'Компилятор не завершил запрос',explanation:'Исходник сохранён. Ни основной движок, ни резервный предпросмотр не вернули результат.',suggestion:'Повторите компиляцию после проверки соединения.',source:'latex-gym',originalCompilerMessage:message}],blocks:[],elapsedMs:1,engine:'educational-preview'};}
function engineLabel(engine:RealEngine){if(engine==='xelatex')return 'XeLaTeX';if(engine==='lualatex')return 'LuaLaTeX';return 'pdfLaTeX';}
