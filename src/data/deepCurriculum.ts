import { exercises, lessonIndex, lessons, modules } from './courses';
import type { CourseModule, Difficulty, Exercise, LearningBlock, Lesson, LessonPedagogy, PracticeCategory, ValidatorRule } from '../types';

const DOC=(body:string,preamble='')=>`\\documentclass{article}\n${preamble}${preamble?'\n':''}\\begin{document}\n${body}\n\\end{document}`;
const compile:ValidatorRule={type:'compiles',message:'Исходник компилируется.',hint:'Исправьте первую структурную ошибку и повторите компиляцию.'};
const balanced:ValidatorRule={type:'balancedEnvironments',message:'Окружения согласованы.',hint:'Каждому \\begin{name} нужен \\end{name} с тем же именем.'};
const has=(value:string,message:string,hint:string):ValidatorRule=>({type:'containsText',value,message,hint});
const command=(value:string,message:string,hint:string):ValidatorRule=>({type:'command',value,message,hint});
const environment=(value:string,message:string,hint:string):ValidatorRule=>({type:'environment',value,message,hint});
const pkg=(value:string,message:string,hint:string):ValidatorRule=>({type:'package',value,message,hint});

type ExerciseSpec={title:string;instructions:string;requirements:string[];starter:string;solution:string;validators:ValidatorRule[];mode:Exercise['mode']};
type LessonSpec={
  id:string;moduleId:string;moduleTitle:string;moduleDescription:string;title:string;subtitle:string;difficulty:Difficulty;category:PracticeCategory;
  objective:string;prerequisites:string[];introduces:string[];reinforces?:string[];misconceptions:string[];practiceObjective:string;mastery:string[];
  commands:string[];content:LearningBlock[];examples:Array<{title:string;description:string;code:string}>;practice:ExerciseSpec[];projectStage?:string;
};

const b=(id:string,type:LearningBlock['type'],data:Omit<Extract<LearningBlock,{type:typeof type}>,'id'|'type'>):LearningBlock=>({id,type,...data} as LearningBlock);

const foundation:LessonSpec[]=[
  {
    id:'what-is-latex',moduleId:'foundation',moduleTitle:'Основа LaTeX',moduleDescription:'Ментальная модель до синтаксиса.',title:'Что такое LaTeX',subtitle:'Сначала модель документа, затем команды.',difficulty:'Начальный',category:'Основы',
    objective:'Понять, что LaTeX — система подготовки документов, а не визуальный редактор.',prerequisites:[],introduces:['latex-model'],misconceptions:['LaTeX не является редактором, где внешний вид правят мышью.','Исходник и итоговый PDF — разные представления одного документа.'],practiceObjective:'Отличать исходник, систему набора и результат.',mastery:['Объясняет роль исходника.','Объясняет, что форматирование выполняет система набора.'],commands:[],
    content:[
      b('what-1','concept',{title:'Идея',body:'В LaTeX автор описывает структуру и смысл: где раздел, формула, ссылка или таблица. Система набора решает, как эти элементы должны выглядеть на странице.'}),
      b('what-2','flow',{title:'Главная модель',body:'У документа есть три разные стадии.',steps:[{label:'Исходник',detail:'Текст и структурные инструкции.'},{label:'LaTeX',detail:'Читает инструкции и выполняет набор.'},{label:'Документ',detail:'Получившийся PDF или другой формат.'}]}),
      b('what-3','comparison',{title:'LaTeX и WYSIWYG',body:'Разница не в «сложности редактора», а в способе мышления.',left:{label:'Визуальный редактор',code:'Сделать строку крупнее и жирнее',note:'Автор напрямую меняет внешний вид.'},right:{label:'LaTeX',code:'Обозначить строку как раздел',note:'Автор задаёт роль; стиль применяет система.'}}),
      b('what-4','checkpoint',{title:'Проверка модели',prompt:'Кто в LaTeX в первую очередь отвечает за точный внешний вид заголовка — автор каждой строки или правила документа?',answer:'Правила документа. Автор сообщает, что это заголовок; класс и настройки определяют набор.'})
    ],
    examples:[{title:'Один смысл — два представления',description:'Исходник содержит структуру, результат показывает её типографически.',code:'\\section{Методология}'}],
    practice:[
      {title:'Назовите исходник',instructions:'Оставьте только термин, обозначающий текстовый файл, который читает LaTeX.',requirements:['Ответ: source.tex'],starter:'PDF / source.tex / compiler',solution:'source.tex',validators:[has('source.tex','Выбран исходный файл.','Исходник обычно имеет расширение .tex.')],mode:'Объяснить'},
      {title:'Назовите обработчик',instructions:'Оставьте компонент, который преобразует исходник в документ.',requirements:['Ответ: compiler'],starter:'source / compiler / PDF',solution:'compiler',validators:[has('compiler','Выбран компилятор.','Между source и PDF находится процесс компиляции.')],mode:'Объяснить'},
      {title:'Соберите цепочку',instructions:'Запишите три стадии в правильном порядке.',requirements:['source.tex → compiler → document.pdf'],starter:'document.pdf → source.tex → compiler',solution:'source.tex → compiler → document.pdf',validators:[has('source.tex → compiler → document.pdf','Цепочка составлена правильно.','Сначала исходник, затем обработка, затем результат.')],mode:'Архитектура'}
    ]
  },
  {
    id:'compilation-model',moduleId:'foundation',moduleTitle:'Основа LaTeX',moduleDescription:'Ментальная модель до синтаксиса.',title:'Как работает компиляция',subtitle:'Почему изменение исходника требует новой сборки.',difficulty:'Начальный',category:'Основы',
    objective:'Понимать компиляцию как отдельный шаг между редактированием и результатом.',prerequisites:['latex-model'],introduces:['compiler'],reinforces:['latex-model'],misconceptions:['PDF не меняется сам по себе после редактирования .tex.','Ошибка компиляции относится к обработке исходника, а не к «сломавшемуся PDF».'],practiceObjective:'Читать простую цепочку сборки и различать стадии.',mastery:['Объясняет, что компилятор читает source.tex.','Понимает, когда возникает ошибка сборки.'],commands:[],
    content:[
      b('compile-1','concept',{title:'Компиляция',body:'Компиляция — обработка исходника LaTeX-движком. Движок читает текст и команды, проверяет структуру и строит страницы результата.'}),
      b('compile-2','flow',{title:'Один цикл работы',steps:[{label:'1. Редактирование',detail:'Вы меняете .tex.'},{label:'2. Компиляция',detail:'Движок разбирает исходник.'},{label:'3. Диагностика',detail:'Ошибка или предупреждение, если что-то не согласовано.'},{label:'4. Результат',detail:'Обновлённый документ.'}]}),
      b('compile-3','warning',{title:'Ошибка — это информация',body:'Сообщение компилятора описывает место, где он перестал понимать структуру. Сильная стратегия — исправлять первую содержательную ошибку, а не случайно менять строки.'}),
      b('compile-4','checkpoint',{title:'Проверка',prompt:'Вы исправили опечатку в source.tex, но PDF не изменился. Какой шаг пропущен?',answer:'Нужно снова запустить компиляцию.'})
    ],
    examples:[{title:'Цикл сборки',description:'Редактирование и компиляция — разные действия.',code:'source.tex  →  LaTeX engine  →  document.pdf'}],
    practice:[
      {title:'Пропущенный шаг',instructions:'Вставьте слово между source.tex и document.pdf.',requirements:['compiler'],starter:'source.tex → ______ → document.pdf',solution:'source.tex → compiler → document.pdf',validators:[has('compiler','Компилятор поставлен между исходником и результатом.','Это отдельный этап обработки.')],mode:'Дополнить документ'},
      {title:'Где искать причину',instructions:'Оставьте строку, которую нужно исправлять при синтаксической ошибке.',requirements:['source.tex'],starter:'document.pdf\nsource.tex',solution:'source.tex',validators:[has('source.tex','Причина ищется в исходнике.','Диагностика относится к тому, что читает компилятор.')],mode:'Объяснить'},
      {title:'Порядок диагностики',instructions:'Запишите короткое правило: какую ошибку в логе проверяют первой.',requirements:['первая ошибка'],starter:'',solution:'первая содержательная ошибка',validators:[has('первая','Вы выбрали начало цепочки ошибок.','Одна ранняя ошибка часто порождает последующие сообщения.')],mode:'Объяснить'}
    ]
  },
  {
    id:'tex-source',moduleId:'foundation',moduleTitle:'Основа LaTeX',moduleDescription:'Ментальная модель до синтаксиса.',title:'Исходный .tex-файл',subtitle:'Обычный текст плюс управляющие конструкции.',difficulty:'Начальный',category:'Основы',
    objective:'Различать обычный текст документа и управляющий синтаксис в исходнике.',prerequisites:['compiler'],introduces:['source-file'],reinforces:['latex-model'],misconceptions:['.tex — не бинарный формат.','Перенос строки исходника не всегда означает новый абзац в результате.'],practiceObjective:'Распознавать обычный текст и управляющие конструкции.',mastery:['Знает расширение .tex.','Понимает, что файл можно хранить как обычный текст.'],commands:[],
    content:[
      b('source-1','concept',{title:'Что хранится в .tex',body:'Файл .tex — обычный текст. В нём соседствуют публикуемый текст и инструкции LaTeX. Поэтому исходник легко сравнивать в Git, искать по нему и разбивать на несколько файлов.'}),
      b('source-2','example',{title:'Два вида содержимого',body:'Первая строка — инструкция, вторая — обычный текст.',code:'\\section{Метод}\nЭксперимент выполнялся при 20 °C.'}),
      b('source-3','explanation',{title:'Исходник не равен странице',body:'Пробелы и переносы в .tex нужны прежде всего для читаемости исходника. LaTeX интерпретирует их по собственным правилам набора.'}),
      b('source-4','checkpoint',{title:'Проверка',prompt:'Является ли .tex специальным графическим файлом?',answer:'Нет. Это текстовый файл, который содержит текст и инструкции LaTeX.'})
    ],
    examples:[{title:'Фрагмент научного исходника',description:'Структура и содержимое читаются без визуального редактора.',code:'\\section{Результаты}\nИзмеренное значение равно 42.'}],
    practice:[
      {title:'Расширение исходника',instructions:'Запишите типичное имя исходного файла LaTeX.',requirements:['paper.tex'],starter:'paper.___',solution:'paper.tex',validators:[has('.tex','Указано расширение .tex.','Исходные файлы LaTeX обычно заканчиваются на .tex.')],mode:'Дополнить документ'},
      {title:'Обычный текст',instructions:'Удалите управляющую строку и оставьте только публикуемый текст.',requirements:['Метод был воспроизводим.'],starter:'\\section{Вывод}\nМетод был воспроизводим.',solution:'Метод был воспроизводим.',validators:[has('Метод был воспроизводим.','Оставлен обычный текст.','Строка с обратным слешем — управляющая конструкция.')],mode:'Рефакторинг'},
      {title:'Управляющая строка',instructions:'Оставьте только строку, которая выглядит как инструкция LaTeX.',requirements:['\\section{Метод}'],starter:'\\section{Метод}\nЭксперимент повторён.',solution:'\\section{Метод}',validators:[command('section','Распознана команда section.','Команда начинается с обратного слеша.')],mode:'Объяснить'}
    ]
  },
  {
    id:'commands-foundation',moduleId:'foundation',moduleTitle:'Основа LaTeX',moduleDescription:'Ментальная модель до синтаксиса.',title:'Команды',subtitle:'Обратный слеш сообщает: дальше идёт инструкция.',difficulty:'Начальный',category:'Основы',
    objective:'Понимать анатомию команды до использования команд в документе.',prerequisites:['source-file'],introduces:['command'],reinforces:['source-file'],misconceptions:['Обратный слеш — часть синтаксиса, а не декоративный символ.','Название команды чувствительно к точному написанию.'],practiceObjective:'Распознавать имя команды и отличать команду от её данных.',mastery:['Находит имя команды.','Понимает роль обратного слеша.'],commands:['section'],
    content:[
      b('cmd-1','concept',{title:'Команда',body:'Команда сообщает LaTeX действие. Большинство текстовых команд начинается с обратного слеша, после которого идёт имя.'}),
      b('cmd-2','anatomy',{title:'Анатомия',source:'\\section{Introduction}',parts:[{token:'\\',label:'маркер команды',description:'Сообщает, что дальше идёт управляющая конструкция.'},{token:'section',label:'имя команды',description:'Определяет действие.'},{token:'{Introduction}',label:'данные',description:'Значение, с которым работает команда; подробно — в следующем уроке.'}]}),
      b('cmd-3','mistake',{title:'Реальная ошибка',body:'Если имя написано неверно, компилятор не узнает команду.',code:'\\secton{Метод}',correction:'\\section{Метод}'}),
      b('cmd-4','checkpoint',{title:'Проверка',prompt:'Что в записи \\section{Метод} является именем команды?',answer:'section. Обратный слеш вводит команду, section — её имя.'})
    ],
    examples:[{title:'Структурная команда',description:'Команда выражает роль элемента, а не ручной размер шрифта.',code:'\\section{Introduction}'}],
    practice:[
      {title:'Исправьте имя команды',instructions:'Исправьте опечатку.',requirements:['\\section'],starter:'\\secton{Метод}',solution:'\\section{Метод}',validators:[command('section','Имя команды исправлено.','Правильное имя — section.')],mode:'Исправить ошибку'},
      {title:'Добавьте маркер команды',instructions:'Превратите section в команду LaTeX.',requirements:['Обратный слеш перед section'],starter:'section{Результаты}',solution:'\\section{Результаты}',validators:[command('section','Получилась команда section.','Перед именем команды нужен \\ .')],mode:'Дополнить документ'},
      {title:'Отделите имя',instructions:'Оставьте только имя команды без обратного слеша и аргумента.',requirements:['section'],starter:'\\section{Introduction}',solution:'section',validators:[has('section','Имя команды указано.','Не включайте значение аргумента.')],mode:'Объяснить'}
    ]
  },
  {
    id:'arguments-foundation',moduleId:'foundation',moduleTitle:'Основа LaTeX',moduleDescription:'Ментальная модель до синтаксиса.',title:'Аргументы',subtitle:'Фигурные скобки обязательны, квадратные — задают параметры.',difficulty:'Начальный',category:'Основы',
    objective:'Различать обязательные и необязательные аргументы команды.',prerequisites:['command'],introduces:['required-argument','optional-argument','grouping'],reinforces:['command'],misconceptions:['Фигурные скобки — синтаксическая группировка, а не печатаемые круглые скобки.','Квадратные скобки не заменяют обязательный аргумент.'],practiceObjective:'Разбирать команды на имя, optional argument и required argument.',mastery:['Разбирает \\section{...}.','Разбирает \\documentclass[12pt]{article}.'],commands:['section','documentclass'],
    content:[
      b('arg-1','concept',{title:'Обязательный аргумент',body:'Фигурные скобки передают значение, без которого команда не имеет полного смысла. В \\section{Introduction} текст Introduction — обязательный аргумент.'}),
      b('arg-2','anatomy',{title:'Команда с обязательным аргументом',source:'\\section{Introduction}',parts:[{token:'\\section',label:'command',description:'Что сделать.'},{token:'{...}',label:'required argument',description:'Обязательное значение.'},{token:'Introduction',label:'value',description:'Конкретное содержимое аргумента.'}]}),
      b('arg-3','concept',{title:'Необязательный аргумент',body:'Квадратные скобки передают дополнительную настройку. Если её нет, команда использует значение по умолчанию.'}),
      b('arg-4','anatomy',{title:'Два вида аргументов',source:'\\documentclass[12pt]{article}',parts:[{token:'\\documentclass',label:'command',description:'Выбор класса документа.'},{token:'[12pt]',label:'optional argument',description:'Дополнительная настройка размера.'},{token:'{article}',label:'required argument',description:'Сам класс документа.'}]}),
      b('arg-5','checkpoint',{title:'Проверка',prompt:'Что означает {article} в \\documentclass[12pt]{article}?',answer:'Это обязательный аргумент команды documentclass: выбранный класс документа.'})
    ],
    examples:[{title:'Аргументы не взаимозаменяемы',description:'Опция и обязательное значение занимают разные позиции.',code:'\\documentclass[12pt]{article}'}],
    practice:[
      {title:'Добавьте обязательный аргумент',instructions:'Передайте section значение Method.',requirements:['\\section{Method}'],starter:'\\section',solution:'\\section{Method}',validators:[has('\\section{Method}','Аргумент передан в фигурных скобках.','После имени команды добавьте {Method}.')],mode:'Дополнить документ'},
      {title:'Добавьте опцию',instructions:'Добавьте размер 12pt классу article.',requirements:['[12pt] перед {article}'],starter:'\\documentclass{article}',solution:'\\documentclass[12pt]{article}',validators:[{type:'documentClassOption',value:'12pt',message:'Опция 12pt добавлена.',hint:'Необязательные аргументы записываются в [...].'}],mode:'Дополнить документ'},
      {title:'Исправьте тип скобок',instructions:'Исправьте запись обязательного аргумента section.',requirements:['Фигурные скобки'],starter:'\\section[Method]',solution:'\\section{Method}',validators:[has('\\section{Method}','Использованы фигурные скобки.','Название раздела — обязательный аргумент.')],mode:'Исправить ошибку'}
    ]
  },
  {
    id:'environments-foundation',moduleId:'foundation',moduleTitle:'Основа LaTeX',moduleDescription:'Ментальная модель до синтаксиса.',title:'Окружения',subtitle:'Структурная область имеет начало, содержимое и конец.',difficulty:'Начальный',category:'Основы',
    objective:'Понять универсальный шаблон begin/content/end до знакомства с document, lists и equations.',prerequisites:['command','required-argument'],introduces:['environment'],reinforces:['command','grouping'],misconceptions:['begin и end — не независимые команды: они образуют пару.','Имена открывающего и закрывающего окружения должны совпадать.'],practiceObjective:'Согласовывать пары begin/end.',mastery:['Воспроизводит шаблон окружения.','Находит несовпадающие имена.'],commands:['begin','end'],
    content:[
      b('env-1','concept',{title:'Модель окружения',body:'Окружение задаёт структурный регион. Всё между begin и соответствующим end обрабатывается по правилам этого окружения.'}),
      b('env-2','syntax',{title:'Универсальный шаблон',body:'Имя в begin и end должно быть одинаковым.',code:'\\begin{name}\ncontent\n\\end{name}'}),
      b('env-3','anatomy',{title:'Три части',source:'\\begin{itemize}\n  ...\n\\end{itemize}',parts:[{token:'\\begin{itemize}',label:'начало',description:'Открывает структурную область.'},{token:'...',label:'содержимое',description:'Подчиняется правилам окружения.'},{token:'\\end{itemize}',label:'конец',description:'Закрывает ту же область.'}]}),
      b('env-4','mistake',{title:'Несогласованная пара',body:'Открыт itemize, но закрыт enumerate — структура нарушена.',code:'\\begin{itemize}\n...\n\\end{enumerate}',correction:'\\begin{itemize}\n...\n\\end{itemize}'}),
      b('env-5','checkpoint',{title:'Проверка',prompt:'Что нужно проверить первым, если сообщение говорит о неожиданном \\end?',answer:'Совпадает ли имя с соответствующим \\begin и правильно ли вложены окружения.'})
    ],
    examples:[{title:'Одна модель — много применений',description:'document, itemize, equation, figure и table используют один и тот же паттерн.',code:'\\begin{equation}\nE=mc^2\n\\end{equation}'}],
    practice:[
      {title:'Закройте окружение',instructions:'Добавьте закрывающую строку itemize.',requirements:['\\end{itemize}'],starter:'\\begin{itemize}\n\\item Первый',solution:'\\begin{itemize}\n\\item Первый\n\\end{itemize}',validators:[environment('itemize','Окружение itemize закрыто.','Добавьте end с тем же именем.'),balanced],mode:'Дополнить документ'},
      {title:'Исправьте пару',instructions:'Согласуйте begin/end.',requirements:['Оба имени itemize'],starter:'\\begin{itemize}\n\\item A\n\\end{enumerate}',solution:'\\begin{itemize}\n\\item A\n\\end{itemize}',validators:[environment('itemize','Пара согласована.','Закройте itemize как itemize.'),balanced],mode:'Исправить ошибку'},
      {title:'Соберите шаблон',instructions:'Создайте пустое окружение equation.',requirements:['begin equation','end equation'],starter:'',solution:'\\begin{equation}\n\\end{equation}',validators:[environment('equation','Создано окружение equation.','Используйте одинаковое имя в begin и end.'),balanced],mode:'Написать код'}
    ]
  },
  {
    id:'document-structure-foundation',moduleId:'foundation',moduleTitle:'Основа LaTeX',moduleDescription:'Ментальная модель до синтаксиса.',title:'Каркас документа',subtitle:'Класс задаёт правила, document ограничивает публикуемое содержимое.',difficulty:'Начальный',category:'Основы',
    objective:'Понять две обязательные роли минимального документа до самостоятельного набора.',prerequisites:['environment','required-argument'],introduces:['document-class','document-environment'],reinforces:['command','environment'],misconceptions:['documentclass и document — не одно и то же.','Текст до begin{document} обычно не является содержимым страницы.'],practiceObjective:'Распознавать класс и главное окружение.',mastery:['Объясняет роль documentclass.','Объясняет роль document environment.'],commands:['documentclass','begin','end'],
    content:[
      b('structure-1','concept',{title:'Две разные роли',body:'Команда documentclass выбирает базовые правила документа. Окружение document отмечает область, содержимое которой должно попасть в результат.'}),
      b('structure-2','source-output',{title:'Минимальный каркас',body:'Пока не нужно запоминать строку целиком: прочитайте её как две уже знакомые конструкции — команда и окружение.',code:DOC('Текст документа.')}),
      b('structure-3','anatomy',{title:'Читаем сверху вниз',source:'\\documentclass{article}\n\\begin{document}\nТекст\n\\end{document}',parts:[{token:'\\documentclass{article}',label:'класс',description:'Выбирает базовую модель документа.'},{token:'\\begin{document}',label:'начало тела',description:'Открывает публикуемую область.'},{token:'Текст',label:'содержимое',description:'То, что будет набрано.'},{token:'\\end{document}',label:'конец тела',description:'Закрывает публикуемую область.'}]}),
      b('structure-4','checkpoint',{title:'Проверка',prompt:'Какая строка определяет, где начинается фактическое содержимое документа?',answer:'\\begin{document}.'})
    ],
    examples:[{title:'Каркас article',description:'Никаких пакетов и форматирования — только необходимые роли.',code:DOC('Наблюдение подтверждено.')}],
    practice:[
      {title:'Найдите класс',instructions:'Оставьте строку, которая выбирает тип документа.',requirements:['\\documentclass{article}'],starter:'\\documentclass{article}\n\\begin{document}',solution:'\\documentclass{article}',validators:[{type:'documentClass',value:'article',message:'Класс article найден.',hint:'Класс задаётся documentclass.'}],mode:'Объяснить'},
      {title:'Закройте document',instructions:'Добавьте недостающий конец главного окружения.',requirements:['\\end{document}'],starter:'\\documentclass{article}\n\\begin{document}\nТекст',solution:DOC('Текст'),validators:[environment('document','Главное окружение закрыто.','Добавьте \\end{document}.'),balanced],mode:'Исправить ошибку'},
      {title:'Соберите роли',instructions:'Восстановите минимальный каркас из уже известных конструкций.',requirements:['article','document environment'],starter:'',solution:DOC(''),validators:[{type:'documentClass',value:'article',message:'Выбран article.',hint:'Начните с documentclass.'},environment('document','Создано окружение document.','Добавьте begin/end document.'),balanced],mode:'Собрать документ'}
    ]
  },
  {
    id:'preamble-body-foundation',moduleId:'foundation',moduleTitle:'Основа LaTeX',moduleDescription:'Ментальная модель до синтаксиса.',title:'Преамбула и тело',subtitle:'Конфигурация отделена от содержимого.',difficulty:'Начальный',category:'Основы',
    objective:'Разделять настройки документа и публикуемое содержимое.',prerequisites:['document-class','document-environment'],introduces:['preamble','document-body'],reinforces:['document-environment'],misconceptions:['Преамбула — не «верх страницы» PDF.','Настройки пакетов не следует помещать внутрь document.'],practiceObjective:'Правильно размещать конфигурацию и содержимое.',mastery:['Указывает границу преамбулы.','Правильно размещает настройки до begin{document}.'],commands:['documentclass','begin','end'],
    content:[
      b('preamble-1','syntax',{title:'Граница',body:'Преамбула находится до begin{document}; тело — внутри document.',code:'\\documentclass{article}\n% PREAMBLE\n\\begin{document}\n% DOCUMENT BODY\n\\end{document}'}),
      b('preamble-2','concept',{title:'Преамбула',body:'Здесь живут конфигурация, пакеты, метаданные и общие определения. Они задают правила для последующего содержимого.'}),
      b('preamble-3','concept',{title:'Тело документа',body:'Здесь находятся разделы, обычный текст, формулы, рисунки, таблицы и другие публикуемые элементы.'}),
      b('preamble-4','comparison',{title:'Правильное место',left:{label:'Преамбула',code:'\\usepackage{amsmath}',note:'Настройка возможностей документа.'},right:{label:'Тело',code:'\\section{Method}',note:'Фактическая структура публикации.'}}),
      b('preamble-5','checkpoint',{title:'Проверка',prompt:'Где должна находиться команда подключения пакета?',answer:'В преамбуле, до \\begin{document}.'})
    ],
    examples:[{title:'Чёткое разделение',description:'Настройка выше, содержимое ниже.',code:'\\documentclass{article}\n% configuration\n\\begin{document}\n\\section{Introduction}\nText.\n\\end{document}'}],
    practice:[
      {title:'Перенесите настройку',instructions:'Переместите usepackage до begin{document}.',requirements:['usepackage в преамбуле'],starter:'\\documentclass{article}\n\\begin{document}\n\\usepackage{amsmath}\nText\n\\end{document}',solution:'\\documentclass{article}\n\\usepackage{amsmath}\n\\begin{document}\nText\n\\end{document}',validators:[pkg('amsmath','Пакет присутствует.','Подключите amsmath.'),{type:'regex',value:'\\\\usepackage\\{amsmath\\}[\\s\\S]*\\\\begin\\{document\\}',message:'Пакет расположен до тела.',hint:'usepackage должен находиться до begin{document}.'}],mode:'Рефакторинг'},
      {title:'Определите тело',instructions:'Оставьте только публикуемый текст.',requirements:['Experimental result.'],starter:'\\documentclass{article}\n\\begin{document}\nExperimental result.\n\\end{document}',solution:'Experimental result.',validators:[has('Experimental result.','Выделено содержимое тела.','Это текст между begin и end document.')],mode:'Объяснить'},
      {title:'Соберите границу',instructions:'Добавьте комментарии PREAMBLE и BODY в правильные области.',requirements:['PREAMBLE до begin','BODY после begin'],starter:DOC('Text'),solution:'\\documentclass{article}\n% PREAMBLE\n\\begin{document}\n% BODY\nText\n\\end{document}',validators:[{type:'regex',value:'PREAMBLE[\\s\\S]*\\\\begin\\{document\\}[\\s\\S]*BODY',message:'Границы отмечены правильно.',hint:'PREAMBLE должен быть выше begin{document}.'}],mode:'Архитектура'}
    ]
  },
  {
    id:'packages-foundation',moduleId:'foundation',moduleTitle:'Основа LaTeX',moduleDescription:'Ментальная модель до синтаксиса.',title:'Пакеты',subtitle:'Ядро остаётся компактным, возможности подключаются по необходимости.',difficulty:'Начальный',category:'Основы',
    objective:'Понимать, зачем существуют пакеты и почему некоторые команды без них неизвестны.',prerequisites:['preamble','optional-argument'],introduces:['package-model','usepackage'],reinforces:['preamble','command'],misconceptions:['usepackage не следует копировать без понимания роли пакета.','Команда из пакета может быть undefined, если пакет не подключён.'],practiceObjective:'Подключать пакет в преамбуле и связывать его с возможностью.',mastery:['Объясняет модель core + packages.','Подключает пакет до begin{document}.'],commands:['usepackage'],
    content:[
      b('packages-1','flow',{title:'Модель расширений',steps:[{label:'LaTeX core',detail:'Базовая структура и набор.'},{label:'+ package',detail:'Дополнительные команды и окружения.'},{label:'document',detail:'Использует подключённые возможности.'}]}),
      b('packages-2','anatomy',{title:'Подключение пакета',source:'\\usepackage{amsmath}',parts:[{token:'\\usepackage',label:'command',description:'Подключить расширение.'},{token:'{amsmath}',label:'required argument',description:'Имя пакета.'}]}),
      b('packages-3','syntax',{title:'Параметры пакета',body:'Как и у других команд, необязательные параметры идут в квадратных скобках.',code:'\\usepackage[margin=25mm]{geometry}'}),
      b('packages-4','mistake',{title:'Почему команда неизвестна',body:'Если окружение align используется без amsmath, компилятор может сообщить, что конструкция недоступна. Причина — отсутствующая зависимость, а не сама идея выравнивания.',code:'\\begin{align}\na &= b\n\\end{align}',correction:'\\usepackage{amsmath} % в преамбуле'}),
      b('packages-5','checkpoint',{title:'Проверка',prompt:'Почему пакет подключают в преамбуле, а не в середине текста?',answer:'Пакет изменяет возможности и настройки документа до обработки его содержимого.'})
    ],
    examples:[{title:'Минимальная зависимость',description:'amsmath подключается только потому, что документ использует его математические окружения.',code:'\\documentclass{article}\n\\usepackage{amsmath}\n\\begin{document}\n...\n\\end{document}'}],
    practice:[
      {title:'Подключите amsmath',instructions:'Добавьте пакет в преамбулу.',requirements:['\\usepackage{amsmath}'],starter:DOC('Text'),solution:DOC('Text','\\usepackage{amsmath}'),validators:[pkg('amsmath','amsmath подключён.','Добавьте usepackage до begin{document}.'),compile],mode:'Дополнить документ'},
      {title:'Исправьте место пакета',instructions:'Перенесите graphicx в преамбулу.',requirements:['graphicx до begin document'],starter:'\\documentclass{article}\n\\begin{document}\n\\usepackage{graphicx}\n\\end{document}',solution:'\\documentclass{article}\n\\usepackage{graphicx}\n\\begin{document}\n\\end{document}',validators:[pkg('graphicx','graphicx подключён.','Используйте usepackage{graphicx}.'),{type:'regex',value:'\\\\usepackage\\{graphicx\\}[\\s\\S]*\\\\begin\\{document\\}',message:'Пакет находится в преамбуле.',hint:'Переместите строку выше begin{document}.'}],mode:'Исправить ошибку'},
      {title:'Выберите зависимость',instructions:'Подключите пакет, который предоставляет align.',requirements:['amsmath'],starter:'\\documentclass{article}\n\\begin{document}\n\\begin{align}\na&=b\n\\end{align}\n\\end{document}',solution:'\\documentclass{article}\n\\usepackage{amsmath}\n\\begin{document}\n\\begin{align}\na&=b\n\\end{align}\n\\end{document}',validators:[pkg('amsmath','Выбран пакет amsmath.','align относится к amsmath.')],mode:'Архитектура'}
    ]
  },
  {
    id:'errors-foundation',moduleId:'foundation',moduleTitle:'Основа LaTeX',moduleDescription:'Ментальная модель до синтаксиса.',title:'Как читать ошибки',subtitle:'Диагностика описывает непонятную для компилятора структуру.',difficulty:'Начальный',category:'Отладка',
    objective:'Сформировать спокойную и системную модель диагностики до первой реальной отладки.',prerequisites:['compiler','command','environment','grouping'],introduces:['compile-error','undefined-control-sequence','brace-balance','environment-balance'],reinforces:['compiler','command','environment'],misconceptions:['Длинный лог не означает много независимых ошибок.','Нельзя исправлять ошибку, не понимая, какую структуру ожидал компилятор.'],practiceObjective:'Связывать тип ошибки с наиболее вероятной причиной.',mastery:['Объясняет Undefined control sequence.','Проверяет скобки и пары окружений.'],commands:['section','begin','end'],
    content:[
      b('error-1','concept',{title:'Первая содержательная ошибка',body:'Одна ранняя проблема может вызвать каскад последующих сообщений. Поэтому сначала исправляйте первую понятную ошибку в логе и только затем компилируйте снова.'}),
      b('error-2','mistake',{title:'Undefined control sequence',body:'Компилятор увидел конструкцию, похожую на команду, но не знает её. Частая причина — опечатка или отсутствующий пакет.',code:'\\secton{Title}',correction:'\\section{Title}'}),
      b('error-3','mistake',{title:'Missing } inserted',body:'Компилятор ожидал закрывающую фигурную скобку. Ищите незавершённый аргумент рядом с указанным местом.',code:'\\section{Method',correction:'\\section{Method}'}),
      b('error-4','mistake',{title:'Environment mismatch',body:'Если end не соответствует открытому begin, восстановите структуру окружений.',code:'\\begin{itemize}\n\\end{enumerate}',correction:'\\begin{itemize}\n\\end{itemize}'}),
      b('error-5','checkpoint',{title:'Проверка',prompt:'Что означает Undefined control sequence в практическом смысле?',answer:'Компилятор встретил неизвестную команду: проверьте написание и нужный пакет.'})
    ],
    examples:[{title:'Чтение ошибки',description:'Сначала определяется тип нарушения, затем минимальное исправление.',code:'\\secton{Results}  % typo → \\section{Results}'}],
    practice:[
      {title:'Undefined control sequence',instructions:'Исправьте неизвестную команду.',requirements:['\\section{Results}'],starter:'\\secton{Results}',solution:'\\section{Results}',validators:[command('section','Команда распознана.', 'Исправьте secton на section.')],mode:'Debug'},
      {title:'Missing brace',instructions:'Закройте обязательный аргумент.',requirements:['Сбалансированные {}'],starter:'\\section{Method',solution:'\\section{Method}',validators:[has('\\section{Method}','Аргумент закрыт.', 'Добавьте } после Method.')],mode:'Исправить ошибку'},
      {title:'Environment mismatch',instructions:'Исправьте закрывающее окружение.',requirements:['itemize закрывается itemize'],starter:'\\begin{itemize}\n\\item A\n\\end{enumerate}',solution:'\\begin{itemize}\n\\item A\n\\end{itemize}',validators:[environment('itemize','Окружение согласовано.','Закройте itemize.'),balanced],mode:'Исправить ошибку'}
    ]
  },
  {
    id:'first-document-foundation',moduleId:'foundation',moduleTitle:'Основа LaTeX',moduleDescription:'Ментальная модель до синтаксиса.',title:'Первый документ',subtitle:'Теперь каждая строка каркаса уже имеет объяснённую роль.',difficulty:'Начальный',category:'Основы',
    objective:'Самостоятельно собрать минимальный документ без необъяснённых конструкций.',prerequisites:['document-class','document-environment','preamble','document-body','package-model','compile-error'],introduces:[],reinforces:['document-class','document-environment','preamble','document-body'],misconceptions:['Не нужно добавлять пакеты, если документ их не использует.','Минимальный документ должен оставаться минимальным.'],practiceObjective:'Собрать, скомпилировать и объяснить каждую строку минимального article.',mastery:['Пишет минимальный документ по памяти.','Может объяснить роль каждой строки.'],commands:['documentclass','begin','end'],projectStage:'academic-paper:stage-1',
    content:[
      b('first-1','concept',{title:'Никакой магии',body:'В этой записи нет новой конструкции: documentclass — знакомая команда с аргументом, document — знакомое окружение, текст внутри — тело документа.'}),
      b('first-2','source-output',{title:'Минимальный рабочий документ',body:'Скомпилируйте и затем измените только текст тела.',code:DOC('Experimental result.')}),
      b('first-3','anatomy',{title:'Контрольный разбор',source:'\\documentclass{article}\n\\begin{document}\nExperimental result.\n\\end{document}',parts:[{token:'\\documentclass{article}',label:'configuration',description:'Выбор класса article.'},{token:'\\begin{document}',label:'body start',description:'Начало публикуемого содержимого.'},{token:'Experimental result.',label:'content',description:'Обычный текст.'},{token:'\\end{document}',label:'body end',description:'Конец главного окружения.'}]}),
      b('first-4','checkpoint',{title:'Foundation quality gate',prompt:'Можете ли вы объяснить: .tex, compilation, command, {}, [], environment, preamble, body, package и источник ошибки?',answer:'Если любой термин остаётся неясным, вернитесь к соответствующему foundation-уроку. Следующий блок будет использовать их без повторного объяснения.'})
    ],
    examples:[{title:'Первый академический фрагмент',description:'Реалистичный текст вместо Hello World.',code:DOC('The measurement was repeated three times.')}],
    practice:[
      {title:'Минимальный article',instructions:'Создайте минимальный документ article с одним предложением о результате эксперимента.',requirements:['article','document environment','Один абзац'],starter:'',solution:DOC('The experiment converged.'),validators:[{type:'documentClass',value:'article',message:'Выбран article.',hint:'Используйте documentclass.'},environment('document','Создано главное окружение.','Добавьте begin/end document.'),{type:'paragraph',message:'В теле есть текст.',hint:'Добавьте обычное предложение.'},balanced,compile],mode:'Собрать документ'},
      {title:'Уберите лишнюю зависимость',instructions:'Удалите пакет, который в документе не используется.',requirements:['Без amsmath'],starter:DOC('Observation complete.','\\usepackage{amsmath}'),solution:DOC('Observation complete.'),validators:[{type:'forbiddenText',value:'\\usepackage{amsmath}',message:'Лишний пакет удалён.',hint:'В минимальном документе amsmath не нужен.'},compile],mode:'Рефакторинг'},
      {title:'Восстановите каркас',instructions:'Исправьте документ так, чтобы он снова собирался.',requirements:['Класс','Главное окружение','Текст'],starter:'\\documentclass{article}\n\\begin{document}\nResult.',solution:DOC('Result.'),validators:[environment('document','document закрыт.','Добавьте end document.'),balanced,compile],mode:'Исправить ошибку'}
    ]
  }
];

const supplemental:LessonSpec[]=[
  atom('quotes-structure','text-deep','Текст: смысл и набор','Цитаты как структурный блок','quote и quotation вместо ручных отступов.','Базовый','Текст','quote',['environment','document-body'],['quote'],['environment'],
    'Цитата — структурный фрагмент, а не абзац, сдвинутый пробелами.',
    '\\begin{quote}\nA reproducible method is a reviewable method.\n\\end{quote}',
    'Не создавайте цитатный блок с повторяющимися \\hspace.',
    [['Короткая цитата','Создайте окружение quote.',environment('quote','Создан quote.','Используйте begin/end quote.'),DOC(''),DOC('\\begin{quote}\nA reproducible method is reviewable.\n\\end{quote}')],['Исправьте отступ','Замените ручной hspace на quote.',environment('quote','Использован структурный quote.','Удалите ручной отступ и создайте окружение.'),DOC('\\hspace{2cm} Important statement.'),DOC('\\begin{quote}\nImportant statement.\n\\end{quote}')],['Согласуйте окружение','Исправьте end.',environment('quote','Пара quote согласована.','Закройте quote тем же именем.'),'\\begin{quote}\nText\n\\end{quotation}','\\begin{quote}\nText\n\\end{quote}']]),
  atom('special-characters-deep','text-deep','Текст: смысл и набор','Специальные символы','Почему %, &, $, _, ^, # и ~ нельзя считать обычными знаками.','Базовый','Текст','escaping',['command'],['special-symbols','escaping'],['grouping'],
    'Некоторые символы управляют синтаксисом: % начинает комментарий, $ меняет режим, & разделяет ячейки, _ и ^ создают индексы.',
    'Стоимость: \\$100; доля: 25\\%; A\\&B.',
    'Не экранируйте символы механически: сначала поймите их роль в текущем контексте.',
    [['Процент','Выведите 25%.',has('25\\%','Процент экранирован.','Напишите \\%.'),DOC('Доля: 25%.'),DOC('Доля: 25\\%.')],['Амперсанд','Выведите A&B в обычном тексте.',has('A\\&B','Амперсанд экранирован.','Напишите \\& вне таблицы.'),DOC('A&B'),DOC('A\\&B')],['Доллар','Выведите знак валюты перед 100.',has('\\$100','Знак доллара экранирован.','Обычный $ открывает math mode.'),DOC('$100'),DOC('\\$100')]]),
  atom('source-spacing','text-deep','Текст: смысл и набор','Пробелы, строки и абзацы','Почему исходный перенос строки не равен новому абзацу.','Базовый','Текст','paragraph',['document-body'],['paragraph','spacing'],['source-file'],
    'Один перевод строки обычно ведёт себя как пробел. Новый смысловой абзац создаёт пустая строка.',
    'Первый абзац.\n\nВторой абзац.',
    'Не используйте \\\\ как обычную замену нового абзаца.',
    [['Два абзаца','Разделите текст пустой строкой.',has('\n\n','Есть граница абзаца.','Оставьте пустую строку между фрагментами.'),DOC('Первый. Второй.'),DOC('Первый.\n\nВторой.')],['Уберите ручной перенос','Замените \\\\ на новый абзац.',{type:'forbiddenText',value:'\\\\',message:'Ручной перенос удалён.',hint:'Для абзаца нужна пустая строка.'},DOC('Первый.\\\\\nВторой.'),DOC('Первый.\n\nВторой.')],['Не уплотняйте пробелами','Сведите серию пробелов к обычному тексту.',{type:'forbiddenText',value:'     ',message:'Ручное выравнивание пробелами убрано.',hint:'Не позиционируйте текст пробелами.'},DOC('Method     Result'),DOC('Method Result')]]),
  atom('math-symbols-deep','math-deep','Математика: от атомов к структуре','Математические символы','Команды символов внутри math mode.','Базовый','Математика','math-symbols',['math-mode','command'],['math-symbols'],['math-mode'],
    'Греческие буквы и математические отношения выражаются командами, чтобы получить правильный знак и интервалы.',
    '$\\alpha + \\beta \\leq 1$',
    'Не пишите alpha обычными буквами, если нужен математический символ α.',
    [['Греческая буква','Наберите alpha как математический символ.',command('alpha','Использована команда alpha.','В math mode напишите \\alpha.'),DOC('$a$'),DOC('$\\alpha$')],['Отношение','Используйте leq.',command('leq','Использован математический знак ≤.','Напишите \\leq.'),DOC('$x < 1$'),DOC('$x \\leq 1$')],['Две буквы','Наберите alpha + beta.',command('beta','Использована beta.','Добавьте \\beta.'),DOC('$\\alpha + b$'),DOC('$\\alpha + \\beta$')]]),
  atom('indices-groups','math-deep','Математика: от атомов к структуре','Индексы и группировка','Почему x_12 и x_{12} — разные структуры.','Базовый','Математика','superscript',['math-mode','grouping'],['superscript','subscript'],['grouping'],
    '^ и _ применяются к следующему токену. Составной индекс или степень обязательно группируется фигурными скобками.',
    '$x_{12}^{n+1}$',
    '$x_12$ означает нижний индекс 1, после которого идёт обычная 2; это не то же самое, что x_{12}.',
    [['Составной индекс','Исправьте x_12.',has('x_{12}','Индекс сгруппирован.','Заключите 12 в фигурные скобки.'),DOC('$x_12$'),DOC('$x_{12}$')],['Составная степень','Наберите x в степени n+1.',has('^{n+1}','Степень сгруппирована.','Используйте ^{n+1}.'),DOC('$x^n+1$'),DOC('$x^{n+1}$')],['Оба индекса','Наберите a_{ij}^{2}.',has('a_{ij}^{2}','Обе структуры заданы явно.','Сгруппируйте ij и степень.'),DOC('$a$'),DOC('$a_{ij}^{2}$')]]),
  atom('roots-deep','math-deep','Математика: от атомов к структуре','Корни','Обязательный аргумент и необязательная степень корня.','Базовый','Математика','root',['math-mode','optional-argument'],['root'],['grouping'],
    'sqrt берёт подкоренное выражение в фигурных скобках; необязательный аргумент задаёт степень корня.',
    '$\\sqrt{x^2+y^2},\quad \\sqrt[3]{x}$',
    'Квадратные скобки у sqrt не заменяют подкоренное выражение.',
    [['Квадратный корень','Наберите корень из x+1.',command('sqrt','Использован sqrt.','Напишите \\sqrt{x+1}.'),DOC('$x+1$'),DOC('$\\sqrt{x+1}$')],['Кубический корень','Добавьте степень 3.',has('\\sqrt[3]{x}','Степень корня задана как optional argument.','Используйте [3] перед {x}.'),DOC('$\\sqrt{x}$'),DOC('$\\sqrt[3]{x}$')],['Корень из дроби','Поместите frac внутрь sqrt.',command('frac','Дробь структурна.','Используйте frac внутри sqrt.'),DOC('$\\sqrt{a/b}$'),DOC('$\\sqrt{\\frac{a}{b}}$')]]),
  atom('functions-deep','math-deep','Математика: от атомов к структуре','Функции','sin, log и exp — операторы, а не произведение букв.','Средний','Математика','math-function',['math-symbols'],['math-function','math-operator'],['math-symbols'],
    'Стандартные функции набираются командами: это даёт прямое начертание и корректные математические интервалы.',
    '$\\sin x + \\log y$',
    '$sin x$ воспринимается как произведение переменных s·i·n.',
    [['Синус','Исправьте sin.',command('sin','Использована функция sin.','Напишите \\sin.'),DOC('$sin x$'),DOC('$\\sin x$')],['Логарифм','Используйте log.',command('log','Использована функция log.','Напишите \\log.'),DOC('$log x$'),DOC('$\\log x$')],['Предел','Наберите lim с индексом.',command('lim','Использован оператор lim.','Напишите \\lim_{n\\to\\infty}.'),DOC('$lim n$'),DOC('$\\lim_{n\\to\\infty} a_n$')]]),
  atom('equation-model','math-deep','Математика: от атомов к структуре','Уравнение как объект','Когда формуле нужен номер и ссылка.','Средний','Математика','equation',['display-math','environment','package-model'],['equation'],['display-math'],
    'equation делает формулу самостоятельным нумеруемым объектом. Если номер не нужен, используйте ненумеруемую форму, а не скрывайте номер вручную.',
    '\\begin{equation}\nE=mc^2\n\\end{equation}',
    'Не используйте equation для каждой короткой формулы в предложении.',
    [['Нумеруемая формула','Поместите E=mc^2 в equation.',environment('equation','Создан equation.','Используйте begin/end equation.'),DOC('E=mc^2'),DOC('\\begin{equation}\nE=mc^2\n\\end{equation}')],['Закройте equation','Исправьте незакрытое окружение.',environment('equation','equation закрыт.','Добавьте end equation.'),'\\begin{equation}\nE=mc^2','\\begin{equation}\nE=mc^2\n\\end{equation}'],['Не нумеруйте inline','Верните короткую формулу в строку.',{type:'inlineMath',message:'Использован inline math.',hint:'Для короткого выражения в предложении используйте $...$.'},DOC('\\begin{equation}x=1\\end{equation} — значение.'),DOC('Значение $x=1$ используется далее.')]]),
  atom('math-line-breaks','math-deep','Математика: от атомов к структуре','Строки многострочной формулы','\\ завершает строку только в подходящем окружении.','Средний','Математика','line-break-math',['equation','special-symbols'],['line-break-math'],['environment'],
    'В align и родственных окружениях двойной обратный слеш завершает текущую математическую строку. Это не общий способ создавать абзацы.',
    '\\begin{align}\na &= b \\\\\nc &= d\n\\end{align}',
    'В обычном тексте \\\\ не должен заменять смысловой абзац.',
    [['Две строки','Добавьте разрыв между двумя равенствами.',has('\\\\','Есть математический конец строки.','В align используйте \\\\.'),'\\begin{align}\na &= b c &= d\n\\end{align}','\\begin{align}\na &= b \\\\\nc &= d\n\\end{align}'],['Уберите перенос из абзаца','Замените \\\\ пустой строкой.',{type:'forbiddenText',value:'\\\\',message:'Перенос не используется как абзац.',hint:'Обычный абзац отделяется пустой строкой.'},DOC('First.\\\\\nSecond.'),DOC('First.\n\nSecond.')],['Закройте align','Согласуйте окружение.',environment('align','align согласован.','Используйте end align.'),'\\begin{align}\na&=b','\\begin{align}\na&=b\n\\end{align}']]),
  atom('alignment-points','math-deep','Математика: от атомов к структуре','Точки выравнивания','& задаёт логическую вертикаль в align.','Средний','Математика','alignment-point',['line-break-math'],['alignment-point','align'],['special-symbols'],
    'В align символ & отмечает позицию, по которой строки должны выровняться — обычно перед знаком отношения.',
    '\\begin{align}\nf(x) &= x^2+2x+1 \\\\\n     &= (x+1)^2\n\\end{align}',
    'Пробелы перед знаком равенства не создают устойчивого выравнивания.',
    [['Добавьте точки','Поставьте & перед = в обеих строках.',has('&=','Добавлена точка выравнивания.','Используйте &=.'),'\\begin{align}\na = b \\\\\nc = d\n\\end{align}','\\begin{align}\na &= b \\\\\nc &= d\n\\end{align}'],['Уберите пробелы','Замените ручное выравнивание на &.',has('&','Использована структурная точка.','Выравнивайте через &, не пробелами.'),'a       = b','a &= b'],['Две строки align','Соберите две согласованные строки.',environment('align','Использован align.','Создайте begin/end align.'),DOC('a=b\nc=d','\\usepackage{amsmath}'),DOC('\\begin{align}\na&=b \\\\\nc&=d\n\\end{align}','\\usepackage{amsmath}')]]),
  atom('delimiters-deep','math-deep','Математика: от атомов к структуре','Ограничители','Скобки как часть математической структуры.','Средний','Математика','delimiter',['math-mode','grouping'],['delimiter'],['math-mode'],
    'Обычные скобки достаточны для коротких выражений. left/right нужны, когда ограничитель должен масштабироваться по высокой конструкции.',
    '$\\left( \\frac{a}{b} \\right)$',
    'Не добавляйте left/right автоматически вокруг каждой пары скобок: это усложняет исходник без пользы.',
    [['Высокая дробь','Добавьте left/right вокруг дроби.',has('\\left(','Использован масштабируемый левый ограничитель.','Добавьте \\left(.'),DOC('$(\\frac{a}{b})$'),DOC('$\\left(\\frac{a}{b}\\right)$')],['Согласуйте right','Добавьте правый ограничитель.',has('\\right)','Пара left/right завершена.','Добавьте \\right).'),DOC('$\\left( x+1 )$'),DOC('$\\left(x+1\\right)$')],['Не переусложняйте','Для x+1 оставьте обычные скобки.',{type:'forbiddenText',value:'\\left',message:'Лишнее масштабирование удалено.',hint:'Для короткого выражения обычных скобок достаточно.'},DOC('$\\left(x+1\\right)$'),DOC('$(x+1)$')]]),
  atom('table-anatomy','structured-deep','Структурированный контент','Анатомия tabular','Столбцы, &, \\ — по одному понятию за раз.','Средний','Таблицы','tabular',['environment','special-symbols'],['tabular','table-cell-separator','table-row-break'],['environment'],
    'Аргумент tabular сначала описывает столбцы. В строке & разделяет ячейки, а \\\\ завершает строку.',
    '\\begin{tabular}{lr}\nMethod & Score \\\\\nA & 98 \\\\\n\\end{tabular}',
    'Число разделителей & должно соответствовать числу столбцов в каждой строке.',
    [['Два столбца','Создайте tabular с двумя столбцами.',environment('tabular','Создан tabular.','Используйте begin/end tabular.'),DOC(''),DOC('\\begin{tabular}{ll}\nA & B \\\\\n\\end{tabular}')],['Разделите ячейки','Добавьте & между Method и Score.',has('Method & Score','Ячейки разделены.','Используйте & внутри строки tabular.'),'\\begin{tabular}{ll}\nMethod Score \\\\\n\\end{tabular}','\\begin{tabular}{ll}\nMethod & Score \\\\\n\\end{tabular}'],['Завершите строку','Добавьте математически корректный конец строки таблицы.',has('\\\\','Строка завершена.','Используйте \\\\.'),'\\begin{tabular}{ll}\nA & B\nC & D\n\\end{tabular}','\\begin{tabular}{ll}\nA & B \\\\\nC & D \\\\\n\\end{tabular}']]),
  atom('captions-deep','structured-deep','Структурированный контент','Подписи','caption связывает смысл и нумерацию объекта.','Средний','Графика','caption',['figure'],['caption'],['figure'],
    'Подпись должна позволять понять рисунок или таблицу без поиска пояснения в соседнем абзаце. caption также участвует в нумерации объекта.',
    '\\begin{figure}\n\\centering\n\\includegraphics{result.pdf}\n\\caption{Experimental error by iteration.}\n\\end{figure}',
    'Не заменяйте caption обычным текстом под рисунком: потеряется структурная нумерация.',
    [['Добавьте подпись','Добавьте caption к figure.',command('caption','Добавлена структурная подпись.','Используйте \\caption{...}.'),DOC('\\begin{figure}\n\\end{figure}'),DOC('\\begin{figure}\n\\caption{Experimental result.}\n\\end{figure}')],['Исправьте ручной текст','Замените подпись-абзац на caption.',command('caption','Использован caption.','Перенесите текст в \\caption{...}.'),DOC('\\begin{figure}\nResult figure\n\\end{figure}'),DOC('\\begin{figure}\n\\caption{Result figure.}\n\\end{figure}')],['Подпись перед label','Расположите caption до label.',{type:'regex',value:'\\\\caption\\{[^}]+\\}[\\s\\S]*\\\\label\\{','message':'caption расположен до label.','hint':'Сначала caption, затем label.'},DOC('\\begin{figure}\n\\label{fig:r}\n\\caption{Result}\n\\end{figure}'),DOC('\\begin{figure}\n\\caption{Result}\n\\label{fig:r}\n\\end{figure}')]]),
  atom('reference-model-deep','structured-deep','Структурированный контент','Метки и ссылки как связь','Сначала объект получает label, затем текст обращается к нему через ref.','Средний','Основы','label',['section','compiler'],['label','ref'],['compiler'],
    'label создаёт устойчивый ключ объекта; ref запрашивает его номер. После перестановки разделов номер меняется автоматически, а связь остаётся.',
    '\\section{Method}\\label{sec:method}\nSee Section~\\ref{sec:method}.',
    'Не пишите «см. раздел 3» вручную: после редактирования это легко становится ложной ссылкой.',
    [['Добавьте label','Назначьте секции ключ sec:method.',command('label','Создан label.','Используйте \\label{sec:method}.'),DOC('\\section{Method}'),DOC('\\section{Method}\\label{sec:method}')],['Добавьте ref','Сошлитесь на sec:method.',command('ref','Использован ref.','Напишите \\ref{sec:method}.'),DOC('See Section 2.'),DOC('See Section~\\ref{sec:method}.')],['Уберите номер','Замените жёсткий номер 3 на ref.',command('ref','Жёсткий номер заменён ссылкой.','Используйте label/ref.'),DOC('See Section 3.'),DOC('See Section~\\ref{sec:method}.')]]),
  atom('footnotes-deep','academic-deep','Академический документ','Сноски','footnote создаёт структурную сноску с автоматической нумерацией.','Средний','Текст','footnote',['command','required-argument'],['footnote'],['command'],
    'Сноска должна использоваться для действительно второстепенного пояснения, а не как способ спрятать основную аргументацию.',
    'The dataset was normalized.\\footnote{Using the published baseline.}',
    'Не набирайте номер сноски вручную верхним индексом.',
    [['Добавьте сноску','Оформите пояснение через footnote.',command('footnote','Использована структурная сноска.','Добавьте \\footnote{...}.'),DOC('Method. (1) Baseline.'),DOC('Method.\\footnote{Baseline.}')],['Уберите ручной номер','Замените ^1 на footnote.',command('footnote','Ручная нумерация заменена.','Используйте footnote.'),DOC('Method $^1$ Baseline.'),DOC('Method.\\footnote{Baseline.}')],['Аргумент сноски','Закройте аргумент footnote.',has('\\footnote{Note}','Аргумент сноски закрыт.','Добавьте }.'),DOC('Text\\footnote{Note'),DOC('Text\\footnote{Note}.')]]),
  atom('appendices-deep','academic-deep','Академический документ','Приложения','appendix переключает последующие разделы в режим приложений.','Продвинутый','Большие документы','appendix',['section'],['appendix'],['section'],
    'Приложение — часть структуры документа. Команда appendix сообщает классу, что последующие главы или разделы должны нумероваться как приложения.',
    '\\appendix\n\\section{Raw measurements}',
    'Не имитируйте приложение вручную заголовком «Appendix A» — нумерация и ссылки должны оставаться автоматическими.',
    [['Создайте приложение','Добавьте appendix перед разделом данных.',command('appendix','Режим приложений включён.','Добавьте \\appendix.'),DOC('\\section{Raw data}'),DOC('\\appendix\n\\section{Raw data}')],['Уберите ручную букву','Замените Section "Appendix A" на appendix + section.',command('appendix','Использована структурная команда appendix.','Не кодируйте букву вручную.'),DOC('\\section{Appendix A: Data}'),DOC('\\appendix\n\\section{Data}')],['Ссылка на приложение','Добавьте label к разделу приложения.',command('label','Приложение имеет устойчивую метку.','Добавьте label после section.'),DOC('\\appendix\n\\section{Data}'),DOC('\\appendix\n\\section{Data}\\label{app:data}')]]),
  atom('custom-environments-deep','advanced-deep','Архитектура LaTeX','Пользовательские окружения','Повторяемую структуру оформляют как API документа.','Продвинутый','Большие документы','custom-environment',['custom-command','environment'],['custom-environment'],['custom-command'],
    'newenvironment определяет начало и конец повторяемой структурной области. Оно оправдано, когда документ действительно содержит новый устойчивый тип блока.',
    '\\newenvironment{remark}{\\begin{quote}\\itshape}{\\end{quote}}',
    'Не создавайте собственное окружение ради единственного фрагмента: абстракция должна уменьшать повторение или фиксировать семантику.',
    [['Создайте remark','Определите окружение remark.',command('newenvironment','Определено окружение.','Используйте \\newenvironment.'),'', '\\newenvironment{remark}{\\begin{quote}}{\\end{quote}}'],['Используйте remark','Добавьте begin/end remark.',environment('remark','Пользовательское окружение использовано.','Откройте и закройте remark.'),'\\newenvironment{remark}{\\itshape}{}\nText','\\newenvironment{remark}{\\itshape}{}\n\\begin{remark}\nText\n\\end{remark}'],['Не дублируйте стиль','Замените два ручных блока одним окружением.',command('newenvironment','Повторение вынесено в окружение.','Определите общий remark.'),'\\itshape Note A.\n\\normalfont\n\\itshape Note B.','\\newenvironment{remark}{\\itshape}{}\n\\begin{remark}Note A.\\end{remark}\n\\begin{remark}Note B.\\end{remark}']]),
  atom('counters-lengths','advanced-deep','Архитектура LaTeX','Счётчики и длины','Нумерация и размеры как управляемые параметры системы.','Продвинутый','Большие документы','counter',['section','page-structure'],['counter','length'],['grouping'],
    'Счётчики представляют состояние нумерации, длины — типографические размеры. Изменять их стоит осознанно и централизованно.',
    '\\setcounter{secnumdepth}{2}\n\\setlength{\\parindent}{1.5em}',
    'Не подгоняйте документ десятками локальных vspace/hspace, если проблема относится к глобальному стилю.',
    [['Глубина нумерации','Задайте secnumdepth=2.',command('setcounter','Счётчик задан структурно.','Используйте \\setcounter{secnumdepth}{2}.'),'','\\setcounter{secnumdepth}{2}'],['Абзацный отступ','Задайте parindent через setlength.',command('setlength','Длина задана через setlength.','Используйте \\setlength.'),'','\\setlength{\\parindent}{1.5em}'],['Уберите локальный vspace','Удалите ручной вертикальный костыль.',{type:'forbiddenText',value:'\\vspace',message:'Локальный костыль удалён.','hint':'Сначала исправьте структурную причину интервала.'},DOC('\\section{Method}\n\\vspace{-8mm}\nText.'),DOC('\\section{Method}\nText.')]]),
  atom('headers-footers-deep','advanced-deep','Архитектура LaTeX','Колонтитулы','fancyhdr как слой над структурой страницы.','Продвинутый','Большие документы','headers-footers',['page-structure','package-model'],['headers-footers'],['page-structure'],
    'Колонтитулы должны помогать навигации по длинному документу. Их содержание зависит от жанра: название главы, короткий title, номер страницы.',
    '\\usepackage{fancyhdr}\n\\pagestyle{fancy}\n\\fancyhead[L]{Methods}',
    'Не перегружайте колонтитул данными, которые уже повторяются на каждой странице без навигационной пользы.',
    [['Подключите fancyhdr','Добавьте пакет.',pkg('fancyhdr','fancyhdr подключён.','Используйте usepackage{fancyhdr}.'),DOC('Text'),DOC('Text','\\usepackage{fancyhdr}')],['Включите стиль','Добавьте pagestyle fancy.',command('pagestyle','Стиль страницы включён.','Используйте \\pagestyle{fancy}.'),DOC('Text','\\usepackage{fancyhdr}'),DOC('Text','\\usepackage{fancyhdr}\n\\pagestyle{fancy}')],['Левый header','Добавьте fancyhead[L].',command('fancyhead','Задан колонтитул.','Используйте \\fancyhead[L]{...}.'),DOC('Text','\\usepackage{fancyhdr}\n\\pagestyle{fancy}'),DOC('Text','\\usepackage{fancyhdr}\n\\pagestyle{fancy}\n\\fancyhead[L]{Methods}')]]),
  atom('multi-file-deep','advanced-deep','Архитектура LaTeX','Несколько файлов','input/include разделяют проект без разрушения общей модели документа.','Продвинутый','Большие документы','multi-file',['source-file','section'],['multi-file','project-architecture'],['preamble'],
    'Главный файл должен оставаться картой проекта: общая преамбула и последовательность крупных частей. Содержимое глав можно хранить отдельно.',
    '\\input{sections/introduction}\n\\include{chapters/methods}',
    'Не копируйте documentclass и begin{document} в каждый подключаемый фрагмент, если он является частью одного общего документа.',
    [['Подключите введение','Добавьте input sections/introduction.',command('input','Использован input.','Напишите \\input{sections/introduction}.'),DOC(''),DOC('\\input{sections/introduction}')],['Подключите главу','Используйте include для chapters/methods.',command('include','Использован include.','Напишите \\include{chapters/methods}.'),DOC(''),DOC('\\include{chapters/methods}')],['Уберите второй documentclass','Оставьте documentclass только в главном файле.',{type:'regex',value:'^((?!\\\\documentclass)[\\s\\S])*$','message':'Фрагмент не содержит собственного documentclass.','hint':'Подключаемая глава не должна повторять главный каркас.'},'\\documentclass{article}\n\\section{Methods}','\\section{Methods}']])
];

function atom(id:string,moduleId:string,moduleTitle:string,title:string,subtitle:string,difficulty:Difficulty,category:PracticeCategory,primary:string,prerequisites:string[],introduces:string[],reinforces:string[],idea:string,syntax:string,mistake:string,practice:Array<[string,string,ValidatorRule,string,string]>):LessonSpec{
  const content:LearningBlock[]=[
    b(`${id}-idea`,'concept',{title:'Идея',body:idea}),
    b(`${id}-syntax`,'syntax',{title:'Минимальный синтаксис',body:'Сначала прочитайте структуру, затем изменяйте пример.',code:syntax}),
    b(`${id}-why`,'explanation',{title:'Ментальная модель',body:`Новая конструкция опирается на уже знакомые понятия: ${prerequisites.join(', ')}. Новое понятие здесь — ${introduces.join(', ')}.`}),
    b(`${id}-mistake`,'mistake',{title:'Типичная ошибка',body:mistake}),
    b(`${id}-check`,'checkpoint',{title:'Быстрая проверка',prompt:`Какую новую структурную роль вводит этот урок: «${title}»?`,answer:idea})
  ];
  return {
    id,moduleId,moduleTitle,moduleDescription:'Атомарные темы без необъяснённых переходов.',title,subtitle,difficulty,category,
    objective:idea,prerequisites,introduces,reinforces,misconceptions:[mistake],practiceObjective:`Применить ${primary} без ручной имитации результата.`,mastery:[`Распознаёт ${primary} в исходнике.`,`Использует ${primary} в подходящем контексте.`],commands:[primary],content,
    examples:[{title:'Рабочий фрагмент',description:'Минимальный пример показывает только новую конструкцию.',code:syntax}],
    practice:practice.map(([title,instructions,validator,starter,solution],index)=>({title,instructions,requirements:[index===0?'Использовать новую конструкцию':'Сохранить семантическую структуру'],starter,solution,validators:[validator,...(solution.includes('\\begin{')?[balanced]:[])],mode:index===1?'Исправить ошибку':index===2?'Рефакторинг':'Написать код'}))
  };
}

const deepSpecs=[...foundation,...supplemental];
const existingIds=new Set(lessons.map(lesson=>lesson.id));
let exerciseCounter=exercises.reduce((max,item)=>Math.max(max,Number(item.id.replace(/\D/g,''))||0),0)+1;

const builtLessons:Lesson[]=[];
for(const spec of deepSpecs){
  if(existingIds.has(spec.id))continue;
  const pedagogy:LessonPedagogy={objective:spec.objective,prerequisites:spec.prerequisites,introduces:spec.introduces,reinforces:spec.reinforces??[],misconceptions:spec.misconceptions,practiceObjective:spec.practiceObjective,masteryCriteria:spec.mastery};
  const lessonExercises:Exercise[]=spec.practice.map(item=>({
    id:`d${String(exerciseCounter++).padStart(3,'0')}`,lessonId:spec.id,category:spec.category,difficulty:spec.difficulty,mode:item.mode,title:item.title,instructions:item.instructions,requirements:item.requirements,starterCode:item.starter,validators:item.validators,hints:item.validators.map(rule=>rule.hint).slice(0,3),solution:item.solution,concepts:[...spec.introduces,...(spec.reinforces??[])],prerequisites:spec.prerequisites
  }));
  builtLessons.push({id:spec.id,moduleId:spec.moduleId,number:0,title:spec.title,subtitle:spec.subtitle,difficulty:spec.difficulty,theory:[],content:spec.content,pedagogy,examples:spec.examples.map((example,index)=>({id:`${spec.id}-example-${index+1}`,...example})),exercises:lessonExercises,relatedCommands:spec.commands,projectStage:spec.projectStage});
}

const foundationLessons=builtLessons.filter(lesson=>lesson.moduleId==='foundation');
const supplementalLessons=builtLessons.filter(lesson=>lesson.moduleId!=='foundation');

const foundationModule:CourseModule={id:'foundation',number:1,title:'Основа',description:'Что такое LaTeX, как он читает исходник и почему синтаксис устроен именно так.',prerequisites:'Не требуются',difficulty:'Начальный',lessons:foundationLessons};
const grouped=new Map<string,Lesson[]>();
for(const lesson of supplementalLessons){const group=grouped.get(lesson.moduleId)??[];group.push(lesson);grouped.set(lesson.moduleId,group);}
const moduleMeta=new Map(deepSpecs.map(spec=>[spec.moduleId,{title:spec.moduleTitle,description:spec.moduleDescription,difficulty:spec.difficulty}]));
const supplementalModules:CourseModule[]=[...grouped].map(([id,group])=>({id,number:0,title:moduleMeta.get(id)?.title??id,description:moduleMeta.get(id)?.description??'',prerequisites:'См. зависимости уроков',difficulty:moduleMeta.get(id)?.difficulty??'Средний',lessons:group}));

// Foundation is deliberately inserted before every coding-heavy legacy lesson.
modules.unshift(foundationModule);
for(const module of supplementalModules) modules.push(module);
lessons.unshift(...foundationLessons);
lessons.push(...supplementalLessons);
exercises.unshift(...foundationLessons.flatMap(lesson=>lesson.exercises));
exercises.push(...supplementalLessons.flatMap(lesson=>lesson.exercises));

// Attach explicit pedagogical metadata to legacy lessons as well. Their detailed
// theory already exists; this metadata makes dependencies inspectable and lintable.
const legacyDependencies:Record<string,string[]>={
  'document-structure':['document-class','document-environment'],
  'sections-paragraphs':['paragraph','section'],
  'text-formatting':['emphasis','list'],
  'math-modes':['math-mode','inline-math','display-math'],
  'fractions-powers':['fraction','root','superscript','subscript'],
  'equations-theorems':['equation','align','theorem','proof'],
  'basic-tables':['tabular','table-cell-separator','table-row-break'],
  'figures-captions':['figure','caption'],
  'labels-refs':['label','ref'],
  'bibliography-basics':['bibliography-model','citation'],
  'custom-commands':['custom-command'],
  'large-documents':['multi-file','project-architecture'],
  'debugging':['debugging']
};
for(const lesson of lessons){
  if(lesson.pedagogy)continue;
  const introduces=legacyDependencies[lesson.id]??[];
  lesson.pedagogy={
    objective:lesson.subtitle,
    prerequisites:introduces.flatMap(id=>[]),
    introduces,
    reinforces:lesson.exercises.flatMap(exercise=>exercise.concepts).slice(0,6),
    misconceptions:['Использовать конструкцию следует ради её смысловой роли, а не как визуальный трюк.'],
    practiceObjective:`Применить тему «${lesson.title}» в структурно корректном исходнике.`,
    masteryCriteria:lesson.exercises.map(exercise=>exercise.requirements[0]).filter(Boolean).slice(0,3)
  };
}

// Keep course-wide indexes stable after side-effect expansion.
modules.forEach((module,index)=>{module.number=index+1;});
lessons.forEach((lesson,index)=>{lesson.number=index+1;});
lessonIndex.clear();
lessons.forEach((lesson,index)=>lessonIndex.set(lesson.id,index));
