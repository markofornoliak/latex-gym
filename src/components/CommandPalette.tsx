import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { concepts } from '../data/concepts';
import { exercises, lessons } from '../data/courses';
import { projects } from '../data/projects';
import { referenceEntries, searchReference } from '../data/reference';
import { SearchIcon } from './Icons';

type ResultKind='Урок'|'Понятие'|'Команда'|'Пакет'|'Ошибка'|'Задача'|'Проект';
type PaletteResult={id:string;kind:ResultKind;title:string;meta:string;to:string;code?:string;score:number};
const kindOrder:ResultKind[]=['Урок','Понятие','Команда','Пакет','Ошибка','Задача','Проект'];

const errorResults:PaletteResult[]=[
  {id:'error-undefined-control',kind:'Ошибка',title:'Undefined control sequence',meta:'Неизвестная команда или неподключённый пакет',to:'/lesson/debug-undefined-control',score:0},
  {id:'error-missing-brace',kind:'Ошибка',title:'Missing } / Runaway argument',meta:'Потеряна граница группы или аргумента',to:'/lesson/debug-missing-brace',score:0},
  {id:'error-alignment-tab',kind:'Ошибка',title:'Extra alignment tab',meta:'Лишний & в таблице или выравнивании',to:'/lesson/debug-alignment-tab',score:0},
  {id:'error-missing-math',kind:'Ошибка',title:'Missing $ inserted',meta:'Нарушена граница математического режима',to:'/lesson/debug-missing-math',score:0},
  {id:'error-environment',kind:'Ошибка',title:'Environment mismatch',meta:'Несогласованные begin / end',to:'/lesson/debug-undefined-environment',score:0},
  {id:'error-file',kind:'Ошибка',title:'File not found',meta:'TeX не нашёл файл по указанному пути',to:'/lesson/debug-file-not-found',score:0}
];

export default function CommandPalette({onClose}:{onClose:()=>void}){
  const navigate=useNavigate();
  const [query,setQuery]=useState('');
  const [active,setActive]=useState(0);
  const dialogRef=useRef<HTMLElement>(null);
  const inputRef=useRef<HTMLInputElement>(null);
  const restoreFocus=useRef<HTMLElement|null>(null);
  const results=useMemo(()=>collectResults(query),[query]);
  const groups=useMemo(()=>kindOrder.map(kind=>({kind,items:results.filter(item=>item.kind===kind)})).filter(group=>group.items.length),[results]);
  useEffect(()=>{
    restoreFocus.current=document.activeElement instanceof HTMLElement?document.activeElement:null;
    inputRef.current?.focus();
    return()=>restoreFocus.current?.focus();
  },[]);
  useEffect(()=>{setActive(0);},[query]);
  const choose=(item:PaletteResult)=>{onClose();navigate(item.to);};
  return <div className="palette-backdrop" role="presentation" onMouseDown={onClose}>
    <section ref={dialogRef} className="command-palette command-palette--deep" role="dialog" aria-modal="true" aria-label="Поиск по LaTeX gym" onMouseDown={event=>event.stopPropagation()} onKeyDown={event=>{if(event.key==='Tab')trapTab(event,dialogRef.current);}}>
      <div className="palette-search"><SearchIcon/><input ref={inputRef} value={query} onChange={event=>setQuery(event.target.value)} placeholder="Урок, понятие, команда, пакет или ошибка…" autoComplete="off" aria-activedescendant={results[active]?`palette-${results[active].id}`:undefined} onKeyDown={event=>{
        if(event.key==='Escape'){event.preventDefault();onClose();}
        if(event.key==='ArrowDown'){event.preventDefault();setActive(value=>Math.min(results.length-1,value+1));}
        if(event.key==='ArrowUp'){event.preventDefault();setActive(value=>Math.max(0,value-1));}
        if(event.key==='Enter'&&results[active]){event.preventDefault();choose(results[active]);}
      }}/></div>
      <div className="palette-results palette-results--grouped" role="listbox" aria-label="Результаты поиска">
        {groups.map(group=><div className="palette-result-group" key={group.kind}><span className="palette-result-group-label">{group.kind}</span>{group.items.map(item=>{
          const index=results.indexOf(item);
          return <button id={`palette-${item.id}`} role="option" aria-selected={index===active} className={index===active?'active':''} key={`${item.kind}:${item.id}`} onMouseEnter={()=>setActive(index)} onClick={()=>choose(item)}><span className="palette-kind">{item.kind}</span><span className="palette-result-copy"><strong>{item.title}</strong><small>{item.meta}</small></span>{item.code&&<code>{item.code}</code>}</button>;
        })}</div>)}
      </div>
      {!results.length&&<p className="palette-empty">Совпадений нет. Попробуйте термин, синтаксис команды, пакет или текст ошибки.</p>}
      <div className="palette-foot"><span>↑ ↓ выбор</span><span>Enter открыть</span><span>Esc закрыть</span></div>
    </section>
  </div>;
}

function collectResults(query:string):PaletteResult[]{
  const q=normalize(query);
  const items:PaletteResult[]=[];
  for(const entry of searchReference(query).slice(0,q?16:5))items.push({id:`ref-${entry.id}`,kind:'Команда',title:entry.title,meta:entry.description,to:`/reference/${entry.id}`,code:entry.command,score:referenceRank(entry.command,entry.title,entry.aliases,q)});
  for(const lesson of lessons){const score=rank(`${lesson.title} ${lesson.subtitle} ${lesson.pedagogy?.introduces.join(' ')??''}`,q);if(score>0)items.push({id:`lesson-${lesson.id}`,kind:'Урок',title:lesson.title,meta:lesson.subtitle,to:`/lesson/${lesson.id}`,score:score+8});}
  for(const concept of concepts){
    const lesson=lessons.find(item=>item.pedagogy?.introduces.includes(concept.id))??lessons.find(item=>item.pedagogy?.reinforces.includes(concept.id));
    if(!lesson)continue;
    const score=rank(`${concept.title} ${concept.description} ${concept.id}`,q);
    if(score>0)items.push({id:`concept-${concept.id}`,kind:'Понятие',title:concept.title,meta:concept.description,to:`/lesson/${lesson.id}`,score:score+6});
  }
  const seenPackages=new Set<string>();
  for(const entry of referenceEntries){
    if(!entry.package||seenPackages.has(entry.package))continue;
    seenPackages.add(entry.package);
    const score=rank(`${entry.package} ${entry.title} ${entry.description}`,q);
    if(score>0)items.push({id:`package-${entry.package}`,kind:'Пакет',title:entry.package,meta:`Пакет · ${entry.title}`,to:`/reference/${entry.id}`,score:score+5});
  }
  for(const error of errorResults){const score=rank(`${error.title} ${error.meta}`,q);if(score>0)items.push({...error,score:score+7});}
  for(const exercise of exercises){const score=rank(`${exercise.title} ${exercise.instructions} ${exercise.concepts.join(' ')}`,q);if(score>0)items.push({id:`exercise-${exercise.id}`,kind:'Задача',title:exercise.title,meta:`${exercise.mode} · ${exercise.difficulty}`,to:`/practice/${exercise.id}`,score});}
  for(const project of projects){const score=rank(`${project.title} ${project.subtitle} ${project.description} ${project.concepts.join(' ')}`,q);if(score>0)items.push({id:`project-${project.id}`,kind:'Проект',title:project.title,meta:project.subtitle,to:`/project/${project.id}`,score:score+4});}
  if(!q){
    const foundation=lessons.slice(0,2).map(lesson=>({id:`lesson-${lesson.id}`,kind:'Урок' as const,title:lesson.title,meta:lesson.subtitle,to:`/lesson/${lesson.id}`,score:35}));
    items.push(...foundation);
  }
  return dedupe(items).sort((left,right)=>right.score-left.score||kindOrder.indexOf(left.kind)-kindOrder.indexOf(right.kind)||left.title.localeCompare(right.title,'ru')).slice(0,18);
}
function normalize(value:string){return value.toLocaleLowerCase('ru').replace(/^\\/,'').replace(/[{}[\]$]/g,' ').replace(/ё/g,'е').replace(/\s+/g,' ').trim();}
function rank(value:string,q:string){if(!q)return 0;const text=normalize(value);if(text===q)return 80;if(text.startsWith(q))return 55;if(text.includes(q))return 30;const tokens=q.split(' ');return tokens.every(token=>text.includes(token))?18:0;}
function referenceRank(command:string,title:string,aliases:string[],q:string){if(!q)return 25;const normalizedCommand=normalize(command);if(normalizedCommand===q)return 100;if(aliases.map(normalize).includes(q))return 92;return rank(`${command} ${title} ${aliases.join(' ')}`,q)+10;}
function dedupe(items:PaletteResult[]){const seen=new Set<string>();return items.filter(item=>{const key=`${item.kind}:${item.to}:${item.title}`;if(seen.has(key))return false;seen.add(key);return true;});}
function trapTab(event:ReactKeyboardEvent,container:HTMLElement|null){
  if(!container)return;
  const focusable=[...container.querySelectorAll<HTMLElement>('input,button,a[href],[tabindex]:not([tabindex="-1"])')].filter(element=>!element.hasAttribute('disabled')&&element.getAttribute('aria-hidden')!=='true');
  if(focusable.length===0){event.preventDefault();return;}
  const first=focusable[0];const last=focusable[focusable.length-1];
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
}
