import { compiler, createCompilerProject, isCompilerCancellation } from '../services/compiler';
import type { CompileOptions, CompilerProject } from '../types';

export async function runCompilerApiSmoke(root:HTMLElement){
  try{
    root.textContent='COMPILER_API_SMOKE_STARTING';
    await requirePdf('pdflatex-multifile',createCompilerProject('main.tex',[
      {path:'main.tex',content:'\\documentclass{article}\n\\begin{document}\n\\input{sections/body}\n\\end{document}'},
      {path:'sections/body.tex',content:'LaTeX Gym compiler API pdfLaTeX multi-file smoke.'}
    ]),{engine:'pdflatex',bibliography:'none'});
    await requirePdf('xelatex',single('XeLaTeX compiler API smoke.'),{engine:'xelatex',bibliography:'none'});
    await requirePdf('lualatex',single('LuaLaTeX compiler API smoke.'),{engine:'lualatex',bibliography:'none'});
    await requirePdf('bibtex',createCompilerProject('main.tex',[
      {path:'main.tex',content:'\\documentclass{article}\n\\begin{document}\nCitation~\\cite{knuth1984}.\\bibliographystyle{plain}\\bibliography{refs}\\end{document}'},
      {path:'refs.bib',content:'@book{knuth1984,title={The TeXbook},author={Knuth, Donald E.},year={1984},publisher={Addison-Wesley}}'}
    ]),{engine:'pdflatex',bibliography:'bibtex'});

    const unsupported=await compiler.compile('\\documentclass{article}\n\\usepackage[backend=biber]{biblatex}\n\\begin{document}Text\\end{document}',{engine:'pdflatex'});
    requireCondition(!unsupported.ok&&unsupported.providerId==='busytex-wasm'&&unsupported.diagnostics.some(item=>item.relatedConcept==='biber'),'biber rejection did not come from the real provider');

    const controller=new AbortController();
    const cancelled=compiler.compile(single('Cancellation smoke.'),{engine:'pdflatex',signal:controller.signal});
    window.setTimeout(()=>controller.abort('compiler API smoke cancellation'),0);
    let observedCancellation=false;
    try{await cancelled;}catch(error){observedCancellation=isCompilerCancellation(error);}
    requireCondition(observedCancellation,'cancellation was not observed by compiler API');

    await requirePdf('post-cancel-recovery',single('Compiler recovered after cancellation.'),{engine:'pdflatex',bibliography:'none'});
    root.dataset.state='passed';
    root.textContent='COMPILER_API_SMOKE_PASS pdflatex-multifile,xelatex,lualatex,bibtex,biber-rejection,cancel,recovery';
  }catch(error){
    root.dataset.state='failed';
    root.textContent=`COMPILER_API_SMOKE_FAIL ${error instanceof Error?error.message:String(error)}`;
  }
}

async function requirePdf(name:string,project:CompilerProject,options:CompileOptions){
  const result=await compiler.compile(project,options);
  requireCondition(result.ok,`${name}: compiler returned failure: ${result.diagnostics.map(item=>item.message).join(' | ')}`);
  requireCondition(result.providerId==='busytex-wasm',`${name}: unexpected provider ${result.providerId??'none'}`);
  requireCondition(Boolean(result.capabilities?.realPdf),`${name}: result did not carry real-PDF authority`);
  requireCondition(pdfSignature(result.pdf)==='%PDF',`${name}: invalid PDF signature`);
  if(name==='bibtex')requireCondition(/bibtex8/i.test(result.rawLog??''),'bibtex: bibliography phase missing from provider log');
}
function single(text:string){return createCompilerProject('main.tex',[{path:'main.tex',content:`\\documentclass{article}\n\\begin{document}\n${text}\n\\end{document}`}]);}
function pdfSignature(pdf?:Uint8Array){return pdf&&pdf.length>=4?String.fromCharCode(pdf[0],pdf[1],pdf[2],pdf[3]):'';}
function requireCondition(condition:boolean,message:string):asserts condition{if(!condition)throw new Error(message);}
