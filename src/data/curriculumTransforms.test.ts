import { describe, expect, it } from 'vitest';
import { cloneCurriculumDraft, type CurriculumDraft } from './curriculumDraft';
import { applyExplanationElaboration } from './explanationElaboration';
import { normalizeCurriculumDraft } from './curriculumNormalize';
import type { ConceptDefinition, CourseModule, Exercise, Lesson, ReferenceEntry } from '../types';

function fixture():CurriculumDraft{
  const exercise:Exercise={
    id:'fixture-exercise',lessonId:'fixture-lesson',category:'Математика',difficulty:'Базовый',mode:'Написать код',
    title:'Дробь',instructions:'Напишите дробь.',requirements:['Использовать frac'],starterCode:'$a/b$',validators:[],hints:[],solution:'$\\frac{a}{b}$',concepts:['frac']
  };
  const lesson:Lesson={
    id:'fixture-lesson',moduleId:'fixture-module',number:1,title:'Тестовый урок',subtitle:'Проверка чистого construction pipeline.',difficulty:'Базовый',
    theory:[{id:'fixture-theory',title:'Дробь',body:'Структурная математика.'}],examples:[],exercises:[exercise],relatedCommands:['frac']
  };
  const module:CourseModule={id:'fixture-module',number:1,title:'Тестовый модуль',description:'Fixture',prerequisites:'Нет',difficulty:'Базовый',lessons:[lesson]};
  const reference:ReferenceEntry={id:'frac',command:'\\frac',category:'Математика',aliases:['fraction'],title:'Дробь',description:'Дробь.',syntax:'\\frac{a}{b}',example:'$\\frac{a}{b}$',related:[]};
  return {modules:[module],lessons:[lesson],exercises:[exercise],references:[reference]};
}

const concepts:ConceptDefinition[]=[
  {id:'math-mode',title:'Математический режим',description:'Math',prerequisites:[]},
  {id:'fraction',title:'Дробь',description:'Fraction',prerequisites:['math-mode']}
];

describe('curriculum construction transforms',()=>{
  it('clones the graph without breaking shared module/lesson/exercise identities',()=>{
    const input=fixture();
    const cloned=cloneCurriculumDraft(input);
    expect(cloned).not.toBe(input);
    expect(cloned.modules[0].lessons[0]).toBe(cloned.lessons[0]);
    expect(cloned.lessons[0].exercises[0]).toBe(cloned.exercises[0]);
    expect(cloned.lessons[0]).not.toBe(input.lessons[0]);
  });

  it('elaborates explanations without mutating the input and is deterministic',()=>{
    const input=fixture();
    const before=JSON.stringify(input);
    const first=applyExplanationElaboration(input);
    const second=applyExplanationElaboration(input);
    expect(JSON.stringify(input)).toBe(before);
    expect(first.lessons[0].theory[0].body).not.toBe(input.lessons[0].theory[0].body);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    expect(first.modules[0].lessons[0]).toBe(first.lessons[0]);
  });

  it('normalizes legacy concepts on a copy and preserves graph identity',()=>{
    const input=fixture();
    const before=JSON.stringify(input);
    const {draft,report}=normalizeCurriculumDraft(input,concepts);
    expect(JSON.stringify(input)).toBe(before);
    expect(input.exercises[0].concepts).toEqual(['frac']);
    expect(draft.exercises[0].concepts).toEqual(['fraction']);
    expect(draft.lessons[0].content?.length).toBe(1);
    expect(draft.modules[0].lessons[0]).toBe(draft.lessons[0]);
    expect(draft.lessons[0].exercises[0]).toBe(draft.exercises[0]);
    expect(report.changes).toContainEqual({kind:'exercise-concept',sourceId:'fixture-exercise',from:'frac',to:'fraction'});
    expect(report.unresolved).toEqual([]);
  });
});
