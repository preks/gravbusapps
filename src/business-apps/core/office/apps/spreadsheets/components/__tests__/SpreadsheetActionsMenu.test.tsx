import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { SpreadsheetActionsMenu } from '../SpreadsheetActionsMenu'

jest.mock('@newwork/nw-design-system', () => {
  return {
    Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    DropdownMenu: ({ children }: any) => <div>{children}</div>,
    DropdownMenuTrigger: ({ children }: any) => <div>{children}</div>,
    DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
    DropdownMenuSeparator: () => <hr />,
    DropdownMenuItem: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
    useTranslation: () => ({
      t: (key: string) =>
        (
          ({
            'menu-spreadsheet': 'Spreadsheet',
            'menu-version-history': 'Version History',
            'menu-save-checkpoint': 'Save Checkpoint',
            'menu-coming-soon': 'Coming Soon',
            'menu-lock-spreadsheet': 'Lock Spreadsheet',
            'menu-unlock-spreadsheet': 'Unlock Spreadsheet',
            'menu-share': 'Share',
            'menu-export-to-excel': 'Export to Excel',
            'menu-ai-analytics': 'AI Analytics',
            'menu-automations': 'Automations',
            'menu-check-collection-responses': 'Check Collection Responses'
          }) as Record<string, string>
        )[key] ?? key
    })
  }
})

describe('SpreadsheetActionsMenu', () => {
  it('calls AI Analytics callback when item is clicked', () => {
    const onOpenAnalytics = jest.fn()
    render(
      <SpreadsheetActionsMenu
        onShowVersionHistory={jest.fn()}
        onShowCheckpointDialog={jest.fn()}
        isLockedByMe={false}
        onAcquireLock={jest.fn()}
        onReleaseLock={jest.fn()}
        canEdit={true}
        onOpenAnalytics={onOpenAnalytics}
        onOpenAutomations={jest.fn()}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /AI Analytics/i }))
    expect(onOpenAnalytics).toHaveBeenCalledTimes(1)
  })

  it('does not render a Share action even when onShare is provided', () => {
    render(
      <SpreadsheetActionsMenu
        onShowVersionHistory={jest.fn()}
        onShowCheckpointDialog={jest.fn()}
        isLockedByMe={false}
        onAcquireLock={jest.fn()}
        onReleaseLock={jest.fn()}
        canEdit={true}
        onShare={jest.fn()}
        onOpenAnalytics={jest.fn()}
        onOpenAutomations={jest.fn()}
      />
    )

    expect(screen.queryByRole('button', { name: /Share/i })).not.toBeInTheDocument()
  })
})
