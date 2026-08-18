export type Difficulty = 'Начальный' | 'Базовый' | 'Средний' | 'Продвинутый' | 'Экспертный';
export type PracticeCategory = 'Основы' | 'Текст' | 'Математика' | 'Таблицы' | 'Графика' | 'TikZ' | 'Библиография' | 'Большие документы' | 'Отладка' | 'Academic challenges';

export type TheoryBlock = {
  id: string;
  title: string;
  body: string;
  code?: string;
  note?: string;
};

export type LearningBlock =
  | { id:string; type:'concept'|'explanation'; title:string; body:string; details?:string }
  | { id:string; type:'syntax'; title:string; body:string; code:string; note?:string }
  | { id:string; type:'anatomy'; title:string; body?:string; source:string; parts:Array<{token:string;label:string;description:string}> }
  | { id:string; type:'flow'; title:string; body?:string; steps:Array<{label:string;detail:string}> }
  | { id:string; type:'example'; title:string; body:string; code:string }
  | { id:string; type:'source-output'; title:string; body:string; code:string }
  | { id:string; type:'comparison'; title:string; body?:string; left:{label:string;code:string;note:string}; right:{label:string;code:string;note:string} }
  | { id:string; type:'mistake'|'warning'; title:string; body:string; code?:string; correction?:string }
  | { id:string; type:'checkpoint'; title:string; prompt:string; answer:string; code?:string };

export type ExampleBlock = {
  id: string;
  title: string;
  description: string;
  code: string;
};

export type ValidatorRule =
  | { type: 'documentClass'; value: string; message: string; hint: string }
  | { type: 'documentClassOption'; value: string; message: string; hint: string }
  | { type: 'environment'; value: string; message: string; hint: string }
  | { type: 'command'; value: string; min?: number; message: string; hint: string }
  | { type: 'package'; value: string; message: string; hint: string }
  | { type: 'containsText'; value: string; message: string; hint: string }
  | { type: 'forbiddenText'; value: string; message: string; hint: string }
  | { type: 'regex'; value: string; flags?: string; message: string; hint: string }
  | { type: 'paragraph'; message: string; hint: string }
  | { type: 'inlineMath'; message: string; hint: string }
  | { type: 'displayMath'; message: string; hint: string }
  | { type: 'balancedEnvironments'; message: string; hint: string }
  | { type: 'compiles'; message: string; hint: string };

export type Exercise = {
  id: string;
  lessonId: string;
  category: PracticeCategory;
  difficulty: Difficulty;
  mode: 'Написать код' | 'Исправить ошибку' | 'Предсказать результат' | 'Дополнить документ' | 'Рефакторинг' | 'Найти ошибку' | 'Воссоздать результат' | 'Текст → LaTeX' | 'Улучшить код' | 'Собрать документ' | 'Объяснить' | 'Архитектура';
  title: string;
  instructions: string;
  requirements: string[];
  starterCode: string;
  validators: ValidatorRule[];
  hints: string[];
  solution: string;
  concepts: string[];
  prerequisites?: string[];
};

export type LessonPedagogy = {
  objective: string;
  prerequisites: string[];
  introduces: string[];
  reinforces: string[];
  misconceptions: string[];
  practiceObjective: string;
  masteryCriteria: string[];
};

export type Lesson = {
  id: string;
  moduleId: string;
  number: number;
  title: string;
  subtitle: string;
  difficulty: Difficulty;
  theory: TheoryBlock[];
  content?: LearningBlock[];
  pedagogy?: LessonPedagogy;
  examples: ExampleBlock[];
  exercises: Exercise[];
  relatedCommands: string[];
  projectStage?: string;
};

export type CourseModule = {
  id: string;
  number: number;
  title: string;
  description: string;
  prerequisites: string;
  difficulty: Difficulty;
  lessons: Lesson[];
};

export type ConceptDefinition = {
  id:string;
  title:string;
  description:string;
  prerequisites:string[];
  referenceIds?:string[];
};

export type Diagnostic = {
  severity: 'error' | 'warning' | 'info';
  line: number;
  message: string;
  explanation: string;
  suggestion?: string;
  column?: number;
  from?: number;
  to?: number;
  source?: 'tex' | 'latex-gym' | 'validator';
  relatedConcept?: string;
  possibleFix?: string;
  originalCompilerMessage?: string;
};

export type PreviewBlock =
  | { type: 'title'; text: string; meta?: string }
  | { type: 'heading'; level: 1 | 2 | 3; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'math'; latex: string; display: boolean }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'table'; rows: string[][] }
  | { type: 'notice'; text: string };

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

export type CompilerProjectFile = {
  path:string;
  content:string | Uint8Array;
};

export type CompilerProject = {
  mainFile:string;
  files:CompilerProjectFile[];
};

export type CompilerArtifact = {
  name:string;
  type:'pdf'|'log'|'auxiliary'|'synctex';
  bytes?:Uint8Array;
  text?:string;
};

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
  onPhase?: (phase:CompilerPhase)=>void;
};

export type ReferenceEntry = {
  id: string;
  command: string;
  category: string;
  aliases: string[];
  title: string;
  description: string;
  syntax: string;
  example: string;
  resultLatex?: string;
  related: string[];
  arguments?: Array<{name:string;required:boolean;description:string}>;
  mathMode?: 'required'|'optional'|'no';
  package?: string;
  commonMistake?: string;
};

export type LearningProject = {
  id:string;
  title:string;
  subtitle:string;
  difficulty:Difficulty;
  description:string;
  prerequisites:string[];
  concepts:string[];
  stages:Array<{id:string;title:string;objective:string;requirements:string[];starterCode:string}>;
};

export type ConceptMastery = {
  score:number;
  attempts:number;
  successes:number;
  mistakeCount:number;
  lastPracticed:string|null;
  stability:number;
  nextReview:string|null;
};

export type Bookmark = { id: string; type: 'lesson' | 'exercise' | 'reference'; targetId: string; createdAt: string };
export type HistoryEntry = { id: string; at: string; text: string; kind: 'lesson' | 'exercise' | 'reference' };
