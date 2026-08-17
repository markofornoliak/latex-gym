import { exercises, lessons } from './courses';

const repeatedTheory='Хороший LaTeX-исходник кодирует структуру и смысл. Чем меньше ручной имитации верстки, тем устойчивее документ, легче ссылки и проще глобальные изменения.';
const genericHints=new Set([
  'Сначала сохраните структуру исходника, затем внесите минимальное изменение.'
]);

/**
 * Removes known mechanically repeated material after curriculum extensions have
 * been assembled. This layer is intentionally conservative: it only removes
 * exact phrases that were audited as low-value repetition and never generates
 * prose.
 */
export function applyContentQualityPass(){
  for(const lesson of lessons){
    lesson.theory=lesson.theory.filter(block=>block.body.trim()!==repeatedTheory);
    if(lesson.content)lesson.content=lesson.content.filter(block=>!('body' in block&&typeof block.body==='string'&&block.body.trim()===repeatedTheory));
  }
  for(const exercise of exercises)exercise.hints=exercise.hints.filter(hint=>!genericHints.has(hint.trim()));
}
