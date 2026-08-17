import type { CompileResult, LearningProject } from '../types';
import { nodeInside,parseLatexStructure,type LatexStructure } from './latexStructure';

type ProjectStage=LearningProject['stages'][number];
export type ProjectValidationItem={label:string;ok:boolean;hint:string;blocking:boolean};
export type ProjectValidationResult={ok:boolean;items:ProjectValidationItem[]};
const clean=(source:string)=>source.replace(/(^|[^\\])%.*$/gm,'$1');
const has=(source:string,pattern:RegExp)=>pattern.test(clean(source));
const count=(source:string,pattern:RegExp)=>(clean(source).match(pattern)??[]).length;

export function validateProjectStage(stage:ProjectStage,source:string,compileResult?:CompileResult):ProjectValidationResult{
  const structure=parseLatexStructure(source);const items:ProjectValidationItem[]=[];
  if(structure.documentClass)items.push({label:'Документ компилируется',ok:Boolean(compileResult?.ok),hint:compileResult?'Исправьте первую содержательную ошибку компиляции.':'Сначала запустите компиляцию текущей версии.',blocking:true});
  for(const requirement of stage.requirements)items.push(checkRequirement(requirement,source,structure));
  return {ok:items.filter(item=>item.blocking).every(item=>item.ok),items};
}

function checkRequirement(requirement:string,source:string,structure:LatexStructure):ProjectValidationItem{
  const value=requirement.toLocaleLowerCase('ru-RU');const required=(ok:boolean,hint:string):ProjectValidationItem=>({label:requirement,ok,hint,blocking:true});const quality=(ok:boolean,hint:string):ProjectValidationItem=>({label:requirement,ok,hint,blocking:false});
  const commands=(name:string)=>structure.commands(name);const environments=(name:string)=>structure.environments(name);const sections=structure.byKind('Section');const math=structure.byKind('Math');
  if(value.includes('documentclass article')||value==='article')return required(structure.documentClass?.name==='article','Выберите класс article в documentclass.');
  if(value==='report')return required(structure.documentClass?.name==='report','Выберите класс report.');
  if(value==='beamer')return required(structure.documentClass?.name==='beamer','Выберите класс beamer.');
  if(value.includes('document environment'))return required(environments('document').length>0,'Нужна согласованная пара \\begin{document} / \\end{document}.');
  if(value.includes('три смысловых раздела'))return required(sections.filter(node=>node.name==='section').length>=3,'Создайте не менее трёх section.');
  if(value.includes('section hierarchy'))return required(sections.length>=2&&new Set(sections.map(node=>node.meta?.level)).size>=1,'Создайте содержательную иерархию section.');
  if(value.includes('содержательные названия'))return quality(sections.length>0&&sections.every(node=>meaningfulTitle(node.value??'')),'Избегайте пустых и служебных названий разделов.');
  if(value==='section'||value.includes('chapter/section'))return required(sections.some(node=>['section','chapter'].includes(node.name??'')),'Добавьте структурный section или chapter.');
  if(value==='chapter')return required(commands('chapter').length>0,'Добавьте \\chapter{...}.');
  if(value==='title')return required(commands('title').length>0,'Добавьте \\title{...}.');
  if(value==='author')return required(commands('author').length>0,'Добавьте \\author{...}.');
  if(value==='date')return required(commands('date').length>0,'Добавьте \\date{...}.');
  if(value==='maketitle')return required(commands('maketitle').some(node=>environments('document').some(env=>nodeInside(node,env))),'Добавьте \\maketitle в тело документа.');
  if(value.includes('inline math')||value.includes('math mode'))return required(math.some(node=>node.mathMode==='inline'),'Добавьте корректный встроенный математический фрагмент $...$.');
  if(value.includes('display math'))return required(math.some(node=>node.mathMode==='display'),'Добавьте выключную формулу.');
  if(value==='frac')return required(structure.byKind('Fraction').length>0,'Используйте структурную дробь \\frac{...}{...}.');
  if(value.includes('superscript'))return required(structure.byKind('Superscript').length>0,'Добавьте верхний индекс через ^.');
  if(value==='equation')return required(environments('equation').length>0,'Создайте окружение equation.');
  if(value==='label'||value.includes('устойчивые keys'))return required(structure.byKind('Label').some(node=>Boolean(node.value?.trim())),'Добавьте смысловую метку \\label{...}.');
  if(value==='ref'||value.includes('ref вместо ручных номеров'))return required(structure.byKind('Reference').some(node=>node.name==='ref'),'Используйте \\ref{...} вместо номера, введённого вручную.');
  if(value.includes('без ручного номера')||value.includes('нет жёстких номеров')||value.includes('нет ручной нумерации'))return required(!has(source,/\b(?:Figure|Table|Equation|Section|Рисунок|Таблица|Уравнение|Раздел)\s+\d+\b/i),'Уберите номер, введённый как обычный текст; используйте label/ref.');
  if(value==='tabular')return required(structure.byKind('Table').length>0,'Добавьте окружение tabular.');
  if(value==='&')return required(structure.byKind('Table').some(node=>Number(node.meta?.columns??0)>=2),'Добавьте разделитель столбцов &.');
  if(value==='\\\\')return required(structure.byKind('Table').some(node=>Number(node.meta?.rows??0)>=1),'Добавьте конец строки таблицы \\\\.');
  if(value==='figure'||value.includes('frame environment'))return required(value.includes('frame')?environments('frame').length>0:structure.byKind('Figure').length>0,value.includes('frame')?'Создайте окружение frame.':'Создайте окружение figure.');
  if(value==='includegraphics')return required(commands('includegraphics').length>0,'Добавьте \\includegraphics{...}.');
  if(value==='caption')return required(structure.byKind('Caption').some(node=>Boolean(node.value?.trim())),'Добавьте содержательную \\caption{...}.');
  if(value.includes('caption before label')||value.includes('label после caption'))return required(captionBeforeLabel(structure),'Поместите label после caption, чтобы метка получила номер объекта.');
  if(value.includes('обычный абзац'))return required(structure.byKind('Paragraph').length>0,'Добавьте обычный текстовый абзац.');
  if(value.includes('без \\\\ как абзацев')||value.includes('нет лишних разрывов'))return quality(!manualParagraphBreak(source),'Для смыслового абзаца используйте пустую строку, а не \\\\.');
  if(value.includes('нет ручного выравнивания пробелами'))return quality(!has(source,/\S {3,}\S/),'Не выравнивайте обычный текст сериями пробелов.');
  if(value.includes('семантическая структура'))return required(sections.length>0||structure.byKind('Environment').some(node=>node.name!=='document'),'Используйте структурные команды и окружения вместо визуальных костылей.');
  if(value.includes('автоматическая нумерация'))return required(structure.byKind('Label').length+structure.byKind('Reference').length+structure.byKind('Caption').length+sections.length+environments('equation').length>0,'Опирайтесь на автоматическую структуру и ссылки.');
  for(const packageName of ['graphicx','amsmath','booktabs','biblatex','geometry','fancyhdr'])if(value.includes(packageName))return required(structure.packages.has(packageName),`Подключите ${packageName} в преамбуле.`);
  if(value.includes('addbibresource'))return required(commands('addbibresource').length>0,'Подключите .bib-файл через \\addbibresource.');
  if(value==='cite')return required(structure.byKind('Citation').length>0,'Добавьте цитирование по ключу.');
  if(value.includes('printbibliography'))return required(commands('printbibliography').length>0,'Добавьте \\printbibliography.');
  if(value==='appendix')return required(commands('appendix').length>0,'Добавьте \\appendix вместо ручной буквы приложения.');
  if(value.includes('input/include')||value.includes('main.tex как карта проекта'))return required(commands('input').length+commands('include').length>0,'Главный файл должен собирать смысловые части через \\input или \\include.');
  if(value.includes('единая преамбула'))return quality(commands('documentclass').length<=1,'Оставьте один корневой documentclass и общую преамбулу.');
  if(value.includes('явная единица длины'))return required(has(source,/\d+(?:\.\d+)?\s*(?:mm|cm|in|pt)\b/),'Укажите единицу длины, например 28mm.');
  if(value.includes('pagestyle'))return required(commands('pagestyle').length>0,'Задайте \\pagestyle{...}.');
  if(value.includes('несколько frames'))return required(environments('frame').length>=2,'Создайте как минимум два frame.');
  if(value.includes('объяснение рядом'))return quality(structure.byKind('Paragraph').length>0,'Формула должна сопровождаться текстом, который сообщает её роль.');
  if(value.includes('короткие заголовки'))return quality(frameTitlesAreConcise(environments('frame')),'Сократите заголовки frame до одной ясной мысли.');
  if(value.includes('нет бессмысленных эффектов'))return quality(!['pause','transduration','animate','only','uncover'].some(name=>commands(name).length>0),'Уберите декоративные эффекты, которые не помогают аргументации.');
  if(value.includes('логический порядок'))return quality(environments('frame').length>=1,'Проверьте последовательность: вопрос → метод → результат → вывод.');
  if(value.includes('устойчивые пути'))return quality(!has(source,/\\(?:input|include|includegraphics)\{(?:[A-Za-z]:|\/)/),'Используйте относительные пути внутри проекта.');
  if(value.includes('единый root document'))return quality(commands('documentclass').length<=1,'В проекте должен быть один корневой документ.');
  if(value.includes('воспроизводимая сборка'))return quality(/latexmk/.test(source)||commands('input').length+commands('include').length>0,'Организуйте проект так, чтобы его можно было собрать одной предсказуемой командой.');
  return quality(true,'Этот критерий требует содержательной самопроверки; автоматическая проверка не должна подменять редакторское суждение.');
}

function captionBeforeLabel(structure:LatexStructure){const captions=structure.byKind('Caption');const labels=structure.byKind('Label');return structure.byKind('Figure').some(figure=>captions.some(caption=>nodeInside(caption,figure))&&labels.some(label=>nodeInside(label,figure)&&captions.some(caption=>nodeInside(caption,figure)&&caption.range.start<label.range.start)));}
function meaningfulTitle(title:string){return title.trim().length>=3&&!/^(section|test|todo|раздел)$/i.test(title.trim());}
function frameTitlesAreConcise(frames:ReturnType<LatexStructure['environments']>){return frames.every(frame=>{const title=frame.value?.match(/^\s*\{([^}]*)\}/)?.[1]?.trim()??'';return !title||title.length<=70;});}
function manualParagraphBreak(source:string){let protectedDepth=0;for(const line of clean(source).split('\n')){if(/\\begin\{(?:align\*?|tabular|array|matrix|pmatrix|bmatrix|cases)\}/.test(line))protectedDepth++;if(protectedDepth===0&&/\\\\\s*$/.test(line.trim()))return true;if(/\\end\{(?:align\*?|tabular|array|matrix|pmatrix|bmatrix|cases)\}/.test(line))protectedDepth=Math.max(0,protectedDepth-1);}return false;}
