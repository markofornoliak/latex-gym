import { useState } from 'react';
import { CopyIcon } from './Icons';

export function CodeBlock({code}:{code:string}) {
  const [copied,setCopied]=useState(false);
  const lines=code.split('\n');
  const copy=async()=>{await navigator.clipboard?.writeText(code);setCopied(true);window.setTimeout(()=>setCopied(false),1200);};
  return <div className="code-block">
    <button className="icon-button code-copy" onClick={copy} aria-label="Скопировать код"><CopyIcon/>{copied&&<span className="sr-only">Скопировано</span>}</button>
    <pre><code>{lines.map((line,i)=><span className="code-line" key={i}><span className="line-no">{i+1}</span><span className="syntax-line">{highlightLine(line)}</span></span>)}</code></pre>
  </div>;
}
function highlightLine(line:string) {
  const parts=line.split(/(\\[a-zA-Z@]+|\\begin|\\end|\{[^{}]*\}|%.*$)/g);
  return <>{parts.map((part,i)=>{
    const cls=part.startsWith('\\')?'tok-command':part.startsWith('{')?'tok-arg':part.startsWith('%')?'tok-comment':'';
    return <span className={cls} key={i}>{part}</span>;
  })}</>;
}
