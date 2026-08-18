import { describe, expect, it } from 'vitest';
import { getExerciseInteraction, initialExerciseDraft } from './exerciseInteraction';

describe('exercise interaction',()=>{
  it('keeps production and debugging tasks on the code workspace',()=>{
    expect(getExerciseInteraction({mode:'Написать код'}).kind).toBe('code');
    const debug=getExerciseInteraction({mode:'Исправить ошибку'});
    expect(debug.kind).toBe('code');
    expect(debug.debug).toBe(true);
    expect(debug.resultTabLabel).toBe('Диагностика');
  });

  it('uses a concise answer surface for conceptual tasks',()=>{
    const explain=getExerciseInteraction({mode:'Объяснить'});
    expect(explain.kind).toBe('concept-answer');
    expect(explain.requiresCompile).toBe(false);
    expect(getExerciseInteraction({mode:'Архитектура'}).kind).toBe('concept-answer');
  });

  it('reserves the comparison workspace for reconstruction',()=>{
    const reconstruction=getExerciseInteraction({mode:'Воссоздать результат'});
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
