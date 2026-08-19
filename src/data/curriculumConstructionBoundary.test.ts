import { describe, expect, it } from 'vitest';

const sources=import.meta.glob('./*.ts',{query:'?raw',import:'default',eager:true}) as Record<string,string>;
const seedImport=/from\s+['"]\.\/courses['"]/;

describe('curriculum construction boundary',()=>{
  it('allows only the build pipeline to read mutable seed arrays',()=>{
    const violations:string[]=[];
    for(const [path,source] of Object.entries(sources)){
      if(path.endsWith('/curriculumBuild.ts')||path.endsWith('/courses.ts')||path.endsWith('.test.ts'))continue;
      if(seedImport.test(source))violations.push(path);
    }
    expect(violations,`Seed imports outside curriculumBuild:\n${violations.join('\n')}`).toEqual([]);
  });

  it('keeps runtime curriculum loading independent from construction services',()=>{
    const runtime=sources['./curriculumRuntime.ts']??'';
    expect(runtime).not.toContain('./courses');
    expect(runtime).not.toContain('curriculumLinter');
    expect(runtime).not.toContain('curriculumGraph');
    expect(runtime).toContain('curriculumSnapshot.generated.json');
  });
});
