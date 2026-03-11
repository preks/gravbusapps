import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { SpreadsheetAppsHub } from '../SpreadsheetAppsHub'

jest.mock('@newwork/nw-design-system', () => {
  const React = require('react')
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
    Checkbox: checkbox
  }
})

jest.mock('@/common/utils/navigationUtils', () => ({
  navigateTo: jest.fn()
}))

jest.mock('@/business-apps/platform/apps/shared/utils/documentServiceUrl', () => ({
  getDocumentServiceApiUrl: () => 'http://localhost:3002/api/v1'
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

describe('SpreadsheetAppsHub sidebar sections', () => {
  it('renders and switches to Automations and Tasks sections', () => {
    localStorage.removeItem('spreadsheet-hub-sidebar-collapsed')

    render(<SpreadsheetAppsHub accessToken="token" />)

    expect(screen.getAllByText('My Spreadsheets').length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole('button', { name: /Automations/i }))
    expect(screen.getAllByText('Automations').length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole('button', { name: /Tasks/i }))
    expect(screen.getAllByText('Tasks').length).toBeGreaterThan(0)
  })
})
