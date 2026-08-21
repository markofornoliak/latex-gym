# LaTeX gym

LaTeX gym is a static, local-first educational web application for learning LaTeX through theory, examples, writing, compilation, debugging, semantic validation, spaced retrieval and applied projects. The interface keeps an academic editorial style and is designed mobile-first while expanding into larger lesson, practice and project workspaces on desktop.

## Current scope

- 15 course modules.
- 68 lessons.
- 204 exercises.
- 5 cumulative learning projects.
- A searchable LaTeX reference linked to the curriculum concept graph.

Curriculum IDs are treated as persistent data identifiers because progress, bookmarks, drafts and mastery evidence depend on them.

## Features

- Structured theory, annotated examples, practical tasks, progressive hints and non-exclusive reference solutions.
- CodeMirror 6 LaTeX editor with line numbers, brace matching, auto-closing, indentation, completions, undo/redo, reset, save and keyboard shortcuts.
- Real browser-side TeX compilation through the BusyTeX WASM runtime when available.
- pdfLaTeX, XeLaTeX and LuaLaTeX engine selection in the compiler contract.
- Multi-file project compilation and BibTeX workflows.
- Explicit Biber capability rejection: the current browser provider does not pretend Biber succeeded.
- A Web Worker educational preview used only as an explicitly labelled fallback when real TeX is unavailable.
- KaTeX rendering for supported mathematical preview fragments.
- Semantic exercise validation based on authored requirements rather than exact equality with one reference source.
- Separate execution semantics for conceptual answers, TeX fragments, full documents and reconstruction tasks.
- Document-level `compiles` evidence requires a real TeX PDF by default; the educational fallback does not award real-compilation mastery.
- Diagnostics that preserve the original TeX log while adding educational explanation, likely root/cascade context and conservative multi-file attribution.
- Adversarial validator protection against requirements satisfied only in comments or unused macro definitions.
- Searchable command palette with `Ctrl/Cmd + K`, keyboard navigation, modal focus containment and focus restoration.
- Playground, local drafts, templates and `.tex` download.
- Bookmarks, learning history, attempts, hints, projects, deterministic daily training and streaks.
- Concept mastery that distinguishes independent, hinted, revealed, transfer and project evidence.
- Delayed-recall evidence so repeated successes in one short session do not by themselves imply durable retention.
- Versioned local persistence with JSON export/import, bounded import payloads and migration of historical exercise/document identifiers.
- Responsive layouts tested from 320 px phones through 4K viewports.
- GitHub Pages-safe `HashRouter` routing under `/latex-gym/`.

## Compiler architecture

`LatexCompiler` is the stable provider interface. The primary provider is `WasmTexCompilerProvider`, backed by a dedicated BusyTeX Worker. Compiler requests are cancellable; timeout or cancellation tears down the affected Worker so a timed-out TeX process cannot continue mutating later requests.

The provider supports:

- pdfLaTeX;
- XeLaTeX;
- LuaLaTeX;
- multi-file projects;
- BibTeX;
- repeated TeX passes when the BusyTeX pipeline requires them.

Biber, shell escape and SyncTeX are not claimed by the current provider. Unsupported capability is reported explicitly rather than converted into a fake success.

If the real runtime cannot be used, `EducationalPreviewCompiler` provides a fast structural preview in a separate Worker. Its result carries a fallback reason and lower compiler authority. A full-document assessment that requires real TeX therefore remains unconfirmed until a real PDF has been produced.

The BusyTeX runtime assets are fetched during production preparation from the reviewed upstream distribution and are accepted only when their SHA-256 hashes match the repository manifest. The full TeX runtime is not advertised as universally offline: browser caching can help after a successful load, but first availability depends on the runtime assets being reachable.

## Exercise execution and validation

Each exercise is resolved into one of four execution classes:

- `concept` — a concise answer surface, no fake compilation;
- `fragment` — CodeMirror plus structural/semantic validators, without forcing an incomplete TeX fragment into a standalone document;
- `document` — a full TeX compilation workflow;
- `reconstruction` — compiled target and learner document with semantic comparison criteria.

Validators include document class, document options, environments, commands, packages, required/forbidden structural text, regex constraints, paragraphs, inline/display math, balanced environments and compilation authority.

The validator layer strips comments and ignores bodies of unused command definitions for active structural evidence. This prevents obvious false-positive solutions such as satisfying `\\section` solely inside a comment.

## Learning evidence

Mastery is not identical to completion count. The local model records score, attempts, mistakes, independence, hints, solution reveals, transfer/project evidence, real-compilation evidence, stability and review timing.

A successful independent retrieval after a meaningful delay is recorded separately from immediate repetition. Same-session repetition may improve familiarity but receives strongly limited stability growth until delayed recall exists. Existing persisted mastery is migrated conservatively; schema upgrades do not intentionally reset old progress.

## Persistence and import safety

Application state is versioned. User documents are persisted separately from the Zustand progress payload and are migrated from earlier draft keys when necessary.

JSON import performs structural sanitization and also enforces operational bounds on overall payload size, collection sizes, document count, per-document size, aggregate document size and unsafe record keys. An oversized or malformed import fails before it is written into local document storage.

## Accessibility

The application includes a skip link and a focusable `<main>` landmark. SPA route transitions move focus to main content so keyboard and screen-reader users receive a meaningful navigation target. The command palette uses dialog semantics, a combobox/listbox relationship, keyboard navigation, Escape close, focus containment and opener-focus restoration.

## Quality gates

Pull requests to `main` and production pushes run the same core build gate:

1. install dependencies;
2. regenerate/validate the curriculum snapshot;
3. TypeScript typecheck;
4. full Vitest suite;
5. curriculum integrity checks;
6. production Vite build and bundle budgets;
7. verified BusyTeX smoke-runtime preparation;
8. browser TeX matrix: pdfLaTeX, XeLaTeX, LuaLaTeX and BibTeX, each required to emit real PDF bytes;
9. behavioral browser smoke: bookmark mutation, command-palette focus behavior and SPA route focus;
10. deep-route and responsive visual QA at 320, 360, 390, 430, 768, 1024, 1280, 1440, 1920, 2560 and 3840 pixel widths.

The `latex-gym-visual-qa` Actions artifact contains screenshots from the current device/route matrix. The workflow also fails on not-found route fallbacks and detected browser JavaScript errors.

GitHub Pages deployment is performed only for non-pull-request runs after the build gate succeeds.

## Technology

React, TypeScript, Vite, React Router, Zustand, CodeMirror 6, KaTeX, Vite PWA, Vitest, Web Workers and BusyTeX/WASM.

No backend, database, authentication server, paid API or external AI API is required for the learning application.

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

Curriculum-only gate:

```bash
npm run curriculum:check
```

Production build:

```bash
npm run build
npm run preview
```

The real BusyTeX runtime is prepared separately by the production workflow. `scripts/prepare-busytex.mjs` supports `smoke` and `full` preparation modes and verifies every downloaded runtime asset against the reviewed SHA-256 manifest.

## GitHub Pages deployment

The repository targets:

`https://markofornoliak.github.io/latex-gym/`

`vite.config.ts` uses `/latex-gym/` as the production base and the application uses hash routing, so deep links remain compatible with the Pages project subpath.

In repository settings, Pages must use **GitHub Actions** as its source.

## Project architecture

```text
src/
  app/             routing and application composition
  components/      reusable UI, editor, preview and shell
  data/            canonical curriculum, concepts, projects and reference data
  hooks/           document and compilation session lifecycle
  pages/           route-level screens
  services/        compiler, diagnostics, validation, graph and spaced repetition
  store/           versioned local learning state and persistence schema
  styles/          design system and responsive layout
  types/           shared domain contracts
scripts/
  qa/              production browser smoke harnesses
```

Course content remains independent of page components. Runtime indexes, course navigation, progress, daily training and project links derive from the canonical curriculum data instead of being duplicated in the UI.

## Adding or changing curriculum content

Preserve existing IDs unless a deliberate migration is supplied. A lesson or exercise change must keep the curriculum quality gate green.

Exercises define instructions, requirements, starter source, validators, hints, a reference solution, concepts and a practice mode. `execution` may be authored explicitly when inference from validators is not sufficient. A `compiles` validator may also specify compiler authority explicitly; otherwise full document/reconstruction work defaults to real-TeX authority.

The curriculum linter checks structural integrity, references, pedagogy dependencies, validator shape, reference-solution compatibility, project references and concept-graph consistency. Known warnings are held to an explicit regression baseline so new warning classes or counts cannot accumulate silently.
