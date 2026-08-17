import { describe, expect, it } from 'vitest';
import { addProjectFile, createProjectWorkspace, referencedProjectFiles, restoreProjectWorkspace, serializeProjectWorkspace, workspaceRequirements } from './projectWorkspace';

describe('virtual LaTeX project filesystem',()=>{
  it('creates the multi-file publication workspace with required section files',()=>{
    const workspace=createProjectWorkspace('academic-paper','stage-10','\\documentclass{article}');
    const paths=workspace.files.map(file=>file.path);
    expect(paths).toContain('main.tex');
    expect(paths).toContain('sections/introduction.tex');
    expect(paths).toContain('sections/method.tex');
    expect(workspaceRequirements('academic-paper','stage-10',workspace).every(item=>item.ok)).toBe(true);
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
