export { FolderTemplateEditor } from './FolderTemplateEditor'
export { FolderTemplateDataPage } from './FolderTemplateDataPage'
export { InvestmentFolderTemplateEditor } from './InvestmentFolderTemplateEditor'
export { useFolderTemplateData } from './hooks/useFolderTemplateData'
export { useInvestmentFolderTemplates } from './hooks/useInvestmentFolderTemplates'

// Types
export type {
  FolderNode,
  InitFoldersConfig,
  FolderTemplateEditorProps,
  FolderTemplateDataPageProps,
  InvestmentFolderTemplateEditorProps,
  InvestmentCatalogEntry
} from './types'

// Enums
export { EntityType, ModuleType, CrmFolderCatalogCode, IrmFolderCatalogCode, InvestmentCatalogType } from './types'

// Constants
export { FOLDER_CATALOG_IDENTIFIERS, CATALOG_IDENTIFIER, CATALOG_VERSION } from './types'
