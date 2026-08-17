import type { CompileResult, Exercise, ValidatorRule } from '../types';

export type ValidationItem = { ok:boolean; message:string; hint:string };
export type ValidationResult = { ok:boolean; items:ValidationItem[] };

function countCommand(source:string, name:string) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  return (source.match(new RegExp(`\\\\${escaped}(?=\\s*\\{|\\s*\\[|\\b)`, 'g')) ?? []).length;
}
function hasEnvironment(source:string, name:string) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  return new RegExp(`\\\\begin\\s*\\{${escaped}\\}[\\s\\S]*?\\\\end\\s*\\{${escaped}\\}`).test(source);
}
function hasParagraph(source:string) {
  const body = source.match(/\\begin\{document\}([\s\S]*?)\\end\{document\}/)?.[1] ?? source;
  const stripped = body.replace(/%.*$/gm,'').replace(/\\[a-zA-Z@]+\*?(?:\[[^\]]*\])?(?:\{[^}]*\})?/g,' ').replace(/[{}$^_&]/g,' ').replace(/\s+/g,' ').trim();
  return /[\p{L}\p{N}]{2,}/u.test(stripped);
}
function hasInlineMath(source:string) {
  return /(?<!\\)\$[^$\n]+(?<!\\)\$/.test(source);
}
function hasDisplayMath(source:string) {
  return /\\\[[\s\S]*?\\\]|\$\$[\s\S]*?\$\$|\\begin\{(?:equation\*?|align\*?)\}[\s\S]*?\\end\{(?:equation\*?|align\*?)\}/.test(source);
}

export function validateExercise(exercise:Exercise, source:string, compileResult?:CompileResult):ValidationResult {
  const items = exercise.validators.map(rule => validateRule(rule,source,compileResult));
  return { ok:items.every(i=>i.ok), items };
}

function validateRule(rule:ValidatorRule, source:string, compileResult?:CompileResult):ValidationItem {
  let ok = false;
  switch(rule.type) {
    case 'documentClass': ok = new RegExp(`\\\\documentclass(?:\\[[^\\]]*\\])?\\{${rule.value}\\}`).test(source); break;
    case 'environment': ok = hasEnvironment(source,rule.value); break;
    case 'command': ok = countCommand(source,rule.value) >= (rule.min ?? 1); break;
    case 'containsText': ok = source.includes(rule.value); break;
    case 'paragraph': ok = hasParagraph(source); break;
    case 'inlineMath': ok = hasInlineMath(source); break;
    case 'displayMath': ok = hasDisplayMath(source); break;
    case 'compiles': ok = Boolean(compileResult?.ok); break;
  }
  return {ok,message:rule.message,hint:rule.hint};
}
