import { describe, expect, it } from 'vitest';
import type { CompileResult, LearningProjectStage } from '../types';
import { addWorkspaceFile, createProjectWorkspace, normalizeProjectPath, normalizeProjectWorkspace, projectWorkspaceToCompilerProject, removeWorkspaceFile, setWorkspaceFileContent, validateProjectStage } from './projectWorkspace';

const compiled:CompileResult={ok:true,diagnostics:[],blocks:[],elapsedMs:1,engine:'pdflatex',pdf:new Uint8Array([37,80,68,70])};

describe('project workspace',()=>{
  it('migrates a legacy single source into main.tex without losing content',()=>{
    const workspace=normalizeProjectWorkspace(undefined,'academic-paper','\\documentclass{article}',new Date('2026-01-01T00:00:00Z'));
    expect(workspace.mainFile).toBe('main.tex');
    expect(workspace.files['main.tex']).toContain('documentclass');
    expect(workspace.schemaVersion).toBe(1);
  });

  it('accepts nested TeX/Bib paths and rejects traversal or binary editor files',()=>{
    expect(normalizeProjectPath('sections/method.tex')).toEqual({ok:true,path:'sections/method.tex'});
    expect(normalizeProjectPath('references.bib').ok).toBe(true);
    expect(normalizeProjectPath('../outside.tex').ok).toBe(false);
    expect(normalizeProjectPath('/absolute.tex').ok).toBe(false);
    expect(normalizeProjectPath('figure.pdf').ok).toBe(false);
  });

  it('adds, edits and removes a project text file while protecting main.tex',()=>{
    const initial=createProjectWorkspace('academic-paper','Main',new Date('2026-01-01T00:00:00Z'));
    const added=addWorkspaceFile(initial,'sections/method.tex','Method',new Date('2026-01-02T00:00:00Z'));
    expect(added.ok).toBe(true);
    if(!added.ok)return;
    const edited=setWorkspaceFileContent(added.workspace,'sections/method.tex','Updated',new Date('2026-01-03T00:00:00Z'));
    expect(edited.files['sections/method.tex']).toBe('Updated');
    expect(removeWorkspaceFile(edited,'main.tex').ok).toBe(false);
    expect(removeWorkspaceFile(edited,'sections/method.tex').ok).toBe(true);
  });

  it('converts one workspace into a real compiler project including built-in assets',()=>{
    const workspace=createProjectWorkspace('academic-paper','\\includegraphics{response.pdf}');
    const compilerProject=projectWorkspaceToCompilerProject(workspace);
    expect(compilerProject.mainFile).toBe('main.tex');
    expect(compilerProject.files.some(file=>file.path==='main.tex')).toBe(true);
    const asset=compilerProject.files.find(file=>file.path==='response.pdf');
    expect(asset?.content).toBeInstanceOf(Uint8Array);
    expect(String.fromCharCode(...(asset!.content as Uint8Array).slice(0,4))).toBe('%PDF');
  });

  it('requires the exact current workspace revision to have compiled',()=>{
    const stage:LearningProjectStage={id:'structure',title:'Structure',objective:'',requirements:[],starterCode:'',validators:[{type:'documentClass',value:'article',message:'article',hint:'Use article'}]};
    const workspace=createProjectWorkspace('academic-paper','\\documentclass{article}');
    expect(validateProjectStage(stage,workspace,compiled,workspace.revision).ok).toBe(true);
    const changed=setWorkspaceFileContent(workspace,'main.tex','\\documentclass{article}\nText');
    const stale=validateProjectStage(stage,changed,compiled,workspace.revision);
    expect(stale.ok).toBe(false);
    expect(stale.items.some(item=>item.hint.includes('собрать заново'))).toBe(true);
  });

  it('validates file-tree architecture and prevents a second documentclass',()=>{
    const stage:LearningProjectStage={id:'architecture',title:'Architecture',objective:'',requirements:[],starterCode:'',projectCriteria:[
      {type:'fileExists',path:'sections/introduction.tex',message:'section exists',hint:'Create it'},
      {type:'mainContains',value:'\\input{sections/introduction}',message:'main links section',hint:'Use input'},
      {type:'noSecondaryDocumentClass',message:'one root',hint:'Remove documentclass from child files'}
    ]};
    let workspace=createProjectWorkspace('academic-paper','\\documentclass{article}\n\\input{sections/introduction}');
    const added=addWorkspaceFile(workspace,'sections/introduction.tex','Intro');
    expect(added.ok).toBe(true);if(!added.ok)return;workspace=added.workspace;
    expect(validateProjectStage(stage,workspace,compiled,workspace.revision).ok).toBe(true);
    workspace=setWorkspaceFileContent(workspace,'sections/introduction.tex','\\documentclass{article}\nIntro');
    expect(validateProjectStage(stage,workspace,compiled,workspace.revision).ok).toBe(false);
  });

  it('treats unresolved reference warnings as project-integrity failures',()=>{
    const stage:LearningProjectStage={id:'refs',title:'Refs',objective:'',requirements:[],starterCode:''};
    const workspace=createProjectWorkspace('academic-paper','Text');
    const warning:CompileResult={...compiled,diagnostics:[{severity:'warning',line:1,message:'Reference sec:x undefined',explanation:'',originalCompilerMessage:"LaTeX Warning: Reference `sec:x' undefined."}]};
    const result=validateProjectStage(stage,workspace,warning,workspace.revision);
    expect(result.ok).toBe(false);
    expect(result.items.some(item=>item.message.includes('ссылки'))).toBe(true);
  });
});
