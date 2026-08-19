const escapeRegExp=(value:string)=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

export function stripLatexComments(source:string){return source.replace(/(^|[^\\])%.*$/gm,'$1');}
export function normalizeGroupWhitespace(source:string){return source.replace(/[ \t]+}/g,'}');}

export function commandCount(source:string,name:string){
  const escaped=escapeRegExp(name);
  return (stripLatexComments(source).match(new RegExp(`\\\\${escaped}(?=[^A-Za-z@]|$)`,'g'))??[]).length;
}

export function hasEnvironment(source:string,name:string){
  const escaped=escapeRegExp(name);
  return new RegExp(`\\\\begin\\s*\\{${escaped}\\}[\\s\\S]*?\\\\end\\s*\\{${escaped}\\}`).test(stripLatexComments(source));
}

export function environmentCount(source:string,name:string){
  const escaped=escapeRegExp(name);
  return [...stripLatexComments(source).matchAll(new RegExp(`\\\\begin\\s*\\{${escaped}\\}`,'g'))].length;
}

export function loadedPackages(source:string){
  const preamble=(stripLatexComments(source).split(/\\begin\s*\{document\}/)[0]??'');
  const result=new Set<string>();
  for(const match of preamble.matchAll(/\\usepackage(?:\[[^\]]*\])?\{([^}]+)\}/g))for(const name of match[1].split(',').map(value=>value.trim()).filter(Boolean))result.add(name);
  return result;
}

export function hasPackage(source:string,name:string){return loadedPackages(source).has(name);}

export function documentClass(source:string){
  return stripLatexComments(source).match(/\\documentclass(?:\[([^\]]*)\])?\{([^}]+)\}/)?.[2]?.trim()??null;
}

export function documentClassOptions(source:string){
  const match=stripLatexComments(source).match(/\\documentclass(?:\[([^\]]*)\])?\{[^}]+\}/);
  return (match?.[1]??'').split(',').map(value=>value.trim()).filter(Boolean);
}

export function hasDocumentClassOption(source:string,option:string){return documentClassOptions(source).includes(option);}
export function hasStructuralText(source:string,value:string){return source.includes(value)||normalizeGroupWhitespace(source).includes(normalizeGroupWhitespace(value));}

export function hasParagraph(source:string){
  const body=source.match(/\\begin\{document\}([\s\S]*?)\\end\{document\}/)?.[1]??source;
  const stripped=stripLatexComments(body).replace(/\\[a-zA-Z@]+\*?(?:\[[^\]]*\])?(?:\{[^}]*\})?/g,' ').replace(/[{}$^_&]/g,' ').replace(/\s+/g,' ').trim();
  return /[\p{L}\p{N}]{2,}/u.test(stripped);
}

export function hasInlineMath(source:string){return /(?<!\\)\$[^$\n]+(?<!\\)\$/.test(stripLatexComments(source));}
export function hasDisplayMath(source:string){return /\\\[[\s\S]*?\\\]|\$\$[\s\S]*?\$\$|\\begin\{(?:equation\*?|align\*?)\}[\s\S]*?\\end\{(?:equation\*?|align\*?)\}/.test(stripLatexComments(source));}

export function environmentsBalanced(source:string){
  const stack:string[]=[];
  for(const token of stripLatexComments(source).matchAll(/\\(begin|end)\s*\{([^}]+)\}/g)){
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

export const latexAnalysisInternals={escapeRegExp};
