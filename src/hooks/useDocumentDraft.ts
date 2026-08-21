import { useCallback, useEffect, useRef, useState } from 'react';
import { documentRepository } from '../services/documentRepository';

type Options={key:string;initialValue:string;normalizeLoaded?:(saved:string|undefined)=>string;debounceMs?:number};

export function useDocumentDraft({key,initialValue,normalizeLoaded,debounceMs=280}:Options){
  const normalizeRef=useRef(normalizeLoaded);normalizeRef.current=normalizeLoaded;
  const [value,setValueState]=useState(initialValue);
  const [saved,setSaved]=useState(true);
  const [saveError,setSaveError]=useState<string|null>(null);
  const [loaded,setLoaded]=useState(false);
  const generation=useRef(0);
  const editedBeforeHydration=useRef(false);

  useEffect(()=>{
    const current=++generation.current;
    editedBeforeHydration.current=false;
    setLoaded(false);setSaved(true);setSaveError(null);setValueState(initialValue);
    void documentRepository.get(key).then(stored=>{
      if(current!==generation.current)return;
      if(!editedBeforeHydration.current)setValueState(normalizeRef.current?normalizeRef.current(stored):(stored??initialValue));
      setLoaded(true);setSaved(!editedBeforeHydration.current);
    }).catch(error=>{if(current===generation.current){setLoaded(true);setSaved(false);setSaveError(errorMessage(error));}});
  },[key,initialValue]);

  useEffect(()=>{
    if(!loaded)return;
    const current=generation.current;
    setSaved(false);setSaveError(null);
    const timer=window.setTimeout(()=>{void documentRepository.set(key,value).then(()=>{if(current===generation.current){setSaved(true);setSaveError(null);}},error=>{if(current===generation.current){setSaved(false);setSaveError(errorMessage(error));}});},debounceMs);
    return()=>window.clearTimeout(timer);
  },[key,value,loaded,debounceMs]);

  const setValue=useCallback((next:string)=>{if(!loaded)editedBeforeHydration.current=true;setValueState(next);},[loaded]);
  const saveNow=useCallback(async()=>{setSaved(false);setSaveError(null);try{await documentRepository.set(key,value);setSaved(true);}catch(error){setSaved(false);setSaveError(errorMessage(error));}},[key,value]);
  const reset=useCallback((next=initialValue)=>setValueState(next),[initialValue]);
  return {value,setValue,saved,saveError,loaded,saveNow,reset};
}

function errorMessage(error:unknown){return error instanceof Error?error.message:'Не удалось сохранить документ в локальном хранилище.';}