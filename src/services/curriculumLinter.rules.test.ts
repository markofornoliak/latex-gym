import { describe, expect, it } from 'vitest';
import type { ConceptDefinition, CourseModule, Exercise, LearningProject, Lesson, ReferenceEntry, ValidatorRule } from '../types';
import { lintCurriculum } from './curriculumLinter';

type Fixture={modules:CourseModule[];lessons:Lesson[];exercises:Exercise[];references:ReferenceEntry[];concepts:ConceptDefinition[];projects:LearningProject[]};

function exercise(id:string,lessonId:string,concepts:string[]):Exercise{
  return {id,lessonId,category:'Основы',difficulty:'Начальный',mode:'Написать код',title:id,instructions:'Do it',requirements:['ok'],starterCode:'',validators:[{type:'containsText',value:'ok',message:'Contains ok',hint:'Write ok'}],hints:['Write ok'],solution:'ok',concepts,prerequisites:[]};
}
function lesson(id:string,number:number,introduces:string[],prerequisites:string[]=[],reinforces:string[]=[]):Lesson{
  const nested=exercise(`exercise-${id}`,id,introduces.length?introduces:prerequisites);
  return {id,moduleId:'module',number,title:id,subtitle:'subtitle',difficulty:'Начальный',theory:[],pedagogy:{objective:'Learn',prerequisites,introduces,reinforces,misconceptions:[],practiceObjective:'Practice',masteryCriteria:['Done']},examples:[],exercises:[nested],relatedCommands:[]};
}
function fixture():Fixture{
  const first=lesson('lesson-base',1,['base']);
  const second=lesson('lesson-advanced',2,['advanced'],['base']);
  second.projectStage='project:stage-1';
  const modules:CourseModule[]=[{id:'module',number:1,title:'Module',description:'Description',prerequisites:'None',difficulty:'Начальный',lessons:[first,second]}];
  const concepts:ConceptDefinition[]=[
    {id:'base',title:'Base',description:'Base concept',prerequisites:[]},
    {id:'advanced',title:'Advanced',description:'Advanced concept',prerequisites:['base']}
  ];
  const references:ReferenceEntry[]=[{id:'base-ref',command:'\\base',category:'Test',aliases:['base-command'],title:'Base reference',description:'Description',syntax:'\\base',example:'\\base',related:[]}];
  const projects:LearningProject[]=[{id:'project',title:'Project',subtitle:'Subtitle',difficulty:'Начальный',description:'Description',prerequisites:['base'],concepts:['advanced'],stages:[{id:'stage-1',title:'Stage',objective:'Build',requirements:['Done'],starterCode:''}]}];
  return {modules,lessons:[first,second],exercises:[...first.exercises,...second.exercises],references,concepts,projects};
}
function lint(data:Fixture){return lintCurriculum(data.lessons,data.exercises,data.references,{modules:data.modules,concepts:data.concepts,projects:data.projects});}
function expectCode(data:Fixture,code:string){expect(lint(data).map(issue=>issue.code)).toContain(code);}

describe('curriculum linter negative invariants',()=>{
  it('detects duplicate IDs and orphan exercises',()=>{
    const data=fixture();
    data.lessons[1].id=data.lessons[0].id;
    data.exercises.push({...data.exercises[0],id:'orphan',lessonId:'missing-lesson'});
    const codes=lint(data).map(issue=>issue.code);
    expect(codes).toContain('duplicate-lesson-id');
    expect(codes).toContain('orphan-exercise');
  });

  it('detects project prerequisites that do not resolve to concepts',()=>{
    const data=fixture();data.projects[0].prerequisites=['missing'];expectCode(data,'unknown-project-prerequisite');
  });

  it('detects broken related-reference links',()=>{
    const data=fixture();data.references[0].related=['missing-ref'];expectCode(data,'unknown-related-reference');
  });

  it('detects malformed and missing project-stage links',()=>{
    const malformed=fixture();malformed.lessons[1].projectStage='bad-format';expectCode(malformed,'malformed-project-stage-reference');
    const missing=fixture();missing.lessons[1].projectStage='project:missing-stage';expectCode(missing,'unknown-project-stage-reference');
  });

  it('reports concept dependency chronology without rejecting valid co-teaching',()=>{
    const data=fixture();
    data.concepts.push({id:'later',title:'Later',description:'Later concept',prerequisites:[]});
    data.concepts.find(concept=>concept.id==='advanced')!.prerequisites=['later'];
    const issue=lint(data).find(item=>item.code==='concept-dependency-gap');
    expect(issue?.severity).toBe('warning');
  });

  it('rejects a genuinely impossible reciprocal learning path',()=>{
    const data=fixture();
    const later=lesson('lesson-later',3,['later'],['advanced']);
    data.lessons.push(later);data.modules[0].lessons.push(later);data.exercises.push(...later.exercises);
    data.concepts.push({id:'later',title:'Later',description:'Later concept',prerequisites:[]});
    data.concepts.find(concept=>concept.id==='advanced')!.prerequisites=['later'];
    const issue=lint(data).find(item=>item.code==='impossible-learning-path');
    expect(issue?.severity).toBe('error');
  });

  it('detects explicit lesson prerequisite gaps but only warns about early reinforcement',()=>{
    const prerequisite=fixture();prerequisite.lessons[0].pedagogy!.prerequisites=['advanced'];expectCode(prerequisite,'knowledge-gap');
    const reinforcement=fixture();reinforcement.lessons[0].pedagogy!.reinforces=['advanced'];
    const issue=lint(reinforcement).find(item=>item.code==='reinforces-before-introduction');
    expect(issue?.severity).toBe('warning');
  });

  it('detects contradictory concept roles inside one lesson',()=>{
    const data=fixture();data.lessons[1].pedagogy!.prerequisites.push('advanced');expectCode(data,'prerequisite-introduced-same-lesson');
  });

  it('warns when a lesson both introduces and reinforces a concept',()=>{
    const data=fixture();data.lessons[1].pedagogy!.reinforces.push('advanced');
    const issue=lint(data).find(item=>item.code==='introduces-and-reinforces');
    expect(issue?.severity).toBe('warning');
  });

  it('detects invalid regexes before reference-solution evaluation',()=>{
    const data=fixture();data.exercises[0].validators=[{type:'regex',value:'(',flags:'g',message:'Regex',hint:'Fix regex'}];expectCode(data,'invalid-validator-regex');
  });

  it('detects malformed validator discriminants and command minima',()=>{
    const invalidType=fixture();invalidType.exercises[0].validators=[{type:'unknown',message:'Bad',hint:'Bad'} as unknown as ValidatorRule];expectCode(invalidType,'malformed-validator');
    const invalidMin=fixture();invalidMin.exercises[0].validators=[{type:'command',value:'section',min:1.5,message:'Command',hint:'Use command'}];expectCode(invalidMin,'malformed-validator');
  });

  it('detects numbering defects without requiring contiguous numbering',()=>{
    const duplicate=fixture();duplicate.modules[0].lessons[1].number=1;expectCode(duplicate,'duplicate-lesson-number');
    const invalid=fixture();invalid.modules[0].number=0;expectCode(invalid,'invalid-module-number');
    const ordered=fixture();ordered.modules[0].lessons[0].number=10;ordered.modules[0].lessons[1].number=20;
    expect(lint(ordered).some(issue=>issue.code==='lesson-number-order')).toBe(false);
  });

  it('warns about concepts with no curriculum evidence',()=>{
    const data=fixture();data.concepts.push({id:'ghost',title:'Ghost',description:'No evidence',prerequisites:['base']});
    const issue=lint(data).find(item=>item.code==='unobserved-concept'&&item.conceptId==='ghost');expect(issue?.severity).toBe('warning');
  });

  it('warns about ambiguous normalized reference search tokens',()=>{
    const data=fixture();
    data.references.push({id:'other-ref',command:'\\other',category:'Test',aliases:['BASE-COMMAND'],title:'Other',description:'Description',syntax:'\\other',example:'\\other',related:[]});
    const issue=lint(data).find(item=>item.code==='reference-token-collision');expect(issue?.severity).toBe('warning');
  });
});
