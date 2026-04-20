# Spreadsheets v2 — Collaboration WS P2P → Server Broadcast Migration Plan

Owner: Office / Spreadsheets
Status: Draft proposal
Related PRs: [#2447](https://bitbucket.org/new-work-team/gravity-business-apps/pull-requests/2447)
Related change (done as a stop-gap): `cells_changed` WS emit is now style-only (values excluded) — see `UniverSheetGrid.tsx::buildCollabCellsChangedPayload`.

## 1. Context

Spreadsheets v2 intends this architecture:

- **Writes**: Client → HTTP batch (`/api/v1/v2/spreadsheets/:id/...`, handled by `document-service/src/spreadsheets-v2/*`).
- **Read sync (live)**: Server → WS broadcast to all clients in the room, after persistence (`batch_operations` over `/v2/spreadsheet-collaboration`).
- **Snapshot persistence**: Client PUTs the Univer workbook snapshot (styles, merges, dimensions, sheet-level settings) via `POST /v2/spreadsheets/:id/sheets/:sheetId/univer-snapshot`.

In practice we still run a hybrid, with the backend gateway relaying a subset of non-authoritative `document_operation` events peer-to-peer (see `spreadsheet-v2-collaboration.gateway.ts::handleDocumentOperation`). This creates two problems:

1. **Value conflict / delete-echo bug** – before the stop-gap, values traveled on two channels (P2P `cells_changed` _and_ server `batch_operations`). A peer-applied style-only payload left stale `v`/`f`/`m` on the receiver because Univer's `setValue` merges, so the receiver then rebroadcast the stale value and the sender saw its delete "come back".
2. **Missing styles/dimensions broadcast** – once the P2P relay is cut, live styling/row-height updates disappear unless the server emits a matching broadcast after the snapshot PUT.
3. **v1 API still accessible** – legacy `/api/v1/spreadsheets/*` controllers are still reachable and could be hit by stale clients, producing divergent state.

This plan describes the move to a clean v2 model where the **server is the single broadcaster**.

## 2. Current state (as of this commit)

| Channel                                                                                | Direction           | Data carried today                                   | Authoritative?                            |
| -------------------------------------------------------------------------------------- | ------------------- | ---------------------------------------------------- | ----------------------------------------- |
| HTTP batch (`set_cell`, `set_range`, `clear_cell`, `row_*`, `add_rows`, `delete_rows`) | C→S                 | cell values, row structure                           | **Yes** (persisted)                       |
| WS `batch_operations`                                                                  | S→C (fan-out)       | rebroadcast of the above                             | Yes                                       |
| HTTP univer-snapshot PUT                                                               | C→S                 | styles, merges, col widths / row heights, sheet meta | Yes (persisted) – **not broadcast** today |
| WS `cells_changed` (`document_operation`, `broadcastOnly: true`)                       | C→gateway→C (relay) | **style-only after this commit** (was value + style) | No                                        |
| WS `dimension_sync` (`document_operation`, `broadcastOnly: true`)                      | C→gateway→C (relay) | row heights / col widths                             | No                                        |
| WS `column_add` / `column_update` / `column_delete` / `columns_reorder`                | C→gateway→C (relay) | schema column changes                                | No                                        |

`spreadsheetAuthoritativeOperationTypes` in `spreadsheet-v2-collaboration.gateway.ts` short-circuits the relay for the HTTP-persisted types; all others are forwarded to peers.

## 3. Target state

- **All read fan-out goes through the server.** Clients never relay to peers. Gateway stops accepting `document_operation` (or ignores unknown types).
- **Styles, dimensions and columns** gain authoritative HTTP endpoints (or piggy-back on the existing batch endpoint) and are rebroadcast from `SpreadsheetV2Service.broadcastCommittedOperations`.
- **v1 API** is shut down on the server (410/Gone + structured error). Clients only use v2.
- **Echo suppression** remains on receive-only; no client ever optimistic-broadcasts.

Diagram:

```
           ┌──────────────┐   HTTP (batch / styles / dims / cols / snapshot)
Client ───►│ document-svc │── persists + bumps version
           │  v2 service  │── broadcasts `batch_operations` over WS to the room
           └──────────────┘
Client ◄── WS `batch_operations` (single source of truth)
```

## 4. Work items

### 4.1 Server — extend authoritative operations (document-service)

Add new operation types to the v2 batch pipeline so formatting/dimensions/columns become first-class ops that get persisted **and** broadcast.

- File: `document-service/src/spreadsheets-v2/spreadsheet-v2.service.ts`
  - Extend the batch op union handled by `applyBatchOperations`/`applyOperation` with:
    - `set_style` (single / range) — writes the style entry into the workbook snapshot styles map and links the cell(s) to it.
    - `set_row_height` / `set_col_width` — updates dimension arrays in the snapshot.
    - `column_add` / `column_update` / `column_delete` / `columns_reorder` — updates spreadsheet column metadata (currently handled via a separate controller today).
  - In `broadcastCommittedOperations` add a branch that, for these new op types, pushes a `batch_operations` item that peers can apply directly (same pattern as `set_cell` today).
- File: `document-service/src/spreadsheets-v2/spreadsheet-v2-collaboration.gateway.ts`
  - Add the new types to `spreadsheetAuthoritativeOperationTypes`.
  - Replace `handleDocumentOperation`'s "unknown → P2P relay" fallback with `return { success: false, error: 'unsupported_document_operation' }` (or silently drop with diagnostic). No more peer relay.

### 4.2 Server — snapshot fan-out (optional but recommended)

After `saveUniverSnapshot` succeeds, emit a compact `snapshot_updated` WS event with only the changed top-level keys (`styles`, `rowData`, `columnData`, merges) so late-joining / drifted clients can reconcile without a full refetch. Piggy-back on `batch_operations` to keep the client receive pipeline narrow.

### 4.3 Server — disable v1 APIs

- File: `document-service/src/spreadsheets/spreadsheets.controller.ts` (v1)
  - Either remove the controller class or replace each handler with a thin wrapper that returns `410 Gone` with `{ code: 'spreadsheets_v1_removed', v2Path: '/v2/spreadsheets/...' }`.
  - Remove from the module imports / wire up an `ApiDeprecated` guard.
- Same for the v1 WS namespace if any still exists in the gateway. Currently clients only use `/v2/spreadsheet-collaboration`, so the gateway either never had a v1 namespace or it is already dead — confirm during implementation.
- Operational: keep the code path deployed for one release with `410` so we see in logs if any client is still calling v1 before we delete entirely.

### 4.4 Client — stop emitting non-authoritative P2P events

- File: `gravity-business-apps/.../components/UniverSheetGrid.tsx`
  - Remove `emitCollabIfNeeded` (the remaining `cells_changed` emit). Styles travel via the new authoritative `set_style` op (queued into the existing cell batch pipeline).
  - Drop the `buildCollabCellsChangedPayload` + `collectCollabWireEntries` + `buildCollabWireSignature` helpers after confirming nothing else uses them.
- File: `gravity-business-apps/.../SpreadsheetAppViewer.tsx`
  - Remove the `dimension_sync` emit. Row height / col width changes are pushed to the new `set_row_height` / `set_col_width` HTTP batch ops.
- File: `gravity-business-apps/.../hooks/useSpreadsheetColumns.ts`
  - Remove the `column_add` / `column_update` / `column_delete` / `columns_reorder` emits; route these mutations through the v2 batch endpoint.
- File: `gravity-business-apps/.../services/SpreadsheetCollaborationManager.ts`
  - Remove `handleCellsChanged` and the `handleDocumentOperation` peer-relay receive paths; the new authoritative `batch_operations` receive pipeline is the only source of truth.
  - Remove `CellsChangedCell.value` from the type (now never sent).

### 4.5 Client — extend receive pipeline for the new ops

- File: `gravity-business-apps/.../services/SpreadsheetCollaborationManager.ts`
  - Add `handleSetStyle`, `handleSetRowHeight`, `handleSetColWidth`, `handleColumn*` (including `columns_reorder`) cases to `handleBatchOperations` (the server `batch_operations` fan-out).
  - Route style ops into the existing `addStyles` + `setValue({s: id})` flow; dimension ops into Univer's row/col size setters; column ops into the existing column-state update callbacks.

### 4.6 Echo suppression cleanup

With all inbound changes arriving via `batch_operations` only, `RemoteEchoSuppressionEntry.signatures` no longer needs multi-signature handling — we can shrink it back to a single string or drop the 'blank' fallback once per-op types are stable. Keep during migration as a safety net.

### 4.7 Rollout

Single-step, atomic deploy: server + client ship together in one release. No feature flag, no staged rollout.

- Server: new `set_style` / `set_row_height` / `set_col_width` / `column_add` / `column_update` / `column_delete` / `columns_reorder` batch ops go live with broadcast; gateway rejects unknown `document_operation` with `{ success: false, error: 'unsupported_document_operation' }`.
- Client: stops emitting all non-authoritative `document_operation`s; receive pipeline handles the new `batch_operations` types; legacy P2P emit/receive helpers are deleted in the same release.
- v1 URL namespace shutdown (§4.3) can ride the same release or follow independently; it is not a prerequisite for the server-broadcast switch.

## 5. Risks & mitigations

| Risk                                                            | Mitigation                                                                                                                                     |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Larger `batch_operations` payloads (styles are heavy)           | Fan-out only style-_id_ plus delta in the styles map; don't resend the full cell snapshot                                                      |
| Stale client loaded before the deploy keeps emitting P2P ops    | Gateway rejects unknown `document_operation`; the affected client gets a hard error and must refresh. Acceptable for a single-release cutover. |
| v1 shutdown breaks a background integration we don't know about | Ship 410 with structured body for one release, monitor access logs before removal                                                              |

## 6. Observability

- Keep `collab_receive_*` diagnostics on the client; tag with `collab_receive_source: 'server' | 'p2p'` so any unexpected P2P delivery post-deploy is visible.
- Server: add counters per new op type in `broadcastCommittedOperations` and a counter for `unsupported_document_operation` rejections in the gateway.

## 7. Acceptance criteria

- No client emits `document_operation` with a non-authoritative type post-deploy (verified via the `collab_receive_source` tag and the gateway's `unsupported_document_operation` counter staying flat).
- Styles, row/column dimensions and schema column changes (including `columns_reorder`) all propagate to peers within the same latency budget as current `set_cell` broadcasts (< 300 ms p95 on staging).
- Deleting a cell value with formatting no longer causes the echo regression across any number of peers (validated by the manual repro from the originating bug and an automated e2e).
- `/api/v1/spreadsheets/*` returns `410 Gone` and no 2xx responses are seen in production access logs for 7 consecutive days before code removal.

## 8. Out of scope

- Changing the CRDT/OT model — we keep the current "server is authoritative, version-bumped" approach.
- Offline editing behaviour — untouched; the existing offline queue keeps working because it already targets the HTTP batch endpoint.
