import { exercises, lessons } from './courses';
import { referenceEntries } from './reference';

/**
 * Small editorial refinements that mirror the product's primary visual benchmark.
 * They remain in the data layer so presentation components stay curriculum-agnostic.
 */
const firstLesson=lessons.find(lesson=>lesson.id==='document-structure');
if(firstLesson){
  firstLesson.subtitle='Каждый документ на LaTeX имеет определённую структуру.';
  if(firstLesson.theory.length===2){
    firstLesson.theory.push({
      id:'document-structure-t3',
      title:'Структура как контракт',
      body:'Класс документа задаёт базовые правила набора, а окружение document отделяет настройки от публикуемого содержимого. Это минимальный контракт, на котором строятся более сложные LaTeX-документы.',
      note:'Сначала добейтесь корректного каркаса; затем добавляйте структуру, математику и оформление.'
    });
  }
}

const firstExercise=exercises.find(exercise=>exercise.id==='e01');
if(firstExercise){
  Object.assign(firstExercise,{
    title:'Заголовок и абзац',
    instructions:'Создайте документ, который выведет заголовок и текст абзаца.',
    requirements:['Класс документа: article','Заголовок первого уровня','Один абзац текста'],
    starterCode:'',
    validators:[
      {type:'documentClass',value:'article',message:'Класс документа выбран правильно.',hint:'Начните с \\documentclass{article}.'},
      {type:'environment',value:'document',message:'Окружение document создано.',hint:'Поместите содержимое между \\begin{document} и \\end{document}.'},
      {type:'command',value:'section',message:'Найден заголовок первого уровня.',hint:'Используйте команду \\section{...}.'},
      {type:'paragraph',message:'Добавлен обычный абзац.',hint:'После заголовка напишите обычный текст.'},
      {type:'compiles',message:'Документ синтаксически согласован.',hint:'Проверьте фигурные скобки и пары \\begin / \\end.'}
    ],
    hints:['В LaTeX заголовки создаются специальными командами.','Для раздела первого уровня используется команда \\section.','Попробуйте: \\section{Название}.'],
    solution:'\\documentclass{article}\n\\begin{document}\n\\section{Заголовок}\nЭто один абзац текста.\n\\end{document}',
    concepts:['documentclass','environment','section','paragraph'],
    mode:'Собрать документ'
  });
}

const fractionReference=referenceEntries.find(entry=>entry.id==='frac');
if(fractionReference){
  fractionReference.description='Дробь: набирает числитель над знаменателем и сохраняет математические интервалы.';
}
