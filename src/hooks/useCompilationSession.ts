import { useCallback, useState } from 'react';
import { compiler } from '../services/compiler';
import { isCompilationBusy } from '../services/compilerState';
import type { CompilationState, CompileOptions, CompileResult, CompilerProject } from '../types';

type FailureFactory=(error:unknown)=>CompileResult;

export function useCompilationSession(failureFactory:FailureFactory){
  const [result,setResult]=useState<CompileResult|null>(null);
  const [state,setState]=useState<CompilationState>('ready');
  const busy=isCompilationBusy(state);

  const run=useCallback(async(input:string|CompilerProject,options:Omit<CompileOptions,'onPhase'>={})=>{
    setState('queued');
    try{
      const compiled=await compiler.compile(input,{...options,onPhase:setState});
      setResult(compiled);
      return compiled;
    }catch(error){
      setState('error');
      const failed=failureFactory(error);setResult(failed);return null;
    }
  },[failureFactory]);

  const invalidate=useCallback(()=>{setResult(null);setState('ready');},[]);
  const reset=useCallback(()=>{setResult(null);setState('ready');},[]);
  return {result,setResult,state,setState,busy,run,invalidate,reset};
}
