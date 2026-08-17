import type { CompileResult } from '../types';
import { fullCompiler } from './fullCompiler';

export type CompilerCapability='instant-preview'|'real-tex'|'multi-file'|'pdf'|'external-files';
export interface LatexCompiler {
  readonly id:'educational-preview'|'wasm-tex';
  readonly capabilities:ReadonlySet<CompilerCapability>;
  compile(source:string):Promise<CompileResult>;
}

type WorkerResponse={id:number;result:CompileResult};
export class EducationalCompiler implements LatexCompiler{
  readonly id='educational-preview' as const;
  readonly capabilities=new Set<CompilerCapability>(['instant-preview']);
  private worker:Worker|null=null;private seq=0;
  private pending=new Map<number,{resolve:(result:CompileResult)=>void;reject:(error:Error)=>void;timer:number}>();
  private ensureWorker(){
    if(this.worker)return this.worker;
    this.worker=new Worker(new URL('./compiler.worker.ts',import.meta.url),{type:'module'});
    this.worker.onmessage=(event:MessageEvent<WorkerResponse>)=>{const pending=this.pending.get(event.data.id);if(!pending)return;window.clearTimeout(pending.timer);pending.resolve(event.data.result);this.pending.delete(event.data.id);};
    this.worker.onerror=()=>{for(const item of this.pending.values()){window.clearTimeout(item.timer);item.reject(new Error('Compiler worker failed'));}this.pending.clear();this.worker?.terminate();this.worker=null;};
    return this.worker;
  }
  compile(source:string):Promise<CompileResult>{const worker=this.ensureWorker();const id=++this.seq;return new Promise((resolve,reject)=>{const timer=window.setTimeout(()=>{this.pending.delete(id);reject(new Error('Compilation timed out'));},8000);this.pending.set(id,{resolve,reject,timer});worker.postMessage({id,source});});}
}

export class WasmTexCompilerProvider implements LatexCompiler{
  readonly id='wasm-tex' as const;
  readonly capabilities=new Set<CompilerCapability>(['real-tex','multi-file','pdf','external-files']);
  async compile(source:string):Promise<CompileResult>{
    const result=await fullCompiler.compile([{path:'main.tex',contents:source}],'main.tex');
    return {ok:result.ok,diagnostics:result.diagnostics,blocks:[],elapsedMs:result.elapsedMs,engine:'wasm-tex'};
  }
}

export const compiler:LatexCompiler=new EducationalCompiler();
export const realTexCompiler:LatexCompiler=new WasmTexCompilerProvider();
export function compilerFor(requirement:'educational-preview'|'real-tex'='educational-preview'){return requirement==='real-tex'?realTexCompiler:compiler;}
