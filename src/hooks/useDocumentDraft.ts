import { useCallback, useEffect, useRef, useState } from 'react';
import { documentRepository } from '../services/documentRepository';

type Options={
  key:string;
  initialValue:string;
  normalizeLoaded?:(saved:string|undefined)=>string;
  debounceMs?:number;
};

export function useDocumentDraft({key,initialValue,normalizeLoaded,debounceMs=280}:Options){
  const normalizeRef=useRef(normalizeLoaded);normalizeRef.current=normalizeLoaded;
  const [value,setValueState]=useState(initialValue);
  const [saved,setSaved]=useState(true);
  const [loaded,setLoaded]=useState(false);
  const generation=useRef(0);

  useEffect(()=>{
    const current=++generation.current;
    setLoaded(false);setSaved(true);setValueState(initialValue);
    void documentRepository.get(key).then(stored=>{
      if(current!==generation.current)return;
      setValueState(normalizeRef.current?normalizeRef.current(stored):(stored??initialValue));
      setLoaded(true);setSaved(true);
    }).catch(()=>{if(current===generation.current){setLoaded(true);setSaved(true);}});
  },[key,initialValue]);

  useEffect(()=>{
    if(!loaded)return;
    setSaved(false);
    const timer=window.setTimeout(()=>{void documentRepository.set(key,value).then(()=>setSaved(true));},debounceMs);
    return()=>window.clearTimeout(timer);
  },[key,value,loaded,debounceMs]);

  const setValue=useCallback((next:string)=>setValueState(next),[]);
  const saveNow=useCallback(async()=>{await documentRepository.set(key,value);setSaved(true);},[key,value]);
  const reset=useCallback((next=initialValue)=>{setValueState(next);},[initialValue]);
  return {value,setValue,saved,loaded,saveNow,reset};
}
