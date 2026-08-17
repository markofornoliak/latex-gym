import type { Diagnostic } from '../types';
import { educateDiagnostic } from './diagnosticEducation';

export type FullCompileFile={path:string;contents:string|Uint8Array};
export type FullCompileStatus='loading-engine'|'ready'|'compiling';
export type FullCompileResult={ok:boolean;pdf?:Uint8Array;log:string;exitCode:number;elapsedMs:number;diagnostics:Diagnostic[]};
type BusyTexMessage={print?:string;pdf?:Uint8Array|null;log?:string|null};
type PendingCompilation={resolve:(result:FullCompileResult)=>void;reject:(error:Error)=>void;started:number;logLines:string[];timer:number};
const FULL_TEX_DIR='full-tex/';
const COMPILE_TIMEOUT_MS=300_000;
const RELEASE_ASSETS=['busytex_worker.js','busytex_pipeline.js','busytex.js','busytex.wasm','texlive-basic.js','texlive-basic.data','ubuntu-texlive-latex-base.js','ubuntu-texlive-latex-base.data','ubuntu-texlive-latex-recommended.js','ubuntu-texlive-latex-recommended.data','ubuntu-texlive-latex-extra.js','ubuntu-texlive-latex-extra.data'] as const;

export class FullCompiler{
  private worker:Worker|null=null;
  private initialized:Promise<void>|null=null;
  private pending:PendingCompilation|null=null;
  private statusListener:((status:FullCompileStatus)=>void)|undefined;

  async compile(files:FullCompileFile[],mainFile:string,onStatus?:(status:FullCompileStatus)=>void):Promise<FullCompileResult>{
    if(this.pending)throw new Error('Полная сборка уже выполняется.');
    this.statusListener=onStatus;
    onStatus?.('loading-engine');
    await this.ensureReady();
    onStatus?.('compiling');
    const worker=this.worker;
    if(!worker)throw new Error('TeX worker недоступен.');
    return new Promise<FullCompileResult>((resolve,reject)=>{
      const timer=window.setTimeout(()=>{
        if(!this.pending)return;
        this.pending=null;
        this.resetWorker();
        reject(new Error('Полная TeX-сборка превысила допустимое время. Движок был перезапущен; повторите сборку.'));
      },COMPILE_TIMEOUT_MS);
      this.pending={resolve,reject,started:performance.now(),logLines:[],timer};
      worker.postMessage({files:files.map(file=>({path:file.path,contents:file.contents})),main_tex_path:mainFile,verbose:'silent',bibtex:null});
    }).finally(()=>{this.statusListener=undefined;});
  }

  dispose(){
    if(this.pending){window.clearTimeout(this.pending.timer);this.pending.reject(new Error('Полная сборка остановлена.'));this.pending=null;}
    this.resetWorker();
  }

  private async ensureReady(){
    if(this.initialized)return this.initialized;
    this.initialized=(async()=>{
      const base=fullTexBaseUrl();
      if(!await fullTexAssetsAvailable(base))throw new Error('Движок полной сборки не установлен в этой версии приложения.');
      const worker=new Worker(`${base}busytex_worker.js`);
      worker.addEventListener('message',event=>this.handleMessage(event.data as BusyTexMessage));
      worker.addEventListener('error',event=>this.handleWorkerError(new Error(event.message||'Ошибка TeX worker.')));
      this.worker=worker;
      const texliveJs=[`${base}texlive-basic.js`,`${base}ubuntu-texlive-latex-base.js`,`${base}ubuntu-texlive-latex-recommended.js`,`${base}ubuntu-texlive-latex-extra.js`];
      // This project pins BusyTeX build_b16fdf... . Its worker protocol expects
      // busytex_wasm + busytex_js + texlive_js; newer wrapper field names are not compatible.
      worker.postMessage({busytex_js:`${base}busytex.js`,busytex_wasm:`${base}busytex.wasm`,texlive_js:texliveJs,texmf_local:[],preload:true,verbose:'silent'});
      await Promise.resolve();
      this.statusListener?.('ready');
    })().catch(error=>{this.resetWorker();throw error;});
    return this.initialized;
  }

  private handleMessage(message:BusyTexMessage){
    if(message.print){if(this.pending)this.pending.logLines.push(message.print);return;}
    if(!this.pending||(!Object.prototype.hasOwnProperty.call(message,'pdf')&&!Object.prototype.hasOwnProperty.call(message,'log')))return;
    const pending=this.pending;
    this.pending=null;
    window.clearTimeout(pending.timer);
    const log=[message.log??'',...pending.logLines].filter(Boolean).join('\n');
    const pdf=message.pdf&&message.pdf.byteLength?message.pdf:undefined;
    // The pinned BusyTeX worker returns {pdf, log}, not an exit code. A produced PDF is
    // therefore the authoritative success signal; absence of PDF is treated as failure.
    const exitCode=pdf?0:1;
    pending.resolve({ok:Boolean(pdf),pdf,log,exitCode,elapsedMs:Math.max(0,performance.now()-pending.started),diagnostics:parseTeXLog(log,exitCode)});
  }

  private handleWorkerError(error:Error){
    if(this.pending){const pending=this.pending;this.pending=null;window.clearTimeout(pending.timer);pending.reject(error);}
    this.resetWorker();
  }

  private resetWorker(){this.worker?.terminate();this.worker=null;this.initialized=null;}
}

export const fullCompiler=new FullCompiler();
export function fullTexBaseUrl(){const base=import.meta.env.BASE_URL.endsWith('/')?import.meta.env.BASE_URL:`${import.meta.env.BASE_URL}/`;return `${base}${FULL_TEX_DIR}`;}
export async function fullTexAssetsAvailable(base=fullTexBaseUrl()){try{const response=await fetch(`${base}manifest.json`,{method:'GET',cache:'force-cache'});if(!response.ok)return false;const manifest=await response.json() as {assets?:Record<string,{size?:number}>};return RELEASE_ASSETS.every(name=>(manifest.assets?.[name]?.size??0)>0);}catch{return false;}}

export function parseTeXLog(log:string,exitCode=0):Diagnostic[]{
  const diagnostics:Diagnostic[]=[];const lines=log.split(/\r?\n/);
  for(let index=0;index<lines.length;index++){
    const line=lines[index];
    if(line.startsWith('! ')){const message=line.slice(2).trim();const location=findTeXErrorLine(lines,index);diagnostics.push({severity:'error',line:location,message,rawMessage:message,explanation:explainTeXError(message),suggestion:'Исправьте эту первую содержательную ошибку и соберите документ снова: несколько последующих сообщений могут исчезнуть вместе с ней.'});continue;}
    const warning=line.match(/(?:LaTeX|Package \S+) Warning:\s*(.+?)(?:\s+on input line\s+(\d+))?\.?$/i);if(warning){diagnostics.push({severity:'warning',line:Number(warning[2]??1),message:warning[1].trim(),rawMessage:line.trim(),explanation:'Сборка продолжилась, но TeX сообщает о состоянии, которое стоит проверить перед публикацией.'});continue;}
    const overfull=line.match(/Overfull \\hbox .*? at lines? (\d+)(?:--(\d+))?/);if(overfull)diagnostics.push({severity:'warning',line:Number(overfull[1]),message:'Overfull \\hbox',rawMessage:line.trim(),explanation:'Строка вышла за допустимую ширину набора.',suggestion:'Сначала проверьте длинные формулы, URL, неразрывные фрагменты и ручные интервалы; не маскируйте причину случайным уменьшением шрифта.'});
    const underfull=line.match(/Underfull \\hbox .*? at lines? (\d+)(?:--(\d+))?/);if(underfull)diagnostics.push({severity:'info',line:Number(underfull[1]),message:'Underfull \\hbox',rawMessage:line.trim(),explanation:'TeX не смог заполнить строку с обычным качеством интервалов. Это не всегда ошибка, но в финальном документе результат нужно осмотреть.'});
  }
  const unique=dedupe(diagnostics);if(exitCode!==0&&!unique.some(item=>item.severity==='error'))unique.unshift({severity:'error',line:1,message:'Полная TeX-сборка остановлена.',rawMessage:`TeX exit code ${exitCode}`,explanation:'Движок завершился с ошибкой, но стандартный шаблон TeX-диагностики не был найден.',suggestion:'Откройте полный log и найдите самое раннее сообщение перед остановкой.'});return unique.map(educateDiagnostic);
}
export const fullTexReleaseAssets=[...RELEASE_ASSETS];
function findTeXErrorLine(lines:string[],errorIndex:number){for(let index=errorIndex+1;index<Math.min(lines.length,errorIndex+8);index++){const match=lines[index].match(/^l\.(\d+)\b/);if(match)return Number(match[1]);}return 1;}
function explainTeXError(message:string){const lower=message.toLowerCase();if(lower.includes('undefined control sequence'))return 'TeX встретил управляющую последовательность, которой нет в текущем наборе определений: это часто опечатка или команда из неподключённого пакета.';if(lower.includes('missing }')||lower.includes('runaway argument'))return 'TeX потерял границу аргумента или группы. Ошибка могла начаться раньше строки, на которой компилятор окончательно перестал понимать структуру.';if(lower.includes('missing $'))return 'Текстовый и математический режимы оказались несогласованы. Проверьте ближайшую границу математического фрагмента, а не только строку сообщения.';if(lower.includes('extra alignment tab'))return 'В строке табличной или выровненной структуры оказалось больше разделителей &, чем допускает текущая модель столбцов.';if(lower.includes('file')&&lower.includes('not found'))return 'TeX не нашёл файл по указанному пути. В многофайловом проекте путь считается относительно собираемого корневого файла.';return 'Это сообщение пришло от настоящего TeX-движка. Начинайте с самой ранней содержательной ошибки: поздние сообщения часто являются каскадом одной причины.';}
function dedupe(items:Diagnostic[]){const seen=new Set<string>();return items.filter(item=>{const key=`${item.severity}:${item.line}:${item.message}`;if(seen.has(key))return false;seen.add(key);return true;});}
