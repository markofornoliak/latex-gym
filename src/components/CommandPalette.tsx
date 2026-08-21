import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { curriculum } from '../data/curriculumRuntime';
import { searchRuntimeReference } from '../data/runtimeCatalog';
import { SearchIcon } from './Icons';

type PaletteResult={id:string;kind:'Урок'|'Команда'|'Задача'|'Проект';title:string;meta:string;to:string;code?:string;score:number};
const {exercises,lessons,projects}=curriculum;

export default function CommandPalette({onClose}:{onClose:()=>void}){
  const navigate=useNavigate();
  const [query,setQuery]=useState('');
  const [active,setActive]=useState(0);
  const inputRef=useRef<HTMLInputElement>(null);
  const dialogRef=useRef<HTMLElement>(null);
  const results=useMemo(()=>collectResults(query),[query]);
  useLayoutEffect(()=>{
    const previous=document.activeElement instanceof HTMLElement?document.activeElement:null;
    inputRef.current?.focus({preventScroll:true});
    return()=>{if(previous?.isConnected)previous.focus({preventScroll:true});};
  },[]);
  useEffect(()=>{setActive(0);},[query]);
  const choose=(item:PaletteResult)=>{onClose();navigate(item.to);};
  const onDialogKeyDown=(event:ReactKeyboardEvent<HTMLElement>)=>{
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();onClose();return;}
    if(event.key!=='Tab')return;
    const focusable=[...(dialogRef.current?.querySelectorAll<HTMLElement>('input,button,[href],[tabindex]:not([tabindex="-1"])')??[])].filter(element=>!element.hasAttribute('disabled')&&element.getAttribute('aria-hidden')!=='true');
    if(!focusable.length){event.preventDefault();return;}
    const first=focusable[0],last=focusable.at(-1)!;
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  };
  return <div className="palette-backdrop" role="presentation" onMouseDown={onClose}>
    <section ref={dialogRef} className="command-palette command-palette--deep" role="dialog" aria-modal="true" aria-label="Поиск по LaTeX gym" onMouseDown={event=>event.stopPropagation()} onKeyDown={onDialogKeyDown}>
      <div className="palette-search"><SearchIcon/><input ref={inputRef} value={query} onChange={event=>setQuery(event.target.value)} placeholder="Урок, команда, задача или «дробь»…" autoComplete="off" role="combobox" aria-expanded="true" aria-autocomplete="list" aria-controls="palette-results" aria-activedescendant={results[active]?`palette-${results[active].id}`:undefined} onKeyDown={event=>{
        if(event.key==='ArrowDown'){event.preventDefault();setActive(value=>Math.min(results.length-1,value+1));}
        if(event.key==='ArrowUp'){event.preventDefault();setActive(value=>Math.max(0,value-1));}
        if(event.key==='Enter'&&results[active]){event.preventDefault();choose(results[active]);}
      }}/></div>
      <div id="palette-results" className="palette-results" role="listbox" aria-label="Результаты поиска">{results.map((item,index)=><button id={`palette-${item.id}`} tabIndex={-1} role="option" aria-selected={index===active} className={index===active?'active':''} key={`${item.kind}:${item.id}`} onMouseEnter={()=>setActive(index)} onClick={()=>choose(item)}><span className="palette-kind">{item.kind}</span><span className="palette-result-copy"><strong>{item.title}</strong><small>{item.meta}</small></span>{item.code&&<code>{item.code}</code>}</button>)}</div>
      {!results.length&&<p className="palette-empty">Совпадений нет. Попробуйте термин, синтаксис команды или название темы.</p>}
      <div className="palette-foot"><span>↑ ↓ выбор</span><span>Enter открыть</span><span>Esc закрыть</span></div>
    </section>
  </div>;
}

function collectResults(query:string):PaletteResult[]{
  const q=normalize(query);
  const items:PaletteResult[]=[];
  for(const entry of searchRuntimeReference(query).slice(0,q?12:5))items.push({id:`ref-${entry.id}`,kind:'Команда',title:entry.title,meta:entry.description,to:`/reference/${entry.id}`,code:entry.command,score:referenceRank(entry.command,entry.title,entry.aliases,q)});
  for(const lesson of lessons){const score=rank(`${lesson.title} ${lesson.subtitle} ${lesson.pedagogy?.introduces.join(' ')??''}`,q);if(score>0)items.push({id:`lesson-${lesson.id}`,kind:'Урок',title:lesson.title,meta:lesson.subtitle,to:`/lesson/${lesson.id}`,score:score+8});}
  for(const exercise of exercises){const score=rank(`${exercise.title} ${exercise.instructions} ${exercise.concepts.join(' ')}`,q);if(score>0)items.push({id:`exercise-${exercise.id}`,kind:'Задача',title:exercise.title,meta:`${exercise.mode} · ${exercise.difficulty}`,to:`/practice/${exercise.id}`,score});}
  for(const project of projects){const score=rank(`${project.title} ${project.subtitle} ${project.description}`,q);if(score>0)items.push({id:`project-${project.id}`,kind:'Проект',title:project.title,meta:project.subtitle,to:`/project/${project.id}`,score:score+4});}
  if(!q){
    const foundation=lessons.slice(0,2).map(lesson=>({id:`lesson-${lesson.id}`,kind:'Урок' as const,title:lesson.title,meta:lesson.subtitle,to:`/lesson/${lesson.id}`,score:35}));
    items.push(...foundation);
  }
  return dedupe(items).sort((left,right)=>right.score-left.score||left.title.localeCompare(right.title,'ru')).slice(0,10);
}
function normalize(value:string){return value.toLocaleLowerCase('ru').replace(/^\\/,'').replace(/[{}[\]$]/g,' ').replace(/\s+/g,' ').trim();}
function rank(value:string,q:string){if(!q)return 0;const text=normalize(value);if(text===q)return 80;if(text.startsWith(q))return 55;if(text.includes(q))return 30;const tokens=q.split(' ');return tokens.every(token=>text.includes(token))?18:0;}
function referenceRank(command:string,title:string,aliases:string[],q:string){if(!q)return 25;const normalizedCommand=normalize(command);if(normalizedCommand===q)return 100;if(aliases.map(normalize).includes(q))return 92;return rank(`${command} ${title} ${aliases.join(' ')}`,q)+10;}
function dedupe(items:PaletteResult[]){const seen=new Set<string>();return items.filter(item=>{if(seen.has(item.to))return false;seen.add(item.to);return true;});}
