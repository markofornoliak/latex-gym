# Curriculum authoring

`curriculumSource.json` is the single canonical source of educational content in LaTeX Gym.

The authored hierarchy is:

`modules -> lessons -> exercises`

Concepts, reference entries and projects live in the same source file. Flat `lessons` and `exercises` catalogs are derived by `curriculumSource.ts`; they must never be maintained as a second authored copy.

## Compatibility rules

- Module, lesson, exercise, concept, reference, project and project-stage IDs are persistence contracts. Do not rename or regenerate them from array positions.
- Historical `e01`-style exercise IDs remain aliases only in `exerciseIdentity.ts`.
- Historical concept spellings remain aliases only in `conceptAliases.ts` and persistence migration helpers.
- New curriculum content must use canonical concept IDs directly.
- Do not add build-time transforms that patch lesson text, validators, solutions or pedagogy after authoring.
- Structural validation must not trim, coerce, normalize or otherwise rewrite authored educational content.

## Validation boundary

`curriculumSource.ts` is the trust boundary for authored JSON. It passes the raw import through `parseCurriculumSource` in `curriculumSchema.ts` before any compatibility adapter or build service can consume it.

Structural validation rejects malformed object shapes, unknown fields, invalid enum values, missing required fields, wrong scalar/array types, invalid validator-specific fields and invalid regular expressions with precise data paths. It does not mutate the source.

After structural parsing, `curriculumLinter.ts` validates cross-record invariants that depend on the complete catalog: stable identity uniqueness, module/lesson ownership, concept foreign keys, project prerequisites, lesson-to-project-stage references, reference metadata, solution/validator compatibility and curriculum graph integrity.

## Build boundary

`curriculumBuild.ts` performs only deterministic derivation and validation:

1. structurally validate the canonical JSON at `curriculumSource.ts`;
2. materialize the canonical hierarchy;
3. derive flat lesson and exercise catalogs;
4. assert canonical concept IDs;
5. lint semantic and referential curriculum integrity;
6. derive the concept dependency graph;
7. validate and generate `curriculumSnapshot.generated.json`.

Runtime application code reads only the generated immutable snapshot through `curriculumRuntime.ts` / `runtimeCatalog.ts`. The schema implementation is intentionally kept out of the runtime import path.

## Verification

Run:

```bash
npm run curriculum:validate
npm run curriculum:check
npm run typecheck
npm test
npm run build
```

`curriculumBaseline.json` locks every compatibility-sensitive ID and the pre-migration semantic fingerprint. A deliberate educational-content change may update that fingerprint only as an explicit reviewed curriculum change; architectural refactors must not change it.
