import type { ConceptDefinition, Exercise, Lesson } from '../types';

type SemanticCurriculum={
  concepts:ConceptDefinition[];
  lessons:Lesson[];
  exercises:Exercise[];
};

/**
 * Small, explicit semantic corrections applied to the authored curriculum before
 * graph construction. The JSON remains the content source; this table exists only
 * for relationships whose educational meaning is stricter than historical course
 * ordering. Keep this list deliberately small and evidence-based.
 */
export const conceptPrerequisiteOverrides:Readonly<Record<string,readonly string[]>>=Object.freeze({
  'optional-argument':['command'],
  usepackage:['package-model'],
  'compile-error':['compiler'],
  root:['math-mode','required-argument'],
  equation:['display-math'],
  float:['document-body'],
  label:['document-body'],
  'bibliography-model':['document-body'],
  debugging:['compiler']
});

/** Exercises where all tagged concepts participate, but only a narrower subset is
 * actually demonstrated by success/failure and should receive mastery evidence. */
export const exerciseEvidenceOverrides:Readonly<Record<string,readonly string[]>>=Object.freeze({
  'deep-013':['required-argument'],
  'deep-014':['optional-argument'],
  'deep-015':['required-argument']
});

export function applyCurriculumSemantics<T extends SemanticCurriculum>(source:T):T{
  const conceptById=new Map(source.concepts.map(concept=>[concept.id,concept]));
  for(const [conceptId,prerequisites] of Object.entries(conceptPrerequisiteOverrides)){
    const concept=conceptById.get(conceptId);
    if(!concept)throw new Error(`Curriculum semantic override references unknown concept ${conceptId}.`);
    concept.prerequisites=[...prerequisites];
  }

  const lessonById=new Map(source.lessons.map(lesson=>[lesson.id,lesson]));
  const compilation=lessonById.get('compilation-model');
  if(!compilation?.pedagogy)throw new Error('Curriculum semantic override requires lesson compilation-model with pedagogy.');
  compilation.pedagogy.introduces=unique([...compilation.pedagogy.introduces,'debugging']);
  compilation.pedagogy.reinforces=compilation.pedagogy.reinforces.filter(id=>id!=='debugging');

  const advancedDebugging=lessonById.get('debugging');
  if(!advancedDebugging?.pedagogy)throw new Error('Curriculum semantic override requires lesson debugging with pedagogy.');
  advancedDebugging.pedagogy.introduces=advancedDebugging.pedagogy.introduces.filter(id=>id!=='debugging');
  advancedDebugging.pedagogy.reinforces=unique([...advancedDebugging.pedagogy.reinforces,'debugging']);

  const exerciseById=new Map(source.exercises.map(exercise=>[exercise.id,exercise]));
  for(const [exerciseId,evidenceConcepts] of Object.entries(exerciseEvidenceOverrides)){
    const exercise=exerciseById.get(exerciseId);
    if(!exercise)throw new Error(`Curriculum evidence override references unknown exercise ${exerciseId}.`);
    exercise.evidenceConcepts=[...evidenceConcepts];
  }
  return source;
}

function unique(values:string[]){return [...new Set(values)];}
