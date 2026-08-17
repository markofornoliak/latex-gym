import { exercises, lessonIndex, lessons, modules } from './courses';
import type { CourseModule, Difficulty, Exercise, Lesson, PracticeCategory, TheoryBlock, ValidatorRule } from '../types';

type Step = { title:string; body:string; code?:string; note?:string };
type Topic = {
  id:string; title:string; subtitle:string; description:string; prerequisite:string; difficulty:Difficulty; category:PracticeCategory;
  commands:string[]; steps:Step[]; examples:Array<{title:string;description:string;code:string}>;
  tasks:Array<{title:string;instructions:string;requirements:string[];starter:string;validators:ValidatorRule[];hints:string[];solution:string;concepts:string[];mode:Exercise['mode']}>;
};

const contains=(value:string,message:string,hint:string):ValidatorRule=>({type:'containsText',value,message,hint});
const command=(value:string,message:string,hint:string,min=1):ValidatorRule=>({type:'command',value,message,hint,min});
const environment=(value:string,message:string,hint:string):ValidatorRule=>({type:'environment',value,message,hint});
const compiles:ValidatorRule={type:'compiles',message:'Документ синтаксически согласован.',hint:'Проверьте пары begin/end, фигурные скобки и математические ограничители.'};
const article=(body:string,preamble='')=>`\\documentclass{article}\n${preamble}${preamble?'\n':''}\\begin{document}\n${body}\n\\end{document}`;

const deepDive:Record<string,Step[]> = {
  'document-structure':[
    {title:'Что происходит при компиляции',body:'LaTeX сначала читает класс и преамбулу, формирует набор правил документа и только затем обрабатывает тело. Поэтому ошибка до \\begin{document} часто влияет на весь документ, а ошибка внутри тела обычно локальна.',code:'\\documentclass{article}\n% преамбула\n\\begin{document}\n% содержимое\n\\end{document}',note:'Полезная привычка: мысленно делить исходник на конфигурацию и содержимое.'},
    {title:'Минимальный рабочий пример',body:'Когда большой документ перестал собираться, уменьшите его до минимального каркаса и возвращайте части по одной. Так становится понятно, проблема в классе, пакете, окружении или конкретном фрагменте текста.'},
    {title:'Типичные ошибки каркаса',body:'Чаще всего начинающие забывают закрыть document, помещают usepackage после начала документа или случайно удаляют закрывающую фигурную скобку. Проверяйте структуру сверху вниз, а не меняйте команды наугад.'}
  ],
  'sections-paragraphs':[
    {title:'Логика секционирования',body:'section и subsection описывают смысловую иерархию, а не размер шрифта. Если нужен другой внешний вид заголовка, меняют стиль документа, но не подменяют section ручным жирным текстом.'},
    {title:'Абзац — не перенос строки',body:'Пустая строка создаёт новый абзац. Двойной обратный слеш нужен для контролируемого переноса внутри некоторых конструкций и не должен использоваться как универсальный способ верстки обычного текста.',code:'Первый абзац.\n\nВторой абзац.'},
    {title:'Как проектировать длинный текст',body:'Перед набором статьи сначала наметьте section/subsection, а затем наполняйте их текстом. Такая структура автоматически помогает оглавлению, перекрёстным ссылкам и навигации по исходнику.'}
  ],
  'text-formatting':[
    {title:'Смысл против внешнего вида',body:'emph сообщает LaTeX, что фрагмент смыслово выделен, тогда как прямое управление начертанием описывает внешний вид. Семантические команды проще глобально переоформлять.'},
    {title:'Группировка и область действия',body:'Фигурные скобки ограничивают действие многих переключателей. Это важный механизм LaTeX: локальное изменение не должно случайно продолжаться до конца документа.',code:'Обычный текст {\\bfseries локально жирный} снова обычный.'},
    {title:'Профессиональная типографика',body:'Не пытайтесь вручную выравнивать пробелами. LaTeX рассчитывает интервалы сам; задача автора — правильно обозначить структуру, язык, цитаты и смысловые акценты.'}
  ],
  'math-modes':[
    {title:'Почему у математики отдельный режим',body:'В математическом режиме символы интерпретируются как математические объекты: меняются интервалы, форма букв и правила расположения операторов. Поэтому формулу нельзя качественно имитировать обычным текстом.'},
    {title:'Inline или display',body:'Встроенная формула должна оставаться частью предложения. Display-формула используется, когда выражение важно само по себе, требует визуального пространства или на него нужно ссылаться отдельно.'},
    {title:'Границы математического режима',body:'Не помещайте большие куски обычного текста внутрь $...$. Для слов в формуле используйте \\text{...} из amsmath, а для длинных пояснений выходите из математического режима.'}
  ],
  'fractions-powers':[
    {title:'Аргументы математических команд',body:'frac принимает два обязательных аргумента, sqrt — один обязательный и необязательную степень корня. Чем сложнее аргумент, тем важнее явно ограничивать его фигурными скобками.'},
    {title:'Индексы как часть структуры',body:'Оператор _ или ^ относится только к следующему токену, если нет фигурных скобок. Поэтому x_i корректен для одного символа, а x_{ij} требует группировки.',code:'$x_i^2,\quad x_{ij}^{n+1}$'},
    {title:'Читаемость исходника',body:'Сложные формулы лучше разбивать логически пробелами и переносами строк в исходнике. LaTeX игнорирует большинство таких пробелов в математике, зато человеку код читать значительно легче.'}
  ],
  'equations-theorems':[
    {title:'Нумерация формул',body:'equation нужен, когда формула — самостоятельный объект документа. Если номер не нужен, применяйте ненумеруемый вариант или display math, а не скрывайте номер вручную.'},
    {title:'Выравнивание нескольких строк',body:'В align символ & отмечает логическую точку выравнивания, обычно знак равенства. Перенос \\\\ завершает строку. Это семантическая сетка, а не таблица из пробелов.'},
    {title:'Теорема и доказательство',body:'amsthm позволяет единообразно задавать теоремы, определения, леммы и доказательства. Нумерация и стиль управляются централизованно, что критично для большой математической работы.'}
  ],
  'basic-tables':[
    {title:'Модель столбцов',body:'Аргумент tabular описывает столбцы до появления данных: l, c и r задают базовое выравнивание. Это означает, что структура таблицы известна LaTeX заранее.'},
    {title:'Строки и ячейки',body:'& разделяет ячейки, а \\\\ завершает строку. Если количество разделителей не соответствует числу столбцов, ошибка обычно находится именно в этой строке.'},
    {title:'Таблица — не сетка Excel',body:'В научной типографике вертикальные линии часто ухудшают читаемость. Пакет booktabs строит таблицу на аккуратных горизонтальных правилах и правильных интервалах.'}
  ],
  'figures-captions':[
    {title:'Почему figure плавающий',body:'LaTeX отделяет логическое место рисунка от физического места на странице, чтобы избежать больших пустот и плохих переносов. Поэтому figure может перемещаться относительно исходника.'},
    {title:'Размер относительно текста',body:'Ширину изображения удобнее задавать относительно \\textwidth или \\linewidth, а не в сантиметрах. Тогда документ легче переносить между форматами страницы.',code:'\\includegraphics[width=.75\\linewidth]{figure.pdf}'},
    {title:'Подпись и ссылка',body:'caption должен объяснять рисунок без необходимости читать основной текст. Сразу после caption обычно ставят label, чтобы ссылка получала правильный номер.'}
  ],
  'tikz-basics':[
    {title:'Координатная модель TikZ',body:'TikZ строит графику из координат, путей и узлов. Это делает рисунок воспроизводимым и позволяет привязывать подписи к геометрии вместо ручного позиционирования в графическом редакторе.'},
    {title:'Пути и операции',body:'Команда draw задаёт путь, а операции --, rectangle, circle и arc определяют его геометрию. Сложный рисунок лучше собирать из нескольких коротких осмысленных путей.'},
    {title:'Когда TikZ оправдан',body:'TikZ особенно силён для блок-схем, математических рисунков и диаграмм, где элементы должны точно согласовываться с обозначениями в тексте. Для фотографий и сложной иллюстрации лучше использовать внешний файл.'}
  ],
  'labels-refs':[
    {title:'Двухпроходная компиляция',body:'LaTeX обычно узнаёт номера объектов после первого прохода и подставляет их при следующем. Поэтому временные ?? после добавления новой ссылки не всегда означают ошибку.'},
    {title:'Система имён label',body:'Хорошая метка описывает тип и смысл объекта: sec:method, fig:architecture, eq:energy. Такая дисциплина особенно полезна в документах с сотнями ссылок.'},
    {title:'Никогда не пишите номер вручную',body:'Фраза «см. раздел 4» ломается после перестановки разделов. ref сохраняет связь с объектом и делает документ устойчивым к редактуре.'}
  ],
  'bibliography-basics':[
    {title:'Ключ вместо номера',body:'cite ссылается на стабильный ключ источника, а формат номера или автор–год выбирает библиографический стиль. Автор не должен вручную поддерживать нумерацию.'},
    {title:'Малый и большой проект',body:'thebibliography подходит для учебного или маленького документа. Для статьи, диссертации и книги обычно выгоднее хранить источники отдельно и использовать biblatex/biber.'},
    {title:'Качество библиографических данных',body:'Автоматизация не исправляет плохие метаданные. Проверяйте авторов, название, год, DOI и тип источника — от этого зависит корректность итоговой библиографии.'}
  ],
  'custom-commands':[
    {title:'Команда как API документа',body:'Пользовательская команда должна выражать понятие: например \\vect{x}, а не конкретный визуальный приём. Тогда стиль можно изменить в одном месте без переписывания сотен формул.'},
    {title:'Аргументы и повторное использование',body:'Параметры #1, #2 и далее превращают команду в шаблон. Если один и тот же фрагмент появляется три и более раза, стоит проверить, не просится ли он в отдельную команду.'},
    {title:'Не переусложняйте преамбулу',body:'Макрос полезен, когда снижает повторение или фиксирует смысл. Одноразовая команда ради одной строки делает исходник сложнее, а не проще.'}
  ],
  'large-documents':[
    {title:'Главный файл как карта проекта',body:'В хорошем большом проекте главный tex-файл остаётся коротким: класс, общая преамбула, front matter и подключения глав. Детали живут в отдельных файлах.'},
    {title:'input и include',body:'input подходит для произвольных фрагментов, а include — для крупных единиц вроде глав и создаёт дополнительные границы обработки. Выбор зависит от архитектуры проекта.'},
    {title:'Стабильная структура каталогов',body:'Отделяйте главы, рисунки, библиографию и служебные макросы. Предсказуемая структура уменьшает количество путей и облегчает совместную работу через Git.'}
  ],
  'academic-paper':[
    {title:'Метаданные статьи',body:'title, author и date принадлежат преамбуле, а maketitle выводит их в документе. Это разделяет данные публикации и их визуальное представление.'},
    {title:'Аннотация как самостоятельный жанр',body:'abstract должен коротко сообщать задачу, метод, ключевой результат и значение работы. LaTeX лишь задаёт окружение; качество содержания остаётся задачей автора.'},
    {title:'Воспроизводимая статья',body:'Сильный LaTeX-проект хранит формулы, ссылки, таблицы и библиографию как структурированные элементы. Именно это делает статью устойчивой к требованиям разных журналов.'}
  ],
  'debugging':[
    {title:'Ищите первую реальную ошибку',body:'Одна синтаксическая ошибка часто порождает десятки последующих сообщений. Начинайте с самой ранней ошибки в логе и только после её исправления анализируйте остальные.'},
    {title:'Метод деления пополам',body:'Если причина неочевидна, временно закомментируйте половину документа. Если ошибка исчезла, проблема находится в скрытой части. Повторяйте деление до локализации фрагмента.'},
    {title:'Предупреждение не равно ошибке',body:'Warnings про overfull box или ссылки могут позволять получить PDF, но их всё равно нужно понимать. Финальная публикация должна собираться без необъяснённых предупреждений.'}
  ]
};

for(const lesson of lessons){
  const additions=deepDive[lesson.id]??[];
  const known=new Set(lesson.theory.map(block=>block.id));
  additions.forEach((step,i)=>{
    const id=`${lesson.id}-deep-${i+1}`;
    if(!known.has(id))lesson.theory.push({id,...step});
  });
  if(lesson.examples.length<2 && lesson.exercises[0]){
    lesson.examples.push({id:`${lesson.id}-guided-example`,title:'Разбор решения',description:'Сравните задачу с одним корректным решением. Обратите внимание на структуру, а не на буквальное совпадение строк.',code:lesson.exercises[0].solution});
  }
}

const topics:Topic[]=[
  {
    id:'packages-preamble',title:'Пакеты и архитектура преамбулы',subtitle:'Как подключать возможности LaTeX без хаотичной преамбулы.',description:'usepackage, параметры пакетов, порядок подключения и минимальные конфигурации.',prerequisite:'Структура документа',difficulty:'Базовый',category:'Основы',commands:['usepackage','documentclass','PassOptionsToPackage'],
    steps:[
      {title:'Зачем нужны пакеты',body:'Базовое ядро LaTeX намеренно компактно. Пакеты добавляют математику, графику, цвета, ссылки, языки и тысячи специализированных возможностей. Подключайте пакет только тогда, когда понимаете, какую задачу он решает.'},
      {title:'Синтаксис usepackage',body:'Пакет подключается в преамбуле до begin{document}. Квадратные скобки передают параметры, фигурные — имя пакета.',code:'\\usepackage[margin=25mm]{geometry}'},
      {title:'Несколько пакетов',body:'Некоторые пакеты можно перечислять через запятую, но для читаемости крупного проекта чаще лучше одна смысловая строка на пакет. Так проще добавлять параметры и искать источник конфликта.'},
      {title:'Порядок подключения',body:'Порядок иногда важен: пакет может менять команды другого пакета. Не существует одного универсального порядка, поэтому при конфликте сверяйтесь с документацией конкретных пакетов.'},
      {title:'Минимальная преамбула',body:'Не копируйте десятки usepackage из чужого шаблона. Начните с минимального набора и добавляйте зависимости по необходимости — это ускоряет отладку и уменьшает вероятность конфликтов.'},
      {title:'Профессиональная практика',body:'Для большой работы вынесите собственные команды и общие настройки в отдельный файл, но оставьте главную преамбулу читаемой как список возможностей проекта.',note:'Преамбула должна объяснять архитектуру документа, а не скрывать её.'}
    ],
    examples:[
      {title:'Компактная преамбула',description:'Геометрия страницы и расширенная математика подключены явно и раздельно.',code:'\\documentclass{article}\n\\usepackage[margin=25mm]{geometry}\n\\usepackage{amsmath}\n\\begin{document}\nText\n\\end{document}'},
      {title:'Пакет с параметрами',description:'Параметры передаются до имени пакета.',code:'\\usepackage[colorlinks=true,linkcolor=blue]{hyperref}'}
    ],
    tasks:[
      {title:'Подключите geometry',instructions:'Добавьте geometry с полями 25 mm.',requirements:['usepackage','geometry','Параметр margin=25mm'],starter:article('Текст.'),validators:[contains('\\usepackage[margin=25mm]{geometry}','geometry подключён с параметром.','Добавьте строку в преамбулу.')],hints:['Пакеты подключаются до begin{document}.','Параметры помещаются в квадратные скобки.','\\usepackage[margin=25mm]{geometry}'],solution:'\\documentclass{article}\n\\usepackage[margin=25mm]{geometry}\n\\begin{document}\nТекст.\n\\end{document}',concepts:['package','preamble'],'Дополнить документ'},
      {title:'Уберите пакет из тела',instructions:'Перенесите usepackage в корректную часть документа.',requirements:['usepackage до begin{document}'],starter:'\\documentclass{article}\n\\begin{document}\n\\usepackage{amsmath}\nText\n\\end{document}',validators:[contains('\\documentclass{article}\n\\usepackage{amsmath}','Пакет находится в преамбуле.','Переместите usepackage сразу после documentclass.')],hints:['Преамбула заканчивается перед begin{document}.','usepackage нельзя оставлять внутри тела.','Перенесите строку вверх.'],solution:'\\documentclass{article}\n\\usepackage{amsmath}\n\\begin{document}\nText\n\\end{document}',concepts:['package','debug'],'Исправить ошибку'},
      {title:'Соберите минимальную преамбулу',instructions:'Подключите amsmath и graphicx отдельными строками.',requirements:['amsmath','graphicx'],starter:'\\documentclass{article}\n\\begin{document}\n\\end{document}',validators:[contains('\\usepackage{amsmath}','Подключён amsmath.','Добавьте amsmath.'),contains('\\usepackage{graphicx}','Подключён graphicx.','Добавьте graphicx.')],hints:['Обе строки находятся в преамбуле.','Сначала amsmath, затем graphicx.','Используйте два usepackage.'],solution:'\\documentclass{article}\n\\usepackage{amsmath}\n\\usepackage{graphicx}\n\\begin{document}\n\\end{document}',concepts:['package','preamble'],'Собрать документ'}
    ]
  },
  {
    id:'document-classes-layout',title:'Классы документа и геометрия страницы',subtitle:'article, report, book и управление физической страницей.',description:'Выбор класса, поля, ориентация, размеры бумаги и логика макета.',prerequisite:'Пакеты и преамбула',difficulty:'Базовый',category:'Большие документы',commands:['documentclass','geometry','newgeometry','restoregeometry'],
    steps:[
      {title:'Класс определяет поведение',body:'article, report и book отличаются не только внешним видом: они задают доступные уровни секционирования, логику глав, титульных страниц и двусторонней печати.'},
      {title:'Параметры класса',body:'Опции documentclass настраивают базовый формат: размер шрифта, бумагу, односторонний или двусторонний режим.',code:'\\documentclass[12pt,a4paper,twoside]{report}'},
      {title:'Геометрия страницы',body:'geometry вычисляет поля и рабочую область. Это безопаснее ручной настройки внутренних длин, особенно если документ должен переходить между A4 и Letter.'},
      {title:'Односторонняя и двусторонняя печать',body:'В книге внутреннее и внешнее поля имеют разные роли. twoside влияет на колонтитулы, зеркальность полей и расположение страниц.'},
      {title:'Локальное изменение',body:'newgeometry может временно изменить поля, а restoregeometry вернуть исходные. Используйте это редко: единый макет почти всегда выглядит профессиональнее.'},
      {title:'Как выбирать класс',body:'Начинайте с назначения документа: статья — article, диссертация/отчёт с главами — report, книга — book. Не выбирайте класс только потому, что нравится его дефолтный внешний вид.'}
    ],
    examples:[
      {title:'Отчёт A4',description:'Базовая конфигурация отчёта с симметричными полями.',code:'\\documentclass[12pt,a4paper]{report}\n\\usepackage[margin=28mm]{geometry}'},
      {title:'Книга',description:'Двусторонний макет с внутренним полем под переплёт.',code:'\\documentclass[11pt,twoside]{book}\n\\usepackage[inner=32mm,outer=24mm]{geometry}'}
    ],
    tasks:[
      {title:'Класс report',instructions:'Измените класс документа на report.',requirements:['documentclass report'],starter:article('Text'),validators:[contains('\\documentclass{report}','Выбран report.','Замените article на report.')],hints:['Меняется первая строка.','Имя класса находится в фигурных скобках.','\\documentclass{report}'],solution:'\\documentclass{report}\n\\begin{document}\nText\n\\end{document}',concepts:['documentclass','report'],'Рефакторинг'},
      {title:'Настройте поля',instructions:'Подключите geometry с полем 30 mm.',requirements:['geometry','margin=30mm'],starter:'\\documentclass{article}\n\\begin{document}\nText\n\\end{document}',validators:[contains('margin=30mm','Поля заданы.','Добавьте margin=30mm.'),contains('{geometry}','Подключён geometry.','Подключите geometry.')],hints:['Нужен пакет geometry.','Параметр передаётся в квадратных скобках.','\\usepackage[margin=30mm]{geometry}'],solution:'\\documentclass{article}\n\\usepackage[margin=30mm]{geometry}\n\\begin{document}\nText\n\\end{document}',concepts:['geometry','layout'],'Дополнить документ'},
      {title:'Двусторонняя книга',instructions:'Создайте book с параметром twoside.',requirements:['book','twoside'],starter:'\\documentclass{article}\n\\begin{document}\n\\end{document}',validators:[contains('\\documentclass[twoside]{book}','Книга настроена на twoside.','Укажите [twoside] и book.')],hints:['Опция располагается до фигурных скобок.','Класс — book.','\\documentclass[twoside]{book}'],solution:'\\documentclass[twoside]{book}\n\\begin{document}\n\\end{document}',concepts:['book','twoside'],'Собрать документ'}
    ]
  },
  {
    id:'typography-microtype',title:'Профессиональная типографика и microtype',subtitle:'Интервалы, переносы и микротипографика без ручного вмешательства.',description:'microtype, кавычки, неразрывные пробелы и устойчивый набор текста.',prerequisite:'Текст и типографика',difficulty:'Средний',category:'Текст',commands:['microtype','textquote','mbox','raggedright'],
    steps:[
      {title:'Задача микротипографики',body:'Хороший набор зависит от тысяч микроскопических решений: межбуквенных интервалов, выступания знаков в поля и распределения пробелов. microtype автоматизирует часть этих решений.'},
      {title:'Подключение microtype',body:'В большинстве pdfLaTeX-проектов пакет можно подключить без параметров и получить более ровную серую плотность текста.',code:'\\usepackage{microtype}'},
      {title:'Неразрывный пробел',body:'Тильда связывает элементы, которые нежелательно разделять переносом: инициалы и фамилию, номер рисунка, короткий предлог в некоторых языковых практиках.',code:'рис.~\\ref{fig:scheme}'},
      {title:'Кавычки и язык',body:'Тип кавычек зависит от языка. Для многоязычных проектов лучше использовать babel/polyglossia и csquotes, а не вручную вставлять похожие Unicode-символы во всех местах.'},
      {title:'Overfull box',body:'Предупреждение overfull hbox означает, что строка вышла за допустимую ширину. Сначала ищите длинный URL, неразрывную конструкцию или неверный язык переноса, а не уменьшайте шрифт.'},
      {title:'Ручная верстка — крайняя мера',body:'Команды hspace и vspace полезны, но систематическое ручное выталкивание элементов обычно сигнализирует о проблеме в структуре или настройке стиля.'}
    ],
    examples:[
      {title:'Чистая типографическая преамбула',description:'Минимальная настройка языка и microtype.',code:'\\usepackage[english,russian]{babel}\n\\usepackage{microtype}'},
      {title:'Стабильная ссылка в тексте',description:'Неразрывный пробел не даёт номеру оторваться от слова.',code:'См. раздел~\\ref{sec:method}.'}
    ],
    tasks:[
      {title:'Подключите microtype',instructions:'Добавьте microtype в преамбулу.',requirements:['usepackage microtype'],starter:article('Текст.'),validators:[contains('\\usepackage{microtype}','microtype подключён.','Добавьте usepackage в преамбулу.')],hints:['Пакет не требует параметров.','Он подключается до document.','\\usepackage{microtype}'],solution:'\\documentclass{article}\n\\usepackage{microtype}\n\\begin{document}\nТекст.\n\\end{document}',concepts:['microtype','typography'],'Дополнить документ'},
      {title:'Свяжите ссылку',instructions:'Сделайте пробел между «раздел» и ref неразрывным.',requirements:['Тильда перед ref'],starter:article('См. раздел \\ref{sec:x}.'),validators:[contains('раздел~\\ref','Ссылка связана неразрывным пробелом.','Замените обычный пробел на ~.')],hints:['Нужна тильда.','Она ставится вместо пробела.','раздел~\\ref{...}'],solution:article('См. раздел~\\ref{sec:x}.'),concepts:['nonbreaking-space','ref'],'Рефакторинг'},
      {title:'Уберите ручной пробел',instructions:'Удалите ненужный hspace из обычного абзаца.',requirements:['Без hspace'],starter:article('Первое слово.\\hspace{1cm} Второе слово.'),validators:[{type:'containsText',value:'Первое слово. Второе слово.',message:'Текст снова использует обычный пробел.',hint:'Удалите hspace и оставьте обычный пробел.'}],hints:['LaTeX сам управляет межсловными пробелами.','hspace здесь не выражает смысл.','Оставьте обычный пробел.'],solution:article('Первое слово. Второе слово.'),concepts:['spacing','refactor'],'Улучшить код'}
    ]
  },
  {
    id:'advanced-lists',title:'Продвинутые списки',subtitle:'Вложенность, описательные списки и управляемая нумерация.',description:'itemize, enumerate, description и enumitem для сложной структуры.',prerequisite:'Текст и типографика',difficulty:'Средний',category:'Текст',commands:['itemize','enumerate','description','item','setlist'],
    steps:[
      {title:'Три базовых вида',body:'itemize задаёт ненумерованный список, enumerate — последовательность, description — пары термин/описание. Выбирайте окружение по смыслу, а не по внешнему виду маркера.'},
      {title:'Вложенные уровни',body:'Список может содержать другой список внутри item. Следите, чтобы begin/end были правильно вложены; визуальный уровень LaTeX определит автоматически.'},
      {title:'Description',body:'В description необязательный аргумент item становится термином.',code:'\\begin{description}\n\\item[API] Интерфейс системы.\n\\end{description}'},
      {title:'Пакет enumitem',body:'enumitem позволяет настраивать метки, отступы и продолжение нумерации без ручной перестройки каждого списка.'},
      {title:'Нумерация как информация',body:'Если порядок элементов не имеет значения, enumerate создаёт ложное ощущение последовательности. Используйте нумерацию только там, где номер действительно несёт смысл.'},
      {title:'Списки в научном тексте',body:'Список должен облегчать сравнение или последовательность действий. Если каждый пункт превращается в несколько абзацев, возможно, лучше использовать подзаголовки.'}
    ],
    examples:[
      {title:'Description',description:'Термин и определение визуально связаны.',code:article('\\begin{description}\n\\item[TeX] Система набора.\n\\item[LaTeX] Макроформат поверх TeX.\n\\end{description}')},
      {title:'Вложенный список',description:'Второй уровень находится внутри item первого.',code:article('\\begin{enumerate}\n\\item Первый\n  \\begin{itemize}\n  \\item Деталь\n  \\end{itemize}\n\\end{enumerate}')}
    ],
    tasks:[
      {title:'Description из двух терминов',instructions:'Создайте description с двумя item.',requirements:['description','2 пункта'],starter:article(''),validators:[environment('description','Создан description.','Используйте окружение description.'),command('item','Есть два пункта.','Добавьте два item.',2)],hints:['Окружение называется description.','Термин пишется в [квадратных скобках].','Нужно два item.'],solution:article('\\begin{description}\n\\item[TeX] Система набора.\n\\item[LaTeX] Формат.\n\\end{description}'),concepts:['description','item'],'Написать код'},
      {title:'Вложите itemize',instructions:'Добавьте маркированный подпункт внутрь первого элемента enumerate.',requirements:['enumerate','itemize'],starter:article('\\begin{enumerate}\n\\item Первый\n\\end{enumerate}'),validators:[environment('enumerate','Есть внешний enumerate.','Сохраните enumerate.'),environment('itemize','Есть вложенный itemize.','Добавьте itemize внутрь первого item.')],hints:['Внутренний список начинается после текста item.','Используйте itemize.','Не забудьте закрыть его до end{enumerate}.'],solution:article('\\begin{enumerate}\n\\item Первый\n  \\begin{itemize}\n  \\item Деталь\n  \\end{itemize}\n\\end{enumerate}'),concepts:['nested-list','itemize'],'Дополнить документ'},
      {title:'Выберите правильный тип',instructions:'Преобразуйте последовательность шагов из itemize в enumerate.',requirements:['enumerate'],starter:article('\\begin{itemize}\n\\item Установить пакет\n\\item Собрать документ\n\\end{itemize}'),validators:[environment('enumerate','Шаги стали нумерованными.','Замените оба itemize на enumerate.')],hints:['Порядок шагов важен.','Нужна нумерация.','Замените begin и end.'],solution:article('\\begin{enumerate}\n\\item Установить пакет\n\\item Собрать документ\n\\end{enumerate}'),concepts:['enumerate','semantics'],'Рефакторинг'}
    ]
  },
  {
    id:'matrices-cases',title:'Матрицы, системы и кусочные функции',subtitle:'Структурные математические окружения amsmath.',description:'matrix, pmatrix, cases и aligned для многомерных выражений.',prerequisite:'Многострочные формулы',difficulty:'Средний',category:'Математика',commands:['matrix','pmatrix','bmatrix','cases','aligned'],
    steps:[
      {title:'Матрица как таблица в математике',body:'В matrix столбцы разделяются &, строки — \\\\. Окружение не рисует скобки само; pmatrix, bmatrix и другие варианты добавляют нужный тип ограничителей.'},
      {title:'pmatrix и bmatrix',body:'pmatrix создаёт круглые скобки, bmatrix — квадратные. Выбирайте форму по математической конвенции.',code:'\\[ A=\\begin{pmatrix}1&0\\\\0&1\\end{pmatrix} \\]'},
      {title:'Cases',body:'cases предназначен для кусочных функций и автоматически создаёт левую фигурную скобку. Обычно справа от выражения добавляют текстовое условие через \\text.'},
      {title:'Aligned внутри формулы',body:'aligned позволяет выровнять несколько строк внутри более крупного математического окружения. Это удобно, когда блок должен оставаться одним объектом без отдельной нумерации каждой строки.'},
      {title:'Количество столбцов',body:'В каждой строке матрицы желательно одинаковое количество ячеек. Ошибка с лишним & почти всегда означает, что одна строка структурно отличается от остальных.'},
      {title:'Читаемый исходник',body:'Пишите строки матрицы на отдельных строках исходника. Это не влияет на результат, но значительно упрощает проверку размерности и редактирование.'}
    ],
    examples:[
      {title:'Матрица 2×2',description:'Две строки и два столбца в круглых скобках.',code:article('\\[\\begin{pmatrix}\na & b \\\\\nc & d\n\\end{pmatrix}\\]','\\usepackage{amsmath}')},
      {title:'Кусочная функция',description:'cases связывает выражения с условиями.',code:article('\\[f(x)=\\begin{cases}\nx^2,& x\\ge0,\\\\\n-x,& x<0.\n\\end{cases}\\]','\\usepackage{amsmath}')}
    ],
    tasks:[
      {title:'Единичная матрица',instructions:'Создайте pmatrix 2×2 для единичной матрицы.',requirements:['pmatrix','Две строки','Два столбца'],starter:article('\\[ A = ? \\]','\\usepackage{amsmath}'),validators:[environment('pmatrix','Создана pmatrix.','Используйте pmatrix.'),contains('1 & 0','Первая строка заполнена.','Первая строка: 1 & 0.'),contains('0 & 1','Вторая строка заполнена.','Вторая строка: 0 & 1.')],hints:['Нужно окружение pmatrix.','Столбцы делятся &.','Строки: 1 & 0 и 0 & 1.'],solution:article('\\[ A=\\begin{pmatrix}\n1 & 0 \\\\\n0 & 1\n\\end{pmatrix} \\]','\\usepackage{amsmath}'),concepts:['matrix','pmatrix'],'Собрать документ'},
      {title:'Кусочная функция',instructions:'Используйте cases для двух ветвей функции.',requirements:['cases','Две строки'],starter:article('\\[ f(x)= \\]','\\usepackage{amsmath}'),validators:[environment('cases','Создан cases.','Используйте cases.'),contains('x^2','Есть первая ветвь.','Добавьте x^2.'),contains('-x','Есть вторая ветвь.','Добавьте -x.')],hints:['Нужно окружение cases.','После выражения условие отделяется &.','Создайте две строки.'],solution:article('\\[f(x)=\\begin{cases}\nx^2,&x\\ge0,\\\\\n-x,&x<0.\n\\end{cases}\\]','\\usepackage{amsmath}'),concepts:['cases','piecewise'],'Написать код'},
      {title:'Исправьте размерность',instructions:'Сделайте обе строки матрицы двухэлементными.',requirements:['2×2'],starter:article('\\[\\begin{pmatrix}1&0&2\\\\0&1\\end{pmatrix}\\]','\\usepackage{amsmath}'),validators:[contains('1&0\\\\0&1','Строки согласованы.','Уберите лишний третий элемент первой строки.')],hints:['Во второй строке два элемента.','В первой сейчас три.','Удалите &2.'],solution:article('\\[\\begin{pmatrix}1&0\\\\0&1\\end{pmatrix}\\]','\\usepackage{amsmath}'),concepts:['matrix','debug'],'Исправить ошибку'}
    ]
  },
  {
    id:'math-operators',title:'Операторы, пределы и многострочная математика',subtitle:'Правильные математические операторы вместо имитации обычным текстом.',description:'DeclareMathOperator, limits, split и семантика математического набора.',prerequisite:'Матрицы и системы',difficulty:'Продвинутый',category:'Математика',commands:['DeclareMathOperator','operatorname','lim','sum','split'],
    steps:[
      {title:'Оператор — отдельный класс символов',body:'sin, log, det и lim набираются прямым шрифтом и получают специальные интервалы. Нельзя просто писать буквы s i n в математическом режиме.'},
      {title:'Пользовательский оператор',body:'DeclareMathOperator создаёт команду с корректной типографикой и интервалами.',code:'\\DeclareMathOperator{\\rank}{rank}'},
      {title:'Пределы',body:'У крупных операторов sum, prod, lim положение нижних и верхних индексов зависит от режима формулы. Не задавайте интервалы вокруг них вручную.'},
      {title:'Split',body:'split разбивает одно нумеруемое уравнение на несколько выровненных строк, сохраняя один номер equation.'},
      {title:'Текст внутри формулы',body:'Для словесных условий используйте \\text{...} из amsmath. Это сохраняет корректный шрифт и пробелы обычного текста.'},
      {title:'Семантический исходник',body:'Хорошая формула читается как математическая структура: операторы — операторы, переменные — переменные, текст — текст. Это улучшает и исходник, и результат.'}
    ],
    examples:[
      {title:'Собственный оператор rank',description:'Оператор объявляется в преамбуле и затем используется как стандартный.',code:'\\DeclareMathOperator{\\rank}{rank}\n...\n$\\rank A=n$'},
      {title:'Одно уравнение в две строки',description:'split сохраняет единую нумерацию.',code:'\\begin{equation}\n\\begin{split}\nf(x)&=x^2+2x+1\\\\\n&=(x+1)^2\n\\end{split}\n\\end{equation}'}
    ],
    tasks:[
      {title:'Объявите rank',instructions:'Создайте оператор \\rank через DeclareMathOperator.',requirements:['DeclareMathOperator','rank'],starter:'\\documentclass{article}\n\\usepackage{amsmath}\n\\begin{document}\n$\\rank A=n$\n\\end{document}',validators:[contains('\\DeclareMathOperator{\\rank}{rank}','Оператор объявлен.','Добавьте DeclareMathOperator в преамбулу.')],hints:['Объявление находится до document.','Первый аргумент — новая команда.','\\DeclareMathOperator{\\rank}{rank}'],solution:'\\documentclass{article}\n\\usepackage{amsmath}\n\\DeclareMathOperator{\\rank}{rank}\n\\begin{document}\n$\\rank A=n$\n\\end{document}',concepts:['operator','preamble'],'Дополнить документ'},
      {title:'Текст в формуле',instructions:'Оформите слово «если» через text.',requirements:['\\text{если}'],starter:article('\\[x=1, если y=0\\]','\\usepackage{amsmath}'),validators:[contains('\\text{если}','Текст оформлен математически корректно.','Используйте \\text{если}.')],hints:['Обычные слова не пишут как переменные.','amsmath уже подключён.','Используйте text.'],solution:article('\\[x=1,\\quad \\text{если }y=0\\]','\\usepackage{amsmath}'),concepts:['text','math-mode'],'Улучшить код'},
      {title:'Split внутри equation',instructions:'Разбейте преобразование на две строки с одним номером.',requirements:['equation','split'],starter:article('\\begin{equation}\nf(x)=x^2+2x+1=(x+1)^2\n\\end{equation}','\\usepackage{amsmath}'),validators:[environment('equation','Сохранён equation.','Оставьте equation.'),environment('split','Добавлен split.','Поместите две строки внутрь split.')],hints:['Внешнее окружение — equation.','Внутреннее — split.','Разделите строки \\\\.'],solution:article('\\begin{equation}\n\\begin{split}\nf(x)&=x^2+2x+1\\\\\n&=(x+1)^2\n\\end{split}\n\\end{equation}','\\usepackage{amsmath}'),concepts:['split','equation'],'Рефакторинг'}
    ]
  },
  {
    id:'theorem-numbering',title:'Системы теорем и нумерация',subtitle:'Единая архитектура теорем, лемм, определений и доказательств.',description:'newtheorem, theoremstyle и нумерация по разделам.',prerequisite:'Теоремы и доказательства',difficulty:'Продвинутый',category:'Математика',commands:['newtheorem','theoremstyle','proof'],
    steps:[
      {title:'Определение окружений',body:'newtheorem создаёт не конкретную теорему, а новый тип структурного объекта. После этого окружение можно использовать многократно во всём документе.'},
      {title:'Общая нумерация',body:'Леммы и теоремы часто должны использовать одну последовательность номеров. Для этого новое окружение связывают с уже существующим счётчиком.'},
      {title:'Нумерация по section',body:'Аргумент [section] после определения теоремы сбрасывает счётчик при каждом новом разделе.',code:'\\newtheorem{theorem}{Теорема}[section]'},
      {title:'Theoremstyle',body:'amsthm предлагает разные стили для утверждений, определений и замечаний. Стиль задают перед определением соответствующего окружения.'},
      {title:'Proof',body:'Окружение proof автоматически формирует заголовок доказательства и знак окончания. Не набирайте квадрат QED вручную.'},
      {title:'Архитектура научного документа',body:'Определите всю систему теорем в одном месте преамбулы. Это гарантирует одинаковую нумерацию и позволяет журналу переопределить стиль без изменения текста.'}
    ],
    examples:[
      {title:'Теоремы по разделам',description:'Номер имеет вид section.theorem.',code:'\\newtheorem{theorem}{Теорема}[section]'},
      {title:'Лемма с тем же счётчиком',description:'Лемма продолжает нумерацию theorem.',code:'\\newtheorem{lemma}[theorem]{Лемма}'}
    ],
    tasks:[
      {title:'Теорема по разделам',instructions:'Определите theorem с нумерацией внутри section.',requirements:['newtheorem','[section]'],starter:'\\documentclass{article}\n\\usepackage{amsthm}\n\\begin{document}\n\\end{document}',validators:[contains('\\newtheorem{theorem}{Теорема}[section]','Теорема нумеруется по разделам.','Добавьте [section] после заголовка.')],hints:['Определение находится в преамбуле.','Сброс счётчика задаётся последним аргументом.','Используйте [section].'],solution:'\\documentclass{article}\n\\usepackage{amsthm}\n\\newtheorem{theorem}{Теорема}[section]\n\\begin{document}\n\\end{document}',concepts:['newtheorem','counter'],'Написать код'},
      {title:'Свяжите лемму',instructions:'Создайте lemma с тем же счётчиком, что theorem.',requirements:['lemma','[theorem]'],starter:'\\newtheorem{theorem}{Теорема}\n',validators:[contains('\\newtheorem{lemma}[theorem]{Лемма}','Лемма использует счётчик theorem.','Добавьте [theorem] после имени lemma.')],hints:['Счётчик указывается сразу после имени нового окружения.','Нужно [theorem].','\\newtheorem{lemma}[theorem]{Лемма}'],solution:'\\newtheorem{theorem}{Теорема}\n\\newtheorem{lemma}[theorem]{Лемма}',concepts:['newtheorem','shared-counter'],'Дополнить документ'},
      {title:'Добавьте proof',instructions:'Оберните текст доказательства в proof.',requirements:['proof'],starter:article('Утверждение.\nОчевидно из определения.','\\usepackage{amsthm}'),validators:[environment('proof','Создано окружение proof.','Оберните вторую строку в proof.')],hints:['Пакет amsthm подключён.','Нужно окружение proof.','begin{proof} ... end{proof}.'],solution:article('Утверждение.\n\\begin{proof}\nОчевидно из определения.\n\\end{proof}','\\usepackage{amsthm}'),concepts:['proof','theorem'],'Текст → LaTeX'}
    ]
  },
  {
    id:'advanced-tables',title:'Профессиональные таблицы',subtitle:'booktabs, multicolumn, tabularx и длинные таблицы.',description:'Научная табличная типографика и управляемая ширина.',prerequisite:'Таблицы',difficulty:'Продвинутый',category:'Таблицы',commands:['toprule','midrule','bottomrule','multicolumn','tabularx','longtable'],
    steps:[
      {title:'Booktabs',body:'toprule, midrule и bottomrule создают иерархию горизонтальных линий без тяжёлой сетки. Это стандартный подход для многих научных и издательских таблиц.'},
      {title:'Без вертикальных линий',body:'Вертикальные линии редко нужны, если столбцы хорошо выровнены и имеют понятные заголовки. Сначала попробуйте улучшить интервалы и структуру.'},
      {title:'Multicolumn',body:'multicolumn объединяет несколько ячеек текущей строки и временно задаёт их выравнивание.',code:'\\multicolumn{2}{c}{Результаты}'},
      {title:'Tabularx',body:'Столбец X распределяет оставшуюся ширину таблицы. Это удобно для текстовых колонок, которые должны заполнять linewidth.'},
      {title:'Longtable',body:'Обычный tabular не переносится на следующую страницу. Для многостраничных таблиц используется longtable или специализированные альтернативы.'},
      {title:'Числа и единицы',body:'Для числовых данных рассмотрите siunitx: он выравнивает числа по десятичному разделителю и отделяет значение от единицы измерения.'}
    ],
    examples:[
      {title:'Booktabs',description:'Три смысловых уровня линий.',code:'\\begin{tabular}{lr}\n\\toprule\nПараметр & Значение \\\\\n\\midrule\nA & 10 \\\\\nB & 20 \\\\\n\\bottomrule\n\\end{tabular}'},
      {title:'Tabularx',description:'Текстовый столбец занимает оставшуюся ширину.',code:'\\begin{tabularx}{\\linewidth}{lX}\nКод & Подробное описание \\\\\nA & Длинный текст...\n\\end{tabularx}'}
    ],
    tasks:[
      {title:'Добавьте booktabs',instructions:'Замените hline на top/mid/bottomrule.',requirements:['toprule','midrule','bottomrule'],starter:'\\begin{tabular}{lr}\n\\hline\nA & B \\\\\n\\hline\n1 & 2 \\\\\n\\hline\n\\end{tabular}',validators:[contains('\\toprule','Есть верхнее правило.','Добавьте toprule.'),contains('\\midrule','Есть среднее правило.','Добавьте midrule.'),contains('\\bottomrule','Есть нижнее правило.','Добавьте bottomrule.')],hints:['Нужны три разные команды.','Они заменяют hline по смыслу.','toprule / midrule / bottomrule.'],solution:'\\begin{tabular}{lr}\n\\toprule\nA & B \\\\\n\\midrule\n1 & 2 \\\\\n\\bottomrule\n\\end{tabular}',concepts:['booktabs','table'],'Рефакторинг'},
      {title:'Объедините заголовок',instructions:'Объедините два столбца заголовком «Результаты».',requirements:['multicolumn{2}'],starter:'\\begin{tabular}{cc}\nA & B \\\\\n1 & 2\n\\end{tabular}',validators:[contains('\\multicolumn{2}{c}{Результаты}','Заголовок объединяет два столбца.','Используйте multicolumn на два столбца.')],hints:['Команда принимает число столбцов, формат и текст.','Нужно число 2.','\\multicolumn{2}{c}{Результаты}'],solution:'\\begin{tabular}{cc}\n\\multicolumn{2}{c}{Результаты} \\\\\nA & B \\\\\n1 & 2\n\\end{tabular}',concepts:['multicolumn','table'],'Дополнить документ'},
      {title:'Таблица на всю строку',instructions:'Создайте tabularx шириной linewidth со столбцами lX.',requirements:['tabularx','linewidth','lX'],starter:'',validators:[contains('\\begin{tabularx}{\\linewidth}{lX}','Создан tabularx нужной ширины.','Используйте begin{tabularx}{\\linewidth}{lX}.')],hints:['Нужно окружение tabularx.','Первый аргумент — linewidth.','Описание столбцов — lX.'],solution:'\\begin{tabularx}{\\linewidth}{lX}\nA & Длинный текст \\\\\n\\end{tabularx}',concepts:['tabularx','layout'],'Написать код'}
    ]
  },
  {
    id:'float-control',title:'Управление плавающими объектами',subtitle:'figure/table, placement, float barriers и подрисунки.',description:'Как размещать рисунки и таблицы без ручной борьбы со страницей.',prerequisite:'Изображения и плавающие объекты',difficulty:'Продвинутый',category:'Графика',commands:['figure','table','caption','FloatBarrier','subcaption'],
    steps:[
      {title:'Placement — рекомендация',body:'Опции h, t, b и p описывают допустимые места для float. Это не абсолютная команда координат, а набор вариантов для алгоритма верстки.'},
      {title:'Почему [H] не всегда решение',body:'Принудительное размещение может создавать пустоты и ломать поток текста. Сначала разрешите LaTeX выбирать положение, а жёсткие ограничения используйте осознанно.'},
      {title:'FloatBarrier',body:'Пакет placeins позволяет остановить перенос float дальше определённой точки без принудительного закрепления каждого объекта.'},
      {title:'Подрисунки',body:'subcaption создаёт отдельные подписи (a), (b) внутри общего figure. У каждой подрисунки может быть собственная label.'},
      {title:'Caption и label',body:'Для figure label обычно ставят после caption, чтобы он получил номер рисунка. Для секций label ставят после section.'},
      {title:'Алгоритм вместо пикселей',body:'Вместо вопроса «как поставить картинку на 7 mm выше» задавайте структуру: где рисунок допустим, насколько он широк и к какому тексту относится.'}
    ],
    examples:[
      {title:'Гибкое размещение',description:'LaTeX может выбрать верх, низ или отдельную float-страницу.',code:'\\begin{figure}[tbp]\n...\n\\caption{Схема}\n\\label{fig:scheme}\n\\end{figure}'},
      {title:'Барьер',description:'Все предыдущие float должны быть размещены до перехода дальше.',code:'\\usepackage{placeins}\n...\n\\FloatBarrier'}
    ],
    tasks:[
      {title:'Разрешите три позиции',instructions:'Добавьте figure параметры t,b,p.',requirements:['[tbp]'],starter:'\\begin{figure}\n\\caption{Схема}\n\\end{figure}',validators:[contains('\\begin{figure}[tbp]','Позиции указаны.','Добавьте [tbp] после figure.')],hints:['Опции идут сразу после begin{figure}.','Нужны буквы t, b и p.','[tbp]'],solution:'\\begin{figure}[tbp]\n\\caption{Схема}\n\\end{figure}',concepts:['float','placement'],'Дополнить документ'},
      {title:'Правильный label',instructions:'Поставьте label после caption.',requirements:['caption перед label'],starter:'\\begin{figure}\n\\label{fig:a}\n\\caption{Схема}\n\\end{figure}',validators:[contains('\\caption{Схема}\n\\label{fig:a}','Label расположен после caption.','Переместите label ниже caption.')],hints:['Номер figure устанавливает caption.','Label должен читать уже установленный номер.','Переместите строку label.'],solution:'\\begin{figure}\n\\caption{Схема}\n\\label{fig:a}\n\\end{figure}',concepts:['caption','label'],'Исправить ошибку'},
      {title:'Добавьте FloatBarrier',instructions:'Вставьте FloatBarrier перед новым разделом.',requirements:['FloatBarrier'],starter:'...figure...\n\\section{Следующий раздел}',validators:[contains('\\FloatBarrier\n\\section','Барьер стоит перед разделом.','Добавьте FloatBarrier перед section.')],hints:['Команда не имеет аргументов.','Она ставится отдельной строкой.','\\FloatBarrier'],solution:'...figure...\n\\FloatBarrier\n\\section{Следующий раздел}',concepts:['FloatBarrier','float'],'Написать код'}
    ]
  },
  {
    id:'hyperref-links',title:'Hyperref и интерактивный PDF',subtitle:'Кликабельные ссылки, metadata и безопасная навигация.',description:'hyperref, href, url, autoref и настройки PDF.',prerequisite:'Ссылки и перекрёстные ссылки',difficulty:'Средний',category:'Основы',commands:['href','url','autoref','hypersetup','texorpdfstring'],
    steps:[
      {title:'Что делает hyperref',body:'Пакет превращает перекрёстные ссылки, оглавление, цитаты и URL в интерактивные элементы PDF и добавляет документные метаданные.'},
      {title:'Подключайте ближе к концу',body:'Исторически hyperref часто подключают после большинства пакетов, потому что он переопределяет множество ссылочных механизмов. Для конкретного стека всегда проверяйте совместимость.'},
      {title:'href и url',body:'url печатает адрес, href отделяет отображаемый текст от назначения.',code:'\\href{https://example.com}{Проект}'},
      {title:'Autoref',body:'autoref может автоматически добавлять тип объекта к номеру, например «section 2». Язык подписи зависит от конфигурации документа.'},
      {title:'PDF metadata',body:'hypersetup задаёт title, author и subject PDF независимо от визуального титула документа.'},
      {title:'Цвета ссылок',body:'Цветные рамки по умолчанию не всегда подходят для печати. Настройте colorlinks осознанно или используйте hidelinks для нейтрального вида.'}
    ],
    examples:[
      {title:'Нейтральные ссылки',description:'Все ссылки активны, но оформление остаётся спокойным.',code:'\\usepackage[hidelinks]{hyperref}'},
      {title:'PDF metadata',description:'Метаданные видны в свойствах PDF.',code:'\\hypersetup{pdftitle={Research Note},pdfauthor={A. Author}}'}
    ],
    tasks:[
      {title:'Добавьте href',instructions:'Сделайте слово «Проект» ссылкой на example.com.',requirements:['href','URL','Текст ссылки'],starter:article('Проект'),validators:[contains('\\href{https://example.com}{Проект}','Создана ссылка href.','Используйте href с URL и текстом.')],hints:['href принимает два аргумента.','Первый — адрес, второй — видимый текст.','\\href{https://example.com}{Проект}'],solution:article('\\href{https://example.com}{Проект}','\\usepackage{hyperref}'),concepts:['href','hyperref'],'Текст → LaTeX'},
      {title:'Скрытые рамки',instructions:'Подключите hyperref с опцией hidelinks.',requirements:['hidelinks'],starter:'\\documentclass{article}\n\\begin{document}\n\\end{document}',validators:[contains('\\usepackage[hidelinks]{hyperref}','hyperref настроен нейтрально.','Добавьте [hidelinks].')],hints:['Опция идёт в квадратных скобках.','Имя пакета hyperref.','\\usepackage[hidelinks]{hyperref}'],solution:'\\documentclass{article}\n\\usepackage[hidelinks]{hyperref}\n\\begin{document}\n\\end{document}',concepts:['hyperref','pdf'],'Дополнить документ'},
      {title:'Метаданные PDF',instructions:'Добавьте pdftitle в hypersetup.',requirements:['hypersetup','pdftitle'],starter:'\\usepackage{hyperref}\n',validators:[contains('pdftitle=','Добавлен заголовок PDF.','В hypersetup добавьте pdftitle.')],hints:['Команда — hypersetup.','Параметр pdftitle находится внутри фигурных скобок.','\\hypersetup{pdftitle={...}}'],solution:'\\usepackage{hyperref}\n\\hypersetup{pdftitle={Research Note}}',concepts:['metadata','hyperref'],'Написать код'}
    ]
  },
  {
    id:'color-boxes',title:'Цвет, рамки и смысловые блоки',subtitle:'xcolor и tcolorbox без превращения документа в презентационный шум.',description:'Цветовые модели, собственные цвета и аккуратные callout-блоки.',prerequisite:'Профессиональная типографика',difficulty:'Средний',category:'Текст',commands:['color','textcolor','definecolor','colorbox','tcolorbox'],
    steps:[
      {title:'Цвет должен нести функцию',body:'В научном документе цвет лучше использовать для навигации, категорий или предупреждений, а не как случайное украшение. Документ должен оставаться понятным и в чёрно-белой печати.'},
      {title:'Xcolor',body:'xcolor расширяет базовую работу с цветом и поддерживает именованные цвета и разные цветовые модели.'},
      {title:'Свой цвет',body:'definecolor отделяет значение цвета от мест его применения.',code:'\\definecolor{navy}{HTML}{061A3A}'},
      {title:'Textcolor',body:'textcolor изменяет конкретный фрагмент, но для повторяющихся смысловых ролей лучше создать собственную команду.'},
      {title:'Tcolorbox',body:'tcolorbox подходит для определений, примеров и замечаний. Сначала настройте один стиль блока, затем переиспользуйте его.'},
      {title:'Доступность',body:'Не кодируйте смысл только цветом. Предупреждение должно иметь текстовый заголовок или значок, чтобы оставаться понятным при нарушении цветового восприятия.'}
    ],
    examples:[
      {title:'Собственный navy',description:'Цвет определяется один раз.',code:'\\usepackage{xcolor}\n\\definecolor{navy}{HTML}{061A3A}\n\\textcolor{navy}{Важный термин}'},
      {title:'Смысловой блок',description:'Один стиль можно переиспользовать для всех заметок.',code:'\\begin{tcolorbox}[title=Замечание]\nТекст\n\\end{tcolorbox}'}
    ],
    tasks:[
      {title:'Определите navy',instructions:'Создайте цвет navy с HTML 061A3A.',requirements:['definecolor','HTML','061A3A'],starter:'\\usepackage{xcolor}\n',validators:[contains('\\definecolor{navy}{HTML}{061A3A}','Цвет navy определён.','Используйте definecolor с HTML.')],hints:['Команда принимает имя, модель и значение.','Модель — HTML.','\\definecolor{navy}{HTML}{061A3A}'],solution:'\\usepackage{xcolor}\n\\definecolor{navy}{HTML}{061A3A}',concepts:['xcolor','definecolor'],'Написать код'},
      {title:'Окрасьте термин',instructions:'Используйте textcolor navy для слова LaTeX.',requirements:['textcolor','navy'],starter:'LaTeX',validators:[contains('\\textcolor{navy}{LaTeX}','Термин окрашен.','Оберните слово в textcolor.')],hints:['Первый аргумент — цвет.','Второй — текст.','\\textcolor{navy}{LaTeX}'],solution:'\\textcolor{navy}{LaTeX}',concepts:['textcolor','color'],'Текст → LaTeX'},
      {title:'Не полагайтесь только на цвет',instructions:'Добавьте текстовый заголовок «Важно» перед цветным предупреждением.',requirements:['Важно'],starter:'\\textcolor{red}{Не удаляйте файл.}',validators:[contains('Важно','Добавлен текстовый сигнал.','Добавьте слово «Важно».')],hints:['Смысл должен быть видим без цвета.','Добавьте явный текстовый маркер.','Например: \\textbf{Важно}.'],solution:'\\textbf{Важно:} \\textcolor{red}{Не удаляйте файл.}',concepts:['accessibility','color'],'Улучшить код'}
    ]
  },
  {
    id:'biblatex-workflow',title:'BibLaTeX и Biber',subtitle:'Современный библиографический workflow для статей и диссертаций.',description:'bib-файлы, addbibresource, printbibliography и цикл biber.',prerequisite:'Библиография',difficulty:'Продвинутый',category:'Библиография',commands:['addbibresource','printbibliography','autocite','parencite','textcite'],
    steps:[
      {title:'Данные отдельно от документа',body:'В biblatex библиографические записи живут в .bib-файле, а tex-файл содержит только ссылки на ключи. Это позволяет переиспользовать одну библиотеку в нескольких проектах.'},
      {title:'Подключение ресурса',body:'После usepackage{biblatex} команда addbibresource сообщает путь к bib-файлу.',code:'\\usepackage{biblatex}\n\\addbibresource{references.bib}'},
      {title:'Разные типы цитирования',body:'parencite, textcite и autocite выражают разные грамматические роли ссылки. Это лучше, чем вручную переставлять скобки вокруг cite.'},
      {title:'Printbibliography',body:'Список литературы появляется там, где вызвана printbibliography, поэтому его можно помещать в нужную часть документа или делить по категориям.'},
      {title:'Зачем Biber',body:'Biber читает библиографические данные, сортирует и формирует служебные файлы для следующего прохода LaTeX. Полный цикл обычно автоматизирует latexmk или редактор.'},
      {title:'Стиль как конфигурация',body:'Переход от numeric к authoryear меняет форматирование библиографии, но ключи cite и содержимое статьи остаются прежними.'}
    ],
    examples:[
      {title:'Минимальный biblatex',description:'Ресурс, цитата и печать библиографии.',code:'\\usepackage[style=numeric]{biblatex}\n\\addbibresource{references.bib}\n...\n\\parencite{knuth1984}\n\\printbibliography'},
      {title:'Автор в тексте',description:'textcite удобно встраивается в грамматику предложения.',code:'Как показывает \\textcite{knuth1984}, ...'}
    ],
    tasks:[
      {title:'Подключите bib-файл',instructions:'Добавьте references.bib через addbibresource.',requirements:['addbibresource','references.bib'],starter:'\\usepackage{biblatex}\n',validators:[contains('\\addbibresource{references.bib}','Ресурс библиографии подключён.','Добавьте addbibresource.')],hints:['Команда находится в преамбуле.','Укажите имя файла с расширением.','\\addbibresource{references.bib}'],solution:'\\usepackage{biblatex}\n\\addbibresource{references.bib}',concepts:['biblatex','bib-file'],'Дополнить документ'},
      {title:'Напечатайте библиографию',instructions:'Добавьте printbibliography перед end{document}.',requirements:['printbibliography'],starter:'\\begin{document}\nТекст.\n\\end{document}',validators:[contains('\\printbibliography','Команда печати библиографии добавлена.','Добавьте printbibliography.')],hints:['Команда без аргументов.','Она располагается внутри document.','\\printbibliography'],solution:'\\begin{document}\nТекст.\n\\printbibliography\n\\end{document}',concepts:['printbibliography','bibliography'],'Дополнить документ'},
      {title:'Ссылка в скобках',instructions:'Используйте parencite для ключа knuth1984.',requirements:['parencite'],starter:'Согласно источнику, ...',validators:[contains('\\parencite{knuth1984}','Использован parencite.','Добавьте parencite с ключом.')],hints:['Нужен ключ knuth1984.','Команда — parencite.','\\parencite{knuth1984}'],solution:'Согласно источнику \\parencite{knuth1984}, ...',concepts:['parencite','citation'],'Текст → LaTeX'}
    ]
  },
  {
    id:'glossaries-index',title:'Глоссарий и предметный указатель',subtitle:'Термины, аббревиатуры и навигация в больших документах.',description:'glossaries, makeindex и управляемые терминологические системы.',prerequisite:'Большие документы',difficulty:'Продвинутый',category:'Большие документы',commands:['newglossaryentry','newacronym','gls','printglossaries','index'],
    steps:[
      {title:'Глоссарий как база терминов',body:'Термин определяется один раз с именем и описанием, после чего gls вставляет его в текст. Это предотвращает расхождение терминологии по документу.'},
      {title:'Аббревиатуры',body:'newacronym хранит короткую и полную форму. При первой ссылке пакет может автоматически показать расшифровку, а далее использовать сокращение.'},
      {title:'Служебный цикл',body:'Как и библиография, глоссарий требует дополнительной обработки служебных файлов. В реальном проекте это лучше поручить latexmk.'},
      {title:'Предметный указатель',body:'Команда index создаёт невидимую запись для последующего построения алфавитного указателя. Она не должна заменять обычное объяснение термина в тексте.'},
      {title:'Иерархические термины',body:'Крупные глоссарии могут иметь родительские записи и категории. Сначала проектируйте словарь, а затем подключайте автоматизацию.'},
      {title:'Когда это нужно',body:'Для 10-страничной заметки глоссарий избыточен. Для диссертации, стандарта, технической книги или отчёта с десятками сокращений он резко повышает качество навигации.'}
    ],
    examples:[
      {title:'Термин',description:'Определение хранится отдельно от места использования.',code:'\\newglossaryentry{latex}{name=LaTeX,description={Система подготовки документов}}\n... \\gls{latex}'},
      {title:'Аббревиатура',description:'Одна запись содержит полную и краткую форму.',code:'\\newacronym{api}{API}{Application Programming Interface}'}
    ],
    tasks:[
      {title:'Создайте аббревиатуру API',instructions:'Определите newacronym с ключом api.',requirements:['newacronym','API','Application Programming Interface'],starter:'',validators:[contains('\\newacronym{api}{API}{Application Programming Interface}','Аббревиатура определена.','Используйте newacronym с тремя аргументами.')],hints:['Первый аргумент — ключ.','Второй — краткая форма.','Третий — полная форма.'],solution:'\\newacronym{api}{API}{Application Programming Interface}',concepts:['acronym','glossary'],'Написать код'},
      {title:'Используйте gls',instructions:'Вставьте термин по ключу latex.',requirements:['gls{latex}'],starter:'Система используется в научных работах.',validators:[contains('\\gls{latex}','Термин вставлен через gls.','Добавьте \\gls{latex}.')],hints:['Не дублируйте полное определение.','Нужен ключ latex.','\\gls{latex}'],solution:'Система \\gls{latex} используется в научных работах.',concepts:['gls','term'],'Текст → LaTeX'},
      {title:'Добавьте индексный термин',instructions:'Добавьте index{LaTeX} после первого упоминания.',requirements:['index{LaTeX}'],starter:'LaTeX — система подготовки документов.',validators:[contains('\\index{LaTeX}','Запись указателя добавлена.','Используйте index{LaTeX}.')],hints:['Команда невидима в обычном тексте.','Аргумент — термин.','\\index{LaTeX}'],solution:'LaTeX\\index{LaTeX} — система подготовки документов.',concepts:['index','navigation'],'Дополнить документ'}
    ]
  },
  {
    id:'beamer-presentations',title:'Презентации в Beamer',subtitle:'Слайды как структурированный документ, а не набор вручную размещённых объектов.',description:'frame, overlays, blocks и темы Beamer.',prerequisite:'Академические публикации',difficulty:'Продвинутый',category:'Academic challenges',commands:['frame','frametitle','pause','only','block'],
    steps:[
      {title:'Класс beamer',body:'Beamer — отдельный documentclass. Он сохраняет привычные команды LaTeX для формул, списков, изображений и библиографии, но выводит материал в кадры.'},
      {title:'Frame',body:'Каждый слайд обычно является окружением frame. Заголовок задают frametitle или короткой формой аргумента frame.'},
      {title:'Меньше текста',body:'То, что хорошо работает на странице статьи, плохо работает на слайде. Один frame должен поддерживать одну мысль, а не переносить целый абзац статьи.'},
      {title:'Overlays',body:'pause, only и спецификации вида <2-> позволяют поэтапно открывать элементы. Используйте их для логики рассказа, а не для декоративной анимации.'},
      {title:'Blocks',body:'block, alertblock и exampleblock создают семантические контейнеры. Тема презентации определяет их визуальный вид.'},
      {title:'Тема и бренд',body:'Не редактируйте каждый frame вручную. Настройте тему, цвета и шрифты централизованно, как дизайн-систему документа.'}
    ],
    examples:[
      {title:'Минимальный frame',description:'Заголовок и два пункта.',code:'\\documentclass{beamer}\n\\begin{document}\n\\begin{frame}{Главная идея}\n\\begin{itemize}\n\\item Первый тезис\n\\item Второй тезис\n\\end{itemize}\n\\end{frame}\n\\end{document}'},
      {title:'Пошаговое раскрытие',description:'Второй тезис появляется позже.',code:'\\begin{frame}{Этапы}\nПервый тезис\\pause\n\\begin{itemize}\n\\item Второй тезис\n\\end{itemize}\n\\end{frame}'}
    ],
    tasks:[
      {title:'Первый frame',instructions:'Создайте frame с заголовком «Метод».',requirements:['frame','Метод'],starter:'\\documentclass{beamer}\n\\begin{document}\n\\end{document}',validators:[environment('frame','Создан frame.','Используйте окружение frame.'),contains('Метод','Заголовок добавлен.','Добавьте заголовок «Метод».')],hints:['Frame — окружение.','Короткий заголовок можно указать после begin{frame}.','\\begin{frame}{Метод}'],solution:'\\documentclass{beamer}\n\\begin{document}\n\\begin{frame}{Метод}\nТекст\n\\end{frame}\n\\end{document}',concepts:['beamer','frame'],'Собрать документ'},
      {title:'Добавьте pause',instructions:'Разделите два тезиса командой pause.',requirements:['pause'],starter:'Первый тезис.\nВторой тезис.',validators:[contains('\\pause','Добавлена пауза.','Вставьте \\pause между тезисами.')],hints:['Команда не имеет аргументов.','Она ставится между частями кадра.','\\pause'],solution:'Первый тезис.\n\\pause\nВторой тезис.',concepts:['overlay','pause'],'Дополнить документ'},
      {title:'Смысловой block',instructions:'Оберните определение в block с заголовком «Определение».',requirements:['block','Определение'],starter:'LaTeX — система подготовки документов.',validators:[environment('block','Создан block.','Используйте block.'),contains('Определение','Есть заголовок блока.','Добавьте заголовок.')],hints:['block — окружение.','Заголовок задаётся аргументом begin.','\\begin{block}{Определение}'],solution:'\\begin{block}{Определение}\nLaTeX — система подготовки документов.\n\\end{block}',concepts:['block','beamer'],'Текст → LaTeX'}
    ]
  },
  {
    id:'unicode-engines',title:'XeLaTeX, LuaLaTeX и системные шрифты',subtitle:'Unicode-движки, fontspec и современная многоязычная типографика.',description:'Выбор движка, fontspec, polyglossia и системные OpenType-шрифты.',prerequisite:'Профессиональная типографика',difficulty:'Экспертный',category:'Большие документы',commands:['fontspec','setmainfont','setsansfont','setmonofont','polyglossia'],
    steps:[
      {title:'Три современных сценария',body:'pdfLaTeX остаётся очень совместимым и быстрым; XeLaTeX и LuaLaTeX работают с Unicode и системными OpenType/TrueType-шрифтами значительно естественнее.'},
      {title:'Fontspec',body:'fontspec используется с XeLaTeX/LuaLaTeX и позволяет обращаться к системным шрифтам по имени.',code:'\\usepackage{fontspec}\n\\setmainfont{TeX Gyre Termes}'},
      {title:'Не смешивайте несовместимые подходы',body:'Классическая связка inputenc/fontenc характерна для pdfLaTeX. При переходе на Unicode-движок преамбулу нужно пересмотреть, а не механически добавить fontspec.'},
      {title:'LuaLaTeX',body:'LuaLaTeX сочетает Unicode/OpenType с встроенным Lua и особенно полезен для программируемой типографики и современных пакетов.'},
      {title:'Многоязычность',body:'Для Unicode-движков часто используют polyglossia, хотя современные версии babel также поддерживают эти движки. Выбирайте один осознанный языковой стек.'},
      {title:'Воспроизводимость шрифтов',body:'Системный шрифт удобен, но может отсутствовать на CI или у соавтора. Для воспроизводимой сборки используйте доступные TeX-шрифты или документируйте зависимости.'}
    ],
    examples:[
      {title:'XeLaTeX/LuaLaTeX с fontspec',description:'Основной, sans и mono шрифты задаются централизованно.',code:'\\usepackage{fontspec}\n\\setmainfont{TeX Gyre Termes}\n\\setsansfont{TeX Gyre Heros}\n\\setmonofont{TeX Gyre Cursor}'},
      {title:'Языки через polyglossia',description:'Основной и дополнительный языки задаются явно.',code:'\\usepackage{polyglossia}\n\\setdefaultlanguage{russian}\n\\setotherlanguage{english}'}
    ],
    tasks:[
      {title:'Задайте основной шрифт',instructions:'Используйте setmainfont для TeX Gyre Termes.',requirements:['setmainfont','TeX Gyre Termes'],starter:'\\usepackage{fontspec}\n',validators:[contains('\\setmainfont{TeX Gyre Termes}','Основной шрифт задан.','Добавьте setmainfont.')],hints:['fontspec уже подключён.','Команда принимает имя шрифта.','\\setmainfont{TeX Gyre Termes}'],solution:'\\usepackage{fontspec}\n\\setmainfont{TeX Gyre Termes}',concepts:['fontspec','font'],'Дополнить документ'},
      {title:'Добавьте mono-шрифт',instructions:'Укажите TeX Gyre Cursor как моноширинный.',requirements:['setmonofont'],starter:'\\usepackage{fontspec}\n',validators:[contains('\\setmonofont{TeX Gyre Cursor}','Mono-шрифт задан.','Используйте setmonofont.')],hints:['Команда аналогична setmainfont.','Имя — TeX Gyre Cursor.','\\setmonofont{TeX Gyre Cursor}'],solution:'\\usepackage{fontspec}\n\\setmonofont{TeX Gyre Cursor}',concepts:['fontspec','mono'],'Написать код'},
      {title:'Уберите inputenc',instructions:'Для fontspec удалите устаревшее подключение inputenc.',requirements:['fontspec без inputenc'],starter:'\\usepackage[utf8]{inputenc}\n\\usepackage{fontspec}\n',validators:[{type:'containsText',value:'\\usepackage{fontspec}',message:'fontspec сохранён.',hint:'Оставьте fontspec.'}],hints:['Fontspec уже работает с Unicode.','В этом сценарии inputenc не нужен.','Оставьте только fontspec.'],solution:'\\usepackage{fontspec}',concepts:['engine','migration'],'Рефакторинг'}
    ]
  },
  {
    id:'build-automation',title:'Автоматическая сборка: latexmk, CI и воспроизводимость',subtitle:'Как превратить LaTeX-проект в надёжный инженерный pipeline.',description:'latexmk, несколько проходов, библиография, CI и стабильная сборка.',prerequisite:'Продвинутый LaTeX',difficulty:'Экспертный',category:'Отладка',commands:['latexmk','biber','makeglossaries','synctex'],
    steps:[
      {title:'Почему одного запуска мало',body:'Ссылки, оглавление, библиография и глоссарии могут требовать нескольких проходов и внешних программ. Ручной запуск каждой стадии плохо масштабируется.'},
      {title:'Latexmk',body:'latexmk анализирует служебные файлы и автоматически запускает нужное количество проходов движка и библиографических инструментов.'},
      {title:'Выбор движка',body:'Флаг -pdf подходит для pdfLaTeX, а для LuaLaTeX/XeLaTeX можно настроить соответствующую команду. Важно, чтобы локальная и CI-сборка использовали одинаковый движок.'},
      {title:'Continuous preview',body:'Режим -pvc пересобирает документ при изменении файлов. Это удобно при работе рядом с PDF viewer с SyncTeX.'},
      {title:'CI',body:'В репозитории можно собирать PDF на каждый pull request, чтобы сломанная ссылка, отсутствующий файл или ошибка библиографии обнаруживались до merge.'},
      {title:'Воспроизводимость',body:'Зафиксируйте версию TeX Live или контейнер, храните исходники рисунков и не полагайтесь на случайные локальные шрифты. Тогда проект собирается одинаково через год и на другой машине.'}
    ],
    examples:[
      {title:'Обычная сборка',description:'Latexmk сам определяет число проходов.',code:'latexmk -pdf main.tex'},
      {title:'Очистка служебных файлов',description:'Удаляет сгенерированные промежуточные файлы.',code:'latexmk -c'}
    ],
    tasks:[
      {title:'Команда latexmk',instructions:'Напишите команду сборки main.tex в PDF.',requirements:['latexmk','-pdf','main.tex'],starter:'',validators:[contains('latexmk -pdf main.tex','Команда сборки корректна.','Используйте latexmk -pdf main.tex.')],hints:['Инструмент — latexmk.','Флаг PDF — -pdf.','Файл — main.tex.'],solution:'latexmk -pdf main.tex',concepts:['latexmk','build'],'Написать код'},
      {title:'Continuous preview',instructions:'Добавьте режим постоянной пересборки.',requirements:['-pvc'],starter:'latexmk -pdf main.tex',validators:[contains('-pvc','Режим continuous preview включён.','Добавьте флаг -pvc.')],hints:['Нужен дополнительный флаг.','Он называется -pvc.','latexmk -pdf -pvc main.tex'],solution:'latexmk -pdf -pvc main.tex',concepts:['latexmk','watch'],'Дополнить документ'},
      {title:'Очистка проекта',instructions:'Напишите команду latexmk для удаления временных файлов.',requirements:['latexmk -c'],starter:'',validators:[contains('latexmk -c','Команда очистки указана.','Используйте latexmk -c.')],hints:['Флаг очистки — -c.','PDF при обычной очистке сохраняется.','latexmk -c'],solution:'latexmk -c',concepts:['latexmk','cleanup'],'Написать код'}
    ]
  }
];

function buildModule(topic:Topic,index:number):CourseModule{
  const number=modules.length+index+1;
  const lessonId=topic.id;
  const newExercises:Exercise[]=topic.tasks.map((task,i)=>({
    id:`x${String(number).padStart(2,'0')}-${i+1}`,
    lessonId,category:topic.category,difficulty:topic.difficulty,mode:task.mode,title:task.title,instructions:task.instructions,
    requirements:task.requirements,starterCode:task.starter,validators:task.validators,hints:task.hints,solution:task.solution,concepts:task.concepts
  }));
  const theory:TheoryBlock[]=topic.steps.map((step,i)=>({id:`${lessonId}-t${i+1}`,...step}));
  const lesson:Lesson={id:lessonId,moduleId:topic.id,number,title:topic.title,subtitle:topic.subtitle,difficulty:topic.difficulty,theory,
    examples:topic.examples.map((example,i)=>({id:`${lessonId}-ex${i+1}`,...example})),exercises:newExercises,relatedCommands:topic.commands};
  return {id:topic.id,number,title:topic.title,description:topic.description,prerequisites:topic.prerequisite,difficulty:topic.difficulty,lessons:[lesson]};
}

const originalCount=modules.length;
const added=topics.map((topic,index)=>buildModule(topic,index));
for(const module of added){
  if(modules.some(existing=>existing.id===module.id))continue;
  modules.push(module);
  for(const lesson of module.lessons){
    lessonIndex.set(lesson.id,lessons.length);
    lessons.push(lesson);
    exercises.push(...lesson.exercises);
  }
}

// The mutation is intentional: courses.ts exposes shared structured arrays and this file is imported
// once during application bootstrap before React renders. Existing consumers therefore gain the
// expanded curriculum without coupling page components to a second data source.
if(modules.length!==originalCount+topics.length){
  console.warn('LaTeX gym curriculum expansion was only partially applied.');
}
