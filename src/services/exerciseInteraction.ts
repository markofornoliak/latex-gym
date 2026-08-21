import type { Exercise, ExerciseExecution } from '../types';

export type ExerciseInteractionKind='code'|'concept-answer'|'reconstruction';

type InteractionExercise=Pick<Exercise,'mode'|'starterCode'> & Partial<Pick<Exercise,'validators'|'execution'>>;

export type ExerciseInteraction={
  kind:ExerciseInteractionKind;
  execution:ExerciseExecution;
  requiresCompile:boolean;
  debug:boolean;
  middleTabLabel:string;
  resultTabLabel:string;
  primaryActionLabel:string;
};

function looksLikeLatexSource(source:string){
  return /\\(?:documentclass|begin|end|usepackage|section|subsection|chapter|paragraph|textbf|emph|frac|sqrt|label|ref|cite|input|include|newcommand|[A-Za-z@]+\s*\{)/.test(source);
}
function looksLikeWholeDocument(source:string){return /\\documentclass(?:\[[^\]]*\])?\{/.test(source)||/\\begin\s*\{document\}/.test(source);}
function validatorsRequireDocument(validators:Exercise['validators']|undefined){
  return Boolean(validators?.some(rule=>rule.type==='compiles'||rule.type==='documentClass'||(rule.type==='environment'&&rule.value==='document')));
}

export function exerciseExecution(exercise:InteractionExercise):ExerciseExecution{
  if(exercise.execution)return exercise.execution;
  if(exercise.mode==='Воссоздать результат')return 'reconstruction';
  if((exercise.mode==='Объяснить'||exercise.mode==='Архитектура')&&!looksLikeLatexSource(exercise.starterCode))return 'concept';
  if(validatorsRequireDocument(exercise.validators)||looksLikeWholeDocument(exercise.starterCode))return 'document';
  return 'fragment';
}

/**
 * Maps the pedagogical task to the smallest interaction surface that actually
 * helps the learner perform that cognitive operation. A TeX fragment remains
 * editable in CodeMirror, but it is not forced through a fake standalone build
 * unless the authored validator contract actually requires a document compile.
 */
export function getExerciseInteraction(exercise:InteractionExercise):ExerciseInteraction{
  const execution=exerciseExecution(exercise);
  if(execution==='reconstruction'){
    return {kind:'reconstruction',execution,requiresCompile:true,debug:false,middleTabLabel:'Код',resultTabLabel:'Сравнение',primaryActionLabel:'Проверить результат'};
  }

  if(execution==='concept'){
    return {kind:'concept-answer',execution,requiresCompile:false,debug:false,middleTabLabel:'Ответ',resultTabLabel:'Проверка',primaryActionLabel:'Проверить ответ'};
  }

  const debug=exercise.mode==='Исправить ошибку'||exercise.mode==='Найти ошибку';
  const requiresCompile=execution==='document';
  return {kind:'code',execution,requiresCompile,debug,middleTabLabel:'Код',resultTabLabel:debug?'Диагностика':'Результат',primaryActionLabel:debug?'Проверить исправление':'Проверить решение'};
}

export function initialExerciseDraft(exercise:InteractionExercise,saved:string|undefined){
  const interaction=getExerciseInteraction(exercise);
  if(interaction.kind!=='concept-answer')return saved??exercise.starterCode;
  // Older builds autosaved starterCode as soon as a task was visited. Do not
  // mistake that read-only prompt material for a learner-authored explanation.
  if(saved===undefined||saved===exercise.starterCode)return '';
  return saved;
}
