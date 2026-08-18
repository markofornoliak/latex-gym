import { describe, expect, it } from 'vitest';

const sources=import.meta.glob('../**/*.{ts,tsx}',{query:'?raw',import:'default',eager:true}) as Record<string,string>;
const forbidden=/from\s+['"][^'"]*\/data\/(courses|concepts|projects|reference)['"]/g;
const constructionServices=new Set(['./curriculumLinter.ts','./curriculumGraph.ts']);

describe('curriculum runtime boundary',()=>{
  it('keeps runtime application code off mutable curriculum seed modules',()=>{
    const violations:string[]=[];
    for(const [path,source] of Object.entries(sources)){
      if(path.includes('/data/')||path.endsWith('.test.ts')||path.endsWith('.test.tsx')||constructionServices.has(path))continue;
      const imports=[...source.matchAll(forbidden)].map(match=>match[0]);
      if(imports.length)violations.push(`${path}: ${imports.join(', ')}`);
    }
    expect(violations,violations.join('\n')).toEqual([]);
  });
});
