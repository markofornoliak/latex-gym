import { describe, expect, it } from 'vitest';
import { parseTeXLog,prepareBusyTexFiles } from './fullCompiler';

describe('full TeX log diagnostics',()=>{
  it('extracts the source line from a real TeX error shape',()=>{
    const log='! Undefined control sequence.\nl.14 \\secton\n';
    const diagnostics=parseTeXLog(log,1);
    expect(diagnostics[0].severity).toBe('error');
    expect(diagnostics[0].line).toBe(14);
    expect(diagnostics[0].explanation).toContain('опечатка');
  });

  it('distinguishes layout warnings from compilation failure',()=>{
    const log='Overfull \\hbox (11.0pt too wide) in paragraph at lines 21--22\n';
    const diagnostics=parseTeXLog(log,0);
    expect(diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({severity:'warning',line:21,message:'Overfull \\hbox'})]));
  });

  it('adds a useful fallback when the engine exits without a standard TeX error block',()=>{
    const diagnostics=parseTeXLog('xdvipdfmx:fatal: cannot proceed',2);
    expect(diagnostics[0].severity).toBe('error');
    expect(diagnostics[0].message).toContain('остановлена');
  });

  it('creates parent directories before files for the pinned BusyTeX virtual filesystem',()=>{
    const files=prepareBusyTexFiles([
      {path:'main.tex',contents:'\\input{sections/method}'},
      {path:'sections/method.tex',contents:'Method'},
      {path:'figures/results/plot.png',contents:Uint8Array.from([1,2,3])}
    ]);
    expect(files.slice(0,3)).toEqual([
      {path:'figures',contents:null},
      {path:'sections',contents:null},
      {path:'figures/results',contents:null}
    ]);
    expect(files).toEqual(expect.arrayContaining([expect.objectContaining({path:'sections/method.tex'}),expect.objectContaining({path:'figures/results/plot.png'})]));
  });
});
