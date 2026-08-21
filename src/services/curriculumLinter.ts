import type { ConceptDefinition, CourseModule, Exercise, LearningProject, Lesson, ReferenceEntry, ValidatorRule } from '../types';
import { concepts as defaultConcepts } from '../data/concepts';
import { projects as defaultProjects } from '../data/projects';
import { buildCurriculumGraph } from './curriculumGraph';
import { validateDependencyStructure } from './dependencyValidation';
import { validateExercise } from './validator';

export type CurriculumIssue={
  severity:'error'|'warning';code:string;message:string;moduleId?:string;lessonId?:string;exerciseId?:string;projectId?:string;conceptId?:string;referenceId?:string;
};
type CurriculumLintContext={modules?:readonly CourseModule[];concepts?:readonly ConceptDefinition[];projects?:readonly LearningProject[]};
const unique=(values:string[])=>new Set(values).size===values.length;
const positiveInteger=(value:number)=>Number.isInteger(value)&&value>0;

export function lintCurriculum(lessons:readonly Lesson[],exercises:readonly Exercise[],references:readonly ReferenceEntry[],context:CurriculumLintContext={}):CurriculumIssue[]{
  const issues:CurriculumIssue[]=[];
  const concepts=context.concepts??defaultConcepts;
  const projects=context.projects??defaultProjects;
  const modules=context.modules??[];
  const conceptIdSet=new Set(concepts.map(concept=>concept.id));
  const conceptsById=new Map(concepts.map(concept=>[concept.id,concept]));
  const lessonIds=lessons.map(lesson=>lesson.id);
  const exerciseIds=exercises.map(exercise=>exercise.id);
  const referenceIds=references.map(entry=>entry.id);
  const referenceIdSet=new Set(referenceIds);
  const projectIds=projects.map(project=>project.id);
  const projectsById=new Map(projects.map(project=>[project.id,project]));
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
    const moduleNumbers=new Map<number,string>();
    let previousModuleNumber=-Infinity;
    for(const module of modules){
      if(!positiveInteger(module.number))issues.push({severity:'error',code:'invalid-module-number',moduleId:module.id,message:`Module number must be a positive integer, received ${module.number}.`});
      const priorModule=moduleNumbers.get(module.number);
      if(priorModule)issues.push({severity:'error',code:'duplicate-module-number',moduleId:module.id,message:`Module number ${module.number} is already used by ${priorModule}.`});
      else moduleNumbers.set(module.number,module.id);
      if(module.number<previousModuleNumber)issues.push({severity:'warning',code:'module-number-order',moduleId:module.id,message:`Module ${module.id} appears after a module with a larger number.`});
      previousModuleNumber=module.number;

      if(!module.title.trim())issues.push({severity:'error',code:'empty-module-title',moduleId:module.id,message:'Module title is empty.'});
      if(module.lessons.length===0)issues.push({severity:'error',code:'empty-module',moduleId:module.id,message:'Module has no lessons.'});
      const lessonNumbers=new Map<number,string>();
      let previousLessonNumber=-Infinity;
      for(const lesson of module.lessons){
        if(lesson.moduleId!==module.id)issues.push({severity:'error',code:'lesson-module-mismatch',moduleId:module.id,lessonId:lesson.id,message:`Lesson ${lesson.id} declares module ${lesson.moduleId}, but is stored in ${module.id}.`});
        if(!positiveInteger(lesson.number))issues.push({severity:'error',code:'invalid-lesson-number',moduleId:module.id,lessonId:lesson.id,message:`Lesson number must be a positive integer, received ${lesson.number}.`});
        const priorLesson=lessonNumbers.get(lesson.number);
        if(priorLesson)issues.push({severity:'error',code:'duplicate-module-number',moduleId:module.id,lessonId:lesson.id,message:`Lesson number ${lesson.number} is already used by ${priorLesson} in module ${module.id}.`});
        else lessonNumbers.set(lesson.number,lesson.id);
        if(lesson.number<previousLessonNumber)issues.push({severity:'warning',code:'lesson-number-order',moduleId:module.id,lessonId:lesson.id,message:`Lesson ${lesson.id} appears after a lesson with a larger number in module ${module.id}.`});
        previousLessonNumber=lesson.number;
      }
    }
  }

  const introduced=new Set<string>();
  for(let lessonIndex=0;lessonIndex<lessons.length;lessonIndex+=1){
    const lesson=lessons[lessonIndex];
    if(modules.length&&!moduleIdSet.has(lesson.moduleId))issues.push({severity:'error',code:'unknown-module',moduleId:lesson.moduleId,lessonId:lesson.id,message:`Lesson ${lesson.id} references unknown module ${lesson.moduleId}.`});
    if(!lesson.title.trim())issues.push({severity:'error',code:'empty-title',lessonId:lesson.id,message:'Lesson title is empty.'});
    if(lesson.exercises.length===0)issues.push({severity:'warning',code:'no-practice',lessonId:lesson.id,message:'Lesson has no practice.'});

    if(lesson.projectStage)validateProjectStageReference(lesson,projectsById,issues);

    const nestedIds=lesson.exercises.map(exercise=>exercise.id);
    if(!unique(nestedIds))issues.push({severity:'error',code:'duplicate-lesson-exercise-id',lessonId:lesson.id,message:'Exercise IDs must be unique inside a lesson.'});
    for(const nested of lesson.exercises)if(nested.lessonId!==lesson.id)issues.push({severity:'error',code:'exercise-lesson-mismatch',lessonId:lesson.id,exerciseId:nested.id,message:`Exercise ${nested.id} declares lesson ${nested.lessonId}.`});

    const pedagogy=lesson.pedagogy;
    if(pedagogy){
      if(!pedagogy.objective.trim())issues.push({severity:'error',code:'zero-objective',lessonId:lesson.id,message:'Lesson pedagogy has no objective.'});
      if(!pedagogy.practiceObjective.trim())issues.push({severity:'warning',code:'zero-practice-objective',lessonId:lesson.id,message:'Lesson pedagogy has no practice objective.'});
      for(const concept of [...pedagogy.prerequisites,...pedagogy.introduces,...pedagogy.reinforces])if(!conceptIdSet.has(concept))issues.push({severity:'error',code:'unknown-concept',conceptId:concept,lessonId:lesson.id,message:`Unknown lesson concept: ${concept}`});

      const introduces=new Set(pedagogy.introduces);
      for(const prerequisite of pedagogy.prerequisites){
        if(introduces.has(prerequisite))issues.push({severity:'error',code:'prerequisite-introduced-same-lesson',conceptId:prerequisite,lessonId:lesson.id,message:`Lesson ${lesson.id} both requires and introduces ${prerequisite}.`});
        if(conceptIdSet.has(prerequisite)&&!introduced.has(prerequisite))issues.push({severity:'error',code:'knowledge-gap',conceptId:prerequisite,lessonId:lesson.id,message:`Prerequisite ${prerequisite} has not been introduced before this lesson.`});
      }
      for(const concept of pedagogy.reinforces){
        if(introduces.has(concept)){
          issues.push({severity:'warning',code:'introduces-and-reinforces',conceptId:concept,lessonId:lesson.id,message:`Lesson ${lesson.id} both introduces and reinforces ${concept}.`});
        }else if(conceptIdSet.has(concept)&&!introduced.has(concept)){
          issues.push({severity:'warning',code:'reinforces-before-introduction',conceptId:concept,lessonId:lesson.id,message:`Lesson ${lesson.id} reinforces ${concept} before its formal introduction.`});
        }
      }
      for(const conceptId of pedagogy.introduces){
        const definition=conceptsById.get(conceptId);
        if(!definition)continue;
        for(const prerequisite of definition.prerequisites){
          if(!conceptIdSet.has(prerequisite)||introduced.has(prerequisite)||introduces.has(prerequisite))continue;
          issues.push({severity:'warning',code:'concept-dependency-gap',conceptId:conceptId,lessonId:lesson.id,message:`Lesson ${lesson.id} introduces ${conceptId} before concept dependency ${prerequisite} has been formally introduced.`});
        }
      }
      pedagogy.introduces.forEach(concept=>introduced.add(concept));
    }else if(lesson.content)issues.push({severity:'warning',code:'missing-pedagogy',lessonId:lesson.id,message:'Structured lesson content has no explicit pedagogy metadata.'});

    if(lesson.content){
      const blockIds=lesson.content.map(block=>block.id);
      if(!unique(blockIds))issues.push({severity:'error',code:'duplicate-block-id',lessonId:lesson.id,message:'Learning block IDs must be unique inside a lesson.'});
      for(const command of lesson.relatedCommands)if(command&&!referenceTokens.has(command.replace(/^\\/,'')))issues.push({severity:'warning',code:'reference-gap',lessonId:lesson.id,message:`No reference entry for ${command}.`});
    }
  }

  for(const exercise of exercises){
    if(!lessonIdSet.has(exercise.lessonId))issues.push({severity:'error',code:'orphan-exercise',exerciseId:exercise.id,message:`Unknown lesson ${exercise.lessonId}.`});
    for(const concept of exercise.concepts)if(!conceptIdSet.has(concept))issues.push({severity:'error',code:'unknown-exercise-concept',conceptId:concept,lessonId:exercise.lessonId,exerciseId:exercise.id,message:`Unknown exercise concept: ${concept}`});
    for(const prerequisite of exercise.prerequisites??[])if(!conceptIdSet.has(prerequisite))issues.push({severity:'error',code:'unknown-exercise-prerequisite',conceptId:prerequisite,exerciseId:exercise.id,message:`Unknown exercise prerequisite: ${prerequisite}`});
    if(!exercise.solution.trim())issues.push({severity:'error',code:'empty-solution',exerciseId:exercise.id,message:'Exercise solution is empty.'});
    if(exercise.validators.length===0)issues.push({severity:'error',code:'missing-validators',exerciseId:exercise.id,message:'Exercise has no validation rules.'});
    const solutionValidation=validateExercise(exercise,exercise.solution);
    for(const [ruleIndex,rule] of exercise.validators.entries()){
      const shapeProblem=validatorShapeProblem(rule);
      if(shapeProblem){
        issues.push({severity:'error',code:'malformed-validator',exerciseId:exercise.id,message:`Malformed validator: ${shapeProblem}`});
        continue;
      }
      if(rule.type==='regex'){
        try{new RegExp(rule.value,rule.flags);}catch(error){
          issues.push({severity:'error',code:'invalid-validator-regex',exerciseId:exercise.id,message:`Invalid regex validator: ${error instanceof Error?error.message:String(error)}`});
          continue;
        }
      }
      if(rule.type==='compiles')continue;
      if(!solutionValidation.items[ruleIndex]?.ok)issues.push({severity:'error',code:'solution-fails-rule',exerciseId:exercise.id,message:`Reference solution does not satisfy: ${rule.message}`});
    }
  }

  for(const project of projects){
    if(!project.title.trim())issues.push({severity:'error',code:'empty-project-title',projectId:project.id,message:'Project title is empty.'});
    if(project.stages.length===0)issues.push({severity:'error',code:'project-without-stages',projectId:project.id,message:'Project has no stages.'});
    const stageIds=project.stages.map(stage=>stage.id);
    if(!unique(stageIds))issues.push({severity:'error',code:'duplicate-project-stage',projectId:project.id,message:'Project stage IDs must be unique inside a project.'});
    for(const prerequisite of project.prerequisites)if(!conceptIdSet.has(prerequisite))issues.push({severity:'error',code:'unknown-project-prerequisite',conceptId:prerequisite,projectId:project.id,message:`Project ${project.id} requires unknown concept ${prerequisite}.`});
    for(const concept of project.concepts)if(!conceptIdSet.has(concept))issues.push({severity:'error',code:'unknown-project-concept',conceptId:concept,projectId:project.id,message:`Project ${project.id} references unknown concept ${concept}.`});
    for(const stage of project.stages){
      if(!stage.objective.trim())issues.push({severity:'error',code:'empty-project-stage-objective',projectId:project.id,message:`Project stage ${stage.id} has no objective.`});
      if(stage.requirements.length===0)issues.push({severity:'warning',code:'project-stage-without-requirements',projectId:project.id,message:`Project stage ${stage.id} has no requirements.`});
    }
  }

  for(const entry of references){
    for(const relatedId of entry.related)if(!referenceIdSet.has(relatedId))issues.push({severity:'error',code:'unknown-related-reference',referenceId:entry.id,message:`Reference ${entry.id} points to unknown related reference ${relatedId}.`});
  }
  addReferenceTokenCollisions(references,issues);
  issues.push(...validateDependencyStructure({concepts,lessons,exercises,projects}));

  const {graph,issues:graphIssues}=buildCurriculumGraph({concepts,lessons,exercises,references,projects});
  for(const issue of graphIssues)issues.push({severity:'error',code:issue.code,message:issue.message,conceptId:issue.conceptId});
  for(const concept of concepts){
    const node=graph.nodes[concept.id];
    if(node&&node.introducedBy.length===0&&node.reinforcedBy.length===0&&node.practicedBy.length===0&&node.referenceIds.length===0&&node.projectIds.length===0){
      issues.push({severity:'warning',code:'unobserved-concept',conceptId:concept.id,message:`Concept ${concept.id} has no teaching, practice, reference or project evidence.`});
    }
  }

  return dedupeIssues(issues);
}

function validateProjectStageReference(lesson:Lesson,projectsById:Map<string,LearningProject>,issues:CurriculumIssue[]){
  const value=lesson.projectStage!;
  const parts=value.split(':');
  if(parts.length!==2||!parts[0]||!parts[1]){
    issues.push({severity:'error',code:'malformed-project-stage-reference',lessonId:lesson.id,message:`Lesson ${lesson.id} has malformed projectStage ${value}; expected projectId:stageId.`});
    return;
  }
  const [projectId,stageId]=parts;
  const project=projectsById.get(projectId);
  if(!project){
    issues.push({severity:'error',code:'unknown-project-stage-reference',lessonId:lesson.id,projectId,message:`Lesson ${lesson.id} points to unknown project ${projectId}.`});
    return;
  }
  if(!project.stages.some(stage=>stage.id===stageId))issues.push({severity:'error',code:'unknown-project-stage-reference',lessonId:lesson.id,projectId,message:`Lesson ${lesson.id} points to unknown stage ${stageId} in project ${projectId}.`});
}

function addReferenceTokenCollisions(references:readonly ReferenceEntry[],issues:CurriculumIssue[]){
  const owners=new Map<string,Set<string>>();
  for(const entry of references){
    const tokens=[entry.command,entry.title,...entry.aliases];
    for(const token of tokens){
      const normalized=normalizeReferenceToken(token);
      if(!normalized)continue;
      const tokenOwners=owners.get(normalized)??new Set<string>();
      tokenOwners.add(entry.id);owners.set(normalized,tokenOwners);
    }
  }
  for(const [token,tokenOwners] of owners){
    if(tokenOwners.size<2)continue;
    const ids=[...tokenOwners].sort();
    issues.push({severity:'warning',code:'reference-token-collision',referenceId:ids[0],message:`Reference search token ${JSON.stringify(token)} is shared by ${ids.join(', ')}.`});
  }
}
function normalizeReferenceToken(value:string){return value.trim().toLocaleLowerCase('en').replace(/^\\/,'');}

function validatorShapeProblem(rule:ValidatorRule):string|undefined{
  const candidate=rule as unknown as Record<string,unknown>;
  const type=candidate.type;
  const supported=new Set(['documentClass','documentClassOption','environment','command','package','containsText','forbiddenText','regex','paragraph','inlineMath','displayMath','balancedEnvironments','compiles']);
  if(typeof type!=='string'||!supported.has(type))return `unsupported type ${String(type)}`;
  if(typeof candidate.message!=='string'||!candidate.message.trim())return `${type} message must be non-empty`;
  if(typeof candidate.hint!=='string'||!candidate.hint.trim())return `${type} hint must be non-empty`;
  if(['documentClass','documentClassOption','environment','command','package','containsText','forbiddenText','regex'].includes(type)&&(typeof candidate.value!=='string'||candidate.value.length===0))return `${type} value must be a non-empty string`;
  if(type==='command'&&candidate.min!==undefined&&(typeof candidate.min!=='number'||!Number.isInteger(candidate.min)||candidate.min<1))return 'command min must be a positive integer';
  if(type==='regex'&&candidate.flags!==undefined&&typeof candidate.flags!=='string')return 'regex flags must be a string';
  if(type==='compiles'&&candidate.authority!==undefined&&!['educational','real-tex'].includes(String(candidate.authority)))return `unsupported compiler authority ${String(candidate.authority)}`;
  return undefined;
}
function dedupeIssues(issues:CurriculumIssue[]){const seen=new Set<string>();return issues.filter(issue=>{const key=[issue.severity,issue.code,issue.moduleId,issue.lessonId,issue.exerciseId,issue.projectId,issue.conceptId,issue.referenceId,issue.message].join('|');if(seen.has(key))return false;seen.add(key);return true;});}