import type { CompileResult, CompilerProject, Diagnostic } from '../types';

/**
 * Adds only diagnostic context that can be supported by the actual TeX log.
 * Filename inference is deliberately conservative: if the log does not name a
 * project file near the diagnostic, the file remains unset rather than guessed.
 */
export function contextualizeProjectDiagnostics(result:CompileResult,project:CompilerProject):CompileResult{
  if(!result.diagnostics.length)return result;
  const textFiles=project.files.filter(file=>typeof file.content==='string'&&/\.(?:tex|sty|cls|bib)$/i.test(file.path));
  const cascade=classifyCascade(result.diagnostics);
  const diagnostics=result.diagnostics.map((diagnostic,index)=>{
    const file=diagnostic.file??inferDiagnosticFile(result.rawLog??'',diagnostic,textFiles.map(item=>item.path),project.mainFile);
    const cascadeLabel=diagnostic.severity==='error'?(cascade.get(index)??diagnostic.cascade):diagnostic.cascade;
    return {...diagnostic,...(file?{file}:{}),...(cascadeLabel?{cascade:cascadeLabel}: {})};
  });
  return {...result,diagnostics};
}

export function classifyCascade(diagnostics:Diagnostic[]){
  const labels=new Map<number,'root'|'secondary'>();
  const errors=diagnostics.map((item,index)=>({item,index})).filter(({item})=>item.severity==='error');
  if(errors.length<2)return labels;
  const first=errors[0];
  const secondary=errors.slice(1).filter(({item})=>isLikelyCascade(first.item,item));
  if(!secondary.length)return labels;
  labels.set(first.index,'root');
  for(const item of secondary)labels.set(item.index,'secondary');
  return labels;
}

function isLikelyCascade(root:Diagnostic,candidate:Diagnostic){
  const lineDistance=Math.max(0,(candidate.line??1)-(root.line??1));
  if(lineDistance>12)return false;
  const message=`${candidate.message} ${candidate.originalCompilerMessage??''}`.toLocaleLowerCase('en');
  return /missing [}\$]|extra }|runaway|paragraph ended before|file ended while scanning|emergency stop|alignment tab|math shift|no legal \bend found/.test(message);
}

export function inferDiagnosticFile(rawLog:string,diagnostic:Diagnostic,knownPaths:string[],mainFile:string){
  if(!knownPaths.length)return undefined;
  if(knownPaths.length===1)return knownPaths[0];
  const normalized=rawLog.replace(/\r\n?/g,'\n');
  const lines=normalized.split('\n');
  const escapedPaths=knownPaths.map(path=>({path,variants:[path,`./${path}`]}));

  // Strongest signal: file:line diagnostics emitted by TeX/tooling.
  for(const {path,variants} of escapedPaths){
    for(const variant of variants){
      const pattern=new RegExp(`${escapeRegExp(variant)}:(\\d+):`);
      for(const line of lines){
        const match=pattern.exec(line);
        if(match&&Number(match[1])===diagnostic.line)return path;
      }
    }
  }

  const original=(diagnostic.originalCompilerMessage??'').split('\n')[0]?.trim();
  const anchor=original?lines.findIndex(line=>line.includes(original)):findLineAnchor(lines,diagnostic.line);
  if(anchor>=0){
    const candidates=new Set<string>();
    for(let index=Math.max(0,anchor-6);index<=Math.min(lines.length-1,anchor+2);index++){
      for(const {path,variants} of escapedPaths)if(variants.some(variant=>containsPathToken(lines[index],variant)))candidates.add(path);
    }
    if(candidates.size===1)return [...candidates][0];
  }

  // Root-file attribution is safe only when the raw message names it explicitly.
  if((diagnostic.originalCompilerMessage??'').includes(mainFile))return mainFile;
  return undefined;
}

function findLineAnchor(lines:string[],lineNumber:number){return lines.findIndex(line=>new RegExp(`^l\\.${lineNumber}\\b`).test(line.trim()));}
function containsPathToken(line:string,path:string){return line.includes(`(${path}`)||line.includes(` ${path}`)||line.startsWith(path)||line.includes(`${path}:`);}
function escapeRegExp(value:string){return value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
