import { Link } from 'react-router-dom';
import { CheckIcon, ChevronIcon } from '../components/Icons';
import { modules } from '../data/courses';
import { useAppStore } from '../store/useAppStore';

export function CoursesPage(){
  const completed=useAppStore(s=>s.completedLessons);
  return <div className="page editorial-page"><header className="page-intro"><span className="eyebrow">КУРС</span><h1>LaTeX от структуры<br/>до публикации</h1><p>Пятнадцать последовательных модулей. Теория остаётся короткой; основное знание закрепляется в исходнике.</p></header>
    <div className="course-list">{modules.map(m=>{const done=m.lessons.every(l=>completed.includes(l.id));return <Link className="course-row" to={`/course/${m.id}`} key={m.id}>
      <span className="course-number">{String(m.number).padStart(2,'0')}</span><span className="course-main"><strong>{m.title}</strong><small>{m.description}</small><span className="meta-line">{m.lessons.length} урок · {m.difficulty} · {m.prerequisites}</span></span><span className={done?'round-check done':'round-check'}>{done?<CheckIcon/>:<ChevronIcon/>}</span>
    </Link>})}</div>
  </div>;
}
