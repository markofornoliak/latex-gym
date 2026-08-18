import type {
  CompileOptions,
  CompileResult,
  CompilerCapabilities,
  CompilerPhase,
  CompilerProject,
  CompilerProjectFile
} from '../types';
import { diagnoseLatex, parseTexLog } from './compilerDiagnostics';

export interface CompilerProvider {
  readonly id:string;
  readonly capabilities:CompilerCapabilities;
  compile(project:CompilerProject,options?:CompileOptions):Promise<CompileResult>;
  dispose?():void;
}

export interface LatexCompiler {
  compile(input:string|CompilerProject,options?:CompileOptions):Promise<CompileResult>;
  getPrimaryCapabilities():CompilerCapabilities;
  getFallbackCapabilities():CompilerCapabilities;
}

type EducationalWorkerResponse={id:number;result:CompileResult};
type PendingEducational={resolve:(result:CompileResult)=>void;reject:(error:Error)=>void;timer:number};

const EDUCATIONAL_CAPABILITIES:CompilerCapabilities={
  realPdf:false,engines:[],multiFile:false,bibtex:false,biber:false,multiplePasses:false,synctex:false,shellEscape:false,offline:true
};

export class EducationalPreviewCompiler implements CompilerProvider {
  readonly id='educational-preview';
  readonly capabilities=EDUCATIONAL_CAPABILITIES;
  private worker:Worker|null=null;
  private seq=0;
  private pending=new Map<number,PendingEducational>();

  private ensureWorker(){
    if(this.worker)return this.worker;
    this.worker=new Worker(new URL('./compiler.worker.ts',import.meta.url),{type:'module'});
    this.worker.onmessage=(event:MessageEvent<EducationalWorkerResponse>)=>{
      const pending=this.pending.get(event.data.id);
      if(!pending)return;
      window.clearTimeout(pending.timer);
      pending.resolve({...event.data.result,providerId:this.id,capabilities:this.capabilities});
      this.pending.delete(event.data.id);
    };
    this.worker.onerror=()=>this.failAll(new Error('Educational preview worker failed'));
    return this.worker;
  }

  compile(project:CompilerProject):Promise<CompileResult>{
    const source=mainSource(project);
    const worker=this.ensureWorker();
    const id=++this.seq;
    return new Promise((resolve,reject)=>{
      const timer=window.setTimeout(()=>{
        this.pending.delete(id);
        reject(new Error('Educational preview timed out'));
      },8000);
      this.pending.set(id,{resolve,reject,timer});
      worker.postMessage({id,source});
    });
  }

  dispose(){this.failAll(new Error('Educational preview disposed'));}

  private failAll(error:Error){
    for(const item of this.pending.values()){
      window.clearTimeout(item.timer);
      item.reject(error);
    }
    this.pending.clear();
    this.worker?.terminate();
    this.worker=null;
  }
}

// Backwards-compatible export for code/tests that used the former name.
export class EducationalCompiler extends EducationalPreviewCompiler {}

type BusyTexRawResult={
  pdf?:Uint8Array|null;
  log?:string;
  exit_code?:number;
  logs?:Array<{cmd?:string;log?:string;stdout?:string;stderr?:string;aux?:string;exit_code?:number}>;
};

type BusyTexWorkerMessage=
  | {type:'initialized';versions?:Record<string,string>}
  | {type:'progress';message:string}
  | {type:'compile-result';requestId:number;result:BusyTexRawResult}
  | {type:'runtime-error';requestId?:number;message:string;stack?:string};

type PendingReal={
  resolve:(result:BusyTexRawResult)=>void;
  reject:(error:Error)=>void;
  timer:number;
  onPhase?:(phase:CompilerPhase)=>void;
  texRuns:number;
  bibliographySeen:boolean;
};

export const REAL_TEX_CAPABILITIES:CompilerCapabilities={
  realPdf:true,
  engines:['pdflatex','xelatex','lualatex'],
  multiFile:true,
  bibtex:true,
  biber:false,
  multiplePasses:true,
  synctex:false,
  shellEscape:false,
  // Runtime assets are fetched lazily. Browser caching may help later, but full
  // offline availability is deliberately not claimed.
  offline:false
};

export class WasmTexCompilerProvider implements CompilerProvider {
  readonly id='busytex-wasm';
  readonly capabilities=REAL_TEX_CAPABILITIES;
  private worker:Worker|null=null;
  private initPromise:Promise<void>|null=null;
  private initResolve:(()=>void)|null=null;
  private initReject:((error:Error)=>void)|null=null;
  private initTimer:number|null=null;
  private seq=0;
  private pending=new Map<number,PendingReal>();
  private activeRequestId:number|null=null;

  async compile(project:CompilerProject,options:CompileOptions={}):Promise<CompileResult>{
    const started=performance.now();
    const source=mainSource(project);
    const unsupported=unsupportedBibliography(source);
    if(unsupported){
      options.onPhase?.('error');
      return {
        ok:false,diagnostics:[{
          severity:'error',line:unsupported.line,message:'Biber недоступен в браузерном TeX-движке',
          explanation:'Документ требует Biber. Текущий локальный WASM-провайдер поддерживает BibTeX, но не Biber.',
          suggestion:'Для этой сборки используйте совместимый BibTeX-workflow или внешний TeX/Biber toolchain. LaTeX Gym не будет имитировать успешную сборку.',
          source:'latex-gym',relatedConcept:'biber',originalCompilerMessage:'Unsupported capability: Biber'
        }],blocks:[],elapsedMs:Math.max(1,Math.round(performance.now()-started)),engine:options.engine??'pdflatex',providerId:this.id,capabilities:this.capabilities,rawLog:'Biber is not supported by the current BusyTeX WASM provider.'
      };
    }

    options.onPhase?.('initializing');
    await this.ensureInitialized();
    options.onPhase?.('compiling');

    const engine=options.engine??'pdflatex';
    const driver=engine==='xelatex'?'xetex_bibtex8_dvipdfmx':engine==='lualatex'?'luahbtex_bibtex8':'pdftex_bibtex8';
    const files=project.files.map(file=>({path:file.path,contents:file.content}));
    const bibliography=options.bibliography==='none'?false:options.bibliography==='bibtex'?true:null;
    const raw=await this.runCompile({files,mainFile:project.mainFile,bibtex:bibliography,driver,onPhase:options.onPhase});
    const rawLog=raw.log??raw.logs?.map(item=>[item.cmd,item.log,item.stdout,item.stderr].filter(Boolean).join('\n')).join('\n\n')??'';
    const diagnostics=parseTexLog(rawLog,source);
    const ok=Boolean(raw.pdf&&raw.pdf.length)&&Number(raw.exit_code??0)===0;
    const finalDiagnostics=diagnostics.length||ok?diagnostics:diagnoseLatex(source);
    const pdf=raw.pdf??undefined;
    const elapsedMs=Math.max(1,Math.round(performance.now()-started));
    options.onPhase?.(ok?(finalDiagnostics.some(item=>item.severity==='warning')?'warning':'success'):'error');

    return {
      ok,
      diagnostics:finalDiagnostics,
      blocks:[],
      elapsedMs,
      engine,
      providerId:this.id,
      pdf:pdf??undefined,
      rawLog,
      artifacts:[
        ...(pdf?[{name:'main.pdf',type:'pdf' as const,bytes:pdf}]:[]),
        {name:'main.log',type:'log' as const,text:rawLog}
      ],
      capabilities:this.capabilities
    };
  }

  dispose(){
    for(const item of this.pending.values()){
      window.clearTimeout(item.timer);
      item.reject(new Error('Real TeX compiler disposed'));
    }
    this.pending.clear();
    if(this.initTimer!==null)window.clearTimeout(this.initTimer);
    this.worker?.terminate();
    this.worker=null;this.initPromise=null;this.activeRequestId=null;
  }

  private ensureWorker(){
    if(this.worker)return this.worker;
    const workerUrl=`${import.meta.env.BASE_URL}busytex.worker.js`;
    this.worker=new Worker(workerUrl);
    this.worker.onmessage=(event:MessageEvent<BusyTexWorkerMessage>)=>this.handleMessage(event.data);
    this.worker.onerror=()=>this.handleFatal(new Error('BusyTeX worker failed to load'));
    return this.worker;
  }

  private ensureInitialized(){
    if(this.initPromise)return this.initPromise;
    const worker=this.ensureWorker();
    this.initPromise=new Promise<void>((resolve,reject)=>{
      this.initResolve=resolve;this.initReject=reject;
      this.initTimer=window.setTimeout(()=>this.handleFatal(new Error('BusyTeX initialization timed out')),50000);
      worker.postMessage({type:'initialize'});
    });
    return this.initPromise;
  }

  private runCompile(input:{files:Array<{path:string;contents:string|Uint8Array}>;mainFile:string;bibtex:boolean|null;driver:string;onPhase?:CompileOptions['onPhase']}){
    const worker=this.ensureWorker();
    const requestId=++this.seq;
    return new Promise<BusyTexRawResult>((resolve,reject)=>{
      const timer=window.setTimeout(()=>{
        this.pending.delete(requestId);
        if(this.activeRequestId===requestId)this.activeRequestId=null;
        reject(new Error('Real TeX compilation timed out'));
      },90000);
      this.pending.set(requestId,{resolve,reject,timer,onPhase:input.onPhase,texRuns:0,bibliographySeen:false});
      this.activeRequestId=requestId;
      worker.postMessage({type:'compile',requestId,files:input.files,mainFile:input.mainFile,bibtex:input.bibtex,driver:input.driver});
    });
  }

  private handleMessage(message:BusyTexWorkerMessage){
    if(message.type==='initialized'){
      if(this.initTimer!==null)window.clearTimeout(this.initTimer);
      this.initTimer=null;this.initResolve?.();this.initResolve=null;this.initReject=null;
      return;
    }
    if(message.type==='progress'){
      const pending=this.activeRequestId===null?undefined:this.pending.get(this.activeRequestId);
      if(!pending)return;
      if(/\$ busytex bibtex8\b/.test(message.message)){
        pending.bibliographySeen=true;pending.onPhase?.('running-bibliography');return;
      }
      if(/\$ busytex (?:pdf|xe|lua(?:hb)?)latex\b/.test(message.message)){
        pending.texRuns++;
        pending.onPhase?.(pending.texRuns>1?'recompiling':'compiling');
      }
      return;
    }
    if(message.type==='compile-result'){
      const pending=this.pending.get(message.requestId);
      if(!pending)return;
      window.clearTimeout(pending.timer);this.pending.delete(message.requestId);
      if(this.activeRequestId===message.requestId)this.activeRequestId=null;
      pending.resolve(message.result);
      return;
    }
    if(message.type==='runtime-error'){
      const error=new Error(message.message);
      if(message.requestId!==undefined){
        const pending=this.pending.get(message.requestId);
        if(pending){window.clearTimeout(pending.timer);this.pending.delete(message.requestId);pending.reject(error);}
        if(this.activeRequestId===message.requestId)this.activeRequestId=null;
      }else this.handleFatal(error);
    }
  }

  private handleFatal(error:Error){
    if(this.initTimer!==null)window.clearTimeout(this.initTimer);
    this.initTimer=null;this.initReject?.(error);this.initResolve=null;this.initReject=null;this.initPromise=null;
    for(const item of this.pending.values()){
      window.clearTimeout(item.timer);item.reject(error);
    }
    this.pending.clear();this.activeRequestId=null;
    this.worker?.terminate();this.worker=null;
  }
}

class CompilerManager implements LatexCompiler {
  private readonly real=new WasmTexCompilerProvider();
  private readonly fallback=new EducationalPreviewCompiler();
  private realUnavailableUntil=0;

  getPrimaryCapabilities(){return this.real.capabilities;}
  getFallbackCapabilities(){return this.fallback.capabilities;}

  async compile(input:string|CompilerProject,options:CompileOptions={}):Promise<CompileResult>{
    const project=typeof input==='string'?singleFileProject(input):input;
    const canTryReal=typeof Worker!=='undefined'&&!(typeof navigator!=='undefined'&&navigator.onLine===false)&&Date.now()>=this.realUnavailableUntil;
    if(canTryReal){
      try{return await this.real.compile(project,options);}
      catch(error){
        this.realUnavailableUntil=Date.now()+60_000;
        return this.compileFallback(project,options,error);
      }
    }
    const reason=typeof navigator!=='undefined'&&navigator.onLine===false?'Реальный TeX-движок недоступен офлайн, пока его runtime не загружен.':'Реальный TeX-движок временно недоступен.';
    return this.compileFallback(project,options,new Error(reason));
  }

  private async compileFallback(project:CompilerProject,options:CompileOptions,error:unknown){
    options.onPhase?.('compiling');
    const fallback=await this.fallback.compile(project);
    const fallbackReason=error instanceof Error?error.message:String(error);
    const diagnostic={
      severity:'info' as const,line:1,message:'Использован учебный предпросмотр',
      explanation:'Полная TeX-сборка сейчас недоступна. LaTeX Gym явно переключился на быстрый образовательный fallback; это не PDF-компиляция.',
      suggestion:'Когда реальный движок станет доступен, повторите компиляцию для проверки полного TeX toolchain.',source:'latex-gym' as const,originalCompilerMessage:fallbackReason
    };
    const diagnostics=[...fallback.diagnostics,diagnostic];
    options.onPhase?.(fallback.ok?(diagnostics.some(item=>item.severity==='warning')?'warning':'success'):'error');
    return {...fallback,diagnostics,fallbackReason,providerId:this.fallback.id,capabilities:this.fallback.capabilities};
  }
}

export const compiler:LatexCompiler=new CompilerManager();

function singleFileProject(source:string):CompilerProject{return {mainFile:'main.tex',files:[{path:'main.tex',content:source}]};}
function mainSource(project:CompilerProject){
  const file=project.files.find(item=>item.path===project.mainFile)??project.files[0];
  return typeof file?.content==='string'?file.content:new TextDecoder().decode(file?.content??new Uint8Array());
}

function unsupportedBibliography(source:string){
  const usesBiblatex=/\\usepackage(?:\[[^\]]*\])?\{biblatex\}/.test(source);
  const explicitlyBibtex=/\\usepackage\[[^\]]*backend\s*=\s*bibtex[^\]]*\]\{biblatex\}/.test(source);
  const explicitlyBiber=/\\usepackage\[[^\]]*backend\s*=\s*biber[^\]]*\]\{biblatex\}/.test(source);
  if(explicitlyBiber||(usesBiblatex&&!explicitlyBibtex)){
    const index=Math.max(0,source.search(/\\usepackage(?:\[[^\]]*\])?\{biblatex\}/));
    return {line:source.slice(0,index).split('\n').length};
  }
  return null;
}

export function createCompilerProject(mainFile:string,files:CompilerProjectFile[]):CompilerProject{return {mainFile,files};}
