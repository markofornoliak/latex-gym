/// <reference lib="webworker" />
import type { CompileResult, Diagnostic, PreviewBlock } from '../types';

type Request = { id: number; source: string };
type Response = { id: number; result: CompileResult };

const ctx: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = (event: MessageEvent<Request>) => {
  const started = performance.now();
  const { id, source } = event.data;
  const diagnostics = diagnose(source);
  const ok = !diagnostics.some(d => d.severity === 'error');
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

function lineOf(source: string, index: number) {
  return source.slice(0, Math.max(0, index)).split('\n').length;
}

function diagnose(source: string): Diagnostic[] {
  const out: Diagnostic[] = [];
  const cleaned = source.replace(/%.*$/gm, '');

  let depth = 0;
  let firstBadBrace = -1;
  for (let i = 0; i < cleaned.length; i++) {
    if (cleaned[i] === '{' && cleaned[i - 1] !== '\\') depth++;
    if (cleaned[i] === '}' && cleaned[i - 1] !== '\\') depth--;
    if (depth < 0 && firstBadBrace < 0) firstBadBrace = i;
  }
  if (depth !== 0 || firstBadBrace >= 0) {
    out.push({
      severity: 'error', line: lineOf(cleaned, firstBadBrace >= 0 ? firstBadBrace : cleaned.length),
      message: 'Несогласованные фигурные скобки',
      explanation: 'Аргумент команды открыт и закрыт непоследовательно. LaTeX не может однозначно определить границы аргумента.',
      suggestion: 'Проверьте пары { ... } начиная с указанной строки.'
    });
  }

  const stack: Array<{name:string; index:number}> = [];
  const envRe = /\\(begin|end)\s*\{([^}]+)\}/g;
  for (const match of cleaned.matchAll(envRe)) {
    const kind = match[1]; const name = match[2]; const index = match.index ?? 0;
    if (kind === 'begin') stack.push({ name, index });
    else {
      const top = stack.pop();
      if (!top || top.name !== name) {
        out.push({
          severity:'error', line:lineOf(cleaned,index), message:`Окружение ${name} закрыто неверно`,
          explanation: top ? `Сейчас открыто окружение ${top.name}, но встречено \\end{${name}}.` : `Найдено \\end{${name}} без соответствующего \\begin.`,
          suggestion: top ? `Замените на \\end{${top.name}} или исправьте открывающее окружение.` : `Добавьте \\begin{${name}} перед этим местом.`
        });
        break;
      }
    }
  }
  if (stack.length) {
    const top = stack.at(-1)!;
    out.push({ severity:'error', line:lineOf(cleaned,top.index), message:`Не закрыто окружение ${top.name}`, explanation:`Для \\begin{${top.name}} не найдено соответствующее завершение.`, suggestion:`Добавьте \\end{${top.name}}.` });
  }

  const typos: Record<string,string> = { secton:'section', subsecton:'subsection', documetclass:'documentclass', begn:'begin', inclduegraphics:'includegraphics' };
  for (const [wrong,right] of Object.entries(typos)) {
    const re = new RegExp(`\\\\${wrong}\\b`);
    const match = re.exec(cleaned);
    if (match) out.push({ severity:'error', line:lineOf(cleaned,match.index), message:`Undefined control sequence: \\${wrong}`, explanation:`Команда \\${wrong} не найдена. Вероятна опечатка.`, suggestion:`Возможно, вы имели в виду \\${right}.` });
  }

  const dollarCount = (cleaned.match(/(?<!\\)\$/g) ?? []).length;
  if (dollarCount % 2 !== 0) {
    const idx = cleaned.lastIndexOf('$');
    out.push({ severity:'error', line:lineOf(cleaned,idx), message:'Не закрыт математический режим', explanation:'Количество неэкранированных символов $ нечётно.', suggestion:'Добавьте закрывающий $ либо удалите лишний открывающий.' });
  }

  const labels = [...cleaned.matchAll(/\\label\{([^}]+)\}/g)];
  const seen = new Set<string>();
  for (const match of labels) {
    const key = match[1];
    if (seen.has(key)) out.push({ severity:'warning', line:lineOf(cleaned,match.index ?? 0), message:`Метка ${key} объявлена повторно`, explanation:'Перекрёстные ссылки на дублирующуюся метку неоднозначны.', suggestion:'Используйте уникальные имена label.' });
    seen.add(key);
  }

  if (/\\includegraphics\b/.test(cleaned) && !/\\usepackage(?:\[[^\]]*\])?\{[^}]*graphicx[^}]*\}/.test(cleaned)) {
    const idx = cleaned.search(/\\includegraphics\b/);
    out.push({ severity:'error', line:lineOf(cleaned,idx), message:'Команда includegraphics требует graphicx', explanation:'Команда вставки изображений определяется пакетом graphicx.', suggestion:'Добавьте \\usepackage{graphicx} в преамбулу.' });
  }
  if (/\\begin\{align\*?\}/.test(cleaned) && !/\\usepackage(?:\[[^\]]*\])?\{[^}]*amsmath[^}]*\}/.test(cleaned)) {
    const idx = cleaned.search(/\\begin\{align/);
    out.push({ severity:'error', line:lineOf(cleaned,idx), message:'Окружение align требует amsmath', explanation:'align входит в пакет amsmath.', suggestion:'Добавьте \\usepackage{amsmath} в преамбулу.' });
  }
  if (/\\begin\{proof\}/.test(cleaned) && !/\\usepackage(?:\[[^\]]*\])?\{[^}]*amsthm[^}]*\}/.test(cleaned)) {
    const idx = cleaned.search(/\\begin\{proof\}/);
    out.push({ severity:'error', line:lineOf(cleaned,idx), message:'Окружение proof требует amsthm', explanation:'proof определяется пакетом amsthm.', suggestion:'Добавьте \\usepackage{amsthm} в преамбулу.' });
  }

  return out;
}

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
    const rows = content.split(/\\\\/).map((r:string)=>r.trim()).filter(Boolean).map((r:string)=>r.split('&').map(stripText));
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

  const chunks = body.split(/\n\s*\n|\n/).map(s=>s.trim()).filter(Boolean);
  for (const chunk of chunks) {
    if (/^\\(?:documentclass|usepackage|newcommand|newtheorem|title|author|label|caption|centering)\b/.test(chunk)) continue;
    if (/^\\(?:begin|end)\{/.test(chunk)) continue;
    const inlineParts = chunk.split(/(?<!\\)\$([^$]+)(?<!\\)\$/);
    if (inlineParts.length > 1) {
      inlineParts.forEach((part,i) => {
        if (!part.trim()) return;
        if (i % 2 === 1) blocks.push({type:'math',latex:part.trim(),display:false});
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
