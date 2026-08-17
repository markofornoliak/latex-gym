export type Difficulty = 'Начальный' | 'Базовый' | 'Средний' | 'Продвинутый' | 'Экспертный';
export type PracticeCategory = 'Основы' | 'Текст' | 'Математика' | 'Таблицы' | 'Графика' | 'TikZ' | 'Библиография' | 'Большие документы' | 'Отладка' | 'Academic challenges';

export type TheoryBlock = {
  id: string;
  title: string;
  body: string;
  code?: string;
  note?: string;
};

export type ExampleBlock = {
  id: string;
  title: string;
  description: string;
  code: string;
};

export type ValidatorRule =
  | { type: 'documentClass'; value: string; message: string; hint: string }
  | { type: 'environment'; value: string; message: string; hint: string }
  | { type: 'command'; value: string; min?: number; message: string; hint: string }
  | { type: 'containsText'; value: string; message: string; hint: string }
  | { type: 'paragraph'; message: string; hint: string }
  | { type: 'inlineMath'; message: string; hint: string }
  | { type: 'displayMath'; message: string; hint: string }
  | { type: 'compiles'; message: string; hint: string };

export type Exercise = {
  id: string;
  lessonId: string;
  category: PracticeCategory;
  difficulty: Difficulty;
  mode: 'Написать код' | 'Исправить ошибку' | 'Предсказать результат' | 'Дополнить документ' | 'Рефакторинг' | 'Найти ошибку' | 'Воссоздать результат' | 'Текст → LaTeX' | 'Улучшить код' | 'Собрать документ';
  title: string;
  instructions: string;
  requirements: string[];
  starterCode: string;
  validators: ValidatorRule[];
  hints: string[];
  solution: string;
  concepts: string[];
};

export type Lesson = {
  id: string;
  moduleId: string;
  number: number;
  title: string;
  subtitle: string;
  difficulty: Difficulty;
  theory: TheoryBlock[];
  examples: ExampleBlock[];
  exercises: Exercise[];
  relatedCommands: string[];
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

export type Diagnostic = {
  severity: 'error' | 'warning' | 'info';
  line: number;
  message: string;
  explanation: string;
  suggestion?: string;
};

export type PreviewBlock =
  | { type: 'title'; text: string; meta?: string }
  | { type: 'heading'; level: 1 | 2 | 3; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'math'; latex: string; display: boolean }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'table'; rows: string[][] }
  | { type: 'notice'; text: string };

export type CompileResult = {
  ok: boolean;
  diagnostics: Diagnostic[];
  blocks: PreviewBlock[];
  elapsedMs: number;
  engine: 'educational-preview' | 'wasm-tex';
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
};

export type Bookmark = { id: string; type: 'lesson' | 'exercise' | 'reference'; targetId: string; createdAt: string };
export type HistoryEntry = { id: string; at: string; text: string; kind: 'lesson' | 'exercise' | 'reference' };
