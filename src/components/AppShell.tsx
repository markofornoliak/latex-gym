import { lazy, Suspense, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { CURRICULUM_LESSON_COUNT } from '../data/curriculumMeta';
import { useAppStore } from '../store/useAppStore';
import { BookIcon, PenIcon, ProjectIcon, ReferenceIcon, SearchIcon, SettingsIcon } from './Icons';
import { Wordmark } from './Wordmark';

const CommandPalette=lazy(()=>import('./CommandPalette'));
const nav=[
  {to:'/courses',label:'Обучение',Icon:BookIcon},
  {to:'/practice',label:'Практика',Icon:PenIcon},
  {to:'/projects',label:'Проекты',Icon:ProjectIcon},
  {to:'/reference',label:'Справочник',Icon:ReferenceIcon}
];

export function AppShell({children,plain=false}:{children:ReactNode;plain?:boolean}){
  const location=useLocation();
  const completed=useAppStore(state=>state.completedLessons);
  const streak=useAppStore(state=>state.streak);
  const settings=useAppStore(state=>state.settings);
  const [palette,setPalette]=useState(false);
  const previousPath=useRef(location.pathname);
  const percent=Math.round((completed.length/Math.max(1,CURRICULUM_LESSON_COUNT))*100);
  const immersive=!plain&&(location.pathname.startsWith('/lesson/')||/^\/practice\/[^/]+/.test(location.pathname));
  const showMobileNav=!plain&&!immersive&&!location.pathname.startsWith('/practice/');
  const scale=settings.textSize==='small'?.94:settings.textSize==='large'?1.08:1;
  useEffect(()=>{
    const onKey=(event:KeyboardEvent)=>{
      if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){
        event.preventDefault();setPalette(value=>!value);
      }
    };
    window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey);
  },[]);
  useEffect(()=>{setPalette(false);},[location.pathname]);
  useEffect(()=>{
    if(previousPath.current===location.pathname)return;
    previousPath.current=location.pathname;
    requestAnimationFrame(()=>document.getElementById('main-content')?.focus({preventScroll:true}));
  },[location.pathname]);
  return <div className={`app ${showMobileNav?'app--mobile-nav':''} ${immersive?'app--immersive':''}`} style={{'--text-scale':scale} as CSSProperties}>
    <a className="skip-link" href="#main-content">К содержимому</a>
    {!plain&&!immersive&&<header className="topbar">
      <Link to="/home" className="topbar-logo" aria-label="LaTeX Gym — тренировочная панель"><Wordmark/></Link>
      <nav className="desktop-nav" aria-label="Основная навигация">{nav.map(({to,label,Icon})=><NavLink key={to} to={to} className={({isActive})=>isActive?'active':''}><Icon/><span>{label}</span></NavLink>)}</nav>
      <div className="topbar-actions">
        <button className="search-trigger" onClick={()=>setPalette(true)} aria-label="Поиск по LaTeX Gym"><SearchIcon/><span>⌘K</span></button>
        <details className="progress-menu">
          <summary aria-label={`Прогресс курса ${percent}%`}><ProgressRing percent={percent}/></summary>
          <div className="progress-popover">
            <h3>Прогресс обучения</h3>
            <p>Пройдено уроков: <strong>{completed.length} / {CURRICULUM_LESSON_COUNT}</strong></p>
            <p>Текущая серия: <strong>{streak.count} дн.</strong></p>
            <Link to="/progress">Подробный прогресс</Link>
          </div>
        </details>
        <Link className="icon-button settings-link" to="/settings" aria-label="Настройки"><SettingsIcon/></Link>
      </div>
    </header>}
    <main id="main-content" tabIndex={-1}>{children}</main>
    {showMobileNav&&<nav className="bottom-nav" aria-label="Мобильная навигация">{nav.map(({to,label,Icon})=><NavLink key={to} to={to} className={({isActive})=>isActive?'active':''}><Icon/><span>{label}</span></NavLink>)}</nav>}
    {palette&&<Suspense fallback={null}><CommandPalette onClose={()=>setPalette(false)}/></Suspense>}
  </div>;
}

export function ProgressRing({percent}:{percent:number}){
  return <span className="progress-ring" style={{'--progress':`${Math.max(0,Math.min(100,percent))*3.6}deg`} as CSSProperties}><span>{percent}</span></span>;
}
