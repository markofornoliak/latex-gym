import { describe, expect, it } from 'vitest';
import { analyzeLatexContext, environmentSuggestions, extractPackages, insertPackageIntoPreamble, missingPackageForCommand, referenceSuggestions } from './editorIntelligence';

describe('LaTeX editor intelligence',()=>{
  it('detects packages from comma-separated usepackage declarations and ignores comments',()=>{
    const packages=extractPackages('\\documentclass{article}\n% \\usepackage{tikz}\n\\usepackage{amsmath, graphicx}\n');
    expect([...packages].sort()).toEqual(['amsmath','graphicx']);
  });

  it('uses package state from the whole document even when the cursor is earlier in the preamble',()=>{
    const source='\\documentclass{article}\n% cursor here\n\\usepackage{graphicx}\n\\begin{document}\n\\end{document}';
    const cursor=source.indexOf('% cursor');
    expect(analyzeLatexContext(source,cursor).packages.has('graphicx')).toBe(true);
  });

  it('detects preamble, math mode and the current environment',()=>{
    const source='\\documentclass{article}\n\\usepackage{amsmath}\n\\begin{document}\n\\begin{align}\na &= ';
    const context=analyzeLatexContext(source);
    expect(context.inPreamble).toBe(false);
    expect(context.inMath).toBe(true);
    expect(context.environment).toBe('align');
    expect(context.packages.has('amsmath')).toBe(true);
  });

  it('prioritizes mathematical reference commands inside math',()=>{
    const source='\\documentclass{article}\n\\begin{document}\n$';
    const suggestions=referenceSuggestions(source);
    const frac=suggestions.find(item=>item.referenceId==='frac')!;
    const section=suggestions.find(item=>item.referenceId==='section')!;
    expect(frac.boost).toBeGreaterThan(section.boost);
    expect(frac.apply).toBe('\\frac{}{}');
  });

  it('does not insert documentation placeholder words as executable LaTeX',()=>{
    const draw=referenceSuggestions('\\documentclass{article}\n\\begin{document}\n').find(item=>item.referenceId==='draw')!;
    expect(draw.apply).toBe('\\draw');
    expect(draw.apply).not.toContain('options path');
  });

  it('marks package-dependent commands when the package is missing',()=>{
    const source='\\documentclass{article}\n\\begin{document}\n';
    const includegraphics=referenceSuggestions(source).find(item=>item.referenceId==='includegraphics')!;
    expect(includegraphics.package).toBe('graphicx');
    expect(includegraphics.packageLoaded).toBe(false);
    expect(includegraphics.detail).toContain('требуется graphicx');
    expect(missingPackageForCommand('\\includegraphics',source)).toEqual({referenceId:'includegraphics',package:'graphicx'});
  });

  it('boosts figure-related commands inside figure',()=>{
    const source='\\documentclass{article}\n\\usepackage{graphicx}\n\\begin{document}\n\\begin{figure}\n';
    const suggestions=referenceSuggestions(source);
    const image=suggestions.find(item=>item.referenceId==='includegraphics')!;
    const subsection=suggestions.find(item=>item.referenceId==='subsection')!;
    expect(image.boost).toBeGreaterThan(subsection.boost);
    expect(image.packageLoaded).toBe(true);
  });

  it('offers environment names after begin from the professional reference data',()=>{
    const suggestions=environmentSuggestions('\\documentclass{article}\n\\usepackage{amsmath}\n\\begin{document}\n');
    expect(suggestions.some(item=>item.label==='align'&&item.referenceId==='align')).toBe(true);
    expect(suggestions.some(item=>item.label==='figure'&&item.referenceId==='figure')).toBe(true);
  });

  it('adds a required package immediately after documentclass and never duplicates it',()=>{
    const source='\\documentclass{article}\n\\begin{document}\nText\n\\end{document}\n';
    const added=insertPackageIntoPreamble(source,'graphicx');
    expect(added).toContain('\\documentclass{article}\n\\usepackage{graphicx}\n\\begin{document}');
    expect(insertPackageIntoPreamble(added,'graphicx')).toBe(added);
  });
});
