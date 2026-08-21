import { Link } from 'react-router-dom';
import { ChevronIcon } from '../components/Icons';
import { curriculum } from '../data/curriculumRuntime';
import { selectRuntimeDailyTraining } from '../services/runtimeWorkout';
import { useAppStore } from '../store/useAppStore';
import type { PracticeCategory } from '../types';

const categories:PracticeCategory[]=['Основы','Текст','Математика','Таблицы','Графика','TikZ','Библиография','Большие документы','Отладка','Academic challenges'];
const modeDescriptions=['Собрать','Дополнить','Исправить','Предсказать','Объяснить','Преобразовать','Рефакторинг','Отладка','Архитектура'];
const {exercises}=curriculum;

export function PracticePage(){
  const scores=useAppStore(state=>state.conceptScores);
  const mastery=useAppStore(state=>state.conceptMastery);
  const completedLessons=useAppStore(state=>state.completedLessons);
  const completed=useAppStore(state=>state.completedExercises);
  const daily=selectRuntimeDailyTraining({conceptScores:scores,completedLessonIds:completedLessons,mastery});
  return <div className="page editorial-page">
    <header className="page-intro"><span className="eyebrow">ПРАКТИКА</span><h1>Тренировка исходника</h1><p>Подборка учитывает изученные темы, прежние ошибки и понятия, которые пора повторить. Проверка основана на требованиях, а не на полном совпадении с эталоном.</p></header>
    <section className="daily-training"><div className="section-heading"><h2>Тренировка дня</h2><span>5 задач</span></div>{daily.map((exercise,index)=><Link to={`/practice/${exercise.id}`} className="practice-row" key={exercise.id}><span>{index+1}</span><span><strong>{exercise.title}</strong><small>{exercise.mode} · {exercise.difficulty}</small></span><span className={completed.includes(exercise.id)?'done-mark':''}>{completed.includes(exercise.id)?'✓':<ChevronIcon/>}</span></Link>)}</section>
    <section className="practice-categories"><h2 className="section-title">Категории</h2>{categories.map(category=>{const count=exercises.filter(exercise=>exercise.category===category).length;return <div className="category-row" key={category}><span>{category}</span><small>{count} задач</small></div>;})}</section>
    <section className="practice-modes"><h2 className="section-title">Форматы работы</h2><p>{modeDescriptions.join(' · ')}</p></section>
  </div>;
}