import { describe, expect, it } from 'vitest';
import { getProject } from '../data/projects';
import type { CompileResult } from '../types';
import {
  assessProjectStage,
  createProjectWorkspace,
  normalizeProjectFilePath,
  projectFileDraftKey
} from './projectWorkspace';

const realResult:CompileResult={
  ok:true,diagnostics:[],blocks:[],elapsedMs:20,engine:'pdflatex',providerId:'busytex-wasm',pdf:new Uint8Array([37,80,68,70])
};
const validTechnicalRoot='\\documentclass{report}\n\\usepackage[margin=28mm]{geometry}\n\\begin{document}\n\\chapter{Overview}\n\\include{chapters/system}\n\\include{chapters/validation}\n\\end{document}';

describe('project workspace',()=>{
  it('migrates the existing single-file project draft into main.tex without discarding it',()=>{
    const project=getProject('academic-paper')!;
    const stageIndex=project.stages.findIndex(stage=>stage.id==='stage-10');
    const old='\\documentclass{article}\n\\begin{document}\nExisting work\n\\end{document}';
    const workspace=createProjectWorkspace(project,stageIndex,{[`project:${project.id}:workspace`]:old});

    expect(workspace.files['main.tex']).toBe(old);
    expect(workspace.files['sections/introduction.tex']).toContain('Introduction');
    expect(workspace.files['sections/method.tex']).toContain('Method');
    expect(workspace.files['sections/results.tex']).toContain('Results');
  });

  it('prefers persisted per-file drafts over seeds',()=>{
    const project=getProject('academic-paper')!;
    const stageIndex=project.stages.findIndex(stage=>stage.id==='stage-10');
    const key=projectFileDraftKey(project.id,'sections/method.tex');
    const workspace=createProjectWorkspace(project,stageIndex,{[key]:'Custom method content'});
    expect(workspace.files['sections/method.tex']).toBe('Custom method content');
  });

  it('accepts safe relative project paths and rejects traversal or absolute paths',()=>{
    expect(normalizeProjectFilePath('sections/results.tex')).toBe('sections/results.tex');
    expect(normalizeProjectFilePath('./references.bib')).toBe('references.bib');
    expect(normalizeProjectFilePath('../secret.tex')).toBeNull();
    expect(normalizeProjectFilePath('/etc/passwd')).toBeNull();
    expect(normalizeProjectFilePath('chapters/../root.tex')).toBeNull();
  });

  it('validates cumulative requirements in a real multi-file technical report',()=>{
    const project=getProject('technical-report')!;
    const stageIndex=project.stages.findIndex(stage=>stage.id==='files');
    const workspace=createProjectWorkspace(project,stageIndex,{});
    workspace.files['main.tex']=validTechnicalRoot;
    const assessment=assessProjectStage(project,stageIndex,workspace,realResult);
    expect(assessment.ok).toBe(true);
    expect(assessment.realCompile).toBe(true);
  });

  it('rejects a later stage when its new requirement was not actually added',()=>{
    const project=getProject('academic-paper')!;
    const stageIndex=project.stages.findIndex(stage=>stage.id==='stage-2');
    const workspace=createProjectWorkspace(project,stageIndex,{});
    workspace.files['main.tex']='\\documentclass{article}\n\\begin{document}\n\\end{document}';
    const assessment=assessProjectStage(project,stageIndex,workspace,realResult);
    expect(assessment.ok).toBe(false);
    expect(assessment.items.find(item=>item.id.includes('cmd:title'))?.ok).toBe(false);
    expect(assessment.items.find(item=>item.id.includes('cmd:maketitle'))?.ok).toBe(false);
  });

  it('does not count commands that only appear in LaTeX comments',()=>{
    const project=getProject('academic-paper')!;
    const stageIndex=project.stages.findIndex(stage=>stage.id==='stage-2');
    const workspace=createProjectWorkspace(project,stageIndex,{});
    workspace.files['main.tex']='\\documentclass{article}\n% \\title{Fake}\n% \\author{Fake}\n% \\maketitle\n\\begin{document}\n\\end{document}';
    const assessment=assessProjectStage(project,stageIndex,workspace,realResult);
    expect(assessment.items.find(item=>item.id.includes('cmd:title'))?.ok).toBe(false);
    expect(assessment.items.find(item=>item.id.includes('cmd:author'))?.ok).toBe(false);
    expect(assessment.items.find(item=>item.id.includes('cmd:maketitle'))?.ok).toBe(false);
  });

  it('ignores commented-out input dependencies',()=>{
    const project=getProject('academic-paper')!;
    const stageIndex=project.stages.findIndex(stage=>stage.id==='stage-1');
    const workspace=createProjectWorkspace(project,stageIndex,{});
    workspace.files['main.tex']='\\documentclass{article}\n\\begin{document}\n% \\input{missing}\nText with escaped percent: 10\\% complete.\n\\end{document}';
    const assessment=assessProjectStage(project,stageIndex,workspace,realResult);
    expect(assessment.items.find(item=>item.id==='inputs')?.ok).toBe(true);
    expect(assessment.ok).toBe(true);
  });

  it('does not treat the educational fallback as proof of a multi-file project',()=>{
    const project=getProject('technical-report')!;
    const stageIndex=project.stages.findIndex(stage=>stage.id==='files');
    const workspace=createProjectWorkspace(project,stageIndex,{});
    workspace.files['main.tex']=validTechnicalRoot;
    const fallback:CompileResult={...realResult,pdf:undefined,engine:'educational-preview',fallbackReason:'offline'};
    const assessment=assessProjectStage(project,stageIndex,workspace,fallback);
    expect(assessment.ok).toBe(false);
    expect(assessment.items.find(item=>item.id==='compiler')?.ok).toBe(false);
  });

  it('flags unresolved input dependencies before a stage can pass',()=>{
    const project=getProject('technical-report')!;
    const stageIndex=project.stages.findIndex(stage=>stage.id==='files');
    const workspace=createProjectWorkspace(project,stageIndex,{});
    workspace.files['main.tex']='\\documentclass{report}\n\\usepackage[margin=28mm]{geometry}\n\\begin{document}\n\\chapter{Overview}\n\\input{chapters/missing}\n\\end{document}';
    const assessment=assessProjectStage(project,stageIndex,workspace,realResult);
    const inputs=assessment.items.find(item=>item.id==='inputs');
    expect(inputs?.ok).toBe(false);
    expect(inputs?.detail).toContain('chapters/missing.tex');
  });
});
