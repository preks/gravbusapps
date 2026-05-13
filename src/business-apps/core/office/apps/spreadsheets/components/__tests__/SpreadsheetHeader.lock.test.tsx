import * as React from 'react'
import { render, screen } from '@testing-library/react'
import { SpreadsheetHeader } from '../SpreadsheetHeader'

jest.mock('@newwork/nw-design-system', () => {
  return {
    useTranslation: () => ({
      t: (key: string, opts?: { name?: string }) => {
        if (key === 'lock-status-locked-by' && opts?.name) {
          return `Locked by ${opts.name}`
        }
        if (key === 'lock-status-locked-by-unknown') {
          return 'someone'
        }
        return key
      }
    }),
    Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    Badge: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    DropdownMenu: ({ children }: any) => <div>{children}</div>,
    DropdownMenuTrigger: ({ children }: any) => <div>{children}</div>,
    DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
    DropdownMenuItem: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
    DropdownMenuLabel: ({ children }: any) => <div>{children}</div>,
    DropdownMenuSeparator: () => <hr />
  }
})

jest.mock('lucide-react', () => {
  const Icon = ({ children, ...props }: any) => <span {...props}>{children}</span>
  return new Proxy(
    {},
    {
      get: () => Icon
    }
  )
})

jest.mock('../StatusIndicators', () => ({
  StatusIndicators: () => <div data-testid="status-indicators" />
}))

jest.mock('../SpreadsheetActionsMenu', () => ({
  SpreadsheetActionsMenu: () => <div data-testid="spreadsheet-actions-menu" />
}))

jest.mock('@/business-apps/platform/apps/shared/components/AutoSaveIndicator', () => ({
  AutoSaveIndicator: () => <div data-testid="autosave-indicator" />
}))

jest.mock('@/business-apps/platform/apps/shared/components/StatusBadge', () => ({
  StatusBadge: () => <div data-testid="status-badge" />
}))

describe('SpreadsheetHeader lock badge', () => {
  it('shows lock owner badge text to non-owner viewers', () => {
    render(
      <SpreadsheetHeader
        app={{ id: 'app-1', name: 'Budget', sheets: [], settings: {} } as any}
        activeSheet={{ id: 'sheet-1', name: 'Sheet 1', settings: { allowExport: true } } as any}
        isEditing={true}
        canEdit={false}
        headerParticipants={[]}
        isCollaborationConnected={false}
        isEntityDataLoading={false}
        onRefreshEntityData={jest.fn()}
        versioning={{ isSaving: false, lastSaveTime: null, hasUnsavedChanges: false }}
        onShowCheckpointDialog={jest.fn()}
        onShowVersionHistory={jest.fn()}
        publishingStatus="draft"
        showComments={false}
        setShowComments={jest.fn()}
        unresolvedCommentCount={0}
        fileLock={{
          lock: { isLocked: true, lockedByName: 'Alice' },
          isLockedByMe: false,
          acquireLock: jest.fn(),
          releaseLock: jest.fn()
        }}
        onOpenAICapability={jest.fn()}
        onOpenAnalytics={jest.fn()}
        onOpenAutomations={jest.fn()}
        testId="spreadsheet-header-test"
      />
    )

    expect(screen.getByText('Locked by Alice')).toBeInTheDocument()
  })
})
