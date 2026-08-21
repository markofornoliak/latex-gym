import { describe, expect, it } from 'vitest';
import { getExerciseInteraction, initialExerciseDraft } from './exerciseInteraction';

describe('exercise interaction',()=>{
  it('keeps production and debugging tasks on the code workspace',()=>{
    const write=getExerciseInteraction({mode:'Написать код',starterCode:'',validators:[{type:'command',value:'section',message:'section',hint:'section'}]});
    expect(write.kind).toBe('code');
    expect(write.execution).toBe('fragment');
    expect(write.requiresCompile).toBe(false);
    const debug=getExerciseInteraction({mode:'Исправить ошибку',starterCode:'\\secton{Result}',validators:[{type:'command',value:'section',message:'section',hint:'section'}]});
    expect(debug.kind).toBe('code');
    expect(debug.debug).toBe(true);
    expect(debug.requiresCompile).toBe(false);
    expect(debug.resultTabLabel).toBe('Диагностика');
  });

  it('uses a concise answer surface for conceptual tasks',()=>{
    const explain=getExerciseInteraction({mode:'Объяснить',starterCode:'source / compiler / PDF'});
    expect(explain.kind).toBe('concept-answer');
    expect(explain.requiresCompile).toBe(false);
    expect(getExerciseInteraction({mode:'Архитектура',starterCode:'document.pdf → source.tex → compiler'}).kind).toBe('concept-answer');
  });

  it('keeps source-oriented explain and architecture tasks in CodeMirror without forcing fragment compilation',()=>{
    const explain=getExerciseInteraction({mode:'Объяснить',starterCode:'\\section{Method}\\nText'});
    expect(explain.kind).toBe('code');
    expect(explain.execution).toBe('fragment');
    expect(explain.requiresCompile).toBe(false);
    const architecture=getExerciseInteraction({mode:'Архитектура',starterCode:'\\documentclass{article}\\n\\begin{document}',validators:[{type:'compiles',message:'compile',hint:'fix'}]});
    expect(architecture.kind).toBe('code');
    expect(architecture.execution).toBe('document');
    expect(architecture.requiresCompile).toBe(true);
  });

  it('treats authored compile/document validators as a document contract even with an empty starter',()=>{
    const interaction=getExerciseInteraction({mode:'Собрать документ',starterCode:'',validators:[{type:'documentClass',value:'article',message:'article',hint:'article'},{type:'compiles',authority:'real-tex',message:'compile',hint:'compile'}]});
    expect(interaction.execution).toBe('document');
    expect(interaction.requiresCompile).toBe(true);
  });

  it('allows an explicit execution override without changing the exercise mode',()=>{
    expect(getExerciseInteraction({mode:'Исправить ошибку',starterCode:'\\secton{Result}',execution:'document'}).requiresCompile).toBe(true);
    expect(getExerciseInteraction({mode:'Написать код',starterCode:'\\documentclass{article}',execution:'fragment'}).requiresCompile).toBe(false);
  });

  it('reserves the comparison workspace for reconstruction',()=>{
    const reconstruction=getExerciseInteraction({mode:'Воссоздать результат',starterCode:'\\[ a+b/c \\]'});
    expect(reconstruction.kind).toBe('reconstruction');
    expect(reconstruction.execution).toBe('reconstruction');
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
