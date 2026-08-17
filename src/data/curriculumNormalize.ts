import { conceptById } from './concepts';
import { exercises, lessons } from './courses';
import type { LearningBlock } from '../types';

const aliases:Record<string,string>={
  documentclass:'document-class','document-class':'document-class',document:'document-environment',environment:'environment',preamble:'preamble',package:'package-model',packages:'package-model',usepackage:'usepackage',
  section:'section',subsection:'section',paragraph:'paragraph',text:'paragraph',emph:'emphasis',textbf:'emphasis',lists:'list',itemize:'list',enumerate:'list',
  math:'math-mode','math-mode':'math-mode','inline-math':'inline-math','display-math':'display-math',frac:'fraction',fraction:'fraction',sqrt:'root',powers:'superscript',superscript:'superscript',subscript:'subscript',
  equation:'equation',align:'align',matrix:'matrix',cases:'cases',operators:'math-operator',operator:'math-operator',theorem:'theorem',proof:'proof',
  table:'tabular',tabular:'tabular',booktabs:'professional-table',figure:'figure',caption:'caption',float:'float',label:'label',ref:'ref',hyperref:'hyperref',
  bibliography:'bibliography-model',bibitem:'bibliography-model',biblatex:'bibliography-model',biber:'biber',cite:'citation',citation:'citation',index:'index',glossary:'index',
  newcommand:'custom-command','custom-command':'custom-command',include:'multi-file',input:'multi-file','large-documents':'project-architecture',debugging:'debugging',latexmk:'latexmk',workflow:'professional-workflow',
  geometry:'page-structure',layout:'page-structure',microtype:'spacing',typography:'spacing',tikz:'figure',beamer:'document-class',fontspec:'professional-workflow',xelatex:'professional-workflow',lualatex:'professional-workflow',color:'package-model',xcolor:'package-model'
};

for(const exercise of exercises){
  exercise.concepts=unique(exercise.concepts.map(canonical).filter(Boolean));
}

for(const lesson of lessons){
  if(!lesson.content&&lesson.theory.length){
    lesson.content=lesson.theory.map((item,index):LearningBlock=>{
      if(item.code)return {id:`${lesson.id}-structured-${index+1}`,type:'syntax',title:item.title,body:item.body,code:item.code,note:item.note};
      return {id:`${lesson.id}-structured-${index+1}`,type:index===0?'concept':'explanation',title:item.title,body:item.body,details:item.note};
    });
  }
  const pedagogy=lesson.pedagogy;
  if(!pedagogy)continue;
  pedagogy.introduces=unique(pedagogy.introduces.map(canonical).filter(Boolean));
  const exerciseConcepts=unique(lesson.exercises.flatMap(exercise=>exercise.concepts).map(canonical).filter(Boolean));
  pedagogy.reinforces=unique([...pedagogy.reinforces.map(canonical),...exerciseConcepts.filter(id=>!pedagogy.introduces.includes(id))].filter(Boolean));
  if(pedagogy.prerequisites.length===0&&pedagogy.introduces.length){
    const required=pedagogy.introduces.flatMap(id=>conceptById.get(id)?.prerequisites??[]).filter(id=>!pedagogy.introduces.includes(id));
    pedagogy.prerequisites=unique(required);
  }else{
    pedagogy.prerequisites=unique(pedagogy.prerequisites.map(canonical).filter(Boolean));
  }
}

function canonical(value:string){
  const normalized=value.trim().toLocaleLowerCase('en').replace(/_/g,'-');
  if(conceptById.has(normalized))return normalized;
  if(aliases[normalized])return aliases[normalized];
  if(/^(amsmath|amsthm|graphicx|enumitem|booktabs|geometry|microtype|hyperref|biblatex|fancyhdr)$/.test(normalized))return 'package-model';
  return normalized;
}
function unique(values:string[]){return [...new Set(values)];}
