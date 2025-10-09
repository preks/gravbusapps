// Main Document Manager Component
export { DocumentManager } from './DocumentManager'

// Sub-components
export { DocumentFilters } from './components/DocumentFilters'
export { DocumentViews } from './components/DocumentViews'
export { DocumentTreeView } from './components/DocumentTreeView'
export { DocumentActions } from './components/DocumentActions'
export { DocumentDragDrop } from './components/DocumentDragDrop'
export { useDocumentDataController } from './hooks/useDocumentDataController'

// Types and Interfaces
export type {
  Document,
  DocumentFolder,
  ColumnConfig,
  FilterOption,
  FilterGroup,
  DocumentFilterState,
  DocumentSortState,
  DocumentPaginationState,
  DocumentDataController,
  DocumentManagerProps,
  DocumentActionProps,
  DocumentViewProps,
  DocumentFilterProps,
  DocumentDragDropProps
} from './types/documentTypes'
