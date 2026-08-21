export type Diagnostic = {
  severity: 'error' | 'warning' | 'info';
  line: number;
  message: string;
  explanation: string;
  suggestion?: string;
  file?: string;
  column?: number;
  from?: number;
  to?: number;
  source?: 'tex' | 'latex-gym' | 'validator';
  relatedConcept?: string;
  possibleFix?: string;
  originalCompilerMessage?: string;
  cascade?: 'root' | 'secondary';
};

export type PreviewBlock =
  | { type: 'title'; text: string; meta?: string }
  | { type: 'heading'; level: 1 | 2 | 3; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'math'; latex: string; display: boolean }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'table'; rows: string[][] }
  | { type: 'notice'; text: string };

export type CompilerAuthority='educational'|'real-tex';
export type CompilerEngine = 'educational-preview' | 'pdflatex' | 'xelatex' | 'lualatex';
export type CompilerPhase = 'ready' | 'queued' | 'initializing' | 'compiling' | 'resolving-references' | 'running-bibliography' | 'recompiling' | 'success' | 'warning' | 'error';
export type CompilationState = CompilerPhase;

export type CompilerCapabilities = {
  realPdf:boolean;
  engines:Array<Exclude<CompilerEngine,'educational-preview'>>;
  multiFile:boolean;
  bibtex:boolean;
  biber:boolean;
  multiplePasses:boolean;
  synctex:boolean;
  shellEscape:boolean;
  offline:boolean;
};

export type CompilerProjectFile = {path:string;content:string | Uint8Array};
export type CompilerProject = {mainFile:string;files:CompilerProjectFile[]};
export type CompilerArtifact = {name:string;type:'pdf'|'log'|'auxiliary'|'synctex';bytes?:Uint8Array;text?:string};

export type CompileResult = {
  ok: boolean;
  diagnostics: Diagnostic[];
  blocks: PreviewBlock[];
  elapsedMs: number;
  engine: CompilerEngine;
  providerId?: string;
  pdf?: Uint8Array;
  rawLog?: string;
  artifacts?: CompilerArtifact[];
  capabilities?: CompilerCapabilities;
  fallbackReason?: string;
};

export type CompileOptions = {
  engine?: Exclude<CompilerEngine,'educational-preview'>;
  bibliography?: 'auto'|'none'|'bibtex';
  rerun?: boolean;
  signal?: AbortSignal;
  onPhase?: (phase:CompilerPhase)=>void;
};
