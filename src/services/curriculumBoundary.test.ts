import { describe, expect, it } from 'vitest';

const sources=import.meta.glob('../**/*.{ts,tsx}',{query:'?raw',import:'default',eager:true}) as Record<string,string>;
const forbidden=/from\s+['"][^'"]*\/data\/(courses|concepts|projects|reference)['"]/g;

describe('curriculum runtime boundary',()=>{
  it('keeps application code off mutable curriculum seed modules',()=>{
    const violations:string[]=[];
    for(const [path,source] of Object.entries(sources)){
      if(path.includes('/data/')||path.endsWith('curriculumBoundary.test.ts'))continue;
      const imports=[...source.matchAll(forbidden)].map(match=>match[0]);
      if(imports.length)violations.push(`${path}: ${imports.join(', ')}`);
    }
    expect(violations,violations.join('\n')).toEqual([]);
  });
});
