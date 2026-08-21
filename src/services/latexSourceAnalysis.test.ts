import { describe, expect, it } from 'vitest';
import {
  activeLatexSource,
  commandCount,
  hasActiveStructuralText,
  hasInlineMath,
  isLatexEscaped,
  maskInactiveLatex,
  stripLatexComments
} from './latexSourceAnalysis';

describe('TeX lexical source analysis',()=>{
  it('uses backslash parity when deciding whether percent starts a comment',()=>{
    expect(stripLatexComments('10\\% complete')).toContain('complete');
    expect(stripLatexComments('line\\\\% comment\nnext')).not.toContain('comment');
    expect(stripLatexComments('line\\\\\\% literal')).toContain('literal');
    expect(isLatexEscaped('\\%',1)).toBe(true);
    expect(isLatexEscaped('\\\\%',2)).toBe(false);
  });

  it('does not award commands that only appear inside verbatim-like regions',()=>{
    const source='\\begin{verbatim}\n\\section{Fake}\n\\end{verbatim}\n\\section{Real}';
    expect(commandCount(source,'section')).toBe(1);
    expect(hasActiveStructuralText(source,'\\section{Fake}')).toBe(false);
    expect(hasActiveStructuralText(source,'\\section{Real}')).toBe(true);
  });

  it('masks inline verb bodies without changing source length or line positions',()=>{
    const source='before \\verb|\\section{Fake}%| after\n\\section{Real}';
    const masked=maskInactiveLatex(source);
    expect(masked).toHaveLength(source.length);
    expect(masked.split('\n')).toHaveLength(2);
    expect(commandCount(source,'section')).toBe(1);
  });

  it('does not award active structure from unused macro definitions',()=>{
    const source='\\newcommand{\\fake}{\\section{Hidden}}\nText';
    expect(activeLatexSource(source)).not.toContain('\\section{Hidden}');
    expect(commandCount(source,'section')).toBe(0);
  });

  it('keeps inline math detection honest around escaped dollars and literal examples',()=>{
    expect(hasInlineMath('Price: \\$5')).toBe(false);
    expect(hasInlineMath('Value is $x+1$.')).toBe(true);
    expect(hasInlineMath('\\verb|$x+1$|')).toBe(false);
  });
});