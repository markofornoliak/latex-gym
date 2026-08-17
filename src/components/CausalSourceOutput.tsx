import { useMemo, useState } from 'react';
import { LatexPreview } from './LatexPreview';
import { buildSourceOutputMap, type SourceLink } from '../services/sourceOutputLinking';
import type { CompileResult } from '../types';

export function CausalSourceOutput({source,result}:{source:string;result:CompileResult|null}){
  const [activeId,setActiveId]=useState<string|null>(null);
  const mapping=useMemo(()=>buildSourceOutputMap(source,result?.blocks??[]),[source,result]);
  const fragments=useMemo(()=>sourceFragments(source,mapping.links),[source,mapping.links]);

  return <div className="source-output-pair source-output-pair--causal" data-linked={activeId?'true':'false'}>
    <section aria-label="Исходник примера"><span className="mode-label">ИСХОДНИК</span><pre className="causal-source"><code>{fragments.map((fragment,index)=>fragment.link
      ? <button type="button" className={`causal-source-token ${activeId===fragment.link.id?'is-active':''}`} key={`${fragment.from}-${index}`} aria-label={fragment.link.label} onMouseEnter={()=>setActiveId(fragment.link!.id)} onMouseLeave={()=>setActiveId(null)} onFocus={()=>setActiveId(fragment.link!.id)} onBlur={()=>setActiveId(null)} onClick={()=>setActiveId(activeId===fragment.link!.id?null:fragment.link!.id)}>{fragment.text}</button>
      : <span key={`${fragment.from}-${index}`}>{fragment.text}</span>)}</code></pre></section>
    <span className="source-output-link" aria-hidden="true">↔</span>
    <section aria-label="Результат примера"><span className="mode-label">РЕЗУЛЬТАТ</span><div className="source-output-preview"><LatexPreview result={result} causal={{targets:mapping.targets,activeId,onActive:setActiveId}}/></div></section>
    <span className="sr-only" aria-live="polite">{activeId?mapping.links.find(link=>link.id===activeId)?.label:''}</span>
  </div>;
}

type Fragment={from:number;text:string;link?:SourceLink};
function sourceFragments(source:string,links:SourceLink[]):Fragment[]{
  if(!links.length)return [{from:0,text:source}];
  const fragments:Fragment[]=[];
  let cursor=0;
  for(const link of links){
    if(link.from>cursor)fragments.push({from:cursor,text:source.slice(cursor,link.from)});
    fragments.push({from:link.from,text:source.slice(link.from,link.to),link});
    cursor=link.to;
  }
  if(cursor<source.length)fragments.push({from:cursor,text:source.slice(cursor)});
  return fragments;
}
