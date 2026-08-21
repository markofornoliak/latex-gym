import { describe, expect, it } from 'vitest';
import { compileResultAuthority, satisfiesCompilerAuthority } from './compilerAuthority';
import type { CompileResult } from '../types';

const educational:CompileResult={ok:true,diagnostics:[],blocks:[],elapsedMs:1,engine:'educational-preview',providerId:'educational-preview',capabilities:{realPdf:false,engines:[],multiFile:false,bibtex:false,biber:false,multiplePasses:false,synctex:false,shellEscape:false,offline:true}};
const real:CompileResult={...educational,engine:'pdflatex',providerId:'busytex-wasm',pdf:new Uint8Array([37,80,68,70]),capabilities:{...educational.capabilities!,realPdf:true,engines:['pdflatex','xelatex','lualatex'],multiFile:true,bibtex:true,multiplePasses:true,offline:false}};

describe('compiler authority',()=>{
  it('accepts educational success for educational rules only',()=>{expect(satisfiesCompilerAuthority(educational,'educational')).toBe(true);expect(satisfiesCompilerAuthority(educational,'real-tex')).toBe(false);});
  it('accepts a capability-confirmed PDF compilation for both authority levels',()=>{expect(satisfiesCompilerAuthority(real,'educational')).toBe(true);expect(satisfiesCompilerAuthority(real,'real-tex')).toBe(true);});
  it('fails closed when bytes are not a PDF or realPdf capability is absent',()=>{
    expect(compileResultAuthority({...real,pdf:new Uint8Array([1,2,3,4])})).toBe('educational');
    expect(compileResultAuthority({...real,capabilities:undefined})).toBe('educational');
    expect(compileResultAuthority({...real,engine:'educational-preview'})).toBe('educational');
    expect(satisfiesCompilerAuthority({...real,pdf:new Uint8Array([37,80,68,70]),fallbackReason:'fallback'},'real-tex')).toBe(false);
  });
});