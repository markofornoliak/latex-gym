import { useEffect, useState } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import type { CompileResult, Diagnostic, PreviewBlock } from '../types';

export type DiagnosticNavigation={
  canNavigate:(diagnostic:Diagnostic)=>boolean;
  navigate:(diagnostic:Diagnostic)=>void;
};

export function LatexPreview({result,emptyText='Здесь появится результат компиляции',diagnosticNavigation}:{result?:CompileResult|null;emptyText?:string;diagnosticNavigation?:DiagnosticNavigation}) {
  if(!result)return <div className="preview-empty">{emptyText}</div>;
  if(!result.ok)return <div className="compile-result compile-result--failed" role="status" aria-live="polite">
    <DiagnosticsList diagnostics={result.diagnostics} navigation={diagnosticNavigation}/>
    <CompilerLog result={result}/>
  </div>;
  if(result.pdf?.length)return <RealPdfPreview result={result} diagnosticNavigation={diagnosticNavigation}/>;
  return <div className="compile-result compile-result--educational">
    <div className="preview-engine-note"><strong>Учебный предпросмотр</strong><span>Это не PDF-сборка TeX.</span></div>
    <article className="paper-preview" aria-label="Учебный предпросмотр LaTeX">
      {result.blocks.map((block,i)=><PreviewBlockView block={block} key={i}/>) }
    </article>
    {result.diagnostics.length>0&&<DiagnosticsList diagnostics={result.diagnostics} navigation={diagnosticNavigation}/>} 
    <CompilerLog result={result}/>
  </div>;
}

function RealPdfPreview({result,diagnosticNavigation}:{result:CompileResult;diagnosticNavigation?:DiagnosticNavigation}){
  const [url,setUrl]=useState<string|null>(null);
  useEffect(()=>{
    if(!result.pdf?.length){setUrl(null);return;}
    const bytes=new Uint8Array(result.pdf);
    const objectUrl=URL.createObjectURL(new Blob([bytes.buffer],{type:'application/pdf'}));
    setUrl(objectUrl);
    return()=>URL.revokeObjectURL(objectUrl);
  },[result.pdf]);

  return <div className="real-pdf-result">
    <div className="pdf-toolbar" aria-label="Управление PDF">
      <span className="pdf-engine"><strong>{engineName(result.engine)}</strong><small>{result.elapsedMs} мс</small></span>
      <span className="pdf-actions">{url&&<><a className="text-tool" href={url} target="_blank" rel="noreferrer">Открыть PDF</a><a className="text-tool" href={url} download="latex-gym.pdf">Скачать PDF</a></>}</span>
    </div>
    {url?<iframe className="pdf-frame" src={`${url}#view=FitH`} title="PDF, собранный TeX"/>:<div className="preview-empty">Подготовка PDF…</div>}
    {result.diagnostics.length>0&&<DiagnosticsList diagnostics={result.diagnostics} navigation={diagnosticNavigation}/>} 
    <CompilerLog result={result}/>
  </div>;
}

function DiagnosticsList({diagnostics,navigation}:{diagnostics:Diagnostic[];navigation?:DiagnosticNavigation}){
  if(!diagnostics.length)return null;
  return <div className="diagnostics" aria-label="Диагностика компиляции">
    {diagnostics.map((diagnostic,index)=>{
      const location=diagnostic.file?`${diagnostic.file}:${diagnostic.line}`:`Строка ${diagnostic.line}`;
      const canNavigate=Boolean(navigation?.canNavigate(diagnostic));
      return <article className={`diagnostic diagnostic--${diagnostic.severity}`} key={`${diagnostic.severity}-${diagnostic.file??''}-${diagnostic.line}-${diagnostic.message}-${index}`}>
        <header><span>{severityName(diagnostic.severity)}{diagnostic.cascade==='root'?' · вероятная первопричина':diagnostic.cascade==='secondary'?' · возможное следствие':''}</span>{navigation?(canNavigate?<button type="button" className="diagnostic-location" onClick={()=>navigation.navigate(diagnostic)} aria-label={`Перейти к ${location}`}>{location}</button>:<span className="diagnostic-location-unavailable">Позиция в исходнике не определена</span>):<strong>{location}</strong>}</header>
        {diagnostic.originalCompilerMessage&&diagnostic.source==='tex'&&<div className="diagnostic-original"><small>TeX</small><pre>{diagnostic.originalCompilerMessage}</pre></div>}
        <div className="diagnostic-explanation"><small>LaTeX Gym</small><strong>{diagnostic.message}</strong><p>{diagnostic.explanation}</p>{diagnostic.suggestion&&<p className="diagnostic-suggestion">{diagnostic.suggestion}</p>}</div>
      </article>;
    })}
  </div>;
}

function CompilerLog({result}:{result:CompileResult}){
  if(!result.rawLog)return null;
  return <details className="compiler-log"><summary>Оригинальный журнал TeX</summary><div className="compiler-log-meta"><span>Движок: {engineName(result.engine)}</span><span>Провайдер: {result.providerId??result.engine}</span></div><pre>{result.rawLog}</pre></details>;
}

function PreviewBlockView({block}:{block:PreviewBlock}) {
  if(block.type==='title')return <header className="preview-title"><h1>{block.text}</h1>{block.meta&&<p>{block.meta}</p>}</header>;
  if(block.type==='heading'){const T=block.level===1?'h2':block.level===2?'h3':'h4';return <T>{block.text}</T>;}
  if(block.type==='paragraph')return <p>{block.text}</p>;
  if(block.type==='math')return <div className={block.display?'preview-math preview-math--display':'preview-math'} dangerouslySetInnerHTML={{__html:katex.renderToString(block.latex,{throwOnError:false,displayMode:block.display,strict:'ignore'})}}/>;
  if(block.type==='list'){const T=block.ordered?'ol':'ul';return <T>{block.items.map((item,i)=><li key={i}>{item}</li>)}</T>;}
  if(block.type==='table')return <table className="preview-table"><tbody>{block.rows.map((row,i)=><tr key={i}>{row.map((cell,j)=><td key={j}>{cell}</td>)}</tr>)}</tbody></table>;
  return <div className="preview-object">{block.text}</div>;
}

function severityName(severity:Diagnostic['severity']){if(severity==='error')return 'Ошибка';if(severity==='warning')return 'Предупреждение';return 'Информация';}
function engineName(engine:CompileResult['engine']){if(engine==='pdflatex')return 'pdfLaTeX';if(engine==='xelatex')return 'XeLaTeX';if(engine==='lualatex')return 'LuaLaTeX';return 'Educational Preview';}
