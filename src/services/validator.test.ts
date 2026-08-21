import { describe, expect, it } from 'vitest';
import type { Exercise } from '../types';
import { validateExercise, validatorInternals } from './validator';

const compiled={ok:true,diagnostics:[],blocks:[],elapsedMs:1,engine:'educational-preview' as const};

const documentStructureExercise:Exercise={
  id:'validator-document-structure',lessonId:'validator-fixture',category:'Основы',difficulty:'Начальный',mode:'Собрать документ',
  title:'Document structure fixture',instructions:'Build a valid article.',requirements:['article','document','paragraph'],starterCode:'',
  validators:[
    {type:'documentClass',value:'article',message:'Класс article.',hint:'Используйте documentclass.'},
    {type:'environment',value:'document',message:'Есть document.',hint:'Добавьте окружение document.'},
    {type:'paragraph',message:'Есть абзац.',hint:'Добавьте обычный текст.'},
    {type:'compiles',message:'Документ согласован.',hint:'Исправьте синтаксис.'}
  ],
  hints:[],solution:'\\documentclass{article}\n\\begin{document}\nТекст.\n\\end{document}',concepts:['document-class','document-environment','paragraph']
};

const sectionExercise:Exercise={
  ...documentStructureExercise,
  id:'validator-required-section',
  requirements:['article','document','section','paragraph'],
  validators:[
    ...documentStructureExercise.validators.slice(0,2),
    {type:'command',value:'section',message:'Есть section.',hint:'Добавьте section.'},
    ...documentStructureExercise.validators.slice(2)
  ],
  solution:'\\documentclass{article}\n\\begin{document}\n\\section{Заголовок}\nТекст.\n\\end{document}',
  concepts:['document-class','document-environment','section','paragraph']
};

describe('semantic validation',()=>{
  it('accepts a logically equivalent document structure solution',()=>{
    const source='\\documentclass{article}\n\\begin{document}\nДругой допустимый абзац.\n\\end{document}';
    expect(validateExercise(documentStructureExercise,source,compiled).ok).toBe(true);
  });

  it('rejects an exercise without required section',()=>{
    const source='\\documentclass{article}\n\\begin{document}\nТекст.\n\\end{document}';
    expect(validateExercise(sectionExercise,source,compiled).ok).toBe(false);
  });

  it('accepts package loading only from the preamble',()=>{
    expect(validatorInternals.hasPackage('\\documentclass{article}\n\\usepackage{amsmath}\n\\begin{document}\n\\end{document}','amsmath')).toBe(true);
    expect(validatorInternals.hasPackage('\\documentclass{article}\n\\begin{document}\n\\usepackage{amsmath}\n\\end{document}','amsmath')).toBe(false);
  });

  it('understands document class options and environment balance',()=>{
    expect(validatorInternals.hasDocumentClassOption('\\documentclass[a4paper,12pt]{article}','12pt')).toBe(true);
    expect(validatorInternals.environmentsBalanced('\\begin{document}\n\\begin{itemize}\n\\end{itemize}\n\\end{document}')).toBe(true);
    expect(validatorInternals.environmentsBalanced('\\begin{document}\n\\begin{itemize}\n\\end{document}')).toBe(false);
  });

  it('recognizes TeX control words before subscripts, superscripts and stars',()=>{
    expect(validatorInternals.countCommand('$\\lim_{n\\to\\infty} a_n$','lim')).toBe(1);
    expect(validatorInternals.countCommand('\\section*{Unnumbered}','section')).toBe(1);
    expect(validatorInternals.countCommand('\\sectional{Wrong}','section')).toBe(0);
  });

  it('does not count commands that exist only inside comments or unused definitions',()=>{
    expect(validatorInternals.countCommand('% \\section{Hidden}\nText','section')).toBe(0);
    expect(validatorInternals.countCommand('\\newcommand{\\hidden}{\\section{Hidden}}\nText','section')).toBe(0);
    expect(validatorInternals.countCommand('\\newcommand{\\hidden}{Text}\n\\section{Visible}','section')).toBe(1);
  });

  it('treats trailing whitespace inside a group as structurally equivalent for containsText checks',()=>{
    expect(validatorInternals.hasStructuralText('$x=1, \\text{если } y=0$','\\text{если}')).toBe(true);
  });

  it('ignores commented or definition-only text for structural requirements',()=>{
    expect(validatorInternals.hasActiveStructuralText('% \\section{Results}\nText','\\section{Results}')).toBe(false);
    expect(validatorInternals.hasActiveStructuralText('\\newcommand{\\hidden}{\\section{Results}}\nText','\\section{Results}')).toBe(false);
    expect(validatorInternals.hasActiveStructuralText('\\section{Results}\nText','\\section{Results}')).toBe(true);
  });

  it('accepts equivalent prose for an ordered conceptual pipeline',()=>{
    const exercise:Exercise={id:'concept-order',lessonId:'foundation',category:'Основы',difficulty:'Начальный',mode:'Архитектура',title:'Pipeline',instructions:'Explain order.',requirements:['source → compiler → document'],starterCode:'document.pdf → source.tex → compiler',validators:[{type:'containsText',value:'source.tex → compiler → document.pdf',message:'Порядок верный.',hint:'Сначала source, затем compiler.'}],hints:[],solution:'source.tex → compiler → document.pdf',concepts:['compiler']};
    expect(validateExercise(exercise,'Сначала source.tex поступает в compiler, после чего получается document.pdf.').ok).toBe(true);
    expect(validateExercise(exercise,'Сначала document.pdf, затем compiler и source.tex.').ok).toBe(false);
  });

  it('does not loosen structural containsText checks when a compile result is present',()=>{
    const exercise:Exercise={id:'code-order',lessonId:'foundation',category:'Основы',difficulty:'Начальный',mode:'Архитектура',title:'Pipeline source',instructions:'Write exact structure.',requirements:['ordered marker'],starterCode:'\\documentclass{article}',validators:[{type:'containsText',value:'PREAMBLE → BODY',message:'Граница есть.',hint:'Добавьте маркер.'}],hints:[],solution:'PREAMBLE → BODY',concepts:['preamble']};
    expect(validateExercise(exercise,'PREAMBLE text BODY',compiled).ok).toBe(false);
  });

  it('does not allow comments to satisfy containsText or fail forbiddenText',()=>{
    const requires:Exercise={id:'comment-required',lessonId:'synthetic',category:'Отладка',difficulty:'Начальный',mode:'Исправить ошибку',title:'Required',instructions:'Use section.',requirements:['section'],starterCode:'',validators:[{type:'containsText',value:'\\section{Results}',message:'Есть section.',hint:'Добавьте section.'}],hints:[],solution:'\\section{Results}',concepts:['section']};
    const forbids:Exercise={...requires,id:'comment-forbidden',validators:[{type:'forbiddenText',value:'\\mysterycommand',message:'Команда удалена.',hint:'Удалите команду.'}],solution:'Text'};
    expect(validateExercise(requires,'% \\section{Results}\nText',compiled).ok).toBe(false);
    expect(validateExercise(forbids,'% old: \\mysterycommand{Text}\nText',compiled).ok).toBe(true);
  });

  it('reports the approximate line for a failed forbidden-text rule',()=>{
    const exercise:Exercise={id:'synthetic',lessonId:'synthetic',category:'Отладка',difficulty:'Начальный',mode:'Рефакторинг',title:'No manual break',instructions:'Remove manual break.',requirements:['No \\\\'],starterCode:'First.\\\\\nSecond.',validators:[{type:'forbiddenText',value:'\\\\',message:'Ручной перенос удалён.',hint:'Используйте пустую строку.'}],hints:[],solution:'First.\n\nSecond.',concepts:['paragraph']};
    const result=validateExercise(exercise,'First.\nSecond.\\\\',compiled);
    expect(result.ok).toBe(false);
    expect(result.items[0].line).toBe(2);
  });
});
