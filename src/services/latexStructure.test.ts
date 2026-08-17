import { describe,expect,it } from 'vitest';
import { parseLatexStructure } from './latexStructure';
import { matchesStructuralQuery } from './validator';

describe('normalized LaTeX structure',()=>{
  const source=`\\documentclass[a4paper]{article}
\\usepackage{amsmath,graphicx}
\\begin{document}
\\section{Model}
Inline $x_i^2$.
\\[
  \\frac{a+b}{c}=1
\\]
\\begin{table}
\\caption{Results}\\label{tab:results}
\\begin{tabular}{cc}
A & B \\\\
1 & 2 \\\\
\\end{tabular}
\\end{table}
See Table~\\ref{tab:results}.
\\end{document}`;

  it('normalizes document, packages, math and tables',()=>{
    const structure=parseLatexStructure(source);
    expect(structure.documentClass).toEqual({name:'article',options:['a4paper']});
    expect(structure.packages.has('amsmath')).toBe(true);
    expect(structure.byKind('Fraction')[0]?.arguments).toEqual(['a+b','c']);
    expect(structure.byKind('Fraction')[0]?.mathMode).toBe('display');
    expect(structure.byKind('Table')[0]?.meta).toMatchObject({rows:2,columns:2});
  });

  it('supports semantic validator queries with multiple valid source layouts',()=>{
    const structure=parseLatexStructure(source);
    expect(matchesStructuralQuery(structure,{target:'fraction',within:'displayMath',numeratorContains:'a+b',denominatorContains:'c'})).toBe(true);
    expect(matchesStructuralQuery(structure,{target:'labelReference',label:'tab:results'})).toBe(true);
    expect(matchesStructuralQuery(structure,{target:'environment',name:'table',containsCommand:'caption'})).toBe(true);
  });

  it('reports structural environment failures without pretending to parse full TeX',()=>{
    const broken=parseLatexStructure('\\begin{document}\n\\begin{itemize}\n\\end{document}');
    expect(broken.problems.some(problem=>problem.kind==='environment-mismatch')).toBe(true);
  });
});
