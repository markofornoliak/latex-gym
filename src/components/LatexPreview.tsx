import katex from 'katex';
import 'katex/dist/katex.min.css';
import type { CompileResult, PreviewBlock } from '../types';

export function LatexPreview({result,emptyText='Здесь появится результат компиляции'}:{result?:CompileResult|null;emptyText?:string}) {
  if(!result) return <div className="preview-empty">{emptyText}</div>;
  if(!result.ok) return <div className="diagnostics" role="status">
    {result.diagnostics.map((d,i)=><div className={`diagnostic diagnostic--${d.severity}`} key={`${d.line}-${i}`}>
      <div><strong>Строка {d.line}.</strong> {d.message}</div>
      <p>{d.explanation}</p>{d.suggestion&&<p className="diagnostic-suggestion">{d.suggestion}</p>}
    </div>)}
  </div>;
  return <article className="paper-preview" aria-label="Результат LaTeX">
    {result.blocks.map((block,i)=><PreviewBlockView block={block} key={i}/>) }
    {result.diagnostics.filter(d=>d.severity!=='error').map((d,i)=><aside className="preview-warning" key={`w${i}`}>{d.message}</aside>)}
  </article>;
}

function PreviewBlockView({block}:{block:PreviewBlock}) {
  if(block.type==='title') return <header className="preview-title"><h1>{block.text}</h1>{block.meta&&<p>{block.meta}</p>}</header>;
  if(block.type==='heading') { const T=block.level===1?'h2':block.level===2?'h3':'h4'; return <T>{block.text}</T>; }
  if(block.type==='paragraph') return <p>{block.text}</p>;
  if(block.type==='math') return <div className={block.display?'preview-math preview-math--display':'preview-math'} dangerouslySetInnerHTML={{__html:katex.renderToString(block.latex,{throwOnError:false,displayMode:block.display,strict:'ignore'})}}/>;
  if(block.type==='list') { const T=block.ordered?'ol':'ul'; return <T>{block.items.map((item,i)=><li key={i}>{item}</li>)}</T>; }
  if(block.type==='table') return <table className="preview-table"><tbody>{block.rows.map((row,i)=><tr key={i}>{row.map((cell,j)=><td key={j}>{cell}</td>)}</tr>)}</tbody></table>;
  return <div className="preview-object">{block.text}</div>;
}
