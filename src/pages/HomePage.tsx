import { Link } from 'react-router-dom';
import { ChevronIcon, CheckIcon } from '../components/Icons';
import { modules, lessons } from '../data/courses';
import { useAppStore } from '../store/useAppStore';

export function HomePage() {
  const currentId=useAppStore(s=>s.currentLessonId); const completed=useAppStore(s=>s.completedLessons); const exerciseDone=useAppStore(s=>s.completedExercises);
  const current=lessons.find(l=>l.id===currentId)??lessons[0]; const mod=modules.find(m=>m.id===current.moduleId)!;
  const currentProgress=completed.includes(current.id)?100:Math.min(85,Math.round((exerciseDone.filter(id=>current.exercises.some(e=>e.id===id)).length/current.exercises.length)*100));
  return <div className="page home-page">
    <section className="home-section continue-section">
      <h1 className="section-title">Продолжить обучение</h1>
      <Link to={`/lesson/${current.id}`} className="continue-card">
        <div className="continue-number">{String(mod.number).padStart(2,'0')}</div>
        <div className="continue-body">
          <strong>{mod.title}</strong><span>{current.title}</span>
          <div className="progress-line"><i style={{width:`${Math.max(8,currentProgress)}%`}}/><b>{currentProgress}%</b></div>
        </div><ChevronIcon className="continue-chevron"/>
      </Link>
    </section>
    <section className="home-section plan-section">
      <h2 className="section-title">План обучения</h2>
      <div className="toc-list">{modules.slice(0,6).map(m=>{
        const done=m.lessons.every(l=>completed.includes(l.id));
        return <Link className="toc-row" to={`/course/${m.id}`} key={m.id}>
          <span className="toc-number">{String(m.number).padStart(2,'0')}</span>
          <span className="toc-copy"><strong>{m.title}</strong><small>{m.description}</small></span>
          <span className={`toc-state ${done?'toc-state--done':''}`}>{done?<CheckIcon/>:<ChevronIcon/>}</span>
        </Link>;
      })}</div>
      <Link className="quiet-link" to="/courses">Все 15 модулей</Link>
    </section>
    <section className="home-section tools-section">
      <h2 className="section-title">Инструменты</h2>
      <div className="tool-links"><Link to="/playground">LaTeX Playground <ChevronIcon/></Link><Link to="/bookmarks">Закладки <ChevronIcon/></Link><Link to="/history">История обучения <ChevronIcon/></Link></div>
    </section>
  </div>;
}
