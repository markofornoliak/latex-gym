import { describe, expect, it } from 'vitest';
import { decodeProjectAsset, encodeProjectAsset, isEncodedProjectAsset, isSupportedProjectAsset, projectAssetProblem, toBinaryAwareCompilerProject } from './projectAssets';

describe('project assets',()=>{
  it('round-trips binary files through the local string persistence format',()=>{
    const bytes=new Uint8Array([37,80,68,70,45,49,46,52]);
    const encoded=encodeProjectAsset(bytes);
    expect(isEncodedProjectAsset(encoded)).toBe(true);
    expect([...decodeProjectAsset(encoded)!]).toEqual([...bytes]);
  });

  it('converts persisted binary values back to compiler bytes without touching text files',()=>{
    const encoded=encodeProjectAsset(new Uint8Array([137,80,78,71]));
    const project=toBinaryAwareCompilerProject({mainFile:'main.tex',files:{'main.tex':'\\documentclass{article}','figure.png':encoded}});
    expect(project.files.find(file=>file.path==='main.tex')?.content).toBe('\\documentclass{article}');
    expect(project.files.find(file=>file.path==='figure.png')?.content).toBeInstanceOf(Uint8Array);
  });

  it('allows only image/PDF formats that the current TeX workflow can consume directly',()=>{
    expect(isSupportedProjectAsset('response.pdf')).toBe(true);
    expect(isSupportedProjectAsset('figures/plot.PNG')).toBe(true);
    expect(isSupportedProjectAsset('diagram.svg')).toBe(false);
    expect(isSupportedProjectAsset('script.sh')).toBe(false);
  });

  it('treats malformed persisted binary envelopes as recoverable invalid data',()=>{
    const corrupted='__LATEX_GYM_BINARY_V1__:%%%not-base64%%%';
    expect(()=>decodeProjectAsset(corrupted)).not.toThrow();
    expect(decodeProjectAsset(corrupted)).toBeNull();
    const workspace={mainFile:'main.tex',files:{'main.tex':'\\documentclass{article}','figure.png':corrupted}};
    expect(projectAssetProblem(workspace)).toContain('повреждён');
    expect(()=>toBinaryAwareCompilerProject(workspace)).toThrow(/повреждён/);
  });

  it('rejects binary envelopes under unsupported extensions',()=>{
    const encoded=encodeProjectAsset(new Uint8Array([1,2,3]));
    const workspace={mainFile:'main.tex',files:{'main.tex':'', 'payload.tex':encoded}};
    expect(projectAssetProblem(workspace)).toContain('неподдерживаемое');
  });
});