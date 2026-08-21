import { describe, expect, it } from 'vitest';
import type { ConceptDefinition, Exercise } from '../types';
import { buildCurriculumGraph } from './curriculumGraph';
import { inspectCurriculumGraphIntegrity } from './curriculumGraphIntegrity';

function exercise(overrides:Partial<Exercise>={}):Exercise{
  return {
    id:'exercise',lessonId:'lesson',category:'Основы',difficulty:'Начальный',mode:'Написать код',title:'Exercise',instructions:'Do it',requirements:['ok'],starterCode:'',validators:[],hints:[],solution:'ok',concepts:['advanced'],prerequisites:[],...overrides
  };
}

function graph(concepts:ConceptDefinition[],exercises:Exercise[]=[]){
  return buildCurriculumGraph({concepts,lessons:[],exercises,references:[],projects:[]}).graph;
}

describe('curriculum graph semantic integrity',()=>{
  it('warns about a direct prerequisite already implied by another direct prerequisite',()=>{
    const concepts:ConceptDefinition[]=[
      {id:'base',title:'Base',description:'Base',prerequisites:[]},
      {id:'middle',title:'Middle',description:'Middle',prerequisites:['base']},
      {id:'advanced',title:'Advanced',description:'Advanced',prerequisites:['base','middle']}
    ];
    const issues=inspectCurriculumGraphIntegrity(concepts,[],graph(concepts));
    expect(issues).toContainEqual(expect.objectContaining({severity:'warning',code:'redundant-prerequisite-edge',conceptId:'advanced'}));
  });

  it('rejects mastery evidence that is empty, unknown, or unrelated to the exercise',()=>{
    const concepts:ConceptDefinition[]=[
      {id:'base',title:'Base',description:'Base',prerequisites:[]},
      {id:'advanced',title:'Advanced',description:'Advanced',prerequisites:['base']}
    ];
    const exercises=[
      exercise({id:'empty',evidenceConcepts:[]}),
      exercise({id:'unknown',evidenceConcepts:['missing']}),
      exercise({id:'outside',evidenceConcepts:['base']})
    ];
    const codes=inspectCurriculumGraphIntegrity(concepts,exercises,graph(concepts,exercises)).map(issue=>issue.code);
    expect(codes).toContain('empty-evidence-concepts');
    expect(codes).toContain('unknown-evidence-concept');
    expect(codes).toContain('evidence-concept-not-used');
  });
});
