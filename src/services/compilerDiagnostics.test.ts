import { describe, expect, it } from 'vitest';
import { diagnoseLatex, parseTexLog } from './compilerDiagnostics';

describe('compiler diagnostics',()=>{
  it('recognizes an undefined control sequence typo with a useful suggestion',()=>{
    const diagnostics=diagnoseLatex('\\documentclass{article}\n\\begin{document}\n\\secton{Result}\n\\end{document}');
    expect(diagnostics.some(item=>item.message.includes('Undefined control sequence')&&item.suggestion?.includes('section'))).toBe(true);
  });

  it('recognizes missing closing braces',()=>{
    const diagnostics=diagnoseLatex('\\section{Method');
    expect(diagnostics.some(item=>item.message==='Missing } inserted')).toBe(true);
  });

  it('recognizes an extra alignment tab in tabular',()=>{
    const diagnostics=diagnoseLatex('\\begin{tabular}{lr}\nA & B & C \\\\\n\\end{tabular}');
    expect(diagnostics.some(item=>item.message.includes('Extra alignment tab'))).toBe(true);
  });

  it('recognizes unknown environments without rejecting defined custom environments',()=>{
    expect(diagnoseLatex('\\begin{itmeize}\n\\end{itmeize}').some(item=>item.message.includes('undefined'))).toBe(true);
    expect(diagnoseLatex('\\newenvironment{remark}{}{}\n\\begin{remark}\nText\n\\end{remark}').some(item=>item.message.includes('undefined'))).toBe(false);
  });

  it('reports package dependencies in the preamble',()=>{
    const missing=diagnoseLatex('\\documentclass{article}\n\\begin{document}\n\\includegraphics{plot.pdf}\n\\end{document}');
    const loaded=diagnoseLatex('\\documentclass{article}\n\\usepackage{graphicx}\n\\begin{document}\n\\includegraphics{plot.pdf}\n\\end{document}');
    expect(missing.some(item=>item.message.includes('includegraphics'))).toBe(true);
    expect(loaded.some(item=>item.message.includes('includegraphics'))).toBe(false);
  });

  it('does not pretend to know whether a non-empty external file exists',()=>{
    const diagnostics=diagnoseLatex('\\includegraphics{figures/result.pdf}');
    expect(diagnostics.some(item=>item.message.includes('File')&&item.severity==='error')).toBe(false);
    expect(diagnoseLatex('\\includegraphics{}').some(item=>item.message==='File name is empty')).toBe(true);
  });

  it('keeps the original TeX error while adding a learner explanation and source range',()=>{
    const source='\\documentclass{article}\n\\begin{document}\n\\section{Broken\n\\end{document}';
    const log='! Missing } inserted.\n<inserted text>\n                }\nl.3 \\section{Broken';
    const [diagnostic]=parseTexLog(log,source);
    expect(diagnostic.severity).toBe('error');
    expect(diagnostic.line).toBe(3);
    expect(diagnostic.source).toBe('tex');
    expect(diagnostic.originalCompilerMessage).toContain('! Missing } inserted.');
    expect(diagnostic.explanation).toContain('фигурные скобки');
    expect(diagnostic.from).toBeGreaterThan(0);
    expect(diagnostic.to).toBeGreaterThan(diagnostic.from!);
  });

  it('distinguishes a real TeX warning from a fatal error',()=>{
    const source='\\documentclass{article}\n\\begin{document}\nText\n\\end{document}';
    const diagnostics=parseTexLog('LaTeX Warning: Label(s) may have changed. Rerun to get cross-references right.',source);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].severity).toBe('warning');
    expect(diagnostics[0].originalCompilerMessage).toContain('LaTeX Warning');
  });
});
