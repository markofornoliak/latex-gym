import { describe,expect,it } from 'vitest';
import { getExercise } from '../data/courses';
import { validateExercise } from './validator';
import type { CompileResult } from '../types';

const successfulCompile:CompileResult={ok:true,diagnostics:[],blocks:[],elapsedMs:1,engine:'educational-preview'};

describe('foundation exercise semantic acceptance',()=>{
  it('accepts a structurally correct document without requiring reference-answer text',()=>{
    const exercise=getExercise('e01');
    expect(exercise).toBeDefined();
    const source='\\documentclass{article}\n\\begin{document}\nДругой допустимый абзац.\n\\end{document}';
    const result=validateExercise(exercise!,source,successfulCompile);
    expect(result.items.filter(item=>item.blocking&&!item.ok)).toEqual([]);
    expect(result.ok).toBe(true);
  });
});
