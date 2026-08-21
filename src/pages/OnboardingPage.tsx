import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wordmark } from '../components/Wordmark';
import { learningRouteLabel } from '../services/learningTracks';
import { assessPlacement } from '../services/placementAssessment';
import { useAppStore, type OnboardingExperience } from '../store/useAppStore';

const goals=[
  ['scientific-papers','Научные статьи'],['mathematics','Математика'],['assignments','Университетские работы'],['thesis','Диссертация / диплом'],['engineering','Инженерные документы'],['presentations','Презентации'],['general','Общее владение LaTeX']
] as const;
const experiences:Array<{id:OnboardingExperience;title:string;detail:string}>=[
  {id:'new',title:'Никогда не работал с LaTeX',detail:'Начнём с модели исходник → компилятор → PDF.'},
  {id:'basic',title:'Знаю базовые команды',detail:'Проверим структуру документа, математику и пакеты.'},
  {id:'regular',title:'Регулярно использую LaTeX',detail:'Сместим диагностику уровня к отладке и рабочим приёмам.'},
  {id:'advanced',title:'Уверенно работаю с LaTeX',detail:'Проверим архитектуру, ссылки и процесс компиляции.'}
];

type PlacementTask={id:string;concept:string;difficulty:number;prompt:string;code?:string;options:Array<{id:string;label:string}>;answer:string;explanation:string};
const tasks:PlacementTask[]=[
  {id:'source-output',concept:'latex-model',difficulty:0,prompt:'Какое изменение относится к исходнику, а не к готовому PDF?',options:[{id:'a',label:'Добавить \\section{Results} в .tex-файл'},{id:'b',label:'Вручную исправить заголовок в PDF'},{id:'c',label:'Перетащить абзац мышкой в PDF'}],answer:'a',explanation:'LaTeX работает от исходника: структуру меняют в .tex и пересобирают документ.'},
  {id:'brace',concept:'brace-balance',difficulty:0,prompt:'Исправьте минимальную синтаксическую ошибку.',code:'\\section{Results',options:[{id:'a',label:'\\section{Results}'},{id:'b',label:'\\section[Results}'},{id:'c',label:'\\section Results'}],answer:'a',explanation:'Обязательный аргумент section должен быть закрыт фигурной скобкой.'},
  {id:'document-env',concept:'document-environment',difficulty:0,prompt:'Как корректно завершить документ?',code:'\\begin{document}\nText',options:[{id:'a',label:'\\stop{document}'},{id:'b',label:'\\end{document}'},{id:'c',label:'\\end'}],answer:'b',explanation:'Имя в end должно совпадать с begin.'},
  {id:'inline-math',concept:'inline-math',difficulty:1,prompt:'Как оставить формулу частью строки текста?',code:'Energy is ... in this model.',options:[{id:'a',label:'Energy is $E=mc^2$ in this model.'},{id:'b',label:'Energy is \\[E=mc^2\\] in this model.'},{id:'c',label:'Energy is E=mc^2 in this model.'}],answer:'a',explanation:'$...$ задаёт строчный математический режим; \\[...\\] создаёт отдельную выключную формулу.'},
  {id:'semantic-heading',concept:'section',difficulty:1,prompt:'Как выразить смысл «это раздел Results»?',options:[{id:'a',label:'\\textbf{RESULTS}'},{id:'b',label:'\\section{Results}'},{id:'c',label:'\\Large Results'}],answer:'b',explanation:'section сообщает LaTeX семантическую роль, а не имитирует внешний вид заголовка.'},
  {id:'graphicx',concept:'package-model',difficulty:2,prompt:'Компилятор сообщает Undefined control sequence для \\includegraphics. Что проверить первым?',code:'\\includegraphics{plot.pdf}',options:[{id:'a',label:'Подключён ли graphicx в преамбуле'},{id:'b',label:'Добавить больше пробелов перед командой'},{id:'c',label:'Переименовать PDF в TXT'}],answer:'a',explanation:'includegraphics определяется пакетом graphicx; это зависимость документа.'},
  {id:'reference',concept:'ref',difficulty:2,prompt:'Как сделать номер рисунка устойчивым к перестановке объектов?',options:[{id:'a',label:'Написать вручную “Figure 3”'},{id:'b',label:'Использовать \\label{fig:result} и \\ref{fig:result}'},{id:'c',label:'Зафиксировать рисунок на третьей странице'}],answer:'b',explanation:'label/ref связывают смысловой ключ с автоматически вычисляемым номером.'},
  {id:'align',concept:'align',difficulty:2,prompt:'Что означает & внутри align?',code:'\\begin{align}\na &= b+c \\\\\nd &= e+f\n\\end{align}',options:[{id:'a',label:'Комментарий'},{id:'b',label:'Точка выравнивания'},{id:'c',label:'Конец документа'}],answer:'b',explanation:'& отмечает логическую позицию, по которой align согласует строки.'},
  {id:'first-error',concept:'debugging',difficulty:3,prompt:'В длинном журнале TeX появилось десять ошибок. Какой профессиональный первый шаг?',options:[{id:'a',label:'Начать исправлять последнюю ошибку'},{id:'b',label:'Найти первое содержательное сообщение и исправить первопричину'},{id:'c',label:'Удалить весь проблемный раздел'}],answer:'b',explanation:'Последующие сообщения часто каскадные; сначала устраняют первую содержательную причину.'},
  {id:'bibliography',concept:'biber',difficulty:3,prompt:'Документ использует biblatex с backend=biber. Почему одного запуска LaTeX часто недостаточно?',options:[{id:'a',label:'Biber — отдельный этап сборки, после которого LaTeX запускают снова'},{id:'b',label:'PDF нельзя создавать вместе с библиографией'},{id:'c',label:'biblatex работает только без компилятора'}],answer:'a',explanation:'Библиография и перекрёстные ссылки могут требовать нескольких согласованных проходов.'},
  {id:'architecture',concept:'project-architecture',difficulty:3,prompt:'Какой вариант лучше масштабируется для большой научной работы?',options:[{id:'a',label:'Один main.tex на десятки тысяч строк без структуры'},{id:'b',label:'main.tex + sections/ + figures/ + references.bib + macros.tex'},{id:'c',label:'Отдельный несвязанный .tex для каждой страницы'}],answer:'b',explanation:'Предсказуемые роли файлов облегчают сборку, навигацию и воспроизводимость.'}
];

export function OnboardingPage() {
  const navigate=useNavigate();
  const completeOnboarding=useAppStore(state=>state.completeOnboarding);
  const [step,setStep]=useState<1|2|3>(1);
  const [selectedGoals,setSelectedGoals]=useState<string[]>([]);
  const [experience,setExperience]=useState<OnboardingExperience|null>(null);
  const [ability,setAbility]=useState(0);
  const [answers,setAnswers]=useState<Array<{task:PlacementTask;correct:boolean}>>([]);
  const [feedback,setFeedback]=useState<{correct:boolean;explanation:string}|null>(null);
  const [finished,setFinished]=useState(false);
  const [recommendedLessonTitle,setRecommendedLessonTitle]=useState<string|null>(null);

  const currentTask=useMemo(()=>chooseTask(tasks,answers.map(answer=>answer.task.id),ability),[answers,ability]);
  const score=answers.filter(answer=>answer.correct).length;
  const assessment=useMemo(()=>assessPlacement(answers.map(answer=>({concept:answer.task.concept,difficulty:answer.task.difficulty,correct:answer.correct})),experience),[answers,experience]);
  const recommendation=assessment.recommendedLessonId;
  const recommendedTrack=learningRouteLabel(selectedGoals,experience);

  useEffect(()=>{
    if(!finished){setRecommendedLessonTitle(null);return;}
    let active=true;
    void import('../data/runtimeCatalog').then(module=>{if(active)setRecommendedLessonTitle(module.getRuntimeLesson(recommendation)?.title??'Основы LaTeX');}).catch(()=>{if(active)setRecommendedLessonTitle('Основы LaTeX');});
    return()=>{active=false;};
  },[finished,recommendation]);

  const toggleGoal=(id:string)=>setSelectedGoals(current=>current.includes(id)?current.filter(goal=>goal!==id):[...current,id]);
  const continueFromGoals=()=>{if(selectedGoals.length)setStep(2);};
  const continueFromExperience=()=>{if(!experience)return;setAbility(experienceAbility(experience));setStep(3);};
  const answerTask=(choice:string)=>{
    if(!currentTask||feedback)return;
    const correct=choice===currentTask.answer;
    const nextAnswers=[...answers,{task:currentTask,correct}];
    setAnswers(nextAnswers);setFeedback({correct,explanation:currentTask.explanation});
    setAbility(value=>Math.max(0,Math.min(3,value+(correct?.55:-.55))));
  };
  const nextPlacement=()=>{
    setFeedback(null);
    if(answers.length>=6)setFinished(true);
  };
  const finish=()=>{
    const placementEvidence=Object.fromEntries(answers.map(answer=>[answer.task.concept,answer.correct]));
    completeOnboarding({goals:selectedGoals,experience,placementScore:score,placementTotal:answers.length,placementEvidence,recommendedLessonId:recommendation});
    navigate('/home');
  };

  return <div className="onboarding-page onboarding-flow">
    <div className="onboarding-shell">
      <header className="onboarding-flow-header"><Wordmark/><div className="onboarding-stepper" aria-label={`Этап ${step} из 3`}><span className={step>=1?'active':''}/><span className={step>=2?'active':''}/><span className={step>=3?'active':''}/></div><small>{step} / 3</small></header>

      {step===1&&<main className="onboarding-stage"><span className="eyebrow">ЦЕЛЬ</span><h1>Что вы хотите уметь создавать?</h1><p className="onboarding-lead">Можно выбрать несколько направлений. Это влияет на последующие рекомендации, но не ограничивает курс.</p><div className="goal-grid">{goals.map(([id,label])=><button key={id} type="button" className={selectedGoals.includes(id)?'selected':''} aria-pressed={selectedGoals.includes(id)} onClick={()=>toggleGoal(id)}><span>{selectedGoals.includes(id)?'✓':'+'}</span>{label}</button>)}</div><div className="onboarding-actions"><button className="primary-button primary-button--large" disabled={!selectedGoals.length} onClick={continueFromGoals}>Продолжить</button></div></main>}

      {step===2&&<main className="onboarding-stage"><span className="eyebrow">ОПЫТ</span><h1>Как сейчас ощущается LaTeX?</h1><p className="onboarding-lead">Самооценка задаёт только стартовую сложность диагностики. Результат определяется выполненными задачами.</p><div className="experience-list" role="radiogroup" aria-label="Опыт работы с LaTeX">{experiences.map(option=><button key={option.id} role="radio" aria-checked={experience===option.id} className={experience===option.id?'selected':''} onClick={()=>setExperience(option.id)}><span className="experience-radio"/><span><strong>{option.title}</strong><small>{option.detail}</small></span></button>)}</div><div className="onboarding-actions onboarding-actions--split"><button className="secondary-button" onClick={()=>setStep(1)}>Назад</button><button className="primary-button" disabled={!experience} onClick={continueFromExperience}>К диагностике</button></div></main>}

      {step===3&&!finished&&currentTask&&<main className="onboarding-stage placement-stage"><div className="placement-heading"><span className="eyebrow">ДИАГНОСТИКА УРОВНЯ · {Math.min(answers.length+1,6)} ИЗ 6</span><span>Адаптивная сложность</span></div><h1>{currentTask.prompt}</h1>{currentTask.code&&<pre className="placement-code"><code>{currentTask.code}</code></pre>}<div className="placement-options">{currentTask.options.map(option=><button type="button" key={option.id} onClick={()=>answerTask(option.id)} disabled={Boolean(feedback)}>{option.label}</button>)}</div>{feedback&&<div className={`placement-feedback ${feedback.correct?'correct':'incorrect'}`} role="status"><strong>{feedback.correct?'Верно':'Не совсем'}</strong><p>{feedback.explanation}</p><button className="primary-button" onClick={nextPlacement}>{answers.length>=6?'Результат':'Следующая задача'}</button></div>}<p className="placement-note">Здесь нет вопросов на запоминание названий. Мы проверяем, как вы читаете, исправляете и структурируете LaTeX.</p></main>}

      {step===3&&finished&&<main className="onboarding-stage placement-result"><span className="eyebrow">ДИАГНОСТИКА ЗАВЕРШЕНА</span><h1>{score} / {answers.length}</h1><p className="onboarding-lead">Стартовая точка выбрана по выполненным микрозаданиям с учётом сложности реально заданных вопросов. Диагностика создаёт начальную оценку уверенности, но не объявляет концепты «освоенными».</p><dl><div><dt>Рекомендуемый старт</dt><dd>{recommendedLessonTitle??'Основы LaTeX'}</dd></div><div><dt>Маршрут</dt><dd>{recommendedTrack}</dd></div><div><dt>Первый принцип</dt><dd>Структура → компиляция → диагностика → исправление</dd></div></dl><button className="primary-button primary-button--large" onClick={finish}>Перейти к тренировке</button><button className="text-tool placement-retry" onClick={()=>{setAnswers([]);setFeedback(null);setFinished(false);setAbility(experience?experienceAbility(experience):0);}}>Пройти диагностику ещё раз</button></main>}
    </div>
  </div>;
}

function chooseTask(pool:PlacementTask[],used:string[],ability:number){
  const remaining=pool.filter(task=>!used.includes(task.id));
  return remaining.sort((left,right)=>Math.abs(left.difficulty-ability)-Math.abs(right.difficulty-ability)||left.difficulty-right.difficulty)[0];
}
function experienceAbility(experience:OnboardingExperience){if(experience==='advanced')return 3;if(experience==='regular')return 2;if(experience==='basic')return 1;return 0;}
