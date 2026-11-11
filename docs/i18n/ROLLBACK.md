# i18n rollback notes

## Goal

Removing the language switch must leave the app usable in English with no broken UI.

## Safe rollback (feature off, code stays)

1. Hide or delete `LanguageSwitch` from `PageFrame` / `profile`.
2. Do not call `setLanguage('ur')` — default `initI18n('en')` + `fallbackLng: 'en'`.
3. Leave locale JSON and `t()` calls in place (English strings are the source for EN mode).

## Hard rollback (revert feature)

1. Revert commits on `cursor/i18n-urdu-phase10-11-dcf3` or drop the PR.
2. Optional: leave `profiles.preferred_language` column (additive; unused is harmless).
3. Do **not** force-push rewritten history on Lovable-connected branches.

## Migration

`reference/migrations/12_preferred_language.sql` is additive (`ADD COLUMN IF NOT EXISTS`). Skipping it only disables profile sync; `localStorage` still works when the switch is present.
