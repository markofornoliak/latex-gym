import type { Diagnostic } from '../types';

const knownEnvironments=new Set(['document','abstract','itemize','enumerate','quote','quotation','center','flushleft','flushright','equation','equation*','align','align*','gather','gather*','multline','multline*','matrix','pmatrix','bmatrix','vmatrix','Vmatrix','cases','tabular','table','figure','tikzpicture','proof','frame']);

export function diagnoseLatex(source:string):Diagnostic[]{
  const diagnostics:Diagnostic[]=[];
  const cleaned=stripComments(source);
  diagnoseBraces(cleaned,diagnostics);
  diagnoseEnvironments(cleaned,diagnostics);
  diagnoseKnownTypos(cleaned,diagnostics);
  diagnoseMathDelimiters(cleaned,diagnostics);
  diagnoseAlignment(cleaned,diagnostics);
  diagnoseLabels(cleaned,diagnostics);
  diagnosePackageRequirements(cleaned,diagnostics);
  diagnoseExternalResourceSyntax(cleaned,diagnostics);
  return dedupeDiagnostics(diagnostics.map(item=>withSourceRange(item,source)));
}

export function parseTexLog(rawLog:string,source:string):Diagnostic[]{
  if(!rawLog.trim())return [];
  const lines=rawLog.replace(/\r\n?/g,'\n').split('\n');
  const diagnostics:Diagnostic[]=[];

  for(let index=0;index<lines.length;index++){
    const line=lines[index].trimEnd();
    if(line.startsWith('! ')){
      const location=findTexLocation(lines,index);
      const headline=line.slice(2).trim();
      const original=[line,location.context].filter(Boolean).join('\n');
      diagnostics.push(withSourceRange(explainCompilerMessage('error',headline,location.line,original),source));
      continue;
    }

    const warning=line.match(/^(?:LaTeX|Package\s+\S+) Warning:\s*(.+?)(?:\s+on input line\s+(\d+)\.?\s*)?$/i);
    if(warning){
      const lineNumber=Number(warning[2]??extractNearbyInputLine(lines,index)??1);
      diagnostics.push(withSourceRange(explainCompilerMessage('warning',warning[1].trim(),lineNumber,line.trim()),source));
      continue;
    }

    if(/^(?:Over|Under)full \\[hv]box/.test(line)){
      const lineMatch=line.match(/lines?\s+(\d+)(?:--\d+)?/i);
      diagnostics.push(withSourceRange({
        severity:'warning',line:Number(lineMatch?.[1]??1),message:line.trim(),
        explanation:/^Overfull/.test(line)?'TeX сообщает, что содержимое выходит за рассчитанную область набора. PDF создаётся, но верстку стоит проверить.':'TeX сообщает о слишком разреженной строке или блоке. Сборка возможна, но типографический результат может быть слабым.',
        suggestion:'Откройте PDF в указанной области и исправляйте причину, а не скрывайте warning без проверки.',
        source:'tex',relatedConcept:'debugging',originalCompilerMessage:line.trim()
      },source));
    }
  }

  return dedupeDiagnostics(diagnostics);
}

export function lineOf(source:string,index:number){return source.slice(0,Math.max(0,index)).split('\n').length;}

function stripComments(source:string){return source.replace(/(^|[^\\])%.*$/gm,'$1');}

function diagnoseBraces(source:string,out:Diagnostic[]){
  let depth=0;let firstExtra=-1;
  for(let index=0;index<source.length;index++){
    if(source[index]==='{'&&source[index-1]!=='\\')depth++;
    if(source[index]==='}'&&source[index-1]!=='\\'){
      depth--;
      if(depth<0&&firstExtra<0)firstExtra=index;
    }
  }
  if(firstExtra>=0)out.push({severity:'error',line:lineOf(source,firstExtra),message:'Extra } / несогласованная фигурная скобка',explanation:'Закрывающая скобка не соответствует открытой группе или аргументу.',suggestion:'Удалите лишнюю } или восстановите открывающую { в конструкции, которой она принадлежит.',source:'latex-gym',relatedConcept:'command'});
  else if(depth>0)out.push({severity:'error',line:lineOf(source,source.length),message:'Missing } inserted',explanation:'Один или несколько обязательных аргументов или групп не закрыты.',suggestion:'Найдите ближайшую незавершённую конструкцию {...}; не добавляйте } в конец файла наугад.',source:'latex-gym',relatedConcept:'command'});
}

function diagnoseEnvironments(source:string,out:Diagnostic[]){
  const custom=new Set<string>();
  for(const match of source.matchAll(/\\newenvironment\s*\{([^}]+)\}/g))custom.add(match[1]);
  for(const match of source.matchAll(/\\newtheorem\s*\{([^}]+)\}/g))custom.add(match[1]);

  const stack:Array<{name:string;index:number}>=[];
  for(const match of source.matchAll(/\\(begin|end)\s*\{([^}]+)\}/g)){
    const kind=match[1];const name=match[2];const index=match.index??0;
    if(kind==='begin'){
      if(!knownEnvironments.has(name)&&!custom.has(name))out.push({severity:'error',line:lineOf(source,index),message:`Environment ${name} undefined`,explanation:`LaTeX не знает окружение ${name}. Возможна опечатка, отсутствующий пакет или отсутствующее собственное определение.`,suggestion:'Проверьте имя, затем пакет или \\newenvironment/\\newtheorem в преамбуле.',source:'latex-gym',relatedConcept:'environment'});
      stack.push({name,index});
    }else{
      const top=stack.pop();
      if(!top||top.name!==name){
        out.push({severity:'error',line:lineOf(source,index),message:`Окружение ${name} закрыто неверно`,explanation:top?`Сейчас открыто окружение ${top.name}, но встречено \\end{${name}}.`:`Найдено \\end{${name}} без соответствующего \\begin.`,suggestion:top?`Замените на \\end{${top.name}} или исправьте открывающее окружение.`:`Добавьте \\begin{${name}} перед этим местом.`,source:'latex-gym',relatedConcept:'environment'});
        break;
      }
    }
  }
  if(stack.length){const top=stack.at(-1)!;out.push({severity:'error',line:lineOf(source,top.index),message:`Не закрыто окружение ${top.name}`,explanation:`Для \\begin{${top.name}} не найдено соответствующее завершение.`,suggestion:`Добавьте \\end{${top.name}} в логически правильном месте.`,source:'latex-gym',relatedConcept:'environment'});}
}

function diagnoseKnownTypos(source:string,out:Diagnostic[]){
  const typos:Record<string,string>={secton:'section',subsecton:'subsection',documetclass:'documentclass',begn:'begin',inclduegraphics:'includegraphics',usepakage:'usepackage'};
  for(const [wrong,right] of Object.entries(typos)){
    const match=new RegExp(`\\\\${wrong}\\b`).exec(source);
    if(match)out.push({severity:'error',line:lineOf(source,match.index),message:`Undefined control sequence: \\${wrong}`,explanation:`Команда \\${wrong} не определена. Для этой формы наиболее вероятна опечатка.`,suggestion:`Возможно, вы имели в виду \\${right}.`,source:'latex-gym',relatedConcept:'command'});
  }
}

function diagnoseMathDelimiters(source:string,out:Diagnostic[]){
  const dollars=[...source.matchAll(/(?<!\\)\$/g)];
  if(dollars.length%2!==0){const last=dollars.at(-1);out.push({severity:'error',line:lineOf(source,last?.index??source.length),message:'Missing $ inserted / математический режим не закрыт',explanation:'Количество неэкранированных символов $ нечётно, поэтому граница математического режима неоднозначна.',suggestion:'Добавьте закрывающий $ либо удалите лишний открывающий.',source:'latex-gym',relatedConcept:'math-mode'});}
  const opens=[...source.matchAll(/\\\[/g)].length;const closes=[...source.matchAll(/\\\]/g)].length;
  if(opens!==closes)out.push({severity:'error',line:1,message:'Несогласованы \\[ и \\]',explanation:'Выключной математический режим должен иметь открывающую и закрывающую границы.',suggestion:'Проверьте пары \\[ ... \\].',source:'latex-gym',relatedConcept:'display-math'});
}

function diagnoseAlignment(source:string,out:Diagnostic[]){
  for(const table of source.matchAll(/\\begin\{tabular\}\{([^}]*)\}([\s\S]*?)\\end\{tabular\}/g)){
    const spec=table[1];const content=table[2];const columns=(spec.match(/[lcrX]|[pmb]\s*\{/g)??[]).length;
    if(columns<1)continue;
    let offset=(table.index??0)+table[0].indexOf(content);
    for(const row of content.split(/\\\\/)){
      const cells=(row.match(/(?<!\\)&/g)??[]).length+1;
      if(cells>columns){out.push({severity:'error',line:lineOf(source,offset),message:'Extra alignment tab has been changed to \\cr',explanation:`Строка содержит ${cells} ячейки, но спецификация tabular описывает ${columns}. Лишний & создаёт дополнительную ячейку.`,suggestion:'Исправьте число & либо модель столбцов tabular.',source:'latex-gym',relatedConcept:'tabular'});break;}
      offset+=row.length+2;
    }
  }
}

function diagnoseLabels(source:string,out:Diagnostic[]){
  const seen=new Set<string>();
  for(const match of source.matchAll(/\\label\{([^}]+)\}/g)){
    const key=match[1];
    if(seen.has(key))out.push({severity:'warning',line:lineOf(source,match.index??0),message:`Метка ${key} объявлена повторно`,explanation:'Перекрёстные ссылки на дублирующуюся метку неоднозначны.',suggestion:'Используйте уникальные смысловые ключи label.',source:'latex-gym',relatedConcept:'label'});
    seen.add(key);
  }
}

function diagnosePackageRequirements(source:string,out:Diagnostic[]){
  const preamble=source.split(/\\begin\s*\{document\}/)[0]??source;
  const loaded=(name:string)=>new RegExp(`\\\\usepackage(?:\\[[^\\]]*\\])?\\{[^}]*\\b${escapeRegExp(name)}\\b[^}]*\\}`).test(preamble);
  if(/\\includegraphics\b/.test(source)&&!loaded('graphicx')){const index=source.search(/\\includegraphics\b/);out.push({severity:'error',line:lineOf(source,index),message:'Undefined control sequence: \\includegraphics',explanation:'Команда вставки изображений определяется пакетом graphicx.',suggestion:'Добавьте \\usepackage{graphicx} в преамбулу.',source:'latex-gym',relatedConcept:'figure'});}
  if(/\\begin\{(?:align\*?|cases|pmatrix|bmatrix)\}/.test(source)&&!loaded('amsmath')){const index=source.search(/\\begin\{(?:align|cases|pmatrix|bmatrix)/);out.push({severity:'error',line:lineOf(source,index),message:'Математическое окружение требует amsmath',explanation:'Эта конструкция предоставляется пакетом amsmath.',suggestion:'Добавьте \\usepackage{amsmath} в преамбулу.',source:'latex-gym',relatedConcept:'package-model'});}
  if(/\\begin\{proof\}/.test(source)&&!loaded('amsthm')){const index=source.search(/\\begin\{proof\}/);out.push({severity:'error',line:lineOf(source,index),message:'Environment proof undefined',explanation:'Окружение proof определяется пакетом amsthm.',suggestion:'Добавьте \\usepackage{amsthm} в преамбулу.',source:'latex-gym',relatedConcept:'proof'});}
}

function diagnoseExternalResourceSyntax(source:string,out:Diagnostic[]){
  for(const command of ['includegraphics','input','include']){
    const match=new RegExp(`\\\\${command}(?:\\[[^\\]]*\\])?\\{\\s*\\}`).exec(source);
    if(match)out.push({severity:'error',line:lineOf(source,match.index),message:'File name is empty',explanation:`Команда \\${command} ожидает путь к внешнему ресурсу.`,suggestion:'Укажите существующий путь проекта. Наличие файла проверяет полноценная TeX-сборка, а не учебный preview.',source:'latex-gym',relatedConcept:'multi-file'});
  }
}

function findTexLocation(lines:string[],start:number){
  for(let index=start+1;index<Math.min(lines.length,start+8);index++){
    const match=lines[index].match(/^l\.(\d+)\s*(.*)$/);
    if(match)return {line:Number(match[1]),context:lines[index].trim()};
    if(lines[index].startsWith('! '))break;
  }
  return {line:1,context:''};
}

function extractNearbyInputLine(lines:string[],start:number){
  for(let index=start;index<Math.min(lines.length,start+4);index++){
    const match=lines[index].match(/input line\s+(\d+)/i);
    if(match)return Number(match[1]);
  }
  return undefined;
}

function explainCompilerMessage(severity:Diagnostic['severity'],message:string,line:number,original:string):Diagnostic{
  const lower=message.toLowerCase();
  let explanation='TeX сообщил о проблеме во время реальной компиляции. Начните с первого содержательного сообщения и указанной строки.';
  let suggestion='Исправьте первопричину и скомпилируйте снова; последующие ошибки могут быть каскадными.';
  let relatedConcept='debugging';

  if(lower.includes('missing }')||lower.includes('extra }')){
    explanation='Группа или обязательный аргумент рядом с этой строкой имеет несогласованные фигурные скобки.';
    suggestion='Проверьте команды непосредственно перед указанной строкой и найдите незакрытый или лишний аргумент {...}.';
    relatedConcept='command';
  }else if(lower.includes('missing $')||lower.includes('math shift')){
    explanation='Граница математического режима нарушена: TeX оказался в неверном режиме для текущего токена.';
    suggestion='Проверьте ближайшие пары $...$, \\[...\\] и математические окружения.';
    relatedConcept='math-mode';
  }else if(lower.includes('undefined control sequence')){
    explanation='TeX встретил неизвестную команду. Причина обычно в опечатке, отсутствующем пакете или команде, определённой не в той области.';
    suggestion='Проверьте написание команды и пакет/макрос, который должен её определять.';
    relatedConcept='package-model';
  }else if(lower.includes('environment')&&lower.includes('undefined')){
    explanation='TeX не знает это окружение в текущей конфигурации документа.';
    suggestion='Проверьте имя окружения и пакет или собственное определение в преамбуле.';
    relatedConcept='environment';
  }else if(lower.includes('extra alignment tab')){
    explanation='В строке выравнивания найден лишний &: число ячеек или точек выравнивания не соответствует структуре окружения.';
    suggestion='Проверьте количество & в этой строке и спецификацию tabular/align.';
    relatedConcept='tabular';
  }else if(lower.includes('reference')&&lower.includes('undefined')){
    explanation='Ссылка пока не разрешилась: label отсутствует, ключ написан иначе или документ требует дополнительного прохода.';
    suggestion='Сверьте ключи \\label и \\ref; после исправления выполните повторную сборку.';
    relatedConcept='ref';
  }else if(lower.includes('citation')&&lower.includes('undefined')){
    explanation='Цитата не разрешилась в библиографической базе или библиографический этап не создал нужную запись.';
    suggestion='Проверьте ключ в .bib и выбранный BibTeX/Biber workflow.';
    relatedConcept='citation';
  }else if(lower.includes('label')&&lower.includes('multiply defined')){
    explanation='Один label объявлен более одного раза, поэтому перекрёстная ссылка неоднозначна.';
    suggestion='Оставьте каждому нумеруемому объекту уникальный смысловой ключ.';
    relatedConcept='label';
  }else if(lower.includes('file')&&lower.includes('not found')){
    explanation='TeX не нашёл файл проекта, изображение или другой ресурс по указанному пути.';
    suggestion='Проверьте имя, расширение, регистр и расположение файла относительно main.tex.';
    relatedConcept='multi-file';
  }else if(severity==='warning'){
    explanation='Компиляция может завершиться, но TeX сообщает о состоянии, которое стоит проверить перед публикацией.';
    suggestion='Проверьте указанный объект в PDF и устраните warning, если он влияет на корректность или типографику.';
  }

  return {severity,line,message,explanation,suggestion,source:'tex',relatedConcept,originalCompilerMessage:original};
}

function withSourceRange(item:Diagnostic,source:string):Diagnostic{
  if(item.from!==undefined&&item.to!==undefined)return item;
  const lines=source.split('\n');
  const line=Math.max(1,Math.min(lines.length,item.line||1));
  let from=0;
  for(let index=0;index<line-1;index++)from+=lines[index].length+1;
  const text=lines[line-1]??'';
  return {...item,line,from,to:from+Math.max(1,text.length)};
}

function dedupeDiagnostics(items:Diagnostic[]){const seen=new Set<string>();return items.filter(item=>{const key=`${item.severity}:${item.line}:${item.message}`;if(seen.has(key))return false;seen.add(key);return true;});}
function escapeRegExp(value:string){return value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
