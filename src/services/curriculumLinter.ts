import type { Exercise,LearningProject,Lesson,ReferenceEntry,ValidatorRule } from '../types';
import { conceptById } from '../data/concepts';
import { matchesStructuralQuery } from './validator';
import { parseLatexStructure } from './latexStructure';

export type CurriculumIssue={severity:'error'|'warning';code:string;message:string;lessonId?:string;exerciseId?:string};
const unique=(values:string[])=>new Set(values).size===values.length;
const normalizeGroupWhitespace=(source:string)=>source.replace(/[ \t]+}/g,'}');
const hasStructuralText=(source:string,value:string)=>source.includes(value)||normalizeGroupWhitespace(source).includes(normalizeGroupWhitespace(value));
const mechanicalPhrases=['Практически здесь важно','В общей логике урока этот шаг нужен','Критерий понимания после этого шага','Связывайте этот принцип с общей задачей урока','Практически этот принцип помогает применять тему'];

export function lintCurriculum(lessons:Lesson[],exercises:Exercise[],references:ReferenceEntry[],projects:LearningProject[]=[]):CurriculumIssue[]{
  const issues:CurriculumIssue[]=[];const lessonIds=lessons.map(lesson=>lesson.id);const exerciseIds=exercises.map(exercise=>exercise.id);
  if(!unique(lessonIds))issues.push({severity:'error',code:'duplicate-lesson-id',message:'Lesson IDs must be unique.'});
  if(!unique(exerciseIds))issues.push({severity:'error',code:'duplicate-exercise-id',message:'Exercise IDs must be unique.'});
  const lessonIdSet=new Set(lessonIds);const referenceTokens=new Set(references.flatMap(entry=>[entry.id,entry.command.replace(/^\\/,''),...entry.aliases]));
  ['begin','end','$','\\[','\\]','item','appendix','input','include','caption','footnote','newenvironment','setcounter','setlength','pagestyle','fancyhead','alpha','beta','leq','sin','log','lim'].forEach(token=>referenceTokens.add(token));
  const introduced=new Set<string>();const practiced=new Set<string>();
  for(const lesson of lessons){
    if(!lesson.title.trim())issues.push({severity:'error',code:'empty-title',lessonId:lesson.id,message:'Lesson title is empty.'});
    if(lesson.exercises.length===0)issues.push({severity:'warning',code:'no-practice',lessonId:lesson.id,message:'Lesson has no practice.'});
    for(const text of visibleLessonText(lesson)){const phrase=mechanicalPhrases.find(candidate=>text.includes(candidate));if(phrase)issues.push({severity:'error',code:'mechanical-explanation',lessonId:lesson.id,message:`Mechanical explanation phrase detected: ${phrase}`});}
    const pedagogy=lesson.pedagogy;
    if(pedagogy){
      for(const concept of [...pedagogy.prerequisites,...pedagogy.introduces,...pedagogy.reinforces])if(!conceptById.has(concept))issues.push({severity:'error',code:'unknown-concept',lessonId:lesson.id,message:`Unknown concept: ${concept}`});
      if(lesson.content)for(const prerequisite of pedagogy.prerequisites)if(!introduced.has(prerequisite))issues.push({severity:'error',code:'knowledge-gap',lessonId:lesson.id,message:`Prerequisite ${prerequisite} has not been introduced before this lesson.`});
      pedagogy.introduces.forEach(concept=>introduced.add(concept));
    }
    if(lesson.content){const blockIds=lesson.content.map(block=>block.id);if(!unique(blockIds))issues.push({severity:'error',code:'duplicate-block-id',lessonId:lesson.id,message:'Learning block IDs must be unique inside a lesson.'});for(const command of lesson.relatedCommands)if(command&&!referenceTokens.has(command.replace(/^\\/,'')))issues.push({severity:'warning',code:'reference-gap',lessonId:lesson.id,message:`No reference entry for ${command}.`});}
  }
  for(const exercise of exercises){
    if(!lessonIdSet.has(exercise.lessonId))issues.push({severity:'error',code:'orphan-exercise',exerciseId:exercise.id,message:`Unknown lesson ${exercise.lessonId}.`});
    const lesson=lessons.find(item=>item.id===exercise.lessonId);
    for(const concept of exercise.concepts){practiced.add(concept);if(!conceptById.has(concept))issues.push({severity:'error',code:'unknown-exercise-concept',lessonId:lesson?.id,exerciseId:exercise.id,message:`Unknown exercise concept: ${concept}`});if(lesson?.content&&!introduced.has(concept)&&!lesson.pedagogy?.introduces.includes(concept))issues.push({severity:'warning',code:'exercised-before-taught',lessonId:lesson.id,exerciseId:exercise.id,message:`Exercise uses concept ${concept} before the curriculum has explicitly introduced it.`});}
    if(!exercise.solution.trim())issues.push({severity:'error',code:'empty-solution',exerciseId:exercise.id,message:'Exercise solution is empty.'});
    if(exercise.validators.length===0)issues.push({severity:'error',code:'no-validators',exerciseId:exercise.id,message:'Exercise has no acceptance criteria.'});
    for(const rule of exercise.validators){if(rule.type==='compiles')continue;if(!ruleSatisfiedBySolution(rule,exercise.solution))issues.push({severity:'error',code:'solution-fails-rule',exerciseId:exercise.id,message:`Reference solution does not satisfy: ${rule.message}`});}
    if(exercise.compilerRequirement==='real-tex'&&!exercise.validators.some(rule=>rule.type==='compiles'))issues.push({severity:'error',code:'real-tex-without-compile-criterion',exerciseId:exercise.id,message:'Exercise requires real TeX but has no compilation acceptance criterion.'});
  }
  for(const concept of introduced)if(!practiced.has(concept))issues.push({severity:'warning',code:'introduced-never-practiced',message:`Concept ${concept} is introduced but never practiced.`});
  for(const concept of practiced)if(!introduced.has(concept))issues.push({severity:'warning',code:'practiced-never-introduced',message:`Concept ${concept} is practiced but never explicitly introduced in lesson pedagogy.`});
  for(const cycle of conceptCycles())issues.push({severity:'error',code:'circular-concept-dependency',message:`Circular concept dependency: ${cycle.join(' → ')}`});
  for(const concept of conceptById.keys())if(!introduced.has(concept)&&!practiced.has(concept))issues.push({severity:'warning',code:'unused-concept',message:`Concept ${concept} is neither introduced nor practiced.`});
  issues.push(...nearDuplicateExercises(exercises));

  const projectStageIds:string[]=[];
  for(const project of projects){if(project.stages.length===0)issues.push({severity:'error',code:'project-without-stages',message:`Project ${project.id} has no stages.`});for(const stage of project.stages){const scopedId=`${project.id}:${stage.id}`;projectStageIds.push(scopedId);if(stage.requirements.length===0)issues.push({severity:'error',code:'project-stage-without-criteria',message:`Project stage ${scopedId} has no acceptance criteria.`});if(!stage.objective.trim())issues.push({severity:'error',code:'project-stage-without-objective',message:`Project stage ${scopedId} has no objective.`});if(!stage.starterCode.trim())issues.push({severity:'warning',code:'project-stage-empty-starter',message:`Project stage ${scopedId} has an empty starter.`});if(stage.compilerRequirement==='real-tex'&&!/\\documentclass\b/.test(stage.starterCode))issues.push({severity:'warning',code:'real-tex-stage-fragment',message:`Project stage ${scopedId} requests real TeX but its starter is not a complete root document.`});}}
  if(!unique(projectStageIds))issues.push({severity:'error',code:'duplicate-project-stage-id',message:'Project stage IDs must be unique inside their project scope.'});
  return issues;
}

function visibleLessonText(lesson:Lesson){const theory=lesson.theory.flatMap(block=>[block.body,block.note??'']);const content=(lesson.content??[]).flatMap(block=>{if(block.type==='checkpoint')return [block.prompt,block.answer];if(block.type==='anatomy')return [block.body??'',...block.parts.map(part=>part.description)];if(block.type==='flow')return [block.body??'',...block.steps.map(step=>step.detail)];if(block.type==='comparison')return [block.body??'',block.left.note,block.right.note];return 'body' in block?[block.body]:[];});return [...theory,...content];}
function ruleSatisfiedBySolution(rule:ValidatorRule,source:string):boolean{
  switch(rule.type){
    case 'documentClass':return parseLatexStructure(source).documentClass?.name===rule.value;
    case 'documentClassOption':return parseLatexStructure(source).documentClass?.options.includes(rule.value)??false;
    case 'environment':return parseLatexStructure(source).environments(rule.value).length>0;
    case 'command':return parseLatexStructure(source).commands(rule.value).length>=(rule.min??1);
    case 'package':return parseLatexStructure(source).packages.has(rule.value);
    case 'containsText':return hasStructuralText(source,rule.value);
    case 'forbiddenText':return !source.includes(rule.value);
    case 'regex':try{return new RegExp(rule.value,rule.flags).test(source);}catch{return false;}
    case 'paragraph':return parseLatexStructure(source).byKind('Paragraph').length>0;
    case 'inlineMath':return parseLatexStructure(source).byKind('Math').some(node=>node.mathMode==='inline');
    case 'displayMath':return parseLatexStructure(source).byKind('Math').some(node=>node.mathMode==='display');
    case 'balancedEnvironments':return !parseLatexStructure(source).problems.some(problem=>problem.kind==='environment-mismatch'||problem.kind==='unclosed-environment');
    case 'compiles':return true;
    case 'structure':return matchesStructuralQuery(parseLatexStructure(source),rule.query);
  }
}
function conceptCycles(){const cycles:string[][]=[];const visiting=new Set<string>();const visited=new Set<string>();const path:string[]=[];const seen=new Set<string>();const visit=(id:string)=>{if(visiting.has(id)){const start=path.indexOf(id);const cycle=[...path.slice(start),id];const key=[...new Set(cycle)].sort().join('|');if(!seen.has(key)){seen.add(key);cycles.push(cycle);}return;}if(visited.has(id))return;visiting.add(id);path.push(id);for(const prerequisite of conceptById.get(id)?.prerequisites??[])if(conceptById.has(prerequisite))visit(prerequisite);path.pop();visiting.delete(id);visited.add(id);};for(const id of conceptById.keys())visit(id);return cycles;}
function nearDuplicateExercises(exercises:Exercise[]):CurriculumIssue[]{const issues:CurriculumIssue[]=[];const fingerprints=new Map<string,Exercise>();for(const exercise of exercises){const fingerprint=`${exercise.lessonId}|${normalizeText(exercise.instructions)}|${normalizeText(exercise.requirements.join(' '))}`;const previous=fingerprints.get(fingerprint);if(previous&&previous.id!==exercise.id)issues.push({severity:'warning',code:'near-duplicate-exercise',exerciseId:exercise.id,message:`Exercise is effectively duplicated by ${previous.id}.`});else fingerprints.set(fingerprint,exercise);}return issues;}
function normalizeText(value:string){return value.toLocaleLowerCase('ru-RU').replace(/\\[a-z]+/gi,'cmd').replace(/[^\p{L}\p{N}]+/gu,' ').trim();}
