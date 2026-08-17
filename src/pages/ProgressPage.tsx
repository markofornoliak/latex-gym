import { Link } from 'react-router-dom';
import { exercises, lessons, modules } from '../data/courses';
import { useAppStore } from '../store/useAppStore';
export function ProgressPage(){
  const completedLessons=useAppStore(s=>s.completedLessons);const completedExercises=useAppStore(s=>s.completedExercises);const attempts=useAppStore(s=>s.attempts);const successes=useAppStore(s=>s.successfulAttempts);const streak=useAppStore(s=>s.streak);const scores=useAppStore(s=>s.conceptScores);
  const attemptCount=Object.values(attempts).reduce((a,b)=>a+b,0);const successCount=Object.values(successes).reduce((a,b)=>a+b,0);const practiceRate=attemptCount?Math.round((successCount/attemptCount)*100):0;const totalPct=Math.round(completedLessons.length/lessons.length*100);
  return <div className="page editorial-page"><header className="page-intro"><span className="eyebrow">ПРОГРЕСС</span><h1>{totalPct}% курса</h1><p>Здесь виден не «счёт», а фактическая работа: пройденные уроки, практика и понятия, которые требуют повторения.</p></header>
    <div className="progress-ledger"><div><span>Пройдено уроков</span><strong>{completedLessons.length} / {lessons.length}</strong></div><div><span>Решено задач</span><strong>{completedExercises.length} / {exercises.length}</strong></div><div><span>Успешность практики</span><strong>{practiceRate}%</strong></div><div><span>Текущая серия</span><strong>{streak.count} дней</strong></div></div>
    <section><h2 className="section-title">По модулям</h2>{modules.map(m=>{const done=m.lessons.filter(l=>completedLessons.includes(l.id)).length;return <div className="module-progress-row" key={m.id}><span>{String(m.number).padStart(2,'0')} {m.title}</span><div><i style={{width:`${done/m.lessons.length*100}%`}}/></div><small>{done}/{m.lessons.length}</small></div>})}</section>
    <section className="concept-review"><h2 className="section-title">Повторение понятий</h2>{Object.keys(scores).length?<div>{Object.entries(scores).sort((a,b)=>a[1]-b[1]).slice(0,8).map(([concept,score])=><span key={concept}><code>{concept}</code><small>{score<0?'повторить':score<2?'закрепить':'устойчиво'}</small></span>)}</div>:<p>После первых попыток здесь появится приоритет повторения.</p>}</section>
    <Link className="quiet-link" to="/history">Открыть историю обучения</Link>
  </div>;
}
