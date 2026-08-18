import type { Exercise } from '../types';

export type ExerciseInteractionKind='code'|'concept-answer'|'reconstruction';

export type ExerciseInteraction={
  kind:ExerciseInteractionKind;
  requiresCompile:boolean;
  debug:boolean;
  middleTabLabel:string;
  resultTabLabel:string;
  primaryActionLabel:string;
};

/**
 * Maps the pedagogical task to the smallest interaction surface that actually
 * helps the learner perform that cognitive operation. This deliberately does
 * not create a renderer for every value in Exercise.mode: modes stay on the
 * mature code path until the curriculum contains a task that needs something
 * more specific.
 */
export function getExerciseInteraction(exercise:Pick<Exercise,'mode'>):ExerciseInteraction{
  if(exercise.mode==='Воссоздать результат'){
    return {kind:'reconstruction',requiresCompile:true,debug:false,middleTabLabel:'Код',resultTabLabel:'Сравнение',primaryActionLabel:'Проверить результат'};
  }

  if(exercise.mode==='Объяснить'||exercise.mode==='Архитектура'){
    return {kind:'concept-answer',requiresCompile:false,debug:false,middleTabLabel:'Ответ',resultTabLabel:'Проверка',primaryActionLabel:'Проверить ответ'};
  }

  const debug=exercise.mode==='Исправить ошибку'||exercise.mode==='Найти ошибку';
  return {kind:'code',requiresCompile:true,debug,middleTabLabel:'Код',resultTabLabel:debug?'Диагностика':'Результат',primaryActionLabel:debug?'Проверить исправление':'Проверить решение'};
}

export function initialExerciseDraft(exercise:Pick<Exercise,'starterCode'|'mode'>,saved:string|undefined){
  const interaction=getExerciseInteraction(exercise as Pick<Exercise,'mode'>);
  if(interaction.kind!=='concept-answer')return saved??exercise.starterCode;
  // Older builds autosaved starterCode as soon as a task was visited. Do not
  // mistake that read-only prompt material for a learner-authored explanation.
  if(saved===undefined||saved===exercise.starterCode)return '';
  return saved;
}
