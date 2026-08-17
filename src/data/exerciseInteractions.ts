import type { Exercise } from '../types';

export type ExerciseInteraction =
  | { kind:'code' }
  | { kind:'selection'; options:string[] }
  | { kind:'ordering'; items:string[]; separator:string }
  | { kind:'identification'; options:string[] }
  | { kind:'completion'; prefix?:string; suffix?:string; placeholder?:string };

const interactions:Record<string,ExerciseInteraction>={
  'what-is-latex:Исходник':{
    kind:'selection',
    options:['document.pdf','source.tex','compiler']
  },
  'what-is-latex:Обработчик':{
    kind:'selection',
    options:['source.tex','compiler','document.pdf']
  },
  'what-is-latex:Цепочка':{
    kind:'ordering',
    items:['source.tex','compiler','document.pdf'],
    separator:' → '
  },
  'compilation-model:Пропущенный шаг':{
    kind:'completion',
    prefix:'source.tex → ',
    suffix:' → document.pdf',
    placeholder:'что происходит здесь?'
  },
  'compilation-model:Где исправлять':{
    kind:'selection',
    options:['document.pdf','source.tex']
  },
  'compilation-model:Порядок ошибок':{
    kind:'selection',
    options:['первую содержательную ошибку','последнее сообщение в логе','ошибку с самым длинным текстом']
  },
  'tex-source:Расширение':{
    kind:'completion',
    prefix:'paper',
    placeholder:'.tex'
  },
  'tex-source:Текст':{
    kind:'identification',
    options:['\\section{Conclusion}','Method was reproducible.']
  },
  'tex-source:Инструкция':{
    kind:'identification',
    options:['\\section{Method}','Experiment repeated.']
  }
};

export function getExerciseInteraction(exercise:Exercise):ExerciseInteraction{
  return interactions[`${exercise.lessonId}:${exercise.title}`]??{kind:'code'};
}

export function initialInteractionValue(exercise:Exercise,interaction:ExerciseInteraction,draft?:string){
  if(interaction.kind==='code')return draft??exercise.starterCode;
  if(draft!==undefined&&draft!==exercise.starterCode)return draft;
  if(interaction.kind==='ordering'){
    const candidates=exercise.starterCode.split(interaction.separator).map(item=>item.trim()).filter(Boolean);
    if(candidates.length===interaction.items.length&&interaction.items.every(item=>candidates.includes(item)))return candidates.join(interaction.separator);
    return interaction.items.join(interaction.separator);
  }
  return '';
}

export function interactionLabel(interaction:ExerciseInteraction, fallback:string){
  if(interaction.kind==='selection')return 'Выбор';
  if(interaction.kind==='ordering')return 'Порядок';
  if(interaction.kind==='identification')return 'Распознавание';
  if(interaction.kind==='completion')return 'Дополнение';
  return fallback;
}
