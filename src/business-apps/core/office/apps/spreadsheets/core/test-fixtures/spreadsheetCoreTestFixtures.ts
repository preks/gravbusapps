import type {
  AppSettings,
  SpreadsheetApp,
  SpreadsheetColumn,
  SpreadsheetSheet,
  ViewType
} from '../../types/spreadsheet'

const defaultAppSettings: AppSettings = {
  allowPublicAccess: false,
  requireAuthentication: true
}

const defaultSheetSettings: SpreadsheetSheet['settings'] = {
  allowAdd: true,
  allowEdit: true,
  allowDelete: true,
  allowExport: true,
  allowImport: true,
  rowsPerPage: 50,
  showRowNumbers: true
}

export function createTestSpreadsheetColumn(overrides: Partial<SpreadsheetColumn> = {}): SpreadsheetColumn {
  return {
    id: 'col-default',
    name: 'Name',
    label: 'Name',
    type: 'text',
    isVisible: true,
    isEditable: true,
    isRequired: false,
    isUnique: false,
    order: 0,
    ...overrides
  }
}

export function createTestSpreadsheetSheet(overrides: Partial<SpreadsheetSheet> = {}): SpreadsheetSheet {
  const viewType: ViewType = 'table'
  return {
    id: 'sheet-1',
    name: 'Sheet 1',
    viewType,
    columns: [createTestSpreadsheetColumn({ id: 'col-1', name: 'Name', label: 'Name' })],
    views: [],
    data: [{ _id: 'row-1', Name: 'Alice' }],
    settings: defaultSheetSettings,
    ...overrides
  }
}

export function createTestSpreadsheetApp(overrides: Partial<SpreadsheetApp> = {}): SpreadsheetApp {
  return {
    id: 'app-test',
    name: 'Test App',
    sourceFile: {
      fileId: 'file-1',
      fileName: 'book.xlsx',
      fileSize: 0,
      uploadedAt: '1970-01-01T00:00:00.000Z',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    },
    sheets: [createTestSpreadsheetSheet()],
    relationships: [],
    createdAt: '1970-01-01T00:00:00.000Z',
    updatedAt: '1970-01-01T00:00:00.000Z',
    createdBy: 'test',
    status: 'draft',
    settings: defaultAppSettings,
    ...overrides
  }
}
