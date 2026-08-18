import type { ConceptDefinition, CourseModule, Exercise, LearningProject, Lesson, ReferenceEntry, ValidatorRule } from '../types';
import { concepts as defaultConcepts } from '../data/concepts';
import { projects as defaultProjects } from '../data/projects';
import { buildCurriculumGraph } from './curriculumGraph';

export type CurriculumIssue={
  severity:'error'|'warning';
  code:string;
  message:string;
  moduleId?:string;
  lessonId?:string;
  exerciseId?:string;
  projectId?:string;
  conceptId?:string;
  referenceId?:string;
};

type CurriculumLintContext={
  modules?:readonly CourseModule[];
  concepts?:readonly ConceptDefinition[];
  projects?:readonly LearningProject[];
};

const unique=(values:string[])=>new Set(values).size===values.length;
const normalizeGroupWhitespace=(source:string)=>source.replace(/[ \t]+}/g,'}');
const hasStructuralText=(source:string,value:string)=>source.includes(value)||normalizeGroupWhitespace(source).includes(normalizeGroupWhitespace(value));

export function lintCurriculum(lessons:readonly Lesson[],exercises:readonly Exercise[],references:readonly ReferenceEntry[],context:CurriculumLintContext={}):CurriculumIssue[]{
  const issues:CurriculumIssue[]=[];
  const concepts=context.concepts??defaultConcepts;
  const projects=context.projects??defaultProjects;
  const modules=context.modules??[];
  const conceptIdSet=new Set(concepts.map(concept=>concept.id));
  const lessonIds=lessons.map(lesson=>lesson.id);
  const exerciseIds=exercises.map(exercise=>exercise.id);
  const referenceIds=references.map(entry=>entry.id);
  const projectIds=projects.map(project=>project.id);

  if(modules.length&&!unique(modules.map(module=>module.id)))issues.push({severity:'error',code:'duplicate-module-id',message:'Module IDs must be unique.'});
  if(!unique(lessonIds))issues.push({severity:'error',code:'duplicate-lesson-id',message:'Lesson IDs must be unique.'});
  if(!unique(exerciseIds))issues.push({severity:'error',code:'duplicate-exercise-id',message:'Exercise IDs must be unique.'});
  if(!unique(referenceIds))issues.push({severity:'error',code:'duplicate-reference-id',message:'Reference IDs must be unique.'});
  if(!unique(projectIds))issues.push({severity:'error',code:'duplicate-project-id',message:'Project IDs must be unique.'});
  if(!unique(concepts.map(concept=>concept.id)))issues.push({severity:'error',code:'duplicate-concept-id',message:'Concept IDs must be unique.'});

  const lessonIdSet=new Set(lessonIds);
  const moduleIdSet=new Set(modules.map(module=>module.id));
  const referenceTokens=new Set(references.flatMap(entry=>[entry.id,entry.command.replace(/^\\/,''),...entry.aliases]));
  ['begin','end','$','\\[','\\]','item','appendix','input','include','caption','footnote','newenvironment','setcounter','setlength','pagestyle','fancyhead','alpha','beta','leq','sin','log','lim'].forEach(token=>referenceTokens.add(token));

  if(modules.length){
    for(const module of modules){
      if(!module.title.trim())issues.push({severity:'error',code:'empty-module-title',moduleId:module.id,message:'Module title is empty.'});
      if(module.lessons.length===0)issues.push({severity:'error',code:'empty-module',moduleId:module.id,message:'Module has no lessons.'});
      for(const lesson of module.lessons){
        if(lesson.moduleId!==module.id)issues.push({severity:'error',code:'lesson-module-mismatch',moduleId:module.id,lessonId:lesson.id,message:`Lesson ${lesson.id} declares module ${lesson.moduleId}, but is stored in ${module.id}.`});
      }
    }
  }

  const introduced=new Set<string>();
  for(const lesson of lessons){
    if(modules.length&&!moduleIdSet.has(lesson.moduleId))issues.push({severity:'error',code:'unknown-module',moduleId:lesson.moduleId,lessonId:lesson.id,message:`Lesson ${lesson.id} references unknown module ${lesson.moduleId}.`});
    if(!lesson.title.trim())issues.push({severity:'error',code:'empty-title',lessonId:lesson.id,message:'Lesson title is empty.'});
    if(lesson.exercises.length===0)issues.push({severity:'warning',code:'no-practice',lessonId:lesson.id,message:'Lesson has no practice.'});

    const nestedIds=lesson.exercises.map(exercise=>exercise.id);
    if(!unique(nestedIds))issues.push({severity:'error',code:'duplicate-lesson-exercise-id',lessonId:lesson.id,message:'Exercise IDs must be unique inside a lesson.'});
    for(const nested of lesson.exercises){
      if(nested.lessonId!==lesson.id)issues.push({severity:'error',code:'exercise-lesson-mismatch',lessonId:lesson.id,exerciseId:nested.id,message:`Exercise ${nested.id} declares lesson ${nested.lessonId}.`});
    }

    const pedagogy=lesson.pedagogy;
    if(pedagogy){
      if(!pedagogy.objective.trim())issues.push({severity:'error',code:'zero-objective',lessonId:lesson.id,message:'Lesson pedagogy has no objective.'});
      if(!pedagogy.practiceObjective.trim())issues.push({severity:'warning',code:'zero-practice-objective',lessonId:lesson.id,message:'Lesson pedagogy has no practice objective.'});
      for(const concept of [...pedagogy.prerequisites,...pedagogy.introduces,...pedagogy.reinforces]){
        if(!conceptIdSet.has(concept))issues.push({severity:'error',code:'unknown-concept',conceptId:concept,lessonId:lesson.id,message:`Unknown lesson concept: ${concept}`});
      }
      if(lesson.content){
        for(const prerequisite of pedagogy.prerequisites){
          if(!introduced.has(prerequisite))issues.push({severity:'error',code:'knowledge-gap',conceptId:prerequisite,lessonId:lesson.id,message:`Prerequisite ${prerequisite} has not been introduced before this lesson.`});
        }
      }
      pedagogy.introduces.forEach(concept=>introduced.add(concept));
    }else if(lesson.content){
      issues.push({severity:'warning',code:'missing-pedagogy',lessonId:lesson.id,message:'Structured lesson content has no explicit pedagogy metadata.'});
    }

    if(lesson.content){
      const blockIds=lesson.content.map(block=>block.id);
      if(!unique(blockIds))issues.push({severity:'error',code:'duplicate-block-id',lessonId:lesson.id,message:'Learning block IDs must be unique inside a lesson.'});
      for(const command of lesson.relatedCommands){
        if(command&&!referenceTokens.has(command.replace(/^\\/,'')))issues.push({severity:'warning',code:'reference-gap',lessonId:lesson.id,message:`No reference entry for ${command}.`});
      }
    }
  }

  for(const exercise of exercises){
    if(!lessonIdSet.has(exercise.lessonId))issues.push({severity:'error',code:'orphan-exercise',exerciseId:exercise.id,message:`Unknown lesson ${exercise.lessonId}.`});
    for(const concept of exercise.concepts){
      if(!conceptIdSet.has(concept))issues.push({severity:'error',code:'unknown-exercise-concept',conceptId:concept,lessonId:exercise.lessonId,exerciseId:exercise.id,message:`Unknown exercise concept: ${concept}`});
    }
    for(const prerequisite of exercise.prerequisites??[]){
      if(!conceptIdSet.has(prerequisite))issues.push({severity:'error',code:'unknown-exercise-prerequisite',conceptId:prerequisite,exerciseId:exercise.id,message:`Unknown exercise prerequisite: ${prerequisite}`});
    }
    if(!exercise.solution.trim())issues.push({severity:'error',code:'empty-solution',exerciseId:exercise.id,message:'Exercise solution is empty.'});
    if(exercise.validators.length===0)issues.push({severity:'error',code:'missing-validators',exerciseId:exercise.id,message:'Exercise has no validation rules.'});
    for(const rule of exercise.validators){
      if(!validValidatorShape(rule))issues.push({severity:'error',code:'malformed-validator',exerciseId:exercise.id,message:`Malformed validator: ${rule.type}`});
      if(rule.type==='compiles')continue;
      if(!ruleSatisfiedBySolution(rule,exercise.solution))issues.push({severity:'error',code:'solution-fails-rule',exerciseId:exercise.id,message:`Reference solution does not satisfy: ${rule.message}`});
    }
  }

  for(const project of projects){
    if(!project.title.trim())issues.push({severity:'error',code:'empty-project-title',projectId:project.id,message:'Project title is empty.'});
    if(project.stages.length===0)issues.push({severity:'error',code:'project-without-stages',projectId:project.id,message:'Project has no stages.'});
    const stageIds=project.stages.map(stage=>stage.id);
    if(!unique(stageIds))issues.push({severity:'error',code:'duplicate-project-stage',projectId:project.id,message:'Project stage IDs must be unique inside a project.'});
    for(const concept of project.concepts){
      if(!conceptIdSet.has(concept))issues.push({severity:'error',code:'unknown-project-concept',conceptId:concept,projectId:project.id,message:`Project ${project.id} references unknown concept ${concept}.`});
    }
    for(const stage of project.stages){
      if(!stage.objective.trim())issues.push({severity:'error',code:'empty-project-stage-objective',projectId:project.id,message:`Project stage ${stage.id} has no objective.`});
      if(stage.requirements.length===0)issues.push({severity:'warning',code:'project-stage-without-requirements',projectId:project.id,message:`Project stage ${stage.id} has no requirements.`});
    }
  }

  const {issues:graphIssues}=buildCurriculumGraph({concepts,lessons,exercises,references,projects});
  for(const issue of graphIssues)issues.push({severity:'error',code:issue.code,message:issue.message,conceptId:issue.conceptId});

  const connections=new Map(concepts.map(concept=>[concept.id,0]));
  for(const concept of concepts)for(const prerequisite of concept.prerequisites){connections.set(concept.id,(connections.get(concept.id)??0)+1);connections.set(prerequisite,(connections.get(prerequisite)??0)+1);}
  for(const lesson of lessons)for(const concept of [...(lesson.pedagogy?.introduces??[]),...(lesson.pedagogy?.reinforces??[])])connections.set(concept,(connections.get(concept)??0)+1);
  for(const exercise of exercises)for(const concept of exercise.concepts)connections.set(concept,(connections.get(concept)??0)+1);
  for(const project of projects)for(const concept of project.concepts)connections.set(concept,(connections.get(concept)??0)+1);
  for(const concept of concepts){
    if((connections.get(concept.id)??0)===0)issues.push({severity:'warning',code:'dead-concept',conceptId:concept.id,message:`Concept ${concept.id} is disconnected from curriculum evidence.`});
  }

  return dedupeIssues(issues);
}

function validValidatorShape(rule:ValidatorRule){
  if(!rule.message.trim()||!rule.hint.trim())return false;
  if('value' in rule&&typeof rule.value==='string'&&!rule.value.length)return false;
  if(rule.type==='command'&&rule.min!==undefined&&rule.min<1)return false;
  return true;
}

function ruleSatisfiedBySolution(rule:ValidatorRule,source:string):boolean{
  switch(rule.type){
    case 'documentClass':return new RegExp(`\\\\documentclass(?:\\[[^\\]]*\\])?\\{${escapeRegExp(rule.value)}\\}`).test(source);
    case 'documentClassOption':return new RegExp(`\\\\documentclass\\[[^\\]]*${escapeRegExp(rule.value)}[^\\]]*\\]`).test(source);
    case 'environment':return new RegExp(`\\\\begin\\{${escapeRegExp(rule.value)}\\}[\\s\\S]*\\\\end\\{${escapeRegExp(rule.value)}\\}`).test(source);
    case 'command':return (source.match(new RegExp(`\\\\${escapeRegExp(rule.value)}(?=[^A-Za-z@]|$)`,'g'))??[]).length>=(rule.min??1);
    case 'package':return new RegExp(`\\\\usepackage(?:\\[[^\\]]*\\])?\\{[^}]*${escapeRegExp(rule.value)}[^}]*\\}`).test(source.split(/\\begin\{document\}/)[0]??source);
    case 'containsText':return hasStructuralText(source,rule.value);
    case 'forbiddenText':return !source.includes(rule.value);
    case 'regex':try{return new RegExp(rule.value,rule.flags).test(source);}catch{return false;}
    case 'paragraph':return /[\p{L}\p{N}]{2,}/u.test(source.replace(/\\[a-zA-Z]+/g,' '));
    case 'inlineMath':return /\$[^$\n]+\$/.test(source);
    case 'displayMath':return /\\\[[\s\S]*?\\\]|\\begin\{(?:equation|align)\}/.test(source);
    case 'balancedEnvironments':return balanced(source);
    case 'compiles':return true;
  }
}
function escapeRegExp(value:string){return value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
function balanced(source:string){const stack:string[]=[];for(const token of source.matchAll(/\\(begin|end)\{([^}]+)\}/g)){if(token[1]==='begin')stack.push(token[2]);else if(stack.pop()!==token[2])return false;}return stack.length===0;}
function dedupeIssues(issues:CurriculumIssue[]){const seen=new Set<string>();return issues.filter(issue=>{const key=[issue.severity,issue.code,issue.moduleId,issue.lessonId,issue.exerciseId,issue.projectId,issue.conceptId,issue.referenceId,issue.message].join('|');if(seen.has(key))return false;seen.add(key);return true;});}
