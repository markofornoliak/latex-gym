import { describe, expect, it } from 'vitest';
import { getExercise } from '../data/courses';
import { validateExercise } from './validator';

describe('semantic validation',()=>{
  it('accepts a logically equivalent document structure solution',()=>{
    const exercise = getExercise('e01')!;
    const source='\\documentclass{article}\n\\begin{document}\nДругой допустимый абзац.\n\\end{document}';
    const result=validateExercise(exercise,source,{ok:true,diagnostics:[],blocks:[],elapsedMs:1,engine:'educational-preview'});
    expect(result.ok).toBe(true);
  });
  it('rejects an exercise without required section',()=>{
    const exercise=getExercise('e03')!;
    const source='\\documentclass{article}\n\\begin{document}\nТекст.\n\\end{document}';
    const result=validateExercise(exercise,source,{ok:true,diagnostics:[],blocks:[],elapsedMs:1,engine:'educational-preview'});
    expect(result.ok).toBe(false);
  });
});
