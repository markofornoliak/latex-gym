import { Link } from 'react-router-dom';
import { ChevronIcon } from '../components/Icons';
import { exercises } from '../data/courses';
import { selectDailyTraining } from '../services/spacedRepetition';
import { useAppStore } from '../store/useAppStore';
import type { PracticeCategory } from '../types';

const categories:PracticeCategory[]=['Основы','Текст','Математика','Таблицы','Графика','TikZ','Библиография','Большие документы','Отладка','Academic challenges'];
const modeDescriptions = ['Написать недостающий код','Исправить сломанный LaTeX','Предсказать или воссоздать результат','Дополнить документ по требованиям','Улучшить структуру исходника'];
export function PracticePage(){
  const scores=useAppStore(s=>s.conceptScores);const completedLessons=useAppStore(s=>s.completedLessons);const completed=useAppStore(s=>s.completedExercises);
  const daily=selectDailyTraining(exercises,scores,completedLessons);
  return <div className="page editorial-page"><header className="page-intro"><span className="eyebrow">ПРАКТИКА</span><h1>Тренировка исходника</h1><p>Задачи проверяют структуру решения, а не буквальное совпадение с эталоном.</p></header>
    <section className="daily-training"><div className="section-heading"><h2>Тренировка дня</h2><span>5 задач</span></div>{daily.map((e,i)=><Link to={`/practice/${e.id}`} className="practice-row" key={e.id}><span>{i+1}</span><span><strong>{e.title}</strong><small>{e.mode} · {e.difficulty}</small></span><span className={completed.includes(e.id)?'done-mark':''}>{completed.includes(e.id)?'✓':<ChevronIcon/>}</span></Link>)}</section>
    <section className="practice-categories"><h2 className="section-title">Категории</h2>{categories.map(c=>{const count=exercises.filter(e=>e.category===c).length;return <div className="category-row" key={c}><span>{c}</span><small>{count} задач</small></div>})}</section>
    <section className="practice-modes"><h2 className="section-title">Форматы работы</h2><p>{modeDescriptions.join(' · ')}</p></section>
  </div>;
}
