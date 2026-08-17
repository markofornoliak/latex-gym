import type { Exercise, Lesson, ReferenceEntry, ValidatorRule } from '../types';
import { conceptById } from '../data/concepts';

export type CurriculumIssue={severity:'error'|'warning';code:string;message:string;lessonId?:string;exerciseId?:string};

const unique=(values:string[])=>new Set(values).size===values.length;
const normalizeGroupWhitespace=(source:string)=>source.replace(/[ \t]+}/g,'}');
const hasStructuralText=(source:string,value:string)=>source.includes(value)||normalizeGroupWhitespace(source).includes(normalizeGroupWhitespace(value));

export function lintCurriculum(lessons:Lesson[],exercises:Exercise[],references:ReferenceEntry[]):CurriculumIssue[]{
  const issues:CurriculumIssue[]=[];
  const lessonIds=lessons.map(lesson=>lesson.id);
  const exerciseIds=exercises.map(exercise=>exercise.id);
  if(!unique(lessonIds))issues.push({severity:'error',code:'duplicate-lesson-id',message:'Lesson IDs must be unique.'});
  if(!unique(exerciseIds))issues.push({severity:'error',code:'duplicate-exercise-id',message:'Exercise IDs must be unique.'});

  const lessonIdSet=new Set(lessonIds);
  const referenceTokens=new Set(references.flatMap(entry=>[entry.id,entry.command.replace(/^\\/,''),...entry.aliases]));
  ['begin','end','$','\\[','\\]','item','appendix','input','include','caption','footnote','newenvironment','setcounter','setlength','pagestyle','fancyhead','alpha','beta','leq','sin','log','lim'].forEach(token=>referenceTokens.add(token));

  const introduced=new Set<string>();
  for(const lesson of lessons){
    if(!lesson.title.trim())issues.push({severity:'error',code:'empty-title',lessonId:lesson.id,message:'Lesson title is empty.'});
    if(lesson.exercises.length===0)issues.push({severity:'warning',code:'no-practice',lessonId:lesson.id,message:'Lesson has no practice.'});

    const pedagogy=lesson.pedagogy;
    if(pedagogy){
      for(const concept of [...pedagogy.prerequisites,...pedagogy.introduces]){
        if(!conceptById.has(concept))issues.push({severity:'error',code:'unknown-concept',lessonId:lesson.id,message:`Unknown concept: ${concept}`});
      }
      if(lesson.content){
        for(const prerequisite of pedagogy.prerequisites){
          if(!introduced.has(prerequisite))issues.push({severity:'error',code:'knowledge-gap',lessonId:lesson.id,message:`Prerequisite ${prerequisite} has not been introduced before this lesson.`});
        }
      }
      pedagogy.introduces.forEach(concept=>introduced.add(concept));
    }

    if(lesson.content){
      const blockIds=lesson.content.map(block=>block.id);
      if(!unique(blockIds))issues.push({severity:'error',code:'duplicate-block-id',lessonId:lesson.id,message:'Learning block IDs must be unique inside a lesson.'});
      for(const command of lesson.relatedCommands){
        if(command && !referenceTokens.has(command.replace(/^\\/,'')))issues.push({severity:'warning',code:'reference-gap',lessonId:lesson.id,message:`No reference entry for ${command}.`});
      }
    }
  }

  for(const exercise of exercises){
    if(!lessonIdSet.has(exercise.lessonId))issues.push({severity:'error',code:'orphan-exercise',exerciseId:exercise.id,message:`Unknown lesson ${exercise.lessonId}.`});
    const lesson=lessons.find(item=>item.id===exercise.lessonId);
    if(lesson?.content){
      for(const concept of exercise.concepts){
        if(!conceptById.has(concept))issues.push({severity:'error',code:'unknown-exercise-concept',lessonId:lesson.id,exerciseId:exercise.id,message:`Unknown exercise concept: ${concept}`});
      }
    }
    if(!exercise.solution.trim())issues.push({severity:'error',code:'empty-solution',exerciseId:exercise.id,message:'Exercise solution is empty.'});
    for(const rule of exercise.validators){
      if(rule.type==='compiles')continue;
      if(!ruleSatisfiedBySolution(rule,exercise.solution))issues.push({severity:'error',code:'solution-fails-rule',exerciseId:exercise.id,message:`Reference solution does not satisfy: ${rule.message}`});
    }
  }
  return issues;
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
