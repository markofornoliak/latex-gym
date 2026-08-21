const escapeRegExp=(value:string)=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

/** TeX starts a comment at % unless it is preceded by an odd run of backslashes. */
export function isLatexCommentPercent(source:string,index:number){
  if(source[index]!=='%')return false;
  let slashes=0;
  for(let cursor=index-1;cursor>=0&&source[cursor]==='\\';cursor-=1)slashes+=1;
  return slashes%2===0;
}

/** Strip comments while preserving line structure and TeX backslash-parity semantics. */
export function stripLatexComments(source:string){
  let output='';
  for(let index=0;index<source.length;index+=1){
    if(source[index]==='%'&&isLatexCommentPercent(source,index)){
      const newline=source.indexOf('\n',index);
      if(newline<0)break;
      output+='\n';index=newline;
      continue;
    }
    output+=source[index];
  }
  return output;
}
export function normalizeGroupWhitespace(source:string){return source.replace(/[ \t]+}/g,'}');}

/**
 * Removes bodies of common macro/environment definitions while preserving line
 * structure. Validators that ask whether learner code actively uses a command
 * should not be satisfied by an unused command hidden inside a definition.
 * This is intentionally a small structural scanner, not a TeX parser.
 */
export function stripLatexDefinitionBodies(source:string){
  let output=source;
  const ranges:Array<[number,number]>=[];
  const commandDefinitions=[
    /\\(?:newcommand|renewcommand|providecommand|DeclareRobustCommand)\*?\s*(?:\{\\[A-Za-z@]+\}|\\[A-Za-z@]+)(?:\s*\[[^\]]*\]){0,2}\s*\{/g,
    /\\(?:def|gdef|edef|xdef)\s*\\[A-Za-z@]+[^{}]*\{/g
  ];
  for(const pattern of commandDefinitions){
    for(const match of source.matchAll(pattern)){
      const open=(match.index??0)+match[0].lastIndexOf('{');
      const close=findGroupEnd(source,open);
      if(close>open)ranges.push([open+1,close]);
    }
  }
  for(const match of source.matchAll(/\\(?:newenvironment|renewenvironment)\*?\s*\{[^}]+\}(?:\s*\[[^\]]*\]){0,2}\s*\{/g)){
    const firstOpen=(match.index??0)+match[0].lastIndexOf('{');
    const firstClose=findGroupEnd(source,firstOpen);
    if(firstClose<=firstOpen)continue;
    ranges.push([firstOpen+1,firstClose]);
    const secondOpen=nextNonWhitespace(source,firstClose+1);
    if(source[secondOpen]==='{'){
      const secondClose=findGroupEnd(source,secondOpen);
      if(secondClose>secondOpen)ranges.push([secondOpen+1,secondClose]);
    }
  }
  for(const [start,end] of ranges.sort((a,b)=>b[0]-a[0]))output=output.slice(0,start)+blankPreservingLines(output.slice(start,end))+output.slice(end);
  return output;
}

export function activeLatexSource(source:string){return stripLatexDefinitionBodies(stripLatexComments(source));}
export function activeLatexPreamble(source:string){return activeLatexSource(source).split(/\\begin\s*\{document\}/)[0]??'';}

export function commandCount(source:string,name:string){
  const escaped=escapeRegExp(name);
  return (activeLatexSource(source).match(new RegExp(`\\\\${escaped}(?=[^A-Za-z@]|$)`,'g'))??[]).length;
}

export function hasEnvironment(source:string,name:string){
  const escaped=escapeRegExp(name);
  return new RegExp(`\\\\begin\\s*\\{${escaped}\\}[\\s\\S]*?\\\\end\\s*\\{${escaped}\\}`).test(activeLatexSource(source));
}

export function environmentCount(source:string,name:string){
  const escaped=escapeRegExp(name);
  return [...activeLatexSource(source).matchAll(new RegExp(`\\\\begin\\s*\\{${escaped}\\}`,'g'))].length;
}

export function loadedPackages(source:string){
  const preamble=activeLatexPreamble(source);
  const result=new Set<string>();
  for(const match of preamble.matchAll(/\\usepackage(?:\[[^\]]*\])?\{([^}]+)\}/g))for(const name of match[1].split(',').map(value=>value.trim()).filter(Boolean))result.add(name);
  return result;
}

export function hasPackage(source:string,name:string){return loadedPackages(source).has(name);}

export function documentClass(source:string){
  return activeLatexPreamble(source).match(/\\documentclass(?:\[([^\]]*)\])?\{([^}]+)\}/)?.[2]?.trim()??null;
}

export function documentClassOptions(source:string){
  const match=activeLatexPreamble(source).match(/\\documentclass(?:\[([^\]]*)\])?\{[^}]+\}/);
  return (match?.[1]??'').split(',').map(value=>value.trim()).filter(Boolean);
}

export function hasDocumentClassOption(source:string,option:string){return documentClassOptions(source).includes(option);}
export function hasStructuralText(source:string,value:string){return source.includes(value)||normalizeGroupWhitespace(source).includes(normalizeGroupWhitespace(value));}
export function hasActiveStructuralText(source:string,value:string){const active=activeLatexSource(source);return hasStructuralText(active,value);}

export function hasParagraph(source:string){
  const body=source.match(/\\begin\{document\}([\s\S]*?)\\end\{document\}/)?.[1]??source;
  const stripped=activeLatexSource(body).replace(/\\[a-zA-Z@]+\*?(?:\[[^\]]*\])?(?:\{[^}]*\})?/g,' ').replace(/[{}$^_&]/g,' ').replace(/\s+/g,' ').trim();
  return /[\p{L}\p{N}]{2,}/u.test(stripped);
}

export function hasInlineMath(source:string){return /(?<!\\)\$[^$\n]+(?<!\\)\$|\\\([^\n]+\\\)/.test(activeLatexSource(source));}
export function hasDisplayMath(source:string){return /\\\[[\s\S]*?\\\]|\$\$[\s\S]*?\$\$|\\begin\{(?:equation\*?|align\*?)\}[\s\S]*?\\end\{(?:equation\*?|align\*?)\}/.test(activeLatexSource(source));}

export function environmentsBalanced(source:string){
  const stack:string[]=[];
  for(const token of activeLatexSource(source).matchAll(/\\(begin|end)\s*\{([^}]+)\}/g)){
    if(token[1]==='begin')stack.push(token[2]);
    else if(stack.pop()!==token[2])return false;
  }
  return stack.length===0;
}

export function firstLineContaining(source:string,value:string){
  const exact=source.indexOf(value);
  if(exact>=0)return source.slice(0,exact).split('\n').length;
  const normalizedValue=normalizeGroupWhitespace(value);
  const index=source.split('\n').findIndex(line=>normalizeGroupWhitespace(line).includes(normalizedValue));
  return index>=0?index+1:undefined;
}
export function firstActiveLineContaining(source:string,value:string){return firstLineContaining(activeLatexSource(source),value);}

function findGroupEnd(source:string,open:number){
  if(source[open]!=='{')return -1;
  let depth=0;
  for(let index=open;index<source.length;index++){
    const char=source[index];
    if(char==='%'&&isLatexCommentPercent(source,index)){
      const newline=source.indexOf('\n',index);if(newline<0)return -1;index=newline;continue;
    }
    if(char==='{'&&source[index-1]!=='\\')depth+=1;
    if(char==='}'&&source[index-1]!=='\\'){depth-=1;if(depth===0)return index;}
  }
  return -1;
}
function nextNonWhitespace(source:string,start:number){let index=start;while(index<source.length&&/\s/.test(source[index]))index+=1;return index;}
function blankPreservingLines(value:string){return value.replace(/[^\n]/g,' ');}

export const latexAnalysisInternals={escapeRegExp,findGroupEnd};