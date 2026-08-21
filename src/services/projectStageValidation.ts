import type { LearningProject } from '../types';
import {
  activeLatexSource,
  commandCount,
  documentClass,
  environmentCount,
  hasDisplayMath,
  hasInlineMath,
  hasPackage
} from './latexSourceAnalysis';

export type ProjectValidationWorkspace={mainFile:string;files:Record<string,string>};
export type ProjectStageValidationItem={id:string;label:string;ok:boolean;detail?:string;kind:'stage'};

type Rule=
  | {type:'command';name:string;label:string;min?:number}
  | {type:'environment';name:string;label:string;min?:number}
  | {type:'package';name:string;label:string}
  | {type:'documentClass';name:string;label:string}
  | {type:'inlineMath';label:string;scope?:'main'|'all'}
  | {type:'displayMath';label:string;scope?:'main'|'all'}
  | {type:'math';label:string;scope?:'main'|'all'}
  | {type:'activeRegex';pattern:string;flags?:string;label:string;scope?:'main'|'all';negate?:boolean}
  | {type:'file';path:string;label?:string}
  | {type:'contains';path:string;value:string;label:string}
  | {type:'inputTarget';target:string;label?:string}
  | {type:'sectionHasText';title:string;label:string}
  | {type:'subfilesNoDocumentClass';label:string};

export const projectStageRuleContracts:Record<string,readonly Rule[]>={
  'mathematical-notes:structure':[
    {type:'documentClass',name:'article',label:'Используется класс article'},
    {type:'environment',name:'document',label:'Есть document environment'},
    {type:'command',name:'section',label:'Создан смысловой раздел'}
  ],
  'mathematical-notes:notation':[{type:'inlineMath',label:'В обычном тексте используется встроенная математика'}],
  'mathematical-notes:formula':[
    {type:'command',name:'frac',label:'Используется дробь \\frac'},
    {type:'activeRegex',pattern:'\\^[{\\w]',label:'Используется верхний индекс',scope:'all'},
    {type:'displayMath',label:'Есть самостоятельная формула',scope:'all'}
  ],
  'mathematical-notes:equation':[
    {type:'environment',name:'equation',label:'Ключевая формула находится в equation'},
    {type:'command',name:'label',label:'У нумеруемой формулы есть label'}
  ],
  'mathematical-notes:reference':[{type:'command',name:'ref',label:'Текст использует \\ref вместо ручного номера'}],

  'laboratory-report:sections':['Method','Results','Discussion'].map(title=>({type:'activeRegex' as const,pattern:`\\\\section\\{${title}\\}`,label:`Есть раздел ${title}`,scope:'all' as const})),
  'laboratory-report:method':[{type:'sectionHasText',title:'Method',label:'В Method есть обычный связный текст'}],
  'laboratory-report:table':[
    {type:'environment',name:'tabular',label:'Результаты представлены через tabular'},
    {type:'activeRegex',pattern:'&',label:'Таблица содержит разделители столбцов &',scope:'all'}
  ],
  'laboratory-report:figure':[
    {type:'package',name:'graphicx',label:'Подключён graphicx'},
    {type:'environment',name:'figure',label:'Есть figure environment'},
    {type:'command',name:'includegraphics',label:'Рисунок подключён через \\includegraphics'},
    {type:'command',name:'caption',label:'У рисунка есть caption'}
  ],
  'laboratory-report:crossrefs':[
    {type:'command',name:'label',label:'Объект получает label'},
    {type:'command',name:'ref',label:'Discussion ссылается через \\ref'}
  ],
  'laboratory-report:final':[{type:'activeRegex',pattern:'Figure\\s+1\\b',label:'Нет жёстко записанной ссылки “Figure 1”',scope:'all',negate:true}],

  'academic-paper:stage-1':[
    {type:'documentClass',name:'article',label:'Корневой класс — article'},
    {type:'environment',name:'document',label:'Есть document environment'}
  ],
  'academic-paper:stage-2':[
    {type:'command',name:'title',label:'Задан title'},
    {type:'command',name:'author',label:'Задан author'},
    {type:'command',name:'maketitle',label:'Метаданные выводятся через \\maketitle'}
  ],
  'academic-paper:stage-3':['Introduction','Method','Results','Discussion'].map(title=>({type:'activeRegex' as const,pattern:`\\\\section\\{${title}\\}`,label:`Сохранён раздел ${title}`,scope:'all' as const})),
  'academic-paper:stage-4':[
    {type:'package',name:'amsmath',label:'Подключён amsmath'},
    {type:'environment',name:'equation',label:'Модель находится в equation'},
    {type:'command',name:'label',label:'У модели есть label'}
  ],
  'academic-paper:stage-5':[
    {type:'package',name:'graphicx',label:'Подключён graphicx'},
    {type:'environment',name:'figure',label:'Есть figure'},
    {type:'command',name:'includegraphics',label:'Рисунок подключён через \\includegraphics'},
    {type:'activeRegex',pattern:'\\\\begin\\{figure\\}[\\s\\S]*?\\\\caption\\{[\\s\\S]*?\\\\label\\{[\\s\\S]*?\\\\end\\{figure\\}',label:'В figure caption расположен перед label',scope:'all'}
  ],
  'academic-paper:stage-6':[
    {type:'package',name:'booktabs',label:'Подключён booktabs'},
    {type:'environment',name:'table',label:'Есть table'},
    {type:'environment',name:'tabular',label:'Есть tabular'},
    {type:'command',name:'caption',label:'У таблицы есть caption'}
  ],
  'academic-paper:stage-7':[
    {type:'command',name:'ref',label:'Текст использует перекрёстные ссылки',min:2},
    {type:'command',name:'label',label:'В проекте сохранены устойчивые label',min:2}
  ],
  'academic-paper:stage-8':[
    {type:'file',path:'references.bib'},
    {type:'package',name:'biblatex',label:'Подключён biblatex'},
    {type:'activeRegex',pattern:'\\\\usepackage\\[[^\\]]*backend\\s*=\\s*bibtex[^\\]]*\\]\\{biblatex\\}',label:'Для браузерного проекта выбран поддерживаемый backend=bibtex'},
    {type:'command',name:'addbibresource',label:'Подключена references.bib через \\addbibresource'},
    {type:'command',name:'cite',label:'Источник цитируется по ключу'},
    {type:'command',name:'printbibliography',label:'Библиография выводится автоматически'}
  ],
  'academic-paper:stage-9':[
    {type:'command',name:'appendix',label:'Приложение начинается с \\appendix'},
    {type:'activeRegex',pattern:'\\\\appendix[\\s\\S]*?\\\\section\\{',label:'После \\appendix есть структурный раздел',scope:'all'}
  ],
  'academic-paper:stage-10':[
    {type:'file',path:'sections/introduction.tex'},
    {type:'file',path:'sections/method.tex'},
    {type:'file',path:'sections/results.tex'},
    {type:'contains',path:'main.tex',value:'\\input{sections/introduction}',label:'main.tex подключает introduction через \\input'},
    {type:'contains',path:'main.tex',value:'\\input{sections/method}',label:'main.tex подключает method через \\input'},
    {type:'contains',path:'main.tex',value:'\\input{sections/results}',label:'main.tex подключает results через \\input'},
    {type:'subfilesNoDocumentClass',label:'Подключаемые .tex-файлы не создают второй document root'}
  ],

  'technical-report:class':[
    {type:'documentClass',name:'report',label:'Корневой класс — report'},
    {type:'command',name:'chapter',label:'Документ использует главы'}
  ],
  'technical-report:layout':[
    {type:'package',name:'geometry',label:'Поля задаются через geometry'},
    {type:'activeRegex',pattern:'\\\\usepackage\\[[^\\]]*\\d+(?:\\.\\d+)?\\s*(?:mm|cm|in|pt)[^\\]]*\\]\\{geometry\\}',label:'Геометрия использует явные единицы длины'}
  ],
  'technical-report:files':[
    {type:'file',path:'chapters/system.tex'},
    {type:'file',path:'chapters/validation.tex'},
    {type:'inputTarget',target:'chapters/system'},
    {type:'inputTarget',target:'chapters/validation'},
    {type:'subfilesNoDocumentClass',label:'Подключаемые .tex-файлы не создают второй document root'}
  ],
  'technical-report:headers':[
    {type:'package',name:'fancyhdr',label:'Подключён fancyhdr'},
    {type:'command',name:'pagestyle',label:'Задан pagestyle'}
  ],
  'technical-report:appendix':[
    {type:'command',name:'appendix',label:'Добавлен \\appendix'},
    {type:'activeRegex',pattern:'\\\\appendix[\\s\\S]*?\\\\(?:chapter|section)\\{',label:'После appendix есть chapter или section',scope:'all'}
  ],
  'technical-report:build':[
    {type:'activeRegex',pattern:'\\\\documentclass(?:\\[[^\\]]*\\])?\\{',label:'main.tex остаётся единственным root document'},
    {type:'inputTarget',target:'chapters/system'},
    {type:'inputTarget',target:'chapters/validation'}
  ],

  'beamer-presentation:frame':[
    {type:'documentClass',name:'beamer',label:'Корневой класс — beamer'},
    {type:'environment',name:'frame',label:'Создан первый frame'}
  ],
  'beamer-presentation:structure':[
    {type:'command',name:'section',label:'Презентация разделена на секции'},
    {type:'environment',name:'frame',label:'Есть несколько содержательных frames',min:2}
  ],
  'beamer-presentation:math':[{type:'math',label:'На слайде есть математическая формула',scope:'all'}],
  'beamer-presentation:figure':[{type:'command',name:'includegraphics',label:'Результат подключён через \\includegraphics'}],
  'beamer-presentation:final':[{type:'environment',name:'frame',label:'Сохранена последовательность нескольких frames',min:3}]
};

export function validateProjectStageContract(projectId:string,stageId:string,workspace:ProjectValidationWorkspace):ProjectStageValidationItem[]{
  const rules=projectStageRuleContracts[`${projectId}:${stageId}`]??[];
  return rules.map((rule,index)=>evaluateRule(rule,workspace,`${projectId}:${stageId}:${index}`));
}

export function assertProjectStageRuleCoverage(projects:readonly LearningProject[]){
  const authored=new Set(projects.flatMap(project=>project.stages.map(stage=>`${project.id}:${stage.id}`)));
  const declared=new Set(Object.keys(projectStageRuleContracts));
  const missing=[...authored].filter(key=>!declared.has(key));
  const stale=[...declared].filter(key=>!authored.has(key));
  if(missing.length||stale.length)throw new Error(`Project stage validation coverage mismatch. Missing: ${missing.join(', ')||'none'}; stale: ${stale.join(', ')||'none'}`);
}

function evaluateRule(rule:Rule,workspace:ProjectValidationWorkspace,id:string):ProjectStageValidationItem{
  const main=workspace.files[workspace.mainFile]??'';
  const all=Object.entries(workspace.files).filter(([path])=>path.endsWith('.tex')).map(([,content])=>content).join('\n');
  const source=rule.type==='activeRegex'||rule.type==='inlineMath'||rule.type==='displayMath'||rule.type==='math'?(rule.scope==='all'?all:main):all;
  let ok=false;let detail:string|undefined;
  switch(rule.type){
    case 'command':ok=commandCount(all,rule.name)>=(rule.min??1);break;
    case 'environment':ok=environmentCount(all,rule.name)>=(rule.min??1);break;
    case 'package':ok=hasPackage(main,rule.name);break;
    case 'documentClass':ok=documentClass(main)===rule.name;break;
    case 'inlineMath':ok=hasInlineMath(source);break;
    case 'displayMath':ok=hasDisplayMath(source);break;
    case 'math':ok=hasInlineMath(source)||hasDisplayMath(source);break;
    case 'activeRegex':{const matched=new RegExp(rule.pattern,rule.flags).test(activeLatexSource(source));ok=rule.negate?!matched:matched;break;}
    case 'file':ok=rule.path in workspace.files;break;
    case 'contains':ok=activeLatexSource(workspace.files[rule.path]??'').includes(rule.value);break;
    case 'inputTarget':{const active=activeLatexSource(main);ok=active.includes(`\\input{${rule.target}}`)||active.includes(`\\include{${rule.target}}`);break;}
    case 'sectionHasText':ok=sectionBodyHasText(activeLatexSource(all),rule.title);break;
    case 'subfilesNoDocumentClass':{
      const offenders=Object.entries(workspace.files).filter(([path,content])=>path!==workspace.mainFile&&path.endsWith('.tex')&&documentClass(content)!==null).map(([path])=>path);
      ok=offenders.length===0;detail=offenders.length?`Уберите \\documentclass из: ${offenders.join(', ')}`:undefined;break;
    }
  }
  const label=rule.type==='file'?(rule.label??`Файл ${rule.path} существует`):rule.type==='inputTarget'?(rule.label??`main.tex подключает ${rule.target}.tex`):rule.label;
  return {id,label,ok,detail,kind:'stage'};
}

function sectionBodyHasText(source:string,title:string){
  const match=new RegExp(`\\\\section\\{${escapeRegExp(title)}\\}([\\s\\S]*?)(?=\\\\section\\{|\\\\end\\{document\\}|$)`).exec(source);
  if(!match)return false;
  const withoutCommands=match[1].replace(/\\[A-Za-z@]+(?:\[[^\]]*\])?(?:\{[^}]*\})?/g,' ').replace(/[{}$&_~^]/g,' ');
  return /[A-Za-zА-Яа-я]{3,}/.test(withoutCommands);
}
function escapeRegExp(value:string){return value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
