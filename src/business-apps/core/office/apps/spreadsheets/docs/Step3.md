# Step 3 — Rich workbook policy (structural collab)

This document describes **Step 3** of the spreadsheet structural collaboration roadmap: how we handle **committed batches** when the workbook contains features beyond plain cell values (merges, formulas, filters, etc.).

## Roadmap status

| Step | Topic                                             | Status                                                                                           |
| ---- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 1    | Remote grid apply for `move_cell_range`           | **Done**                                                                                         |
| 2    | Visible grid column index alignment               | **Done**                                                                                         |
| 3    | Rich workbook policy (this doc)                   | **Partial** — Policy **A** for merges/metadata; formula gate narrowed to move from/to ranges     |
| 4    | Cut/paste vs drag-move collab (`move_cell_range`) | **Done** — cut+paste emits a single `move_cell_range` batch; follow-up Univer ops suppressed ~2s |
| 5    | Hide/unhide + freeze on committed-batch path      | **Done** — see [Step 5 (done)](#step-5-hideunhide--freeze-done)                                  |
| 6    | Two-client E2E / integration tests                | **Partial** — `__tests__/spreadsheetDeltaReplayCollabHarness.test.ts` (automated matrix)         |

**Delta replay flag:** committed-batch lightweight replay is **on by default**. Set `localStorage['gba.spreadsheets.deltaReplay']` to `'off'` to roll back to legacy `handleBatchOperations`. **`shadow`** is deprecated: it still plans and traces, then falls through to legacy apply (same as before default flip).

---

## Problem

Lightweight collaboration applies **structural** operations without reloading the full sheet:

- Session rows (`ViewerRow` / relational data)
- Univer grid (native insert/delete/move commands)

That path is reliable for **plain value grids**. It is **not** yet correct for sheets where structural edits must also update:

- Merged regions
- Formula references (`cellData[*][*].f`)
- Conditional formatting, validation, filters, protection, charts, images, groups, …

Step 3 defines **what the receiver does** when such a sheet receives a structural op (e.g. `move_cell_range`, `insert_row_slots`).

---

## Where the policy lives

| File                                                  | Role                                                                                                   |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `core/spreadsheetDeltaFeatureMatrix.ts`               | `validateCommittedBatchFeatureSupport()` — gate before planning                                        |
| `core/spreadsheetRemoteTransaction.ts`                | `planCommittedSpreadsheetRemoteTransaction()` — calls the gate                                         |
| `services/SpreadsheetCollaborationManager.ts`         | On plan failure with delta replay **enabled** → `requestSnapshotFallback` and **stop** (no live apply) |
| `core/univerRemoteTransactionRunner.ts`               | Cell ops in runner; structural row/column + deferred feature ops no-op in runner                       |
| `core/__tests__/spreadsheetRemoteTransaction.test.ts` | Tests for reject reasons (`mergeData`, `formulas`, …)                                                  |

### Flow (delta replay enabled)

```
Remote batch_operations received
  → planCommittedSpreadsheetRemoteTransaction()
       → validateCommittedBatchFeatureSupport()
            → ok: session patch + runRemoteTransaction + live grid hooks (Steps 1–2, 4–5)
            → unsupported_workbook_feature: requestSnapshotFallback + return (no live apply)
```

After a successful plan, `SpreadsheetCollaborationManager` applies structural live hooks (`applyRemoteMoveCellRangeLive`, row slot ops, …) and **Step 5** feature hooks (`applyRemoteVisibilityUpdatesLive`, `applyRemoteFreezePanesLive`) for ops in the batch.

---

## What counts as “rich workbook”

### Range-bound metadata (sheet-level)

If **any** of these keys has entries on the worksheet snapshot, **all structural ops** in the batch are blocked for lightweight replay:

- `mergeData`
- `conditionalFormatting`
- `dataValidation`
- `filter` / `filterData`
- `protectedRanges`
- `namedRanges`
- `comments`, `notes`
- `images`, `charts`, `drawings`
- `rowGroups`, `columnGroups`

See `RANGE_BOUND_WORKBOOK_KEYS` in `spreadsheetDeltaFeatureMatrix.ts`.

**Note:** `visibility_update` and `freeze_panes` are **not** blocked by this matrix. They are listed in `SUPPORTED_PHASE_ONE_OPS` and applied on the committed path (Step 5).

### Formulas (`move_cell_range` only)

If the batch contains `move_cell_range` and **any** cell in `fromRange` or `toRange` has an `f` property in `cellData`, planning fails with `detail: 'formulas'`.

Formulas elsewhere on the sheet do **not** block the move.

### Structural ops affected by the rich-workbook gate

`STRUCTURAL_OPS` in the feature matrix (blocked when rich metadata is present):

- `insert_row_slots`, `delete_row_slots`, `move_row_slots`
- `move_cell_range`
- `column_add`, `column_delete`
- `columns_reorder`, `column_reorder`

Cell-level ops (`set_cell`, `set_range`, `set_style`, …) use different paths and are not gated the same way.

### Ops outside phase-one committed replay

These use the **live P2P feature** path (`SPREADSHEET_FEATURE_OP_TYPES`), not `SUPPORTED_PHASE_ONE_OPS`:

- `merge_ranges`, `unmerge_ranges`
- `filter_update`, `filter_clear`
- `protect_ranges_update`, `sheet_protection_update`

If they appear only as committed batch op types without separate wiring, planning would fail with `unsupported_operation`.

---

## Policy options

| Policy                       | Receiver behavior                                                                                                                | Pros                                               | Cons                                                                |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------- |
| **A. Hard reject (current)** | Plan fails → `requestSnapshotFallback` → full snapshot reload; **no** session/live grid apply                                    | Safe; server snapshot is authoritative             | Heavy UX; move may look “missing” until reload completes            |
| **B. Explicit fallback**     | Still apply session + native grid (e.g. `applyRemoteMoveCellRangeLive`); skip fragile Univer delta projection; trace as degraded | Often correct **visible** move without full reload | Merges/formulas on sheet may be wrong until refresh or full support |
| **C. Full support (future)** | Extend verified Univer command replay to update merges, formula refs, etc.                                                       | Correct for rich sheets                            | Large scope; not Step 3                                             |

**Step 3 implementation** = choose and wire **A vs B** (per feature and/or per op), plus diagnostics and tests — not full **C**.

**Current product choice:** **Policy A** for all `RANGE_BOUND_WORKBOOK_KEYS` and formula-in-move-range failures — planning rejects, `requestSnapshotFallback`, no live structural apply. Policy B remains a future opt-in per op type.

### Recommended direction (when implementing)

- Keep **A** for high-risk metadata: `mergeData`, filters, protection, charts, …
- Consider **B** for `move_cell_range` when the only blocker is **formulas outside the moved range**
- Narrow formula check to **formulas intersecting `fromRange`** (not entire sheet)

---

## Diagnostics

| Outcome                          | Typical client stages                                                                                                                                  |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Lightweight path (plain sheet)   | `client_committed_batch_transaction_planned` → `client_committed_batch_transaction_applied` → `client_collab_cell_range_move_grid_applied` (for moves) |
| Hard reject (current rich sheet) | `client_committed_batch_transaction_rejected` (`reason` / `detail`: e.g. `mergeData`, `formulas`) → snapshot fallback scheduled                        |
| Explicit fallback (if added)     | `client_committed_batch_transaction_applied` + grid applied + e.g. `client_collab_*_degraded_apply` (name TBD)                                         |
| Hide/unhide / freeze (Step 5)    | `client_collab_visibility_update_grid_applied` / `client_collab_freeze_panes_grid_applied` (or `_failed`)                                              |

Filter diagnostics timeline by batch id or `move_cell_range`.

---

## Relationship to other work

### Not caused by Step 2

Step 2 aligned **visible grid column indices** for `move_cell_range` (`spreadsheetMoveCellRangeGrid.ts`). It did **not** change the feature matrix or snapshot fallback.

### Step 5: Hide/unhide + freeze (done)

Row/column hide and freeze panes use `visibility_update` and `freeze_panes`. They are **not** subject to the rich-workbook structural gate in `spreadsheetDeltaFeatureMatrix.ts`.

**Committed-batch path (delta replay enabled):**

1. `validateCommittedBatchFeatureSupport()` allows both op types (`SUPPORTED_PHASE_ONE_OPS`).
2. `univerRemoteTransactionRunner` treats them as `RUNNER_DEFERRED_LIVE_FEATURE_OPS` (no cell paint in runner).
3. After session patch + structural live hooks, `SpreadsheetCollaborationManager` calls:
   - `extractVisibilityUpdatesFromOperations` → `applyRemoteVisibilityUpdatesLive`
   - `extractFreezePanesFromOperations` → `applyRemoteFreezePanesLive`

**Live P2P path:** same feature types via `SPREADSHEET_FEATURE_OP_TYPES` → `applyRemoteSpreadsheetFeatureOperation`.

### Step 4: Cut/paste (done)

- **Drag-move** → `move_cell_range` (Univer `move-range` / `move-cell`).
- **Cut+paste** → `sheet.command.cut-paste` captured via `pendingCutCellRangeRef` + `resolveCutPasteCellRangeMove` → `onCellRangeMove` → single `move_cell_range` HTTP batch (same shape as drag-move).
- Follow-up collab noise (`set-range-values`, region style replace) suppressed for ~2s via `shouldSuppressCutPasteFollowUpCollab` (`spreadsheetCutPasteMove.ts`).

Copy-paste remains on paste / `set_range` paths, not `move_cell_range`.

---

## Test plan (after Step 3 is implemented)

### 1. Plain sheet (regression)

- No merges, no formulas in snapshot.
- Two clients: move cell → receiver uses lightweight path only.
- No snapshot fallback for that batch.

### 2. Rich sheet — merged

- At least one entry in `mergeData`.
- Sender: structural op (e.g. move or row insert).
- Receiver: behavior matches chosen policy (**A** = reject + snapshot; **B** = degraded live apply if implemented).

### 3. Rich sheet — formulas

- At least one `f` in `cellData`.
- Sender: `move_cell_range` on a **non-formula** cell.
- Receiver: per policy (ideally **B** if formula is outside `fromRange` after tightened check).

### 4. Diagnostics

- Confirm expected stages in Spreadsheet diagnostics (no silent skip).

### 5. Step 5 regression (done — keep in E2E)

- Two clients: hide column → peer sees `visibility_update` applied (`client_collab_visibility_update_grid_applied`).
- Freeze panes → `client_collab_freeze_panes_grid_applied`.

### 6. Step 4 regression (done — keep in E2E)

- Cut+paste range → sender batch is **only** `move_cell_range` (matching `fromRange`/`toRange` dimensions).
- Peer receives move on plain sheet without snapshot fallback.

---

## Code references

```typescript
// spreadsheetDeltaFeatureMatrix.ts — structural gate (simplified)
if (!STRUCTURAL_OPS.has(operation.type)) continue
if (operationMayMoveFormulaCells(operation, worksheet)) {
  return { ok: false, reason: 'unsupported_workbook_feature', detail: 'formulas' }
}
for (const key of RANGE_BOUND_WORKBOOK_KEYS) {
  if (valueHasEntries(worksheet?.[key])) {
    return { ok: false, reason: 'unsupported_workbook_feature', detail: key }
  }
}
```

```typescript
// SpreadsheetCollaborationManager.ts — on plan failure (delta replay enabled)
if (!transactionPlan.ok && replayMode === 'enabled') {
  this.requestSnapshotFallback({
    /* reason: transactionPlan.reason, detail */
  })
  return
}
```

```typescript
// SpreadsheetCollaborationManager.ts — Step 5 after successful committed apply
const visibilityUpdates = this.extractVisibilityUpdatesFromOperations(gridReadyBatch.operations)
if (visibilityUpdates.length > 0) {
  this.applyRemoteVisibilityUpdatesLive({ sheetId, updates: visibilityUpdates, traceMeta, isLocalEcho })
}
const freezePanesUpdates = this.extractFreezePanesFromOperations(gridReadyBatch.operations)
if (freezePanesUpdates.length > 0) {
  this.applyRemoteFreezePanesLive({ sheetId, updates: freezePanesUpdates, traceMeta, isLocalEcho })
}
```

---

## Open decisions (before coding Step 3)

1. **Default for `move_cell_range`:** stay **A** everywhere, or **B** when only formulas block (outside moved range)?
2. **Per-op vs per-sheet:** one policy for all `STRUCTURAL_OPS`, or stricter for row/column ops than for moves?
3. **Shadow mode:** should shadow runs log “would have degraded-applied” for product metrics?

Record decisions in this file when Step 3 is implemented.
