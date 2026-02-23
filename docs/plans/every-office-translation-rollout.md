# EveryOffice Translation Rollout

## Scope

UI-layer translation rollout for EveryOffice surfaces:

- `Documents` (`document-apps`)
- `Notes` (`note-apps`)
- `Slides` (`slide-apps`)
- `Emails` (`email-apps`)

Covered layers in this rollout:

- Hub shell and navigation (sidebar, section headers, menus)
- Empty states and list/table labels
- Toast/feedback messages
- Key editor/list surfaces in active user flows

## Inventory

### Documents

- Hub and navigation: `src/business-apps/platform/apps/document-apps/DocumentAppsHub.tsx`
- Editor: `src/business-apps/platform/apps/document-apps/DocumentEditor.tsx`
- Dialog surfaces via hub wiring:
  - `ShareDocumentDialog`
  - `ManageSharesDialog`
  - `SendForApprovalDialog`

Primary string buckets:

- Sidebar labels and storage status
- New/create/upload menu labels
- Sort/search/list headers
- Empty states and CTA labels
- Action menu labels and toasts
- Editor save/export/status text

### Notes

- Hub and navigation: `src/business-apps/platform/apps/note-apps/NoteAppsHub.tsx`
- Editor entry wiring: `src/business-apps/platform/apps/note-apps/NoteEditor.tsx`
- Share dialog wiring:
  - `ShareNoteDialog`

Primary string buckets:

- Sidebar labels and quick-create menu
- Section titles and empty states
- Note lifecycle toasts (pin/archive/duplicate/favorites/link copy)
- Share title fallback text

### Slides

- Hub and navigation: `src/business-apps/platform/apps/slide-apps/SlidesAppsHub.tsx`
- Editor: `src/business-apps/platform/apps/slide-apps/components/SlideEditor.tsx`
- Share/manage dialog wiring:
  - `ShareSlideDialog`
  - `ManageSharesDialog`

Primary string buckets:

- Sidebar/menu/sort/search text
- Empty states and create CTA
- Slide lifecycle toasts
- Editor save/rename/export/element operation feedback

### Emails

- Hub orchestration: `src/business-apps/platform/apps/email-apps/EmailAppsHub.tsx`
- List view: `src/business-apps/platform/apps/email-apps/components/EmailList.tsx`

Primary string buckets:

- Sync/archive/sign-in error toasts
- Folder display labels (`Starred`, `Inbox`)
- Email list search/bulk actions/loading/empty/end-of-list labels

## i18n Bundle Structure

Added `_i18n` bundles for all four apps with required locales:

- `en-US.ftl`
- `de-DE.ftl`
- `ro-RO.ftl`
- `index.ts` (`?raw` imports)

Paths:

- `src/business-apps/platform/apps/document-apps/_i18n/`
- `src/business-apps/platform/apps/note-apps/_i18n/`
- `src/business-apps/platform/apps/slide-apps/_i18n/`
- `src/business-apps/platform/apps/email-apps/_i18n/`

## Key Naming Convention

This rollout uses kebab-case keys grouped by UI layer:

- `sidebar-*` navigation labels and shell text
- `menu-*` action labels
- `empty-*` empty states and CTAs
- `sort-*`, `header-*`, `table-*` list/table controls
- `toast-*` runtime feedback
- `editor-*` editor-specific status/actions

## Implementation Order Applied

1. Scaffold all `_i18n` bundles and locale parity.
2. Wire `useTranslation(translations)` in the four hub entry screens.
3. Replace high-visibility hub strings (sidebar/menu/empty/list/actions/toasts).
4. Extend translation wiring to key editor/list surfaces:
   - `DocumentEditor`
   - `SlideEditor`
   - `EmailList`
5. Keep dialog title fallbacks translated from hub call sites.

## QA Checklist

- [x] Locale bundles added for all four apps.
- [x] Key parity verified across `en-US` / `de-DE` / `ro-RO`.
- [x] ESLint clean for edited hub/editor/list files.
- [ ] Full runtime smoke in browser for:
  - `/platform/documents`
  - `/platform/notes`
  - `/platform/slides`
  - `/platform/mail`

## Follow-up Recommendations

- Complete remaining deep component localization in each module (especially large editors and secondary dialogs/panels).
- Localize date/time relative formatting helpers to remove hardcoded English outputs.
- Add locale-aware smoke tests (or visual checks) for the four routes in CI.
