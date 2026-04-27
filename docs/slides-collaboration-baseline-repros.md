# Slides Collaboration Baseline Repros

These repros capture the current slide collaboration failure modes before the
Yjs authority migration. They are intentionally manual because the failures span
two browser sessions, the frontend REST autosave path, and the document-service
collaboration gateway.

## Diagnostics To Capture

Run `document-service` with normal application logs enabled and filter for:

- `[Yjs sync]`
- `[Yjs bootstrap]`
- `[Yjs persist]`
- `[Yjs diagnostics]`

For slide rooms, the structured diagnostics include `key`, `source`,
`yjsSlideCount`, `storedSlideCount`, `slideCountMatches`, `slideCountDelta`,
`hasPersistedSnapshot`, `persistedSnapshotLength`, `yjsUpdatedAt`,
`entityUpdatedAt`, and `externalUpdateNewer`.

## 1. Stale Projection / Export Reads Old Slides

1. User A opens an existing slide deck.
2. User B opens the same deck in a second browser session.
3. User B edits slide content and waits until the collaboration update reaches
   User A, but does not make any local edit in User A's session.
4. Before User B's REST autosave wins, call `GET /slides/:id/slide-count` or
   `GET /slides/:id/html`.

Expected current result: the live editor can show User B's update while the REST
read model still reflects the old `contentJson.slides` projection. Diagnostics
should show `yjsSlideCount` and `storedSlideCount` for the room so divergence is
visible when counts differ.

## 2. Delete Replaces Whole Deck

1. User A and User B open the same deck with at least three slides.
2. User A edits an element on slide 3.
3. Before or during User A's edit, User B deletes slide 2.
4. Observe User A's session and reload the deck after persistence.

Expected current result: delete is represented as a whole-array replacement, so
unrelated slide maps can be recreated and concurrent edits on shifted slides can
be overwritten or detached from the UI selection. Diagnostics should show the
slide count change on `[Yjs diagnostics]` entries around `update-applied` and
`persist-slide-before-update`.

## 3. Insert In The Middle Causes Index Drift

1. User A opens a deck and selects slide 3.
2. User B inserts a new slide before slide 3.
3. User A edits the currently visible slide without manually reselecting it.

Expected current result: editor state is primarily index-based, so User A can
end up editing the slide now at index 3 instead of the original logical slide.
This should be treated as a regression target for the later `currentSlideId` and
id-based operation phases.

## 4. Import Opens Empty Or Partially Bootstrapped Deck

1. Import a large PPTX deck, especially one with many slides or embedded media.
2. Open the newly created deck immediately after the import flow completes.
3. Open the same deck in another browser session while the first session is
   still bootstrapping or syncing.

Expected current result: the deck can temporarily open with an empty Yjs state
or with stale `contentJson.slides` if the client bootstrap races persisted state.
Diagnostics should include `sync-bootstrap-elected`,
`sync-bootstrap-waiting`, or bootstrap rejection logs when an empty client
bootstrap conflicts with a non-empty stored projection.
