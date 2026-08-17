import { Link } from 'react-router-dom';
import { CheckIcon, ChevronIcon } from '../components/Icons';
import { lessons, modules } from '../data/courses';
import { projects } from '../data/projects';
import { useAppStore } from '../store/useAppStore';

export function CoursesPage(){
  const completed=useAppStore(state=>state.completedLessons);
  return <div className="page editorial-page">
    <header className="page-intro"><span className="eyebrow">КУРС</span><h1>LaTeX от модели<br/>до публикации</h1><p>{lessons.length} последовательных уроков. Сначала формируется ментальная модель, затем синтаксис вводится небольшими зависимыми шагами и закрепляется в исходнике.</p></header>
    <div className="course-list">{modules.map(module=>{const done=module.lessons.length>0&&module.lessons.every(lesson=>completed.includes(lesson.id));return <Link className="course-row" to={`/course/${module.id}`} key={module.id}><span className="course-number">{String(module.number).padStart(2,'0')}</span><span className="course-main"><strong>{module.title}</strong><small>{module.description}</small><span className="meta-line">{module.lessons.length} уроков · {module.difficulty} · {module.prerequisites}</span></span><span className={done?'round-check done':'round-check'}>{done?<CheckIcon/>:<ChevronIcon/>}</span></Link>;})}</div>
    <section className="course-project-entry"><span className="eyebrow">ПРОЕКТНАЯ ПРАКТИКА</span><h2>{projects.length} документов от заметок до статьи</h2><p>Проекты соединяют уже изученные понятия в одну архитектуру и сохраняют черновик каждого этапа локально.</p><Link to="/projects">Открыть проекты <ChevronIcon/></Link></section>
  </div>;
}
