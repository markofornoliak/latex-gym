import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BackIcon, BookmarkIcon, ChevronIcon } from '../components/Icons';
import { CodeBlock } from '../components/CodeBlock';
import { LatexPreview } from '../components/LatexPreview';
import { getLesson, lessonIndex, lessons } from '../data/courses';
import { compiler } from '../services/compiler';
import { useAppStore } from '../store/useAppStore';
import type { CompileResult, TheoryBlock as TheoryBlockType } from '../types';

type Tab='theory'|'example'|'practice';
export function LessonPage(){
  const {lessonId}=useParams();const lesson=getLesson(lessonId);const navigate=useNavigate();const [tab,setTab]=useState<Tab>('theory');const [slide,setSlide]=useState(0);const [exampleResult,setExampleResult]=useState<CompileResult|null>(null);
  const bookmarks=useAppStore(s=>s.bookmarks);const toggle=useAppStore(s=>s.toggleBookmark);const complete=useAppStore(s=>s.completeLesson);const setCurrent=useAppStore(s=>s.setCurrentLesson);
  const bookmarked=lesson?bookmarks.some(b=>b.id===`lesson:${lesson.id}`):false;
  useEffect(()=>{if(lesson){setCurrent(lesson.id);setTab('theory');setSlide(0);}},[lesson?.id]);
  const index=lesson?lessonIndex.get(lesson.id)??0:0; const prev=lessons[index-1];const next=lessons[index+1];
  const slideCount=tab==='theory'?lesson?.theory.length??1:tab==='example'?lesson?.examples.length??1:lesson?.exercises.length??1;
  const safeSlide=Math.min(slide,Math.max(0,slideCount-1));
  const tabContent=useMemo(()=>lesson?({theory:lesson.theory,example:lesson.examples,practice:lesson.exercises}[tab]):[],[lesson,tab]);
  useEffect(()=>{
    if(tab!=='example'||!lesson)return;
    const example=lesson.examples[Math.min(slide,Math.max(0,lesson.examples.length-1))];
    if(!example)return;
    setExampleResult(null);
    compiler.compile(example.code).then(setExampleResult).catch(()=>setExampleResult(null));
  },[tab,lesson?.id,safeSlide]);
  if(!lesson)return <div className="page empty-state">Урок не найден.</div>;
  const finish=()=>{complete(lesson.id,lesson.title); if(next)navigate(`/lesson/${next.id}`);else navigate('/progress');};
  const activeExample=lesson.examples[safeSlide];
  return <div className="lesson-page" data-theory-steps={lesson.theory.length} data-example-count={lesson.examples.length}>
    <aside className="lesson-sidebar">
      <Link to="/courses" className="lesson-side-brand">LaTeX gym</Link><span className="eyebrow">СОДЕРЖАНИЕ</span>
      {lessons.map(l=><Link key={l.id} to={`/lesson/${l.id}`} className={l.id===lesson.id?'active':''}><span>{String(l.number).padStart(2,'0')}</span>{l.title}</Link>)}
    </aside>
    <div className="lesson-center">
      <header className="lesson-hero">
        <div className="lesson-hero-nav"><Link to="/courses" aria-label="Назад к курсам"><BackIcon/></Link><button className={bookmarked?'bookmark active':'bookmark'} onClick={()=>toggle('lesson',lesson.id)} aria-label={bookmarked?'Удалить урок из закладок':'Добавить урок в закладки'}><BookmarkIcon/></button></div>
        <span className="eyebrow">УРОК {String(lesson.number).padStart(2,'0')}</span><h1>{lesson.title}</h1><p>{lesson.subtitle}</p><div className="hero-rule"><span/></div>
      </header>
      <div className="lesson-tabs" role="tablist" aria-label="Режим урока">
        <button role="tab" aria-selected={tab==='theory'} className={tab==='theory'?'active':''} onClick={()=>{setTab('theory');setSlide(0)}}>1 Теория</button>
        <button role="tab" aria-selected={tab==='example'} className={tab==='example'?'active':''} onClick={()=>{setTab('example');setSlide(0)}}>2 Пример</button>
        <button role="tab" aria-selected={tab==='practice'} className={tab==='practice'?'active':''} onClick={()=>{setTab('practice');setSlide(0)}}>3 Практика</button>
      </div>
      <section className="lesson-content" aria-live="polite">
        {tab==='theory'&&<TheoryBlock block={lesson.theory[safeSlide]}/>} 
        {tab==='example'&&activeExample&&<div className="example-mode"><div><span className="eyebrow">ПРИМЕР {safeSlide+1} ИЗ {lesson.examples.length}</span><h2>{activeExample.title}</h2><p>{activeExample.description}</p><CodeBlock code={activeExample.code}/></div><div className="example-output"><div className="mode-label">РЕЗУЛЬТАТ</div><LatexPreview result={exampleResult}/></div></div>}
        {tab==='practice'&&<div className="lesson-practice-card"><span className="eyebrow">ЗАДАНИЕ {safeSlide+1} ИЗ {lesson.exercises.length}</span><h2>{lesson.exercises[safeSlide].title}</h2><p>{lesson.exercises[safeSlide].instructions}</p><ul>{lesson.exercises[safeSlide].requirements.map(r=><li key={r}>{r}</li>)}</ul><Link className="primary-button" to={`/practice/${lesson.exercises[safeSlide].id}`}>Открыть редактор</Link></div>}
      </section>
      <footer className="lesson-pagination"><button disabled={safeSlide===0} onClick={()=>setSlide(v=>Math.max(0,v-1))} aria-label="Предыдущий слайд"><BackIcon/></button><span>{safeSlide+1} / {slideCount}</span>{safeSlide<slideCount-1?<button onClick={()=>setSlide(v=>v+1)} aria-label="Следующий слайд"><ChevronIcon/></button>:<button className="next-primary" onClick={finish} aria-label="Завершить урок"><ChevronIcon/></button>}</footer>
      <div className="lesson-neighbors">{prev&&<Link to={`/lesson/${prev.id}`}>← {prev.title}</Link>}{next&&<Link to={`/lesson/${next.id}`}>{next.title} →</Link>}</div>
    </div>
    <aside className="lesson-context"><span className="eyebrow">КОНТЕКСТ</span><h3>Связанные команды</h3>{lesson.relatedCommands.map(c=><code key={c}>\{c}</code>)}<p>{lesson.theory.length} смысловых шагов · {lesson.examples.length} примера · {lesson.exercises.length} практических задания.</p></aside>
  </div>;
}
function TheoryBlock({block}:{block:TheoryBlockType}) { return <div className="theory-block"><h2>{block.title}</h2><p>{block.body}</p>{block.code&&<CodeBlock code={block.code}/>} {block.note&&<div className="explanation-note">{block.note}</div>}</div>; }
