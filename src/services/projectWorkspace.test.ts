import { describe, expect, it } from 'vitest';
import { addProjectFile, createProjectWorkspace, referencedProjectFiles, restoreProjectWorkspace, rootProjectSource, serializeProjectWorkspace, workspaceRequirements } from './projectWorkspace';

describe('virtual LaTeX project filesystem',()=>{
  it('creates the multi-file publication workspace with required section files',()=>{
    const workspace=createProjectWorkspace('academic-paper','stage-10','\\documentclass{article}');
    const paths=workspace.files.map(file=>file.path);
    expect(paths).toContain('main.tex');
    expect(paths).toContain('sections/introduction.tex');
    expect(paths).toContain('sections/method.tex');
    expect(workspaceRequirements('academic-paper','stage-10',workspace).every(item=>item.ok)).toBe(true);
  });

  it('creates a real two-file bibliography project with a compilable root',()=>{
    const workspace=createProjectWorkspace('academic-paper','stage-8','');
    const root=rootProjectSource(workspace);
    expect(root).toContain('\\documentclass{article}');
    expect(root).toContain('backend=bibtex');
    expect(root).toContain('\\addbibresource{references.bib}');
    expect(workspace.files.some(file=>file.path==='references.bib'&&file.content.includes('knuth1984'))).toBe(true);
    expect(referencedProjectFiles(workspace).every(item=>item.exists)).toBe(true);
  });

  it('round-trips a workspace through the existing persistent drafts store',()=>{
    const workspace=createProjectWorkspace('academic-paper','stage-10','\\documentclass{article}');
    expect(restoreProjectWorkspace(serializeProjectWorkspace(workspace),'academic-paper','stage-10','').files).toEqual(workspace.files);
  });

  it('rejects traversal paths and duplicate files',()=>{
    const workspace=createProjectWorkspace('academic-paper','stage-10','');
    expect(addProjectFile(workspace,'../secret.tex').error).toBeTruthy();
    expect(addProjectFile(workspace,'main.tex').error).toBeTruthy();
  });

  it('detects references to files missing from the project',()=>{
    const workspace=createProjectWorkspace('other','stage','\\documentclass{article}\n\\begin{document}\n\\input{sections/method}\n\\end{document}');
    expect(referencedProjectFiles(workspace)).toEqual([{reference:'sections/method',exists:false}]);
  });
});
