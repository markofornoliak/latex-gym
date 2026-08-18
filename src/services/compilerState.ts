import type { CompilationState } from '../types';

export function isCompilationBusy(state:CompilationState){
  return state==='queued'||state==='initializing'||state==='compiling'||state==='resolving-references'||state==='running-bibliography'||state==='recompiling';
}

export function compilationStateLabel(state:CompilationState){
  if(state==='queued')return 'В очереди';
  if(state==='initializing')return 'Загрузка TeX';
  if(state==='compiling')return 'Компиляция';
  if(state==='resolving-references')return 'Разрешение ссылок';
  if(state==='running-bibliography')return 'Библиография';
  if(state==='recompiling')return 'Повторная компиляция';
  if(state==='success')return 'PDF готов';
  if(state==='warning')return 'Готово с предупреждениями';
  if(state==='error')return 'Ошибка';
  return 'Готов к компиляции';
}
