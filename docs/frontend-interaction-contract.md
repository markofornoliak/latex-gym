# Frontend interaction contract

This document describes learner-facing interaction guarantees. It is intentionally separate from curriculum validation, mastery scoring, compiler parsing and other backend/domain contracts.

## Preserve the visual identity

LaTeX Gym uses a restrained academic editorial system: warm white surfaces, dark navy structure, serif headings, UI sans-serif controls and monospaced source. Frontend maintenance should prefer semantic or behavioral fixes over page redesign. New interaction states must reuse the existing palette, spacing rhythm and border language unless a demonstrated usability defect requires otherwise.

The neutral text tokens used for secondary and muted text must continue to meet WCAG AA contrast for normal-size text on the surfaces where they appear. Do not restore a lighter token merely to make metadata feel quieter.

## Keyboard and focus

- Every route has one `main` landmark: `AppShell` owns it. Route components must not introduce nested `main` landmarks.
- SPA route changes move focus to `#main-content`.
- Multi-step interactions that replace content without changing the route, such as onboarding, move focus to the new stage heading after the transition.
- Modal dialogs must move focus inside on open, contain Tab/Shift+Tab, close with Escape and restore the element that opened them.
- CodeMirror must have an externally visible focus treatment even though the editor's internal outline is disabled.

## Tabs

Use `AccessibleTabs` for tabbed interfaces. The active tab is the only tab in the normal Tab order. Left/Right (and Up/Down), Home and End change the active tab and keyboard focus. Every tab must reference a real `tabpanel` using `aria-controls`; every panel must reference its active tab with `aria-labelledby`.

Do not reproduce a visual tab strip with unrelated plain buttons.

## Editor command help

Mouse hover may expose contextual command documentation, but hover must never be the only access path. The toolbar `Справка` action is the keyboard/touch equivalent and must remain usable when a reference entry is available at the caret.

Package quick fixes may add only the package implied by the current reference context. They must not silently make unrelated source changes.

## Diagnostics

A displayed diagnostic may offer source navigation only when the UI can prove that its file and line/range map to the current editable source.

- Single-file editors validate the diagnostic line against the current document before exposing navigation.
- Multi-file projects resolve the diagnostic file first, switch to that file, wait for the matching editor to mount and only then move the caret.
- Diagnostics without reliable position data show `Позиция в исходнике не определена`; never render a control that silently does nothing.
- Editor previous/next diagnostic controls appear only when at least one diagnostic is navigable.

Backend parsing remains authoritative for the diagnostic data itself. The frontend does not invent missing line numbers or file attribution.

## Practice modes and hints

The practice shell stays visually consistent across exercise modes, but interaction should reflect the cognitive operation.

Progressive hints use one shared state and must be available before the learner is forced to view a result. On phones the same hint state is exposed from Task, Code and Result without independent duplicated counters.

For debugging/minimal-fix tasks, global formatting is suppressed and the UI reports how many source lines differ from the starter. This discourages broad unrelated edits without claiming to validate semantic minimality.

Do not ship a dedicated Predict-the-Result or Locate-the-Error control unless the authored/backend contract can actually evaluate the learner's committed prediction or selected location. A decorative interaction that cannot be scored is not a completed mode.

## Progress visuals

Visual progress and mastery bars must expose `role="progressbar"`, a 0–100 range and the current value. Text must distinguish course completion from conceptual confidence; one must not be presented as the other.

## PWA and offline communication

The app shell may be available offline after service-worker preparation, but deferred lesson/editor assets become available after they have been fetched, and first availability of the full TeX runtime can still require a network connection. UI copy must preserve that distinction.

When supported by the browser, Settings may expose installation. Update-ready state should be explicit and user-controlled rather than silently refreshing an active exercise.

## Responsive verification

Frontend changes must be checked at least at 320, 360, 390 and 430 px phone widths, plus tablet and desktop. Existing production QA additionally covers 768, 1024, 1280, 1440, 1920, 2560 and 3840 px profiles.

For editor changes, verify touch accessory controls, virtual-keyboard-safe insertion, mobile Task/Code/Result switching and keyboard-only desktop workflows.

## Visual regression discipline

The approved visual identity is a compatibility surface. Automated screenshots are useful only if reviewers compare them to a known approved baseline or explicitly inspect the generated artifact. A route merely rendering expected text is not proof of visual parity.

When updating an approved baseline, document why the visual difference is intended. Do not update baselines merely to make an unexplained diff disappear.
