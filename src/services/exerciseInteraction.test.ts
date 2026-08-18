import { describe, expect, it } from 'vitest';
import { getExerciseInteraction, initialExerciseDraft } from './exerciseInteraction';

describe('exercise interaction',()=>{
  it('keeps production and debugging tasks on the code workspace',()=>{
    expect(getExerciseInteraction({mode:'Написать код',starterCode:''}).kind).toBe('code');
    const debug=getExerciseInteraction({mode:'Исправить ошибку',starterCode:'\\begin{document}'});
    expect(debug.kind).toBe('code');
    expect(debug.debug).toBe(true);
    expect(debug.resultTabLabel).toBe('Диагностика');
  });

  it('uses a concise answer surface for conceptual tasks',()=>{
    const explain=getExerciseInteraction({mode:'Объяснить',starterCode:'source / compiler / PDF'});
    expect(explain.kind).toBe('concept-answer');
    expect(explain.requiresCompile).toBe(false);
    expect(getExerciseInteraction({mode:'Архитектура',starterCode:'document.pdf → source.tex → compiler'}).kind).toBe('concept-answer');
  });

  it('keeps source-oriented explain and architecture tasks in CodeMirror',()=>{
    expect(getExerciseInteraction({mode:'Объяснить',starterCode:'\\section{Method}\\nText'}).kind).toBe('code');
    expect(getExerciseInteraction({mode:'Архитектура',starterCode:'\\documentclass{article}\\n\\begin{document}'}).kind).toBe('code');
  });

  it('reserves the comparison workspace for reconstruction',()=>{
    const reconstruction=getExerciseInteraction({mode:'Воссоздать результат',starterCode:'\\[ a+b/c \\]'});
    expect(reconstruction.kind).toBe('reconstruction');
    expect(reconstruction.requiresCompile).toBe(true);
    expect(reconstruction.resultTabLabel).toBe('Сравнение');
  });

  it('does not expose autosaved prompt text as a conceptual answer',()=>{
    const exercise={mode:'Объяснить' as const,starterCode:'source / compiler / PDF'};
    expect(initialExerciseDraft(exercise,undefined)).toBe('');
    expect(initialExerciseDraft(exercise,exercise.starterCode)).toBe('');
    expect(initialExerciseDraft(exercise,'compiler')).toBe('compiler');
  });
});
