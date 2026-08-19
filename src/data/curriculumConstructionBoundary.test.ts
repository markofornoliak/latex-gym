import { describe, expect, it } from 'vitest';

const sources=import.meta.glob('./*.ts',{query:'?raw',import:'default',eager:true}) as Record<string,string>;
const sourceImport=/from\s+['"]\.\/curriculumSource['"]/;
const jsonImport=/from\s+['"]\.\/curriculumSource\.json['"]/;
const allowedSourceReaders=new Set(['./curriculumBuild.ts','./courses.ts','./concepts.ts','./projects.ts','./reference.ts']);

describe('curriculum construction boundary',()=>{
  it('keeps the canonical JSON behind one typed loader',()=>{
    const violations=Object.entries(sources)
      .filter(([path])=>!path.endsWith('.test.ts'))
      .filter(([path,source])=>path!=='./curriculumSource.ts'&&jsonImport.test(source))
      .map(([path])=>path);
    expect(violations,`Direct curriculumSource.json imports:\n${violations.join('\n')}`).toEqual([]);
  });

  it('limits canonical source imports to build-time compatibility adapters',()=>{
    const violations=Object.entries(sources)
      .filter(([path])=>!path.endsWith('.test.ts')&&path!=='./curriculumSource.ts')
      .filter(([path,source])=>sourceImport.test(source)&&!allowedSourceReaders.has(path))
      .map(([path])=>path);
    expect(violations,`Unexpected curriculum source readers:\n${violations.join('\n')}`).toEqual([]);
  });

  it('builds directly from the canonical source without historical transforms',()=>{
    const build=sources['./curriculumBuild.ts']??'';
    expect(build).toContain('./curriculumSource');
    for(const historical of ['curriculumExpansion','deepCurriculum','debuggingTrackTransform','editorialEnhancements','explanationElaboration','applyStableExerciseIds','normalizeCurriculumDraft'])expect(build).not.toContain(historical);
  });

  it('keeps runtime curriculum loading independent from authoring and construction services',()=>{
    const runtime=sources['./curriculumRuntime.ts']??'';
    expect(runtime).not.toContain('./curriculumSource');
    expect(runtime).not.toContain('./courses');
    expect(runtime).not.toContain('curriculumLinter');
    expect(runtime).not.toContain('curriculumGraph');
    expect(runtime).toContain('curriculumSnapshot.generated.json');
  });
});
