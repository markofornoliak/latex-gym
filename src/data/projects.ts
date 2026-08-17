import type { LearningProject } from '../types';

export const projects:LearningProject[]=[
  {
    id:'mathematical-notes',title:'Математические заметки',subtitle:'Короткий, но типографически корректный набор определений и формул.',difficulty:'Базовый',description:'Соберите конспект, в котором структура текста и математический режим работают как единая система.',prerequisites:['document-body','section','math-mode','fraction','equation'],concepts:['section','paragraph','inline-math','display-math','fraction','equation','label','ref'],
    stages:[
      {id:'structure',title:'Каркас',objective:'Создать минимальный article и раздел Introduction.',requirements:['article','document environment','section'],starterCode:'\\documentclass{article}\n\\begin{document}\n\\end{document}'},
      {id:'notation',title:'Обозначения',objective:'Добавить встроенные математические обозначения внутри абзаца.',requirements:['inline math','обычный текст вокруг формул'],starterCode:'\\documentclass{article}\n\\begin{document}\n\\section{Introduction}\nLet $x$ be a real number.\n\\end{document}'},
      {id:'formula',title:'Формула',objective:'Добавить самостоятельную формулу с дробью и степенью.',requirements:['display math','frac','superscript'],starterCode:'\\documentclass{article}\n\\begin{document}\n\\section{Identity}\n\\[\n  f(x)=x^2\n\\]\n\\end{document}'},
      {id:'equation',title:'Нумеруемое уравнение',objective:'Превратить ключевую формулу в equation и присвоить label.',requirements:['equation','label'],starterCode:'\\documentclass{article}\n\\begin{document}\n\\section{Identity}\n\\begin{equation}\n  E=mc^2\n\\end{equation}\n\\end{document}'},
      {id:'reference',title:'Связь текста и формулы',objective:'Сослаться на формулу через ref вместо жёсткого номера.',requirements:['label','ref','без ручного номера'],starterCode:'\\documentclass{article}\n\\begin{document}\n\\section{Identity}\n\\begin{equation}\\label{eq:energy}\n  E=mc^2\n\\end{equation}\nEquation~\\ref{eq:energy} is used below.\n\\end{document}'}
    ]
  },
  {
    id:'laboratory-report',title:'Лабораторный отчёт',subtitle:'Методика, результаты, таблица, рисунок и обсуждение.',difficulty:'Средний',description:'Постройте воспроизводимый отчёт: данные не имитируются пробелами, объекты получают подписи и устойчивые ссылки.',prerequisites:['section','tabular','figure','caption','label','ref'],concepts:['section','tabular','professional-table','figure','caption','float','label','ref'],
    stages:[
      {id:'sections',title:'Структура отчёта',objective:'Создать Method, Results и Discussion.',requirements:['три смысловых раздела'],starterCode:'\\documentclass{article}\n\\begin{document}\n\\section{Method}\n\\section{Results}\n\\section{Discussion}\n\\end{document}'},
      {id:'method',title:'Методика',objective:'Добавить связный абзац методики без ручных переносов строк.',requirements:['обычный абзац','без \\\\ как абзацев'],starterCode:'\\documentclass{article}\n\\begin{document}\n\\section{Method}\nThe sample was measured three times under identical conditions.\n\\end{document}'},
      {id:'table',title:'Таблица результатов',objective:'Добавить табличные данные с понятными заголовками.',requirements:['tabular','&','\\\\'],starterCode:'\\documentclass{article}\n\\begin{document}\n\\section{Results}\n\\begin{tabular}{lr}\nTrial & Value \\\\\n1 & 4.2 \\\\\n2 & 4.1 \\\\\n\\end{tabular}\n\\end{document}'},
      {id:'figure',title:'Рисунок',objective:'Подключить graphicx и создать figure с caption.',requirements:['graphicx','figure','includegraphics','caption'],starterCode:'\\documentclass{article}\n\\usepackage{graphicx}\n\\begin{document}\n\\begin{figure}\n  \\centering\n  \\includegraphics[width=.7\\linewidth]{result.pdf}\n  \\caption{Measured response.}\n\\end{figure}\n\\end{document}'},
      {id:'crossrefs',title:'Перекрёстные ссылки',objective:'Добавить label после caption и ссылку из Discussion.',requirements:['label','ref','автоматическая нумерация'],starterCode:'\\documentclass{article}\n\\begin{document}\n\\section{Discussion}\nFigure~\\ref{fig:response} summarizes the trend.\n\\end{document}'},
      {id:'final',title:'Редакционный проход',objective:'Убрать ручные номера, лишние разрывы и визуальные костыли.',requirements:['семантическая структура','нет жёстких номеров','нет ручного выравнивания пробелами'],starterCode:'\\documentclass{article}\n\\begin{document}\n\\section{Discussion}\nThe results are consistent with the model.\n\\end{document}'}
    ]
  },
  {
    id:'academic-paper',title:'Академическая статья',subtitle:'Один документ развивается на протяжении всего курса.',difficulty:'Продвинутый',description:'Главный проект LaTeX gym: от минимального article до статьи с математикой, рисунками, таблицами, ссылками, библиографией и приложением.',prerequisites:['document-class','document-body'],concepts:['document-class','preamble','section','math-mode','figure','tabular','label','ref','bibliography-model','citation','appendix','project-architecture'],
    stages:[
      {id:'stage-1',title:'1. Минимальный документ',objective:'Создать чистый article без лишних зависимостей.',requirements:['documentclass article','document environment'],starterCode:'\\documentclass{article}\n\\begin{document}\n\\end{document}'},
      {id:'stage-2',title:'2. Метаданные',objective:'Добавить title, author, date и maketitle.',requirements:['title','author','maketitle'],starterCode:'\\documentclass{article}\n\\title{A Reproducible Measurement Study}\n\\author{Student}\n\\begin{document}\n\\maketitle\n\\end{document}'},
      {id:'stage-3',title:'3. Структура статьи',objective:'Создать Introduction, Method, Results и Discussion.',requirements:['section hierarchy','содержательные названия'],starterCode:'\\documentclass{article}\n\\begin{document}\n\\section{Introduction}\n\\section{Method}\n\\section{Results}\n\\section{Discussion}\n\\end{document}'},
      {id:'stage-4',title:'4. Математическая модель',objective:'Добавить нумеруемое уравнение с label.',requirements:['amsmath','equation','label'],starterCode:'\\documentclass{article}\n\\usepackage{amsmath}\n\\begin{document}\n\\section{Method}\n\\begin{equation}\\label{eq:model}\n  y = ax+b\n\\end{equation}\n\\end{document}'},
      {id:'stage-5',title:'5. Рисунок',objective:'Добавить figure, caption и label в корректном порядке.',requirements:['graphicx','figure','caption before label'],starterCode:'\\documentclass{article}\n\\usepackage{graphicx}\n\\begin{document}\n\\begin{figure}\n  \\centering\n  \\includegraphics[width=.72\\linewidth]{response.pdf}\n  \\caption{Measured system response.}\n  \\label{fig:response}\n\\end{figure}\n\\end{document}'},
      {id:'stage-6',title:'6. Таблица',objective:'Добавить компактную таблицу результатов.',requirements:['booktabs','tabular','caption'],starterCode:'\\documentclass{article}\n\\usepackage{booktabs}\n\\begin{document}\n\\begin{table}\n  \\centering\n  \\caption{Measured values.}\n  \\begin{tabular}{lr}\n    \\toprule\n    Trial & Value \\\\\n    \\midrule\n    1 & 4.2 \\\\\n    \\bottomrule\n  \\end{tabular}\n\\end{table}\n\\end{document}'},
      {id:'stage-7',title:'7. Связи',objective:'Связать текст с equation, figure и table через label/ref.',requirements:['устойчивые keys','ref вместо ручных номеров'],starterCode:'The model in Equation~\\ref{eq:model} agrees with Figure~\\ref{fig:response}.'},
      {id:'stage-8',title:'8. Библиография',objective:'Перенести источники в отдельный .bib-файл и пройти настоящий BibTeX-цикл по ключу.',requirements:['bibliography file','cite','bibliographystyle','bibliography'],starterCode:'\\documentclass{article}\n\\begin{document}\nPrevious work~\\cite{knuth1984} established the approach.\n\\bibliographystyle{plain}\n\\bibliography{references}\n\\end{document}',compilerRequirement:'real-tex'},
      {id:'stage-9',title:'9. Приложение',objective:'Добавить приложение без ручной буквы A.',requirements:['appendix','section','label'],starterCode:'\\appendix\n\\section{Raw measurements}\\label{app:raw}'},
      {id:'stage-10',title:'10. Архитектура публикации',objective:'Разделить большой документ на главный файл, sections, figures и bibliography.',requirements:['main.tex как карта проекта','input/include','единая преамбула','воспроизводимая сборка'],starterCode:'\\documentclass{article}\n% shared preamble\n\\begin{document}\n\\input{sections/introduction}\n\\input{sections/method}\n\\input{sections/results}\n\\end{document}',compilerRequirement:'real-tex'}
    ]
  },
  {
    id:'technical-report',title:'Технический отчёт',subtitle:'Большой документ с главами, приложениями и устойчивой архитектурой.',difficulty:'Продвинутый',description:'Практика report/book-модели: несколько файлов, колонтитулы, ссылки и приложение.',prerequisites:['document-class','page-structure','multi-file','headers-footers'],concepts:['document-class','page-structure','headers-footers','multi-file','appendix','project-architecture'],
    stages:[
      {id:'class',title:'Класс report',objective:'Выбрать report и объяснить, зачем документу главы.',requirements:['report','chapter'],starterCode:'\\documentclass{report}\n\\begin{document}\n\\chapter{System overview}\n\\end{document}'},
      {id:'layout',title:'Геометрия',objective:'Задать поля документа через geometry.',requirements:['geometry в преамбуле','явная единица длины'],starterCode:'\\documentclass{report}\n\\usepackage[margin=28mm]{geometry}\n\\begin{document}\n\\end{document}'},
      {id:'files',title:'Разбиение на файлы',objective:'Оставить главный файл картой отчёта.',requirements:['input/include','без второго documentclass в главах'],starterCode:'\\include{chapters/system}\n\\include{chapters/validation}',compilerRequirement:'real-tex'},
      {id:'headers',title:'Навигация по страницам',objective:'Добавить сдержанный колонтитул.',requirements:['fancyhdr','pagestyle'],starterCode:'\\usepackage{fancyhdr}\n\\pagestyle{fancy}\n\\fancyhead[L]{Technical Report}'},
      {id:'appendix',title:'Приложения',objective:'Добавить технические данные как приложение.',requirements:['appendix','chapter/section'],starterCode:'\\appendix\n\\chapter{Interface specification}'},
      {id:'build',title:'Сборка',objective:'Подготовить проект к воспроизводимой сборке latexmk.',requirements:['устойчивые пути','нет ручной нумерации','единый root document'],starterCode:'% main.tex is the only root document',compilerRequirement:'real-tex'}
    ]
  },
  {
    id:'beamer-presentation',title:'Научная презентация',subtitle:'Beamer без декоративного шума: структура, формулы и доказательная логика.',difficulty:'Продвинутый',description:'Создайте короткую исследовательскую презентацию, где каждый frame выполняет одну смысловую функцию.',prerequisites:['document-class','environment','math-mode','figure'],concepts:['document-class','environment','section','math-mode','figure','professional-workflow'],
    stages:[
      {id:'frame',title:'Первый frame',objective:'Создать beamer document и один frame.',requirements:['beamer','frame environment'],starterCode:'\\documentclass{beamer}\n\\begin{document}\n\\begin{frame}{Research question}\nWhat changes under the intervention?\n\\end{frame}\n\\end{document}'},
      {id:'structure',title:'Секция и кадры',objective:'Разделить Method и Results на отдельные frames.',requirements:['section','несколько frames'],starterCode:'\\section{Method}\n\\begin{frame}{Method}\n...\n\\end{frame}'},
      {id:'math',title:'Формула',objective:'Добавить одну ключевую формулу без перегрузки кадра.',requirements:['math mode','объяснение рядом'],starterCode:'\\begin{frame}{Model}\n\\[y=ax+b\\]\n\\end{frame}'},
      {id:'figure',title:'Результат как рисунок',objective:'Добавить figure с понятной подписью или текстовым выводом.',requirements:['graphicx','includegraphics'],starterCode:'\\begin{frame}{Results}\n\\includegraphics[width=.8\\textwidth]{result.pdf}\n\\end{frame}'},
      {id:'final',title:'Редакционный проход',objective:'Оставить на каждом frame одну основную мысль и убрать декоративный шум.',requirements:['короткие заголовки','нет бессмысленных эффектов','логический порядок'],starterCode:'% Question → Method → Result → Conclusion'}
    ]
  }
];

export const projectById=new Map(projects.map(project=>[project.id,project]));
export const getProject=(id?:string)=>id?projectById.get(id):undefined;
