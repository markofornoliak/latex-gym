import { describe, expect, it } from 'vitest';
import { buildSourceOutputMap } from './sourceOutputLinking';
import type { PreviewBlock } from '../types';

describe('source-output causality',()=>{
  it('links a section command to its rendered heading',()=>{
    const source='\\section{Methods}\nText.';
    const blocks:PreviewBlock[]=[{type:'heading',level:1,text:'Methods'},{type:'paragraph',text:'Text.'}];
    const mapping=buildSourceOutputMap(source,blocks);
    expect(mapping.links.some(link=>source.slice(link.from,link.to)==='\\section{Methods}'&&link.target.blockIndex===0)).toBe(true);
  });

  it('links fraction command, numerator and denominator to the same rendered fraction with different parts',()=>{
    const source='\\[\\frac{a+b}{c}\\]';
    const blocks:PreviewBlock[]=[{type:'math',latex:'\\frac{a+b}{c}',display:true}];
    const mapping=buildSourceOutputMap(source,blocks);
    expect(mapping.links.map(link=>link.target.part).filter(Boolean).sort()).toEqual(['denominator','fraction','numerator']);
    const numerator=mapping.links.find(link=>link.target.part==='numerator')!;
    const denominator=mapping.links.find(link=>link.target.part==='denominator')!;
    expect(source.slice(numerator.from,numerator.to)).toBe('a+b');
    expect(source.slice(denominator.from,denominator.to)).toBe('c');
  });

  it('links label identity to the preceding structural object',()=>{
    const source='\\section{Results}\\label{sec:results}\nText.';
    const blocks:PreviewBlock[]=[{type:'heading',level:1,text:'Results'},{type:'paragraph',text:'Text.'}];
    const mapping=buildSourceOutputMap(source,blocks);
    const label=mapping.links.find(link=>source.slice(link.from,link.to)==='\\label{sec:results}');
    expect(label?.target.blockIndex).toBe(0);
  });
});
