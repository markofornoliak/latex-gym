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

## Build boundary

`curriculumBuild.ts` performs only deterministic derivation and validation:

1. materialize the canonical hierarchy;
2. derive flat lesson and exercise catalogs;
3. assert canonical concept IDs;
4. lint curriculum integrity;
5. derive the concept dependency graph;
6. generate `curriculumSnapshot.generated.json`.

Runtime application code reads only the generated immutable snapshot through `curriculumRuntime.ts` / `runtimeCatalog.ts`.

## Verification

Run:

```bash
npm run curriculum:check
npm run typecheck
npm test
npm run build
```

`curriculumBaseline.json` locks every compatibility-sensitive ID and the pre-migration semantic fingerprint. A deliberate educational-content change may update that fingerprint only as an explicit reviewed curriculum change; architectural refactors must not change it.
