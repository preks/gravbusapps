import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { SpreadsheetAppsHub } from '../SpreadsheetAppsHub'
import { useFeature } from '@/common/hooks/useFeature'

jest.mock('@newwork/nw-design-system', () => {
  const passthrough = ({ children, ...props }: any) => <div {...props}>{children}</div>
  const button = ({ children, ...props }: any) => <button {...props}>{children}</button>
  const input = ({ ...props }: any) => <input {...props} />
  const checkbox = ({ checked, onCheckedChange }: any) => (
    <input type="checkbox" checked={!!checked} onChange={e => onCheckedChange?.(e.target.checked)} />
  )
  return {
    Card: passthrough,
    Button: button,
    Input: input,
    Spinner: () => <div>Loading...</div>,
    DropdownMenu: passthrough,
    DropdownMenuContent: passthrough,
    DropdownMenuItem: ({ children, onClick, ...props }: any) => (
      <button onClick={onClick} {...props}>
        {children}
      </button>
    ),
    DropdownMenuTrigger: passthrough,
    DropdownMenuSeparator: () => <hr />,
    Dialog: passthrough,
    DialogContent: passthrough,
    DialogHeader: passthrough,
    DialogTitle: passthrough,
    DialogFooter: passthrough,
    Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
    Avatar: passthrough,
    AvatarImage: (props: any) => <img alt="" {...props} />,
    AvatarFallback: passthrough,
    Badge: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    Tooltip: passthrough,
    TooltipContent: passthrough,
    TooltipProvider: passthrough,
    TooltipTrigger: passthrough,
    Checkbox: checkbox,
    Tabs: passthrough,
    TabsList: passthrough,
    TabsTrigger: button,
    useTranslation: () => ({
      t: (key: string) => {
        const translations: Record<string, string> = {
          'sh-title': 'My Spreadsheets',
          'sh-tab-automations': 'Automations',
          'sh-tab-tasks': 'Tasks',
          'sh-tab-trash': 'Trash',
          'sh-tab-my-files': 'My Spreadsheets',
          'sh-tab-shared': 'Shared',
          'sh-tab-recent': 'Recent',
          'sh-tab-favorites': 'Favorites',
          'sh-parent-label': 'Every Office',
          'sh-tabs-aria-label': 'Spreadsheet sections',
          'spreadsheets-header-search-placeholder': 'Search spreadsheets...',
          'sidebar-new': 'New',
          'sidebar-blank-spreadsheet': 'Blank spreadsheet',
          'sidebar-blank-spreadsheet-desc': 'Create a blank spreadsheet',
          'sidebar-upload-excel': 'Upload Excel',
          'sidebar-upload-excel-desc': 'Upload an Excel file',
          'spreadsheets-empty-trash-title': 'No trashed spreadsheets',
          'spreadsheets-empty-trash-description': 'Spreadsheets moved to trash will appear here.',
          'header-refresh': 'Refresh',
          'sort-name': 'Name',
          'sort-trashed': 'Trashed on',
          'table-trashed': 'Trashed on'
        }

        return translations[key] ?? key
      },
      locale: 'en-US'
    })
  }
})

jest.mock('@/common/utils/navigationUtils', () => ({
  navigateTo: jest.fn()
}))

jest.mock('@/common/hooks/useFeature', () => ({
  useFeature: jest.fn()
}))

jest.mock('@/common/utils/serviceResolver', () => ({
  DOCUMENT_API_URL: 'http://localhost:3002/api/v1'
}))

jest.mock('../hooks/useSpreadsheetApps', () => ({
  useSpreadsheetApps: () => ({
    apps: [
      {
        id: 'app-1',
        name: 'A',
        sheetCount: 1,
        rowCount: 2,
        status: 'draft',
        createdAt: new Date('2026-01-01').toISOString(),
        updatedAt: new Date('2026-01-02').toISOString(),
        createdBy: 'u-1',
        enabledAutomationCount: 1,
        taskCount: 1
      }
    ],
    currentApp: null,
    isLoading: false,
    error: null,
    storageMode: 'database',
    currentAppPermission: null,
    loadApp: jest.fn(),
    createApp: jest.fn(),
    updateApp: jest.fn(),
    deleteApp: jest.fn(),
    duplicateApp: jest.fn(),
    exportApp: jest.fn(),
    shareApp: jest.fn(),
    revokeAccess: jest.fn(),
    getSharedUsers: jest.fn().mockResolvedValue([]),
    clearCurrentApp: jest.fn(),
    refreshApps: jest.fn(),
    addRow: jest.fn(),
    updateRow: jest.fn(),
    updateSheet: jest.fn()
  })
}))

jest.mock('../hooks/useSpreadsheetAI', () => ({
  useSpreadsheetAI: () => ({ isAnalyzing: false, analyzeSpreadsheet: jest.fn(), reset: jest.fn() })
}))

jest.mock('../hooks/useDataPromotion', () => ({
  useDataPromotion: () => ({ promoteToDatabase: jest.fn() })
}))

jest.mock('../hooks/useSpreadsheetAppsHubFavorites', () => ({
  useSpreadsheetAppsHubFavorites: () => ({ favorites: new Set<string>(), setFavorites: jest.fn() })
}))

jest.mock('../hooks/useSpreadsheetAppsHubUrlState', () => ({
  useSpreadsheetAppsHubUrlState: () => ({ updateUrl: jest.fn(), resetLoadAttempt: jest.fn() })
}))

jest.mock('../hooks/useSpreadsheetAppsHubUserLookup', () => ({
  useSpreadsheetAppsHubUserLookup: () => ({
    ownerInfoMap: new Map(),
    sharedUsersMap: new Map(),
    invalidateSharedUsersForApp: jest.fn()
  })
}))

jest.mock('@/common/network/graphql/useGraphQLClient', () => ({
  useGraphQLClient: () => null
}))

jest.mock('../components/ExcelUploader', () => ({
  ExcelUploader: () => <div />
}))

jest.mock('../components/SheetAnalysisPreview', () => ({
  SheetAnalysisPreview: () => <div />
}))

jest.mock('../SpreadsheetAppViewer', () => ({
  SpreadsheetAppViewer: () => <div />
}))

jest.mock('../SpreadsheetAppEditor', () => ({
  SpreadsheetAppEditor: () => <div />
}))

jest.mock('../components/ShareAppDialog', () => ({
  ShareAppDialog: () => null
}))

jest.mock('../components/ManageSharesDialog', () => ({
  ManageSharesDialog: () => null
}))

jest.mock('../components/PromoteToDatabaseModal', () => ({
  PromoteToDatabaseModal: () => null
}))

jest.mock('../components/automations/SpreadsheetAutomationsSection', () => ({
  SpreadsheetAutomationsSection: () => null
}))

jest.mock('@/business-apps/platform/apps/shared/components/OfficeTrashList', () => ({
  OfficeTrashList: () => <div data-testid="office-trash-list" />
}))

jest.mock('../utils/exportUtils', () => ({
  exportAppToExcel: jest.fn()
}))

const mockUseFeature = useFeature as jest.MockedFunction<typeof useFeature>

describe('SpreadsheetAppsHub sidebar sections', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseFeature.mockReturnValue(false)
  })

  it('renders and switches to Automations and Tasks sections', () => {
    localStorage.removeItem('spreadsheet-hub-sidebar-collapsed')

    render(<SpreadsheetAppsHub accessToken="token" />)

    expect(screen.getAllByText('My Spreadsheets').length).toBeGreaterThan(0)

    fireEvent.click(screen.getByTestId('spreadsheet-apps-hub-hero-tab-automations'))
    expect(screen.getAllByText('Automations').length).toBeGreaterThan(0)

    fireEvent.click(screen.getByTestId('spreadsheet-apps-hub-hero-tab-tasks'))
    expect(screen.getAllByText('Tasks').length).toBeGreaterThan(0)
  })

  it('opens the trash tab without crashing', () => {
    render(<SpreadsheetAppsHub accessToken="token" />)

    fireEvent.click(screen.getByTestId('spreadsheet-apps-hub-hero-tab-trash'))

    expect(screen.getByTestId('spreadsheet-apps-hub-trash-search')).toBeInTheDocument()
    expect(screen.getByTestId('office-trash-list')).toBeInTheDocument()
  })

  it('does not render Share in the spreadsheet row overflow menu', () => {
    render(<SpreadsheetAppsHub accessToken="token" />)

    expect(screen.queryByText('action-share')).not.toBeInTheDocument()
  })

  it('does not render the Rows column in list view', () => {
    render(<SpreadsheetAppsHub accessToken="token" />)

    expect(screen.queryByText('table-rows')).not.toBeInTheDocument()
  })

  it('shows the Shared with me tab when preview is enabled', () => {
    mockUseFeature.mockReturnValue(true)

    render(<SpreadsheetAppsHub accessToken="token" />)

    expect(screen.getByTestId('spreadsheet-apps-hub-hero-tab-shared')).toBeInTheDocument()
  })

  it('hides the Shared with me tab when preview is disabled', () => {
    mockUseFeature.mockReturnValue(false)

    render(<SpreadsheetAppsHub accessToken="token" />)

    expect(screen.queryByTestId('spreadsheet-apps-hub-hero-tab-shared')).not.toBeInTheDocument()
  })

  it('hides the Shared with me tab when preview is unset', () => {
    mockUseFeature.mockReturnValue(undefined)

    render(<SpreadsheetAppsHub accessToken="token" />)

    expect(screen.queryByTestId('spreadsheet-apps-hub-hero-tab-shared')).not.toBeInTheDocument()
  })
})
