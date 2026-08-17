import { useEffect, useState } from 'react';
import { CodeBlock } from './CodeBlock';
import { LatexPreview } from './LatexPreview';
import { compiler } from '../services/compiler';
import type { CompileResult, LearningBlock } from '../types';

export function LearningBlockView({block}:{block:LearningBlock}){
  const [preview,setPreview]=useState<CompileResult|null>(null);
  useEffect(()=>{
    if(block.type!=='source-output'){setPreview(null);return;}
    let live=true;
    compiler.compile(block.code).then(result=>{if(live)setPreview(result);}).catch(()=>{if(live)setPreview(null);});
    return()=>{live=false;};
  },[block]);

  if(block.type==='concept'||block.type==='explanation')return <article className={`learning-block learning-block--${block.type}`}><h2>{block.title}</h2><p>{block.body}</p>{block.details&&<details className="learning-details"><summary>Подробнее</summary><p>{block.details}</p></details>}</article>;
  if(block.type==='syntax'||block.type==='example')return <article className={`learning-block learning-block--${block.type}`}><h2>{block.title}</h2><p>{block.body}</p><CodeBlock code={block.code}/>{block.type==='syntax'&&block.note&&<p className="learning-note">{block.note}</p>}</article>;
  if(block.type==='anatomy')return <article className="learning-block learning-block--anatomy"><h2>{block.title}</h2>{block.body&&<p>{block.body}</p>}<div className="anatomy-source"><code>{block.source}</code></div><dl className="anatomy-parts">{block.parts.map((part,index)=><div key={`${part.token}-${index}`}><dt><code>{part.token}</code><span>{part.label}</span></dt><dd>{part.description}</dd></div>)}</dl></article>;
  if(block.type==='flow')return <article className="learning-block learning-block--flow"><h2>{block.title}</h2>{block.body&&<p>{block.body}</p>}<ol className="learning-flow">{block.steps.map((step,index)=><li key={step.label}><span>{index+1}</span><div><strong>{step.label}</strong><p>{step.detail}</p></div></li>)}</ol></article>;
  if(block.type==='comparison')return <article className="learning-block learning-block--comparison"><h2>{block.title}</h2>{block.body&&<p>{block.body}</p>}<div className="learning-comparison"><section><span className="comparison-label">{block.left.label}</span><CodeBlock code={block.left.code}/><p>{block.left.note}</p></section><section><span className="comparison-label">{block.right.label}</span><CodeBlock code={block.right.code}/><p>{block.right.note}</p></section></div></article>;
  if(block.type==='mistake'||block.type==='warning')return <article className={`learning-block learning-block--${block.type}`}><span className="learning-kicker">{block.type==='mistake'?'ТИПИЧНАЯ ОШИБКА':'ВАЖНО'}</span><h2>{block.title}</h2><p>{block.body}</p>{block.code&&<CodeBlock code={block.code}/>} {block.type==='mistake'&&block.correction&&<div className="learning-correction"><span>Исправление</span><CodeBlock code={block.correction}/></div>}</article>;
  if(block.type==='checkpoint')return <article className="learning-block learning-block--checkpoint"><span className="learning-kicker">БЫСТРАЯ ПРОВЕРКА</span><h2>{block.title}</h2>{block.code&&<CodeBlock code={block.code}/>}<p className="checkpoint-question">{block.prompt}</p><details className="checkpoint-answer"><summary>Показать ответ</summary><p>{block.answer}</p></details></article>;
  if(block.type==='source-output')return <article className="learning-block learning-block--source-output"><h2>{block.title}</h2><p>{block.body}</p><div className="source-output-pair"><section><span className="mode-label">ИСХОДНИК</span><CodeBlock code={block.code}/></section><section><span className="mode-label">РЕЗУЛЬТАТ</span><div className="source-output-preview"><LatexPreview result={preview}/></div></section></div></article>;
  return null;
}
