import type { Diagnostic } from '../types';

export const EDITOR_DIAGNOSTIC_NAVIGATE='latex-gym:navigate-diagnostic';

export type EditorDiagnosticNavigateDetail={diagnostic:Diagnostic};

export function diagnosticFitsSource(diagnostic:Diagnostic,source:string){
  if(!Number.isInteger(diagnostic.line)||diagnostic.line<1)return false;
  return diagnostic.line<=Math.max(1,source.split('\n').length);
}

export function requestDiagnosticNavigation(diagnostic:Diagnostic){
  window.dispatchEvent(new CustomEvent<EditorDiagnosticNavigateDetail>(EDITOR_DIAGNOSTIC_NAVIGATE,{detail:{diagnostic}}));
}
