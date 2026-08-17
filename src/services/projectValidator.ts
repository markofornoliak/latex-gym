import type { CompileResult, LearningProject } from '../types';

type ProjectStage=LearningProject['stages'][number];
export type ProjectValidationItem={label:string;ok:boolean;hint:string;blocking:boolean};
export type ProjectValidationResult={ok:boolean;items:ProjectValidationItem[]};

const clean=(source:string)=>source.replace(/(^|[^\\])%.*$/gm,'$1');
const count=(source:string,pattern:RegExp)=>(clean(source).match(pattern)??[]).length;
const has=(source:string,pattern:RegExp)=>pattern.test(clean(source));
const command=(name:string)=>new RegExp(`\\\\${name}(?=[^A-Za-z@]|$)`);
const environment=(name:string)=>new RegExp(`\\\\begin\\s*\\{${name}\\}[\\s\\S]*?\\\\end\\s*\\{${name}\\}`);
const packagePattern=(name:string)=>new RegExp(`\\\\usepackage(?:\\[[^\\]]*\\])?\\{[^}]*\\b${name}\\b[^}]*\\}`);

export function validateProjectStage(stage:ProjectStage,source:string,compileResult?:CompileResult):ProjectValidationResult{
  const items:ProjectValidationItem[]=[];
  const fullDocument=has(source,/\\documentclass\b/);
  if(fullDocument){
    items.push({
      label:'Документ компилируется',
      ok:Boolean(compileResult?.ok),
      hint:compileResult?'Исправьте первую содержательную ошибку компиляции.':'Сначала запустите компиляцию текущей версии.',
      blocking:true
    });
  }
  for(const requirement of stage.requirements)items.push(checkRequirement(requirement,source));
  return {ok:items.filter(item=>item.blocking).every(item=>item.ok),items};
}

function checkRequirement(requirement:string,source:string):ProjectValidationItem{
  const value=requirement.toLocaleLowerCase('ru-RU');
  const required=(ok:boolean,hint:string):ProjectValidationItem=>({label:requirement,ok,hint,blocking:true});
  const quality=(ok:boolean,hint:string):ProjectValidationItem=>({label:requirement,ok,hint,blocking:false});

  if(value.includes('documentclass article')||value==='article')return required(has(source,/\\documentclass(?:\[[^\]]*\])?\{article\}/),'Выберите класс article в documentclass.');
  if(value==='report')return required(has(source,/\\documentclass(?:\[[^\]]*\])?\{report\}/),'Выберите класс report.');
  if(value==='beamer')return required(has(source,/\\documentclass(?:\[[^\]]*\])?\{beamer\}/),'Выберите класс beamer.');
  if(value.includes('document environment'))return required(has(source,environment('document')),'Нужна согласованная пара \\begin{document} / \\end{document}.');
  if(value.includes('три смысловых раздела'))return required(count(source,/\\section\*?\s*\{/g)>=3,'Создайте не менее трёх section.');
  if(value.includes('section hierarchy'))return required(count(source,/\\section\*?\s*\{/g)>=2,'Создайте содержательную иерархию section.');
  if(value.includes('содержательные названия'))return quality(sectionTitlesAreMeaningful(source),'Избегайте пустых и служебных названий разделов.');
  if(value==='section'||value.includes('chapter/section'))return required(has(source,/\\(?:section|chapter)\*?\s*\{/),'Добавьте структурный section или chapter.');
  if(value==='chapter')return required(has(source,command('chapter')),'Добавьте \\chapter{...}.');
  if(value==='title')return required(has(source,command('title')),'Добавьте \\title{...}.');
  if(value==='author')return required(has(source,command('author')),'Добавьте \\author{...}.');
  if(value==='date')return required(has(source,command('date')),'Добавьте \\date{...}.');
  if(value==='maketitle')return required(has(source,command('maketitle')),'Добавьте \\maketitle в тело документа.');
  if(value.includes('inline math')||value.includes('math mode'))return required(has(source,/(?<!\\)\$[^$\n]+(?<!\\)\$/),'Добавьте корректный встроенный математический фрагмент $...$.');
  if(value.includes('display math'))return required(has(source,/\\\[[\s\S]*?\\\]|\\begin\{equation\*?\}[\s\S]*?\\end\{equation\*?\}/),'Добавьте выключную формулу.');
  if(value==='frac')return required(has(source,command('frac')),'Используйте структурную дробь \\frac{...}{...}.');
  if(value.includes('superscript'))return required(has(source,/\^[{A-Za-z0-9\\]/),'Добавьте верхний индекс через ^.');
  if(value==='equation')return required(has(source,environment('equation')),'Создайте окружение equation.');
  if(value==='label'||value.includes('устойчивые keys'))return required(has(source,/\\label\{[^}]+\}/),'Добавьте смысловую метку \\label{...}.');
  if(value==='ref'||value.includes('ref вместо ручных номеров'))return required(has(source,/\\ref\{[^}]+\}/),'Используйте \\ref{...} вместо номера, введённого вручную.');
  if(value.includes('без ручного номера')||value.includes('нет жёстких номеров')||value.includes('нет ручной нумерации'))return required(!has(source,/\b(?:Figure|Table|Equation|Section|Рисунок|Таблица|Уравнение|Раздел)\s+\d+\b/i),'Уберите номер, введённый как обычный текст; используйте label/ref.');
  if(value==='tabular')return required(has(source,environment('tabular')),'Добавьте окружение tabular.');
  if(value==='&')return required(has(source,/&/),'Добавьте разделитель столбцов &.');
  if(value==='\\\\')return required(has(source,/\\\\/),'Добавьте конец строки таблицы \\\\.');
  if(value==='figure'||value.includes('frame environment'))return required(value.includes('frame')?has(source,environment('frame')):has(source,environment('figure')),value.includes('frame')?'Создайте окружение frame.':'Создайте окружение figure.');
  if(value==='includegraphics')return required(has(source,command('includegraphics')),'Добавьте \\includegraphics{...}.');
  if(value==='caption')return required(has(source,command('caption')),'Добавьте содержательную \\caption{...}.');
  if(value.includes('caption before label'))return required(captionBeforeLabel(source),'Внутри объекта поставьте \\caption перед \\label.');
  if(value.includes('label после caption'))return required(captionBeforeLabel(source),'Поместите label после caption, чтобы метка получила номер объекта.');
  if(value.includes('обычный абзац'))return required(hasProse(source),'Добавьте обычный текстовый абзац.');
  if(value.includes('без \\\\ как абзацев')||value.includes('нет лишних разрывов'))return quality(!manualParagraphBreak(source),'Для смыслового абзаца используйте пустую строку, а не \\\\.');
  if(value.includes('нет ручного выравнивания пробелами'))return quality(!has(source,/\S {3,}\S/),'Не выравнивайте обычный текст сериями пробелов.');
  if(value.includes('семантическая структура'))return required(has(source,/\\(?:section|subsection|chapter|begin)\b/),'Используйте структурные команды и окружения вместо визуальных костылей.');
  if(value.includes('автоматическая нумерация'))return required(has(source,/\\(?:label|ref|caption|section|equation)\b/),'Опирайтесь на автоматическую структуру и ссылки.');
  if(value.includes('graphicx'))return required(has(source,packagePattern('graphicx')),'Подключите graphicx в преамбуле.');
  if(value.includes('amsmath'))return required(has(source,packagePattern('amsmath')),'Подключите amsmath в преамбуле.');
  if(value.includes('booktabs'))return required(has(source,packagePattern('booktabs')),'Подключите booktabs в преамбуле.');
  if(value.includes('biblatex'))return required(has(source,packagePattern('biblatex')),'Подключите biblatex в преамбуле.');
  if(value.includes('addbibresource'))return required(has(source,command('addbibresource')),'Подключите .bib-файл через \\addbibresource.');
  if(value==='cite')return required(has(source,command('cite')),'Добавьте цитирование по ключу.');
  if(value.includes('printbibliography'))return required(has(source,command('printbibliography')),'Добавьте \\printbibliography.');
  if(value==='appendix')return required(has(source,command('appendix')),'Добавьте \\appendix вместо ручной буквы приложения.');
  if(value.includes('input/include'))return required(has(source,/\\(?:input|include)\{[^}]+\}/),'Разделите документ через \\input или \\include.');
  if(value.includes('main.tex как карта проекта'))return required(has(source,/\\(?:input|include)\{[^}]+\}/),'Главный файл должен собирать смысловые части через input/include.');
  if(value.includes('единая преамбула'))return quality(count(source,/\\documentclass\b/g)<=1,'Оставьте один корневой documentclass и общую преамбулу.');
  if(value.includes('geometry'))return required(has(source,packagePattern('geometry')),'Подключите geometry в преамбуле.');
  if(value.includes('явная единица длины'))return required(has(source,/\d+(?:\.\d+)?\s*(?:mm|cm|in|pt)\b/),'Укажите единицу длины, например 28mm.');
  if(value.includes('fancyhdr'))return required(has(source,packagePattern('fancyhdr')),'Подключите fancyhdr.');
  if(value.includes('pagestyle'))return required(has(source,command('pagestyle')),'Задайте \\pagestyle{...}.');
  if(value.includes('несколько frames'))return required(count(source,/\\begin\{frame\}/g)>=2,'Создайте как минимум два frame.');
  if(value.includes('объяснение рядом'))return quality(hasProse(source),'Формула должна сопровождаться текстом, который сообщает её роль.');
  if(value.includes('короткие заголовки'))return quality(frameTitlesAreConcise(source),'Сократите заголовки frame до одной ясной мысли.');
  if(value.includes('нет бессмысленных эффектов'))return quality(!has(source,/\\(?:pause|transduration|animate|only|uncover)\b/),'Уберите декоративные эффекты, которые не помогают аргументации.');
  if(value.includes('логический порядок'))return quality(count(source,/\\begin\{frame\}/g)>=1,'Проверьте последовательность: вопрос → метод → результат → вывод.');
  if(value.includes('устойчивые пути'))return quality(!has(source,/\\(?:input|include|includegraphics)\{(?:[A-Za-z]:|\/)/),'Используйте относительные пути внутри проекта.');
  if(value.includes('единый root document'))return quality(count(source,/\\documentclass\b/g)<=1,'В проекте должен быть один корневой документ.');
  if(value.includes('воспроизводимая сборка'))return quality(has(source,/latexmk|\\(?:input|include)\{/),'Организуйте проект так, чтобы его можно было собрать одной предсказуемой командой.');

  return quality(true,'Этот критерий требует содержательной самопроверки; автоматическая проверка не должна подменять редакторское суждение.');
}

function captionBeforeLabel(source:string){
  const value=clean(source);
  const caption=value.indexOf('\\caption');
  const label=value.indexOf('\\label');
  return caption>=0&&label>caption;
}
function sectionTitlesAreMeaningful(source:string){
  const titles=[...clean(source).matchAll(/\\section\*?\{([^}]*)\}/g)].map(match=>match[1].trim());
  return titles.length>0&&titles.every(title=>title.length>=3&&!/^(section|test|todo|раздел)$/i.test(title));
}
function frameTitlesAreConcise(source:string){
  const titles=[...clean(source).matchAll(/\\begin\{frame\}\{([^}]*)\}/g)].map(match=>match[1].trim());
  return titles.length===0||titles.every(title=>title.length<=70);
}
function hasProse(source:string){
  const body=clean(source).replace(/\\[A-Za-z@]+\*?(?:\[[^\]]*\])?(?:\{[^}]*\})?/g,' ').replace(/[{}$^_&]/g,' ').replace(/\s+/g,' ').trim();
  return /[\p{L}\p{N}]{3,}/u.test(body);
}
function manualParagraphBreak(source:string){
  let protectedDepth=0;
  for(const line of clean(source).split('\n')){
    if(/\\begin\{(?:align\*?|tabular|array|matrix|pmatrix|bmatrix|cases)\}/.test(line))protectedDepth++;
    if(protectedDepth===0&&/\\\\\s*$/.test(line.trim()))return true;
    if(/\\end\{(?:align\*?|tabular|array|matrix|pmatrix|bmatrix|cases)\}/.test(line))protectedDepth=Math.max(0,protectedDepth-1);
  }
  return false;
}
