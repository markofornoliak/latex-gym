import { exercises, lessonIndex, lessons, modules } from './courses';
import type { CourseModule, Difficulty, Exercise, LearningBlock, Lesson, LessonPedagogy, PracticeCategory, ValidatorRule } from '../types';

const DOC=(body:string,preamble='')=>`\\documentclass{article}\n${preamble}${preamble?'\n':''}\\begin{document}\n${body}\n\\end{document}`;
const has=(value:string,message:string,hint:string):ValidatorRule=>({type:'containsText',value,message,hint});
const cmd=(value:string,message:string,hint:string):ValidatorRule=>({type:'command',value,message,hint});
const env=(value:string,message:string,hint:string):ValidatorRule=>({type:'environment',value,message,hint});
const pkg=(value:string,message:string,hint:string):ValidatorRule=>({type:'package',value,message,hint});
const balanced:ValidatorRule={type:'balancedEnvironments',message:'Окружения согласованы.',hint:'Каждому \\begin{name} нужен \\end{name} с тем же именем.'};
const compiles:ValidatorRule={type:'compiles',message:'Исходник компилируется.',hint:'Исправьте первую структурную ошибку и повторите компиляцию.'};

const concept=(id:string,title:string,body:string,details?:string):LearningBlock=>({id,type:'concept',title,body,details});
const explanation=(id:string,title:string,body:string,details?:string):LearningBlock=>({id,type:'explanation',title,body,details});
const syntax=(id:string,title:string,body:string,code:string,note?:string):LearningBlock=>({id,type:'syntax',title,body,code,note});
const anatomy=(id:string,title:string,source:string,parts:Array<{token:string;label:string;description:string}>,body?:string):LearningBlock=>({id,type:'anatomy',title,source,parts,body});
const flow=(id:string,title:string,steps:Array<{label:string;detail:string}>,body?:string):LearningBlock=>({id,type:'flow',title,steps,body});
const mistake=(id:string,title:string,body:string,code?:string,correction?:string):LearningBlock=>({id,type:'mistake',title,body,code,correction});
const checkpoint=(id:string,title:string,prompt:string,answer:string,code?:string):LearningBlock=>({id,type:'checkpoint',title,prompt,answer,code});
const sourceOutput=(id:string,title:string,body:string,code:string):LearningBlock=>({id,type:'source-output',title,body,code});
const comparison=(id:string,title:string,left:{label:string;code:string;note:string},right:{label:string;code:string;note:string},body?:string):LearningBlock=>({id,type:'comparison',title,left,right,body});

type TaskSpec={title:string;instructions:string;requirements:string[];starter:string;solution:string;validators:ValidatorRule[];mode:Exercise['mode']};
type LessonSpec={
  id:string;moduleId:string;moduleTitle:string;moduleDescription:string;title:string;subtitle:string;difficulty:Difficulty;category:PracticeCategory;
  objective:string;prerequisites:string[];introduces:string[];reinforces?:string[];misconceptions:string[];practiceObjective:string;mastery:string[];
  commands:string[];content:LearningBlock[];examples:Array<{title:string;description:string;code:string}>;practice:TaskSpec[];projectStage?:string;
};
const task=(title:string,instructions:string,requirements:string[],starter:string,solution:string,validators:ValidatorRule[],mode:Exercise['mode']):TaskSpec=>({title,instructions,requirements,starter,solution,validators,mode});

const foundation:LessonSpec[]=[
  {
    id:'what-is-latex',moduleId:'foundation',moduleTitle:'Основа',moduleDescription:'Ментальная модель до синтаксиса.',title:'Что такое LaTeX',subtitle:'Документ описывают, а не рисуют вручную.',difficulty:'Начальный',category:'Основы',
    objective:'Понять LaTeX как систему подготовки документов, где автор задаёт структуру и смысл.',prerequisites:[],introduces:['latex-model'],misconceptions:['LaTeX — не WYSIWYG-редактор.','Исходник и итоговый документ — разные представления.'],practiceObjective:'Различать исходник, систему набора и результат.',mastery:['Объясняет роль исходника.','Объясняет, почему внешний вид определяется правилами документа.'],commands:[],
    content:[
      concept('latex-model-idea','Идея','В LaTeX автор сообщает, что является разделом, формулой, таблицей или ссылкой. Система набора решает, как эти роли должны выглядеть на странице.'),
      flow('latex-model-flow','Главная модель',[{label:'Исходник',detail:'Текст и структурные инструкции.'},{label:'LaTeX',detail:'Читает инструкции и выполняет набор.'},{label:'Документ',detail:'Получившийся PDF или другой формат.'}],'У документа есть три разные стадии.'),
      comparison('latex-model-compare','Два способа мышления',{label:'Визуальный редактор',code:'Сделать строку крупнее и жирнее',note:'Автор напрямую меняет внешний вид.'},{label:'LaTeX',code:'Обозначить строку как раздел',note:'Автор задаёт роль; оформление применяет система.'},'Разница не в кнопках интерфейса, а в том, что сообщает автор.'),
      checkpoint('latex-model-check','Проверка','Кто отвечает за точный внешний вид заголовка: каждая строка исходника или правила документа?','Правила документа. Автор указывает смысловую роль — например, «раздел».')
    ],
    examples:[{title:'Структура вместо оформления',description:'Команда сообщает роль, а не размер шрифта.',code:'\\section{Methodology}'}],
    practice:[
      task('Исходник','Оставьте имя файла, который читает LaTeX.',['source.tex'],'PDF / source.tex / compiler','source.tex',[has('source.tex','Выбран исходный файл.','Исходник обычно имеет расширение .tex.')],'Объяснить'),
      task('Обработчик','Оставьте компонент, который преобразует source в document.',['compiler'],'source / compiler / PDF','compiler',[has('compiler','Выбран компилятор.','Это промежуточный этап между source и PDF.')],'Объяснить'),
      task('Цепочка','Запишите стадии в правильном порядке.',['source.tex → compiler → document.pdf'],'document.pdf → source.tex → compiler','source.tex → compiler → document.pdf',[has('source.tex → compiler → document.pdf','Цепочка построена правильно.','Сначала source, затем compiler, затем document.')],'Архитектура')
    ]
  },
  {
    id:'compilation-model',moduleId:'foundation',moduleTitle:'Основа',moduleDescription:'Ментальная модель до синтаксиса.',title:'Как работает компиляция',subtitle:'Редактирование и сборка — разные действия.',difficulty:'Начальный',category:'Основы',
    objective:'Понимать компиляцию как отдельный шаг между .tex и итоговым документом.',prerequisites:['latex-model'],introduces:['compiler'],reinforces:['latex-model'],misconceptions:['PDF не обновляется сам по себе после изменения .tex.','Ошибка сборки описывает проблему чтения исходника.'],practiceObjective:'Определять, на какой стадии возникает проблема.',mastery:['Объясняет цикл edit → compile → result.','Понимает роль диагностик.'],commands:[],
    content:[
      concept('compiler-idea','Компиляция','LaTeX-движок читает исходник, интерпретирует команды и структуру, вычисляет набор страниц и сообщает диагностические сообщения.'),
      flow('compiler-flow','Один цикл работы',[{label:'Редактирование',detail:'Изменяется .tex.'},{label:'Компиляция',detail:'Движок разбирает исходник.'},{label:'Диагностика',detail:'Ошибка или предупреждение, если структура не согласована.'},{label:'Результат',detail:'Получается новая версия документа.'}]),
      mistake('compiler-warning','Ошибка — это данные','Сообщение компилятора показывает, где его модель перестала совпадать с исходником. Исправляйте первую содержательную ошибку, а не случайную строку.'),
      checkpoint('compiler-check','Проверка','Вы исправили source.tex, но PDF не изменился. Какой шаг пропущен?','Нужно снова запустить компиляцию.')
    ],
    examples:[{title:'Цикл сборки',description:'Редактирование и компиляция разделены.',code:'source.tex → LaTeX engine → document.pdf'}],
    practice:[
      task('Пропущенный шаг','Вставьте слово между source.tex и document.pdf.',['compiler'],'source.tex → ____ → document.pdf','source.tex → compiler → document.pdf',[has('compiler','Компилятор указан.','Между исходником и PDF находится обработка.')],'Дополнить документ'),
      task('Где исправлять','Оставьте объект, который меняют при синтаксической ошибке.',['source.tex'],'document.pdf\nsource.tex','source.tex',[has('source.tex','Причина ищется в исходнике.','Компилятор читает source.tex.')],'Объяснить'),
      task('Порядок ошибок','Запишите правило, какую содержательную ошибку лога анализировать первой.',['первую'],'','первую содержательную ошибку',[has('перв','Вы начинаете с ранней ошибки.','Каскад сообщений часто начинается с одной причины.')],'Объяснить')
    ]
  },
  {
    id:'tex-source',moduleId:'foundation',moduleTitle:'Основа',moduleDescription:'Ментальная модель до синтаксиса.',title:'Исходный .tex-файл',subtitle:'Обычный текст плюс инструкции LaTeX.',difficulty:'Начальный',category:'Основы',
    objective:'Различать публикуемый текст и управляющие конструкции исходника.',prerequisites:['compiler'],introduces:['source-file'],reinforces:['latex-model'],misconceptions:['.tex — обычный текстовый файл.','Перенос строки исходника не обязан создавать новый абзац.'],practiceObjective:'Распознавать текст и синтаксис.',mastery:['Знает расширение .tex.','Может указать управляющую строку.'],commands:[],
    content:[
      concept('source-idea','Что хранится в .tex','Файл .tex — обычный текст. В нём соседствуют публикуемое содержимое и инструкции LaTeX, поэтому исходник удобно искать, сравнивать в Git и разделять на файлы.'),
      {id:'source-example',type:'example',title:'Два вида строк',body:'Первая строка сообщает структуру, вторая содержит обычный текст.',code:'\\section{Method}\nThe experiment was repeated three times.'},
      explanation('source-model','Исходник не равен странице','Пробелы и переносы в .tex прежде всего помогают читать код. LaTeX интерпретирует их по правилам набора, а не как координаты страницы.'),
      checkpoint('source-check','Проверка','Является ли .tex графическим или бинарным форматом?','Нет. Это обычный текстовый файл с текстом и инструкциями.')
    ],
    examples:[{title:'Фрагмент научного исходника',description:'Структура и содержимое читаются без визуального редактора.',code:'\\section{Results}\nThe measured value is 42.'}],
    practice:[
      task('Расширение','Допишите типичное расширение исходника LaTeX.',['.tex'],'paper.___','paper.tex',[has('.tex','Указано расширение .tex.','Используйте .tex.')],'Дополнить документ'),
      task('Текст','Удалите управляющую строку и оставьте только публикуемый текст.',['Method was reproducible.'],'\\section{Conclusion}\nMethod was reproducible.','Method was reproducible.',[has('Method was reproducible.','Оставлен обычный текст.','Строка с обратным слешем — инструкция.')],'Рефакторинг'),
      task('Инструкция','Оставьте только строку, похожую на инструкцию LaTeX.',['\\section{Method}'],'\\section{Method}\nExperiment repeated.','\\section{Method}',[cmd('section','Распознана команда section.','Команда начинается с обратного слеша.')],'Объяснить')
    ]
  },
  {
    id:'commands-foundation',moduleId:'foundation',moduleTitle:'Основа',moduleDescription:'Ментальная модель до синтаксиса.',title:'Команды',subtitle:'Обратный слеш сообщает: дальше идёт инструкция.',difficulty:'Начальный',category:'Основы',
    objective:'Понимать анатомию команды до самостоятельного использования.',prerequisites:['source-file'],introduces:['command'],reinforces:['source-file'],misconceptions:['Обратный слеш — синтаксис, а не украшение.','Опечатка меняет имя команды.'],practiceObjective:'Распознавать имя команды и маркер команды.',mastery:['Находит имя команды.','Исправляет простую опечатку команды.'],commands:['section'],
    content:[
      concept('command-idea','Команда','Команда сообщает LaTeX действие. В большинстве текстовых команд обратный слеш вводит имя команды.'),
      anatomy('command-anatomy','Анатомия','\\section{Introduction}',[{token:'\\',label:'маркер команды',description:'Дальше следует управляющая конструкция.'},{token:'section',label:'имя',description:'Определяет действие.'},{token:'{Introduction}',label:'данные',description:'Значение команды; следующий урок разберёт аргументы.'}]),
      mistake('command-mistake','Реальная ошибка','Если имя написано неверно, компилятор не узнает команду.','\\secton{Method}','\\section{Method}'),
      checkpoint('command-check','Проверка','Что в записи \\section{Method} является именем команды?','section.')
    ],
    examples:[{title:'Семантическая команда',description:'Команда сообщает роль элемента.',code:'\\section{Introduction}'}],
    practice:[
      task('Исправьте имя','Исправьте опечатку.',['\\section'],'\\secton{Method}','\\section{Method}',[cmd('section','Имя команды исправлено.','Правильное имя — section.')],'Исправить ошибку'),
      task('Добавьте маркер','Превратите section в команду LaTeX.',['\\section'],'section{Results}','\\section{Results}',[cmd('section','Получилась команда section.','Перед именем нужен обратный слеш.')],'Дополнить документ'),
      task('Имя команды','Оставьте только имя команды без аргумента.',['section'],'\\section{Introduction}','section',[has('section','Имя указано.','Не включайте значение аргумента.')],'Объяснить')
    ]
  },
  {
    id:'arguments-foundation',moduleId:'foundation',moduleTitle:'Основа',moduleDescription:'Ментальная модель до синтаксиса.',title:'Аргументы',subtitle:'Фигурные скобки обязательны, квадратные задают параметры.',difficulty:'Начальный',category:'Основы',
    objective:'Различать обязательные и необязательные аргументы команды.',prerequisites:['command'],introduces:['required-argument','optional-argument','grouping'],reinforces:['command'],misconceptions:['{} — группировка синтаксиса, а не печатные скобки.','[] не заменяют обязательный аргумент.'],practiceObjective:'Разбирать команду на имя и аргументы.',mastery:['Разбирает section.','Разбирает documentclass[12pt]{article}.'],commands:['section','documentclass'],
    content:[
      concept('argument-required','Обязательный аргумент','Фигурные скобки передают значение, без которого команда не имеет полного смысла.'),
      anatomy('argument-anatomy-1','Обязательное значение','\\section{Introduction}',[{token:'\\section',label:'command',description:'Что сделать.'},{token:'{Introduction}',label:'required argument',description:'Обязательное значение команды.'}]),
      concept('argument-optional','Необязательный аргумент','Квадратные скобки передают дополнительную настройку. Без них команда использует значение по умолчанию.'),
      anatomy('argument-anatomy-2','Два вида аргументов','\\documentclass[12pt]{article}',[{token:'\\documentclass',label:'command',description:'Выбрать класс.'},{token:'[12pt]',label:'optional argument',description:'Дополнительная настройка.'},{token:'{article}',label:'required argument',description:'Сам класс.'}]),
      checkpoint('argument-check','Проверка','Что означает {article} в \\documentclass[12pt]{article}?','Обязательный аргумент: выбранный класс документа.')
    ],
    examples:[{title:'Аргументы не взаимозаменяемы',description:'Опция и обязательное значение занимают разные позиции.',code:'\\documentclass[12pt]{article}'}],
    practice:[
      task('Обязательный аргумент','Передайте section значение Method.',['\\section{Method}'],'\\section','\\section{Method}',[has('\\section{Method}','Аргумент передан в {}.','Добавьте {Method}.')],'Дополнить документ'),
      task('Опция класса','Добавьте размер 12pt классу article.',['[12pt]'],'\\documentclass{article}','\\documentclass[12pt]{article}',[{type:'documentClassOption',value:'12pt',message:'Опция 12pt добавлена.',hint:'Необязательный аргумент записывается в [...].'}],'Дополнить документ'),
      task('Тип скобок','Исправьте обязательный аргумент section.',['{}'],'\\section[Method]','\\section{Method}',[has('\\section{Method}','Использованы фигурные скобки.','Название section — обязательный аргумент.')],'Исправить ошибку')
    ]
  },
  {
    id:'environments-foundation',moduleId:'foundation',moduleTitle:'Основа',moduleDescription:'Ментальная модель до синтаксиса.',title:'Окружения',subtitle:'Начало, содержимое и конец структурной области.',difficulty:'Начальный',category:'Основы',
    objective:'Понять универсальный шаблон begin/content/end до document, lists и equations.',prerequisites:['command','required-argument'],introduces:['environment'],reinforces:['command','grouping'],misconceptions:['begin/end образуют пару.','Имена открывающего и закрывающего окружения должны совпадать.'],practiceObjective:'Согласовывать пары begin/end.',mastery:['Воспроизводит шаблон окружения.','Находит mismatch.'],commands:['begin','end'],
    content:[
      concept('environment-idea','Модель окружения','Окружение задаёт структурный регион. Всё между begin и соответствующим end обрабатывается по правилам этого окружения.'),
      syntax('environment-syntax','Универсальный шаблон','Имя в begin и end должно совпадать.','\\begin{name}\ncontent\n\\end{name}'),
      anatomy('environment-anatomy','Три части','\\begin{itemize}\n  ...\n\\end{itemize}',[{token:'\\begin{itemize}',label:'начало',description:'Открывает область.'},{token:'...',label:'содержимое',description:'Подчиняется правилам окружения.'},{token:'\\end{itemize}',label:'конец',description:'Закрывает ту же область.'}]),
      mistake('environment-mistake','Несогласованная пара','Открыт itemize, но закрыт enumerate.','\\begin{itemize}\n...\n\\end{enumerate}','\\begin{itemize}\n...\n\\end{itemize}'),
      checkpoint('environment-check','Проверка','Что проверить первым при неожиданном \\end?','Совпадает ли имя с соответствующим \\begin и правильно ли вложены окружения.')
    ],
    examples:[{title:'Одна модель — много применений',description:'document, itemize, equation и figure используют один паттерн.',code:'\\begin{equation}\nE=mc^2\n\\end{equation}'}],
    practice:[
      task('Закройте itemize','Добавьте закрывающую строку.',['\\end{itemize}'],'\\begin{itemize}\n\\item First','\\begin{itemize}\n\\item First\n\\end{itemize}',[env('itemize','itemize закрыт.','Добавьте end с тем же именем.'),balanced],'Дополнить документ'),
      task('Исправьте пару','Согласуйте begin/end.',['itemize'],'\\begin{itemize}\n\\item A\n\\end{enumerate}','\\begin{itemize}\n\\item A\n\\end{itemize}',[env('itemize','Пара согласована.','Закройте itemize как itemize.'),balanced],'Исправить ошибку'),
      task('Пустой equation','Создайте пустое окружение equation.',['begin equation','end equation'],'','\\begin{equation}\n\\end{equation}',[env('equation','Создан equation.','Используйте одинаковое имя в begin/end.'),balanced],'Написать код')
    ]
  },
  {
    id:'document-structure-foundation',moduleId:'foundation',moduleTitle:'Основа',moduleDescription:'Ментальная модель до синтаксиса.',title:'Каркас документа',subtitle:'Класс задаёт правила, document — публикуемую область.',difficulty:'Начальный',category:'Основы',
    objective:'Понять роли documentclass и document environment до самостоятельного набора.',prerequisites:['environment','required-argument'],introduces:['document-class','document-environment'],reinforces:['command','environment'],misconceptions:['documentclass и document — разные роли.','Текст до begin{document} не является обычным содержимым страницы.'],practiceObjective:'Распознавать класс и главное окружение.',mastery:['Объясняет documentclass.','Объясняет document environment.'],commands:['documentclass','begin','end'],
    content:[
      concept('structure-roles','Две роли','documentclass выбирает базовые правила документа. Окружение document отмечает область, содержимое которой должно попасть в результат.'),
      sourceOutput('structure-source-output','Минимальный каркас','Прочитайте его как уже знакомые конструкции: команда и окружение.',DOC('Document text.')),
      anatomy('structure-anatomy','Читаем сверху вниз','\\documentclass{article}\n\\begin{document}\nText\n\\end{document}',[{token:'\\documentclass{article}',label:'класс',description:'Базовая модель.'},{token:'\\begin{document}',label:'начало тела',description:'Открывает публикуемую область.'},{token:'Text',label:'содержимое',description:'Обычный текст.'},{token:'\\end{document}',label:'конец тела',description:'Закрывает область.'}]),
      checkpoint('structure-check','Проверка','Какая строка сообщает, где начинается публикуемое содержимое?','\\begin{document}.')
    ],
    examples:[{title:'Каркас article',description:'Только необходимые роли.',code:DOC('Observation confirmed.')}],
    practice:[
      task('Класс','Оставьте строку, которая выбирает тип документа.',['documentclass'],'\\documentclass{article}\n\\begin{document}','\\documentclass{article}',[{type:'documentClass',value:'article',message:'Класс article найден.',hint:'Класс задаёт documentclass.'}],'Объяснить'),
      task('Закройте document','Добавьте недостающий конец главного окружения.',['\\end{document}'],'\\documentclass{article}\n\\begin{document}\nText',DOC('Text'),[env('document','document закрыт.','Добавьте end document.'),balanced],'Исправить ошибку'),
      task('Каркас','Восстановите минимальный каркас.',['article','document environment'],'',DOC(''),[{type:'documentClass',value:'article',message:'Выбран article.',hint:'Начните с documentclass.'},env('document','Создан document.','Добавьте begin/end document.'),balanced],'Собрать документ')
    ]
  },
  {
    id:'preamble-body-foundation',moduleId:'foundation',moduleTitle:'Основа',moduleDescription:'Ментальная модель до синтаксиса.',title:'Преамбула и тело',subtitle:'Конфигурация отделена от содержимого.',difficulty:'Начальный',category:'Основы',
    objective:'Разделять настройки документа и публикуемое содержимое.',prerequisites:['document-class','document-environment'],introduces:['preamble','document-body'],reinforces:['document-environment'],misconceptions:['Преамбула — не верх страницы PDF.','Настройки пакетов не помещают внутрь document.'],practiceObjective:'Правильно размещать configuration и content.',mastery:['Указывает границу преамбулы.','Размещает настройки выше begin{document}.'],commands:['documentclass','begin','end'],
    content:[
      syntax('preamble-boundary','Граница','Преамбула находится до begin{document}; тело — внутри document.','\\documentclass{article}\n% PREAMBLE\n\\begin{document}\n% DOCUMENT BODY\n\\end{document}'),
      concept('preamble-concept','Преамбула','Здесь живут конфигурация, пакеты, метаданные и общие определения.'),
      concept('body-concept','Тело документа','Здесь находятся разделы, текст, формулы, рисунки, таблицы и другие публикуемые элементы.'),
      comparison('preamble-compare','Правильное место',{label:'Преамбула',code:'\\usepackage{amsmath}',note:'Настраивает возможности.'},{label:'Тело',code:'\\section{Method}',note:'Создаёт содержимое.'}),
      checkpoint('preamble-check','Проверка','Где должна находиться команда подключения пакета?','В преамбуле, до \\begin{document}.')
    ],
    examples:[{title:'Чёткое разделение',description:'Настройка выше, содержимое ниже.',code:'\\documentclass{article}\n% configuration\n\\begin{document}\n\\section{Introduction}\nText.\n\\end{document}'}],
    practice:[
      task('Перенесите настройку','Переместите usepackage до begin{document}.',['usepackage в преамбуле'],'\\documentclass{article}\n\\begin{document}\n\\usepackage{amsmath}\nText\n\\end{document}','\\documentclass{article}\n\\usepackage{amsmath}\n\\begin{document}\nText\n\\end{document}',[pkg('amsmath','amsmath присутствует.','Подключите пакет.'),{type:'regex',value:'\\\\usepackage\\{amsmath\\}[\\s\\S]*\\\\begin\\{document\\}',message:'Пакет расположен до тела.',hint:'Переместите строку выше begin{document}.'}],'Рефакторинг'),
      task('Тело','Оставьте только публикуемый текст.',['Experimental result.'],'\\documentclass{article}\n\\begin{document}\nExperimental result.\n\\end{document}','Experimental result.',[has('Experimental result.','Выделено содержимое тела.','Это текст между begin/end document.')],'Объяснить'),
      task('Граница','Добавьте комментарии PREAMBLE и BODY в правильные области.',['PREAMBLE до begin','BODY после begin'],DOC('Text'),'\\documentclass{article}\n% PREAMBLE\n\\begin{document}\n% BODY\nText\n\\end{document}',[{type:'regex',value:'PREAMBLE[\\s\\S]*\\\\begin\\{document\\}[\\s\\S]*BODY',message:'Границы отмечены правильно.',hint:'PREAMBLE выше begin, BODY ниже.'}],'Архитектура')
    ]
  },
  {
    id:'packages-foundation',moduleId:'foundation',moduleTitle:'Основа',moduleDescription:'Ментальная модель до синтаксиса.',title:'Пакеты',subtitle:'Возможности подключаются по необходимости.',difficulty:'Начальный',category:'Основы',
    objective:'Понимать модель core + packages и причину неизвестных команд из неподключённых пакетов.',prerequisites:['preamble','optional-argument'],introduces:['package-model','usepackage'],reinforces:['preamble','command'],misconceptions:['Пакеты не копируют из шаблона без понимания роли.','Команда пакета может быть unknown, если зависимость не подключена.'],practiceObjective:'Подключать пакет в преамбуле и связывать его с возможностью.',mastery:['Объясняет зачем нужны пакеты.','Подключает пакет до begin{document}.'],commands:['usepackage'],
    content:[
      flow('package-flow','Модель расширений',[{label:'LaTeX core',detail:'Базовая структура.'},{label:'+ package',detail:'Дополнительные команды и окружения.'},{label:'document',detail:'Использует подключённые возможности.'}]),
      anatomy('package-anatomy','Подключение','\\usepackage{amsmath}',[{token:'\\usepackage',label:'command',description:'Подключить расширение.'},{token:'{amsmath}',label:'required argument',description:'Имя пакета.'}]),
      syntax('package-options','Параметры пакета','Необязательные параметры идут в квадратных скобках.','\\usepackage[margin=25mm]{geometry}'),
      mistake('package-mistake','Почему команда неизвестна','Если align используется без amsmath, проблема может быть в отсутствующей зависимости.','\\begin{align}\na &= b\n\\end{align}','\\usepackage{amsmath} % в преамбуле'),
      checkpoint('package-check','Проверка','Почему пакет подключают в преамбуле?','Пакет изменяет возможности документа до обработки его содержимого.')
    ],
    examples:[{title:'Минимальная зависимость',description:'amsmath подключён потому, что документ использует его возможности.',code:'\\documentclass{article}\n\\usepackage{amsmath}\n\\begin{document}\n...\n\\end{document}'}],
    practice:[
      task('amsmath','Добавьте пакет в преамбулу.',['\\usepackage{amsmath}'],DOC('Text'),DOC('Text','\\usepackage{amsmath}'),[pkg('amsmath','amsmath подключён.','Добавьте usepackage{amsmath}.'),compiles],'Дополнить документ'),
      task('Место graphicx','Перенесите graphicx в преамбулу.',['до begin document'],'\\documentclass{article}\n\\begin{document}\n\\usepackage{graphicx}\n\\end{document}','\\documentclass{article}\n\\usepackage{graphicx}\n\\begin{document}\n\\end{document}',[pkg('graphicx','graphicx подключён.','Добавьте пакет.'),{type:'regex',value:'\\\\usepackage\\{graphicx\\}[\\s\\S]*\\\\begin\\{document\\}',message:'Пакет находится в преамбуле.',hint:'Переместите usepackage выше begin.'}],'Исправить ошибку'),
      task('Зависимость align','Подключите пакет, который предоставляет align.',['amsmath'],'\\documentclass{article}\n\\begin{document}\n\\begin{align}\na&=b\n\\end{align}\n\\end{document}','\\documentclass{article}\n\\usepackage{amsmath}\n\\begin{document}\n\\begin{align}\na&=b\n\\end{align}\n\\end{document}',[pkg('amsmath','Выбран amsmath.','align относится к amsmath.')],'Архитектура')
    ]
  },
  {
    id:'errors-foundation',moduleId:'foundation',moduleTitle:'Основа',moduleDescription:'Ментальная модель до синтаксиса.',title:'Как читать ошибки',subtitle:'Диагностика описывает непонятную компилятору структуру.',difficulty:'Начальный',category:'Отладка',
    objective:'Сформировать системную модель диагностики до первой сложной отладки.',prerequisites:['compiler','command','environment','grouping'],introduces:['compile-error','undefined-control-sequence','brace-balance','environment-balance'],reinforces:['compiler','command','environment'],misconceptions:['Длинный лог не означает много независимых ошибок.','Исправлять нужно причину, а не случайную строку.'],practiceObjective:'Связывать тип ошибки с вероятной причиной.',mastery:['Объясняет Undefined control sequence.','Проверяет скобки и пары окружений.'],commands:['section','begin','end'],
    content:[
      concept('error-first','Первая содержательная ошибка','Одна ранняя проблема может породить каскад сообщений. Исправьте первую понятную ошибку и компилируйте снова.'),
      mistake('error-undefined','Undefined control sequence','Компилятор увидел неизвестную команду. Частая причина — опечатка или отсутствующий пакет.','\\secton{Title}','\\section{Title}'),
      mistake('error-brace','Missing } inserted','Компилятор ожидал закрывающую фигурную скобку.','\\section{Method','\\section{Method}'),
      mistake('error-env','Environment mismatch','Если end не соответствует открытому begin, восстановите структуру окружений.','\\begin{itemize}\n\\end{enumerate}','\\begin{itemize}\n\\end{itemize}'),
      checkpoint('error-check','Проверка','Что практически означает Undefined control sequence?','Компилятор встретил неизвестную команду: проверьте написание и нужный пакет.')
    ],
    examples:[{title:'Минимальное исправление',description:'Сначала определяется класс ошибки.',code:'\\secton{Results}  →  \\section{Results}'}],
    practice:[
      task('Undefined control sequence','Исправьте неизвестную команду.',['\\section{Results}'],'\\secton{Results}','\\section{Results}',[cmd('section','Команда распознана.','Исправьте secton на section.')],'Исправить ошибку'),
      task('Missing brace','Закройте обязательный аргумент.',['сбалансированные {}'],'\\section{Method','\\section{Method}',[has('\\section{Method}','Аргумент закрыт.','Добавьте } после Method.')],'Исправить ошибку'),
      task('Environment mismatch','Исправьте закрывающее окружение.',['itemize закрывается itemize'],'\\begin{itemize}\n\\item A\n\\end{enumerate}','\\begin{itemize}\n\\item A\n\\end{itemize}',[env('itemize','Окружение согласовано.','Закройте itemize.'),balanced],'Исправить ошибку')
    ]
  },
  {
    id:'first-document-foundation',moduleId:'foundation',moduleTitle:'Основа',moduleDescription:'Ментальная модель до синтаксиса.',title:'Первый документ',subtitle:'Теперь каждая строка каркаса уже объяснена.',difficulty:'Начальный',category:'Основы',
    objective:'Самостоятельно собрать минимальный article без необъяснённых конструкций.',prerequisites:['document-class','document-environment','preamble','document-body','package-model','compile-error'],introduces:[],reinforces:['document-class','document-environment','preamble','document-body'],misconceptions:['Минимальному документу не нужны случайные пакеты.','Каждая строка должна иметь понятную роль.'],practiceObjective:'Собрать, скомпилировать и объяснить минимальный article.',mastery:['Пишет минимальный документ по памяти.','Объясняет роль каждой строки.'],commands:['documentclass','begin','end'],projectStage:'academic-paper:stage-1',
    content:[
      concept('first-no-magic','Никакой магии','Здесь нет новой конструкции: documentclass — знакомая команда с аргументом, document — знакомое окружение, текст внутри — тело.'),
      sourceOutput('first-source-output','Минимальный рабочий документ','Скомпилируйте, затем измените только текст тела.',DOC('Experimental result.')),
      anatomy('first-anatomy','Контрольный разбор','\\documentclass{article}\n\\begin{document}\nExperimental result.\n\\end{document}',[{token:'\\documentclass{article}',label:'configuration',description:'Выбор класса.'},{token:'\\begin{document}',label:'body start',description:'Начало публикуемого содержимого.'},{token:'Experimental result.',label:'content',description:'Обычный текст.'},{token:'\\end{document}',label:'body end',description:'Конец главного окружения.'}]),
      checkpoint('first-gate','Foundation quality gate','Можете ли вы объяснить .tex, compilation, command, {}, [], environment, preamble, body, package и источник ошибки?','Если один термин неясен, вернитесь к соответствующему foundation-уроку. Следующий блок использует эти понятия без повторного введения.')
    ],
    examples:[{title:'Первый академический фрагмент',description:'Реалистичный текст вместо Hello World.',code:DOC('The measurement was repeated three times.')}],
    practice:[
      task('Минимальный article','Создайте article с одним предложением о результате.',['article','document','абзац'],'',DOC('The experiment converged.'),[{type:'documentClass',value:'article',message:'Выбран article.',hint:'Используйте documentclass.'},env('document','Создано главное окружение.','Добавьте begin/end document.'),{type:'paragraph',message:'В теле есть текст.',hint:'Добавьте обычное предложение.'},balanced,compiles],'Собрать документ'),
      task('Лишняя зависимость','Удалите пакет, который не используется.',['без amsmath'],DOC('Observation complete.','\\usepackage{amsmath}'),DOC('Observation complete.'),[{type:'forbiddenText',value:'\\usepackage{amsmath}',message:'Лишний пакет удалён.',hint:'В минимальном документе amsmath не нужен.'},compiles],'Рефакторинг'),
      task('Восстановите каркас','Исправьте документ так, чтобы он снова собирался.',['закрытый document'],'\\documentclass{article}\n\\begin{document}\nResult.',DOC('Result.'),[env('document','document закрыт.','Добавьте end document.'),balanced,compiles],'Исправить ошибку')
    ]
  }
];

type AtomSpec={id:string;moduleId:string;moduleTitle:string;title:string;subtitle:string;difficulty:Difficulty;category:PracticeCategory;prerequisites:string[];introduces:string[];reinforces:string[];idea:string;sample:string;pitfall:string;tasks:Array<[string,string,ValidatorRule,string,string]>};
const atom=(spec:AtomSpec):LessonSpec=>({
  id:spec.id,moduleId:spec.moduleId,moduleTitle:spec.moduleTitle,moduleDescription:'Атомарные темы без необъяснённых переходов.',title:spec.title,subtitle:spec.subtitle,difficulty:spec.difficulty,category:spec.category,
  objective:spec.idea,prerequisites:spec.prerequisites,introduces:spec.introduces,reinforces:spec.reinforces,misconceptions:[spec.pitfall],practiceObjective:`Применять тему «${spec.title}» по смыслу.`,mastery:[`Объясняет новую роль: ${spec.introduces.join(', ')}.`,`Применяет её в корректном контексте.`],commands:[],
  content:[concept(`${spec.id}-idea`,'Идея',spec.idea),syntax(`${spec.id}-syntax`,'Минимальный синтаксис','Пример содержит только новую конструкцию и необходимый контекст.',spec.sample),explanation(`${spec.id}-mental`,'Связь с предыдущим',`Этот шаг опирается на: ${spec.prerequisites.join(', ')}.`),mistake(`${spec.id}-mistake`,'Типичная ошибка',spec.pitfall),checkpoint(`${spec.id}-check`,'Проверка',`Что нового вводит урок «${spec.title}»?`,spec.idea)],
  examples:[{title:'Рабочий фрагмент',description:'Минимальный пример новой идеи.',code:spec.sample}],
  practice:spec.tasks.map(([title,instructions,validator,starter,solution],index)=>task(title,instructions,['Сохранить структурный смысл'],starter,solution,[validator,...(solution.includes('\\begin{')?[balanced]:[])],index===0?'Написать код':index===1?'Исправить ошибку':'Рефакторинг'))
});
const a=(id:string,moduleId:string,moduleTitle:string,title:string,subtitle:string,difficulty:Difficulty,category:PracticeCategory,prerequisites:string[],introduces:string[],reinforces:string[],idea:string,sample:string,pitfall:string,tasks:Array<[string,string,ValidatorRule,string,string]>):AtomSpec=>({id,moduleId,moduleTitle,title,subtitle,difficulty,category,prerequisites,introduces,reinforces,idea,sample,pitfall,tasks});
const p=(title:string,instructions:string,validator:ValidatorRule,starter:string,solution:string):[string,string,ValidatorRule,string,string]=>[title,instructions,validator,starter,solution];

const atoms:AtomSpec[]=[
  a('quotes-structure','text-atoms','Текст: атомы','Цитатные блоки','quote вместо ручных отступов.','Базовый','Текст',['environment','document-body'],['quote'],['environment'],'Цитата — структурный фрагмент, а не абзац, сдвинутый пробелами.','\\begin{quote}\nA reproducible method is reviewable.\n\\end{quote}','Не создавайте цитату повторяющимися \\hspace.',[
    p('Quote','Создайте окружение quote.',env('quote','Создан quote.','Используйте begin/end quote.'),DOC(''),DOC('\\begin{quote}\nA reproducible method is reviewable.\n\\end{quote}')),
    p('Исправьте отступ','Замените hspace на quote.',env('quote','Использован quote.','Создайте структурное окружение.'),DOC('\\hspace{2cm} Important.'),DOC('\\begin{quote}\nImportant.\n\\end{quote}')),
    p('Согласуйте пару','Исправьте end.',env('quote','quote согласован.','Закройте quote.'),'\\begin{quote}\nText\n\\end{quotation}','\\begin{quote}\nText\n\\end{quote}')]),
  a('special-characters-deep','text-atoms','Текст: атомы','Специальные символы','%, &, $, _, ^, # и ~ имеют синтаксические роли.','Базовый','Текст',['command'],['special-symbols','escaping'],['command'],'Специальные символы управляют синтаксисом и в обычном тексте требуют осмысленного экранирования.','Cost: \\$100; share: 25\\%; A\\&B.','Не экранируйте символы механически: определите их роль в текущем контексте.',[
    p('Процент','Выведите 25%.',has('25\\%','Процент экранирован.','Напишите \\%.'),DOC('Share: 25%.'),DOC('Share: 25\\%.')),
    p('Амперсанд','Выведите A&B как текст.',has('A\\&B','Амперсанд экранирован.','Напишите \\&.'),DOC('A&B'),DOC('A\\&B')),
    p('Доллар','Выведите знак валюты.',has('\\$100','Доллар экранирован.','Обычный $ открывает math mode.'),DOC('$100'),DOC('\\$100'))]),
  a('source-spacing','text-atoms','Текст: атомы','Строки, пробелы и абзацы','Исходная строка не равна новому абзацу.','Базовый','Текст',['document-body'],['paragraph','spacing'],['source-file'],'Один перевод строки обычно ведёт себя как пробел; новый смысловой абзац создаёт пустая строка.','First paragraph.\n\nSecond paragraph.','Не используйте \\\\ как обычную замену нового абзаца.',[
    p('Два абзаца','Разделите фрагменты пустой строкой.',has('\n\n','Есть граница абзаца.','Оставьте пустую строку.'),DOC('First. Second.'),DOC('First.\n\nSecond.')),
    p('Уберите \\\\','Замените ручной перенос пустой строкой.',{type:'forbiddenText',value:'\\\\',message:'Ручной перенос удалён.',hint:'Для абзаца нужна пустая строка.'},DOC('First.\\\\\nSecond.'),DOC('First.\n\nSecond.')),
    p('Пробелы','Уберите ручное выравнивание пробелами.',{type:'forbiddenText',value:'     ',message:'Ручные пробелы убраны.',hint:'Не позиционируйте текст сериями пробелов.'},DOC('Method     Result'),DOC('Method Result'))]),
  a('math-symbols-deep','math-atoms','Математика: атомы','Математические символы','Команды символов внутри math mode.','Базовый','Математика',['math-mode','command'],['math-symbols'],['math-mode'],'Греческие буквы и отношения выражаются математическими командами для правильных знаков и интервалов.','$\\alpha + \\beta \\leq 1$','Не пишите alpha буквами, если нужен символ α.',[
    p('Alpha','Наберите alpha как символ.',cmd('alpha','Использована alpha.','Напишите \\alpha.'),DOC('$a$'),DOC('$\\alpha$')),
    p('Отношение','Используйте leq.',cmd('leq','Использован leq.','Напишите \\leq.'),DOC('$x < 1$'),DOC('$x \\leq 1$')),
    p('Beta','Замените b на beta.',cmd('beta','Использована beta.','Добавьте \\beta.'),DOC('$\\alpha+b$'),DOC('$\\alpha+\\beta$'))]),
  a('indices-groups','math-atoms','Математика: атомы','Индексы и группировка','Почему x_12 и x_{12} — разные структуры.','Базовый','Математика',['math-mode','grouping'],['superscript','subscript'],['grouping'],'^ и _ применяются к следующему токену; составной индекс или степень группируется фигурными скобками.','$x_{12}^{n+1}$','$x_12$ означает индекс 1, после которого идёт обычная 2.',[
    p('Индекс','Исправьте x_12.',has('x_{12}','Индекс сгруппирован.','Используйте _{12}.'),DOC('$x_12$'),DOC('$x_{12}$')),
    p('Степень','Наберите n+1 как одну степень.',has('^{n+1}','Степень сгруппирована.','Используйте ^{n+1}.'),DOC('$x^n+1$'),DOC('$x^{n+1}$')),
    p('Оба','Наберите a_{ij}^{2}.',has('a_{ij}^{2}','Индексы заданы явно.','Сгруппируйте ij.'),DOC('$a$'),DOC('$a_{ij}^{2}$'))]),
  a('roots-deep','math-atoms','Математика: атомы','Корни','Обязательный аргумент и необязательная степень.','Базовый','Математика',['math-mode','optional-argument'],['root'],['grouping'],'sqrt берёт подкоренное выражение в {}, а необязательный аргумент задаёт степень корня.','$\\sqrt{x^2+y^2},\quad \\sqrt[3]{x}$','Квадратные скобки sqrt не заменяют подкоренное выражение.',[
    p('Корень','Наберите корень из x+1.',cmd('sqrt','Использован sqrt.','Напишите \\sqrt{x+1}.'),DOC('$x+1$'),DOC('$\\sqrt{x+1}$')),
    p('Кубический','Добавьте степень 3.',has('\\sqrt[3]{x}','Степень задана как optional argument.','Используйте [3].'),DOC('$\\sqrt{x}$'),DOC('$\\sqrt[3]{x}$')),
    p('Дробь','Поместите frac внутрь sqrt.',cmd('frac','Использована структурная дробь.','Используйте frac.'),DOC('$\\sqrt{a/b}$'),DOC('$\\sqrt{\\frac{a}{b}}$'))]),
  a('functions-deep','math-atoms','Математика: атомы','Функции и операторы','sin, log и lim — не произведения букв.','Средний','Математика',['math-symbols'],['math-function','math-operator'],['math-symbols'],'Стандартные функции набираются командами: это даёт прямое начертание и корректные интервалы.','$\\sin x + \\log y$','$sin x$ воспринимается как произведение переменных s·i·n.',[
    p('Sin','Исправьте sin.',cmd('sin','Использован sin.','Напишите \\sin.'),DOC('$sin x$'),DOC('$\\sin x$')),
    p('Log','Используйте log.',cmd('log','Использован log.','Напишите \\log.'),DOC('$log x$'),DOC('$\\log x$')),
    p('Limit','Наберите lim с индексом.',cmd('lim','Использован lim.','Напишите \\lim_{n\\to\\infty}.'),DOC('$lim n$'),DOC('$\\lim_{n\\to\\infty} a_n$'))]),
  a('equation-model','math-atoms','Математика: атомы','Уравнение как объект','Когда формуле нужен номер.','Средний','Математика',['display-math','environment'],['equation'],['display-math'],'equation делает формулу самостоятельным нумеруемым объектом.','\\begin{equation}\nE=mc^2\n\\end{equation}','Не используйте equation для каждой короткой формулы внутри предложения.',[
    p('Equation','Поместите E=mc^2 в equation.',env('equation','Создан equation.','Используйте begin/end equation.'),DOC('E=mc^2'),DOC('\\begin{equation}\nE=mc^2\n\\end{equation}')),
    p('Закройте','Исправьте незакрытое equation.',env('equation','equation закрыт.','Добавьте end equation.'),'\\begin{equation}\nE=mc^2','\\begin{equation}\nE=mc^2\n\\end{equation}'),
    p('Inline','Верните короткую формулу в строку.',{type:'inlineMath',message:'Использован inline math.',hint:'Для короткого выражения используйте $...$.'},DOC('\\begin{equation}x=1\\end{equation} in text.'),DOC('Value $x=1$ is used below.'))]),
  a('math-line-breaks','math-atoms','Математика: атомы','Строки формулы','\\ завершает строку в многострочном окружении.','Средний','Математика',['equation','special-symbols'],['line-break-math'],['environment'],'В align двойной обратный слеш завершает математическую строку; в обычном тексте это не новый абзац.','\\begin{align}\na &= b \\\\\nc &= d\n\\end{align}','Не переносите привычку \\\\ из align в обычные абзацы.',[
    p('Две строки','Добавьте разрыв между равенствами.',has('\\\\','Есть конец строки.','В align используйте \\\\.'),'\\begin{align}\na &= b c &= d\n\\end{align}','\\begin{align}\na &= b \\\\\nc &= d\n\\end{align}'),
    p('Абзац','Уберите \\\\ из обычного текста.',{type:'forbiddenText',value:'\\\\',message:'Ручной перенос удалён.',hint:'Используйте пустую строку.'},DOC('First.\\\\\nSecond.'),DOC('First.\n\nSecond.')),
    p('Закройте align','Согласуйте окружение.',env('align','align закрыт.','Добавьте end align.'),'\\begin{align}\na&=b','\\begin{align}\na&=b\n\\end{align}')]),
  a('alignment-points','math-atoms','Математика: атомы','Точки выравнивания','& задаёт логическую вертикаль в align.','Средний','Математика',['line-break-math'],['alignment-point','align'],['special-symbols'],'В align символ & отмечает позицию, по которой строки должны выровняться — обычно перед знаком отношения.','\\begin{align}\nf(x) &= x^2+2x+1 \\\\\n     &= (x+1)^2\n\\end{align}','Пробелы перед = не создают устойчивого выравнивания.',[
    p('Точки','Поставьте & перед =.',has('&=','Добавлена точка выравнивания.','Используйте &=.'),'\\begin{align}\na = b \\\\\nc = d\n\\end{align}','\\begin{align}\na &= b \\\\\nc &= d\n\\end{align}'),
    p('Без пробелов','Замените ручные пробелы на &.',has('&','Использована структурная точка.','Выравнивайте через &.'),'a       = b','a &= b'),
    p('Align','Соберите две строки.',env('align','Использован align.','Создайте begin/end align.'),DOC('a=b\nc=d','\\usepackage{amsmath}'),DOC('\\begin{align}\na&=b \\\\\nc&=d\n\\end{align}','\\usepackage{amsmath}'))]),
  a('delimiters-deep','math-atoms','Математика: атомы','Ограничители','Когда нужны left/right.','Средний','Математика',['math-mode','grouping'],['delimiter'],['math-mode'],'Обычные скобки достаточны для коротких выражений; left/right нужны при высокой конструкции.','$\\left( \\frac{a}{b} \\right)$','Не добавляйте left/right вокруг каждой пары скобок автоматически.',[
    p('Высокая дробь','Добавьте left/right.',has('\\left(','Использован left.','Добавьте \\left(.'),DOC('$(\\frac{a}{b})$'),DOC('$\\left(\\frac{a}{b}\\right)$')),
    p('Right','Добавьте правый ограничитель.',has('\\right)','Пара завершена.','Добавьте \\right).'),DOC('$\\left(x+1)$'),DOC('$\\left(x+1\\right)$')),
    p('Просто','Для x+1 оставьте обычные скобки.',{type:'forbiddenText',value:'\\left',message:'Лишнее масштабирование удалено.',hint:'Обычных скобок достаточно.'},DOC('$\\left(x+1\\right)$'),DOC('$(x+1)$'))]),
  a('table-anatomy','structured-atoms','Структура: атомы','Анатомия tabular','Столбцы, &, \\ — по одному понятию.','Средний','Таблицы',['environment','special-symbols'],['tabular','table-cell-separator','table-row-break'],['environment'],'Аргумент tabular описывает столбцы; & разделяет ячейки, а \\\\ завершает строку.','\\begin{tabular}{lr}\nMethod & Score \\\\\nA & 98 \\\\\n\\end{tabular}','Число разделителей & должно соответствовать модели столбцов.',[
    p('Два столбца','Создайте tabular.',env('tabular','Создан tabular.','Используйте begin/end tabular.'),DOC(''),DOC('\\begin{tabular}{ll}\nA & B \\\\\n\\end{tabular}')),
    p('Ячейки','Добавьте &.',has('Method & Score','Ячейки разделены.','Используйте &.'),'\\begin{tabular}{ll}\nMethod Score \\\\\n\\end{tabular}','\\begin{tabular}{ll}\nMethod & Score \\\\\n\\end{tabular}'),
    p('Строка','Добавьте конец строки.',has('\\\\','Строка завершена.','Используйте \\\\.'),'\\begin{tabular}{ll}\nA & B\nC & D\n\\end{tabular}','\\begin{tabular}{ll}\nA & B \\\\\nC & D \\\\\n\\end{tabular}')]),
  a('captions-deep','structured-atoms','Структура: атомы','Подписи','caption связывает смысл и нумерацию объекта.','Средний','Графика',['figure'],['caption'],['figure'],'Подпись должна позволять понять рисунок или таблицу и участвует в их структурной нумерации.','\\begin{figure}\n\\caption{Experimental error by iteration.}\n\\end{figure}','Не заменяйте caption обычным текстом под рисунком.',[
    p('Caption','Добавьте caption.',cmd('caption','Добавлен caption.','Используйте caption.'),DOC('\\begin{figure}\n\\end{figure}'),DOC('\\begin{figure}\n\\caption{Experimental result.}\n\\end{figure}')),
    p('Ручной текст','Замените текст на caption.',cmd('caption','Использован caption.','Перенесите текст в caption.'),DOC('\\begin{figure}\nResult figure\n\\end{figure}'),DOC('\\begin{figure}\n\\caption{Result figure.}\n\\end{figure}')),
    p('Caption → label','Поставьте caption перед label.',{type:'regex',value:'\\\\caption\\{[^}]+\\}[\\s\\S]*\\\\label\\{',message:'caption расположен до label.',hint:'Сначала caption, затем label.'},DOC('\\begin{figure}\n\\label{fig:r}\n\\caption{Result}\n\\end{figure}'),DOC('\\begin{figure}\n\\caption{Result}\n\\label{fig:r}\n\\end{figure}'))]),
  a('reference-model-deep','structured-atoms','Структура: атомы','Метки и ссылки','label создаёт связь, ref получает номер.','Средний','Основы',['section','compiler'],['label','ref'],['compiler'],'label назначает устойчивый ключ объекту; ref получает его номер после компиляции.','\\section{Method}\\label{sec:method}\nSee Section~\\ref{sec:method}.','Не пишите «см. раздел 3» вручную.',[
    p('Label','Назначьте ключ.',cmd('label','Создан label.','Используйте label.'),DOC('\\section{Method}'),DOC('\\section{Method}\\label{sec:method}')),
    p('Ref','Сошлитесь на ключ.',cmd('ref','Использован ref.','Напишите ref.'),DOC('See Section 2.'),DOC('See Section~\\ref{sec:method}.')),
    p('Без номера','Замените жёсткий номер.',cmd('ref','Номер заменён связью.','Используйте ref.'),DOC('See Section 3.'),DOC('See Section~\\ref{sec:method}.'))]),
  a('footnotes-deep','academic-atoms','Академический документ','Сноски','footnote создаёт структурную сноску.','Средний','Текст',['command','required-argument'],['footnote'],['command'],'Сноска используется для второстепенного пояснения и нумеруется автоматически.','The dataset was normalized.\\footnote{Using the published baseline.}','Не набирайте номер сноски вручную верхним индексом.',[
    p('Footnote','Оформите пояснение.',cmd('footnote','Использована footnote.','Добавьте footnote.'),DOC('Method. (1) Baseline.'),DOC('Method.\\footnote{Baseline.}')),
    p('Ручной номер','Замените ^1.',cmd('footnote','Ручная нумерация заменена.','Используйте footnote.'),DOC('Method $^1$ Baseline.'),DOC('Method.\\footnote{Baseline.}')),
    p('Аргумент','Закройте аргумент.',has('\\footnote{Note}','Аргумент закрыт.','Добавьте }.'),DOC('Text\\footnote{Note'),DOC('Text\\footnote{Note}.'))]),
  a('appendices-deep','academic-atoms','Академический документ','Приложения','appendix переключает последующие разделы в режим приложений.','Продвинутый','Большие документы',['section'],['appendix'],['section'],'Приложение — часть структуры документа; appendix поручает классу нумерацию последующих разделов.','\\appendix\n\\section{Raw measurements}','Не имитируйте «Appendix A» вручную.',[
    p('Appendix','Добавьте appendix.',cmd('appendix','Режим приложений включён.','Добавьте appendix.'),DOC('\\section{Raw data}'),DOC('\\appendix\n\\section{Raw data}')),
    p('Без буквы','Замените ручное A.',cmd('appendix','Использован appendix.','Не кодируйте букву вручную.'),DOC('\\section{Appendix A: Data}'),DOC('\\appendix\n\\section{Data}')),
    p('Label','Добавьте label.',cmd('label','Приложение имеет метку.','Добавьте label.'),DOC('\\appendix\n\\section{Data}'),DOC('\\appendix\n\\section{Data}\\label{app:data}'))]),
  a('custom-environments-deep','architecture-atoms','Архитектура документа','Пользовательские окружения','Повторяемую структуру оформляют как API документа.','Продвинутый','Большие документы',['custom-command','environment'],['custom-environment'],['custom-command'],'newenvironment определяет начало и конец нового устойчивого типа блока.','\\newenvironment{remark}{\\begin{quote}\\itshape}{\\end{quote}}','Не создавайте окружение ради единственного фрагмента.',[
    p('Remark','Определите remark.',cmd('newenvironment','Определено окружение.','Используйте newenvironment.'),'','\\newenvironment{remark}{\\begin{quote}}{\\end{quote}}'),
    p('Использование','Добавьте begin/end remark.',env('remark','remark использован.','Откройте и закройте remark.'),'\\newenvironment{remark}{\\itshape}{}\nText','\\newenvironment{remark}{\\itshape}{}\n\\begin{remark}\nText\n\\end{remark}'),
    p('Повторение','Вынесите стиль в окружение.',cmd('newenvironment','Повторение вынесено.','Определите общий remark.'),'\\itshape Note A.\n\\normalfont\n\\itshape Note B.','\\newenvironment{remark}{\\itshape}{}\n\\begin{remark}Note A.\\end{remark}\n\\begin{remark}Note B.\\end{remark}')]),
  a('counters-lengths','architecture-atoms','Архитектура документа','Счётчики и длины','Нумерация и размеры как управляемые параметры.','Продвинутый','Большие документы',['page-structure','section'],['counter','length'],['page-structure'],'Счётчики представляют состояние нумерации, длины — типографические размеры.','\\setcounter{secnumdepth}{2}\n\\setlength{\\parindent}{1.5em}','Не подгоняйте документ серией локальных vspace/hspace.',[
    p('Счётчик','Задайте secnumdepth=2.',cmd('setcounter','Счётчик задан.','Используйте setcounter.'),'','\\setcounter{secnumdepth}{2}'),
    p('Длина','Задайте parindent.',cmd('setlength','Длина задана.','Используйте setlength.'),'','\\setlength{\\parindent}{1.5em}'),
    p('Без vspace','Удалите локальный костыль.',{type:'forbiddenText',value:'\\vspace',message:'vspace удалён.',hint:'Исправьте структурную причину.'},DOC('\\section{Method}\n\\vspace{-8mm}\nText.'),DOC('\\section{Method}\nText.'))]),
  a('headers-footers-deep','architecture-atoms','Архитектура документа','Колонтитулы','Колонтитул помогает навигации, а не украшает страницу.','Продвинутый','Большие документы',['page-structure','package-model'],['headers-footers'],['page-structure'],'Колонтитулы полезны в длинном документе: название главы, короткий title, номер страницы.','\\usepackage{fancyhdr}\n\\pagestyle{fancy}\n\\fancyhead[L]{Methods}','Не перегружайте колонтитул информацией без навигационной пользы.',[
    p('fancyhdr','Подключите пакет.',pkg('fancyhdr','fancyhdr подключён.','Используйте usepackage.'),DOC('Text'),DOC('Text','\\usepackage{fancyhdr}')),
    p('Pagestyle','Включите fancy.',cmd('pagestyle','Стиль включён.','Добавьте pagestyle.'),DOC('Text','\\usepackage{fancyhdr}'),DOC('Text','\\usepackage{fancyhdr}\n\\pagestyle{fancy}')),
    p('Header','Добавьте fancyhead.',cmd('fancyhead','Колонтитул задан.','Используйте fancyhead[L].'),DOC('Text','\\usepackage{fancyhdr}\n\\pagestyle{fancy}'),DOC('Text','\\usepackage{fancyhdr}\n\\pagestyle{fancy}\n\\fancyhead[L]{Methods}'))]),
  a('multi-file-deep','architecture-atoms','Архитектура документа','Несколько файлов','Главный файл остаётся картой проекта.','Продвинутый','Большие документы',['source-file','section'],['multi-file','project-architecture'],['source-file'],'input/include разделяют большой документ, не дублируя его главный каркас.','\\input{sections/introduction}\n\\include{chapters/methods}','Не добавляйте documentclass и begin{document} в каждую подключаемую главу.',[
    p('Input','Подключите introduction.',cmd('input','Использован input.','Напишите input.'),DOC(''),DOC('\\input{sections/introduction}')),
    p('Include','Подключите methods.',cmd('include','Использован include.','Напишите include.'),DOC(''),DOC('\\include{chapters/methods}')),
    p('Без второго класса','Уберите documentclass из фрагмента.',{type:'forbiddenText',value:'\\documentclass',message:'Фрагмент не содержит второго класса.',hint:'Класс остаётся в главном файле.'},'\\documentclass{article}\n\\section{Methods}','\\section{Methods}')])
];

const allSpecs=[...foundation,...atoms.map(atom)];
const legacyIntroduces:Record<string,string[]>={
  'document-structure':['document-class','document-environment'],'sections-paragraphs':['paragraph','section'],'text-formatting':['emphasis','list'],'math-modes':['math-mode','inline-math','display-math'],'fractions-powers':['fraction','root','superscript','subscript'],'equations-theorems':['equation','align','theorem','proof'],'basic-tables':['tabular','table-cell-separator','table-row-break'],'figures-captions':['figure','caption'],'labels-refs':['label','ref'],'bibliography-basics':['bibliography-model','citation'],'custom-commands':['custom-command'],'large-documents':['multi-file','project-architecture'],'debugging':['debugging'],'packages-preamble':['package-model','usepackage','preamble'],'document-classes-layout':['page-structure'],'typography-microtype':['spacing'],'matrices-cases':['matrix','cases'],'math-operators':['math-function','math-operator'],'theorem-numbering':['theorem'],'professional-tables':['professional-table'],'floats-placement':['float'],'biblatex-biber':['bib-file','biber'],'glossaries-index':['index'],'latexmk-workflow':['latexmk','professional-workflow']
};
for(const lesson of lessons){
  if(lesson.pedagogy)continue;
  const introduces=legacyIntroduces[lesson.id]??[];
  lesson.pedagogy={objective:lesson.subtitle,prerequisites:[],introduces,reinforces:[],misconceptions:['Используйте конструкцию ради её смысловой роли, а не как ручной визуальный трюк.'],practiceObjective:`Применить тему «${lesson.title}» в структурно корректном исходнике.`,masteryCriteria:lesson.exercises.flatMap(exercise=>exercise.requirements).slice(0,3)};
}

const existingIds=new Set(lessons.map(lesson=>lesson.id));
let exerciseNumber=1;
const built:Lesson[]=[];
for(const spec of allSpecs){
  if(existingIds.has(spec.id))continue;
  const pedagogy:LessonPedagogy={objective:spec.objective,prerequisites:spec.prerequisites,introduces:spec.introduces,reinforces:spec.reinforces??[],misconceptions:spec.misconceptions,practiceObjective:spec.practiceObjective,masteryCriteria:spec.mastery};
  const lessonExercises:Exercise[]=spec.practice.map(item=>({id:`deep-${String(exerciseNumber++).padStart(3,'0')}`,lessonId:spec.id,category:spec.category,difficulty:spec.difficulty,mode:item.mode,title:item.title,instructions:item.instructions,requirements:item.requirements,starterCode:item.starter,validators:item.validators,hints:item.validators.map(rule=>rule.hint).slice(0,3),solution:item.solution,concepts:[...spec.introduces,...(spec.reinforces??[])],prerequisites:spec.prerequisites}));
  built.push({id:spec.id,moduleId:spec.moduleId,number:0,title:spec.title,subtitle:spec.subtitle,difficulty:spec.difficulty,theory:[],content:spec.content,pedagogy,examples:spec.examples.map((example,index)=>({id:`${spec.id}-example-${index+1}`,...example})),exercises:lessonExercises,relatedCommands:spec.commands,projectStage:spec.projectStage});
}
const foundationLessons=built.filter(lesson=>lesson.moduleId==='foundation');
const gapLessons=built.filter(lesson=>lesson.moduleId!=='foundation');
const foundationModule:CourseModule={id:'foundation',number:1,title:'Основа',description:'Что такое LaTeX, как он читает исходник и почему синтаксис устроен именно так.',prerequisites:'Не требуются',difficulty:'Начальный',lessons:foundationLessons};
const grouped=new Map<string,Lesson[]>();
for(const lesson of gapLessons){const group=grouped.get(lesson.moduleId)??[];group.push(lesson);grouped.set(lesson.moduleId,group);}
const moduleMeta=new Map(allSpecs.map(spec=>[spec.moduleId,{title:spec.moduleTitle,description:spec.moduleDescription,difficulty:spec.difficulty}]));
const extraModules:CourseModule[]=[...grouped].map(([id,group])=>({id,number:0,title:moduleMeta.get(id)?.title??id,description:moduleMeta.get(id)?.description??'',prerequisites:'См. зависимости уроков',difficulty:moduleMeta.get(id)?.difficulty??'Средний',lessons:group}));
modules.unshift(foundationModule);modules.push(...extraModules);
lessons.unshift(...foundationLessons);lessons.push(...gapLessons);
exercises.unshift(...foundationLessons.flatMap(lesson=>lesson.exercises));exercises.push(...gapLessons.flatMap(lesson=>lesson.exercises));
modules.forEach((module,index)=>{module.number=index+1;});lessons.forEach((lesson,index)=>{lesson.number=index+1;});
lessonIndex.clear();lessons.forEach((lesson,index)=>lessonIndex.set(lesson.id,index));
