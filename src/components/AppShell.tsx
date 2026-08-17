import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { lessons } from '../data/courses';
import { searchReference } from '../data/reference';
import { useAppStore } from '../store/useAppStore';
import { BookIcon, HomeIcon, PenIcon, ReferenceIcon, SearchIcon, SettingsIcon } from './Icons';
import { Wordmark } from './Wordmark';

const nav = [
  {to:'/home',label:'Главная',Icon:HomeIcon},
  {to:'/courses',label:'Курсы',Icon:BookIcon},
  {to:'/practice',label:'Практика',Icon:PenIcon},
  {to:'/reference',label:'Справочник',Icon:ReferenceIcon}
];

export function AppShell({children,plain=false}:{children:ReactNode;plain?:boolean}) {
  const location=useLocation(); const navigate=useNavigate();
  const completed=useAppStore(s=>s.completedLessons); const streak=useAppStore(s=>s.streak); const settings=useAppStore(s=>s.settings);
  const [palette,setPalette]=useState(false); const [query,setQuery]=useState(''); const searchRef=useRef<HTMLInputElement>(null);
  const percent=Math.round((completed.length/lessons.length)*100);
  const immersive=!plain && (location.pathname.startsWith('/lesson/') || /^\/practice\/[^/]+/.test(location.pathname));
  const showMobileNav=!plain && !immersive && !location.pathname.startsWith('/practice/');
  const scale=settings.textSize==='small'?.94:settings.textSize==='large'?1.08:1;
  const results=useMemo(()=>searchReference(query).slice(0,7),[query]);
  useEffect(()=>{
    const key=(event:KeyboardEvent)=>{if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){event.preventDefault();setPalette(true);}};
    window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
  },[]);
  useEffect(()=>{if(palette)window.setTimeout(()=>searchRef.current?.focus(),0);},[palette]);
  return <div className={`app ${showMobileNav?'app--mobile-nav':''} ${immersive?'app--immersive':''}`} style={{'--text-scale':scale} as CSSProperties}>
    {!plain&&!immersive&&<header className="topbar">
      <Link to="/home" className="topbar-logo" aria-label="LaTeX gym — главная"><Wordmark/></Link>
      <nav className="desktop-nav" aria-label="Основная навигация">{nav.map(({to,label,Icon})=><NavLink key={to} to={to} className={({isActive})=>isActive?'active':''}><Icon/><span>{label}</span></NavLink>)}</nav>
      <div className="topbar-actions">
        <button className="search-trigger" onClick={()=>setPalette(true)} aria-label="Поиск команд"><SearchIcon/><span>⌘K</span></button>
        <details className="progress-menu">
          <summary aria-label={`Прогресс ${percent}%`}><ProgressRing percent={percent}/></summary>
          <div className="progress-popover">
            <h3>Прогресс обучения</h3>
            <p>Пройдено уроков: <strong>{completed.length} / {lessons.length}</strong></p>
            <p>Текущая серия: <strong>{streak.count} дн.</strong></p>
            <Link to="/progress">Подробный прогресс</Link>
          </div>
        </details>
        <Link className="icon-button settings-link" to="/settings" aria-label="Настройки"><SettingsIcon/></Link>
      </div>
    </header>}
    <main>{children}</main>
    {showMobileNav&&<nav className="bottom-nav" aria-label="Мобильная навигация">{nav.map(({to,label,Icon})=><NavLink key={to} to={to} className={({isActive})=>isActive?'active':''}><Icon/><span>{label}</span></NavLink>)}</nav>}
    {palette&&<div className="palette-backdrop" role="presentation" onMouseDown={()=>setPalette(false)}>
      <section className="command-palette" role="dialog" aria-modal="true" aria-label="Поиск по справочнику" onMouseDown={e=>e.stopPropagation()}>
        <div className="palette-search"><SearchIcon/><input ref={searchRef} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Команда, термин или «дробь»…" onKeyDown={e=>{if(e.key==='Escape')setPalette(false);}}/></div>
        <div className="palette-results">{results.map(entry=><button key={entry.id} onClick={()=>{setPalette(false);setQuery('');navigate(`/reference/${entry.id}`)}}><code>{entry.command}</code><span><strong>{entry.title}</strong><small>{entry.description}</small></span></button>)}</div>
        <div className="palette-foot">Поиск понимает команды, русские термины и английские названия.</div>
      </section>
    </div>}
  </div>;
}

export function ProgressRing({percent}:{percent:number}) {
  return <span className="progress-ring" style={{'--progress':`${Math.max(0,Math.min(100,percent))*3.6}deg`} as CSSProperties}><span>{percent}</span></span>;
}
