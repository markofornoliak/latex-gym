import { Link } from 'react-router-dom';
import { ChevronIcon, CheckIcon } from '../components/Icons';
import { curriculum } from '../data/curriculumRuntime';
import { buildDailyWorkout, type WorkoutReason } from '../services/spacedRepetition';
import { useAppStore } from '../store/useAppStore';

const {exercises,lessons,modules,projects}=curriculum;

export function HomePage() {
  const currentId=useAppStore(state=>state.currentLessonId);
  const completed=useAppStore(state=>state.completedLessons);
  const exerciseDone=useAppStore(state=>state.completedExercises);
  const conceptScores=useAppStore(state=>state.conceptScores);
  const mastery=useAppStore(state=>state.conceptMastery);
  const projectProgress=useAppStore(state=>state.completedProjectStages);
  const streak=useAppStore(state=>state.streak);

  const current=curriculum.lessonById[currentId]??lessons[0];
  const mod=curriculum.moduleById[current.moduleId]!;
  const currentProgress=completed.includes(current.id)?100:Math.min(85,Math.round((exerciseDone.filter(id=>current.exercises.some(exercise=>exercise.id===id)).length/Math.max(1,current.exercises.length))*100));
  const workout=buildDailyWorkout(exercises,conceptScores,completed,undefined,mastery,{graph:curriculum.graph,lessons,targetLessonId:current.id,completedExerciseIds:exerciseDone});
  const counts=countReasons(workout.map(item=>item.reason));
  const dueConcepts=Object.entries(mastery).filter(([,state])=>state.nextReview&&new Date(state.nextReview).getTime()<=Date.now()).sort(([,left],[,right])=>new Date(left.nextReview!).getTime()-new Date(right.nextReview!).getTime()).slice(0,4);
  const weakConcepts=Object.entries(mastery).filter(([,state])=>state.attempts>0&&state.score<.68).sort(([,left],[,right])=>left.score-right.score).slice(0,3);
  const activeProject=projects.map(project=>({project,done:projectProgress[project.id]?.length??0,completed:new Set(projectProgress[project.id]??[])})).filter(item=>item.done>0&&item.done<item.project.stages.length).sort((a,b)=>b.done-a.done)[0];
  const activeStage=activeProject?.project.stages.find(stage=>!activeProject.completed.has(stage.id));
  const firstWorkout=workout[0]?.exercise;

  return <div className="page home-page training-dashboard">
    <section className="training-hero" aria-labelledby="training-title">
      <div className="training-hero-copy"><span className="eyebrow">СЕГОДНЯ</span><h1 id="training-title">Что тренировать сегодня</h1><p>До пяти задач собраны из повторения, текущей темы, ближайших недостающих основ и задач на диагностику. Новое упражнение не появляется раньше необходимых знаний.</p></div>
      <div className="training-session-summary" aria-label="Состав тренировки"><strong>{workout.length} задач · ~{workout.length*3} мин</strong><span>{counts.review} повторение · {counts.new} новое · {counts.weak} укрепление · {counts.debugging+counts.transfer} отладка/перенос</span>{firstWorkout?<Link className="primary-button primary-button--large" to={`/practice/${firstWorkout.id}`}>Начать сегодняшнюю тренировку <ChevronIcon/></Link>:<Link className="primary-button primary-button--large" to="/practice">Открыть практику <ChevronIcon/></Link>}</div>
    </section>

    <section className="home-section workout-section" aria-labelledby="workout-heading">
      <div className="dashboard-section-heading"><div><span className="eyebrow">ЕЖЕДНЕВНАЯ ТРЕНИРОВКА</span><h2 id="workout-heading" className="section-title">Сегодняшняя тренировка</h2></div><Link className="quiet-link" to="/practice">Вся практика</Link></div>
      <div className="workout-list">{workout.map((item,index)=><Link className="workout-row" to={`/practice/${item.exercise.id}`} key={item.exercise.id}><span className="workout-index">{String(index+1).padStart(2,'0')}</span><span className="workout-copy"><small>{reasonLabel(item.reason)}</small><strong>{item.exercise.title}</strong><span>{item.explanation}</span></span><span className="workout-difficulty">{item.exercise.difficulty}</span><ChevronIcon/></Link>)}</div>
    </section>

    <div className="dashboard-two-column">
      <section className="home-section attention-section" aria-labelledby="attention-heading"><span className="eyebrow">ЗОНА ВНИМАНИЯ</span><h2 id="attention-heading" className="section-title">Нужно укрепить</h2>{weakConcepts.length?<div className="attention-list">{weakConcepts.map(([conceptId,state])=><div className="attention-row" key={conceptId}><span><strong>{curriculum.conceptById[conceptId]?.title??conceptId}</strong><small>{masteryLabel(state.score,state.stability)}</small></span><b>{Math.round(state.score*100)}%</b></div>)}</div>:<p className="dashboard-empty">Пока недостаточно данных практики, чтобы выделить слабые концепты. Решите несколько задач — модель начнёт различать завершение и устойчивое знание.</p>}</section>
      <section className="home-section review-section" aria-labelledby="review-heading"><span className="eyebrow">ИНТЕРВАЛЬНОЕ ПОВТОРЕНИЕ</span><h2 id="review-heading" className="section-title">Пора повторить</h2>{dueConcepts.length?<div className="review-concepts">{dueConcepts.map(([conceptId,state])=><div key={conceptId}><strong>{curriculum.conceptById[conceptId]?.title??conceptId}</strong><span>{reviewAge(state.nextReview!)}</span></div>)}</div>:<p className="dashboard-empty">Просроченных повторений нет. Новые концепты для повторения появятся после практики и задержанного извлечения.</p>}</section>
    </div>

    <section className="home-section continue-section">
      <div className="dashboard-section-heading"><div><span className="eyebrow">ОБУЧЕНИЕ</span><h2 className="section-title">Продолжить обучение</h2></div>{streak.count>0&&<span className="study-streak">Серия: {streak.count} дн.</span>}</div>
      <Link to={`/lesson/${current.id}`} className="continue-card"><div className="continue-number">{String(mod.number).padStart(2,'0')}</div><div className="continue-body"><strong>{mod.title}</strong><span>{current.title}</span><div className="progress-line"><i style={{width:`${Math.max(8,currentProgress)}%`}}/><b>{currentProgress}%</b></div></div><ChevronIcon className="continue-chevron"/></Link>
    </section>

    {activeProject&&activeStage&&<section className="home-section current-project-section"><div className="dashboard-section-heading"><div><span className="eyebrow">ПРОЕКТ</span><h2 className="section-title">Текущий документ</h2></div><span>{activeProject.done} / {activeProject.project.stages.length} этапов</span></div><Link className="current-project-card" to={`/project/${activeProject.project.id}/${activeStage.id}`}><span><strong>{activeProject.project.title}</strong><small>{activeProject.project.subtitle}</small></span><span className="project-progress-line"><i style={{width:`${Math.round(activeProject.done/activeProject.project.stages.length*100)}%`}}/></span><ChevronIcon/></Link></section>}

    <section className="home-section plan-section"><div className="dashboard-section-heading"><h2 className="section-title">Основа курса</h2><Link className="quiet-link" to="/courses">Все модули</Link></div><div className="toc-list">{modules.slice(0,4).map(module=>{const done=module.lessons.every(lesson=>completed.includes(lesson.id));return <Link className="toc-row" to={`/course/${module.id}`} key={module.id}><span className="toc-number">{String(module.number).padStart(2,'0')}</span><span className="toc-copy"><strong>{module.title}</strong><small>{module.description}</small></span><span className={`toc-state ${done?'toc-state--done':''}`}>{done?<CheckIcon/>:<ChevronIcon/>}</span></Link>;})}</div></section>
  </div>;
}

function countReasons(reasons:WorkoutReason[]){return reasons.reduce((acc,reason)=>({...acc,[reason]:acc[reason]+1}),{review:0,new:0,weak:0,debugging:0,transfer:0} as Record<WorkoutReason,number>);}
function reasonLabel(reason:WorkoutReason){if(reason==='review')return 'ПОВТОРЕНИЕ';if(reason==='weak')return 'НУЖНО УКРЕПИТЬ';if(reason==='debugging')return 'ОТЛАДКА';if(reason==='transfer')return 'ПЕРЕНОС';return 'НОВОЕ';}
function masteryLabel(score:number,stability:number){if(score>=.86&&stability>=12)return 'Устойчиво';if(score>=.68)return 'Формируется';return 'Нестабильно';}
function reviewAge(nextReview:string){const days=Math.max(0,Math.floor((Date.now()-new Date(nextReview).getTime())/86400000));return days>0?`Просрочено ${days} дн.`:'Сегодня';}
