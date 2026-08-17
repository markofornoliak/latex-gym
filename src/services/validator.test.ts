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

  it('reports the approximate line for a failed forbidden-text rule',()=>{
    const exercise:Exercise={id:'synthetic',lessonId:'synthetic',category:'Отладка',difficulty:'Начальный',mode:'Рефакторинг',title:'No manual break',instructions:'Remove manual break.',requirements:['No \\\\'],starterCode:'First.\\\\\nSecond.',validators:[{type:'forbiddenText',value:'\\\\',message:'Ручной перенос удалён.',hint:'Используйте пустую строку.'}],hints:[],solution:'First.\n\nSecond.',concepts:['paragraph']};
    const result=validateExercise(exercise,'First.\nSecond.\\\\',compiled);
    expect(result.ok).toBe(false);
    expect(result.items[0].line).toBe(2);
  });
});
