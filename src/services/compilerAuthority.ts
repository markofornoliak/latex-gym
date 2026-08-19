import type { CompileResult, CompilerAuthority } from '../types';

export function compileResultAuthority(result:CompileResult|undefined):CompilerAuthority|null{
  if(!result?.ok)return null;
  if(result.pdf?.length&&!result.fallbackReason&&result.capabilities?.realPdf!==false)return 'real-tex';
  return 'educational';
}

export function satisfiesCompilerAuthority(result:CompileResult|undefined,required:CompilerAuthority='educational'){
  const actual=compileResultAuthority(result);
  if(!actual)return false;
  return required==='educational'||actual==='real-tex';
}
