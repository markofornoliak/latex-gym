import { describe, expect, it } from 'vitest';
import type { Exercise } from '../types';
import { commandCount, hasPackage, stripLatexComments } from './latexSourceAnalysis';
import { validateExercise, validatorInternals } from './validator';

function exercise(overrides:Partial<Exercise>):Exercise{
  return {
    id:'audit:test',lessonId:'audit',category:'Основы',difficulty:'Средний',mode:'Объяснить',
    title:'Audit',instructions:'Audit',requirements:[],starterCode:'',validators:[],hints:[],solution:'',concepts:[],...overrides
  };
}

describe('backend audit validator regressions',()=>{
  it('treats percent after an even backslash run as a real TeX comment',()=>{
    const source=String.raw`Text\\% \section{Hidden}`;
    expect(stripLatexComments(source)).toBe(String.raw`Text\\`);
    expect(commandCount(source,'section')).toBe(0);
  });

  it('keeps percent escaped after an odd backslash run',()=>{
    const source=String.raw`Text\% \section{Visible}`;
    expect(commandCount(source,'section')).toBe(1);
  });

  it('does not accept a package hidden in an unused macro definition',()=>{
    const source=String.raw`\documentclass{article}
\newcommand{\unused}{\usepackage{amsmath}}
\begin{document}Text\end{document}`;
    expect(hasPackage(source,'amsmath')).toBe(false);
  });

  it('uses active source for regex validators unless raw scope is explicitly authored',()=>{
    const source='% \\section{Hidden}';
    const active=validatorInternals.hasActiveStructuralText(source,'\\section{Hidden}');
    expect(active).toBe(false);
    const base={type:'regex' as const,value:'\\\\section',message:'section',hint:'section'};
    expect(validateExercise(exercise({mode:'Написать код',validators:[base]}),source).ok).toBe(false);
    expect(validateExercise(exercise({mode:'Написать код',validators:[{...base,scope:'raw'}]}),source).ok).toBe(true);
  });

  it('rejects a negated conceptual chain that merely contains the expected words',()=>{
    const conceptual=exercise({
      validators:[{type:'containsText',value:'source.tex → compiler → document.pdf',message:'chain',hint:'chain'}],
      solution:'source.tex → compiler → document.pdf'
    });
    const wrong='source.tex не должен идти в compiler; document.pdf не является результатом.';
    expect(validateExercise(conceptual,wrong).ok).toBe(false);
    expect(validateExercise(conceptual,'source.tex проходит через compiler и создаёт document.pdf.').ok).toBe(true);
  });

  it('rejects the original fraction reconstruction exploit',()=>{
    const target=exercise({
      mode:'Воссоздать результат',execution:'reconstruction',
      solution:String.raw`\documentclass{article}\begin{document}\[\frac{a+b}{c}\]\end{document}`,
      validators:[{type:'command',value:'frac',message:'fraction',hint:'fraction'}]
    });
    const exploit=String.raw`\documentclass{article}\begin{document}\[\frac{1}{2}\]\end{document}`;
    const alternative=String.raw`\documentclass{article}\begin{document}\[ \frac{a + b}{c} \]\end{document}`;
    expect(validateExercise(target,exploit).ok).toBe(false);
    expect(validateExercise(target,alternative).ok).toBe(true);
  });
});