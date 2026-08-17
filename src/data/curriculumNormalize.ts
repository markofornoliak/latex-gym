import { conceptById } from './concepts';
import { exercises, lessons } from './courses';
import type { LearningBlock } from '../types';

const aliases:Record<string,string>={
  documentclass:'document-class','document-class':'document-class',document:'document-environment',environment:'environment',preamble:'preamble',package:'package-model',packages:'package-model',usepackage:'usepackage',
  section:'section',subsection:'section',paragraph:'paragraph',text:'paragraph',emph:'emphasis',textbf:'emphasis',lists:'list',itemize:'list',enumerate:'list',item:'list',description:'list','nested-list':'list',
  math:'math-mode','math-mode':'math-mode','inline-math':'inline-math','display-math':'display-math',frac:'fraction',fraction:'fraction',sqrt:'root',powers:'superscript',superscript:'superscript',subscript:'subscript',
  equation:'equation',align:'align',split:'align',matrix:'matrix',pmatrix:'matrix',cases:'cases',piecewise:'cases',operators:'math-operator',operator:'math-operator',theorem:'theorem',newtheorem:'theorem',lemma:'theorem',proof:'proof','shared-counter':'counter',
  table:'tabular',tabular:'tabular',ampersand:'table-cell-separator',multicolumn:'professional-table',tabularx:'professional-table',booktabs:'professional-table',figure:'figure',includegraphics:'figure',draw:'figure',node:'figure',caption:'caption',float:'float',placement:'float',floatbarrier:'float',label:'label',ref:'ref',
  bibliography:'bibliography-model',bibitem:'bibliography-model',biblatex:'bibliography-model',printbibliography:'bibliography-model',biber:'biber',cite:'citation',citation:'citation',parencite:'citation',index:'index',glossary:'index',acronym:'index',gls:'index',term:'index',navigation:'index',
  newcommand:'custom-command','custom-command':'custom-command',arguments:'required-argument',include:'multi-file',input:'multi-file','large-documents':'project-architecture',architecture:'project-architecture',debug:'debugging',debugging:'debugging',braces:'brace-balance',latexmk:'latexmk',build:'latexmk',watch:'latexmk',cleanup:'latexmk',workflow:'professional-workflow',
  geometry:'page-structure',layout:'page-structure',twoside:'page-structure',microtype:'spacing',typography:'spacing','nonbreaking-space':'spacing',tikz:'figure',beamer:'document-class',frame:'document-class',block:'document-class',overlay:'document-class',pause:'document-class',report:'document-class',book:'document-class',title:'document-class',author:'document-class',abstract:'section','paper-structure':'project-architecture',
  fontspec:'professional-workflow',font:'professional-workflow',mono:'professional-workflow',engine:'professional-workflow',migration:'professional-workflow',xelatex:'professional-workflow',lualatex:'professional-workflow',pdf:'professional-workflow',metadata:'professional-workflow',accessibility:'professional-workflow',
  color:'package-model',xcolor:'package-model',definecolor:'package-model',textcolor:'package-model',href:'package-model',hyperref:'package-model',semantics:'emphasis'
};

/**
 * Legacy exercises used `concepts` partly as free-form tags. Only identifiers
 * that resolve to the canonical graph remain mastery-bearing concepts. The
 * rejected values are retained here for audits instead of silently becoming
 * fake graph nodes.
 */
export const legacyExerciseTags=new Map<string,string[]>();

for(const exercise of exercises){
  const resolved:string[]=[];
  const tags:string[]=[];
  for(const value of exercise.concepts){
    const concept=canonical(value);
    if(concept)resolved.push(concept);else tags.push(normalize(value));
  }
  exercise.concepts=unique(resolved);
  if(tags.length)legacyExerciseTags.set(exercise.id,unique(tags));
}

for(const lesson of lessons){
  if(!lesson.content&&lesson.theory.length){
    lesson.content=lesson.theory.map((item,index):LearningBlock=>{
      if(item.code)return {id:`${lesson.id}-structured-${index+1}`,type:'syntax',title:item.title,body:item.body,code:item.code,note:item.note};
      return {id:`${lesson.id}-structured-${index+1}`,type:index===0?'concept':'explanation',title:item.title,body:item.body,details:item.note};
    });
  }
  applyPedagogyRepairs(lesson);
  const pedagogy=lesson.pedagogy;
  if(!pedagogy)continue;
  pedagogy.introduces=unique(pedagogy.introduces.map(canonical).filter(Boolean));
  const exerciseConcepts=unique(lesson.exercises.flatMap(exercise=>exercise.concepts).map(canonical).filter(Boolean));
  pedagogy.reinforces=unique([...pedagogy.reinforces.map(canonical),...exerciseConcepts.filter(id=>!pedagogy.introduces.includes(id))].filter(Boolean));
  if(pedagogy.prerequisites.length===0&&pedagogy.introduces.length){
    const required=pedagogy.introduces.flatMap(id=>conceptById.get(id)?.prerequisites??[]).filter(id=>!pedagogy.introduces.includes(id));
    pedagogy.prerequisites=unique(required);
  }else{
    pedagogy.prerequisites=unique(pedagogy.prerequisites.map(canonical).filter(Boolean));
  }
}

function applyPedagogyRepairs(lesson:(typeof lessons)[number]){
  if(!lesson.pedagogy)return;
  if(lesson.id==='text-formatting'){
    lesson.pedagogy.introduces=unique([...lesson.pedagogy.introduces,'special-symbols','escaping']);
    appendBlock(lesson,{id:'text-formatting-special-symbols',type:'syntax',title:'Символ может быть синтаксисом',body:'В исходнике некоторые знаки имеют служебную роль. Например, $ переключает математический режим, % начинает комментарий, а & участвует в структурном выравнивании. Если нужен сам печатный знак, его нельзя во всех случаях вводить как обычную букву.',code:'\\%  \\&  \\#  \\_  \\{  \\}',note:'Сначала спрашивайте, какую роль символ играет в текущем контексте; затем решайте, нужен ли он как синтаксис или как печатный знак.'});
  }
  if(lesson.id==='equations-theorems'){
    lesson.pedagogy.introduces=unique([...lesson.pedagogy.introduces,'line-break-math','alignment-point']);
    appendBlock(lesson,{id:'equations-theorems-align-anatomy',type:'anatomy',title:'Две роли внутри align',body:'Многострочная формула имеет собственную структуру: & задаёт общую точку выравнивания, а \\\\ завершает математическую строку.',source:'x &= a+b \\\\\ny &= c+d',parts:[{token:'&',label:'точка выравнивания',description:'Одинаковая логическая позиция в связанных строках.'},{token:'\\\\',label:'конец строки',description:'Завершает одну строку многострочного математического окружения.'}]});
  }
  if(lesson.id==='math-operators'){
    lesson.pedagogy.introduces=unique([...lesson.pedagogy.introduces,'math-symbols']);
    appendBlock(lesson,{id:'math-operators-symbol-semantics',type:'comparison',title:'Имя символа и математическая роль',body:'В математическом режиме LaTeX отличает обычные буквы от математических команд. Команда сообщает роль символа или оператора и позволяет движку применить правильное начертание и интервалы.',left:{label:'Буквы',code:'$sin x$',note:'Три переменные s, i, n.'},right:{label:'Оператор',code:'$\\sin x$',note:'Один математический оператор с правильной типографикой.'}});
  }
  if(lesson.id==='debug-missing-brace'){
    appendBlock(lesson,{id:'debug-missing-brace-cascade',type:'comparison',title:'Одна причина — несколько сообщений',body:'TeX читает поток последовательно. Если закрывающая } потеряна, движок продолжает захватывать следующий текст в аргумент и может сообщить о нескольких проблемах далеко от места, где ошибка возникла.',left:{label:'Исходная ошибка',code:'\\section{Method\nText after the heading.\n\\textbf{Result}',note:'Первое содержательное сообщение указывает на незавершённый аргумент. Более поздние Missing }, Runaway argument или Emergency stop могут быть следствием той же причины.'},right:{label:'После первой правки',code:'\\section{Method}\nText after the heading.\n\\textbf{Result}',note:'После восстановления одной границы группы вторичные сообщения исчезают. Поэтому сначала исправляют самую раннюю содержательную ошибку, а затем компилируют заново.'}});
    appendBlock(lesson,{id:'debug-missing-brace-checkpoint',type:'checkpoint',title:'Как читать каскад',prompt:'Компилятор показывает пять ошибок. После исправления самой ранней содержательной ошибки четыре исчезли. Нужно ли отдельно «чинить» оставшиеся четыре старых сообщения?',answer:'Нет. Диагностика относится к предыдущему запуску. Сначала пересоберите документ и работайте только с теми сообщениями, которые остаются после первой правки.'});
  }
}

function appendBlock(lesson:(typeof lessons)[number],block:LearningBlock){
  if(!lesson.content)lesson.content=[];
  if(!lesson.content.some(item=>item.id===block.id))lesson.content.push(block);
}

function canonical(value:string){
  const normalized=normalize(value);
  if(conceptById.has(normalized))return normalized;
  const alias=aliases[normalized];
  if(alias&&conceptById.has(alias))return alias;
  if(/^(amsmath|amsthm|graphicx|enumitem|booktabs|geometry|microtype|hyperref|biblatex|fancyhdr)$/.test(normalized))return 'package-model';
  return '';
}
function normalize(value:string){return value.trim().toLocaleLowerCase('en').replace(/_/g,'-');}
function unique<T>(values:T[]){return [...new Set(values)];}
