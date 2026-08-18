import { describe, expect, it } from 'vitest';

const sources=import.meta.glob('./*.ts',{query:'?raw',import:'default',eager:true}) as Record<string,string>;
const seedImport=/from\s+['"]\.\/courses['"]/;

describe('curriculum construction boundary',()=>{
  it('allows the finalized runtime to read seed arrays but forbids transform modules from importing them',()=>{
    const violations:string[]=[];
    for(const [path,source] of Object.entries(sources)){
      if(path.endsWith('/curriculumRuntime.ts')||path.endsWith('/courses.ts')||path.endsWith('.test.ts'))continue;
      if(seedImport.test(source))violations.push(path);
    }
    expect(violations,`Seed imports outside curriculumRuntime:\n${violations.join('\n')}`).toEqual([]);
  });
});
