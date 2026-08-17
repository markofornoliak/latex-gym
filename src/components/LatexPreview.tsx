import { useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import type { CompileResult, PreviewBlock } from '../types';
import type { CausalTarget } from '../services/sourceOutputLinking';

type CausalPreview={targets:CausalTarget[];activeId:string|null;onActive:(id:string|null)=>void};

export function LatexPreview({result,emptyText='Здесь появится результат компиляции',causal}:{result?:CompileResult|null;emptyText?:string;causal?:CausalPreview}) {
  if(!result) return <div className="preview-empty">{emptyText}</div>;
  if(!result.ok) return <div className="diagnostics" role="status">
    {result.diagnostics.map((d,i)=><div className={`diagnostic diagnostic--${d.severity}`} key={`${d.line}-${i}`}>
      <div><strong>Строка {d.line}.</strong> {d.message}</div>
      <p>{d.explanation}</p>{d.suggestion&&<p className="diagnostic-suggestion">{d.suggestion}</p>}
    </div>)}
  </div>;
  return <article className="paper-preview" aria-label="Результат LaTeX">
    {result.blocks.map((block,i)=><PreviewBlockView block={block} blockIndex={i} causal={causal} key={i}/>) }
    {result.diagnostics.filter(d=>d.severity!=='error').map((d,i)=><aside className="preview-warning" key={`w${i}`}>{d.message}</aside>)}
  </article>;
}

function PreviewBlockView({block,blockIndex,causal}:{block:PreviewBlock;blockIndex:number;causal?:CausalPreview}) {
  const targets=causal?.targets.filter(target=>target.blockIndex===blockIndex)??[];
  const blockTargets=targets.filter(target=>!target.part);
  const interactive=Boolean(causal&&blockTargets.length);
  const active=blockTargets.some(target=>target.id===causal?.activeId);
  const interactionProps=interactive?targetInteraction(blockTargets[0],causal!):{};
  const className=interactive?`causal-output-target ${active?'is-active':''}`:undefined;

  if(block.type==='title') return <header className={`preview-title ${className??''}`} {...interactionProps}><h1>{block.text}</h1>{block.meta&&<p>{block.meta}</p>}</header>;
  if(block.type==='heading') { const T=block.level===1?'h2':block.level===2?'h3':'h4'; return <T className={className} {...interactionProps}>{block.text}</T>; }
  if(block.type==='paragraph') return <p className={className} {...interactionProps}>{block.text}</p>;
  if(block.type==='math') return <CausalMath latex={block.latex} display={block.display} targets={targets} causal={causal}/>;
  if(block.type==='list') { const T=block.ordered?'ol':'ul'; return <T className={className} {...interactionProps}>{block.items.map((item,i)=><li key={i}>{item}</li>)}</T>; }
  if(block.type==='table') return <table className={`preview-table ${className??''}`} {...interactionProps}><tbody>{block.rows.map((row,i)=><tr key={i}>{row.map((cell,j)=><td key={j}>{cell}</td>)}</tr>)}</tbody></table>;
  return <div className={`preview-object ${className??''}`} {...interactionProps}>{block.text}</div>;
}

function CausalMath({latex,display,targets,causal}:{latex:string;display:boolean;targets:CausalTarget[];causal?:CausalPreview}){
  const root=useRef<HTMLDivElement>(null);
  const html=katex.renderToString(latex,{throwOnError:false,displayMode:display,strict:'ignore'});
  const blockTargets=targets.filter(target=>!target.part);
  const activeBlock=blockTargets.some(target=>target.id===causal?.activeId);
  useEffect(()=>{
    const host=root.current;
    if(!host||!causal)return;
    const cleanups:Array<()=>void>=[];
    const fractions=[...host.querySelectorAll<HTMLElement>('.katex-html .mfrac')];
    for(const target of targets.filter(item=>item.part)){
      const fraction=fractions[target.fractionIndex??0];
      if(!fraction)continue;
      const node=target.part==='fraction'?fraction:fractionPart(fraction,target.part);
      if(!node)continue;
      node.classList.add('causal-output-target','causal-output-target--math-part');
      node.tabIndex=0;
      node.setAttribute('role','button');
      node.setAttribute('aria-label',target.label);
      if(target.id===causal.activeId)node.classList.add('is-active');
      const activate=()=>causal.onActive(target.id);
      const clear=()=>causal.onActive(null);
      const key=(event:KeyboardEvent)=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();activate();}};
      node.addEventListener('mouseenter',activate);node.addEventListener('mouseleave',clear);node.addEventListener('focus',activate);node.addEventListener('blur',clear);node.addEventListener('click',activate);node.addEventListener('keydown',key);
      cleanups.push(()=>{node.removeEventListener('mouseenter',activate);node.removeEventListener('mouseleave',clear);node.removeEventListener('focus',activate);node.removeEventListener('blur',clear);node.removeEventListener('click',activate);node.removeEventListener('keydown',key);node.classList.remove('causal-output-target','causal-output-target--math-part','is-active');node.removeAttribute('tabindex');node.removeAttribute('role');node.removeAttribute('aria-label');});
    }
    return()=>cleanups.forEach(cleanup=>cleanup());
  },[causal?.activeId,causal,targets,html]);
  const interactionProps=causal&&blockTargets.length?targetInteraction(blockTargets[0],causal):{};
  return <div ref={root} className={`${display?'preview-math preview-math--display':'preview-math'} ${blockTargets.length?'causal-output-target':''} ${activeBlock?'is-active':''}`} {...interactionProps} dangerouslySetInnerHTML={{__html:html}}/>;
}

function fractionPart(fraction:HTMLElement,part:'numerator'|'denominator'){
  const vlist=fraction.querySelector<HTMLElement>('.vlist');
  if(!vlist)return undefined;
  const candidates=[...vlist.children].filter(child=>!child.querySelector('.frac-line')) as HTMLElement[];
  if(!candidates.length)return undefined;
  return part==='denominator'?candidates[0]:candidates.at(-1);
}

function targetInteraction(target:CausalTarget,causal:CausalPreview){
  return {
    tabIndex:0,
    role:'button',
    'aria-label':target.label,
    onMouseEnter:()=>causal.onActive(target.id),
    onMouseLeave:()=>causal.onActive(null),
    onFocus:()=>causal.onActive(target.id),
    onBlur:()=>causal.onActive(null),
    onClick:()=>causal.onActive(target.id),
    onKeyDown:(event:React.KeyboardEvent)=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();causal.onActive(target.id);}}
  } as const;
}
