import type { CourseModule, Difficulty, Exercise, Lesson, PracticeCategory, ValidatorRule } from '../types';

const DOC = (body: string) => `\\documentclass{article}\n\\begin{document}\n${body}\n\\end{document}`;
const compileRule: ValidatorRule = { type: 'compiles', message: 'Документ синтаксически согласован.', hint: 'Проверьте фигурные скобки и пары \\begin / \\end.' };
const clsRule: ValidatorRule = { type: 'documentClass', value: 'article', message: 'Использован класс article.', hint: 'Начните с \\documentclass{article}.' };
const docRule: ValidatorRule = { type: 'environment', value: 'document', message: 'Создано окружение document.', hint: 'Содержимое помещается между \\begin{document} и \\end{document}.' };
const cmd = (value: string, message: string, hint: string, min = 1): ValidatorRule => ({ type: 'command', value, min, message, hint });
const env = (value: string, message: string, hint: string): ValidatorRule => ({ type: 'environment', value, message, hint });

const lessonSeeds: Array<{
  module: [string, string, string, string, Difficulty];
  lesson: [string, string, Difficulty, string[]];
  conceptTitle: string;
  theory: string;
  code: string;
  category: PracticeCategory;
  tasks: Array<[string, string, string[], string, ValidatorRule[], string[], string[], Exercise['mode']]>;
}> = [
  {
    module: ['introduction', 'Введение в LaTeX', 'Базовая структура документа', 'Не требуются', 'Начальный'],
    lesson: ['document-structure', 'Структура документа', 'Начальный', ['documentclass', 'begin', 'end']],
    conceptTitle: 'Базовый каркас', theory: 'Любой полноценный документ начинается с выбора класса и содержит окружение document. Преамбула задаёт настройки, а тело — материал, который будет набран.',
    code: DOC('Привет, мир!'), category: 'Основы',
    tasks: [
      ['Минимальный документ', 'Создайте документ класса article с одним абзацем.', ['Класс article', 'Окружение document', 'Один абзац текста'], '', [clsRule, docRule, {type:'paragraph',message:'Добавлен обычный абзац.',hint:'Напишите текст внутри окружения document.'}, compileRule], ['Сначала укажите класс документа.', 'Тело документа задаётся специальным окружением.', 'Используйте \\begin{document} ... \\end{document}.'], ['documentclass','environment'], 'Собрать документ'],
      ['Исправьте каркас', 'Исправьте документ с незакрытым окружением.', ['Согласовать begin/end'], '\\documentclass{article}\n\\begin{document}\nТекст', [docRule, compileRule], ['Каждому \\begin соответствует \\end.', 'Название окружения должно совпадать.', 'Добавьте \\end{document}.'], ['environment','debug'], 'Исправить ошибку'],
      ['Заголовок и абзац', 'Создайте раздел первого уровня и абзац.', ['Класс article', 'Команда section', 'Абзац'], DOC(''), [cmd('section','Найден заголовок первого уровня.','Используйте \\section{...}.'), {type:'paragraph',message:'Добавлен абзац.',hint:'После section напишите обычный текст.'}, compileRule], ['Заголовки создаются командами.', 'Первый уровень — section.', 'Например: \\section{Введение}.'], ['section','paragraph'], 'Написать код']
    ]
  },
  {
    module: ['structure', 'Структура документа', 'Преамбула, разделы и логика исходника', 'Введение в LaTeX', 'Базовый'],
    lesson: ['sections-paragraphs', 'Разделы и абзацы', 'Базовый', ['section','subsection','paragraph']], conceptTitle:'Иерархия текста',
    theory:'Команды section и subsection задают логическую иерархию. Пустая строка в исходнике отделяет абзацы; визуальные отступы лучше поручать классу документа, а не ручным пробелам.',
    code:DOC('\\section{Введение}\nПервый абзац.\n\n\\subsection{Метод}\nВторой абзац.'), category:'Текст',
    tasks:[
      ['Два уровня', 'Добавьте section и subsection.', ['section','subsection'], DOC(''), [cmd('section','Есть section.','Добавьте \\section{...}.'),cmd('subsection','Есть subsection.','Добавьте \\subsection{...}.'),compileRule], ['Сначала создайте основной раздел.','Вложенный уровень — subsection.','Используйте обе команды внутри document.'],['section','subsection'],'Написать код'],
      ['Два абзаца', 'Разделите два смысловых фрагмента пустой строкой.', ['Не менее двух абзацев'], DOC('Первый фрагмент. Второй фрагмент.'), [{type:'containsText',value:'\n\n',message:'Абзацы разделены пустой строкой.',hint:'Оставьте одну пустую строку между абзацами.'},compileRule], ['LaTeX воспринимает пустую строку как границу абзаца.','Не используйте \\newline для смыслового абзаца.','Вставьте двойной перевод строки.'],['paragraph'],'Рефакторинг'],
      ['Исправьте команду', 'Исправьте опечатку в названии раздела.', ['Корректная section'], DOC('\\secton{Ошибка}\nТекст.'), [cmd('section','Команда section написана правильно.','Проверьте написание section.'),compileRule], ['Команда не определена из-за опечатки.','Сравните с названием уровня section.','Замените \\secton на \\section.'],['section','debug'],'Исправить ошибку']
    ]
  },
  {
    module:['typography','Текст и типографика','Шрифты, выделения, списки и набор текста','Структура документа','Базовый'],
    lesson:['text-formatting','Выделения и списки','Базовый',['textbf','emph','itemize','enumerate']], conceptTitle:'Семантическое выделение',
    theory:'Для смыслового акцента LaTeX предлагает команды вроде textbf и emph. Списки задаются окружениями itemize и enumerate, а каждый пункт начинается с item.',
    code:DOC('Это \\textbf{важно}, а это \\emph{акцент}.\n\\begin{itemize}\n\\item Первый пункт\n\\item Второй пункт\n\\end{itemize}'),category:'Текст',
    tasks:[
      ['Смысловой акцент','Сделайте одно слово полужирным и другое — курсивным.',['textbf','emph'],DOC('Важное слово и термин.'),[cmd('textbf','Есть полужирное выделение.','Используйте \\textbf{...}.'),cmd('emph','Есть смысловой акцент.','Используйте \\emph{...}.'),compileRule],['Оба выделения — команды с аргументом.','Для полужирного текста нужна textbf.','Для акцента используйте emph.'],['textbf','emph'],'Текст → LaTeX'],
      ['Маркированный список','Создайте список из двух пунктов.',['itemize','Два item'],DOC(''),[env('itemize','Создан itemize.','Используйте окружение itemize.'),cmd('item','Есть два пункта.','Каждый пункт начинается с \\item.',2),compileRule],['Список — окружение.','Каждая строка списка начинается item.','Нужно два \\item внутри itemize.'],['itemize','item'],'Написать код'],
      ['Нумерованный список','Преобразуйте маркированный список в нумерованный.',['enumerate'],DOC('\\begin{itemize}\n\\item A\n\\item B\n\\end{itemize}'),[env('enumerate','Использован enumerate.','Замените itemize на enumerate.'),compileRule],['Нумерацию задаёт другое окружение.','Название — enumerate.','Замените и begin, и end.'],['enumerate','environment'],'Рефакторинг']
    ]
  },
  {
    module:['math-mode','Математический режим','Встроенные и выключные формулы','Текст и типографика','Базовый'],
    lesson:['math-modes','Inline и display math','Базовый',['$','\\[','\\]']], conceptTitle:'Два режима формулы',
    theory:'Встроенная формула становится частью строки, а выключная формула образует самостоятельный математический блок. Выбор режима влияет не только на положение, но и на типографику формулы.',
    code:DOC('Пусть $a^2+b^2=c^2$.\n\\[ E = mc^2 \\]'),category:'Математика',
    tasks:[
      ['Формула в строке','Добавьте формулу a+b=c внутрь предложения.',['Inline math'],DOC('Рассмотрим равенство a+b=c.'),[{type:'inlineMath',message:'Есть встроенная формула.',hint:'Окружите выражение символами $...$.'},compileRule],['Формула должна остаться частью абзаца.','Для inline режима достаточно пары долларов.','Напишите $a+b=c$.'],['math-mode'],'Текст → LaTeX'],
      ['Выключная формула','Наберите E=mc^2 отдельной формулой.',['Display math'],DOC('Формула:\nE=mc^2'),[{type:'displayMath',message:'Есть выключная формула.',hint:'Используйте \\[ ... \\].'},compileRule],['Формула должна быть отдельным блоком.','Используйте квадратные математические ограничители.','\\[ E=mc^2 \\]'],['display-math'],'Написать код'],
      ['Исправьте режим','Исправьте незакрытый математический режим.',['Согласованные $'],DOC('Пусть $x+y=z.'),[{type:'inlineMath',message:'Математический режим закрыт.',hint:'Добавьте закрывающий $.'},compileRule],['У каждого открывающего $ должен быть закрывающий.','Проверьте конец формулы.','Добавьте $ после z.'],['math-mode','debug'],'Исправить ошибку']
    ]
  },
  {
    module:['multiline-math','Многострочные формулы','Дроби, индексы и выравнивание','Математический режим','Средний'],
    lesson:['fractions-powers','Дроби, степени и индексы','Средний',['frac','sqrt','^','_']], conceptTitle:'Структура математического выражения',
    theory:'Дроби и корни оформляются командами с аргументами, а верхние и нижние индексы — операторами ^ и _. Сложные индексы заключаются в фигурные скобки.',
    code:DOC('\\[ \\frac{x_1^2+x_2^2}{\\sqrt{n}} \\]'),category:'Математика',
    tasks:[
      ['Дробь','Наберите дробь (a+b)/c с помощью frac.',['frac'],DOC('\\[ a+b/c \\]'),[cmd('frac','Использована структурная дробь.','Используйте \\frac{числитель}{знаменатель}.'),compileRule],['Дробь в LaTeX — команда.','У frac два обязательных аргумента.','\\frac{a+b}{c}'],['frac'],'Воссоздать результат'],
      ['Степень и индекс','Наберите x_i^2.',['Нижний индекс','Степень'],DOC('\\[ x \\]'),[{type:'containsText',value:'_',message:'Есть нижний индекс.',hint:'Используйте _ для нижнего индекса.'},{type:'containsText',value:'^',message:'Есть степень.',hint:'Используйте ^ для степени.'},compileRule],['Индекс и степень — отдельные операторы.','Нижний: _. Верхний: ^.','Напишите x_i^2.'],['superscript','subscript'],'Написать код'],
      ['Корень из дроби','Создайте корень из дроби a/b.',['sqrt','frac'],DOC('\\[ a/b \\]'),[cmd('sqrt','Использован корень.','Оберните выражение в \\sqrt{...}.'),cmd('frac','Использована дробь.','Внутри корня примените \\frac.'),compileRule],['Начните с frac.','Затем поместите дробь в sqrt.','\\sqrt{\\frac{a}{b}}'],['sqrt','frac'],'Собрать документ']
    ]
  },
  {
    module:['theorems','Теоремы, определения и доказательства','Формальная структура математического текста','Многострочные формулы','Средний'],
    lesson:['equations-theorems','Уравнения и доказательства','Средний',['equation','align','newtheorem','proof']], conceptTitle:'Нумеруемые математические блоки',
    theory:'Окружение equation подходит для одной нумеруемой формулы, align — для нескольких согласованных строк. Теоремные структуры отделяют утверждение от доказательства и делают документ логически прозрачным.',
    code:'\\documentclass{article}\n\\usepackage{amsmath,amsthm}\n\\newtheorem{theorem}{Теорема}\n\\begin{document}\n\\begin{equation}\na^2+b^2=c^2\n\\end{equation}\n\\begin{proof}\nОчевидно из построения.\n\\end{proof}\n\\end{document}',category:'Математика',
    tasks:[
      ['Нумеруемое уравнение','Поместите формулу в equation.',['equation'],DOC('a+b=c'),[env('equation','Использовано окружение equation.','Оберните формулу в equation.'),compileRule],['Нужно математическое окружение.','Оно автоматически нумерует формулу.','\\begin{equation} ... \\end{equation}'],['equation'],'Текст → LaTeX'],
      ['Две строки align','Создайте align с двумя строками.',['align','Две строки'], '\\documentclass{article}\n\\usepackage{amsmath}\n\\begin{document}\n\\begin{align}\na&=b\n\\end{align}\n\\end{document}',[env('align','Использовано align.','Используйте окружение align.'),{type:'containsText',value:'\\\\',message:'Есть перенос математической строки.',hint:'Разделите строки командой \\\\.'},compileRule],['Align уже подключён через amsmath.','& задаёт точку выравнивания.','Завершите первую строку \\\\ и добавьте вторую.'],['align'],'Дополнить документ'],
      ['Доказательство','Добавьте окружение proof.',['proof'], '\\documentclass{article}\n\\usepackage{amsthm}\n\\begin{document}\nУтверждение.\n\\end{document}',[env('proof','Добавлено доказательство.','Используйте \\begin{proof} ... \\end{proof}.'),compileRule],['Пакет уже подключён.','Нужно отдельное окружение.','Название окружения — proof.'],['proof'],'Написать код']
    ]
  },
  {
    module:['tables','Таблицы','Столбцы, строки и профессиональный набор','Теоремы и доказательства','Средний'],
    lesson:['basic-tables','Табличные окружения','Средний',['tabular','&','\\\\']], conceptTitle:'Таблица как система выравнивания',
    theory:'Окружение tabular задаёт модель столбцов. Амперсанд разделяет ячейки, а двойной обратный слеш завершает строку. Число разделителей должно соответствовать структуре столбцов.',
    code:DOC('\\begin{tabular}{ll}\nПараметр & Значение \\\\\nA & 10 \\\\\nB & 20\n\\end{tabular}'),category:'Таблицы',
    tasks:[
      ['Таблица 2×2','Создайте tabular с двумя столбцами и двумя строками.',['tabular','Амперсанды','Две строки'],DOC(''),[env('tabular','Создана таблица.','Используйте tabular.'),{type:'containsText',value:'&',message:'Есть разделители ячеек.',hint:'Разделяйте столбцы символом &.'},{type:'containsText',value:'\\\\',message:'Есть завершение строки.',hint:'Завершайте строку \\\\.'},compileRule],['Начните с \\begin{tabular}{ll}.','Ячейки делятся &.','Строки завершаются \\\\.'],['tabular','ampersand'],'Собрать документ'],
      ['Исправьте строку','В таблице пропущен разделитель столбца. Исправьте её.',['Два столбца'],DOC('\\begin{tabular}{ll}\nA B \\\\\nC & D\n\\end{tabular}'),[env('tabular','Окружение корректно.','Сохраните tabular.'),{type:'containsText',value:'A & B',message:'Первая строка разделена на ячейки.',hint:'Между A и B нужен &.'},compileRule],['У таблицы два столбца.','В первой строке нет &.','Сделайте A & B.'],['table','debug'],'Исправить ошибку'],
      ['Заголовочная строка','Добавьте полужирные заголовки двум столбцам.',['Два textbf'],DOC('\\begin{tabular}{ll}\nИмя & Балл \\\\\nАнна & 95\n\\end{tabular}'),[cmd('textbf','Заголовки выделены.', 'Используйте \\textbf для обеих ячеек.',2),compileRule],['Выделите обе ячейки первой строки.','Команда — textbf.','Нужно два вызова \\textbf{...}.'],['table','textbf'],'Улучшить код']
    ]
  },
  {
    module:['figures','Изображения и плавающие объекты','Графика, подписи и размещение','Таблицы','Средний'],
    lesson:['figures-captions','Рисунки и подписи','Средний',['includegraphics','figure','caption']], conceptTitle:'Плавающий рисунок',
    theory:'figure отвечает за размещение объекта в потоке документа, includegraphics вставляет файл, а caption задаёт подпись. Такой слой структуры отделяет смысл от ручного позиционирования.',
    code:'\\documentclass{article}\n\\usepackage{graphicx}\n\\begin{document}\n\\begin{figure}\n\\centering\n\\includegraphics[width=.6\\textwidth]{figure.pdf}\n\\caption{Схема эксперимента}\n\\end{figure}\n\\end{document}',category:'Графика',
    tasks:[
      ['Окружение figure','Создайте figure с подписью.',['figure','caption'],'\\documentclass{article}\n\\usepackage{graphicx}\n\\begin{document}\n\\end{document}',[env('figure','Создан figure.','Используйте окружение figure.'),cmd('caption','Добавлена подпись.','Внутри figure добавьте \\caption{...}.'),compileRule],['Рисунок — плавающий объект.','Подпись должна быть внутри figure.','Используйте figure и caption.'],['figure','caption'],'Написать код'],
      ['Вставка изображения','Добавьте includegraphics.',['includegraphics'],'\\documentclass{article}\n\\usepackage{graphicx}\n\\begin{document}\n\\begin{figure}\n\\end{figure}\n\\end{document}',[cmd('includegraphics','Есть команда вставки изображения.','Используйте \\includegraphics{...}.'),compileRule],['Пакет graphicx уже подключён.','Команда принимает имя файла.','\\includegraphics{figure.pdf}'],['includegraphics'],'Дополнить документ'],
      ['Исправьте пакет','Документ использует includegraphics без нужного пакета. Добавьте его.',['graphicx'],'\\documentclass{article}\n\\begin{document}\n\\includegraphics{figure.pdf}\n\\end{document}',[{type:'containsText',value:'\\usepackage{graphicx}',message:'Подключён graphicx.',hint:'Добавьте \\usepackage{graphicx} в преамбулу.'},compileRule],['Ошибка связана с пакетом.','includegraphics определена в graphicx.','Добавьте usepackage до document.'],['package','debug'],'Исправить ошибку']
    ]
  },
  {
    module:['tikz','TikZ и графика','Векторные схемы средствами LaTeX','Изображения','Продвинутый'],
    lesson:['tikz-basics','Основы TikZ','Продвинутый',['tikzpicture','draw','node']], conceptTitle:'Графика как код',
    theory:'TikZ описывает рисунок декларативно: координаты, узлы и линии становятся частью исходника. Это особенно удобно для воспроизводимых научных схем.',
    code:'\\documentclass{article}\n\\usepackage{tikz}\n\\begin{document}\n\\begin{tikzpicture}\n\\draw (0,0) -- (2,0);\n\\node at (1,.4) {ось};\n\\end{tikzpicture}\n\\end{document}',category:'TikZ',
    tasks:[
      ['Первый tikzpicture','Создайте окружение tikzpicture.',['tikzpicture'],'\\documentclass{article}\n\\usepackage{tikz}\n\\begin{document}\n\\end{document}',[env('tikzpicture','Создано окружение TikZ.','Используйте tikzpicture.'),compileRule],['Пакет уже подключён.','Рисунок помещается в окружение.','\\begin{tikzpicture} ... \\end{tikzpicture}'],['tikz'],'Написать код'],
      ['Линия','Добавьте команду draw для отрезка.',['draw'],'\\documentclass{article}\n\\usepackage{tikz}\n\\begin{document}\n\\begin{tikzpicture}\n\\end{tikzpicture}\n\\end{document}',[cmd('draw','Есть команда рисования.','Добавьте \\draw (0,0) -- (1,0);'),compileRule],['Линия задаётся командой draw.','Используйте две координаты.','\\draw (0,0) -- (1,0);'],['tikz','draw'],'Дополнить документ'],
      ['Узел','Добавьте подпись с помощью node.',['node'],'\\documentclass{article}\n\\usepackage{tikz}\n\\begin{document}\n\\begin{tikzpicture}\n\\draw (0,0) -- (1,0);\n\\end{tikzpicture}\n\\end{document}',[cmd('node','Добавлен узел с текстом.','Используйте \\node at (...) {...};'),compileRule],['Подпись — тоже объект TikZ.','Нужна команда node.','\\node at (.5,.3) {текст};'],['tikz','node'],'Написать код']
    ]
  },
  {
    module:['crossrefs','Ссылки и перекрёстные ссылки','Метки, номера и устойчивые ссылки','TikZ','Средний'],
    lesson:['labels-refs','Метки и ссылки','Средний',['label','ref','pageref']], conceptTitle:'Ссылка на смысл, а не число',
    theory:'label связывает структурный объект с устойчивым именем, а ref выводит его актуальный номер. Это избавляет от ручной перенумерации при изменении документа.',
    code:DOC('\\section{Метод}\\label{sec:method}\nСм. раздел~\\ref{sec:method}.'),category:'Основы',
    tasks:[
      ['Метка раздела','Добавьте label к section.',['label'],DOC('\\section{Результаты}\nТекст.'),[cmd('label','Добавлена метка.','После section используйте \\label{...}.'),compileRule],['Метка обычно следует сразу за объектом.','Команда — label.','\\label{sec:results}'],['label'],'Написать код'],
      ['Перекрёстная ссылка','Сошлитесь на ранее созданную метку.',['ref'],DOC('\\section{Метод}\\label{sec:m}\nСм. раздел.'),[cmd('ref','Добавлена перекрёстная ссылка.','Используйте \\ref{sec:m}.'),compileRule],['Не пишите номер вручную.','Ссылка использует имя метки.','\\ref{sec:m}'],['ref'],'Текст → LaTeX'],
      ['Дублирующая метка','Исправьте две одинаковые label.',['Уникальные labels'],DOC('\\section{A}\\label{sec:x}\n\\section{B}\\label{sec:x}'),[compileRule],['Имена меток должны быть уникальными.','Переименуйте вторую метку.','Например, sec:a и sec:b.'],['label','debug'],'Исправить ошибку']
    ]
  },
  {
    module:['bibliography','Библиография','Цитирование и списки литературы','Перекрёстные ссылки','Средний'],
    lesson:['bibliography-basics','Основы библиографии','Средний',['cite','bibliography','bibitem']], conceptTitle:'Цитата как структурная связь',
    theory:'Цитирование должно ссылаться на библиографический ключ, а не на вручную набранный номер. Для небольших документов можно начать с thebibliography и bibitem; крупные проекты обычно переходят на biblatex/biber.',
    code:DOC('См. работу~\\cite{knuth}.\n\\begin{thebibliography}{9}\n\\bibitem{knuth} D. Knuth. The TeXbook.\n\\end{thebibliography}'),category:'Библиография',
    tasks:[
      ['Первая цитата','Добавьте cite с ключом knuth.',['cite'],DOC('Согласно источнику, система воспроизводима.'),[cmd('cite','Добавлена цитата.','Используйте \\cite{knuth}.'),compileRule],['Цитата — команда с ключом.','Ключ — knuth.','\\cite{knuth}'],['cite'],'Текст → LaTeX'],
      ['Список литературы','Создайте thebibliography и один bibitem.',['thebibliography','bibitem'],DOC(''),[env('thebibliography','Создан список литературы.','Используйте thebibliography.'),cmd('bibitem','Добавлен источник.','Внутри используйте \\bibitem{key}.'),compileRule],['Список — окружение.','Каждый источник начинается bibitem.','Создайте один bibitem внутри thebibliography.'],['bibliography','bibitem'],'Собрать документ'],
      ['Согласуйте ключ','Исправьте несовпадающие ключи cite и bibitem.',['Одинаковый ключ'],DOC('См.~\\cite{knuth}.\n\\begin{thebibliography}{9}\n\\bibitem{texbook} D. Knuth. The TeXbook.\n\\end{thebibliography}'),[{type:'containsText',value:'\\bibitem{knuth}',message:'Ключ источника согласован с cite.',hint:'Сделайте ключ bibitem равным knuth.'},compileRule],['Сравните аргументы cite и bibitem.','Они должны ссылаться на один ключ.','Переименуйте texbook в knuth.'],['bibliography','debug'],'Исправить ошибку']
    ]
  },
  {
    module:['custom','Пользовательские команды и окружения','Абстракция повторяющихся конструкций','Библиография','Продвинутый'],
    lesson:['custom-commands','Собственные команды','Продвинутый',['newcommand','renewcommand']], conceptTitle:'Абстракция в LaTeX',
    theory:'newcommand позволяет дать устойчивое имя повторяющейся конструкции. Хорошая пользовательская команда выражает смысл документа, а не только внешний вид.',
    code:'\\documentclass{article}\n\\newcommand{\\R}{\\mathbb{R}}\n\\usepackage{amsfonts}\n\\begin{document}\n$ x \\in \\R $\n\\end{document}',category:'Большие документы',
    tasks:[
      ['Команда R','Определите команду \\R.',['newcommand'],'\\documentclass{article}\n\\usepackage{amsfonts}\n\\begin{document}\n$ x \\in \\R $\n\\end{document}',[cmd('newcommand','Создана пользовательская команда.','В преамбуле добавьте \\newcommand{\\R}{...}.'),compileRule],['Определение находится в преамбуле.','Используйте newcommand.','\\newcommand{\\R}{\\mathbb{R}}'],['newcommand'],'Дополнить документ'],
      ['Команда с аргументом','Создайте команду \\vect с одним аргументом.',['newcommand','Один аргумент'],'\\documentclass{article}\n\\begin{document}\n\\end{document}',[cmd('newcommand','Определена команда.','Используйте newcommand с [1].'),{type:'containsText',value:'[1]',message:'У команды один аргумент.',hint:'После имени команды укажите [1].'},compileRule],['Число аргументов указывается в квадратных скобках.','В теле аргумент обозначается #1.','Например \\newcommand{\\vect}[1]{\\mathbf{#1}}.'],['newcommand','arguments'],'Написать код'],
      ['Уберите дублирование','Замените повторяющуюся конструкцию пользовательской командой.',['newcommand'],DOC('$\\mathbf{x}$ и $\\mathbf{y}$.'),[cmd('newcommand','Повторяющаяся конструкция вынесена в команду.','Определите смысловую команду в преамбуле.'),compileRule],['Ищите повторяющийся шаблон.','Команда может принимать один аргумент.','Создайте \\vect и используйте её для x и y.'],['refactor','newcommand'],'Рефакторинг']
    ]
  },
  {
    module:['large-docs','Большие документы','Разделение проекта и масштабируемая структура','Пользовательские команды','Продвинутый'],
    lesson:['large-documents','Многофайловая структура','Продвинутый',['input','include','includeonly']], conceptTitle:'Декомпозиция документа',
    theory:'Большой документ легче сопровождать, если главы вынесены в отдельные файлы. input вставляет содержимое почти буквально, include создаёт более крупную структурную единицу и взаимодействует с includeonly.',
    code:'\\documentclass{report}\n\\begin{document}\n\\input{frontmatter}\n\\include{chapters/method}\n\\end{document}',category:'Большие документы',
    tasks:[
      ['Подключите главу','Добавьте include для chapters/method.',['include'],'\\documentclass{report}\n\\begin{document}\n\\end{document}',[cmd('include','Глава подключена через include.','Используйте \\include{chapters/method}.'),compileRule],['Для крупной главы подходит include.','Расширение .tex обычно не указывают.','\\include{chapters/method}'],['include'],'Написать код'],
      ['Фрагмент преамбулы','Подключите файл macros через input.',['input'],'\\documentclass{report}\n\\begin{document}\nТекст.\n\\end{document}',[cmd('input','Файл подключён через input.','Используйте \\input{macros}.'),compileRule],['input подходит для небольших фрагментов.','Его можно вызвать в нужном месте.','\\input{macros}'],['input'],'Дополнить документ'],
      ['Осмысленная декомпозиция','Замените ручную копию главы на include.',['include'],'\\documentclass{report}\n\\begin{document}\n\\chapter{Метод}\nОчень длинный текст главы.\n\\end{document}',[cmd('include','Глава вынесена во внешний файл логически.','Замените содержимое главы на \\include{chapters/method}.'),compileRule],['Представьте, что текст уже находится в отдельном файле.','Для главы используйте include.','Оставьте в главном файле только \\include{chapters/method}.'],['architecture','include'],'Улучшить код']
    ]
  },
  {
    module:['academic','Академические публикации','Структура научной статьи','Большие документы','Продвинутый'],
    lesson:['academic-paper','Каркас научной статьи','Продвинутый',['title','author','maketitle','abstract']], conceptTitle:'Статья как система смысловых блоков',
    theory:'Научный документ начинается с метаданных и аннотации, затем переходит к воспроизводимой структуре разделов. LaTeX особенно силён там, где структура важнее ручного оформления каждой страницы.',
    code:'\\documentclass{article}\n\\title{Исследование}\n\\author{Автор}\n\\begin{document}\n\\maketitle\n\\begin{abstract}\nКраткая аннотация.\n\\end{abstract}\n\\section{Введение}\nТекст.\n\\end{document}',category:'Academic challenges',
    tasks:[
      ['Титульные метаданные','Добавьте title, author и maketitle.',['title','author','maketitle'],DOC(''),[cmd('title','Задан заголовок.','В преамбуле добавьте \\title{...}.'),cmd('author','Указан автор.','Добавьте \\author{...}.'),cmd('maketitle','Титул выводится в документе.','Внутри document вызовите \\maketitle.'),compileRule],['title и author — метаданные.','maketitle выводит их.','Определите данные до document, затем вызовите maketitle.'],['title','author'],'Собрать документ'],
      ['Аннотация','Добавьте окружение abstract.',['abstract'],DOC('\\section{Введение}\nТекст.'),[env('abstract','Добавлена аннотация.','Используйте окружение abstract.'),compileRule],['Аннотация — окружение.','Она располагается перед основным текстом.','\\begin{abstract} ... \\end{abstract}'],['abstract'],'Написать код'],
      ['Структура статьи','Соберите title, abstract и section в одном документе.',['maketitle','abstract','section'],DOC(''),[cmd('maketitle','Есть титульная часть.','Вызовите maketitle.'),env('abstract','Есть аннотация.','Добавьте abstract.'),cmd('section','Есть основной раздел.','Добавьте section.'),compileRule],['Начните с метаданных.','После maketitle добавьте abstract.','Затем section{Введение}.'],['paper-structure'],'Собрать документ']
    ]
  },
  {
    module:['advanced','Продвинутый LaTeX','Диагностика, устойчивость и качество исходника','Академические публикации','Экспертный'],
    lesson:['debugging','Системная отладка','Экспертный',['debug','packages','environments']], conceptTitle:'Читать ошибку как структуру',
    theory:'Большинство ошибок LaTeX локальны: несогласованные окружения, незакрытые аргументы, неизвестные команды или забытые пакеты. Сильная стратегия — сначала восстановить синтаксическую структуру, затем проверять семантику.',
    code:'\\documentclass{article}\n\\begin{document}\n\\section{Корректный раздел}\nФормула $x^2$.\n\\end{document}',category:'Отладка',
    tasks:[
      ['Три ошибки','Исправьте опечатку команды и незакрытые скобки.',['Собирается без ошибок'],'\\documentclass{article}\n\\begin{document}\n\\secton{Результаты\nТекст.\n\\end{document}',[cmd('section','Команда section исправлена.','Исправьте опечатку в названии команды.'),compileRule],['Сначала найдите неизвестную команду.','Затем проверьте баланс фигурных скобок.','Должно быть \\section{Результаты}.'],['debug','braces'],'Найти ошибку'],
      ['Несогласованные окружения','Исправьте mismatched begin/end.',['Согласованные окружения'],'\\documentclass{article}\n\\begin{document}\n\\begin{itemize}\n\\item A\n\\end{enumerate}\n\\end{document}',[env('itemize','Список сохранился.','Используйте одинаковое имя в begin/end.'),compileRule],['Сравните имя после begin и end.','Открыт itemize.','Закройте \\end{itemize}.'],['debug','environment'],'Исправить ошибку'],
      ['Пакет amsmath','Исправьте использование align без пакета.',['amsmath'],'\\documentclass{article}\n\\begin{document}\n\\begin{align}\na&=b\n\\end{align}\n\\end{document}',[{type:'containsText',value:'\\usepackage{amsmath}',message:'Подключён amsmath.',hint:'Добавьте пакет в преамбулу.'},compileRule],['align определяется пакетом amsmath.','Пакеты подключаются до document.','Добавьте \\usepackage{amsmath}.'],['debug','package'],'Исправить ошибку']
    ]
  }
];

// Fix the final seed's validator without weakening the global ValidatorRule type.
const lastTask = lessonSeeds.at(-1)!.tasks.at(-1)!;
lastTask[4] = [{ type:'containsText', value:'\\usepackage{amsmath}', message:'Подключён пакет amsmath.', hint:'Добавьте \\usepackage{amsmath} в преамбулу.' }, compileRule];

export const modules: CourseModule[] = lessonSeeds.map((seed, index) => {
  const [moduleId,title,description,prerequisites,difficulty] = seed.module;
  const [lessonId,lessonTitle,lessonDifficulty,relatedCommands] = seed.lesson;
  const exercises: Exercise[] = seed.tasks.map((t, taskIndex) => ({
    id: `e${String(index * 3 + taskIndex + 1).padStart(2,'0')}`,
    lessonId,
    category: seed.category,
    difficulty: lessonDifficulty,
    mode: t[7],
    title: t[0], instructions: t[1], requirements: t[2], starterCode: t[3], validators: t[4], hints: t[5], solution: buildSolution(lessonId, taskIndex, seed.code), concepts: t[6]
  }));
  const lesson: Lesson = {
    id: lessonId, moduleId, number: index + 1, title: lessonTitle, subtitle: seed.module[2], difficulty: lessonDifficulty,
    theory: [
      { id:`${lessonId}-t1`, title: seed.conceptTitle, body: seed.theory, code: seed.code },
      { id:`${lessonId}-t2`, title:'Почему это важно', body:'Хороший LaTeX-исходник кодирует структуру и смысл документа. Чем меньше ручного форматирования и чем яснее семантика команд, тем устойчивее документ к изменениям.', note:'В дальнейших уроках этот принцип будет повторяться на более сложных конструкциях.' }
    ],
    examples: [{ id:`${lessonId}-ex`, title:'Рабочий пример', description:'Изменяйте исходник и наблюдайте, какие части структуры отвечают за результат.', code: seed.code }],
    exercises, relatedCommands
  };
  return { id:moduleId, number:index+1, title, description, prerequisites, difficulty, lessons:[lesson] };
});

function buildSolution(lessonId: string, taskIndex: number, fallback: string): string {
  const key = `${lessonId}:${taskIndex}`;
  const map: Record<string,string> = {
    'document-structure:0': DOC('\\section{Заголовок}\nЭто один абзац текста.'),
    'document-structure:1': DOC('Текст'),
    'document-structure:2': DOC('\\section{Заголовок}\nОдин абзац текста.'),
    'sections-paragraphs:0': DOC('\\section{Раздел}\n\\subsection{Подраздел}\nТекст.'),
    'sections-paragraphs:1': DOC('Первый фрагмент.\n\nВторой фрагмент.'),
    'sections-paragraphs:2': DOC('\\section{Исправлено}\nТекст.'),
    'text-formatting:0': DOC('\\textbf{Важное} слово и \\emph{термин}.'),
    'text-formatting:1': DOC('\\begin{itemize}\n\\item Первый\n\\item Второй\n\\end{itemize}'),
    'text-formatting:2': DOC('\\begin{enumerate}\n\\item A\n\\item B\n\\end{enumerate}'),
    'math-modes:0': DOC('Рассмотрим равенство $a+b=c$.'),
    'math-modes:1': DOC('Формула:\n\\[E=mc^2\\]'),
    'math-modes:2': DOC('Пусть $x+y=z$.'),
    'fractions-powers:0': DOC('\\[\\frac{a+b}{c}\\]'),
    'fractions-powers:1': DOC('\\[x_i^2\\]'),
    'fractions-powers:2': DOC('\\[\\sqrt{\\frac{a}{b}}\\]'),
    'equations-theorems:0': DOC('\\begin{equation}\na+b=c\n\\end{equation}'),
    'equations-theorems:1': '\\documentclass{article}\n\\usepackage{amsmath}\n\\begin{document}\n\\begin{align}\na&=b \\\\\nc&=d\n\\end{align}\n\\end{document}',
    'equations-theorems:2': '\\documentclass{article}\n\\usepackage{amsthm}\n\\begin{document}\nУтверждение.\n\\begin{proof}\nСледует из определения.\n\\end{proof}\n\\end{document}',
    'basic-tables:0': DOC('\\begin{tabular}{ll}\nA & B \\\\\nC & D\n\\end{tabular}'),
    'basic-tables:1': DOC('\\begin{tabular}{ll}\nA & B \\\\\nC & D\n\\end{tabular}'),
    'basic-tables:2': DOC('\\begin{tabular}{ll}\n\\textbf{Имя} & \\textbf{Балл} \\\\\nАнна & 95\n\\end{tabular}'),
    'figures-captions:0': '\\documentclass{article}\n\\usepackage{graphicx}\n\\begin{document}\n\\begin{figure}\n\\caption{Схема}\n\\end{figure}\n\\end{document}',
    'figures-captions:1': '\\documentclass{article}\n\\usepackage{graphicx}\n\\begin{document}\n\\begin{figure}\n\\includegraphics{figure.pdf}\n\\end{figure}\n\\end{document}',
    'figures-captions:2': '\\documentclass{article}\n\\usepackage{graphicx}\n\\begin{document}\n\\includegraphics{figure.pdf}\n\\end{document}',
    'tikz-basics:0': '\\documentclass{article}\n\\usepackage{tikz}\n\\begin{document}\n\\begin{tikzpicture}\n\\end{tikzpicture}\n\\end{document}',
    'tikz-basics:1': '\\documentclass{article}\n\\usepackage{tikz}\n\\begin{document}\n\\begin{tikzpicture}\n\\draw (0,0) -- (1,0);\n\\end{tikzpicture}\n\\end{document}',
    'tikz-basics:2': '\\documentclass{article}\n\\usepackage{tikz}\n\\begin{document}\n\\begin{tikzpicture}\n\\draw (0,0) -- (1,0);\n\\node at (.5,.3) {отрезок};\n\\end{tikzpicture}\n\\end{document}',
    'labels-refs:0': DOC('\\section{Результаты}\\label{sec:results}\nТекст.'),
    'labels-refs:1': DOC('\\section{Метод}\\label{sec:m}\nСм. раздел~\\ref{sec:m}.'),
    'labels-refs:2': DOC('\\section{A}\\label{sec:a}\n\\section{B}\\label{sec:b}'),
    'bibliography-basics:0': DOC('Согласно источнику~\\cite{knuth}, система воспроизводима.'),
    'bibliography-basics:1': DOC('\\begin{thebibliography}{9}\n\\bibitem{knuth} D. Knuth. The TeXbook.\n\\end{thebibliography}'),
    'bibliography-basics:2': DOC('См.~\\cite{knuth}.\n\\begin{thebibliography}{9}\n\\bibitem{knuth} D. Knuth. The TeXbook.\n\\end{thebibliography}'),
    'custom-commands:0': '\\documentclass{article}\n\\usepackage{amsfonts}\n\\newcommand{\\R}{\\mathbb{R}}\n\\begin{document}\n$x\\in\\R$\n\\end{document}',
    'custom-commands:1': '\\documentclass{article}\n\\newcommand{\\vect}[1]{\\mathbf{#1}}\n\\begin{document}\n$\\vect{x}$\n\\end{document}',
    'custom-commands:2': '\\documentclass{article}\n\\newcommand{\\vect}[1]{\\mathbf{#1}}\n\\begin{document}\n$\\vect{x}$ и $\\vect{y}$.\n\\end{document}',
    'large-documents:0': '\\documentclass{report}\n\\begin{document}\n\\include{chapters/method}\n\\end{document}',
    'large-documents:1': '\\documentclass{report}\n\\input{macros}\n\\begin{document}\nТекст.\n\\end{document}',
    'large-documents:2': '\\documentclass{report}\n\\begin{document}\n\\include{chapters/method}\n\\end{document}',
    'academic-paper:0': '\\documentclass{article}\n\\title{Исследование}\n\\author{Автор}\n\\begin{document}\n\\maketitle\n\\end{document}',
    'academic-paper:1': DOC('\\begin{abstract}\nКраткая аннотация.\n\\end{abstract}\n\\section{Введение}\nТекст.'),
    'academic-paper:2': '\\documentclass{article}\n\\title{Исследование}\n\\author{Автор}\n\\begin{document}\n\\maketitle\n\\begin{abstract}\nАннотация.\n\\end{abstract}\n\\section{Введение}\nТекст.\n\\end{document}',
    'debugging:0': DOC('\\section{Результаты}\nТекст.'),
    'debugging:1': DOC('\\begin{itemize}\n\\item A\n\\end{itemize}'),
    'debugging:2': '\\documentclass{article}\n\\usepackage{amsmath}\n\\begin{document}\n\\begin{align}\na&=b\n\\end{align}\n\\end{document}'
  };
  return map[key] ?? fallback;
}

export const lessons = modules.flatMap(m => m.lessons);
export const exercises = lessons.flatMap(l => l.exercises);
export const getLesson = (id?: string) => lessons.find(l => l.id === id);
export const getExercise = (id?: string) => exercises.find(e => e.id === id);
export const getModule = (id?: string) => modules.find(m => m.id === id);
export const lessonIndex = new Map(lessons.map((lesson, i) => [lesson.id, i]));
