import './editorialEnhancements';
import './curriculumExpansion';
import './deepCurriculum';
import './debuggingTrack';
import './curriculumNormalize';
import { exercises, lessonIndex, lessons, modules } from './courses';
import { applyContentQualityPass } from './contentQuality';

applyContentQualityPass();

for(const module of modules)deepFreeze(module);
for(const lesson of lessons)deepFreeze(lesson);
for(const exercise of exercises)deepFreeze(exercise);
Object.freeze(modules);
Object.freeze(lessons);
Object.freeze(exercises);

/** Final deterministic curriculum snapshot consumed by the application. */
export const curriculum=Object.freeze({modules,lessons,exercises,lessonIndex});

function deepFreeze<T>(value:T):T{
  if(!value||typeof value!=='object'||Object.isFrozen(value))return value;
  Object.freeze(value);
  for(const child of Object.values(value as Record<string,unknown>))deepFreeze(child);
  return value;
}
