import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CompileResult, CompilerProject } from '../types';
import { EducationalPreviewCompiler, isCompilerCancellation } from './compiler';

const project:CompilerProject={mainFile:'main.tex',files:[{path:'main.tex',content:'\\documentclass{article}\\begin{document}Text\\end{document}'}]};

class FakeWorker{
  static instances:FakeWorker[]=[];
  onmessage:((event:{data:{id:number;result:CompileResult}})=>void)|null=null;
  onerror:(()=>void)|null=null;
  terminated=false;
  messages:unknown[]=[];
  constructor(){FakeWorker.instances.push(this);}
  postMessage(message:unknown){this.messages.push(message);}
  terminate(){this.terminated=true;}
}

describe('educational compiler cancellation',()=>{
  afterEach(()=>{vi.unstubAllGlobals();FakeWorker.instances=[];});

  it('terminates the busy educational worker on abort and creates a fresh worker for the next compile',async()=>{
    vi.stubGlobal('Worker',FakeWorker);
    vi.stubGlobal('window',{setTimeout:globalThis.setTimeout.bind(globalThis),clearTimeout:globalThis.clearTimeout.bind(globalThis)});
    const provider=new EducationalPreviewCompiler();
    const controller=new AbortController();
    const first=provider.compile(project,{signal:controller.signal});
    expect(FakeWorker.instances).toHaveLength(1);
    controller.abort('superseded');
    await expect(first).rejects.toSatisfy(isCompilerCancellation);
    expect(FakeWorker.instances[0].terminated).toBe(true);

    const second=provider.compile(project);
    expect(FakeWorker.instances).toHaveLength(2);
    const worker=FakeWorker.instances[1];
    const request=worker.messages[0] as {id:number};
    worker.onmessage?.({data:{id:request.id,result:{ok:true,diagnostics:[],blocks:[],elapsedMs:1,engine:'educational-preview'}}});
    await expect(second).resolves.toMatchObject({ok:true,providerId:'educational-preview'});
    provider.dispose();
  });
});
