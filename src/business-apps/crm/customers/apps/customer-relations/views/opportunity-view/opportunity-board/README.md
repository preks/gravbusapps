# Opportunity Kanban Board

This directory contains the Opportunity Kanban Board component used in the CRM customer-relations view. It provides a drag-and-drop pipeline view for managing sales opportunities across stages.

## Quick Edit Feature

The board supports an inline **Quick Edit** mode that allows users to modify key opportunity fields directly on the card without opening the full detail dialog.

### Enabling Quick Edit

- Click the **"Quick Edit: Off"** toggle button in the board header to enable the mode.
- All cards then display an **edit icon** on hover.
- Clicking the edit icon opens an inline form with fields for:
  - **Title** – opportunity name/title
  - **Amount** – estimated deal value
  - **Close Date** – expected close date

### Using Quick Edit

1. Hover over any opportunity card while Quick Edit is enabled.
2. Click the pencil icon that appears in the top-right corner of the card.
3. Edit the fields inline and click **Save** or **Cancel**.
4. Press **Escape** or click outside the card to cancel editing.

### State Management

Quick edits are handled via the `quickUpdateOpportunity` action in `kanban-store.ts`. This action:

- Updates the opportunity optimistically in local state.
- Normalizes `title` → `name`, `amount` → `estimatedAmount`, and `estimatedCloseDate` → `closeDate` to keep the store consistent with the GraphQL schema.
- Keeps `selectedOpportunity` in sync when the edited card is currently selected.

### Implementation Files

| File | Role |
|------|------|
| `OpportunityBoard.tsx` | Board-level toggle state (`isQuickEditing`) |
| `KanbanColumn.tsx` | Passes `isQuickEditing` prop down to cards |
| `OpportunityCard.tsx` | Inline form, edit/cancel/save logic, keyboard handling |
| `kanban-store.ts` | `quickUpdateOpportunity` action for state updates |
| `types.ts` | Extended `Opportunity` interface with `title`, `amount`, `estimatedCloseDate` |

## Architecture

- **DnD**: Uses `@dnd-kit/core` and `@dnd-kit/sortable` for drag-and-drop across stages.
- **State**: `kanban-store.ts` (Zustand) holds stages, opportunities, and UI state.
- **Data**: `data.ts` provides mock/demo data when `REACT_APP_ENV` is not `production`.
- **Queries**: `kanbanQueries.ts` contains the GraphQL query for fetching opportunities.
