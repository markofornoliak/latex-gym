import { Link } from 'react-router-dom';
import { curriculum } from '../data/curriculumRuntime';
import { useAppStore } from '../store/useAppStore';

const {exercises,lessons,modules,projects}=curriculum;

export function ProgressPage(){
  const completedLessons=useAppStore(state=>state.completedLessons);
  const completedExercises=useAppStore(state=>state.completedExercises);
  const projectProgress=useAppStore(state=>state.completedProjectStages);
  const attempts=useAppStore(state=>state.attempts);
  const successes=useAppStore(state=>state.successfulAttempts);
  const streak=useAppStore(state=>state.streak);
  const mastery=useAppStore(state=>state.conceptMastery);
  const attemptCount=Object.values(attempts).reduce((sum,value)=>sum+value,0);
  const successCount=Object.values(successes).reduce((sum,value)=>sum+value,0);
  const practiceRate=attemptCount?Math.round((successCount/attemptCount)*100):0;
  const totalPct=Math.round(completedLessons.length/Math.max(1,lessons.length)*100);
  const projectStages=projects.reduce((sum,project)=>sum+project.stages.length,0);
  const completedStages=projects.reduce((sum,project)=>sum+(projectProgress[project.id]?.length??0),0);
  const review=Object.entries(mastery).sort(([,left],[,right])=>reviewPriority(left)-reviewPriority(right)).slice(0,8);

  return <div className="page editorial-page progress-deep">
    <header className="page-intro"><span className="eyebrow">ПРОГРЕСС</span><h1>Пройдено {totalPct}% курса</h1><p>Общий процент остаётся ориентиром. Ниже разделены четыре разные вещи: прохождение курса, практика, устойчивость понятий и работа над документами.</p></header>

    <section className="progress-section"><div className="section-heading"><h2>Курс</h2><span>{completedLessons.length} / {lessons.length} уроков</span></div>{modules.map(module=>{const done=module.lessons.filter(lesson=>completedLessons.includes(lesson.id)).length;const percent=module.lessons.length?Math.round(done/module.lessons.length*100):0;return <div className="module-progress-row" key={module.id}><span>{String(module.number).padStart(2,'0')} {module.title}</span><div role="progressbar" aria-label={`${module.title}: пройдено ${percent}%`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}><i style={{width:`${percent}%`}}/></div><small>{done}/{module.lessons.length}</small></div>;})}</section>

    <section className="progress-section practice-ledger"><div className="section-heading"><h2>Практика</h2><span>{completedExercises.length} / {exercises.length} задач</span></div><dl><div><dt>Попытки</dt><dd>{attemptCount}</dd></div><div><dt>Успешные решения</dt><dd>{successCount}</dd></div><div><dt>Успешность</dt><dd>{attemptCount?`${practiceRate}%`:'—'}</dd></div><div><dt>Текущая серия</dt><dd>{streak.count?`${streak.count} дн.`:'—'}</dd></div></dl></section>

    <section className="progress-section concept-review"><div className="section-heading"><h2>Понятия к повторению</h2><span>{Object.keys(mastery).length} отслеживается</span></div>{review.length?<div className="mastery-list">{review.map(([id,state])=>{const percent=Math.round(state.score*100);const title=curriculum.conceptById[id]?.title??id;return <div className="mastery-row" key={id}><span><strong>{title}</strong><small>{masteryLabel(state.score,state.nextReview,state.delayedRecallSuccesses)}</small></span><div role="progressbar" aria-label={`${title}: текущая уверенность ${percent}%`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}><i style={{width:`${percent}%`}}/></div></div>;})}</div>:<p className="progress-empty">После первых упражнений здесь появятся понятия, которым полезно повторение.</p>}</section>

    <section className="progress-section project-progress"><div className="section-heading"><h2>Проекты</h2><span>{completedStages} / {projectStages} этапов</span></div>{projects.map(project=>{const done=projectProgress[project.id]?.length??0;const percent=project.stages.length?Math.round(done/project.stages.length*100):0;return <Link to={`/project/${project.id}`} className="project-progress-row" key={project.id}><span><strong>{project.title}</strong><small>{done?`${done} из ${project.stages.length} этапов`:'Не начат'}</small></span><div role="progressbar" aria-label={`${project.title}: выполнено ${percent}%`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}><i style={{width:`${percent}%`}}/></div></Link>;})}</section>

    <Link className="quiet-link" to="/history">История обучения</Link>
  </div>;
}

function reviewPriority(state:{score:number;nextReview:string|null;mistakeCount:number;delayedRecallSuccesses:number}){
  const due=state.nextReview?new Date(state.nextReview).getTime()<=Date.now():true;
  return state.score+(due?-1:0)+(state.delayedRecallSuccesses===0?-.25:0)-Math.min(.4,state.mistakeCount*.04);
}
function masteryLabel(score:number,nextReview:string|null,delayedRecallSuccesses:number){
  const due=nextReview?new Date(nextReview).getTime()<=Date.now():true;
  if(due&&score<.7)return 'повторить сейчас';
  if(score<.55)return 'требует практики';
  if(score<.8)return 'закрепить';
  if(delayedRecallSuccesses===0)return 'нужно проверить позже';
  return due?'короткое повторение':'устойчиво после повторения';
}
