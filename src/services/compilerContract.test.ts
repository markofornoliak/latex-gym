import { describe, expect, it } from 'vitest';
import { detectUnsupportedBibliography, REAL_TEX_CAPABILITIES } from './compiler';
import { compilationStateLabel, isCompilationBusy } from './compilerState';

describe('compiler contract',()=>{
  it('advertises only capabilities the current browser provider actually supports',()=>{
    expect(REAL_TEX_CAPABILITIES.realPdf).toBe(true);
    expect(REAL_TEX_CAPABILITIES.engines).toEqual(['pdflatex','xelatex','lualatex']);
    expect(REAL_TEX_CAPABILITIES.multiFile).toBe(true);
    expect(REAL_TEX_CAPABILITIES.bibtex).toBe(true);
    expect(REAL_TEX_CAPABILITIES.biber).toBe(false);
    expect(REAL_TEX_CAPABILITIES.shellEscape).toBe(false);
    expect(REAL_TEX_CAPABILITIES.synctex).toBe(false);
    expect(REAL_TEX_CAPABILITIES.offline).toBe(false);
  });

  it('keeps intermediate compilation phases busy and names them honestly',()=>{
    expect(isCompilationBusy('initializing')).toBe(true);
    expect(isCompilationBusy('running-bibliography')).toBe(true);
    expect(isCompilationBusy('recompiling')).toBe(true);
    expect(isCompilationBusy('success')).toBe(false);
    expect(compilationStateLabel('initializing')).toBe('Загрузка TeX');
    expect(compilationStateLabel('running-bibliography')).toBe('Библиография');
    expect(compilationStateLabel('recompiling')).toBe('Повторная компиляция');
  });

  it('does not reject commented or unused-definition biblatex as a Biber requirement',()=>{
    const commented={mainFile:'main.tex',files:[{path:'main.tex',content:'% \\usepackage{biblatex}\n\\documentclass{article}\n\\begin{document}Text\\end{document}'}]};
    const unused={mainFile:'main.tex',files:[{path:'main.tex',content:'\\documentclass{article}\n\\newcommand{\\unused}{\\usepackage{biblatex}}\n\\begin{document}Text\\end{document}'}]};
    expect(detectUnsupportedBibliography(commented)).toBeNull();
    expect(detectUnsupportedBibliography(unused)).toBeNull();
  });

  it('rejects active default Biber but permits explicit backend=bibtex',()=>{
    const biber={mainFile:'main.tex',files:[{path:'main.tex',content:'\\documentclass{article}\n\\usepackage{biblatex}\n\\begin{document}Text\\end{document}'}]};
    const bibtex={mainFile:'main.tex',files:[{path:'main.tex',content:'\\documentclass{article}\n\\usepackage[backend=bibtex]{biblatex}\n\\begin{document}Text\\end{document}'}]};
    expect(detectUnsupportedBibliography(biber)).toMatchObject({file:'main.tex',line:2});
    expect(detectUnsupportedBibliography(bibtex)).toBeNull();
  });
});