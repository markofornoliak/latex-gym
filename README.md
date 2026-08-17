# LaTeX gym

LaTeX gym is a static, local-first educational web application for learning LaTeX through a repeated cycle of theory, examples, writing, compilation, debugging, validation, and revision. The interface follows an academic editorial design rather than a dashboard aesthetic and is designed mobile-first while expanding into a three-pane workspace on desktop.

## Features

- 15 course modules with structured lesson data and 45 initial exercises.
- Theory, annotated examples, practical tasks, progressive hints, and non-exclusive reference solutions.
- CodeMirror 6 LaTeX editor with line numbers, brace matching, auto-closing, indentation, completions, undo/redo, formatting, reset, and fullscreen mode.
- A Web Worker-based educational compiler that checks common structural errors without blocking the UI.
- KaTeX rendering for supported mathematical fragments and structured local document previews.
- Semantic exercise validation: solutions are checked by document structure and required concepts, not by exact source-string equality.
- Educational diagnostics for mismatched environments, unbalanced braces, common command typos, missing packages, duplicate labels, and math-mode errors.
- Searchable Russian/LaTeX command reference with `Ctrl/Cmd + K` search.
- Playground with local drafts, templates, compilation, and `.tex` download.
- Bookmarks, learning history, progress, attempts, hints, deterministic spaced repetition, daily training, and streaks.
- Versioned local persistence through Zustand/localStorage, with JSON export/import.
- Responsive mobile navigation and desktop lesson/practice workspaces; practical panes are resizable on desktop.
- PWA caching for the application shell, lesson data, and essential assets.
- GitHub Pages-safe routing with `HashRouter` and Vite `base: '/latex-gym/'`.

## Technology

React, TypeScript, Vite, React Router, Zustand, CodeMirror 6, KaTeX, Vite PWA, Vitest, Web Workers.

No backend, database, authentication server, paid API, or external AI API is required.

## Local development

Requirements: Node.js 22+ and npm.

```bash
npm install
npm run dev
```

Type checking and tests:

```bash
npm run typecheck
npm test
```

Production build:

```bash
npm run build
npm run preview
```

## GitHub Pages deployment

The repository is configured for the project URL:

`https://markofornoliak.github.io/latex-gym/`

`vite.config.ts` uses `/latex-gym/` as the production base and the application uses hash routing, so route refreshes and direct entry remain compatible with a Pages project subpath.

The workflow in `.github/workflows/deploy.yml` runs on pushes to `main`:

1. checkout;
2. setup Node;
3. `npm ci`;
4. typecheck;
5. tests;
6. production build;
7. configure Pages;
8. upload `dist`;
9. deploy to GitHub Pages.

In the repository settings, Pages must use **GitHub Actions** as its source.

## Project architecture

```text
src/
  app/             routing and application composition
  components/      reusable UI, editor, preview and shell
  data/            curriculum and reference data
  pages/           route-level screens
  services/        compiler, validation, spaced repetition
  store/           versioned local learning state
  styles/          design system and responsive layout
  types/           shared domain types
```

Course content is independent of page components. `src/data/courses.ts` exports modules, lessons, and exercises as structured data, allowing hundreds of lessons to be added without rewriting the frontend.

## Adding a lesson

Add a lesson seed in `src/data/courses.ts` with:

- module metadata;
- lesson id/title/difficulty;
- theory blocks;
- a complete example;
- related commands;
- exercises.

The routes, course table of contents, progress calculation, daily training and lesson navigation derive from the data automatically.

## Adding an exercise

Each exercise defines instructions, requirements, starter source, validators, hints, a reference solution, concepts and a practice mode.

Validators are semantic rules such as:

- `documentClass`;
- `environment`;
- `command` with an optional minimum count;
- `containsText`;
- `paragraph`;
- `inlineMath`;
- `displayMath`;
- `compiles`.

This means a learner can submit a logically equivalent solution instead of reproducing the reference source exactly.

## Compiler architecture

`LatexCompiler` is the stable provider interface.

The default `EducationalCompiler` runs in a Web Worker and intentionally supports a documented educational subset. It parses supported document structures into a local preview and returns structured diagnostics. KaTeX handles supported mathematical fragments.

`WasmTexCompilerProvider` is isolated behind the same interface for a future full TeX/WASM bundle. The current build does **not** claim that unsupported packages or arbitrary TeX were compiled successfully. This separation keeps the initial GitHub Pages bundle lightweight and prevents a fake “compiler” experience.

A full WASM engine can later replace the provider without changing the editor, practice flow, validators, error UI, or preview contract.

## Browser notes

The application relies on modern browser support for ES2022, Web Workers, `localStorage`, and the File/Blob APIs. Clipboard operations require the browser to grant clipboard permission. PWA installation and offline behavior vary slightly between browser vendors. The educational preview cannot reproduce arbitrary LaTeX packages, external file contents, or a complete TeX distribution; such constructs are reported or represented explicitly rather than silently faked.

## Future development

The architecture leaves clean extension points for a full WASM TeX distribution, richer source-to-output mapping, additional reference entries, hundreds of lessons, and an optional `TutorProvider` backed by deterministic rules or a future external tutor service.
