import { Link, useParams } from 'react-router-dom';
import { BackIcon, CheckIcon, ChevronIcon } from '../components/Icons';
import { curriculum } from '../data/curriculumRuntime';
import { useAppStore } from '../store/useAppStore';

export function CoursePage(){
  const {courseId}=useParams();const mod=courseId?curriculum.moduleById[courseId]:undefined;const completed=useAppStore(s=>s.completedLessons);
  if(!mod)return <div className="page empty-state">Модуль не найден.</div>;
  return <div className="page editorial-page"><Link className="back-link" to="/courses"><BackIcon/> Все модули</Link><header className="course-header"><span className="eyebrow">МОДУЛЬ {String(mod.number).padStart(2,'0')}</span><h1>{mod.title}</h1><p>{mod.description}</p><div className="course-facts"><span>{mod.difficulty}</span><span>Предпосылки: {mod.prerequisites}</span></div></header>
    <section><h2 className="section-title">Уроки</h2>{mod.lessons.map((l,i)=><Link to={`/lesson/${l.id}`} className="lesson-row" key={l.id}><span>{String(i+1).padStart(2,'0')}</span><span><strong>{l.title}</strong><small>{l.subtitle}</small></span>{completed.includes(l.id)?<CheckIcon/>:<ChevronIcon/>}</Link>)}</section>
  </div>;
}
