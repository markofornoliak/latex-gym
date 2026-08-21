import type { CompileResult, CompilerAuthority } from '../types';

export function hasPdfSignature(bytes:Uint8Array|undefined){return Boolean(bytes&&bytes.length>=4&&bytes[0]===0x25&&bytes[1]===0x50&&bytes[2]===0x44&&bytes[3]===0x46);}

export function compileResultAuthority(result:CompileResult|undefined):CompilerAuthority|null{
  if(!result?.ok)return null;
  if(result.engine!=='educational-preview'&&!result.fallbackReason&&result.capabilities?.realPdf===true&&hasPdfSignature(result.pdf))return 'real-tex';
  return 'educational';
}

export function satisfiesCompilerAuthority(result:CompileResult|undefined,required:CompilerAuthority='educational'){
  const actual=compileResultAuthority(result);
  if(!actual)return false;
  return required==='educational'||actual==='real-tex';
}