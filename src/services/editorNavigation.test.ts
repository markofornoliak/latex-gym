import { describe, expect, it } from 'vitest';
import { diagnosticFitsSource } from './editorNavigation';
import type { Diagnostic } from '../types';

const diagnostic=(line:number):Diagnostic=>({severity:'error',line,message:'test',explanation:'test'});

describe('editor diagnostic navigation',()=>{
  it('accepts only line numbers that exist in the current source',()=>{
    const source='first\nsecond\nthird';
    expect(diagnosticFitsSource(diagnostic(1),source)).toBe(true);
    expect(diagnosticFitsSource(diagnostic(3),source)).toBe(true);
    expect(diagnosticFitsSource(diagnostic(0),source)).toBe(false);
    expect(diagnosticFitsSource(diagnostic(4),source)).toBe(false);
  });

  it('treats an empty source as a single addressable editor line',()=>{
    expect(diagnosticFitsSource(diagnostic(1),'')).toBe(true);
    expect(diagnosticFitsSource(diagnostic(2),'')).toBe(false);
  });
});
