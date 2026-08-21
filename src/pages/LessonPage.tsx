import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AccessibleTabs } from '../components/AccessibleTabs';
import { BackIcon, BookmarkIcon, ChevronIcon } from '../components/Icons';
import { CodeBlock } from '../components/CodeBlock';
import { LatexPreview } from '../components/LatexPreview';
import { LearningBlockView } from '../components/LearningBlockView';
import { curriculum } from '../data/curriculumRuntime';
import { compiler } from '../services/compiler';
import { useAppStore } from '../store/useAppStore';
import type { CompileResult, TheoryBlock as TheoryBlockType } from '../types';

type Tab='theory'|'example'|'practice';
const {lessons}=curriculum;
const lessonTabs=[
  {id:'theory' as const,label:'1 Теория',tabId:'lesson-tab-theory',panelId:'lesson-panel'},
  {id:'example' as const,label:'2 Пример',tabId:'lesson-tab-example',panelId:'lesson-panel'},
  {id:'practice' as const,label:'3 Практика',tabId:'lesson-tab-practice',panelId:'lesson-panel'}
];

export function LessonPage(){
  const {lessonId}=useParams();
  const lesson=lessonId?curriculum.lessonById[lessonId]:undefined;
  const navigate=useNavigate();
  const [tab,setTab]=useState<Tab>('theory');
  const [slide,setSlide]=useState(0);
  const [exampleResult,setExampleResult]=useState<CompileResult|null>(null);
  const bookmarks=useAppStore(state=>state.bookmarks);
  const toggle=useAppStore(state=>state.toggleBookmark);
  const complete=useAppStore(state=>state.completeLesson);
  const setCurrent=useAppStore(state=>state.setCurrentLesson);
  const bookmarked=lesson?bookmarks.some(item=>item.id===`lesson:${lesson.id}`):false;

  useEffect(()=>{
    if(!lesson)return;
    setCurrent(lesson.id);
    setTab('theory');
    setSlide(0);
  },[lesson?.id,setCurrent]);

  const index=lesson?curriculum.lessonPositionById[lesson.id]??0:0;
  const prev=lessons[index-1];
  const next=lessons[index+1];
  const theoryCount=lesson?.content?.length??lesson?.theory.length??1;
  const slideCount=tab==='theory'?theoryCount:tab==='example'?lesson?.examples.length??1:lesson?.exercises.length??1;
  const safeSlide=Math.min(slide,Math.max(0,slideCount-1));

  useEffect(()=>{
    if(tab!=='example'||!lesson)return;
    const example=lesson.examples[Math.min(safeSlide,Math.max(0,lesson.examples.length-1))];
    if(!example)return;
    let live=true;
    setExampleResult(null);
    compiler.compile(example.code).then(result=>{if(live)setExampleResult(result);}).catch(()=>{if(live)setExampleResult(null);});
    return()=>{live=false;};
  },[tab,lesson?.id,safeSlide]);

  if(!lesson)return <div className="page empty-state">Урок не найден.</div>;

  const activeExample=lesson.examples[safeSlide];
  const activeExercise=lesson.exercises[safeSlide];
  const activeLearningBlock=lesson.content?.[safeSlide];
  const activeTheory=lesson.theory[safeSlide];
  const finish=()=>{
    complete(lesson.id,lesson.title);
    if(next)navigate(`/lesson/${next.id}`);
    else navigate('/progress');
  };
  const changeTab=(nextTab:Tab)=>{setTab(nextTab);setSlide(0);};

  return <div className="lesson-page" data-theory-steps={theoryCount} data-example-count={lesson.examples.length}>
    <aside className="lesson-sidebar" aria-label="Содержание курса">
      <Link to="/courses" className="lesson-side-brand">LaTeX gym</Link>
      <span className="eyebrow">СОДЕРЖАНИЕ</span>
      {lessons.map(item=><Link key={item.id} title={item.title} to={`/lesson/${item.id}`} className={item.id===lesson.id?'active':''}><span>{String(item.number).padStart(2,'0')}</span>{item.title}</Link>)}
    </aside>

    <div className="lesson-center">
      <header className="lesson-hero">
        <div className="lesson-hero-nav">
          <Link to="/courses" aria-label="Назад к курсам"><BackIcon/></Link>
          <button className={bookmarked?'bookmark active':'bookmark'} onClick={()=>toggle('lesson',lesson.id)} aria-label={bookmarked?'Удалить урок из закладок':'Добавить урок в закладки'}><BookmarkIcon/></button>
        </div>
        <span className="eyebrow">УРОК {String(lesson.number).padStart(2,'0')}</span>
        <h1>{lesson.title}</h1>
        <p>{lesson.subtitle}</p>
        <div className="hero-rule"><span/></div>
      </header>

      <AccessibleTabs className="lesson-tabs" label="Режим урока" options={lessonTabs} active={tab} onChange={changeTab}/>

      <section id="lesson-panel" role="tabpanel" aria-labelledby={`lesson-tab-${tab}`} className="lesson-content" aria-live="polite">
        {tab==='theory'&&activeLearningBlock&&<LearningBlockView block={activeLearningBlock}/>} 
        {tab==='theory'&&!activeLearningBlock&&activeTheory&&<TheoryBlock block={activeTheory}/>} 
        {tab==='example'&&activeExample&&<div className="example-mode"><div><span className="eyebrow">ПРИМЕР {safeSlide+1} ИЗ {lesson.examples.length}</span><h2>{activeExample.title}</h2><p>{activeExample.description}</p><CodeBlock code={activeExample.code}/></div><div className="example-output"><div className="mode-label">РЕЗУЛЬТАТ</div><LatexPreview result={exampleResult}/></div></div>}
        {tab==='practice'&&activeExercise&&<div className="lesson-practice-card"><span className="eyebrow">ЗАДАНИЕ {safeSlide+1} ИЗ {lesson.exercises.length}</span><h2>{activeExercise.title}</h2><p>{activeExercise.instructions}</p><ul>{activeExercise.requirements.map(requirement=><li key={requirement}>{requirement}</li>)}</ul><Link className="primary-button" to={`/practice/${activeExercise.id}`}>Открыть редактор</Link></div>}
      </section>

      <footer className="lesson-pagination">
        <button disabled={safeSlide===0} onClick={()=>setSlide(value=>Math.max(0,value-1))} aria-label="Предыдущий шаг"><BackIcon/></button>
        <span>{safeSlide+1} / {slideCount}</span>
        {safeSlide<slideCount-1?<button onClick={()=>setSlide(value=>value+1)} aria-label="Следующий шаг"><ChevronIcon/></button>:<button className="next-primary" onClick={finish} aria-label="Завершить урок"><ChevronIcon/></button>}
      </footer>
      <div className="lesson-neighbors">{prev&&<Link to={`/lesson/${prev.id}`}>← {prev.title}</Link>}{next&&<Link to={`/lesson/${next.id}`}>{next.title} →</Link>}</div>
    </div>

    <aside className="lesson-context">
      <span className="eyebrow">КОНТЕКСТ</span>
      {lesson.pedagogy&&<><h3>Цель</h3><p>{lesson.pedagogy.objective}</p>{lesson.pedagogy.introduces.length>0&&<><h3>Новые понятия</h3><div className="context-concepts">{lesson.pedagogy.introduces.map(id=><span key={id}>{curriculum.conceptById[id]?.title??id}</span>)}</div></>}</>}
      {lesson.relatedCommands.length>0&&<><h3>Команды</h3>{lesson.relatedCommands.map(commandName=><code key={commandName}>\{commandName}</code>)}</>}
      <p className="context-count">{theoryCount} шагов · {lesson.examples.length} прим. · {lesson.exercises.length} задач</p>
    </aside>
  </div>;
}

function TheoryBlock({block}:{block:TheoryBlockType}){
  return <div className="theory-block"><h2>{block.title}</h2><p>{block.body}</p>{block.code&&<CodeBlock code={block.code}/>} {block.note&&<div className="explanation-note">{block.note}</div>}</div>;
}
