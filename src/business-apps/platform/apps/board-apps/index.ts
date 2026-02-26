// Types
export * from './types'

// Services
export { BoardApiService, setBoardApiAuthTokenProvider } from './services/BoardApiService'

// Hooks
export { useBoardApps } from './hooks/useBoardApps'
export { useBoardAI } from './hooks/useBoardAI'
export { useBoardSearch } from './hooks/useBoardSearch'
export { useBoardEntityData } from './hooks/useBoardEntityData'
export { useBoardRealtime, useBoardPolling } from './hooks/useBoardRealtime'
export { useBoardImportExport } from './hooks/useBoardImportExport'
export { useMobileDetect } from './hooks/useMobileDetect'

// Components
export { BoardsHub } from './BoardsHub'
export { BoardViewer } from './BoardViewer'
export type { BoardViewerHandle } from './BoardViewer'
export { RowPagePanel } from './components/RowPagePanel'
export { GroupHeader } from './components/GroupHeader'
export { SubitemRow } from './components/SubitemRow'
export { RelationPicker } from './components/RelationPicker'

// Views
export {
  BoardTableView,
  BoardKanbanView,
  BoardCalendarView,
  BoardTimelineView,
  BoardFormView,
  BoardDashboardView
} from './views'

// Extracted components
export { CreateBoardDialog } from './components/CreateBoardDialog'
export { BoardListItem } from './components/BoardListItem'

// Default export for module registration
export { BoardsHub as default } from './BoardsHub'
