import type { LearningProject } from '../types';

export const publicationDebuggingProject:LearningProject={
  id:'publication-debugging',
  title:'Диагностика публикации',
  subtitle:'Сломанный многофайловый проект: от первой ошибки до воспроизводимой сборки',
  difficulty:'Экспертный',
  description:'Вместо написания документа с нуля вы получаете правдоподобную сломанную публикацию. Цель — научиться отделять первичную причину от каскада сообщений, восстанавливать файловые связи, ссылки и библиографию, а затем доводить проект до чистой полной сборки.',
  prerequisites:['Многофайловые документы','Перекрёстные ссылки','Библиография','Отладка'],
  concepts:['debugging','brace-balance','multi-file','label','ref','bibliography-model','citation','project-architecture','professional-workflow'],
  stages:[
    {
      id:'cascade',
      title:'1. Первая содержательная ошибка',
      objective:'Найдите первичную причину каскада, исправьте её и убедитесь, какие вторичные сообщения исчезли после новой сборки.',
      requirements:['document compiles','balanced environments','section'],
      starterCode:'\\documentclass{article}\n\\begin{document}\n\\section{Method\nThe method is described here.\n\\textbf{Result}\n\\end{document}\n'
    },
    {
      id:'file-path',
      title:'2. Разорванная файловая связь',
      objective:'Восстановите отсутствующий файл раздела вместо копирования его текста обратно в main.tex.',
      requirements:['document compiles','input','sections/method.tex'],
      starterCode:'\\documentclass{article}\n\\begin{document}\n\\input{sections/method}\n\\end{document}\n'
    },
    {
      id:'cross-references',
      title:'3. Перекрёстные ссылки',
      objective:'Исправьте идентичность объектов: ссылка должна разрешаться через метку, а не через вручную записанный номер.',
      requirements:['document compiles','label','ref','no unresolved references'],
      starterCode:'\\documentclass{article}\n\\begin{document}\nSee Section~\\ref{sec:method}.\n\\section{Method}\nMethod text.\n\\end{document}\n'
    },
    {
      id:'bibliography',
      title:'4. Библиография',
      objective:'Восстановите связь между citation key и отдельной базой references.bib так, чтобы полная сборка разрешила цитату.',
      requirements:['document compiles','references.bib','cite','bibliography','no unresolved citations'],
      starterCode:'\\documentclass{article}\n\\usepackage[backend=bibtex]{biblatex}\n\\addbibresource{references.bib}\n\\begin{document}\nSee \\cite{knuth1984}.\n\\printbibliography\n\\end{document}\n'
    },
    {
      id:'release',
      title:'5. Финальная сборка',
      objective:'Соберите публикацию как многофайловый проект без критических диагностик и с явным разделением root, sections, macros и bibliography.',
      requirements:['document compiles','input','macros.tex','references.bib','no critical diagnostics'],
      starterCode:'\\documentclass{article}\n\\input{macros}\n\\begin{document}\n\\input{sections/introduction}\n\\input{sections/method}\n\\end{document}\n'
    }
  ]
};
