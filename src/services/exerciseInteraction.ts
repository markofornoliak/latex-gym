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

function looksLikeLatexSource(source:string){
  return /\\(?:documentclass|begin|end|usepackage|section|subsection|chapter|paragraph|textbf|emph|frac|sqrt|label|ref|cite|input|include|newcommand|[A-Za-z@]+\s*\{)/.test(source);
}

/**
 * Maps the pedagogical task to the smallest interaction surface that actually
 * helps the learner perform that cognitive operation. The mode label alone is
 * intentionally insufficient: some legacy "Explain"/"Architecture" tasks ask
 * learners to inspect or modify real TeX source, and those belong in CodeMirror.
 */
export function getExerciseInteraction(exercise:Pick<Exercise,'mode'|'starterCode'>):ExerciseInteraction{
  if(exercise.mode==='Воссоздать результат'){
    return {kind:'reconstruction',requiresCompile:true,debug:false,middleTabLabel:'Код',resultTabLabel:'Сравнение',primaryActionLabel:'Проверить результат'};
  }

  if((exercise.mode==='Объяснить'||exercise.mode==='Архитектура')&&!looksLikeLatexSource(exercise.starterCode)){
    return {kind:'concept-answer',requiresCompile:false,debug:false,middleTabLabel:'Ответ',resultTabLabel:'Проверка',primaryActionLabel:'Проверить ответ'};
  }

  const debug=exercise.mode==='Исправить ошибку'||exercise.mode==='Найти ошибку';
  return {kind:'code',requiresCompile:true,debug,middleTabLabel:'Код',resultTabLabel:debug?'Диагностика':'Результат',primaryActionLabel:debug?'Проверить исправление':'Проверить решение'};
}

export function initialExerciseDraft(exercise:Pick<Exercise,'starterCode'|'mode'>,saved:string|undefined){
  const interaction=getExerciseInteraction(exercise);
  if(interaction.kind!=='concept-answer')return saved??exercise.starterCode;
  // Older builds autosaved starterCode as soon as a task was visited. Do not
  // mistake that read-only prompt material for a learner-authored explanation.
  if(saved===undefined||saved===exercise.starterCode)return '';
  return saved;
}
