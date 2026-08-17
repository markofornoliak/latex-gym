import { describe, expect, it } from 'vitest';
import { validateProjectStage } from './projectValidator';
import type { CompileResult, LearningProject } from '../types';

const compiled:CompileResult={ok:true,diagnostics:[],blocks:[],elapsedMs:1,engine:'educational-preview'};
const failed:CompileResult={ok:false,diagnostics:[{severity:'error',line:2,message:'error',explanation:'broken'}],blocks:[],elapsedMs:1,engine:'educational-preview'};
const stage=(requirements:string[]):LearningProject['stages'][number]=>({id:'stage',title:'Stage',objective:'Build the required structure.',requirements,starterCode:'\\documentclass{article}'});

describe('project stage acceptance',()=>{
  it('does not accept a root document that has not compiled',()=>{
    const result=validateProjectStage(stage(['article','document environment']),'\\documentclass{article}\n\\begin{document}\nText.\n\\end{document}');
    expect(result.ok).toBe(false);
    expect(result.items[0].label).toBe('Документ компилируется');
  });

  it('accepts compilation plus satisfied structural requirements',()=>{
    const source='\\documentclass{article}\n\\begin{document}\nText.\n\\end{document}';
    expect(validateProjectStage(stage(['article','document environment']),source,compiled).ok).toBe(true);
  });

  it('keeps a missing semantic requirement blocking even when compilation succeeds',()=>{
    const source='\\documentclass{article}\n\\begin{document}\n\\begin{equation}E=mc^2\\end{equation}\n\\end{document}';
    const result=validateProjectStage(stage(['equation','label']),source,compiled);
    expect(result.ok).toBe(false);
    expect(result.items.find(item=>item.label==='label')?.ok).toBe(false);
  });

  it('rejects a failed compile before project completion',()=>{
    const source='\\documentclass{article}\n\\begin{document}\nText.';
    expect(validateProjectStage(stage(['article']),source,failed).ok).toBe(false);
  });
});
