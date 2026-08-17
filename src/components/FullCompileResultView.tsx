import type { FullCompileResult } from '../services/fullCompiler';
import type { Diagnostic } from '../types';

export function FullCompileResultView({result,pdfUrl}:{result:FullCompileResult;pdfUrl:string|null}){
  return <div className="full-compile-result" role="status" aria-live="polite">
    <div className={`full-compile-summary ${result.ok?'full-compile-summary--ok':'full-compile-summary--error'}`}>
      <strong>{result.ok?'Полная TeX-сборка завершена.':'Полная TeX-сборка остановлена.'}</strong>
      <span>{Math.max(0,result.elapsedMs/1000).toFixed(1)} с · код {result.exitCode}</span>
    </div>
    {result.diagnostics.length>0&&<div className="full-compile-diagnostics">{result.diagnostics.map((item,index)=><DiagnosticArticle item={item} key={`${item.line}-${item.message}-${index}`}/>)}</div>}
    {result.ok&&pdfUrl&&<iframe className="full-compile-pdf" src={pdfUrl} title="PDF после полной TeX-сборки"/>}
    <details className="full-compile-log"><summary>TeX log</summary><pre>{result.log||'TeX не вернул текстовый log.'}</pre></details>
  </div>;
}

function DiagnosticArticle({item}:{item:Diagnostic}){
  const raw=item.rawMessage??item.message;
  return <article className={`full-diagnostic full-diagnostic--${item.severity}`}>
    <div><strong>{item.severity==='error'?'ERROR':item.severity==='warning'?'WARNING':'NOTE'}</strong><span>строка {item.line}</span></div>
    <p><code>{raw}</code></p>
    <small>{item.explanation}</small>
    {item.hints?.[0]&&<details><summary>Небольшая подсказка</summary><small>{item.hints[0]}</small>{item.hints[1]&&<details><summary>Более сильная подсказка</summary><small>{item.hints[1]}</small>{item.suggestion&&<details><summary>Возможная коррекция</summary><small>{item.suggestion}</small></details>}</details>}</details>}
    {!item.hints?.length&&item.suggestion&&<details><summary>Подсказка</summary><small>{item.suggestion}</small></details>}
  </article>;
}
