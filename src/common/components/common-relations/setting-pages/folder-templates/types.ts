// Folder node structure matching the backend JSON format
export interface FolderNode {
  name: string
  folders: FolderNode[]
}

export interface InitFoldersConfig {
  initFolders: FolderNode[]
}

// Entity types for folder templates
export enum EntityType {
  LEAD = 'LEAD',
  CONTACT = 'CONTACT',
  ACCOUNT = 'ACCOUNT',
  OPPORTUNITY = 'OPPORTUNITY'
}

// Module types
export enum ModuleType {
  CRM = 'CRM',
  IRM = 'IRM'
}

// CRM (Customer) catalog codes
export enum CrmFolderCatalogCode {
  LEAD = 'CUSTOMER_LEAD_INIT_FOLDERS',
  CONTACT = 'CUSTOMER_CONTACT_INIT_FOLDERS',
  ACCOUNT = 'CUSTOMER_ACCOUNT_INIT_FOLDERS',
  OPPORTUNITY = 'CUSTOMER_OPPORTUNITY_INIT_FOLDERS'
}

// IRM (Investment) catalog codes
export enum IrmFolderCatalogCode {
  LEAD = 'INVESTMENT_LEAD_INIT_FOLDERS',
  CONTACT = 'INVESTMENT_CONTACT_INIT_FOLDERS',
  ACCOUNT = 'INVESTMENT_ACCOUNT_INIT_FOLDERS',
  OPPORTUNITY = 'INVESTMENT_OPPORTUNITY_INIT_FOLDERS'
}

// Catalog identifiers mapping by module and entity
export const FOLDER_CATALOG_IDENTIFIERS = {
  [ModuleType.CRM]: {
    [EntityType.LEAD]: CrmFolderCatalogCode.LEAD,
    [EntityType.CONTACT]: CrmFolderCatalogCode.CONTACT,
    [EntityType.ACCOUNT]: CrmFolderCatalogCode.ACCOUNT,
    [EntityType.OPPORTUNITY]: CrmFolderCatalogCode.OPPORTUNITY
  },
  [ModuleType.IRM]: {
    [EntityType.LEAD]: IrmFolderCatalogCode.LEAD,
    [EntityType.CONTACT]: IrmFolderCatalogCode.CONTACT,
    [EntityType.ACCOUNT]: IrmFolderCatalogCode.ACCOUNT,
    [EntityType.OPPORTUNITY]: IrmFolderCatalogCode.OPPORTUNITY
  }
} as const

// Catalog configuration
export const CATALOG_IDENTIFIER = 'GeneralConfig'
export const CATALOG_VERSION = 'v1'

// Investment catalog identifiers
export enum InvestmentCatalogType {
  GROUP = 'InvestmentGroup',
  TYPE = 'InvestmentType',
  LIQUID_FUND_TYPE = 'InvestmentLiquidFundType'
}

// Investment catalog entry with folder configuration
export interface InvestmentCatalogEntry {
  id: string
  code: string
  value: string
  objectValue?: {
    initFolders?: FolderNode[]
    [key: string]: any
  }
  parentEntryId?: string
}

export interface FolderTemplateEditorProps {
  accessToken: string
  moduleType: ModuleType
  entityType: EntityType
  onSave?: () => void
  prefixDataTestId?: string
}

export interface FolderTemplateDataPageProps {
  accessToken: string
  moduleType: ModuleType
  onBack?: () => void
  prefixDataTestId?: string
}

export interface InvestmentFolderTemplateEditorProps {
  accessToken: string
  onSave?: () => void
  prefixDataTestId?: string
}
