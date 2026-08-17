export type ProjectFile={path:string;content:string};
export type ProjectWorkspace={version:1;rootFile:string;activeFile:string;files:ProjectFile[]};
export type WorkspaceRequirement={path:string;reason:string};

const profiles:Record<string,{rootFile?:string;files:Array<ProjectFile>;required:WorkspaceRequirement[]}>= {
  'academic-paper:stage-8':{
    files:[{path:'references.bib',content:'@book{knuth1984,\n  author = {Donald E. Knuth},\n  title = {The TeXbook},\n  year = {1984}\n}\n'}],
    required:[{path:'references.bib',reason:'Библиография этапа должна находиться в отдельном .bib-файле.'}]
  },
  'academic-paper:stage-10':{
    files:[
      {path:'sections/introduction.tex',content:'\\section{Introduction}\nResearch question and context.\n'},
      {path:'sections/method.tex',content:'\\section{Method}\nDescribe the reproducible method here.\n'},
      {path:'sections/results.tex',content:'\\section{Results}\nReport the main result here.\n'},
      {path:'macros.tex',content:'% Shared semantic macros belong here.\n'},
      {path:'references.bib',content:'% Bibliographic records belong here.\n'}
    ],
    required:[
      {path:'main.tex',reason:'Нужен один корневой файл проекта.'},
      {path:'sections/introduction.tex',reason:'Введение должно быть вынесено в отдельный файл.'},
      {path:'sections/method.tex',reason:'Метод должен быть вынесен в отдельный файл.'},
      {path:'sections/results.tex',reason:'Результаты должны быть вынесены в отдельный файл.'}
    ]
  },
  'technical-report:files':{
    files:[
      {path:'main.tex',content:'\\documentclass{report}\n\\begin{document}\n\\include{chapters/system}\n\\include{chapters/validation}\n\\end{document}\n'},
      {path:'chapters/system.tex',content:'\\chapter{System overview}\nDescribe the system.\n'},
      {path:'chapters/validation.tex',content:'\\chapter{Validation}\nDescribe validation.\n'}
    ],
    required:[
      {path:'main.tex',reason:'Нужен единый корневой документ.'},
      {path:'chapters/system.tex',reason:'Глава system должна существовать как отдельный файл.'},
      {path:'chapters/validation.tex',reason:'Глава validation должна существовать как отдельный файл.'}
    ]
  },
  'technical-report:build':{
    files:[
      {path:'main.tex',content:'\\documentclass{report}\n\\begin{document}\n\\include{chapters/system}\n\\include{chapters/validation}\n\\end{document}\n'},
      {path:'chapters/system.tex',content:'\\chapter{System overview}\nSystem description.\n'},
      {path:'chapters/validation.tex',content:'\\chapter{Validation}\nValidation results.\n'},
      {path:'.latexmkrc',content:'$pdf_mode = 1;\n'}
    ],
    required:[
      {path:'main.tex',reason:'Воспроизводимая сборка должна иметь один root document.'},
      {path:'.latexmkrc',reason:'Этап сборки должен явно фиксировать конфигурацию latexmk.'}
    ]
  }
};

export function createProjectWorkspace(projectId:string,stageId:string,starterCode:string):ProjectWorkspace{
  const profile=profiles[`${projectId}:${stageId}`];
  const rootFile=profile?.rootFile??'main.tex';
  const profileFiles=profile?.files??[];
  const profileRoot=profileFiles.find(file=>file.path===rootFile);
  const rootContent=profileRoot?.content??starterCode;
  const files=dedupeFiles([{path:rootFile,content:rootContent},...profileFiles.filter(file=>file.path!==rootFile)]);
  return {version:1,rootFile,activeFile:rootFile,files};
}

export function restoreProjectWorkspace(raw:string|undefined,projectId:string,stageId:string,starterCode:string):ProjectWorkspace{
  if(raw){
    try{
      const parsed=JSON.parse(raw) as Partial<ProjectWorkspace>;
      if(parsed.version===1&&typeof parsed.rootFile==='string'&&Array.isArray(parsed.files)&&parsed.files.every(validFile)){
        const active=typeof parsed.activeFile==='string'&&parsed.files.some(file=>file.path===parsed.activeFile)?parsed.activeFile:parsed.rootFile;
        return {version:1,rootFile:parsed.rootFile,activeFile:active,files:parsed.files as ProjectFile[]};
      }
    }catch{
      // Legacy project drafts were stored as a single source string.
      return {version:1,rootFile:'main.tex',activeFile:'main.tex',files:[{path:'main.tex',content:raw}]};
    }
  }
  return createProjectWorkspace(projectId,stageId,starterCode);
}

export function serializeProjectWorkspace(workspace:ProjectWorkspace){return JSON.stringify(workspace);}
export function activeProjectFile(workspace:ProjectWorkspace){return workspace.files.find(file=>file.path===workspace.activeFile)??workspace.files[0];}
export function rootProjectSource(workspace:ProjectWorkspace){return workspace.files.find(file=>file.path===workspace.rootFile)?.content??'';}
export function combinedProjectSource(workspace:ProjectWorkspace){return workspace.files.map(file=>`% FILE: ${file.path}\n${file.content}`).join('\n\n');}

export function updateProjectFile(workspace:ProjectWorkspace,path:string,content:string):ProjectWorkspace{
  return {...workspace,files:workspace.files.map(file=>file.path===path?{...file,content}:file)};
}
export function activateProjectFile(workspace:ProjectWorkspace,path:string):ProjectWorkspace{
  return workspace.files.some(file=>file.path===path)?{...workspace,activeFile:path}:workspace;
}
export function addProjectFile(workspace:ProjectWorkspace,path:string):{workspace:ProjectWorkspace;error?:string}{
  const normalized=normalizePath(path);
  if(!normalized)return {workspace,error:'Введите имя файла.'};
  if(!/^[A-Za-z0-9._/-]+$/.test(normalized)||normalized.startsWith('/')||normalized.includes('..'))return {workspace,error:'Используйте относительный путь без .. и специальных символов.'};
  if(!/\.(?:tex|bib|sty|cls|txt|rc)$/.test(normalized)&&normalized!=='.latexmkrc')return {workspace,error:'Для учебного проекта поддерживаются текстовые файлы .tex, .bib, .sty, .cls, .txt и .latexmkrc.'};
  if(workspace.files.some(file=>file.path===normalized))return {workspace,error:'Файл с таким путём уже существует.'};
  return {workspace:{...workspace,activeFile:normalized,files:[...workspace.files,{path:normalized,content:''}].sort((a,b)=>a.path.localeCompare(b.path))}};
}
export function removeProjectFile(workspace:ProjectWorkspace,path:string):{workspace:ProjectWorkspace;error?:string}{
  if(path===workspace.rootFile)return {workspace,error:'Корневой файл нельзя удалить.'};
  const files=workspace.files.filter(file=>file.path!==path);
  if(files.length===workspace.files.length)return {workspace};
  return {workspace:{...workspace,files,activeFile:workspace.activeFile===path?workspace.rootFile:workspace.activeFile}};
}

export function workspaceRequirements(projectId:string,stageId:string,workspace:ProjectWorkspace){
  const required=profiles[`${projectId}:${stageId}`]?.required??[];
  return required.map(item=>({label:`Файл ${item.path}`,ok:workspace.files.some(file=>file.path===item.path),hint:item.reason,blocking:true}));
}

export function referencedProjectFiles(workspace:ProjectWorkspace){
  const root=rootProjectSource(workspace);
  const references=[...root.matchAll(/\\(?:input|include)\{([^}]+)\}|\\addbibresource\{([^}]+)\}/g)].map(match=>match[1]??match[2]).filter(Boolean);
  return references.map(reference=>{
    const candidates=reference.endsWith('.tex')||reference.endsWith('.bib')?[reference]:[reference,`${reference}.tex`,`${reference}.bib`];
    return {reference,exists:candidates.some(candidate=>workspace.files.some(file=>file.path===candidate))};
  });
}

function validFile(value:unknown):value is ProjectFile{
  if(!value||typeof value!=='object')return false;
  const file=value as Record<string,unknown>;
  return typeof file.path==='string'&&typeof file.content==='string';
}
function normalizePath(path:string){return path.trim().replace(/\\/g,'/').replace(/^\.\//,'').replace(/\/{2,}/g,'/');}
function dedupeFiles(files:ProjectFile[]){const seen=new Set<string>();return files.filter(file=>{if(seen.has(file.path))return false;seen.add(file.path);return true;});}
