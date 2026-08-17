import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { DownloadIcon, PlayIcon } from '../components/Icons';
import { LatexPreview } from '../components/LatexPreview';
import { compiler } from '../services/compiler';
import { useAppStore } from '../store/useAppStore';
import type { CompileResult } from '../types';
const CodeEditor=lazy(()=>import('../components/CodeEditor').then(m=>({default:m.CodeEditor})));

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
  const settings=useAppStore(s=>s.settings);const draft=useAppStore(s=>s.drafts['playground']);const setDraft=useAppStore(s=>s.setDraft);const [source,setSource]=useState(draft??templates['Минимальный документ']);const [result,setResult]=useState<CompileResult|null>(null);const [busy,setBusy]=useState(false);const [mobileTab,setMobileTab]=useState<'editor'|'preview'>('editor');
  useEffect(()=>{const id=window.setTimeout(()=>setDraft('playground',source),250);return()=>window.clearTimeout(id);},[source]);
  const names=useMemo(()=>Object.keys(templates),[]);
  const compile=async()=>{setBusy(true);try{setResult(await compiler.compile(source));setMobileTab('preview');}finally{setBusy(false)}};
  const download=()=>{const blob=new Blob([source],{type:'application/x-tex'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='latex-gym-document.tex';a.click();URL.revokeObjectURL(url);};
  return <div className="playground-page"><header className="workspace-heading"><div><span className="eyebrow">PLAYGROUND</span><h1>Свободный документ</h1></div><div className="workspace-actions"><select aria-label="Загрузить шаблон" defaultValue="" onChange={e=>{if(e.target.value)setSource(templates[e.target.value])}}><option value="" disabled>Загрузить шаблон</option>{names.map(n=><option key={n}>{n}</option>)}</select><button className="secondary-button" onClick={download}><DownloadIcon/> .tex</button><button className="primary-button" onClick={compile} disabled={busy}><PlayIcon/>{busy?'Компиляция…':'Скомпилировать'}</button></div></header>
    <div className="workspace-mobile-tabs"><button className={mobileTab==='editor'?'active':''} onClick={()=>setMobileTab('editor')}>Редактор</button><button className={mobileTab==='preview'?'active':''} onClick={()=>setMobileTab('preview')}>Результат</button></div>
    <div className="playground-workspace"><section className={mobileTab==='editor'?'mobile-active':''}><Suspense fallback={<div className="editor-loading">Загрузка редактора…</div>}><CodeEditor value={source} onChange={setSource} wordWrap={settings.wordWrap} showLineNumbers={settings.lineNumbers} autoClose={settings.autoClose} minHeight={620} onReset={()=>setSource(templates['Минимальный документ'])}/></Suspense></section><section className={`playground-preview ${mobileTab==='preview'?'mobile-active':''}`}><div className="mode-label">РЕЗУЛЬТАТ</div><LatexPreview result={result}/></section></div>
  </div>;
}
