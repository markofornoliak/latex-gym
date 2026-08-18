import { Link } from 'react-router-dom';
import { ChevronIcon } from '../components/Icons';
import { curriculum } from '../data/curriculumRuntime';
import { useAppStore } from '../store/useAppStore';
export function BookmarksPage(){
  const bookmarks=useAppStore(s=>s.bookmarks);
  return <div className="page editorial-page"><header className="page-intro"><span className="eyebrow">СОХРАНЕНО</span><h1>Закладки</h1><p>Уроки, задачи и команды, к которым стоит вернуться без лишней навигации.</p></header>
    {!bookmarks.length&&<div className="empty-state">Пока ничего не сохранено. Значок закладки доступен в уроках, практических задачах и справочнике.</div>}
    <div className="saved-list">{bookmarks.map(b=>{const lesson=b.type==='lesson'?curriculum.lessonById[b.targetId]:undefined;const exercise=b.type==='exercise'?curriculum.exerciseById[b.targetId]:undefined;const ref=b.type==='reference'?curriculum.referenceById[b.targetId]:undefined;const title=lesson?.title??exercise?.title??ref?.title??b.targetId;const subtitle=lesson?'Урок':exercise?'Практика':ref?.command??'Справочник';const to=lesson?`/lesson/${lesson.id}`:exercise?`/practice/${exercise.id}`:`/reference/${ref?.id}`;return <Link className="saved-row" to={to} key={b.id}><span><strong>{title}</strong><small>{subtitle}</small></span><ChevronIcon/></Link>})}</div>
  </div>;
}
