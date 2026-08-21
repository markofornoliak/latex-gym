import { describe, expect, it } from 'vitest';
import type { CompileResult, CompilerProject } from '../types';
import { contextualizeProjectDiagnostics, inferDiagnosticFile } from './compilerDiagnosticContext';

const project:CompilerProject={mainFile:'main.tex',files:[{path:'main.tex',content:'\\documentclass{article}\n\\begin{document}\n\\input{sections/method}\n\\end{document}'},{path:'sections/method.tex',content:'Text\n\\secton{Broken}\n'}]};

describe('project compiler diagnostic context',()=>{
  it('uses explicit file:line evidence from the real log',()=>{
    const log='./sections/method.tex:2: Undefined control sequence.\n! Undefined control sequence.\nl.2 \\secton{Broken}';
    expect(inferDiagnosticFile(log,{severity:'error',line:2,message:'Undefined control sequence',explanation:'x'},project.files.map(file=>file.path),project.mainFile)).toBe('sections/method.tex');
  });

  it('does not invent a subfile when the log is ambiguous',()=>{
    const log='! Undefined control sequence.\nl.2 \\secton{Broken}';
    expect(inferDiagnosticFile(log,{severity:'error',line:2,message:'Undefined control sequence',explanation:'x'},project.files.map(file=>file.path),project.mainFile)).toBeUndefined();
  });

  it('marks only the first TeX error as the likely root of a cascade',()=>{
    const result:CompileResult={ok:false,engine:'pdflatex',elapsedMs:1,blocks:[],rawLog:'',diagnostics:[
      {severity:'error',line:2,message:'Undefined control sequence',explanation:'x'},
      {severity:'error',line:3,message:'Missing } inserted',explanation:'x'},
      {severity:'warning',line:4,message:'Warning',explanation:'x'}
    ]};
    const contextual=contextualizeProjectDiagnostics(result,project);
    expect(contextual.diagnostics[0].cascade).toBe('root');
    expect(contextual.diagnostics[1].cascade).toBe('secondary');
    expect(contextual.diagnostics[2].cascade).toBeUndefined();
  });
});
