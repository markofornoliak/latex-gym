import { useCallback, useEffect, useRef, useState } from 'react';
import { compiler, isCompilerCancellation } from '../services/compiler';
import { isCompilationBusy } from '../services/compilerState';
import type { CompilationState, CompileOptions, CompileResult, CompilerProject } from '../types';

type FailureFactory=(error:unknown)=>CompileResult;

export function useCompilationSession(failureFactory:FailureFactory){
  const [result,setResult]=useState<CompileResult|null>(null);
  const [state,setState]=useState<CompilationState>('ready');
  const generation=useRef(0);
  const busy=isCompilationBusy(state);

  const invalidateRequest=useCallback((cancel=true)=>{
    generation.current+=1;
    if(cancel)compiler.cancel('Source changed before compilation completed');
  },[]);

  const run=useCallback(async(input:string|CompilerProject,options:Omit<CompileOptions,'onPhase'>={})=>{
    const request=++generation.current;
    setState('queued');
    try{
      const compiled=await compiler.compile(input,{...options,onPhase:phase=>{if(request===generation.current)setState(phase);}});
      if(request!==generation.current)return null;
      setResult(compiled);
      return compiled;
    }catch(error){
      if(request!==generation.current||isCompilerCancellation(error))return null;
      setState('error');
      const failed=failureFactory(error);setResult(failed);return null;
    }
  },[failureFactory]);

  const invalidate=useCallback(()=>{invalidateRequest();setResult(null);setState('ready');},[invalidateRequest]);
  const reset=useCallback(()=>{invalidateRequest();setResult(null);setState('ready');},[invalidateRequest]);
  useEffect(()=>()=>{invalidateRequest();},[invalidateRequest]);
  return {result,setResult,state,setState,busy,run,invalidate,reset};
}
