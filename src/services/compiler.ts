import type { CompileResult } from '../types';

export interface LatexCompiler {
  readonly id: string;
  compile(source: string): Promise<CompileResult>;
}

type WorkerResponse = { id:number; result:CompileResult };

export class EducationalCompiler implements LatexCompiler {
  readonly id = 'educational-preview';
  private worker: Worker | null = null;
  private seq = 0;
  private pending = new Map<number,{resolve:(result:CompileResult)=>void; reject:(error:Error)=>void; timer:number}>();

  private ensureWorker() {
    if (this.worker) return this.worker;
    this.worker = new Worker(new URL('./compiler.worker.ts', import.meta.url), { type:'module' });
    this.worker.onmessage = (event:MessageEvent<WorkerResponse>) => {
      const pending = this.pending.get(event.data.id);
      if (!pending) return;
      window.clearTimeout(pending.timer);
      pending.resolve(event.data.result);
      this.pending.delete(event.data.id);
    };
    this.worker.onerror = () => {
      for (const item of this.pending.values()) {
        window.clearTimeout(item.timer);
        item.reject(new Error('Compiler worker failed'));
      }
      this.pending.clear();
      this.worker?.terminate();
      this.worker = null;
    };
    return this.worker;
  }

  compile(source:string):Promise<CompileResult> {
    const worker = this.ensureWorker();
    const id = ++this.seq;
    return new Promise((resolve,reject)=>{
      const timer = window.setTimeout(()=>{
        this.pending.delete(id);
        reject(new Error('Compilation timed out'));
      }, 8000);
      this.pending.set(id,{resolve,reject,timer});
      worker.postMessage({id,source});
    });
  }
}

export class WasmTexCompilerProvider implements LatexCompiler {
  readonly id = 'wasm-tex';
  async compile(_source:string):Promise<CompileResult> {
    throw new Error('Полный TeX/WASM-движок не включён в лёгкую статическую сборку. Интерфейс провайдера готов для подключения отдельного WASM-бандла.');
  }
}

export const compiler: LatexCompiler = new EducationalCompiler();
