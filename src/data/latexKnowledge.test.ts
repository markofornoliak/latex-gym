import { describe, expect, it } from 'vitest';
import { commandKnowledge, commandPriority, findBibKeys, findLabels, getCommandKnowledge, packageNames } from './latexKnowledge';

describe('canonical LaTeX knowledge model',()=>{
  it('derives editor documentation from Reference entries',()=>{
    const fraction=getCommandKnowledge('frac');
    expect(fraction?.entry.id).toBe('frac');
    expect(fraction?.entry.syntax).toContain('numerator');
    expect(commandKnowledge.some(item=>item.name==='includegraphics')).toBe(true);
  });

  it('prioritizes mathematical commands in math mode',()=>{
    const fraction=getCommandKnowledge('frac')!;
    const section=getCommandKnowledge('section')!;
    const context={mathMode:true,preamble:false,packages:new Set<string>()};
    expect(commandPriority(fraction,context)).toBeGreaterThan(commandPriority(section,context));
  });

  it('extracts labels and packages from the current document',()=>{
    const source='\\usepackage{amsmath,graphicx}\n\\begin{document}\n\\section{A}\\label{sec:a}\n\\end{document}';
    expect(findLabels(source)).toEqual(['sec:a']);
    expect([...packageNames(source)].sort()).toEqual(['amsmath','graphicx']);
  });

  it('extracts citation keys from a project bibliography',()=>{
    const bibliography='@article{einstein1905,\n  title={On the electrodynamics of moving bodies}\n}\n@book{knuth1984, title={The TeXbook}}';
    expect(findBibKeys(bibliography)).toEqual(['einstein1905','knuth1984']);
  });
});
