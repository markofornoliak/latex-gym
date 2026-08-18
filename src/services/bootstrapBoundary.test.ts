import { describe, expect, it } from 'vitest';

const sources=import.meta.glob(['../app/App.tsx','../components/AppShell.tsx','../pages/OnboardingPage.tsx'],{query:'?raw',import:'default',eager:true}) as Record<string,string>;
const forbidden=/^\s*import\s+[^;\n]*from\s+['"][^'"]*\/data\/(curriculumRuntime|runtimeCatalog)['"]/gm;

describe('bootstrap dependency boundary',()=>{
  it('keeps the application shell and initial onboarding route off static curriculum imports',()=>{
    const violations:string[]=[];
    for(const [path,source] of Object.entries(sources)){
      const imports=[...source.matchAll(forbidden)].map(match=>match[0].trim());
      if(imports.length)violations.push(`${path}: ${imports.join(', ')}`);
    }
    expect(violations,violations.join('\n')).toEqual([]);
  });
});
