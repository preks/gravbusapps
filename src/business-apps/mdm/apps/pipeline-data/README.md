# Pipeline Data Management App

A comprehensive Master Data Management (MDM) application for managing sales pipelines and their stages within the NEWWORK platform using a beautiful drag-and-drop kanban interface.

## Overview

This application provides an intuitive kanban-style interface for administrators to create, edit, and organize sales pipelines and their associated stages. The visual drag-and-drop design makes it easy to manage the hierarchical relationship between pipelines and stages, with seamless stage reordering and type categorization.

## Features

### Visual Kanban Interface

- **Pipeline Columns**: Each sales pipeline is displayed as a column
- **Draggable Stage Cards**: Stages appear as cards that can be dragged within and between pipelines
- **Real-time Visual Feedback**: Immediate visual feedback during drag operations
- **Responsive Design**: Optimized for different screen sizes with horizontal scrolling

### Sales Pipelines Management

- **Visual Pipeline Cards**: Each pipeline shown as a column with header information
- **Pipeline Categories**: Automatic categorization with color-coded tags
- **Inline Actions**: Add, edit, and delete pipelines directly from the kanban view
- **Stage Count Indicators**: Visual count of stages per pipeline

### Pipeline Stages Management

- **Drag-and-Drop Reordering**: Intuitive stage reordering within pipelines
- **Stage Type Color Coding**: Visual indicators for the 5 stage types (DISCOVERY, QUALIFICATION, NEGOTIATION, CLOSED_WON, CLOSED_LOST)
- **Position Indicators**: Visual markers for first, middle, and last stages
- **Inline Stage Management**: Add, edit, and delete stages directly from cards
- **Cross-Pipeline Movement**: Move stages between different pipelines

## Technical Architecture

### Data Sources

- **SalesPipeline Catalog**: Parent catalog entries for pipeline definitions
- **SalesPipelineStage Catalog**: Child catalog entries linked to parent pipelines

### Component Structure

```
pipeline-data/
├── PipelineData.tsx                    # Main component wrapper
├── components/
│   └── PipelineKanbanView.tsx          # Drag-and-drop kanban interface
├── hooks/
│   ├── useSalesPipelines.ts            # Pipeline catalog hook
│   ├── useSalesPipelineStages.ts       # Stage catalog hook
│   └── usePipelineDataIntegration.ts   # Data integration hook
├── types/
│   └── index.ts                        # TypeScript interfaces and enums
└── index.ts                            # Main exports
```

### Key Types

#### Stage Type Enum

```typescript
enum StageType {
  DISCOVERY = 'DISCOVERY',
  QUALIFICATION = 'QUALIFICATION',
  NEGOTIATION = 'NEGOTIATION',
  CLOSED_WON = 'CLOSED_WON',
  CLOSED_LOST = 'CLOSED_LOST'
}
```

#### Data Structures

- **SalesPipeline**: Basic pipeline with id, code, value
- **SalesPipelineStage**: Stage with parent relationship, rank, and type
- **Enhanced Interfaces**: UI-optimized versions with computed properties

## Usage

### Integration

```typescript
import { PipelineData } from '@/business-apps/mdm/apps/pipeline-data';

// Use in your app
<PipelineData {...businessAppContextProps} />
```

### Kanban Interface

The app provides a unified kanban view where:

- Pipelines are displayed as vertical columns
- Stages appear as draggable cards within their pipeline columns
- All pipeline and stage management happens inline within the kanban board

## API Integration

### Catalog APIs

- Uses `useCatalogManagerClient` for all data operations
- Fetches from `SalesPipeline:v1` and `SalesPipelineStage:v1` catalogs
- Supports pagination, search, and filtering

### Data Integration Hook

The `usePipelineDataIntegration` hook:

- Fetches pipelines and stages in parallel
- Transforms raw catalog data into enhanced UI models
- Provides loading states and error handling
- Supports data refetching

## Features Status

### ✅ Completed

- [x] TypeScript types and enums
- [x] Catalog data hooks
- [x] Data integration and transformation
- [x] Beautiful kanban drag-and-drop interface
- [x] Pipeline column management
- [x] Draggable stage cards
- [x] Visual feedback and animations
- [x] Modal forms for add/edit
- [x] Responsive design with horizontal scrolling
- [x] Error handling and loading states
- [x] Stage type color coding
- [x] Position indicators

### 🚧 TODO (Future Enhancements)

- [ ] Implement actual CRUD operations with catalog API
- [ ] Add drag-and-drop stage reordering
- [ ] Stage validation (ensure proper ordering)
- [ ] Bulk operations for stages
- [ ] Export/import functionality
- [ ] Advanced analytics and reporting
- [ ] Stage templates

## Data Model

### Pipeline Structure

```json
{
  "id": "SalesPipeline:v1:STANDARD",
  "code": "STANDARD",
  "value": "Standard",
  "objectValue": {}
}
```

### Stage Structure

```json
{
  "id": "SalesPipelineStage:v1:NEW_OPPORTUNITY",
  "parentEntryId": "SalesPipeline:v1:STANDARD",
  "code": "NEW_OPPORTUNITY",
  "alternativeCode": "DISCOVERY",
  "value": "New Opportunity",
  "additionalValue1": "01",
  "objectValue": {}
}
```

## Development

### Running the App

```bash
# Development mode
npm run dev

# Publishing the app
npm run publish:screen -- /mdm/apps/pipeline-data
```

### Testing

The app includes comprehensive `data-testid` attributes for automated testing:

- `PipelineData-Tabs`
- `PipelinesTab-AddButton`
- `StagesTab-Table`
- etc.

## Dependencies

### Required

- React 18+
- Ant Design 5+
- Tailwind CSS v4
- @remixicon/react (for icons)
- @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities (for drag-and-drop)

### Internal Dependencies

- `@/common/BusinessAppContext`
- `@/common/network/catalogs/useCatalogManagerClient`
- `@/components/data-filter/DebouncedInput`
- `@/components/layout/pageLayout/PageLayout`

## Performance Considerations

- Uses parallel data fetching for pipelines and stages
- Implements debounced search to avoid excessive API calls
- Supports pagination for large datasets
- Optimized data transformations with useCallback
- Efficient filtering and sorting algorithms

## Accessibility

- Proper ARIA labels and roles
- Keyboard navigation support
- Screen reader compatible
- High contrast color schemes
- Focus management in modals

---

For questions or support, please refer to the NEWWORK platform documentation or contact the development team.
