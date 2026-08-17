import { describe, expect, it } from 'vitest';
import { getExerciseInteraction, initialInteractionValue } from './exerciseInteractions';
import type { Exercise } from '../types';

const exercise=(lessonId:string,title:string,starterCode=''):Exercise=>({
  id:'test',lessonId,category:'Основы',difficulty:'Начальный',mode:'Объяснить',title,instructions:'',requirements:[],starterCode,validators:[],hints:[],solution:'answer',concepts:[]
});

describe('concept exercise interactions',()=>{
  it('uses selection instead of the LaTeX editor for a conceptual choice',()=>{
    const item=exercise('what-is-latex','Исходник','PDF / source.tex / compiler');
    const interaction=getExerciseInteraction(item);
    expect(interaction.kind).toBe('selection');
    expect(initialInteractionValue(item,interaction)).toBe('');
  });

  it('preserves the intentionally wrong initial ordering for an ordering task',()=>{
    const item=exercise('what-is-latex','Цепочка','document.pdf → source.tex → compiler');
    const interaction=getExerciseInteraction(item);
    expect(interaction.kind).toBe('ordering');
    expect(initialInteractionValue(item,interaction)).toBe('document.pdf → source.tex → compiler');
  });

  it('falls back to the code editor for normal LaTeX practice',()=>{
    const item=exercise('fractions-powers','Дробь','\\[ a+b/c \\]');
    const interaction=getExerciseInteraction(item);
    expect(interaction.kind).toBe('code');
    expect(initialInteractionValue(item,interaction)).toBe(item.starterCode);
  });
});
