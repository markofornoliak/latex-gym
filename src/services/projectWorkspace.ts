import type { CompileResult, CompilerProject, LearningProject } from '../types';

export type ProjectWorkspace={mainFile:string;files:Record<string,string>};
export type ProjectAssessmentItem={id:string;label:string;ok:boolean;detail?:string;kind:'compiler'|'integrity'|'stage'};
export type ProjectAssessment={ok:boolean;items:ProjectAssessmentItem[];realCompile:boolean};

type StageSeed={files:Record<string,string>;concepts:string[]};

const stageSeeds:Record<string,StageSeed>={
  'mathematical-notes:structure':{files:{},concepts:['document-body','section']},
  'mathematical-notes:notation':{files:{},concepts:['inline-math','paragraph']},
  'mathematical-notes:formula':{files:{},concepts:['display-math','fraction']},
  'mathematical-notes:equation':{files:{},concepts:['equation','label']},
  'mathematical-notes:reference':{files:{},concepts:['label','ref']},
  'laboratory-report:sections':{files:{},concepts:['section']},
  'laboratory-report:method':{files:{},concepts:['paragraph']},
  'laboratory-report:table':{files:{},concepts:['tabular','professional-table']},
  'laboratory-report:figure':{files:{},concepts:['figure','caption','float']},
  'laboratory-report:crossrefs':{files:{},concepts:['label','ref']},
  'laboratory-report:final':{files:{},concepts:['professional-workflow']},
  'academic-paper:stage-1':{files:{},concepts:['document-class','document-body']},
  'academic-paper:stage-2':{files:{},concepts:['preamble']},
  'academic-paper:stage-3':{files:{},concepts:['section']},
  'academic-paper:stage-4':{files:{},concepts:['math-mode','label']},
  'academic-paper:stage-5':{files:{},concepts:['figure','caption','label']},
  'academic-paper:stage-6':{files:{},concepts:['tabular','professional-table']},
  'academic-paper:stage-7':{files:{},concepts:['label','ref']},
  'academic-paper:stage-8':{files:{
    'references.bib':'@book{knuth1984,\n  author = {Donald E. Knuth},\n  title = {The TeXbook},\n  year = {1984},\n  publisher = {Addison-Wesley}\n}\n'
  },concepts:['bibliography-model','citation']},
  'academic-paper:stage-9':{files:{},concepts:['appendix']},
  'academic-paper:stage-10':{files:{
    'sections/introduction.tex':'% Перенесите сюда содержимое раздела Introduction.\n',
    'sections/method.tex':'% Перенесите сюда содержимое раздела Method.\n',
    'sections/results.tex':'% Перенесите сюда содержимое раздела Results.\n',
    'macros.tex':'% Общие семантические команды проекта.\n'
  },concepts:['project-architecture']},
  'technical-report:class':{files:{},concepts:['document-class']},
  'technical-report:layout':{files:{},concepts:['page-structure']},
  'technical-report:files':{files:{
    'chapters/system.tex':'% Содержимое главы System overview.\n\\chapter{System overview}\n',
    'chapters/validation.tex':'% Содержимое главы Validation.\n\\chapter{Validation}\n'
  },concepts:['multi-file','project-architecture']},
  'technical-report:headers':{files:{},concepts:['headers-footers']},
  'technical-report:appendix':{files:{},concepts:['appendix']},
  'technical-report:build':{files:{},concepts:['project-architecture','professional-workflow']},
  'beamer-presentation:frame':{files:{},concepts:['document-class','environment']},
  'beamer-presentation:structure':{files:{},concepts:['section','environment']},
  'beamer-presentation:math':{files:{},concepts:['math-mode']},
  'beamer-presentation:figure':{files:{},concepts:['figure']},
  'beamer-presentation:final':{files:{},concepts:['professional-workflow']}
};

const filePrefix=(projectId:string)=>`project:${projectId}:file:`;
export const projectFileDraftKey=(projectId:string,path:string)=>`${filePrefix(projectId)}${path}`;

export function normalizeProjectFilePath(input:string){
  const value=input.trim().replaceAll('\\','/').replace(/^\.\//,'').replace(/\/{2,}/g,'/');
  if(!value||value.startsWith('/')||value.endsWith('/')||value.includes('\0'))return null;
  const parts=value.split('/');
  if(parts.some(part=>!part||part==='.'||part==='..'))return null;
  if(!/^[\w@.+\- /]+$/u.test(value))return null;
  return value;
}

export function createProjectWorkspace(project:LearningProject,stageIndex:number,drafts:Record<string,string>):ProjectWorkspace{
  const stage=project.stages[Math.max(0,stageIndex)]??project.stages[0];
  const mainFile='main.tex';
  const legacyWorkspace=drafts[`project:${project.id}:workspace`];
  const legacyStage=stage?drafts[`project:${project.id}:${stage.id}`]:undefined;
  const mainDraft=drafts[projectFileDraftKey(project.id,mainFile)];
  const files:Record<string,string>={[mainFile]:mainDraft??legacyWorkspace??legacyStage??stage?.starterCode??'\\documentclass{article}\n\\begin{document}\n\\end{document}'};
  const prefix=filePrefix(project.id);
  for(const [key,content] of Object.entries(drafts)){
    if(!key.startsWith(prefix))continue;
    const path=normalizeProjectFilePath(key.slice(prefix.length));
    if(path)files[path]=content;
  }
  return ensureStageFiles(project,stageIndex,{mainFile,files},drafts);
}

export function ensureStageFiles(project:LearningProject,stageIndex:number,workspace:ProjectWorkspace,drafts:Record<string,string>):ProjectWorkspace{
  const files={...workspace.files};
  for(let index=0;index<=stageIndex;index+=1){
    const stage=project.stages[index];
    if(!stage)continue;
    const seed=stageSeeds[`${project.id}:${stage.id}`];
    if(!seed)continue;
    for(const [path,content] of Object.entries(seed.files)){
      if(path in files)continue;
      files[path]=drafts[projectFileDraftKey(project.id,path)]??content;
    }
  }
  return {...workspace,files};
}

export function addWorkspaceFile(workspace:ProjectWorkspace,input:string){
  const path=normalizeProjectFilePath(input);
  if(!path)return {workspace,error:'Используйте относительный путь без .. и специальных символов.'};
  if(path in workspace.files)return {workspace,error:'Файл с таким путём уже существует.'};
  return {workspace:{...workspace,files:{...workspace.files,[path]:path.endsWith('.bib')?'% Bibliography database\n':`% ${path}\n`}},error:null};
}

export function toCompilerProject(workspace:ProjectWorkspace):CompilerProject{
  return {mainFile:workspace.mainFile,files:Object.entries(workspace.files).map(([path,content])=>({path,content}))};
}

export function projectStageConcepts(projectId:string,stageId:string){
  return stageSeeds[`${projectId}:${stageId}`]?.concepts??[];
}

export function assessProjectStage(project:LearningProject,stageIndex:number,workspace:ProjectWorkspace,result:CompileResult):ProjectAssessment{
  const items:ProjectAssessmentItem[]=[];
  const paths=Object.keys(workspace.files);
  const texFiles=paths.filter(path=>path.endsWith('.tex'));
  const multiFile=paths.length>1;
  const realCompile=Boolean(result.pdf?.length&&!result.fallbackReason);

  items.push({id:'compiler',kind:'compiler',label:multiFile?'Многофайловый проект собирается реальным TeX':'Документ компилируется',ok:result.ok&&(!multiFile||realCompile),detail:result.fallbackReason&&multiFile?'Учебный предпросмотр не подтверждает корректность нескольких файлов.':undefined});
  items.push({id:'main-file',kind:'integrity',label:`Корневой документ — ${workspace.mainFile}`,ok:Boolean(workspace.files[workspace.mainFile])});

  const roots=texFiles.filter(path=>/\\documentclass(?:\[[^\]]*\])?\{/.test(stripLatexComments(workspace.files[path]??'')));
  items.push({id:'single-root',kind:'integrity',label:'В проекте один корневой документ с \\documentclass',ok:roots.length===1&&roots[0]===workspace.mainFile,detail:roots.length>1?`Найдены корни: ${roots.join(', ')}`:roots.length===0?'\\documentclass не найден.':undefined});

  const unresolved=findUnresolvedInputs(workspace);
  items.push({id:'inputs',kind:'integrity',label:'Все \\input / \\include указывают на существующие файлы',ok:unresolved.length===0,detail:unresolved.length?`Не найдены: ${unresolved.join(', ')}`:undefined});

  for(let index=0;index<=stageIndex;index+=1){
    const stage=project.stages[index];
    if(stage)items.push(...checksForStage(project.id,stage.id,workspace));
  }

  return {ok:items.every(item=>item.ok),items,realCompile};
}

function checksForStage(projectId:string,stageId:string,workspace:ProjectWorkspace):ProjectAssessmentItem[]{
  const main=stripLatexComments(workspace.files[workspace.mainFile]??'');
  const all=Object.entries(workspace.files).filter(([path])=>path.endsWith('.tex')).map(([,content])=>stripLatexComments(content)).join('\n');
  const command=(name:string,label:string,min=1)=>patternCheck(`${projectId}:${stageId}:cmd:${name}`,label,commandCount(all,name)>=min);
  const environment=(name:string,label:string,min=1)=>patternCheck(`${projectId}:${stageId}:env:${name}`,label,environmentCount(all,name)>=min);
  const packageCheck=(name:string,label:string)=>patternCheck(`${projectId}:${stageId}:pkg:${name}`,label,new RegExp(`\\\\usepackage(?:\\[[^\\]]*\\])?\\{[^}]*\\b${name}\\b[^}]*\\}`).test(main));

  if(projectId==='mathematical-notes'){
    if(stageId==='structure')return [patternCheck('notes:article','Используется класс article',/\\documentclass(?:\[[^\]]*\])?\{article\}/.test(main)),environment('document','Есть document environment'),command('section','Создан смысловой раздел')];
    if(stageId==='notation')return [patternCheck('notes:inline','В обычном тексте используется встроенная математика',/(?:\$[^$\n]+\$|\\\([^\n]+\\\))/.test(main))];
    if(stageId==='formula')return [command('frac','Используется дробь \\frac'),patternCheck('notes:power','Используется верхний индекс',/\^[{\w]/.test(all)),patternCheck('notes:display','Есть самостоятельная формула',/(?:\\\[[\s\S]*?\\\]|\\begin\{equation\})/.test(all))];
    if(stageId==='equation')return [environment('equation','Ключевая формула находится в equation'),command('label','У нумеруемой формулы есть label')];
    if(stageId==='reference')return [command('ref','Текст использует \\ref вместо ручного номера')];
  }

  if(projectId==='laboratory-report'){
    if(stageId==='sections')return ['Method','Results','Discussion'].map(title=>patternCheck(`lab:section:${title}`,`Есть раздел ${title}`,new RegExp(`\\\\section\\{${title}\\}`).test(all)));
    if(stageId==='method')return [patternCheck('lab:method-text','В Method есть обычный связный текст',sectionBodyHasText(all,'Method'))];
    if(stageId==='table')return [environment('tabular','Результаты представлены через tabular'),patternCheck('lab:table-cells','Таблица содержит разделители столбцов &',all.includes('&'))];
    if(stageId==='figure')return [packageCheck('graphicx','Подключён graphicx'),environment('figure','Есть figure environment'),command('includegraphics','Рисунок подключён через \\includegraphics'),command('caption','У рисунка есть caption')];
    if(stageId==='crossrefs')return [command('label','Объект получает label'),command('ref','Discussion ссылается через \\ref')];
    if(stageId==='final')return [patternCheck('lab:no-manual-figure','Нет жёстко записанной ссылки “Figure 1”',!/Figure\s+1\b/.test(all))];
  }

  if(projectId==='academic-paper'){
    if(stageId==='stage-1')return [patternCheck('paper:article','Корневой класс — article',/\\documentclass(?:\[[^\]]*\])?\{article\}/.test(main)),environment('document','Есть document environment')];
    if(stageId==='stage-2')return [command('title','Задан title'),command('author','Задан author'),command('maketitle','Метаданные выводятся через \\maketitle')];
    if(stageId==='stage-3')return ['Introduction','Method','Results','Discussion'].map(title=>patternCheck(`paper:section:${title}`,`Сохранён раздел ${title}`,new RegExp(`\\\\section\\{${title}\\}`).test(all)));
    if(stageId==='stage-4')return [packageCheck('amsmath','Подключён amsmath'),environment('equation','Модель находится в equation'),command('label','У модели есть label')];
    if(stageId==='stage-5')return [packageCheck('graphicx','Подключён graphicx'),environment('figure','Есть figure'),command('includegraphics','Рисунок подключён через \\includegraphics'),patternCheck('paper:caption-label','В figure caption расположен перед label',/\\begin\{figure\}[\s\S]*?\\caption\{[\s\S]*?\\label\{[\s\S]*?\\end\{figure\}/.test(all))];
    if(stageId==='stage-6')return [packageCheck('booktabs','Подключён booktabs'),environment('table','Есть table'),environment('tabular','Есть tabular'),command('caption','У таблицы есть caption')];
    if(stageId==='stage-7')return [command('ref','Текст использует перекрёстные ссылки',2),command('label','В проекте сохранены устойчивые label',2)];
    if(stageId==='stage-8')return [fileCheck(workspace,'references.bib'),packageCheck('biblatex','Подключён biblatex'),patternCheck('paper:bibtex-backend','Для браузерного проекта выбран поддерживаемый backend=bibtex',/\\usepackage\[[^\]]*backend\s*=\s*bibtex[^\]]*\]\{biblatex\}/.test(main)),command('addbibresource','Подключена references.bib через \\addbibresource'),command('cite','Источник цитируется по ключу'),command('printbibliography','Библиография выводится автоматически')];
    if(stageId==='stage-9')return [command('appendix','Приложение начинается с \\appendix'),patternCheck('paper:appendix-section','После \\appendix есть структурный раздел',/\\appendix[\s\S]*?\\section\{/.test(all))];
    if(stageId==='stage-10')return [
      fileCheck(workspace,'sections/introduction.tex'),fileCheck(workspace,'sections/method.tex'),fileCheck(workspace,'sections/results.tex'),
      containsCheck(workspace.mainFile,workspace,'\\input{sections/introduction}','main.tex подключает introduction через \\input'),
      containsCheck(workspace.mainFile,workspace,'\\input{sections/method}','main.tex подключает method через \\input'),
      containsCheck(workspace.mainFile,workspace,'\\input{sections/results}','main.tex подключает results через \\input'),
      subfilesHaveNoDocumentClass(workspace)
    ];
  }

  if(projectId==='technical-report'){
    if(stageId==='class')return [patternCheck('report:class','Корневой класс — report',/\\documentclass(?:\[[^\]]*\])?\{report\}/.test(main)),command('chapter','Документ использует главы')];
    if(stageId==='layout')return [packageCheck('geometry','Поля задаются через geometry'),patternCheck('report:length','Геометрия использует явные единицы длины',/\\usepackage\[[^\]]*\d+(?:\.\d+)?\s*(?:mm|cm|in|pt)[^\]]*\]\{geometry\}/.test(main))];
    if(stageId==='files')return [fileCheck(workspace,'chapters/system.tex'),fileCheck(workspace,'chapters/validation.tex'),inputTargetCheck(workspace,'chapters/system'),inputTargetCheck(workspace,'chapters/validation'),subfilesHaveNoDocumentClass(workspace)];
    if(stageId==='headers')return [packageCheck('fancyhdr','Подключён fancyhdr'),command('pagestyle','Задан pagestyle')];
    if(stageId==='appendix')return [command('appendix','Добавлен \\appendix'),patternCheck('report:appendix-structure','После appendix есть chapter или section',/\\appendix[\s\S]*?\\(?:chapter|section)\{/.test(all))];
    if(stageId==='build')return [patternCheck('report:root-build','main.tex остаётся единственным root document',commandCount(main,'documentclass')===1),inputTargetCheck(workspace,'chapters/system'),inputTargetCheck(workspace,'chapters/validation')];
  }

  if(projectId==='beamer-presentation'){
    if(stageId==='frame')return [patternCheck('beamer:class','Корневой класс — beamer',/\\documentclass(?:\[[^\]]*\])?\{beamer\}/.test(main)),environment('frame','Создан первый frame')];
    if(stageId==='structure')return [command('section','Презентация разделена на секции'),environment('frame','Есть несколько содержательных frames',2)];
    if(stageId==='math')return [patternCheck('beamer:math','На слайде есть математическая формула',/(?:\$[^$\n]+\$|\\\[[\s\S]*?\\\])/.test(all))];
    if(stageId==='figure')return [command('includegraphics','Результат подключён через \\includegraphics')];
    if(stageId==='final')return [environment('frame','Сохранена последовательность нескольких frames',3)];
  }

  return [];
}

function patternCheck(id:string,label:string,ok:boolean,detail?:string):ProjectAssessmentItem{return {id,kind:'stage',label,ok,detail};}
function fileCheck(workspace:ProjectWorkspace,path:string):ProjectAssessmentItem{return patternCheck(`file:${path}`,`Файл ${path} существует`,path in workspace.files);}
function containsCheck(path:string,workspace:ProjectWorkspace,value:string,label:string):ProjectAssessmentItem{return patternCheck(`contains:${path}:${value}`,label,stripLatexComments(workspace.files[path]??'').includes(value));}
function inputTargetCheck(workspace:ProjectWorkspace,target:string):ProjectAssessmentItem{
  const source=stripLatexComments(workspace.files[workspace.mainFile]??'');
  const ok=source.includes(`\\input{${target}}`)||source.includes(`\\include{${target}}`);
  return patternCheck(`input:${target}`,`main.tex подключает ${target}.tex`,ok);
}
function subfilesHaveNoDocumentClass(workspace:ProjectWorkspace):ProjectAssessmentItem{
  const offenders=Object.entries(workspace.files).filter(([path,content])=>path!==workspace.mainFile&&path.endsWith('.tex')&&/\\documentclass(?:\[[^\]]*\])?\{/.test(stripLatexComments(content))).map(([path])=>path);
  return {id:'subfile-root',kind:'integrity',label:'Подключаемые .tex-файлы не создают второй document root',ok:offenders.length===0,detail:offenders.length?`Уберите \\documentclass из: ${offenders.join(', ')}`:undefined};
}
function commandCount(source:string,name:string){return [...source.matchAll(new RegExp(`\\\\${name}\\b`,'g'))].length;}
function environmentCount(source:string,name:string){return [...source.matchAll(new RegExp(`\\\\begin\\{${name}\\}`,'g'))].length;}
function sectionBodyHasText(source:string,title:string){
  const match=new RegExp(`\\\\section\\{${title}\\}([\\s\\S]*?)(?=\\\\section\\{|\\\\end\\{document\\}|$)`).exec(source);
  if(!match)return false;
  const withoutCommands=match[1].replace(/\\[A-Za-z@]+(?:\[[^\]]*\])?(?:\{[^}]*\})?/g,' ').replace(/[{}$&_~^]/g,' ');
  return /[A-Za-zА-Яа-я]{3,}/.test(withoutCommands);
}

function findUnresolvedInputs(workspace:ProjectWorkspace){
  const missing=new Set<string>();
  for(const [sourcePath,source] of Object.entries(workspace.files)){
    if(!sourcePath.endsWith('.tex'))continue;
    const activeSource=stripLatexComments(source);
    for(const match of activeSource.matchAll(/\\(?:input|include)\{([^}]+)\}/g)){
      const target=resolveTexPath(sourcePath,match[1]);
      if(!(target in workspace.files))missing.add(target);
    }
  }
  return [...missing];
}
function resolveTexPath(sourcePath:string,target:string){
  const base=sourcePath.includes('/')?sourcePath.slice(0,sourcePath.lastIndexOf('/')+1):'';
  const raw=(target.endsWith('.tex')?target:`${target}.tex`);
  const parts=`${base}${raw}`.split('/');
  const normalized:string[]=[];
  for(const part of parts){if(!part||part==='.')continue;if(part==='..')normalized.pop();else normalized.push(part);}
  return normalized.join('/');
}
function stripLatexComments(source:string){return source.split('\n').map(stripCommentLine).join('\n');}
function stripCommentLine(line:string){
  for(let index=0;index<line.length;index+=1){
    if(line[index]!=='%')continue;
    let slashes=0;
    for(let cursor=index-1;cursor>=0&&line[cursor]==='\\';cursor-=1)slashes+=1;
    if(slashes%2===0)return line.slice(0,index);
  }
  return line;
}
