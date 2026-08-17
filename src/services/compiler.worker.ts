/// <reference lib="webworker" />
import type { CompileResult, PreviewBlock } from '../types';
import { diagnoseLatex } from './compilerDiagnostics';

type Request = { id: number; source: string };
type Response = { id: number; result: CompileResult };

const ctx: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = (event: MessageEvent<Request>) => {
  const started = performance.now();
  const { id, source } = event.data;
  const diagnostics = diagnoseLatex(source);
  const ok = !diagnostics.some(diagnostic => diagnostic.severity === 'error');
  const blocks = ok ? parsePreview(source) : [];
  const result: CompileResult = {
    ok,
    diagnostics,
    blocks,
    elapsedMs: Math.max(1, Math.round(performance.now() - started)),
    engine: 'educational-preview'
  };
  ctx.postMessage({ id, result } satisfies Response);
};

function parsePreview(source: string): PreviewBlock[] {
  const blocks: PreviewBlock[] = [];
  const clean = source.replace(/%.*$/gm,'');
  const bodyMatch = clean.match(/\\begin\{document\}([\s\S]*?)\\end\{document\}/);
  let body = bodyMatch?.[1] ?? clean;

  const title = clean.match(/\\title\{([^}]*)\}/)?.[1];
  const author = clean.match(/\\author\{([^}]*)\}/)?.[1];
  if (title && /\\maketitle\b/.test(body)) blocks.push({type:'title',text:title,meta:author});
  body = body.replace(/\\maketitle\b/g,'');

  body = body.replace(/\\begin\{abstract\}([\s\S]*?)\\end\{abstract\}/g, (_, content:string) => {
    blocks.push({type:'heading',level:2,text:'Аннотация'});
    blocks.push({type:'paragraph',text:stripText(content)});
    return '\n';
  });

  body = body.replace(/\\begin\{(itemize|enumerate)\}([\s\S]*?)\\end\{\1\}/g, (_, kind:string, content:string) => {
    const items = content.split(/\\item\s*/).slice(1).map(stripText).filter(Boolean);
    blocks.push({type:'list',ordered:kind==='enumerate',items});
    return '\n';
  });

  body = body.replace(/\\begin\{tabular\}\{[^}]*\}([\s\S]*?)\\end\{tabular\}/g, (_, content:string) => {
    const rows = content.split(/\\\\/).map((row:string)=>row.trim()).filter(Boolean).map((row:string)=>row.split('&').map(stripText));
    blocks.push({type:'table',rows});
    return '\n';
  });

  body = body.replace(/\\begin\{(?:equation\*?|align\*?)\}([\s\S]*?)\\end\{(?:equation\*?|align\*?)\}/g, (_, content:string) => {
    blocks.push({type:'math',latex:content.trim().replace(/&/g,''),display:true});
    return '\n';
  });
  body = body.replace(/\\\[([\s\S]*?)\\\]/g, (_, content:string) => { blocks.push({type:'math',latex:content.trim(),display:true}); return '\n'; });
  body = body.replace(/\$\$([\s\S]*?)\$\$/g, (_, content:string) => { blocks.push({type:'math',latex:content.trim(),display:true}); return '\n'; });

  body = body.replace(/\\section\*?\{([^}]*)\}/g, (_, text:string) => { blocks.push({type:'heading',level:1,text}); return '\n'; });
  body = body.replace(/\\subsection\*?\{([^}]*)\}/g, (_, text:string) => { blocks.push({type:'heading',level:2,text}); return '\n'; });
  body = body.replace(/\\subsubsection\*?\{([^}]*)\}/g, (_, text:string) => { blocks.push({type:'heading',level:3,text}); return '\n'; });

  body = body.replace(/\\begin\{(?:figure|tikzpicture)\}([\s\S]*?)\\end\{(?:figure|tikzpicture)\}/g, (_, content:string) => {
    const caption = content.match(/\\caption\{([^}]*)\}/)?.[1];
    blocks.push({type:'notice',text:caption ? `Рисунок: ${caption}` : 'Графический объект'});
    return '\n';
  });
  body = body.replace(/\\includegraphics(?:\[[^\]]*\])?\{([^}]*)\}/g, (_, file:string) => { blocks.push({type:'notice',text:`Изображение: ${file}`}); return '\n'; });
  body = body.replace(/\\(?:input|include)\{([^}]*)\}/g, (_, file:string) => { blocks.push({type:'notice',text:`Внешний файл: ${file}.tex`}); return '\n'; });
  body = body.replace(/\\begin\{proof\}([\s\S]*?)\\end\{proof\}/g, (_, content:string) => { blocks.push({type:'heading',level:3,text:'Доказательство'}); blocks.push({type:'paragraph',text:stripText(content)}); return '\n'; });

  const chunks = body.split(/\n\s*\n|\n/).map(value=>value.trim()).filter(Boolean);
  for (const chunk of chunks) {
    if (/^\\(?:documentclass|usepackage|newcommand|newtheorem|title|author|label|caption|centering)\b/.test(chunk)) continue;
    if (/^\\(?:begin|end)\{/.test(chunk)) continue;
    const inlineParts = chunk.split(/(?<!\\)\$([^$]+)(?<!\\)\$/);
    if (inlineParts.length > 1) {
      inlineParts.forEach((part,index) => {
        if (!part.trim()) return;
        if (index % 2 === 1) blocks.push({type:'math',latex:part.trim(),display:false});
        else blocks.push({type:'paragraph',text:stripText(part)});
      });
    } else {
      const text = stripText(chunk);
      if (text) blocks.push({type:'paragraph',text});
    }
  }
  return blocks.length ? blocks : [{type:'notice',text:'Документ не содержит поддерживаемого отображаемого содержимого.'}];
}

function stripText(value: string) {
  return value
    .replace(/\\(?:textbf|emph|textit|texttt|underline)\{([^}]*)\}/g,'$1')
    .replace(/\\(?:label|ref|cite)\{([^}]*)\}/g,(_, key:string)=>`[${key}]`)
    .replace(/\\[a-zA-Z@]+\*?(?:\[[^\]]*\])?/g,'')
    .replace(/[{}]/g,'')
    .replace(/\s+/g,' ')
    .trim();
}
