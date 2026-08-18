import { beforeEach, describe, expect, it } from 'vitest';

class MemoryStorage implements Storage{
  private values=new Map<string,string>();
  get length(){return this.values.size;}
  clear(){this.values.clear();}
  getItem(key:string){return this.values.get(key)??null;}
  key(index:number){return Array.from(this.values.keys())[index]??null;}
  removeItem(key:string){this.values.delete(key);}
  setItem(key:string,value:string){this.values.set(key,String(value));}
}

Object.defineProperty(globalThis,'localStorage',{value:new MemoryStorage(),configurable:true});

const storeModule=await import('./useAppStore');
const {useAppStore,exportProgress}=storeModule;

beforeEach(()=>{
  localStorage.clear();
  useAppStore.getState().resetProgress();
});

describe('project persistence schema v4',()=>{
  it('imports an old single-source project draft as main.tex without deleting the legacy draft',()=>{
    const legacy='\\documentclass{article}\n\\begin{document}\nLegacy project\n\\end{document}';
    const response=useAppStore.getState().importProgress(JSON.stringify({
      schemaVersion:3,
      progress:{drafts:{}},
      projects:{completedStages:{},drafts:{'project:academic-paper:workspace':legacy}}
    }));
    expect(response.ok).toBe(true);
    const state=useAppStore.getState();
    expect(state.projectWorkspaces['academic-paper'].mainFile).toBe('main.tex');
    expect(state.projectWorkspaces['academic-paper'].files['main.tex']).toBe(legacy);
    expect(state.drafts['project:academic-paper:workspace']).toBe(legacy);
  });

  it('exports versioned project workspaces separately from ordinary drafts',()=>{
    useAppStore.getState().ensureProjectWorkspace('academic-paper','\\documentclass{article}');
    useAppStore.getState().setDraft('exercise:e01','exercise source');
    const exported=JSON.parse(exportProgress());
    expect(exported.schemaVersion).toBe(4);
    expect(exported.projects.workspaces['academic-paper'].files['main.tex']).toContain('documentclass');
    expect(exported.progress.drafts['exercise:e01']).toBe('exercise source');
  });
});
