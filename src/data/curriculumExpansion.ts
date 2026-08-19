import { cloneCurriculumDraft, type CurriculumDraft } from './curriculumDraft';
import type { CourseModule, Difficulty, Exercise, Lesson, PracticeCategory, TheoryBlock } from '../types';

type Step=[title:string,body:string,code?:string,note?:string];
type Example=[title:string,description:string,code:string];
type Practice=[title:string,instructions:string,target:string,starter:string,solution:string,concepts:string[]];
type Topic={
  id:string; title:string; subtitle:string; description:string; prerequisite:string;
  difficulty:Difficulty; category:PracticeCategory; commands:string[];
  steps:Step[]; examples:Example[]; practice:Practice[];
};

const existingGuides:Record<string,Step[]>={
  'document-structure':[
    ['Что происходит при компиляции','LaTeX сначала читает класс и преамбулу, формирует правила документа и только затем обрабатывает тело. Поэтому полезно мысленно делить исходник на конфигурацию и содержимое.','\\documentclass{article}\n% преамбула\n\\begin{document}\n% содержимое\n\\end{document}'],
    ['Минимальный рабочий пример','Если большой документ перестал собираться, уменьшите его до минимального каркаса и возвращайте части по одной. Так быстро отделяется проблема класса, пакета, окружения или текста.'],
    ['Типичные ошибки каркаса','Чаще всего забывают закрыть document, помещают usepackage после begin{document} или теряют фигурную скобку. Проверяйте структуру сверху вниз, а не меняйте команды наугад.']
  ],
  'sections-paragraphs':[
    ['Логика секционирования','section и subsection описывают смысловую иерархию, а не размер шрифта. Внешний вид меняют стилем документа, а не заменой section на ручной жирный текст.'],
    ['Абзац — не перенос строки','Пустая строка создаёт новый абзац. Двойной обратный слеш не должен использоваться как универсальный способ верстки обычного текста.','Первый абзац.\n\nВторой абзац.'],
    ['Как проектировать длинный текст','Сначала наметьте section/subsection, затем наполняйте их. Такая структура автоматически помогает оглавлению, ссылкам и навигации по исходнику.']
  ],
  'text-formatting':[
    ['Смысл против внешнего вида','emph сообщает смысловую роль фрагмента, тогда как прямое начертание описывает только внешний вид. Семантические команды легче глобально переоформлять.'],
    ['Группировка и область действия','Фигурные скобки ограничивают действие локальных переключателей. Это предотвращает случайное продолжение оформления до конца документа.','Обычный текст {\\bfseries локально жирный} снова обычный.'],
    ['Профессиональная типографика','Не выравнивайте текст пробелами. Автор задаёт структуру и смысл, а интервалы и переносы поручает системе набора.']
  ],
  'math-modes':[
    ['Почему у математики отдельный режим','В математическом режиме символы получают специальные интервалы, формы и правила расположения операторов. Поэтому качественную формулу нельзя имитировать обычным текстом.'],
    ['Inline или display','Встроенная формула остаётся частью предложения. Display-формула нужна, когда выражение является самостоятельным объектом или требует отдельного пространства.'],
    ['Границы математического режима','Не помещайте большие куски обычного текста внутрь $...$. Для коротких слов используйте \\text{...}, а для пояснений выходите из математического режима.']
  ],
  'fractions-powers':[
    ['Аргументы математических команд','frac принимает два аргумента, sqrt — обязательный аргумент и при необходимости степень корня. Чем сложнее выражение, тем важнее группировка фигурными скобками.'],
    ['Индексы как структура','_ и ^ относятся только к следующему токену без скобок: x_i корректен, но x_{ij} требует группировки.','$x_i^2,\quad x_{ij}^{n+1}$'],
    ['Читаемость исходника','Сложные формулы полезно разбивать логическими пробелами и переносами строк: результат не меняется, а исходник становится заметно легче проверять.']
  ],
  'equations-theorems':[
    ['Нумерация формул','equation нужен, когда формула — самостоятельный объект. Если номер не нужен, используйте ненумеруемый режим вместо ручного скрытия номера.'],
    ['Выравнивание строк','В align символ & задаёт логическую точку выравнивания, обычно знак равенства; \\\\ завершает строку. Это семантическая сетка, а не таблица из пробелов.'],
    ['Теорема и доказательство','amsthm централизует теоремы, определения, леммы и proof. Это особенно важно для длинных математических работ с единой системой нумерации.']
  ],
  'basic-tables':[
    ['Модель столбцов','Аргумент tabular заранее описывает столбцы: l, c, r и другие типы. Структура таблицы известна LaTeX до появления данных.'],
    ['Строки и ячейки','& разделяет ячейки, \\\\ завершает строку. Если число разделителей неожиданно отличается, ошибка обычно локальна именно в этой строке.'],
    ['Таблица — не Excel','В научной типографике вертикальные линии часто ухудшают читаемость. Хорошие интервалы и booktabs обычно дают более профессиональный результат.']
  ],
  'figures-captions':[
    ['Почему figure плавающий','LaTeX отделяет логическое место рисунка от физического места на странице, чтобы избегать больших пустот и плохих переносов.'],
    ['Размер относительно текста','Размер изображения удобнее задавать через \\linewidth или \\textwidth, а не абсолютными сантиметрами.','\\includegraphics[width=.75\\linewidth]{figure.pdf}'],
    ['Подпись и ссылка','caption должен объяснять рисунок автономно; label обычно ставят после caption, чтобы он получил корректный номер float.']
  ],
  'tikz-basics':[
    ['Координатная модель TikZ','TikZ строит графику из координат, путей и узлов. Рисунок становится воспроизводимым и согласованным с обозначениями документа.'],
    ['Пути и операции','draw задаёт путь, а --, rectangle, circle и arc описывают геометрию. Сложную схему лучше собирать из нескольких коротких осмысленных путей.'],
    ['Когда TikZ оправдан','TikZ особенно полезен для блок-схем, математических рисунков и диаграмм. Для фотографий и сложной художественной графики лучше внешний файл.']
  ],
  'labels-refs':[
    ['Двухпроходная компиляция','Номера объектов часто становятся известны после первого прохода и подставляются на следующем. Временные ?? после новой ссылки не всегда означают ошибку.'],
    ['Система имён label','Используйте устойчивые имена вроде sec:method, fig:architecture, eq:energy. В большом проекте это резко ускоряет навигацию.'],
    ['Никогда не пишите номер вручную','Фраза «см. раздел 4» ломается после перестановки разделов; ref сохраняет логическую связь с объектом.']
  ],
  'bibliography-basics':[
    ['Ключ вместо номера','cite ссылается на стабильный ключ источника, а формат номера или автор–год задаётся стилем. Нумерацию не нужно поддерживать вручную.'],
    ['Малый и большой проект','thebibliography подходит для небольшого учебного документа; статьи, книги и диссертации обычно выигрывают от biblatex/biber и отдельного .bib-файла.'],
    ['Качество метаданных','Автоматизация не исправляет плохие данные. Проверяйте автора, название, год, DOI и тип источника.']
  ],
  'custom-commands':[
    ['Команда как API документа','Пользовательская команда должна выражать понятие — например \\vect{x}, а не конкретный визуальный трюк. Тогда стиль меняется в одном месте.'],
    ['Аргументы и повторение','Параметры #1, #2 превращают команду в шаблон. Повторяющаяся конструкция часто просится в отдельную смысловую команду.'],
    ['Не переусложняйте преамбулу','Макрос полезен, когда уменьшает повторение или фиксирует смысл. Одноразовая команда ради одной строки делает исходник сложнее.']
  ],
  'large-documents':[
    ['Главный файл как карта проекта','Главный tex-файл большого проекта должен оставаться коротким: класс, общая преамбула, front matter и подключения глав.'],
    ['input и include','input подходит для произвольных фрагментов, include — для крупных структурных единиц вроде глав и взаимодействует с includeonly.'],
    ['Структура каталогов','Разделяйте главы, рисунки, библиографию и общие макросы. Предсказуемые пути облегчают совместную работу и CI.']
  ],
  'academic-paper':[
    ['Метаданные статьи','title, author и date живут в преамбуле, а maketitle выводит их. Данные публикации отделены от визуального представления.'],
    ['Аннотация как жанр','Хороший abstract кратко сообщает задачу, метод, результат и значение работы; LaTeX задаёт структуру, но не заменяет редактуру.'],
    ['Воспроизводимая статья','Формулы, ссылки, таблицы и библиография как структурированные элементы позволяют быстро адаптировать работу под требования другого журнала.']
  ],
  'debugging':[
    ['Ищите первую реальную ошибку','Одна синтаксическая ошибка может породить десятки сообщений. Начинайте с самой ранней ошибки в логе и только потом анализируйте остальные.'],
    ['Метод деления пополам','Временно отключите половину документа. Если ошибка исчезла, проблема в скрытой части. Повторяйте до локализации фрагмента.'],
    ['Warning не равен error','Предупреждение может не блокировать PDF, но его нужно понимать. Финальная публикация не должна содержать необъяснённых предупреждений.']
  ]
};

const topics:Topic[]=[
  {
    id:'packages-preamble',title:'Пакеты и архитектура преамбулы',subtitle:'Как подключать возможности LaTeX без хаотичной преамбулы.',description:'usepackage, параметры пакетов, порядок подключения и минимальные конфигурации.',prerequisite:'Структура документа',difficulty:'Базовый',category:'Основы',commands:['usepackage','documentclass','PassOptionsToPackage'],
    steps:[
      ['Зачем нужны пакеты','Ядро LaTeX компактно; пакеты добавляют математику, графику, цвета, ссылки, языки и специализированные возможности. Подключайте пакет, понимая его роль.'],
      ['Синтаксис usepackage','Пакет подключается в преамбуле. Квадратные скобки передают параметры, фигурные — имя пакета.','\\usepackage[margin=25mm]{geometry}'],
      ['Несколько пакетов','В большом проекте отдельная строка на смысловой пакет обычно лучше длинного списка: так проще видеть параметры и источник конфликта.'],
      ['Порядок подключения','Порядок иногда важен, потому что один пакет может переопределять команды другого. При конфликте проверяйте документацию конкретной пары.'],
      ['Минимальная преамбула','Не копируйте десятки usepackage из чужого шаблона. Начинайте с минимального набора и добавляйте зависимости по мере необходимости.'],
      ['Профессиональная практика','Общие макросы можно вынести в отдельный файл, но главная преамбула должна оставаться читаемой картой возможностей документа.']
    ],
    examples:[['Компактная преамбула','Геометрия страницы и amsmath подключены явно.','\\documentclass{article}\n\\usepackage[margin=25mm]{geometry}\n\\usepackage{amsmath}\n\\begin{document}\nText\n\\end{document}'],['Пакет с параметрами','Опции идут перед именем пакета.','\\usepackage[colorlinks=true,linkcolor=blue]{hyperref}']],
    practice:[['Подключите geometry','Добавьте geometry с полями 25 mm.','\\usepackage[margin=25mm]{geometry}','\\documentclass{article}\n\\begin{document}\nText\n\\end{document}','\\documentclass{article}\n\\usepackage[margin=25mm]{geometry}\n\\begin{document}\nText\n\\end{document}',['package','preamble']],['Перенесите пакет в преамбулу','Исправьте usepackage внутри тела.','\\documentclass{article}\n\\usepackage{amsmath}','\\documentclass{article}\n\\begin{document}\n\\usepackage{amsmath}\nText\n\\end{document}','\\documentclass{article}\n\\usepackage{amsmath}\n\\begin{document}\nText\n\\end{document}',['package','debug']],['Два пакета','Подключите amsmath и graphicx.','\\usepackage{graphicx}','\\documentclass{article}\n\\usepackage{amsmath}\n\\begin{document}\n\\end{document}','\\documentclass{article}\n\\usepackage{amsmath}\n\\usepackage{graphicx}\n\\begin{document}\n\\end{document}',['package','architecture']]]
  },
  {
    id:'document-classes-layout',title:'Классы документа и геометрия страницы',subtitle:'article, report, book и управление физической страницей.',description:'Выбор класса, поля, ориентация, размеры бумаги и логика макета.',prerequisite:'Пакеты и преамбула',difficulty:'Базовый',category:'Большие документы',commands:['documentclass','geometry','newgeometry','restoregeometry'],
    steps:[['Класс определяет поведение','article, report и book отличаются не только внешним видом: они задают уровни секционирования, логику глав и двусторонней печати.'],['Параметры класса','Опции documentclass задают базовый размер, бумагу и режим печати.','\\documentclass[12pt,a4paper,twoside]{report}'],['Geometry','geometry безопасно вычисляет поля и рабочую область страницы.'],['Twoside','В книге внутреннее и внешнее поля имеют разные роли; twoside влияет на зеркальность и колонтитулы.'],['Локальные изменения','newgeometry и restoregeometry позволяют временно менять поля, но единый макет почти всегда профессиональнее.'],['Как выбирать класс','Выбирайте по назначению документа: статья — article, отчёт с главами — report, книга — book.']],
    examples:[['Отчёт A4','Отчёт с симметричными полями.','\\documentclass[12pt,a4paper]{report}\n\\usepackage[margin=28mm]{geometry}'],['Книга','Двусторонний макет под переплёт.','\\documentclass[11pt,twoside]{book}\n\\usepackage[inner=32mm,outer=24mm]{geometry}']],
    practice:[['Класс report','Измените класс на report.','\\documentclass{report}','\\documentclass{article}\n\\begin{document}\nText\n\\end{document}','\\documentclass{report}\n\\begin{document}\nText\n\\end{document}',['documentclass','report']],['Поля 30 mm','Подключите geometry с margin=30mm.','margin=30mm','\\documentclass{article}\n\\begin{document}\nText\n\\end{document}','\\documentclass{article}\n\\usepackage[margin=30mm]{geometry}\n\\begin{document}\nText\n\\end{document}',['geometry','layout']],['Двусторонняя книга','Создайте book с twoside.','\\documentclass[twoside]{book}','\\documentclass{article}\n\\begin{document}\n\\end{document}','\\documentclass[twoside]{book}\n\\begin{document}\n\\end{document}',['book','twoside']]]
  },
  {
    id:'typography-microtype',title:'Профессиональная типографика и microtype',subtitle:'Интервалы, переносы и микротипографика без ручного вмешательства.',description:'microtype, кавычки, неразрывные пробелы и устойчивый набор текста.',prerequisite:'Текст и типографика',difficulty:'Средний',category:'Текст',commands:['microtype','textquote','mbox','raggedright'],
    steps:[['Микротипографика','Качество набора зависит от межбуквенных интервалов, выступания знаков и распределения пробелов; microtype автоматизирует часть этих решений.'],['Подключение','Во многих pdfLaTeX-проектах достаточно подключить пакет без параметров.','\\usepackage{microtype}'],['Неразрывный пробел','Тильда связывает элементы, которые нежелательно разделять переносом.','рис.~\\ref{fig:scheme}'],['Кавычки и язык','Для многоязычных проектов лучше управлять кавычками через языковой стек и csquotes.'],['Overfull box','Сначала ищите длинный URL, неверный язык переноса или неразрывную конструкцию, а не уменьшайте шрифт.'],['Ручные интервалы','hspace/vspace полезны точечно; систематическая ручная подгонка обычно означает проблему структуры или стиля.']],
    examples:[['Чистая типографическая преамбула','Язык и microtype подключены явно.','\\usepackage[english,russian]{babel}\n\\usepackage{microtype}'],['Стабильная ссылка','Номер не отрывается от слова.','См. раздел~\\ref{sec:method}.']],
    practice:[['Подключите microtype','Добавьте пакет в преамбулу.','\\usepackage{microtype}','\\documentclass{article}\n\\begin{document}\nText\n\\end{document}','\\documentclass{article}\n\\usepackage{microtype}\n\\begin{document}\nText\n\\end{document}',['microtype','typography']],['Свяжите ссылку','Сделайте пробел перед ref неразрывным.','раздел~\\ref','См. раздел \\ref{sec:x}.','См. раздел~\\ref{sec:x}.',['nonbreaking-space','ref']],['Уберите hspace','Замените ручной пробел обычным.','Первое слово. Второе слово.','Первое слово.\\hspace{1cm} Второе слово.','Первое слово. Второе слово.',['spacing','refactor']]]
  },
  {
    id:'advanced-lists',title:'Продвинутые списки',subtitle:'Вложенность, description и управляемая нумерация.',description:'itemize, enumerate, description и enumitem для сложной структуры.',prerequisite:'Текст и типографика',difficulty:'Средний',category:'Текст',commands:['itemize','enumerate','description','item','setlist'],
    steps:[['Три базовых вида','itemize — ненумерованный список, enumerate — последовательность, description — термин и описание. Выбирайте по смыслу.'],['Вложенные уровни','Список может содержать другой список внутри item; begin/end должны быть правильно вложены.'],['Description','Необязательный аргумент item становится термином.','\\begin{description}\n\\item[API] Интерфейс системы.\n\\end{description}'],['Enumitem','enumitem централизованно управляет метками, отступами и продолжением нумерации.'],['Нумерация как информация','Если порядок элементов не важен, enumerate создаёт ложную последовательность.'],['Списки в научном тексте','Если каждый пункт становится несколькими абзацами, лучше рассмотреть подзаголовки.']],
    examples:[['Description','Термин и определение связаны структурно.','\\begin{description}\n\\item[TeX] Система набора.\n\\item[LaTeX] Формат поверх TeX.\n\\end{description}'],['Вложенный список','Второй уровень находится внутри первого item.','\\begin{enumerate}\n\\item Первый\n  \\begin{itemize}\n  \\item Деталь\n  \\end{itemize}\n\\end{enumerate}']],
    practice:[['Description','Создайте description с термином API.','\\begin{description}','', '\\begin{description}\n\\item[API] Интерфейс.\n\\end{description}',['description','item']],['Вложенный itemize','Добавьте маркированный подпункт внутрь enumerate.','\\begin{itemize}','\\begin{enumerate}\n\\item Первый\n\\end{enumerate}','\\begin{enumerate}\n\\item Первый\n\\begin{itemize}\n\\item Деталь\n\\end{itemize}\n\\end{enumerate}',['nested-list','itemize']],['Правильный тип','Преобразуйте шаги из itemize в enumerate.','\\begin{enumerate}','\\begin{itemize}\n\\item Шаг 1\n\\item Шаг 2\n\\end{itemize}','\\begin{enumerate}\n\\item Шаг 1\n\\item Шаг 2\n\\end{enumerate}',['enumerate','semantics']]]
  },
  {
    id:'matrices-cases',title:'Матрицы, системы и кусочные функции',subtitle:'Структурные математические окружения amsmath.',description:'matrix, pmatrix, cases и aligned для многомерных выражений.',prerequisite:'Многострочные формулы',difficulty:'Средний',category:'Математика',commands:['matrix','pmatrix','bmatrix','cases','aligned'],
    steps:[['Матрица как таблица','В matrix столбцы разделяются &, строки — \\\\. pmatrix, bmatrix и другие варианты добавляют ограничители.'],['pmatrix и bmatrix','pmatrix создаёт круглые скобки, bmatrix — квадратные.','\\[A=\\begin{pmatrix}1&0\\\\0&1\\end{pmatrix}\\]'],['Cases','cases предназначен для кусочных функций и автоматически создаёт левую фигурную скобку.'],['Aligned','aligned позволяет выровнять несколько строк внутри более крупного математического окружения.'],['Размерность','В строках матрицы должно быть согласованное число ячеек; лишний & почти всегда быстро выдаёт ошибку.'],['Читаемый исходник','Пишите строки матрицы на отдельных строках исходника — это не влияет на результат и упрощает проверку.']],
    examples:[['Матрица 2×2','Две строки и два столбца.','\\[\\begin{pmatrix}\na & b \\\\\nc & d\n\\end{pmatrix}\\]'],['Кусочная функция','cases связывает выражения с условиями.','\\[f(x)=\\begin{cases}\nx^2,&x\\ge0,\\\\\n-x,&x<0.\n\\end{cases}\\]']],
    practice:[['Единичная матрица','Создайте pmatrix 2×2.','\\begin{pmatrix}','\\[A=?\\]','\\[A=\\begin{pmatrix}1&0\\\\0&1\\end{pmatrix}\\]',['matrix','pmatrix']],['Cases','Создайте две ветви функции.','\\begin{cases}','\\[f(x)=\\]','\\[f(x)=\\begin{cases}x^2,&x\\ge0,\\\\-x,&x<0.\\end{cases}\\]',['cases','piecewise']],['Исправьте размерность','Уберите лишний элемент первой строки.','1&0\\\\0&1','\\begin{pmatrix}1&0&2\\\\0&1\\end{pmatrix}','\\begin{pmatrix}1&0\\\\0&1\\end{pmatrix}',['matrix','debug']]]
  },
  {
    id:'math-operators',title:'Операторы, пределы и многострочная математика',subtitle:'Правильные операторы вместо имитации обычным текстом.',description:'DeclareMathOperator, limits, split и семантика математического набора.',prerequisite:'Матрицы и системы',difficulty:'Продвинутый',category:'Математика',commands:['DeclareMathOperator','operatorname','lim','sum','split'],
    steps:[['Оператор — отдельный класс','sin, log, det и lim получают прямой шрифт и специальные интервалы; нельзя имитировать их буквами переменных.'],['Собственный оператор','DeclareMathOperator создаёт команду с правильной типографикой.','\\DeclareMathOperator{\\rank}{rank}'],['Пределы','У sum, prod и lim положение индексов зависит от режима формулы; интервалы вокруг них не задают вручную.'],['Split','split разбивает одно нумеруемое уравнение на несколько выровненных строк.'],['Текст внутри формулы','Для словесных условий используйте \\text{...} из amsmath.'],['Семантический исходник','Операторы должны оставаться операторами, переменные — переменными, текст — текстом.']],
    examples:[['Оператор rank','Оператор объявлен один раз.','\\DeclareMathOperator{\\rank}{rank}\n$\\rank A=n$'],['Split','Две строки с одним номером.','\\begin{equation}\n\\begin{split}\nf(x)&=x^2+2x+1\\\\\n&=(x+1)^2\n\\end{split}\n\\end{equation}']],
    practice:[['Оператор rank','Объявите \\rank.','\\DeclareMathOperator{\\rank}{rank}','\\usepackage{amsmath}','\\usepackage{amsmath}\n\\DeclareMathOperator{\\rank}{rank}',['operator','preamble']],['Текст в формуле','Оформите «если» через text.','\\text{если}','$x=1, если y=0$','$x=1,\\quad \\text{если }y=0$',['text','math-mode']],['Split','Разбейте equation на две строки.','\\begin{split}','\\begin{equation}\nf(x)=x^2+2x+1=(x+1)^2\n\\end{equation}','\\begin{equation}\n\\begin{split}\nf(x)&=x^2+2x+1\\\\\n&=(x+1)^2\n\\end{split}\n\\end{equation}',['split','equation']]]
  },
  {
    id:'theorem-numbering',title:'Системы теорем и нумерация',subtitle:'Единая архитектура теорем, лемм, определений и доказательств.',description:'newtheorem, theoremstyle и нумерация по разделам.',prerequisite:'Теоремы и доказательства',difficulty:'Продвинутый',category:'Математика',commands:['newtheorem','theoremstyle','proof'],
    steps:[['Определение окружений','newtheorem создаёт новый тип структурного объекта, который затем используется многократно.'],['Общая нумерация','Леммы и теоремы могут делить один счётчик, если это соответствует логике работы.'],['По разделам','[section] сбрасывает счётчик теорем при новом разделе.','\\newtheorem{theorem}{Теорема}[section]'],['Theoremstyle','amsthm предлагает разные стили утверждений, определений и замечаний.'],['Proof','proof автоматически формирует заголовок доказательства и знак окончания.'],['Архитектура','Определите всю систему теорем в одном месте преамбулы для стабильной нумерации и стиля.']],
    examples:[['Теоремы по разделам','Номер имеет вид section.theorem.','\\newtheorem{theorem}{Теорема}[section]'],['Общий счётчик','Лемма продолжает нумерацию theorem.','\\newtheorem{lemma}[theorem]{Лемма}']],
    practice:[['По разделам','Определите theorem с [section].','\\newtheorem{theorem}{Теорема}[section]','\\usepackage{amsthm}','\\usepackage{amsthm}\n\\newtheorem{theorem}{Теорема}[section]',['newtheorem','counter']],['Свяжите lemma','Дайте lemma счётчик theorem.','\\newtheorem{lemma}[theorem]{Лемма}','\\newtheorem{theorem}{Теорема}','\\newtheorem{theorem}{Теорема}\n\\newtheorem{lemma}[theorem]{Лемма}',['shared-counter','lemma']],['Proof','Оберните доказательство в proof.','\\begin{proof}','Утверждение.\nОчевидно из определения.','Утверждение.\n\\begin{proof}\nОчевидно из определения.\n\\end{proof}',['proof','theorem']]]
  },
  {
    id:'advanced-tables',title:'Профессиональные таблицы',subtitle:'booktabs, multicolumn, tabularx и длинные таблицы.',description:'Научная табличная типографика и управляемая ширина.',prerequisite:'Таблицы',difficulty:'Продвинутый',category:'Таблицы',commands:['toprule','midrule','bottomrule','multicolumn','tabularx','longtable'],
    steps:[['Booktabs','toprule, midrule и bottomrule создают иерархию горизонтальных линий без тяжёлой сетки.'],['Без вертикальных линий','Часто достаточно хорошего выравнивания, интервалов и нескольких горизонтальных правил.'],['Multicolumn','multicolumn объединяет несколько ячеек текущей строки.','\\multicolumn{2}{c}{Результаты}'],['Tabularx','Столбец X распределяет оставшуюся ширину таблицы.'],['Longtable','Обычный tabular не переносится на следующую страницу; длинные таблицы требуют отдельного механизма.'],['Числа и единицы','siunitx помогает выравнивать числа и отделять значение от единицы измерения.']],
    examples:[['Booktabs','Три смысловых уровня линий.','\\toprule\nПараметр & Значение \\\\\n\\midrule\nA & 10 \\\\\n\\bottomrule'],['Tabularx','Текстовый столбец занимает остаток ширины.','\\begin{tabularx}{\\linewidth}{lX}\nКод & Подробное описание \\\\\n\\end{tabularx}']],
    practice:[['Booktabs','Добавьте toprule.','\\toprule','\\begin{tabular}{lr}\nA&B\\\\\n1&2\n\\end{tabular}','\\begin{tabular}{lr}\n\\toprule\nA&B\\\\\n\\midrule\n1&2\\\\\n\\bottomrule\n\\end{tabular}',['booktabs','table']],['Multicolumn','Объедините два столбца заголовком.','\\multicolumn{2}{c}{Результаты}','A & B \\\\','\\multicolumn{2}{c}{Результаты} \\\\\nA & B \\\\',['multicolumn','table']],['Tabularx','Создайте таблицу шириной linewidth.','\\begin{tabularx}{\\linewidth}{lX}','','\\begin{tabularx}{\\linewidth}{lX}\nA & Длинный текст \\\\\n\\end{tabularx}',['tabularx','layout']]]
  },
  {
    id:'float-control',title:'Управление плавающими объектами',subtitle:'Placement, FloatBarrier и подрисунки без ручной борьбы со страницей.',description:'figure/table, допустимые позиции, барьеры и subcaption.',prerequisite:'Изображения и плавающие объекты',difficulty:'Продвинутый',category:'Графика',commands:['figure','table','caption','FloatBarrier','subcaption'],
    steps:[['Placement — рекомендация','h, t, b, p описывают допустимые места float; это набор вариантов для алгоритма, а не абсолютные координаты.'],['Почему [H] не всегда решение','Жёсткое размещение может создавать пустоты. Сначала разрешите LaTeX оптимизировать поток.'],['FloatBarrier','placeins позволяет не пропускать старые float дальше смысловой границы.'],['Подрисунки','subcaption создаёт отдельные подписи (a), (b) внутри общего figure.'],['Caption и label','Для figure label обычно ставят после caption, чтобы получить корректный номер.'],['Алгоритм вместо пикселей','Задавайте допустимое положение, ширину и связь с текстом вместо ручного смещения на миллиметры.']],
    examples:[['Гибкое размещение','Разрешены верх, низ и float-страница.','\\begin{figure}[tbp]\n...\n\\caption{Схема}\n\\label{fig:scheme}\n\\end{figure}'],['Барьер','Все предыдущие float должны быть размещены.','\\usepackage{placeins}\n...\n\\FloatBarrier']],
    practice:[['Позиции tbp','Разрешите три позиции.','\\begin{figure}[tbp]','\\begin{figure}\n\\caption{Схема}\n\\end{figure}','\\begin{figure}[tbp]\n\\caption{Схема}\n\\end{figure}',['float','placement']],['Label после caption','Переставьте label ниже caption.','\\caption{Схема}\n\\label{fig:a}','\\label{fig:a}\n\\caption{Схема}','\\caption{Схема}\n\\label{fig:a}',['caption','label']],['FloatBarrier','Добавьте барьер перед section.','\\FloatBarrier\n\\section','...figure...\n\\section{Следующий}','...figure...\n\\FloatBarrier\n\\section{Следующий}',['FloatBarrier','float']]]
  },
  {
    id:'hyperref-links',title:'Hyperref и интерактивный PDF',subtitle:'Кликабельные ссылки, metadata и безопасная навигация.',description:'hyperref, href, url, autoref и настройки PDF.',prerequisite:'Ссылки и перекрёстные ссылки',difficulty:'Средний',category:'Основы',commands:['href','url','autoref','hypersetup','texorpdfstring'],
    steps:[['Что делает hyperref','Пакет превращает ссылки, оглавление, цитаты и URL в интерактивные элементы PDF и добавляет метаданные.'],['Порядок подключения','hyperref переопределяет много ссылочных механизмов, поэтому совместимость с другими пакетами важно проверять.'],['href и url','url печатает адрес, href отделяет видимый текст от назначения.','\\href{https://example.com}{Проект}'],['Autoref','autoref может автоматически добавлять тип объекта к номеру.'],['PDF metadata','hypersetup задаёт title, author и subject файла независимо от визуального титула.'],['Цвета ссылок','Настройте colorlinks осознанно или используйте hidelinks для спокойного печатного вида.']],
    examples:[['Нейтральные ссылки','Интерактивность без цветных рамок.','\\usepackage[hidelinks]{hyperref}'],['Metadata','Заголовок и автор в свойствах PDF.','\\hypersetup{pdftitle={Research Note},pdfauthor={A. Author}}']],
    practice:[['Href','Сделайте слово Проект ссылкой.','\\href{https://example.com}{Проект}','Проект','\\href{https://example.com}{Проект}',['href','hyperref']],['Hidelinks','Подключите hyperref с hidelinks.','\\usepackage[hidelinks]{hyperref}','\\documentclass{article}','\\documentclass{article}\n\\usepackage[hidelinks]{hyperref}',['hyperref','pdf']],['Metadata','Добавьте pdftitle.','pdftitle=','\\usepackage{hyperref}','\\usepackage{hyperref}\n\\hypersetup{pdftitle={Research Note}}',['metadata','hyperref']]]
  },
  {
    id:'color-boxes',title:'Цвет, рамки и смысловые блоки',subtitle:'xcolor и tcolorbox без презентационного шума.',description:'Цветовые модели, собственные цвета и аккуратные callout-блоки.',prerequisite:'Профессиональная типографика',difficulty:'Средний',category:'Текст',commands:['color','textcolor','definecolor','colorbox','tcolorbox'],
    steps:[['Цвет как функция','В научном документе цвет должен помогать навигации или обозначать тип информации, а не быть случайным украшением.'],['Xcolor','xcolor расширяет базовую работу с цветами и поддерживает разные модели.'],['Собственный цвет','definecolor отделяет значение цвета от мест использования.','\\definecolor{navy}{HTML}{061A3A}'],['Textcolor','Для повторяющихся смысловых ролей лучше создать собственную команду, а не копировать textcolor повсюду.'],['Tcolorbox','tcolorbox подходит для определений, примеров и замечаний с единым стилем.'],['Доступность','Не кодируйте смысл только цветом: предупреждение должно иметь текстовый маркер или заголовок.']],
    examples:[['Собственный navy','Цвет определяется один раз.','\\definecolor{navy}{HTML}{061A3A}\n\\textcolor{navy}{Важный термин}'],['Смысловой блок','Единый контейнер для замечаний.','\\begin{tcolorbox}[title=Замечание]\nТекст\n\\end{tcolorbox}']],
    practice:[['Определите navy','Создайте HTML-цвет 061A3A.','\\definecolor{navy}{HTML}{061A3A}','\\usepackage{xcolor}','\\usepackage{xcolor}\n\\definecolor{navy}{HTML}{061A3A}',['xcolor','definecolor']],['Окрасьте термин','Используйте textcolor navy.','\\textcolor{navy}{LaTeX}','LaTeX','\\textcolor{navy}{LaTeX}',['textcolor','color']],['Текстовый маркер','Добавьте слово «Важно».','Важно','\\textcolor{red}{Не удаляйте файл.}','\\textbf{Важно:} \\textcolor{red}{Не удаляйте файл.}',['accessibility','color']]]
  },
  {
    id:'biblatex-workflow',title:'BibLaTeX и Biber',subtitle:'Современный библиографический workflow для статей и диссертаций.',description:'bib-файлы, addbibresource, printbibliography и цикл biber.',prerequisite:'Библиография',difficulty:'Продвинутый',category:'Библиография',commands:['addbibresource','printbibliography','autocite','parencite','textcite'],
    steps:[['Данные отдельно','Библиографические записи живут в .bib-файле, tex содержит ссылки на устойчивые ключи.'],['Ресурс','addbibresource сообщает путь к bib-файлу.','\\usepackage{biblatex}\n\\addbibresource{references.bib}'],['Типы цитирования','parencite, textcite и autocite выражают разные грамматические роли ссылки.'],['Printbibliography','Список литературы появляется там, где вызвана printbibliography.'],['Зачем Biber','Biber сортирует и подготавливает данные для следующего прохода LaTeX; цикл лучше автоматизировать.'],['Стиль как конфигурация','Переход numeric → authoryear меняет оформление, но ключи источников и содержание текста остаются прежними.']],
    examples:[['Минимальный biblatex','Ресурс, цитата и печать библиографии.','\\usepackage[style=numeric]{biblatex}\n\\addbibresource{references.bib}\n\\parencite{knuth1984}\n\\printbibliography'],['Автор в тексте','textcite естественно входит в предложение.','Как показывает \\textcite{knuth1984}, ...']],
    practice:[['Подключите bib','Добавьте references.bib.','\\addbibresource{references.bib}','\\usepackage{biblatex}','\\usepackage{biblatex}\n\\addbibresource{references.bib}',['biblatex','bib-file']],['Печать библиографии','Добавьте printbibliography.','\\printbibliography','Текст.','Текст.\n\\printbibliography',['printbibliography','bibliography']],['Parencite','Сошлитесь на knuth1984.','\\parencite{knuth1984}','Согласно источнику, ...','Согласно источнику \\parencite{knuth1984}, ...',['parencite','citation']]]
  },
  {
    id:'glossaries-index',title:'Глоссарий и предметный указатель',subtitle:'Термины, аббревиатуры и навигация в больших документах.',description:'glossaries, makeindex и управляемые терминологические системы.',prerequisite:'Большие документы',difficulty:'Продвинутый',category:'Большие документы',commands:['newglossaryentry','newacronym','gls','printglossaries','index'],
    steps:[['Глоссарий как база','Термин определяется один раз и затем вставляется через gls, что снижает расхождения терминологии.'],['Аббревиатуры','newacronym хранит краткую и полную форму; пакет может автоматически раскрывать первое употребление.'],['Служебный цикл','Как библиография, глоссарий требует дополнительной обработки служебных файлов.'],['Предметный указатель','index создаёт невидимую запись для будущего алфавитного указателя.'],['Иерархия','Крупные словари могут иметь родительские записи и категории.'],['Когда это нужно','Для диссертации, стандарта или технической книги десятки сокращений оправдывают автоматический глоссарий.']],
    examples:[['Термин','Определение хранится отдельно.','\\newglossaryentry{latex}{name=LaTeX,description={Система подготовки документов}}\n... \\gls{latex}'],['Аббревиатура','Короткая и полная форма в одной записи.','\\newacronym{api}{API}{Application Programming Interface}']],
    practice:[['Acronym API','Определите API.','\\newacronym{api}{API}{Application Programming Interface}','','\\newacronym{api}{API}{Application Programming Interface}',['acronym','glossary']],['Gls','Вставьте термин latex.','\\gls{latex}','Система используется в работе.','Система \\gls{latex} используется в работе.',['gls','term']],['Index','Добавьте index для LaTeX.','\\index{LaTeX}','LaTeX — система.','LaTeX\\index{LaTeX} — система.',['index','navigation']]]
  },
  {
    id:'beamer-presentations',title:'Презентации в Beamer',subtitle:'Слайды как структурированный документ, а не набор вручную размещённых объектов.',description:'frame, overlays, blocks и темы Beamer.',prerequisite:'Академические публикации',difficulty:'Продвинутый',category:'Academic challenges',commands:['frame','frametitle','pause','only','block'],
    steps:[['Класс beamer','Beamer — отдельный documentclass, но сохраняет привычные формулы, списки, изображения и библиографию.'],['Frame','Каждый слайд обычно является окружением frame с заголовком.'],['Меньше текста','Один frame должен поддерживать одну мысль, а не переносить целый абзац статьи.'],['Overlays','pause, only и спецификации <2-> поэтапно открывают элементы.'],['Blocks','block, alertblock и exampleblock создают семантические контейнеры.'],['Тема и бренд','Настройте тему, цвета и шрифты централизованно вместо ручной верстки каждого frame.']],
    examples:[['Минимальный frame','Заголовок и два пункта.','\\documentclass{beamer}\n\\begin{document}\n\\begin{frame}{Главная идея}\n\\begin{itemize}\n\\item Первый\n\\item Второй\n\\end{itemize}\n\\end{frame}\n\\end{document}'],['Пошаговое раскрытие','Второй тезис появляется позже.','Первый тезис\\pause\n\\begin{itemize}\n\\item Второй тезис\n\\end{itemize}']],
    practice:[['Первый frame','Создайте frame «Метод».','\\begin{frame}{Метод}','\\documentclass{beamer}\n\\begin{document}\n\\end{document}','\\documentclass{beamer}\n\\begin{document}\n\\begin{frame}{Метод}\nТекст\n\\end{frame}\n\\end{document}',['beamer','frame']],['Pause','Разделите два тезиса.','\\pause','Первый тезис.\nВторой тезис.','Первый тезис.\n\\pause\nВторой тезис.',['overlay','pause']],['Block','Создайте block «Определение».','\\begin{block}{Определение}','LaTeX — система.','\\begin{block}{Определение}\nLaTeX — система.\n\\end{block}',['block','beamer']]]
  },
  {
    id:'unicode-engines',title:'XeLaTeX, LuaLaTeX и системные шрифты',subtitle:'Unicode-движки, fontspec и современная многоязычная типографика.',description:'Выбор движка, fontspec, polyglossia и системные OpenType-шрифты.',prerequisite:'Профессиональная типографика',difficulty:'Экспертный',category:'Большие документы',commands:['fontspec','setmainfont','setsansfont','setmonofont','polyglossia'],
    steps:[['Три сценария','pdfLaTeX остаётся совместимым; XeLaTeX и LuaLaTeX естественно работают с Unicode и OpenType/TrueType.'],['Fontspec','fontspec позволяет обращаться к системным шрифтам по имени.','\\usepackage{fontspec}\n\\setmainfont{TeX Gyre Termes}'],['Не смешивайте стеки','Классические inputenc/fontenc характерны для pdfLaTeX; переход на Unicode-движок требует пересмотра преамбулы.'],['LuaLaTeX','LuaLaTeX сочетает Unicode/OpenType с программируемостью Lua.'],['Многоязычность','polyglossia и современные версии babel поддерживают Unicode-движки; выбирайте один согласованный языковой стек.'],['Воспроизводимость','Системный шрифт может отсутствовать в CI. Документируйте зависимости или используйте доступные TeX-шрифты.']],
    examples:[['Fontspec','Основной, sans и mono задаются централизованно.','\\usepackage{fontspec}\n\\setmainfont{TeX Gyre Termes}\n\\setsansfont{TeX Gyre Heros}\n\\setmonofont{TeX Gyre Cursor}'],['Polyglossia','Основной и дополнительный языки.','\\usepackage{polyglossia}\n\\setdefaultlanguage{russian}\n\\setotherlanguage{english}']],
    practice:[['Основной шрифт','Задайте TeX Gyre Termes.','\\setmainfont{TeX Gyre Termes}','\\usepackage{fontspec}','\\usepackage{fontspec}\n\\setmainfont{TeX Gyre Termes}',['fontspec','font']],['Mono','Задайте TeX Gyre Cursor.','\\setmonofont{TeX Gyre Cursor}','\\usepackage{fontspec}','\\usepackage{fontspec}\n\\setmonofont{TeX Gyre Cursor}',['fontspec','mono']],['Уберите inputenc','Оставьте только fontspec.','\\usepackage{fontspec}','\\usepackage[utf8]{inputenc}\n\\usepackage{fontspec}','\\usepackage{fontspec}',['engine','migration']]]
  },
  {
    id:'build-automation',title:'Автоматическая сборка: latexmk, CI и воспроизводимость',subtitle:'Как превратить LaTeX-проект в надёжный инженерный pipeline.',description:'latexmk, несколько проходов, библиография, CI и стабильная сборка.',prerequisite:'Продвинутый LaTeX',difficulty:'Экспертный',category:'Отладка',commands:['latexmk','biber','makeglossaries','synctex'],
    steps:[['Почему одного запуска мало','Ссылки, оглавление, библиография и глоссарии могут требовать нескольких проходов и внешних инструментов.'],['Latexmk','latexmk анализирует служебные файлы и автоматически запускает нужные стадии.','latexmk -pdf main.tex'],['Выбор движка','Локальная и CI-сборка должны использовать один и тот же движок и предсказуемую версию TeX.'],['Continuous preview','-pvc пересобирает документ при изменении файлов и хорошо работает вместе с SyncTeX.'],['CI','Сборка на каждый pull request обнаруживает отсутствующий рисунок, сломанную ссылку или ошибку библиографии до merge.'],['Воспроизводимость','Фиксируйте TeX Live/контейнер, храните исходники и не полагайтесь на случайные локальные шрифты.']],
    examples:[['Обычная сборка','Latexmk определяет количество проходов.','latexmk -pdf main.tex'],['Очистка','Удаляет промежуточные файлы.','latexmk -c']],
    practice:[['Сборка','Напишите команду для main.tex.','latexmk -pdf main.tex','','latexmk -pdf main.tex',['latexmk','build']],['Watch','Добавьте постоянную пересборку.','-pvc','latexmk -pdf main.tex','latexmk -pdf -pvc main.tex',['latexmk','watch']],['Очистка','Удалите временные файлы.','latexmk -c','','latexmk -c',['latexmk','cleanup']]]
  }
];


export function applyCurriculumExpansion(input:CurriculumDraft):CurriculumDraft{
  const draft=cloneCurriculumDraft(input);
  for(const lesson of draft.lessons){
    const additions=existingGuides[lesson.id]??[];
    additions.forEach(([title,body,code,note],i)=>{
      const id=`${lesson.id}-deep-${i+1}`;
      if(!lesson.theory.some(block=>block.id===id))lesson.theory.push({id,title,body,code,note});
    });
    if(lesson.examples.length<2&&lesson.exercises[0])lesson.examples.push({
      id:`${lesson.id}-guided-example`,title:'Разбор решения',
      description:'Сравните условие с одним корректным решением. Следите за структурой и назначением команд, а не за буквальным совпадением строк.',
      code:lesson.exercises[0].solution
    });
  }

  const startNumber=draft.modules.length;
  const newModules:CourseModule[]=topics.map((topic,topicIndex)=>{
    const number=startNumber+topicIndex+1;
    const lessonId=topic.id;
    const lessonExercises:Exercise[]=topic.practice.map(([title,instructions,target,starter,solution,concepts],i)=>({
      id:`x${String(number).padStart(2,'0')}-${i+1}`,
      lessonId,category:topic.category,difficulty:topic.difficulty,mode:i===1?'Исправить ошибку':'Дополнить документ',title,instructions,
      requirements:[`Использовать ${target}`],starterCode:starter,
      validators:[{type:'containsText',value:target,message:'Ключевая конструкция найдена.',hint:`Добавьте или исправьте: ${target}`}],
      hints:[`Найдите место, где должна появиться конструкция ${target}.`,'Сначала сохраните структуру исходника, затем внесите минимальное изменение.',`Ориентир: ${target}`],
      solution,concepts
    }));
    const theory:TheoryBlock[]=topic.steps.map(([title,body,code,note],i)=>({id:`${lessonId}-t${i+1}`,title,body,code,note}));
    const lesson:Lesson={
      id:lessonId,moduleId:topic.id,number,title:topic.title,subtitle:topic.subtitle,difficulty:topic.difficulty,theory,
      examples:topic.examples.map(([title,description,code],i)=>({id:`${lessonId}-ex${i+1}`,title,description,code})),
      exercises:lessonExercises,relatedCommands:topic.commands
    };
    return {id:topic.id,number,title:topic.title,description:topic.description,prerequisites:topic.prerequisite,difficulty:topic.difficulty,lessons:[lesson]};
  });

  for(const module of newModules){
    if(draft.modules.some(existing=>existing.id===module.id))continue;
    draft.modules.push(module);
    for(const lesson of module.lessons){
      draft.lessons.push(lesson);
      draft.exercises.push(...lesson.exercises);
    }
  }
  return draft;
}
