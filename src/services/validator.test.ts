import { describe, expect, it } from 'vitest';
import { getExercise } from '../data/courses';
import type { Exercise } from '../types';
import { validateExercise, validatorInternals } from './validator';

const compiled={ok:true,diagnostics:[],blocks:[],elapsedMs:1,engine:'educational-preview' as const};

describe('semantic validation',()=>{
  it('accepts a logically equivalent document structure solution',()=>{
    const exercise=getExercise('e01')!;
    const source='\\documentclass{article}\n\\begin{document}\nДругой допустимый абзац.\n\\end{document}';
    expect(validateExercise(exercise,source,compiled).ok).toBe(true);
  });

  it('rejects an exercise without required section',()=>{
    const exercise=getExercise('e03')!;
    const source='\\documentclass{article}\n\\begin{document}\nТекст.\n\\end{document}';
    expect(validateExercise(exercise,source,compiled).ok).toBe(false);
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

  it('treats trailing whitespace inside a group as structurally equivalent for containsText checks',()=>{
    expect(validatorInternals.hasStructuralText('$x=1, \\text{если } y=0$','\\text{если}')).toBe(true);
  });

  it('reports the approximate line for a failed forbidden-text rule',()=>{
    const exercise:Exercise={id:'synthetic',lessonId:'synthetic',category:'Отладка',difficulty:'Начальный',mode:'Рефакторинг',title:'No manual break',instructions:'Remove manual break.',requirements:['No \\\\'],starterCode:'First.\\\\\nSecond.',validators:[{type:'forbiddenText',value:'\\\\',message:'Ручной перенос удалён.',hint:'Используйте пустую строку.'}],hints:[],solution:'First.\n\nSecond.',concepts:['paragraph']};
    const result=validateExercise(exercise,'First.\nSecond.\\\\',compiled);
    expect(result.ok).toBe(false);
    expect(result.items[0].line).toBe(2);
  });

  it('reports style feedback without turning a valid solution into a failed requirement',()=>{
    const exercise:Exercise={id:'style',lessonId:'style',category:'Математика',difficulty:'Базовый',mode:'Улучшить код',title:'Typography',instructions:'Improve typography.',requirements:['math'],starterCode:'',validators:[{type:'inlineMath',message:'Есть формула.',hint:'Добавьте math mode.'}],hints:[],solution:'$\\sin x$',concepts:['math-operator']};
    const result=validateExercise(exercise,'$sin x$',compiled);
    expect(result.ok).toBe(true);
    expect(result.items.some(item=>item.level==='style'&&!item.ok)).toBe(true);
  });

  it('distinguishes a missing package warning from acceptance criteria',()=>{
    const exercise:Exercise={id:'graphics',lessonId:'graphics',category:'Графика',difficulty:'Базовый',mode:'Написать код',title:'Image',instructions:'Insert image.',requirements:['image'],starterCode:'',validators:[{type:'command',value:'includegraphics',message:'Есть изображение.',hint:'Используйте includegraphics.'}],hints:[],solution:'\\includegraphics{a.pdf}',concepts:['figure']};
    const result=validateExercise(exercise,'\\includegraphics{a.pdf}',compiled);
    expect(result.ok).toBe(true);
    expect(result.items.find(item=>item.level==='warning')?.blocking).toBe(false);
  });
});
