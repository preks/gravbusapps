import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { SpreadsheetActionsMenu } from '../SpreadsheetActionsMenu'

jest.mock('@newwork/nw-design-system', () => {
  const React = require('react')
  return {
    Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    DropdownMenu: ({ children }: any) => <div>{children}</div>,
    DropdownMenuTrigger: ({ children }: any) => <div>{children}</div>,
    DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
    DropdownMenuSeparator: () => <hr />,
    DropdownMenuItem: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>
  }
})

describe('SpreadsheetActionsMenu', () => {
  it('calls AI Analytics callback when item is clicked', () => {
    const onOpenAnalytics = jest.fn()
    render(
      <SpreadsheetActionsMenu
        onShowVersionHistory={jest.fn()}
        onShowCheckpointDialog={jest.fn()}
        onShowPublishDialog={jest.fn()}
        isLockedByMe={false}
        onAcquireLock={jest.fn()}
        onReleaseLock={jest.fn()}
        canEdit={true}
        onAddColumn={jest.fn()}
        onManageColumns={jest.fn()}
        onOpenAnalytics={onOpenAnalytics}
        onOpenAutomations={jest.fn()}
        onEdit={jest.fn()}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /AI Analytics/i }))
    expect(onOpenAnalytics).toHaveBeenCalledTimes(1)
  })
})
